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

