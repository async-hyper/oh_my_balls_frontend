// Simple mock API using localStorage to simulate backend state
(function(){
  const KEY = 'omb_mock_state_v1';
  const read = () => {
    try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; }
  };
  const write = (s) => localStorage.setItem(KEY, JSON.stringify(s));

  const initial = read();
  if(!initial.phase){
    write({
      phase: 'lobby', // lobby | live | results
      p0: null,
      p30: null,
      chgPct: 0,
      nowIdx: 10,
      startedAt: null,
      participants: {}, // uuid -> {ball: 'B0'|'S0'}
      winner: null
    });
  }

  function assignBall(existing){
    const all = [...Array(10).keys()].map(i=>`B${i}`).concat([...Array(10).keys()].map(i=>`S${i}`));
    const used = new Set(Object.values(existing).map(p=>p.ball));
    const remaining = all.filter(b => !used.has(b));
    if(remaining.length===0) return all[Math.floor(Math.random()*all.length)];
    return remaining[Math.floor(Math.random()*remaining.length)];
  }

  async function join(uuid){
    const s = read();
    if(!s.participants[uuid]){
      const ball = assignBall(s.participants);
      s.participants[uuid] = {ball};
      write(s);
    }
    return { ball: s.participants[uuid].ball };
  }

  // Advance simple simulation tick: move nowIdx toward 0..19 band
  function tick(){
    const s = read();
    if(s.phase==='live'){
      const dir = Math.random()>0.5?1:-1;
      let step = Math.random()*1.8 * dir;
      s.nowIdx = Math.max(0, Math.min(19, s.nowIdx + step));
      write(s);
    }
  }
  setInterval(tick, 100);

  async function status(){
    const s = read();
    return {
      phase: s.phase,
      p0: s.p0,
      p30: s.p30,
      chgPct: s.chgPct,
      nowIdx: s.nowIdx,
      participants: s.participants,
      winner: s.winner
    };
  }

  // Presenter controls (for local testing via console)
  window.__ombMock = {
    reset: ()=>{
      write({ phase:'lobby', p0:null, p30:null, chgPct:0, nowIdx:10, startedAt:null, participants:{}, winner:null });
    },
    start: ()=>{
      const s = read();
      s.phase = 'live';
      s.p0 = 62000 + (Math.random()*2000-1000);
      s.startedAt = Date.now();
      write(s);
    },
    resolve: ()=>{
      const s = read();
      s.phase = 'results';
      s.chgPct = (Math.random()*10 - 5)/100;
      s.p30 = s.p0 ? s.p0*(1+s.chgPct) : null;
      const idx = Math.round(Math.max(0, Math.min(19, s.nowIdx)));
      const labels = [...Array(10).keys()].map(i=>`B${i}`).concat([...Array(10).keys()].map(i=>`S${i}`));
      const winnerBall = labels[idx];
      s.winner = { ball: winnerBall };
      write(s);
    },
    lobby: ()=>{ const s=read(); s.phase='lobby'; write(s); }
  };

  // Expose mock transport compatible with api.js
  window.__ombTransport = {
    async post(path, body){
      if(path==='/join') return join(body.uuid);
      throw new Error('Unknown POST '+path);
    },
    async get(path){
      if(path==='/status') return status();
      throw new Error('Unknown GET '+path);
    }
  };
})();


