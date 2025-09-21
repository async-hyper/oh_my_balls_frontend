import rawDefault from '../mock-data/mock-data.json?raw';

export type Phase = 0 | 1 | 2;

export interface Participant {
  uuid: string;
  ball: string;
  name: string;
  isBot: boolean;
  joinedAt: number;
}

export interface PriceSample {
  tMs: number;
  price: number;
  lane: number;
}

export interface LiveState {
  startedAt: number | null;
  p0: number | null;
  samples: PriceSample[];
  velocity: number;
  lastTickAt: number | null;
  finalPrice: number | null;
}

export interface StandingEntry {
  uuid: string;
  ball: string;
  name: string;
  isBot: boolean;
  position: number;
  distance: number;
}

export interface ResultsState {
  winnerBall: string | null;
  winnerName: string | null;
  p30: number | null;
  chgPct: number | null;
  resolvedAt: number | null;
  standings: StandingEntry[];
}

export interface MockState {
  phase: Phase;
  roundId: number;
  participants: Participant[];
  live: LiveState;
  results: ResultsState;
}

const STORAGE_KEY = 'omb_mock_data_v2';
let memoryState: MockState | null = null;

function parseJSON<T>(input: string): T {
  return JSON.parse(input) as T;
}

function defaultState(): MockState {
  return parseJSON<MockState>(rawDefault);
}

function cloneState<T>(state: T): T {
  return JSON.parse(JSON.stringify(state));
}

function loadRawState(): MockState {
  if(typeof window === 'undefined'){
    if(!memoryState){ memoryState = defaultState(); }
    return memoryState;
  }
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if(stored){
    try{
      const parsed = parseJSON<MockState>(stored);
      memoryState = parsed;
      return parsed;
    }catch{
      // fall through to default
    }
  }
  const initial = defaultState();
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
  memoryState = initial;
  return initial;
}

export function getState(): MockState {
  return cloneState(loadRawState());
}

export function saveState(state: MockState): void {
  memoryState = cloneState(state);
  if(typeof window !== 'undefined'){
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(memoryState));
  }
}

export function updateState<T>(mutator: (draft: MockState) => T): T {
  const draft = getState();
  const result = mutator(draft);
  saveState(draft);
  return result;
}

export function resetState(): void {
  const initial = defaultState();
  // bump round id so new round is unique
  initial.roundId = Date.now();
  saveState(initial);
}

