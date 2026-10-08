// lib/circuits/mapping.ts
// 赛道标识与各种数据源别名、国家、城市归一化映射表

export const CIRCUIT_ID_ALIASES: Record<string, string> = {
  'albert-park': 'albert_park',
  'melbourne': 'albert_park',
  'shanghai': 'shanghai',
  'chinese': 'shanghai',
  'suzuka': 'suzuka',
  'japanese': 'suzuka',
  'miami': 'miami',
  'villeneuve': 'villeneuve',
  'montreal': 'villeneuve',
  'canadian': 'villeneuve',
  'monaco': 'monaco',
  'monte-carlo': 'monaco',
  'catalunya': 'catalunya',
  'barcelona': 'catalunya',
  'red-bull-ring': 'red_bull_ring',
  'spielberg': 'red_bull_ring',
  'austrian': 'red_bull_ring',
  'silverstone': 'silverstone',
  'british': 'silverstone',
  'spa': 'spa',
  'spa-francorchamps': 'spa',
  'belgian': 'spa',
  'hungaroring': 'hungaroring',
  'budapest': 'hungaroring',
  'hungarian': 'hungaroring',
  'zandvoort': 'zandvoort',
  'dutch': 'zandvoort',
  'monza': 'monza',
  'italian': 'monza',
  'madring': 'madring',
  'madrid': 'madring',
  'baku': 'baku',
  'azerbaijan': 'baku',
  'sepang': 'sepang',
  'malaysian': 'sepang',
  'marina-bay': 'marina_bay',
  'singapore': 'marina_bay',
  'cota': 'americas',
  'americas': 'americas',
  'austin': 'americas',
  'rodriguez': 'rodriguez',
  'mexico': 'rodriguez',
  'interlagos': 'interlagos',
  'sao-paulo': 'interlagos',
  'brazilian': 'interlagos',
  'vegas': 'vegas',
  'las-vegas': 'vegas',
  'las_vegas': 'vegas',
  'losail': 'losail',
  'lusail': 'losail',
  'qatar': 'losail',
  'yas-marina': 'yas_marina',
  'yas_marina': 'yas_marina',
  'abu-dhabi': 'yas_marina',
  'abu_dhabi': 'yas_marina'
};

export function normalizeCircuitId(rawId: string): string {
  if (!rawId) return 'marina_bay';
  const lower = rawId.toLowerCase().trim();
  const withUnder = lower.replace(/[-\s]+/g, '_');
  const withHyphen = lower.replace(/[_\s]+/g, '-');
  return CIRCUIT_ID_ALIASES[withUnder] || CIRCUIT_ID_ALIASES[withHyphen] || CIRCUIT_ID_ALIASES[lower] || withUnder;
}
