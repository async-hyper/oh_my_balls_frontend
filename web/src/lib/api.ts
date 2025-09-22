import { LANES, MID_INDEX, clampIdx, priceToLane } from './game';

const REMOTE_BASE = 'https://omb-api.antosha.app/api/v1';
const LOCAL_BASE = 'https://omb-api.antosha.app/api/v1';
//const LOCAL_BASE = 'http://localhost:4000';

export interface ParticipantSummary {
  uuid: string;
  ball: string;
  name: string;
  isBot: boolean;
  targetPrice?: number | null;
  lane?: number | null;
}

export interface PriceSample {
  tMs: number;
  price: number;
  lane: number;
  timestamp?: number;
}

export interface StandingEntry {
  uuid: string;
  ball: string;
  name: string;
  isBot: boolean;
  position: number;
  distance: number;
  targetPrice?: number | null;
  lane?: number | null;
}

interface ParticipantWithDistance extends ParticipantSummary {
  distance: number;
}

export type StatusResponse =
  | { status: 0; roundId: number; capacity: number; participants: ParticipantSummary[] }
  | { status: 1; roundId: number; realtime_price: { price: number; p0: number; startedAt: number; elapsedMs: number; samples: PriceSample[]; standings: StandingEntry[]; participants: ParticipantSummary[] } }
  | { status: 2; roundId: number; results: { winnerBall: string | null; winnerName: string | null; p0: number | null; p30: number | null; chgPct: number | null; standings: StandingEntry[] } };

type RemoteBall = { ball_name?: string; target_price?: number; uuid?: string };
type RemotePoint = { timestamp?: number; price?: number };
type RemoteStatus0 = { status: 0; realtime_price?: number; final_price?: number; balls?: RemoteBall[]; winner?: string };
type RemoteStatus1 = {
  status: 1;
  realtime_price: number;
  p0?: number;
  t0?: number;
  final_price?: number;
  balls?: RemoteBall[];
  points?: RemotePoint[];
  winner?: string;
};
type RemoteStatus2 = { status: 2; final_price?: number; winner?: string };
type RemoteStatusResponse = RemoteStatus0 | RemoteStatus1 | RemoteStatus2;

function mapRemoteStatus(res: RemoteStatusResponse): StatusResponse {
  if(res.status === 0){
    const rawBalls = Array.isArray(res.balls) ? res.balls : [];
    const participants: ParticipantSummary[] = rawBalls.map(ball => {
      const ballName = ball.ball_name ?? '???';
      const targetPrice = typeof ball.target_price === 'number' ? ball.target_price : null;
      return {
        uuid: ball.uuid ?? `unknown-${ballName}`,
        ball: ballName,
        name: ballName,
        isBot: false,
        targetPrice,
        lane: null
      };
    });
    return {
      status: 0,
      roundId: 0,
      capacity: LANES.length,
      participants
    };
  }

  if(res.status === 1){
    const rawBalls = Array.isArray(res.balls) ? res.balls : [];
    const p0 = typeof res.p0 === 'number' ? res.p0 : res.realtime_price;
    const t0Raw = typeof res.t0 === 'number' ? res.t0 : null;
    const startedAtMs = t0Raw != null
      ? (t0Raw > 1e12 ? t0Raw : t0Raw * 1000)
      : Date.now();
    const rawPoints = Array.isArray(res.points) ? res.points : [];
    const samples: PriceSample[] = [];
    for(const point of rawPoints){
      if(typeof point?.price !== 'number') continue;
      const tsRaw = typeof point.timestamp === 'number' ? point.timestamp : null;
      const timestampMs = tsRaw != null ? (tsRaw > 1e12 ? tsRaw : tsRaw * 1000) : startedAtMs;
      const tMs = Math.max(0, timestampMs - startedAtMs);
      const lane = typeof p0 === 'number' && p0 > 0 ? priceToLane(p0, point.price) : MID_INDEX;
      samples.push({ tMs, price: point.price, lane, timestamp: timestampMs });
    }
    samples.sort((a,b)=> a.tMs - b.tMs);

    const lastSample = samples[samples.length - 1];
    const price = lastSample?.price ?? res.realtime_price ?? p0 ?? 0;
    const laneNow = lastSample?.lane ?? (typeof p0 === 'number' && p0 > 0 ? priceToLane(p0, price) : MID_INDEX);

    if(samples.length === 0){
      samples.push({
        tMs: 0,
        price,
        lane: laneNow,
        timestamp: startedAtMs
      });
    }

    const elapsedMs = samples[samples.length - 1]?.tMs ?? Math.max(0, Date.now() - startedAtMs);

    const participantsWithDistance: ParticipantWithDistance[] = rawBalls.map(ball => {
      const ballName = ball.ball_name ?? '???';
      const targetPrice = typeof ball.target_price === 'number' ? ball.target_price : null;
      const lane = targetPrice != null && typeof p0 === 'number' && p0 > 0
        ? priceToLane(p0, targetPrice)
        : null;
      const distance = lane != null ? Math.abs(lane - laneNow) : Number.POSITIVE_INFINITY;
      return {
        uuid: ball.uuid ?? `unknown-${ballName}`,
        ball: ballName,
        name: ballName,
        isBot: false,
        targetPrice,
        lane,
        distance
      };
    });

    const standings: StandingEntry[] = participantsWithDistance
      .map(part => ({
        uuid: part.uuid,
        ball: part.ball,
        name: part.name,
        isBot: part.isBot,
        distance: part.distance ?? Number.POSITIVE_INFINITY,
        targetPrice: part.targetPrice ?? null,
        lane: part.lane ?? null
      }))
      .sort((a,b)=> a.distance - b.distance)
      .map((entry, idx)=> ({ ...entry, position: idx + 1 }));

    const participants: ParticipantSummary[] = participantsWithDistance.map(({ distance, ...rest }) => ({ ...rest }));

    return {
      status: 1,
      roundId: 0,
      realtime_price: {
        price,
        p0: typeof p0 === 'number' ? p0 : price,
        startedAt: startedAtMs,
        elapsedMs,
        samples,
        standings,
        participants
      }
    };
  }

  return {
    status: 2,
    roundId: 0,
    results: {
      winnerBall: null,
      winnerName: null,
      p0: null,
      p30: null,
      chgPct: null,
      standings: []
    }
  };
}

