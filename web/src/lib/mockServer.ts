import { getState, resetState, updateState, Participant, MockState, StandingEntry, PriceSample } from './mockStore';
import { LANES, indexForBall, LANE_PCT, MID_INDEX } from './game';

const TOTAL_BALLS = LANES.length;
const LOBBY_PHASE: 0 = 0;
const LIVE_PHASE: 1 = 1;
const RESULTS_PHASE: 2 = 2;

const TICK_MS = 100;
const DURATION_MS = 30_000;
const CLAMP_PCT = 0.07; // ±7%
const BOT_NAME_SEQUENCE = [
  'S9','S8','S7','S6','S5','S4','S3','S2','S1','S0',
  'B0','B1','B2','B3','B4','B5','B6','B7','B8','B9'
];

export interface LobbyStatus {
  status: 0;
  roundId: number;
  capacity: number;
  participants: Array<Pick<Participant, 'uuid' | 'ball' | 'name' | 'isBot'>>;
}

export interface LiveStatus {
  status: 1;
  roundId: number;
  realtime_price: {
    price: number;
    p0: number;
    startedAt: number;
    elapsedMs: number;
    samples: PriceSample[];
    standings: StandingEntry[];
  };
}

export interface ResultsStatus {
  status: 2;
  roundId: number;
  results: {
    winnerBall: string | null;
    winnerName: string | null;
    p0: number | null;
    p30: number | null;
    chgPct: number | null;
    standings: StandingEntry[];
  };
}

export type StatusResponse = LobbyStatus | LiveStatus | ResultsStatus;

function availableBalls(state: MockState): string[] {
  const taken = new Set(state.participants.map(p=>p.ball));
  return LANES.filter(ball => !taken.has(ball));
}

function playerDisplayName(uuid: string): string {
  return `Player ${uuid.slice(0, 4).toUpperCase()}`;
}

function nextBotName(state: MockState): string {
  const used = new Set(state.participants.filter(p=>p.isBot).map(p=>p.name));
  const available = BOT_NAME_SEQUENCE.find(name => !used.has(name));
  return available ?? `Bot-${state.participants.length + 1}`;
}

function priceToLane(p0: number, price: number): number {
  const offsetPct = (price / p0) - 1;
  return MID_INDEX - (offsetPct / LANE_PCT);
}

function laneToPrice(p0: number, lane: number): number {
  const offsetPct = (MID_INDEX - lane) * LANE_PCT;
  return p0 * (1 + offsetPct);
}

function computeStandings(state: MockState, lanePosition: number): StandingEntry[] {
  return state.participants
    .map(participant => {
      const idx = indexForBall(participant.ball) ?? MID_INDEX;
      const distance = Math.abs(lanePosition - idx);
      return { ...participant, position: 0, distance };
    })
    .sort((a,b)=> a.distance - b.distance || a.joinedAt - b.joinedAt)
    .map((entry, index)=> ({
      uuid: entry.uuid,
      ball: entry.ball,
      name: entry.name,
      isBot: entry.isBot,
      position: index + 1,
      distance: entry.distance
    }));
}

function ensureLiveSamples(state: MockState): void {
  if(state.phase !== LIVE_PHASE) return;
  const live = state.live;
  if(!live.startedAt || !live.p0) return;
  const now = Date.now();
  const elapsed = Math.min(now - live.startedAt, DURATION_MS);
  const lastSample = live.samples[live.samples.length - 1];
  let nextTick = lastSample ? lastSample.tMs + TICK_MS : 0;
  let lastPrice = lastSample ? lastSample.price : live.p0;

  while(nextTick <= elapsed){
    lastPrice = nextPrice(live, lastPrice);
    const lane = priceToLane(live.p0, lastPrice);
    live.samples.push({ tMs: nextTick, price: lastPrice, lane });
    live.lastTickAt = now;
    nextTick += TICK_MS;
  }

  if(elapsed >= DURATION_MS){
    concludeRound(state);
  }
}

function nextPrice(live: MockState['live'], prevPrice: number): number {
  const base = live.p0 ?? prevPrice;
  let velocity = live.velocity;
  const variance = (Math.random() - 0.5) * 0.0035;
  velocity = (velocity * 0.85) + variance;
  let price = prevPrice * (1 + velocity);
  const min = base * (1 - CLAMP_PCT);
  const max = base * (1 + CLAMP_PCT);
  if(price < min){ price = min; velocity = Math.abs(velocity); }
  if(price > max){ price = max; velocity = -Math.abs(velocity); }
  live.velocity = velocity;
  return price;
}

function concludeRound(state: MockState): void {
  if(state.phase !== LIVE_PHASE) return;
  const live = state.live;
  const finalSample = live.samples[live.samples.length - 1];
  if(!finalSample || !live.p0) return;

  const standings = computeStandings(state, finalSample.lane);
  const winner = standings[0] ?? null;

  state.phase = RESULTS_PHASE;
  live.finalPrice = finalSample.price;
  state.results = {
    winnerBall: winner?.ball ?? null,
    winnerName: winner?.name ?? null,
    p30: finalSample.price,
    p0: live.p0,
    chgPct: live.p0 ? (finalSample.price - live.p0) / live.p0 : null,
    resolvedAt: Date.now(),
    standings
  };
}

