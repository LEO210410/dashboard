import { RAILWAY_CATALOG, RailwayLine } from '../config/railwayCatalog';
import { fetchJsonp, fetchTextWithCorsFallback, JSONP_DEFAULT_TIMEOUT, JsonpError } from './gasJsonp';

export interface YahooTroubleItem {
  name: string;
  status: string;
  detail: string;
}

export interface YahooTroublesResult {
  ok: boolean;
  parsedRows: number;
  troubles: YahooTroubleItem[];
  source: string;
  /** 失敗時の具体的な理由（日本語・診断ボックス表示用） */
  error?: string;
}

export interface TrainStatusItem {
  id: string;
  name: string;
  file: string;
  company: string;
  delay: boolean;
  statusText: string;
  detail: string;
}

/** GAS が返し得るレスポンス（新形式 troubles / 旧形式 htmlList + fullDetails の両対応） */
interface GasTrainResponse {
  ok?: boolean;
  error?: string;
  // 新形式
  totalLines?: number;
  troubles?: Array<{ name?: string; status?: string; detail?: string }>;
  // 旧形式
  htmlList?: string[];
  fullDetails?: Record<string, string>;
}

/**
 * Yahoo!路線情報のHTMLテーブルを解析し、平常運転以外の路線トラブル情報を抽出する
 */
export function parseYahooTransitHtml(html: string): {
  troubles: YahooTroubleItem[];
  totalRows: number;
} {
  const troubles: YahooTroubleItem[] = [];
  let totalRows = 0;
  if (!html) return { troubles, totalRows };

  const doc = new DOMParser().parseFromString(html, 'text/html');

  doc.querySelectorAll('table tr').forEach((tr) => {
    const tds = tr.querySelectorAll('td');
    if (tds.length < 2) return;
    totalRows++;

    const lineName = (tds[0].textContent || '').replace(/\s+/g, ' ').trim();
    const statusRaw = (tds[1].textContent || '').replace(/\s+/g, ' ').trim();
    const detailText = tds[2] ? (tds[2].textContent || '').replace(/\s+/g, ' ').trim() : '';

    if (!lineName || !statusRaw) return;
    if (!statusRaw.includes('平常運転')) {
      troubles.push({
        name: lineName,
        status: normalizeStatusBadge(statusRaw),
        detail: detailText,
      });
    }
  });

  return { troubles, totalRows };
}

/** ステータス文字列をバッジ表示用に正規化する */
function normalizeStatusBadge(statusRaw: string): string {
  let badge = statusRaw.replace(/^[!！\s]+/, '');
  if (statusRaw.includes('運転見合わせ')) badge = '運転見合わせ';
  else if (statusRaw.includes('列車遅延') || statusRaw.includes('遅延')) badge = '列車遅延';
  else if (statusRaw.includes('運転再開')) badge = '運転再開・遅れ';
  else if (statusRaw.includes('運転計画')) badge = '運転計画';
  else if (statusRaw.includes('その他') || statusRaw.includes('情報')) badge = '運行情報あり';
  return badge;
}

/**
 * GAS レスポンスをハイブリッドにパースする。
 * - 新形式: { ok, totalLines, troubles: [{ name, status, detail }] }
 * - 旧形式: { ok, htmlList: string[], fullDetails: Record<string,string> }
 * 解釈できない場合は error に日本語の理由を入れて返す。
 */
