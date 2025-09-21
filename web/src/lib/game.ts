const bSide = Array.from({ length: 9 }, (_, i) => `B${9 - i}`);
const sSide = Array.from({ length: 9 }, (_, i) => `S${i + 1}`);
export const LANES = [...bSide, 'B0', 'S0', ...sSide] as const;
export type BallId = typeof LANES[number];

export const LANES_BY_ID = new Map<string, number>(LANES.map((id, idx) => [id, idx]));
export const MID_INDEX = (LANES.length - 1) / 2;
export const LANE_PCT = 0.05 / MID_INDEX; // ±5% spread to extremities

export function clampIdx(idx: number) {
  return Math.max(0, Math.min(LANES.length - 1, idx));
}

export function indexForBall(ball?: string | null) {
  if(!ball) return null;
  return LANES_BY_ID.get(ball.toUpperCase()) ?? null;
}

export function ballForIndex(idx: number) {
  return LANES[clampIdx(Math.round(idx))];
}

export function priceSnapshot(p0: number | null | undefined, idx: number) {
  if(!p0 || Number.isNaN(p0)){
    return { pc: null as number | null, chgPct: 0, offsetPct: 0 };
  }
  const offsetPct = (MID_INDEX - idx) * LANE_PCT;
  return { pc: p0 * (1 + offsetPct), chgPct: offsetPct, offsetPct };
}

export function classifyBall(ball?: string | null){
  return ball && ball.startsWith('B') ? 'long' : 'short';
}

export function priceToLane(p0: number, price: number){
  const offsetPct = (price / p0) - 1;
  return MID_INDEX - (offsetPct / LANE_PCT);
}

export function laneToPrice(p0: number, lane: number){
  const offsetPct = (MID_INDEX - lane) * LANE_PCT;
  return p0 * (1 + offsetPct);
}

export function computeStandingsFromPrice(p0: number, price: number){
  const lane = priceToLane(p0, price);
  return LANES.map((ball, idx)=>({
    ball,
    idx,
    distance: Math.abs(lane - idx)
  }))
  .sort((a,b)=> a.distance - b.distance || a.idx - b.idx);
}

export function placementForBallAtPrice(ball: string, p0: number, price: number){
  const standings = computeStandingsFromPrice(p0, price);
  const position = standings.findIndex(entry => entry.ball === ball.toUpperCase());
  return position >= 0 ? position + 1 : null;
}

export function formatCurrency(n: number | null | undefined){
  if(n == null || Number.isNaN(n)) return '—';
  return '$' + n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

export function formatPercent(p: number | null | undefined){
  if(p == null || Number.isNaN(p)) return '—';
  return (p >= 0 ? '+' : '') + (p * 100).toFixed(2) + '%';
}

export function ordinal(n: number){
  const v = Math.round(n);
  const suffixes: Record<number, string> = { 1: 'st', 2: 'nd', 3: 'rd' };
  const mod100 = v % 100;
  if(mod100 >= 11 && mod100 <= 13) return v + 'th';
  return v + (suffixes[v % 10] || 'th');
}