export async function mockStatus(): Promise<StatusResponse> {
  const state = updateState(current => {
    if(current.phase === LIVE_PHASE){
      ensureLiveSamples(current);
    }
    return current;
  });

  if(state.phase === LOBBY_PHASE){
    return {
      status: 0,
      roundId: state.roundId,
      capacity: TOTAL_BALLS,
      participants: state.participants.map(({ uuid, ball, name, isBot })=>({ uuid, ball, name, isBot }))
    };
  }

  if(state.phase === LIVE_PHASE && state.live.p0 && state.live.startedAt){
    const latest = state.live.samples[state.live.samples.length - 1];
    const lane = latest ? latest.lane : MID_INDEX;
    return {
      status: 1,
      roundId: state.roundId,
      realtime_price: {
        price: latest ? latest.price : state.live.p0,
        p0: state.live.p0,
        startedAt: state.live.startedAt,
        elapsedMs: latest ? latest.tMs : 0,
        samples: state.live.samples,
        standings: computeStandings(state, lane)
      }
    };
  }

  return {
    status: 2,
    roundId: state.roundId,
    results: {
      winnerBall: state.results.winnerBall,
      winnerName: state.results.winnerName,
      p0: state.results.p0,
      p30: state.results.p30,
      chgPct: state.results.chgPct,
      standings: state.results.standings ?? []
    }
  };
}

export async function mockJoin(uuid: string): Promise<{ ball: string; name: string }>{
  return updateState(state => {
    let participant = state.participants.find(p=>p.uuid === uuid);
    if(participant){
      return { ball: participant.ball, name: participant.name };
    }
    const available = availableBalls(state);
    const assignedBall = available[0] ?? LANES[Math.floor(Math.random()*LANES.length)];
    const entry: Participant = {
      uuid,
      ball: assignedBall,
      name: playerDisplayName(uuid),
      isBot: false,
      joinedAt: Date.now()
    };
    state.participants.push(entry);
    return { ball: entry.ball, name: entry.name };
  });
}

export async function forceStart(): Promise<void> {
  updateState(state => {
    if(state.phase !== LOBBY_PHASE) return;
    const available = availableBalls(state);
    available.forEach((ball, idx)=>{
      const botUuid = `bot-${ball.toLowerCase()}`;
      const existing = state.participants.find(p=>p.uuid === botUuid);
      if(existing) return;
      state.participants.push({
        uuid: botUuid,
        ball,
        name: nextBotName(state),
        isBot: true,
        joinedAt: Date.now() + idx
      });
    });
    startLivePhase(state);
  });
}

function startLivePhase(state: MockState): void {
  if(state.phase !== LOBBY_PHASE) return;
  const base = 62000 + (Math.random()*2000 - 1000);
  state.phase = LIVE_PHASE;
  state.live.startedAt = Date.now();
  state.live.p0 = base;
  state.live.samples = [{ tMs: 0, price: base, lane: MID_INDEX }];
  state.live.velocity = 0;
  state.live.lastTickAt = state.live.startedAt;
  state.live.finalPrice = null;
  state.results = {
    winnerBall: null,
    winnerName: null,
    p30: null,
    p0: base,
    chgPct: null,
    resolvedAt: null,
    standings: []
  };
}

export async function mockLiveStatus(): Promise<LiveStatus | ResultsStatus>{
  const state = updateState(current => {
    if(current.phase === LIVE_PHASE){
      ensureLiveSamples(current);
    }
    return current;
  });

  if(state.phase === LIVE_PHASE && state.live.p0 && state.live.startedAt){
    const latest = state.live.samples[state.live.samples.length - 1];
    const lane = latest ? latest.lane : MID_INDEX;
    return {
      status: 1,
      roundId: state.roundId,
      realtime_price: {
        price: latest ? latest.price : state.live.p0,
        p0: state.live.p0,
        startedAt: state.live.startedAt,
        elapsedMs: latest ? latest.tMs : 0,
        samples: state.live.samples,
        standings: computeStandings(state, lane)
      }
    };
  }

  return {
    status: 2,
    roundId: state.roundId,
    results: {
      winnerBall: state.results.winnerBall,
      winnerName: state.results.winnerName,
      p0: state.results.p0,
      p30: state.results.p30,
      chgPct: state.results.chgPct,
      standings: state.results.standings ?? []
    }
  };
}

export async function lobbyStatus(): Promise<LobbyStatus>{
  const res = await mockStatus();
  if(res.status !== 0){
    throw new Error('Not in lobby phase');
  }
  return res;
}

export function resetRound(): void {
  resetState();
}

export function totalBalls(): number {
  return TOTAL_BALLS;
}

export const BOT_NAMES = BOT_NAME_SEQUENCE.map(name => `Bot ${name}`);