export function parseGasTrainResponse(
  j: unknown
): { ok: boolean; parsedRows: number; troubles: YahooTroubleItem[]; error?: string } {
  if (!j || typeof j !== 'object') {
    return { ok: false, parsedRows: 0, troubles: [], error: 'レスポンス形式不整合（オブジェクトではありません）' };
  }
  const res = j as GasTrainResponse;

  if (res.ok === false) {
    return {
      ok: false,
      parsedRows: 0,
      troubles: [],
      error: `GAS側がエラーを返しました${res.error ? `: ${res.error}` : '（ok:false）'}`,
    };
  }

  // 新形式（troubles 配列）
  if (Array.isArray(res.troubles)) {
    const troubles: YahooTroubleItem[] = [];
    res.troubles.forEach((t) => {
      const name = String(t?.name ?? '').trim();
      if (!name) return;
      if (troubles.some((x) => x.name === name)) return;
      const statusRaw = String(t?.status ?? '').trim();
      troubles.push({
        name,
        status: normalizeStatusBadge(statusRaw || '運行情報あり'),
        detail: String(t?.detail ?? '').trim(),
      });
    });
    const total = typeof res.totalLines === 'number' ? res.totalLines : troubles.length;
    // troubles が空でも ok:true なら「トラブル0件」の正常取得として扱う
    return { ok: res.ok === true || total > 0, parsedRows: total, troubles };
  }

  // 旧形式（htmlList + fullDetails）
  if (Array.isArray(res.htmlList)) {
    const allTroubles: YahooTroubleItem[] = [];
    let parsedRows = 0;
    const fullDetails = res.fullDetails || {};

    res.htmlList.forEach((h) => {
      const parsed = parseYahooTransitHtml(h);
      parsedRows += parsed.totalRows;
      parsed.troubles.forEach((tr) => {
        if (fullDetails[tr.name]) {
          tr.detail = fullDetails[tr.name];
        } else {
          const matchedKey = Object.keys(fullDetails).find(
            (k) => k.includes(tr.name) || tr.name.includes(k)
          );
          if (matchedKey) tr.detail = fullDetails[matchedKey];
        }
        if (!allTroubles.some((x) => x.name === tr.name)) {
          allTroubles.push(tr);
        }
      });
    });

    if (parsedRows === 0) {
      return {
        ok: false,
        parsedRows: 0,
        troubles: [],
        error: 'レスポンス形式不整合（htmlList から路線行を解析できませんでした）',
      };
    }
    return { ok: true, parsedRows, troubles: allTroubles };
  }

  return {
    ok: false,
    parsedRows: 0,
    troubles: [],
    error: 'レスポンス形式不整合（troubles / htmlList のいずれも含まれていません）',
  };
}

/** 例外を日本語の理由文字列に変換する */
function describeError(e: unknown): string {
  if (e instanceof JsonpError) {
    return e.kind === 'timeout'
      ? `JSONPタイムアウト（${JSONP_DEFAULT_TIMEOUT / 1000}秒以内に応答なし）`
      : 'JSONPスクリプト読み込みエラー（GASのURL・公開設定「全員」を確認）';
  }
  return e instanceof Error ? e.message : String(e);
}

/**
 * GAS (JSONP) または CORSプロキシ経由で Yahoo!路線情報（関東・新幹線）を取得する
 */