type Phase = 'lobby' | 'live' | 'results';
type Participant = { ball: string }; // name == ball now
interface MockState {
  phase: Phase;
  p0: number | null;
  p30: number | null;
  chgPct: number;
  nowIdx: number;
  participants: Record<string, Participant>;
  winner: Participant | null;
  startedAt: number | null;
}

type ApiMode = 'remote' | 'local' | 'mock';

const params = new URLSearchParams(location.search);
const requestedMode = params.get('api');

function resolveMode(): ApiMode {
  if(requestedMode === 'remote' || requestedMode === 'local' || requestedMode === 'mock'){
    return requestedMode;
  }
  return import.meta.env.PROD ? 'remote' : 'local';
}

const apiMode: ApiMode = resolveMode();
const apiBase = apiMode === 'remote'
  ? REMOTE_BASE
  : apiMode === 'local'
    ? LOCAL_BASE
    : null;

function getOrCreateUUID(): string {
  const k = 'omb_uuid';
  let v = localStorage.getItem(k);
  if(!v){
    const newId = (crypto as any).randomUUID?.() || Math.random().toString(36).slice(2);
    localStorage.setItem(k, newId);
    return newId;
  }
  return v;
}

async function join(): Promise<{ball:string}> {
  const uuid = getOrCreateUUID();
  if(apiBase){
    const res = await fetch(apiBase+'/join', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ uuid })
    });
    if(!res.ok) throw new Error('HTTP '+res.status);
    const data = await res.json();
    return { ball: data.ball };
  }
  const result = await mockJoin(uuid);
  return { ball: result.ball };
}

async function status(): Promise<StatusResponse> {
  if(apiBase){
    const res = await fetch(apiBase+'/status');
    if(!res.ok) throw new Error('HTTP '+res.status);
    const data = await res.json();
    const shouldMapRemote = apiMode === 'remote'
      || (typeof data === 'object' && data !== null && (
        'balls' in data
        || typeof (data as any).realtime_price === 'number'
      ));
    if(shouldMapRemote){
      return mapRemoteStatus(data as RemoteStatusResponse);
    }
    return data as StatusResponse;
  }
  return mockStatus();
}

async function start(): Promise<void> {
  if(apiBase){
    const res = await fetch(apiBase+'/start', { method:'POST' });
    if(!res.ok) throw new Error('HTTP '+res.status);
    return;
  }
  mock.start();
}

async function reset(): Promise<void> {
  if(apiBase){
    await fetch(apiBase+'/reset', { method:'POST' });
    return;
  }
  mock.reset();
}

// Mock fallback (localStorage)
const KEY = 'omb_mock_state_v1';
const defaultState: MockState = { phase:'lobby', p0:null, p30:null, chgPct:0, nowIdx:MID_INDEX, startedAt:null, participants:{}, winner:null };

