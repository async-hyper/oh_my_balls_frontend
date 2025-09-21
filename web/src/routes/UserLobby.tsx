import React, { useEffect, useMemo, useState } from 'react';
import { mockJoin } from '../lib/mockServer';

function getOrCreateUUID(){
  const key = 'omb_user_uuid';
  const existing = localStorage.getItem(key);
  if(existing) return existing;
  const generated = (crypto as any).randomUUID?.() || Math.random().toString(36).slice(2);
  localStorage.setItem(key, generated);
  return generated;
}

export default function UserLobby(){
  const [ball, setBall] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(()=>{
    const uuid = getOrCreateUUID();
    let cancelled = false;
    (async()=>{
      try{
        const res = await mockJoin(uuid);
        if(cancelled) return;
        setBall(res.ball);
      }finally{
        if(!cancelled) setLoading(false);
      }
    })();
    return ()=>{ cancelled = true; };
  }, []);

  const displayBall = ball ?? '—';
  const side = useMemo(()=> displayBall.startsWith('B') ? 'long' : 'short', [displayBall]);
  const tag = loading ? 'Assigning ball…' : 'Waiting for start…';

  return (
    <div className="container" style={{maxWidth:720}}>
      <div className="header">
        <div className="brand">
          <span className="badge">Oh&nbsp;My&nbsp;Balls</span>
          <div className="title">Your Assignment</div>
        </div>
        <span className="tag">{tag}</span>
      </div>

      <div className="card" style={{textAlign:'center',padding:28}}>
        <div className="meta">Your Ball</div>
        <div className={`bigball pill ${side}`} style={{display:'inline-block',margin:'10px 0',padding:'10px 16px'}}>{displayBall}</div>
        <div className="meta">Keep this page open. The game will start automatically.</div>
        <hr/>
        <div className="notice">Mock screen — ball comes from the /join mock endpoint.</div>
        <div style={{marginTop:12}}>
          <button className="btn" onClick={()=>{ window.location.hash = '#/user/live'; }}>Preview Live Screen →</button>
        </div>
      </div>

      <div className="footer">Tip: add a sound/vibrate on start</div>
    </div>
  );
}
