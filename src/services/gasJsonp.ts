/** JSONP の既定タイムアウト（ローカル開発環境でも確実に応答を受け取れるよう 15 秒） */
export const JSONP_DEFAULT_TIMEOUT = 15000;

export type JsonpErrorKind = 'timeout' | 'load';

/** JSONP 通信失敗の種別を保持する例外 */
export class JsonpError extends Error {
  kind: JsonpErrorKind;
  url: string;
  constructor(kind: JsonpErrorKind, message: string, url: string) {
    super(message);
    this.name = 'JsonpError';
    this.kind = kind;
    this.url = url;
  }
}

/**
 * GAS (Google Apps Script) 等の JSONP エンドポイントと通信するヘルパー
 * 失敗時は呼び出し先URLと原因を console.error に出力する
 */
export function fetchJsonp<T = unknown>(
  url: string,
  timeout = JSONP_DEFAULT_TIMEOUT
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const cbName = 'gas_cb_' + Math.floor(Math.random() * 1000000) + '_' + Date.now();
    const script = document.createElement('script');
    const sep = url.includes('?') ? '&' : '?';
    script.src = `${url}${sep}callback=${cbName}&_t=${Date.now()}`;

    const win = window as unknown as Record<string, unknown>;

    const fail = (kind: JsonpErrorKind, message: string) => {
      console.error(`[JSONP] ${message}`, { url: script.src, kind, timeoutMs: timeout });
      reject(new JsonpError(kind, message, url));
    };

    const timer = window.setTimeout(() => {
      cleanup();
      // 遅れて到着したレスポンスで未定義関数エラーが出ないよう no-op を残す
      win[cbName] = () => {};
      fail('timeout', `JSONPタイムアウト（${timeout / 1000}秒以内に応答なし）`);
    }, timeout);

    function cleanup() {
      window.clearTimeout(timer);
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
      delete win[cbName];
    }

    win[cbName] = (data: T) => {
      cleanup();
      resolve(data);
    };

    script.onerror = () => {
      cleanup();
      fail('load', 'JSONPスクリプト読み込みエラー（URL不正・公開設定・ネットワークを確認）');
    };

    document.head.appendChild(script);
  });
}

/**
 * AllOrigins / corsproxy.io を順番に試行してテキストを取得するフォールバックヘルパー
 */
export async function fetchTextWithCorsFallback(
  targetUrl: string,
  options?: { preferAllOriginsFirst?: boolean; validate?: (text: string) => boolean }
): Promise<string> {
  const validate = options?.validate ?? ((t: string) => t.length > 0);

  const tryCorsProxyIo = async (): Promise<string> => {
    try {
      const r = await fetch(`https://corsproxy.io/?${encodeURIComponent(targetUrl)}`, {
        cache: 'no-store',
      });
      if (r.ok) {
        const txt = await r.text();
        if (validate(txt)) return txt;
      }
    } catch (e) {
      console.error('[CORS-Proxy] corsproxy.io 取得失敗', {
        target: targetUrl,
        error: e instanceof Error ? e.message : String(e),
      });
    }
    return '';
  };

  const tryAllOrigins = async (): Promise<string> => {
    try {
      const r = await fetch(
        `https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}`,
        { cache: 'no-store' }
      );
      if (r.ok) {
        const j = (await r.json()) as { contents?: string };
        if (j.contents && validate(j.contents)) return j.contents;
      }
    } catch (e) {
      console.error('[CORS-Proxy] allorigins 取得失敗', {
        target: targetUrl,
        error: e instanceof Error ? e.message : String(e),
      });
    }
    return '';
  };

  if (options?.preferAllOriginsFirst) {
    const first = await tryAllOrigins();
    if (first) return first;
    return await tryCorsProxyIo();
  } else {
    const first = await tryCorsProxyIo();
    if (first) return first;
    return await tryAllOrigins();
  }
}