export async function fetchYahooTrainTroubles(gasUrl: string): Promise<YahooTroublesResult> {
  const reasons: string[] = [];
  const hasGas = !!gasUrl && gasUrl.startsWith('https://script.google.com/');

  if (!gasUrl) {
    reasons.push('gasUrl未設定');
    console.error('[Train] gasUrl が未設定のため CORS プロキシ経由にフォールバックします');
  } else if (!hasGas) {
    reasons.push('gasUrl形式不正（https://script.google.com/ で始まっていません）');
    console.error('[Train] gasUrl の形式が不正のため CORS プロキシ経由にフォールバックします', { gasUrl });
  } else {
    try {
      console.info('[Train] GAS(JSONP) へ問い合わせ', { gasUrl });
      const j = await fetchJsonp<unknown>(gasUrl, JSONP_DEFAULT_TIMEOUT);
      const parsed = parseGasTrainResponse(j);
      if (parsed.ok) {
        return {
          ok: true,
          parsedRows: parsed.parsedRows,
          troubles: parsed.troubles,
          source: 'GAS(JSONP)',
        };
      }
      reasons.push(parsed.error || 'レスポンス形式不整合');
      console.error('[Train] GAS レスポンス判定失敗', { gasUrl, reason: parsed.error, response: j });
    } catch (e) {
      const reason = describeError(e);
      reasons.push(reason);
      console.error('[Train] GAS(JSONP) 通信失敗 -> CORS プロキシへフォールバック', {
        gasUrl,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }

  // フォールバック: CORS プロキシ経由で Yahoo!路線情報を直接取得
  const targets = [
    'https://transit.yahoo.co.jp/diainfo/area/4',
    'https://transit.yahoo.co.jp/diainfo/shinkansen',
  ];
  console.warn('[Train] CORS プロキシ経由で取得を試行', { targets });

  const htmlList = await Promise.all(
    targets.map((u) =>
      fetchTextWithCorsFallback(u, {
        preferAllOriginsFirst: true,
        validate: (t) => t.includes('<table'),
      })
    )
  );

  const allTroubles: YahooTroubleItem[] = [];
  let parsedRows = 0;
  htmlList.forEach((h) => {
    const res = parseYahooTransitHtml(h);
    parsedRows += res.totalRows;
    res.troubles.forEach((tr) => {
      if (!allTroubles.some((x) => x.name === tr.name)) {
        allTroubles.push(tr);
      }
    });
  });

  if (parsedRows === 0) {
    reasons.push('CORSプロキシ経由でも取得失敗（corsproxy.io / allorigins 応答なし）');
    console.error('[Train] CORS プロキシ経由でも取得できませんでした', { targets, reasons });
  }

  return {
    ok: parsedRows > 0,
    parsedRows,
    troubles: allTroubles,
    source: 'CORS-Proxy',
    error: reasons.length ? reasons.join(' / ') : undefined,
  };
}

/**
 * 路線名照合のための正規化処理
 */
export function cleanLineKey(s: string): string {
  return String(s || '')
    .replace(/[［\[\(（]/g, '(')
    .replace(/[］\]\)）]/g, ')')
    .replace(/[\s・〜～ー−\-]/g, '')
    .toLowerCase();
}

export function matchTroubleForLine(
  lineObj: RailwayLine,
  troubles: YahooTroubleItem[]
): YahooTroubleItem | undefined {
  return troubles.find((tr) => {
    const yKey = cleanLineKey(tr.name);
    const yBase = yKey.replace(/\(.*?\)/g, '');

    return lineObj.match.some((m) => {
      const mKey = cleanLineKey(m);
      if (yKey.includes(mKey) || mKey.includes(yKey)) return true;
      if (!mKey.includes('(') && yBase && (yBase === mKey || yBase.includes(mKey))) return true;
      return false;
    });
  });
}

/**
 * 選択された路線IDリストとYahoo!取得結果から表示用の運行情報配列を構築する
 */
export function buildTrainStatusList(
  selectedLines: string[],
  yahooRes: YahooTroublesResult
): TrainStatusItem[] {
  const chosen = RAILWAY_CATALOG.filter((line) => selectedLines.includes(line.id));
  const trainData: TrainStatusItem[] = chosen.map((line) => {
    if (!yahooRes.ok) {
      return {
        id: line.id,
        name: line.name,
        file: line.file,
        company: line.company,
        delay: false,
        statusText: '情報取得エラー',
        detail: yahooRes.error || '設定からGAS URLをご登録ください',
      };
    }
    const hit = matchTroubleForLine(line, yahooRes.troubles);
    return {
      id: line.id,
      name: line.name,
      file: line.file,
      company: line.company,
      delay: !!hit,
      statusText: hit ? hit.status : '平常運転',
      detail: hit ? hit.detail : '',
    };
  });

  trainData.sort((a, b) => (b.delay ? 1 : 0) - (a.delay ? 1 : 0));
  return trainData;
}
