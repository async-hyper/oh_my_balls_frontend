import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, StatusResponse } from '../lib/api';
import { classifyBall, formatCurrency, formatPercent, ordinal } from '../lib/game';

function getUUID(){
  const key = 'omb_user_uuid';
  if(typeof window === 'undefined') return 'local-uuid';
  const existing = window.localStorage.getItem(key);
  if(existing) return existing;
  const generated = (crypto as any).randomUUID?.() || Math.random().toString(36).slice(2);
  window.localStorage.setItem(key, generated);
  return generated;
}

export default function UserResults(){
  const navigate = useNavigate();
  const uuid = useMemo(()=>getUUID(), []);
  const [results, setResults] = useState<Extract<StatusResponse,{status:2}>['results'] | null>(null);
  const [placement, setPlacement] = useState<number | null>(null);
  const [ball, setBall] = useState<string | null>(()=> typeof window !== 'undefined' ? window.localStorage.getItem('omb_user_ball') : null);

  useEffect(()=>{
    let cancelled = false;
    let timer: number | null = null;

    const poll = async ()=>{
      const res = await api.status();
      if(cancelled) return;
      handleStatus(res);
    };

    const handleStatus = (res: StatusResponse)=>{
      if(res.status === 2){
        setResults(res.results);
        const entry = res.results.standings.find(s=>s.uuid === uuid);
        if(entry){
          setPlacement(entry.position);
          setBall(entry.ball);
        }
      }
      if(res.status === 1){
        navigate('/user/live');
      }
      if(res.status === 0){
        navigate('/user/lobby');
      }
    };

    poll();
    timer = window.setInterval(poll, 2000) as unknown as number;
    return ()=>{
      cancelled = true;
      if(timer) window.clearInterval(timer);
    };
  }, [navigate, uuid]);

  const side = classifyBall(ball ?? '');
  const placeLabel = placement != null ? ordinal(placement) : '—';

  return (
    <div className="container" style={{maxWidth:720}}>
      <div className="header">
        <div className="brand">
          <span className="badge">Oh&nbsp;My&nbsp;Balls</span>
          <div className="title">Results</div>
        </div>
        <button className="btn" onClick={()=>navigate('/user/lobby')}>Play Again</button>
      </div>

      <div className="card" style={{textAlign:'center',padding:28}}>
        <div className="meta">Final Place</div>
        <div className="place">{placeLabel}</div>
        <div className="meta">Your Ball <span className={`pill ${side}`}>{ball ?? '—'}</span></div>
        <hr/>
        <div className="meta">Winner: {results?.winnerName ?? '—'} ({results?.winnerBall ?? '—'})</div>
        <div className="meta" style={{marginTop:8}}>p0 {formatCurrency(results?.p0)}</div>
        <div className="meta">p30 {formatCurrency(results?.p30)}</div>
        <div className="meta">Δ {formatPercent(results?.chgPct)}</div>
      </div>

      <div className="footer">Congrats & thanks for playing!</div>
    </div>
  );
}
