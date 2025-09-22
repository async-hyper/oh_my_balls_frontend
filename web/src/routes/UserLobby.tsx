import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, StatusResponse } from '../lib/api';
import { classifyBall } from '../lib/game';
import { useInterval } from '../lib/hooks';

export default function UserLobby(){
  const navigate = useNavigate();
  const [ball, setBall] = useState<string | null>(null);
  const [name, setName] = useState<string | null>(null);
  const [statusLabel, setStatusLabel] = useState('Assigning ball…');
  const [error, setError] = useState<string | null>(null);
  const uuid = useMemo(()=>api.getOrCreateUUID(), []);

  useEffect(()=>{
    let cancelled = false;
    (async()=>{
      try{
        const res = await api.join();
        if(cancelled) return;
        const normalized = res.ball?.toUpperCase?.() ?? null;
        setBall(normalized);
        setName(normalized);
        if(typeof window !== 'undefined'){
          window.localStorage.setItem('omb_user_ball', normalized ?? '');
        }
        setStatusLabel('Waiting for start…');
      }catch(err){
        if(!cancelled){
          setError((err as Error).message);
        }
      }
    })();
    return ()=>{ cancelled = true; };
  }, [uuid]);

  const handlePhase = (res: StatusResponse)=>{
    if(res.status === 0){
      setStatusLabel('Waiting for start…');
    }
    if(res.status === 1){
      navigate('/user/live');
    }
    if(res.status === 2){
      navigate('/user/results');
    }
  };

  useInterval(async ()=>{
    try{
      const res = await api.status();
      handlePhase(res);
    }catch(err){
      setError((err as Error).message);
    }
  }, 1000);

  const displayBall = ball ?? '—';
  const side = classifyBall(displayBall);

  return (
    <div className="container" style={{maxWidth:720}}>
      <div className="header">
        <div className="brand">
          <span className="badge">Oh&nbsp;My&nbsp;Balls</span>
          <div className="title">Your Assignment</div>
        </div>
        <span className="tag">{statusLabel}</span>
      </div>

      <div className="card" style={{textAlign:'center',padding:28}}>
        <div className="meta">Your Ball</div>
        <div className={`bigball pill ${side}`} style={{display:'inline-block',margin:'10px 0',padding:'10px 16px'}}>{displayBall}</div>
        {name && <div className="meta" style={{marginBottom:12}}>Codename: {name}</div>}
        <div className="meta">Keep this page open. The game will start automatically.</div>
        <hr/>
        {/*<div style={{marginTop:12}}>
          <button className="btn" onClick={()=>{ window.location.hash = '#/user/live'; }}>Preview Live Screen →</button>
        </div>*/}
        {error && <div className="notice" style={{marginTop:12}}>Error: {error}</div>}
      </div>

      <div className="footer">Tip: add a sound/vibrate on start</div>
    </div>
  );
}
