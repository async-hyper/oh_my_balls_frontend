import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, StatusResponse } from '../lib/api';
import { classifyBall, formatPercent, placementForBallAtPrice } from '../lib/game';
import { useInterval } from '../lib/hooks';

const TOTAL_DURATION = 30_000;

export default function UserLive(){
  const navigate = useNavigate();
  const uuid = useMemo(()=>api.getOrCreateUUID(), []);
  const [ball, setBall] = useState<string | null>(()=> typeof window !== 'undefined' ? window.localStorage.getItem('omb_user_ball') : null);
  const [countdown, setCountdown] = useState(30);
  const [progress, setProgress] = useState(0);
  const [placement, setPlacement] = useState<number | null>(null);
  const [deltaPct, setDeltaPct] = useState<number | null>(null);
  const [hint, setHint] = useState('Waiting for data…');

  const side = classifyBall(ball ?? '');

  const updateHint = (placing: number | null)=>{
    if(placing == null){ setHint('Waiting for data…'); return; }
    const upbeat = [
      'Looking good 👀',
      'Hold the line, champ!',
      'Green candles love you!',
      'Cookie’s practically yours!'
    ];
    const neutral = [
      'Neck and neck…',
      'It’s anyone’s game!',
      'Tiny moves decide this.',
      'Stay sharp — micro gains matter.'
    ];
    const comeback = [
      'Needs a big move…',
      'Time for a heroic comeback!',
      'Flip the script, you got this!',
      'Launch mode: engage!'
    ];
    const bucket = placing <= 5 ? upbeat : placing <= 10 ? neutral : comeback;
    setHint(bucket[Math.floor(Math.random()*bucket.length)]);
  };

  useInterval(async ()=>{
    try{
      const res = await api.status();
      handleStatus(res);
    }catch(err){
      setHint('Connection hiccup… retrying');
    }
  }, 300);

  const handleStatus = (res: StatusResponse)=>{
    if(res.status === 0){ navigate('/user/lobby'); return; }
    if(res.status === 2){ navigate('/user/results'); return; }
    const live = res.realtime_price;
    if(!live) return;

    const latestSample = live.samples[live.samples.length - 1];
    const currentPrice = latestSample?.price ?? live.price;
    const elapsedMs = live.elapsedMs ?? 0;

    setCountdown(Math.max(0, Math.round((TOTAL_DURATION - elapsedMs)/1000)));
    setProgress(Math.min(100, (elapsedMs / TOTAL_DURATION) * 100));
    if(live.p0){
      setDeltaPct((currentPrice - live.p0) / live.p0);
    }else{
      setDeltaPct(null);
    }

    const standings = live.standings ?? [];
    const participant = standings.find(s => s.uuid === uuid);
    const storedBall = typeof window !== 'undefined' ? window.localStorage.getItem('omb_user_ball') : null;

    if(participant){
      const upperBall = participant.ball.toUpperCase();
      setPlacement(participant.position);
      setBall(upperBall);
      if(typeof window !== 'undefined'){
        window.localStorage.setItem('omb_user_ball', upperBall);
      }
      updateHint(participant.position);
      return;
    }

    const participants = live.participants ?? [];
    const fallbackParticipant = participants.find(p => p.uuid === uuid);
    if(fallbackParticipant && fallbackParticipant.targetPrice != null){
      const ranked = participants
        .map(p => ({
          uuid: p.uuid,
          ball: p.ball,
          targetPrice: p.targetPrice ?? null,
          distance: p.targetPrice != null ? Math.abs(p.targetPrice - currentPrice) : Number.POSITIVE_INFINITY
        }))
        .sort((a,b)=> a.distance - b.distance)
        .map((entry, idx)=> ({ ...entry, position: idx + 1 }));
      const mine = ranked.find(entry => entry.uuid === uuid);
      if(mine){
        const upperBall = fallbackParticipant.ball.toUpperCase();
        setPlacement(mine.position);
        setBall(upperBall);
        if(typeof window !== 'undefined'){
          window.localStorage.setItem('omb_user_ball', upperBall);
        }
        updateHint(mine.position);
        return;
      }
    }

    const currentBall = (ball ?? storedBall ?? '').toUpperCase();
    if(currentBall && live.p0){
      const fallbackPlacement = placementForBallAtPrice(currentBall, live.p0, currentPrice);
      setPlacement(fallbackPlacement);
      if(!ball && currentBall) setBall(currentBall);
      if(fallbackPlacement != null) updateHint(fallbackPlacement);
    }
  };

  useEffect(()=>{
    updateHint(placement);
  }, [placement]);

  const displayBall = ball ?? '—';

  return (
    <div className="container" style={{maxWidth:720}}>
      <div className="header">
        <div className="brand">
          <span className="badge">Oh&nbsp;My&nbsp;Balls</span>
          <div className="title">Live</div>
        </div>
        <span className="tag">{countdown}s</span>
      </div>

      <div className="card" style={{textAlign:'center',padding:28}}>
        <div className="meta">Your Ball</div>
        <div style={{display:'flex',alignItems:'center',justifyContent:'center',margin:'12px 0 18px'}}>
          <div
            style={{
              width:96,
              height:96,
              borderRadius:'50%',
              display:'flex',
              alignItems:'center',
              justifyContent:'center',
              fontSize:32,
              fontWeight:900,
              letterSpacing:'0.04em',
              textTransform:'uppercase',
              boxShadow:'0 0 24px rgba(0,0,0,0.25)',
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
            {displayBall}
          </div>
        </div>
        <div className="meta">Current Place</div>
        <div className="placing">{placement ?? '—'}</div>
        <hr/>
        <div className="meta">{hint}</div>
        <div className="meta" style={{marginTop:8}}>Δ {formatPercent(deltaPct)}</div>
        <div className="progress" style={{marginTop:10}}><div style={{width:`${progress}%`}} /></div>
      </div>

      <div className="footer">You’ll see final place on resolve</div>
    </div>
  );
}
