const { useState, useEffect, useMemo, useRef, createContext, useContext } = React;
const { createRoot } = ReactDOM;
const { BrowserRouter, Routes, Route, Link, useNavigate } = ReactRouterDOM;

const StatusContext = createContext(null);

function useInterval(callback, delay){
  const saved = useRef();
  useEffect(()=>{ saved.current = callback; }, [callback]);
  useEffect(()=>{
    if(delay==null) return;
    const id = setInterval(()=>saved.current && saved.current(), delay);
    return ()=>clearInterval(id);
  }, [delay]);
}

function useStatusPolling(role){
  const [status, setStatus] = useState(null);
  const interval = role==='presenter'? 100 : 1000; // 100ms vs 1s
  useInterval(async ()=>{
    try { const s = await ombApi.status(); setStatus(s); } catch(e){ /* noop */ }
  }, interval);
  useEffect(()=>{ (async()=>{ setStatus(await ombApi.status()); })(); }, []);
  return status;
}

function Layout({title, right}){
  return (
    <div className="container">
      <div className="header">
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          <span className="badge">Oh&nbsp;My&nbsp;Balls</span>
          <div className="title">{title}</div>
        </div>
        {right}
      </div>
    </div>
  );
}

// Presenter Lobby
function PresenterLobby(){
  const status = useStatusPolling('presenter');
  const navigate = useNavigate();

  useEffect(()=>{
    if(!status) return;
    if(status.phase==='live') navigate('/presenter/live');
    if(status.phase==='results') navigate('/presenter/results');
  }, [status]);

  const participants = status?.participants || {};
  const list = Object.entries(participants).map(([uuid, p], i)=>({idx:i+1, uuid, ball:p.ball}));

  return (
    <div className="container">
      <div className="header">
        <div className="brand">
          <span className="badge">Oh&nbsp;My&nbsp;Balls</span>
          <div className="title">Presenter — Lobby</div>
        </div>
        <div className="meta">Max players <b>20</b> · Session length <b>30s</b></div>
      </div>
      <div className="grid" style={{gridTemplateColumns:'360px 1fr'}}>
        <div className="card">
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:8}}>
            <div style={{fontWeight:800}}>Join Game</div>
            <span className="tag">Scan to join</span>
          </div>
          <div className="qr">
            <img src="./qr-code.png" alt="Join QR" style={{maxWidth:'100%',maxHeight:'100%'}}/>
          </div>
          <hr/>
          <div className="meta">Tip: replace with actual QR linking to user lobby</div>
        </div>

        <div className="card">
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:12,marginBottom:8}}>
            <div style={{display:'flex',alignItems:'center',gap:10}}>
              <div style={{fontWeight:800}}>Participants</div>
              <span className="pill" style={{background:'rgba(34,211,238,.15)',border:'1px solid rgba(34,211,238,.35)',color:'#67e8f9'}}>{list.length}/20</span>
            </div>
            <div style={{display:'flex',alignItems:'center',gap:8}}>
              <button className="btn" onClick={()=>window.__ombMock?.reset?.()}>Reset</button>
              <button className="btn" onClick={()=>window.__ombMock?.start?.()}>Force Start</button>
            </div>
          </div>
          <table className="table">
            <thead><tr><th style={{width:44}}>#</th><th>UUID</th><th>Ball</th></tr></thead>
            <tbody>
              {list.map(p=>
                <tr key={p.uuid}><td className="meta">{p.idx}</td><td className="meta" title={p.uuid}>{p.uuid.slice(0,8)}…</td><td><span className={`pill ${p.ball.startsWith('B')?'long':'short'}`}>{p.ball}</span></td></tr>
              )}
            </tbody>
          </table>
          <div style={{display:'flex',justifyContent:'flex-end',gap:8,marginTop:12}}>
            <button className="btn" onClick={()=>navigate('/presenter/live')}>Start Game →</button>
          </div>
        </div>
      </div>
      <div className="footer">Demo UI · Mocked backend for now</div>
    </div>
  );
}

// User Lobby
function UserLobby(){
  const [ball, setBall] = useState(null);
  const status = useStatusPolling('user');
  const navigate = useNavigate();

  useEffect(()=>{ (async()=>{ try{ const r = await ombApi.join(); setBall(r.ball); }catch(e){} })(); }, []);

  useEffect(()=>{
    if(!status) return;
    if(status.phase==='live') navigate('/user/live');
    if(status.phase==='results') navigate('/user/results');
  }, [status]);

  const isLong = ball?.startsWith('B');
  return (
    <div className="container">
      <div className="header">
        <div className="brand"><span className="badge">Oh&nbsp;My&nbsp;Balls</span><div className="title">Your Assignment</div></div>
        <span className="tag">Waiting for start…</span>
      </div>
      <div className="card" style={{textAlign:'center',padding:28}}>
        <div className="meta">Your Ball</div>
        <div className={`pill ${isLong?'long':'short'}`} style={{display:'inline-block',margin:'10px 0',padding:'10px 16px',fontSize:28}}>{ball||'—'}</div>
        <div className="meta">Keep this page open. The game will start automatically.</div>
      </div>
      <div className="footer">Mock screen — actual assignment via API</div>
    </div>
  );
}

