import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { mockStatus, resetRound, ResultsStatus, StatusResponse } from '../lib/mockServer';
import { classifyBall, formatCurrency, formatPercent } from '../lib/game';

export default function PresenterResults(){
  const navigate = useNavigate();
  const [results, setResults] = useState<ResultsStatus['results'] | null>(null);

  useEffect(()=>{
    let cancelled = false;
    let timer: number | null = null;

    const poll = async ()=>{
      const res = await mockStatus();
      if(cancelled) return;
      handleStatus(res);
    };

    const handleStatus = (res: StatusResponse)=>{
      if(res.status === 2){
        setResults(res.results);
      }
      if(res.status === 1){
        navigate('/presenter/live');
      }
      if(res.status === 0){
        navigate('/presenter/lobby');
      }
    };

    poll();
    timer = window.setInterval(poll, 1500) as unknown as number;
    return ()=>{
      cancelled = true;
      if(timer) window.clearInterval(timer);
    };
  }, [navigate]);

  const winnerBall = results?.winnerBall ?? '—';
  const winnerName = results?.winnerName ?? 'Awaiting winner';
  const side = classifyBall(winnerBall);
  const p0 = results?.p0 ?? null;
  const p30 = results?.p30 ?? null;
  const chgPct = results?.chgPct ?? null;

  const handleNewRound = async ()=>{
    resetRound();
    if(typeof window !== 'undefined'){
      window.localStorage.removeItem('omb_user_ball');
    }
    navigate('/presenter/lobby');
  };

  return (
    <div className="container">
      <div className="header">
        <div className="brand">
          <span className="badge">Oh&nbsp;My&nbsp;Balls</span>
          <div className="title">Presenter — Results</div>
        </div>
        <div><button className="btn" onClick={handleNewRound}>New Round</button></div>
      </div>

      <div className="card">
        <div className="win-card">
          <div className={`ball ${side} win`}>★</div>
          <div>
            <div className="pill" style={{background:'rgba(34,211,238,.15)',border:'1px solid rgba(34,211,238,.35)',color:'#67e8f9'}}>Winner</div>
            <div className="big">{winnerName}</div>
            <div className="meta">Ball <span className={`pill ${side}`}>{winnerBall}</span> · Closest to final price</div>
          </div>
        </div>
        <hr/>
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12}}>
          <div className="card"><div className="meta">Anchor p0</div><div className="big">{formatCurrency(p0)}</div></div>
          <div className="card"><div className="meta">Final p30</div><div className="big">{formatCurrency(p30)}</div></div>
          <div className="card"><div className="meta">Δ %</div><div className="big">{formatPercent(chgPct)}</div></div>
        </div>
      </div>

      <div className="footer">Announce the prize IRL (cookies recommended) 🍪</div>
    </div>
  );
}
