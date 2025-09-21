const BALL_SEQUENCE = [
  ...Array.from({ length: 10 }, (_, i) => `B${i}`),
  ...Array.from({ length: 10 }, (_, i) => `S${i}`)
] as const;

const participants = new Map<string, string>();
const assignedSet = new Set<string>();
const assignedOrder: string[] = [];

function claimBall(ball: string, uuid?: string){
  if(!assignedSet.has(ball)){
    assignedSet.add(ball);
    assignedOrder.push(ball);
  }
  if(uuid){
    participants.set(uuid, ball);
  }
}

function nextAvailableBall(): string | null {
  for(const ball of BALL_SEQUENCE){
    if(!assignedSet.has(ball)) return ball;
  }
  return null;
}

export function resetMockLobby(){
  participants.clear();
  assignedSet.clear();
  assignedOrder.length = 0;
}

export async function mockStatus(): Promise<{ status: number; balls: string[] }>{
  const next = nextAvailableBall();
  if(next){
    claimBall(next);
  }
  return Promise.resolve({ status: 0, balls: [...assignedOrder] });
}

export async function mockJoin(uuid: string): Promise<{ ball: string }>{
  const existing = participants.get(uuid);
  if(existing){
    return Promise.resolve({ ball: existing });
  }
  const next = nextAvailableBall();
  if(next){
    claimBall(next, uuid);
    return Promise.resolve({ ball: next });
  }
  const fallback = BALL_SEQUENCE[Math.floor(Math.random()*BALL_SEQUENCE.length)];
  claimBall(fallback, uuid);
  return Promise.resolve({ ball: fallback });
}

export function totalBalls(){
  return BALL_SEQUENCE.length;
}

interface LiveState {
  p0: number;
  price: number;
  velocity: number;
}

let liveState: LiveState | null = null;

export function resetMockLive(){
  liveState = null;
}

export async function mockLiveStatus(): Promise<{ status: number; realtime_price: { price: number; p0: number } }>{
  if(!liveState){
    const base = 62000 + (Math.random()*2000-1000);
    liveState = { p0: base, price: base, velocity: 0 };
  }else{
    const drift = (Math.random() - 0.5) * 0.0025; // smooth drift
    liveState.velocity = (liveState.velocity + drift) * 0.8;
    const next = liveState.price * (1 + liveState.velocity);
    const minPrice = liveState.p0 * 0.93;
    const maxPrice = liveState.p0 * 1.07;
    liveState.price = Math.max(minPrice, Math.min(maxPrice, next));
  }
  const snapshot = { price: liveState!.price, p0: liveState!.p0 };
  return Promise.resolve({ status: 1, realtime_price: snapshot });
}