// Presenter Live (simplified: indicator + lanes and 100ms polling)
function PresenterLive(){
  const status = useStatusPolling('presenter');
  const navigate = useNavigate();
  useEffect(()=>{
    if(!status) return;
    if(status.phase==='lobby') navigate('/presenter/lobby');
    if(status.phase==='results') navigate('/presenter/results');
  }, [status]);

  const labels = useMemo(()=>[...Array(9).keys()].map(i=>'B'+(9-i)).concat(['B0','S0']).concat([...Array(9).keys()].map(i=>'S'+(i+1))),[]);
  const mid = (labels.length-1)/2;
  const canvasRef = useRef(null);
  const indicatorRef = useRef(null);
  const lanesWrapRef = useRef(null);

  function yScaleDOM(idxLike){
    const canvas = canvasRef.current; if(!canvas) return 0;
    const centerY = canvas.clientHeight/2;
    const gridZoneHeight = canvas.clientHeight*0.6;
    const maxOffset = gridZoneHeight/2;
    const verticalSpacingMultiplier = 2.3;
    const normalizedPos = (idxLike - mid) / (labels.length - 1) * verticalSpacingMultiplier;
    const y = centerY + (normalizedPos * maxOffset);
    return Math.max(0, Math.min(canvas.clientHeight, y));
  }

  useEffect(()=>{
    const canvas = canvasRef.current; const lanes = lanesWrapRef.current; if(!canvas||!lanes) return;
    const rect = canvas.getBoundingClientRect();
    lanes.style.height = canvas.clientHeight+'px';
    // Position lane dots
    Array.from(lanes.children).forEach((c, i)=>{ c.style.top = yScaleDOM(i)+'px'; });
  });

  useEffect(()=>{
    const y = yScaleDOM(status? Math.max(0, Math.min(labels.length-1, Math.round(status.nowIdx||mid))) : mid);
    if(indicatorRef.current) indicatorRef.current.style.top = y+'px';
  }, [status]);

  return (
    <div className="container">
      <div className="header">
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          <span className="badge">Oh&nbsp;My&nbsp;Balls</span>
          <div className="title">Presenter — Live</div>
        </div>
        <div className="timeline card" style={{padding:'8px 12px'}}>
          <div className="meta">t0</div>
          <div className="ticks">{Array.from({length:31}).map((_,i)=><div key={i} className="tick" />)}</div>
          <div className="meta">t30</div>
        </div>
      </div>

      <div className="stage">
        <div className="leftPanel">
          <div className="card" style={{position:'relative'}}>
            <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:8,marginBottom:8}}>
              <div className="stat"><div className="meta">Anchor p0</div><div className="v">{status?.p0? fmt(status.p0):'—'}</div></div>
              <div className="stat"><div className="meta">Current</div><div className="v">{status?.p0? fmt((status.p0||0)*(1+(status.chgPct||0))):'—'}</div></div>
              <div className="stat"><div className="meta">Δ %</div><div className="v">{status? pct(status.chgPct):'—'}</div></div>
              <div className="stat"><div className="meta">Direction</div><div className="v">{(status?.chgPct||0)>0?'↑ Long (B)':(status?.chgPct||0)<0?'↓ Short (S)':'—'}</div></div>
            </div>
            <div style={{position:'relative'}}>
              <canvas ref={canvasRef} className="chart" width="900" height="700" />
              <div ref={indicatorRef} className="indicatorLine" style={{top: '50%'}} />
            </div>
            <div style={{display:'flex',gap:8,marginTop:10}}>
              <button className="btn" onClick={()=>window.__ombMock?.lobby?.()}>Reset</button>
              <button className="btn" onClick={()=>window.__ombMock?.resolve?.()}>Resolve →</button>
            </div>
          </div>
        </div>
        <div className="rightPanel">
          <div className="card">
            <div style={{fontWeight:800,marginBottom:8}}>Balls (S9→B9)</div>
            <div className="lanesWrap" ref={lanesWrapRef}>
              {labels.map(l=>{
                const side = l.startsWith('B')?'long':'short';
                return <div key={l} className="laneDot"><span className={`ball ${side}`}>{l}</span></div>;
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function fmt(n){ return '$'+Number(n).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g,','); }
function pct(p){ if(p==null) return '—'; return (p>=0?'+':'')+(p*100).toFixed(2)+'%'; }

// User Live
function UserLive(){
  const status = useStatusPolling('user');
  const [ball, setBall] = useState(localStorage.getItem('last_ball') || null);
  const navigate = useNavigate();
  useEffect(()=>{ (async()=>{ try{ const r = await ombApi.join(); setBall(r.ball); localStorage.setItem('last_ball', r.ball);}catch(e){} })(); }, []);
  useEffect(()=>{
    if(!status) return;
    if(status.phase==='lobby') navigate('/user/lobby');
    if(status.phase==='results') navigate('/user/results');
  }, [status]);
  const [t, setT] = useState(0);
  useInterval(()=> setT(v=> Math.min(30, v+1)), 1000);
  return (
    <div className="container">
      <div className="header">
        <div className="brand"><span className="badge">Oh&nbsp;My&nbsp;Balls</span><div className="title">Live</div></div>
        <span className="tag">{30-t}s</span>
      </div>
      <div className="card" style={{textAlign:'center',padding:28}}>
        <div className="meta">Your Ball</div>
        <div className={`pill ${ball?.startsWith('B')?'long':'short'}`} style={{display:'inline-block',margin:'8px 0',fontSize:24,padding:'8px 14px'}}>{ball||'—'}</div>
        <div className="meta">Ball index (0..20)</div>
        <div className="placing">—</div>
        <hr/>
        <div className="meta">Live updates every 1s</div>
        <div className="progress" style={{marginTop:10}}><div style={{width:(t/30*100)+'%'}} /></div>
      </div>
      <div className="footer">You’ll see final place on resolve</div>
    </div>
  );
}

// Results
function PresenterResults(){
  const status = useStatusPolling('presenter');
  const navigate = useNavigate();
  useEffect(()=>{ if(!status) return; if(status.phase==='lobby') navigate('/presenter/lobby'); if(status.phase==='live') navigate('/presenter/live'); }, [status]);
  const wb = status?.winner?.ball || 'B0';
  const isLong = wb.startsWith('B');
  return (
    <div className="container">
      <div className="header">
        <div className="brand"><span className="badge">Oh&nbsp;My&nbsp;Balls</span><div className="title">Presenter — Results</div></div>
        <div><button className="btn" onClick={()=>window.__ombMock?.lobby?.()}>New Round</button></div>
      </div>
      <div className="card">
        <div style={{display:'flex',gap:16,alignItems:'center'}}>
          <div className={`ball ${isLong?'long':'short'} win`}>★</div>
          <div>
            <div className="pill" style={{background:'rgba(34,211,238,.15)',border:'1px solid rgba(34,211,238,.35)',color:'#67e8f9'}}>Winner</div>
            <div className="big">—</div>
            <div className="meta">Ball <span className={`pill ${isLong?'long':'short'}`}>{wb}</span> · Closest to final price</div>
          </div>
        </div>
        <hr/>
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12}}>
          <div className="card"><div className="meta">Anchor p0</div><div className="big">{status?.p0?fmt(status.p0):'—'}</div></div>
          <div className="card"><div className="meta">Final p30</div><div className="big">{status?.p30?fmt(status.p30):'—'}</div></div>
          <div className="card"><div className="meta">Δ %</div><div className="big">{pct(status?.chgPct)}</div></div>
        </div>
      </div>
      <div className="footer">Announce the prize IRL (cookies recommended) 🍪</div>
    </div>
  );
}

