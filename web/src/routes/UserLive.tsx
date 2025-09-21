import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, StatusResponse } from '../lib/api';
import { classifyBall, formatPercent, placementForBallAtPrice } from '../lib/game';
import { useInterval } from '../lib/hooks';

const TOTAL_DURATION = 30_000;

function getUUID(){
  const key = 'omb_user_uuid';
  if(typeof window === 'undefined') return 'local-uuid';
  const existing = window.localStorage.getItem(key);
  if(existing) return existing;
  const generated = (crypto as any).randomUUID?.() || Math.random().toString(36).slice(2);
  window.localStorage.setItem(key, generated);
  return generated;
}

export default function UserLive(){
  const navigate = useNavigate();
  const uuid = useMemo(()=>getUUID(), []);
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
    const res = await api.status();
    handleStatus(res);
  }, 300);

  const handleStatus = (res: StatusResponse)=>{
    if(res.status === 0){ navigate('/user/lobby'); return; }
    if(res.status === 2){ navigate('/user/results'); return; }
    const { realtime_price } = res;
    const elapsedMs = realtime_price.elapsedMs;
    setCountdown(Math.max(0, Math.round((TOTAL_DURATION - elapsedMs)/1000)));
    setProgress(Math.min(100, (elapsedMs / TOTAL_DURATION) * 100));
    setDeltaPct((realtime_price.price - realtime_price.p0) / realtime_price.p0);

    const participant = realtime_price.standings.find(s=>s.uuid === uuid);
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
    const currentBall = (ball ?? storedBall ?? '').toUpperCase();
    if(currentBall && realtime_price.p0){
      const fallbackPlacement = placementForBallAtPrice(currentBall, realtime_price.p0, realtime_price.price);
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
        <div className={`pill ${side}`} style={{display:'inline-block',margin:'8px 0',fontSize:24,padding:'8px 14px'}}>{displayBall}</div>
        <div className="meta">Placement</div>
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
