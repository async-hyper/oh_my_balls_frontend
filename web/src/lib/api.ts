import { LANES, MID_INDEX, clampIdx } from './game';

const REMOTE_BASE = 'https://api-omb.antosha.app';

export type Phase = 'lobby' | 'live' | 'results';
export interface Status {
  phase: Phase;
  p0: number | null;
  p30: number | null;
  chgPct: number;
  nowIdx: number;
  participants: Record<string, { ball: string, name?: string }>;
  winner: { ball: string } | null;
  startedAt?: number | null;
}

type Participant = { ball: string, name?: string };
interface MockState {
  phase: Phase;
  p0: number | null;
  p30: number | null;
  chgPct: number;
  nowIdx: number;
  participants: Record<string, Participant>;
  winner: { ball: string } | null;
  startedAt: number | null;
}

const useRemote = new URLSearchParams(location.search).get('api') === 'remote';

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

async function join(name?:string): Promise<{ball:string, name?:string}> {
  const uuid = getOrCreateUUID();
  if(useRemote){
    const res = await fetch(REMOTE_BASE+'/join', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ uuid }) });
    if(!res.ok) throw new Error('HTTP '+res.status);
    return res.json();
  }
  return mockJoin(uuid, name);
}

async function status(): Promise<Status> {
  if(useRemote){
    const res = await fetch(REMOTE_BASE+'/status');
    if(!res.ok) throw new Error('HTTP '+res.status);
    return res.json();
  }
  return mockStatus();
}

// Mock layer
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
  return remaining[Math.floor(Math.random()*remaining.length)];
}

const namePool = ["Atlas","Nova","Zora","Kai","Mira","Juno","Vega","Rex","Luna","Orion","Echo","Rune","Iris","Nix","Axel","Skye","Pax","Rio","Nyx","Zed"];

async function mockJoin(uuid:string, name?:string){
  const s = read();
  if(!s.participants[uuid]){
    s.participants[uuid] = { ball: assignBall(s.participants), name: name || namePool[Math.floor(Math.random()*namePool.length)] };
    write(s);
  }
  return { ball: s.participants[uuid].ball, name: s.participants[uuid].name };
}

async function mockStatus(): Promise<Status>{
  return read();
}

// mock controls for local testing
export const mock = {
  reset(){ write({ ...defaultState, participants:{} }); },
  start(){ const s=read(); s.phase='live'; s.p0 = 62000 + (Math.random()*2000-1000); s.startedAt = Date.now(); s.chgPct = 0; s.p30 = null; s.winner = null; write(s); },
  resolve(){ const s=read(); s.phase='results'; s.chgPct=(Math.random()*10-5)/100; if(!s.p0){ s.p0 = 62000 + (Math.random()*2000-1000); } s.p30=s.p0?(s.p0*(1+s.chgPct)):null; const idx=clampIdx(s.nowIdx); s.nowIdx = idx; s.winner={ball:LANES[Math.round(idx)]}; s.startedAt = null; write(s); },
  addRandom(){ const uuid = (crypto as any).randomUUID?.() || Math.random().toString(36).slice(2); return mockJoin(uuid); },
  seed(n:number){ for(let i=0;i<n;i++) this.addRandom(); }
};

// small ticker to move index during live
setInterval(()=>{ const s=read(); if(s.phase==='live'){ const dir=Math.random()>0.5?1:-1; let step=Math.random()*1.8*dir; s.nowIdx=clampIdx(s.nowIdx + step); write(s);} }, 100);

export const api = { join, status, getOrCreateUUID };