function UserResults(){
  const status = useStatusPolling('user');
  const ball = localStorage.getItem('last_ball') || 'B0';
  const isLong = ball.startsWith('B');
  return (
    <div className="container">
      <div className="header">
        <div className="brand"><span className="badge">Oh&nbsp;My&nbsp;Balls</span><div className="title">Results</div></div>
        <button className="btn" onClick={()=>location.hash='#/user/lobby'}>Play Again</button>
      </div>
      <div className="card" style={{textAlign:'center',padding:28}}>
        <div className="meta">Final Place</div>
        <div className="place">—</div>
        <div className="meta">Your Ball <span className={`pill ${isLong?'long':'short'}`}>{ball}</span></div>
      </div>
      <div className="footer">Congrats & thanks for playing!</div>
    </div>
  );
}

function Router(){
  // Use hash router to avoid server config
  return (
    <ReactRouterDOM.HashRouter>
      <Routes>
        <Route path="/" element={<Landing/>} />
        <Route path="/presenter/lobby" element={<PresenterLobby/>} />
        <Route path="/presenter/live" element={<PresenterLive/>} />
        <Route path="/presenter/results" element={<PresenterResults/>} />
        <Route path="/user/lobby" element={<UserLobby/>} />
        <Route path="/user/live" element={<UserLive/>} />
        <Route path="/user/results" element={<UserResults/>} />
      </Routes>
    </ReactRouterDOM.HashRouter>
  );
}

function Landing(){
  return (
    <div className="container">
      <div className="header">
        <div className="brand"><span className="badge">Oh&nbsp;My&nbsp;Balls</span><div className="title">App</div></div>
      </div>
      <div className="grid" style={{gridTemplateColumns:'repeat(2,1fr)'}}>
        <div className="card">
          <div style={{fontWeight:800,marginBottom:8}}>Presenter</div>
          <button className="btn" onClick={()=>location.hash='#/presenter/lobby'}>Open Presenter Lobby</button>
        </div>
        <div className="card">
          <div style={{fontWeight:800,marginBottom:8}}>User</div>
          <button className="btn" onClick={()=>location.hash='#/user/lobby'}>Open User Lobby</button>
        </div>
      </div>
      <div className="footer">Mock API {window.__USE_REMOTE_API__? '(remote)':'(local)'} — switch with ?api=remote</div>
    </div>
  );
}

createRoot(document.getElementById('root')).render(<Router/>);


