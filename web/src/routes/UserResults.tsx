import React, { useEffect, useMemo, useRef, useState } from 'react';
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
  const closedCongratsRef = useRef(false);
  const [activeRoundId, setActiveRoundId] = useState<number | null>(null);
  const congratsKey = 'omb_congrats_hidden_round';

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
        const hiddenRound = typeof window !== 'undefined' ? window.localStorage.getItem(congratsKey) : null;
        if(hiddenRound && Number(hiddenRound) === res.roundId){
          closedCongratsRef.current = true;
        }
        if(activeRoundId !== res.roundId){
          setActiveRoundId(res.roundId);
          if(!(hiddenRound && Number(hiddenRound) === res.roundId)){
            closedCongratsRef.current = false;
          }
        }
        setResults(res.results);
        const entry = res.results.standings.find(s=>s.uuid === uuid);
        if(entry){
          const upperBall = entry.ball.toUpperCase();
          setPlacement(entry.position);
          setBall(upperBall);
          if(typeof window !== 'undefined'){
            window.localStorage.setItem('omb_user_ball', upperBall);
          }
          if(entry.position === 1 && !closedCongratsRef.current) setShowCongrats(true);
        }else{
          const storedBall = typeof window !== 'undefined' ? window.localStorage.getItem('omb_user_ball') : null;
          const currentBall = (storedBall ?? '').toUpperCase();
          if(currentBall && res.results.p0 != null && res.results.p30 != null){
            const placement = placementForBallAtPrice(currentBall, res.results.p0, res.results.p30);
            setPlacement(placement);
            if(currentBall) setBall(currentBall);
            if(placement === 1 && !closedCongratsRef.current) setShowCongrats(true);
          }
        }
      }
      if(res.status === 1){
        if(typeof window !== 'undefined') window.localStorage.removeItem(congratsKey);
        navigate('/user/live');
      }
      if(res.status === 0){
        if(typeof window !== 'undefined') window.localStorage.removeItem(congratsKey);
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
            <button
              className="btn"
              style={{width:'100%',fontSize:18,padding:'14px 18px'}}
              onClick={()=>{
                closedCongratsRef.current = true;
                if(typeof window !== 'undefined' && activeRoundId != null){
                  window.localStorage.setItem(congratsKey, String(activeRoundId));
                }
                setShowCongrats(false);
              }}
            >
              ACCEPT COOKIE
            </button>
          </div>
        </div>
      )}
      <div className="header">
        <div className="brand">
          <span className="badge">Oh&nbsp;My&nbsp;Balls</span>
          <div className="title">Results</div>
        </div>
      </div>

      <div className="card" style={{textAlign:'center',padding:32}}>
        <div className="meta">Final Place</div>
        <div className="place" style={{marginBottom:16}}>{placeLabel}</div>
        <div className="meta" style={{marginBottom:8}}>Your Ball</div>
        <div style={{display:'flex',alignItems:'center',justifyContent:'center',marginBottom:20}}>
          <div
            style={{
              width:108,
              height:108,
              borderRadius:'50%',
              display:'flex',
              alignItems:'center',
              justifyContent:'center',
              fontSize:36,
              fontWeight:900,
              letterSpacing:'0.04em',
              textTransform:'uppercase',
              boxShadow:'0 0 28px rgba(0,0,0,0.28)',
              border:`4px solid ${side==='long' ? '#10b981' : '#f97316'}`,
              background: side==='long'
                ? 'radial-gradient(circle at 30% 30%, rgba(110,231,183,0.85), rgba(5,150,105,0.6))'
                : 'radial-gradient(circle at 30% 30%, rgba(252,165,165,0.85), rgba(220,38,38,0.6))',
              color: side==='long' ? '#022c22' : '#7f1d1d',
              textShadow: side==='long'
                ? '0 1px 2px rgba(255,255,255,0.55)'
                : '0 1px 2px rgba(255,255,255,0.45)'
            }}
          >
            {ball ?? '—'}
          </div>
        </div>
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
