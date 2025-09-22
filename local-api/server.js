#!/usr/bin/env node
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 4000;
const DATA_FILE = path.join(__dirname, 'state.json');

const LANES = [
  'B9','B8','B7','B6','B5','B4','B3','B2','B1','B0',
  'S0','S1','S2','S3','S4','S5','S6','S7','S8','S9'
];
const BOT_FILL_ORDER = [
  'S9','S8','S7','S6','S5','S4','S3','S2','S1','S0',
  'B0','B1','B2','B3','B4','B5','B6','B7','B8','B9'
];
const LANE_INDEX = new Map(LANES.map((ball, idx) => [ball, idx]));
const MID_INDEX = (LANES.length - 1) / 2;
const LANE_PCT = 0.001; // 0.1% per lane step
const TOTAL_BALLS = LANES.length;

const TICK_MS = 100;
const DURATION_MS = 30_000;
const CLAMP_PCT = 0.015; // ±1.5%

function loadState(){
  try{
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(raw);
  }catch(err){
    const initial = {
      phase: 0,
      roundId: 1,
      participants: [],
      live: {
        startedAt: null,
        p0: null,
        samples: [],
        velocity: 0,
        lastTickAt: null,
        finalPrice: null
      },
      results: {
        winnerBall: null,
        winnerName: null,
        p0: null,
        p30: null,
        chgPct: null,
        resolvedAt: null,
        standings: []
      }
    };
    saveState(initial);
    return initial;
  }
}

function saveState(state){
  fs.writeFileSync(DATA_FILE, JSON.stringify(state, null, 2));
}

let state = loadState();

