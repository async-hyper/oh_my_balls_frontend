const bSide = Array.from({ length: 9 }, (_, i) => `B${9 - i}`);
const sSide = Array.from({ length: 9 }, (_, i) => `S${i + 1}`);
export const LANES = [...bSide, 'B0', 'S0', ...sSide];
export const LANES_BY_ID = new Map(LANES.map((id, idx) => [id, idx]));
export const MID_INDEX = (LANES.length - 1) / 2;
export const LANE_PCT = 0.05 / MID_INDEX; // ±5% spread to extremities
export function clampIdx(idx) {
    return Math.max(0, Math.min(LANES.length - 1, idx));
}
export function indexForBall(ball) {
    if (!ball)
        return null;
    return LANES_BY_ID.get(ball.toUpperCase()) ?? null;
}
export function ballForIndex(idx) {
    return LANES[clampIdx(Math.round(idx))];
}
export function priceSnapshot(p0, idx) {
    if (!p0 || Number.isNaN(p0)) {
        return { pc: null, chgPct: 0, offsetPct: 0 };
    }
    const offsetPct = (MID_INDEX - idx) * LANE_PCT;
    return { pc: p0 * (1 + offsetPct), chgPct: offsetPct, offsetPct };
}
export function classifyBall(ball) {
    return ball && ball.startsWith('B') ? 'long' : 'short';
}
export function formatCurrency(n) {
    if (n == null || Number.isNaN(n))
        return '—';
    return '$' + n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}
export function formatPercent(p) {
    if (p == null || Number.isNaN(p))
        return '—';
    return (p >= 0 ? '+' : '') + (p * 100).toFixed(2) + '%';
}
export function ordinal(n) {
    const v = Math.round(n);
    const suffixes = { 1: 'st', 2: 'nd', 3: 'rd' };
    const mod100 = v % 100;
    if (mod100 >= 11 && mod100 <= 13)
        return v + 'th';
    return v + (suffixes[v % 10] || 'th');
}
