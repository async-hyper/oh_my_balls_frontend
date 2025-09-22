import { LANES, MID_INDEX, clampIdx } from './game';

const REMOTE_BASE = 'https://omb-api.antosha.app';
const LOCAL_BASE = 'http://localhost:4000';

export interface ParticipantSummary {
  uuid: string;
  ball: string;
  name: string;
  isBot: boolean;
}

export interface PriceSample {
  tMs: number;
  price: number;
  lane: number;
}

export interface StandingEntry {
  uuid: string;
  ball: string;
  name: string;
  isBot: boolean;
  position: number;
  distance: number;
}

export type StatusResponse =
  | { status: 0; roundId: number; capacity: number; participants: ParticipantSummary[] }
  | { status: 1; roundId: number; realtime_price: { price: number; p0: number; startedAt: number; elapsedMs: number; samples: PriceSample[]; standings: StandingEntry[] } }
  | { status: 2; roundId: number; results: { winnerBall: string | null; winnerName: string | null; p0: number | null; p30: number | null; chgPct: number | null; standings: StandingEntry[] } };

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

async function status(init?: { signal?: AbortSignal }): Promise<StatusResponse> {
  if(apiBase){
    const res = await fetch(apiBase+'/status', { signal: init?.signal });
    if(!res.ok) throw new Error('HTTP '+res.status);
    return res.json();
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
    return {
      status: 1,
      roundId: 1,
      realtime_price: {
        price: state.p0 * (1 + (state.chgPct ?? 0)),
        p0: state.p0,
        startedAt: state.startedAt,
        elapsedMs: elapsed,
        samples: [],
        standings: []
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