function shuffle(order){
  const copy = [...order];
  for(let i=copy.length-1;i>0;i--){
    const j = Math.floor(Math.random()*(i+1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function availableBalls(order = LANES){
  const taken = new Set(state.participants.map(p => p.ball));
  return order.filter(ball => !taken.has(ball));
}

function ensureParticipant(uuid){
  return state.participants.find(p => p.uuid === uuid);
}

function laneForBall(ball){
  return LANE_INDEX.get(ball) ?? MID_INDEX;
}

function priceToLane(p0, price){
  const offsetPct = (price / p0) - 1;
  return MID_INDEX - (offsetPct / LANE_PCT);
}

function nextPrice(prevPrice, base, velocity){
  let vel = velocity;
  // Reduce variance and clamp per-tick step into 0.01%..0.05%
  const variance = (Math.random() - 0.5) * 0.0002; // ~±0.02% influence
  vel = (vel * 0.9) + variance;

  const MAX_STEP = 0.0005; // 0.05%
  const MIN_STEP = 0.0001; // 0.01%
  let absStep = Math.abs(vel);
  if(absStep > MAX_STEP) absStep = MAX_STEP;
  if(absStep < MIN_STEP) absStep = MIN_STEP;
  const dir = vel === 0 ? (Math.random() < 0.5 ? -1 : 1) : (vel > 0 ? 1 : -1);
  const appliedPct = dir * absStep;

  let price = prevPrice * (1 + appliedPct);
  const min = base * (1 - CLAMP_PCT);
  const max = base * (1 + CLAMP_PCT);
  if(price < min){ price = min; vel = Math.abs(vel); }
  if(price > max){ price = max; vel = -Math.abs(vel); }
  return { price, velocity: appliedPct };
}

function computeStandings(lanePosition){
  return state.participants
    .map(p => ({
      uuid: p.uuid,
      ball: p.ball,
      isBot: !!p.isBot,
      joinedAt: p.joinedAt,
      distance: Math.abs(lanePosition - laneForBall(p.ball))
    }))
    .sort((a,b)=> a.distance - b.distance || a.joinedAt - b.joinedAt)
    .map((entry, idx)=> ({
      uuid: entry.uuid,
      ball: entry.ball,
      isBot: entry.isBot,
      position: idx + 1,
      distance: entry.distance
    }));
}

function startLivePhase(){
  if(state.phase !== 0) return;
  const base = 114568.00 + (Math.random()*2000 - 1000);
  state.phase = 1;
  state.live.startedAt = Date.now();
  state.live.p0 = base;
  state.live.samples = [{ tMs: 0, price: base, lane: MID_INDEX }];
  state.live.velocity = 0;
  state.live.lastTickAt = state.live.startedAt;
  state.live.finalPrice = null;
  state.results = {
    winnerBall: null,
    winnerName: null,
    p0: base,
    p30: null,
    chgPct: null,
    resolvedAt: null,
    standings: []
  };
  saveState(state);
}

function concludeRound(){
  if(state.phase !== 1) return;
  const live = state.live;
  const finalSample = live.samples[live.samples.length - 1];
  if(!finalSample || !live.p0) return;
  const standings = computeStandings(finalSample.lane);
  const winner = standings[0] || null;
  state.phase = 2;
  live.finalPrice = finalSample.price;
  state.results = {
    winnerBall: winner ? winner.ball : null,
    winnerName: winner ? winner.ball : null,
    p0: live.p0,
    p30: finalSample.price,
    chgPct: live.p0 ? (finalSample.price - live.p0) / live.p0 : null,
    resolvedAt: Date.now(),
    standings
  };
  saveState(state);
}

function ensureLiveSamples(){
  if(state.phase !== 1) return;
  const live = state.live;
  if(!live.startedAt || !live.p0) return;
  const now = Date.now();
  const elapsed = Math.min(now - live.startedAt, DURATION_MS);
  let lastSample = live.samples[live.samples.length - 1];
  let nextTick = lastSample ? lastSample.tMs + TICK_MS : 0;
  let lastPrice = lastSample ? lastSample.price : live.p0;
  let velocity = live.velocity;
  let updated = false;

  while(nextTick <= elapsed){
    const next = nextPrice(lastPrice, live.p0, velocity);
    lastPrice = next.price;
    velocity = next.velocity;
    const lane = priceToLane(live.p0, lastPrice);
    live.samples.push({ tMs: nextTick, price: lastPrice, lane });
    live.lastTickAt = now;
    nextTick += TICK_MS;
    updated = true;
  }

  live.velocity = velocity;
  if(updated) saveState(state);
  if(elapsed >= DURATION_MS){
    concludeRound();
  }
}

setInterval(()=>{
  if(state.phase === 1){
    state = loadState();
    ensureLiveSamples();
  }
}, TICK_MS);

function resetRound(){
  state = {
    phase: 0,
    roundId: Date.now(),
    participants: [],
    live: {
      startedAt: null,
      p0: null,
      samples: [],
      velocity: 0,
      lastTickAt: null,
      finalPrice: null
    },
    results: {
      winnerBall: null,
      winnerName: null,
      p0: null,
      p30: null,
      chgPct: null,
      resolvedAt: null,
      standings: []
    }
  };
  saveState(state);
}

function writeJson(res, statusCode, payload){
  const body = JSON.stringify(payload);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  res.end(body);
}

function handleJoin(req, res, body){
  try{
    const { uuid, name } = JSON.parse(body || '{}');
    if(!uuid){
      writeJson(res, 400, { error: 'uuid required' });
      return;
    }
    state = loadState();
    if(state.phase === 2){
      resetRound();
    }
    let participant = ensureParticipant(uuid);
    if(participant){
    writeJson(res, 200, { ball: participant.ball, name: participant.ball });
    return;
  }
  const available = shuffle(availableBalls());
  if(available.length === 0){
    writeJson(res, 409, { error: 'Game full' });
    return;
  }
  const assignedBall = available[0];
  participant = {
    uuid,
    ball: assignedBall,
    name: assignedBall,
    isBot: false,
    joinedAt: Date.now()
  };
  state.participants.push(participant);
    if(state.phase === 0 && state.participants.length >= TOTAL_BALLS){
      startLivePhase();
    }else{
      saveState(state);
    }
    writeJson(res, 200, { ball: participant.ball, name: participant.ball });
  }catch(err){
    writeJson(res, 400, { error: err.message || 'Invalid JSON' });
  }
}

function forceStart(){
  state = loadState();
  const available = shuffle(availableBalls(BOT_FILL_ORDER));
  available.forEach((ball, idx)=>{
    const botUuid = `bot-${ball.toLowerCase()}`;
    if(ensureParticipant(botUuid)) return;
    state.participants.push({
      uuid: botUuid,
      ball,
      name: ball,
      isBot: true,
      joinedAt: Date.now() + idx
    });
  });
  startLivePhase();
}

function handleStatus(res){
  state = loadState();
  ensureLiveSamples();
  if(state.phase === 0){
  writeJson(res, 200, {
    status: 0,
    roundId: state.roundId,
    capacity: TOTAL_BALLS,
    participants: state.participants.map(({ uuid, ball, isBot })=>({ uuid, ball, name: ball, isBot }))
  });
    return;
  }
  if(state.phase === 1 && state.live.p0 && state.live.startedAt){
    const latest = state.live.samples[state.live.samples.length - 1];
    const lane = latest ? latest.lane : MID_INDEX;
    writeJson(res, 200, {
      status: 1,
      roundId: state.roundId,
      realtime_price: {
        price: latest ? latest.price : state.live.p0,
        p0: state.live.p0,
        startedAt: state.live.startedAt,
        elapsedMs: latest ? latest.tMs : 0,
        samples: state.live.samples,
        standings: computeStandings(lane).map(entry=>({ ...entry, name: entry.ball }))
      }
    });
    return;
  }
  writeJson(res, 200, {
    status: 2,
    roundId: state.roundId,
    results: {
      winnerBall: state.results.winnerBall,
      winnerName: state.results.winnerBall,
      p0: state.results.p0,
      p30: state.results.p30,
      chgPct: state.results.chgPct,
      standings: state.results.standings.map(entry=>({ ...entry, name: entry.ball }))
    }
  });
}

const server = http.createServer((req, res)=>{
  if(req.method === 'OPTIONS'){
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    return res.end();
  }

  const url = new URL(req.url, `http://${req.headers.host}`);
  if(req.method === 'GET' && url.pathname === '/status'){
    handleStatus(res);
    return;
  }
  if(req.method === 'POST' && url.pathname === '/join'){
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', ()=> handleJoin(req, res, body));
    return;
  }
  if(req.method === 'POST' && url.pathname === '/start'){
    forceStart();
    writeJson(res, 200, { ok: true });
    return;
  }
  if(req.method === 'POST' && url.pathname === '/reset'){
    resetRound();
    writeJson(res, 200, { ok: true });
    return;
  }

  writeJson(res, 404, { error: 'Not found' });
});

server.listen(PORT, ()=>{
  console.log(`Local mock API listening on http://localhost:${PORT}`);
});
