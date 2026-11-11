export interface QuakeItem {
  time: string;
  place: string;
  mag: string;
  depth: string;
  intensity: string;
}

interface P2PQuakeResponseItem {
  time?: string;
  earthquake?: {
    time?: string;
    maxScale?: number;
    hypocenter?: {
      name?: string;
      depth?: number;
      magnitude?: number;
    };
  };
}

const INTENSITY_MAP: Record<number, string> = {
  10: '1',
  20: '2',
  30: '3',
  40: '4',
  45: '5弱',
  50: '5強',
  55: '6弱',
  60: '6強',
  70: '7',
};

export async function fetchQuakeData(): Promise<QuakeItem[]> {
  try {
    const r = await fetch('https://api.p2pquake.net/v2/history?codes=551&limit=5');
    if (!r.ok) return [];
    const qRes = (await r.json()) as P2PQuakeResponseItem[];

    return qRes.map((q) => {
      const eq = q.earthquake;
      const hypo = eq?.hypocenter;
      const dVal = hypo?.depth;
      let depthText = '不明';
      if (dVal !== undefined && dVal !== null) {
        if (dVal === 0) depthText = 'ごく浅い';
        else if (dVal === -1) depthText = '不明';
        else depthText = `${dVal}km`;
      }
      const mVal = hypo?.magnitude;
      return {
        time: eq?.time || q.time || '',
        place: hypo?.name || '情報なし',
        mag: mVal !== undefined && mVal >= 0 ? mVal.toFixed(1) : '-',
        depth: depthText,
        intensity: (eq?.maxScale !== undefined ? INTENSITY_MAP[eq.maxScale] : undefined) || '-',
      };
    });
  } catch (_) {
    return [];
  }
}