function read(): MockState {
  try{
    const raw = JSON.parse(localStorage.getItem(KEY) || 'null') as Partial<MockState> | null;
    if(raw){
      return {
        ...defaultState,
        ...raw,
        nowIdx: raw.nowIdx ?? defaultState.nowIdx,
        participants: raw.participants ? { ...raw.participants } : {},
        winner: raw.winner ?? null,
        startedAt: raw.startedAt ?? null,
      };
    }
  }catch{/* ignore */}
  return { ...defaultState, participants:{} };
}

function write(state: MockState){ localStorage.setItem(KEY, JSON.stringify(state)); }

if(!localStorage.getItem(KEY)) write(defaultState);

function assignBall(existing: Record<string,Participant>){
  const used = new Set(Object.values(existing).map(p=>p.ball));
  const remaining = LANES.filter(b=>!used.has(b));
  if(remaining.length===0) return LANES[Math.floor(Math.random()*LANES.length)];
  const index = Math.floor(Math.random()*remaining.length);
  return remaining[index];
}

async function mockJoin(uuid:string){
  const s = read();
  if(!s.participants[uuid]){
    s.participants[uuid] = { ball: assignBall(s.participants) };
    write(s);
  }
  return { ball: s.participants[uuid].ball };
}

async function mockStatus(): Promise<StatusResponse>{
  const state = read();
  if(state.phase === 'lobby'){
    return {
      status: 0,
      roundId: 1,
      capacity: LANES.length,
      participants: Object.entries(state.participants).map(([uuid, value])=>({ uuid, ball: value.ball, name: value.ball, isBot: uuid.startsWith('bot-') }))
    };
  }
  if(state.phase === 'live' && state.p0 && state.startedAt){
    const elapsed = Date.now() - state.startedAt;
    const currentPrice = state.p0 * (1 + (state.chgPct ?? 0));
    const laneNow = priceToLane(state.p0, currentPrice);
    const samples: PriceSample[] = [{
      tMs: Math.max(0, elapsed),
      price: currentPrice,
      lane: laneNow,
      timestamp: state.startedAt + Math.max(0, elapsed)
    }];
    const participants: ParticipantSummary[] = Object.entries(state.participants).map(([uuid, value])=>{
      const laneIdx = LANES.indexOf(value.ball as typeof LANES[number]);
      return {
        uuid,
        ball: value.ball,
        name: value.ball,
        isBot: uuid.startsWith('bot-'),
        lane: laneIdx >= 0 ? laneIdx : null,
        targetPrice: null
      };
    });
    const standings: StandingEntry[] = participants
      .map(part => ({
        uuid: part.uuid,
        ball: part.ball,
        name: part.name,
        isBot: part.isBot,
        lane: part.lane ?? null,
        targetPrice: null,
        distance: part.lane != null ? Math.abs(part.lane - laneNow) : Number.POSITIVE_INFINITY
      }))
      .sort((a,b)=> a.distance - b.distance)
      .map((entry, idx)=> ({ ...entry, position: idx + 1 }));
    return {
      status: 1,
      roundId: 1,
      realtime_price: {
        price: state.p0 * (1 + (state.chgPct ?? 0)),
        p0: state.p0,
        startedAt: state.startedAt,
        elapsedMs: elapsed,
        samples,
        standings,
        participants
      }
    };
  }
  return {
    status: 2,
    roundId: 1,
    results: {
      winnerBall: state.winner?.ball ?? null,
      winnerName: state.winner?.ball ?? null,
      p0: state.p0,
      p30: state.p30,
      chgPct: state.chgPct,
      standings: []
    }
  };
}

export const mock = {
  reset(){ write({ ...defaultState, participants:{} }); },
  start(){ const s=read(); s.phase='live'; s.p0 = 62000 + (Math.random()*2000-1000); s.startedAt = Date.now(); s.chgPct = 0; s.p30 = null; s.winner = null; write(s); },
  resolve(){ const s=read(); s.phase='results'; s.chgPct=(Math.random()*10-5)/100; if(!s.p0){ s.p0 = 62000 + (Math.random()*2000-1000); } s.p30=s.p0?(s.p0*(1+s.chgPct)):null; const idx=clampIdx(s.nowIdx); s.nowIdx = idx; s.winner={ball:LANES[Math.round(idx)]}; s.startedAt = null; write(s); },
  addRandom(){ const uuid = (crypto as any).randomUUID?.() || Math.random().toString(36).slice(2); return mockJoin(uuid); },
  seed(n:number){ for(let i=0;i<n;i++) this.addRandom(); }
};

export const api = { join, status, start, reset, getOrCreateUUID, mode: apiMode };
