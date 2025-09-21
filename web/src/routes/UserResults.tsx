import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, StatusResponse } from '../lib/api';
import { classifyBall, formatCurrency, formatPercent, ordinal, placementForBallAtPrice } from '../lib/game';

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
  const [showCongrats, setShowCongrats] = useState(false);

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
          const upperBall = entry.ball.toUpperCase();
          setPlacement(entry.position);
          setBall(upperBall);
          if(typeof window !== 'undefined'){
            window.localStorage.setItem('omb_user_ball', upperBall);
          }
          if(entry.position === 1) setShowCongrats(true);
        }else{
          const storedBall = typeof window !== 'undefined' ? window.localStorage.getItem('omb_user_ball') : null;
          const currentBall = (storedBall ?? '').toUpperCase();
          if(currentBall && res.results.p0 != null && res.results.p30 != null){
            const placement = placementForBallAtPrice(currentBall, res.results.p0, res.results.p30);
            setPlacement(placement);
            if(currentBall) setBall(currentBall);
            if(placement === 1) setShowCongrats(true);
          }
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
  const won = placement === 1;

  return (
    <div className="container" style={{maxWidth:720}}>
      {won && showCongrats && (
        <div style={{position:'fixed',top:0,left:0,right:0,bottom:0,background:'rgba(0,0,0,0.6)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000}}>
          <div className="card" style={{padding:32,textAlign:'center',maxWidth:360,boxShadow:'0 10px 40px rgba(0,0,0,0.45)'}}>
            <div style={{fontSize:24,fontWeight:800,marginBottom:16}}>🎉 CONGRATS, YOU WIN!</div>
            <img src="/cookie.png" alt="Congrats cookie" style={{width:180,height:180,objectFit:'contain',margin:'0 auto 20px'}} />
            <button className="btn" style={{width:'100%',fontSize:18,padding:'14px 18px'}} onClick={()=>setShowCongrats(false)}>ACCEPT COOKIE</button>
          </div>
        </div>
      )}
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
