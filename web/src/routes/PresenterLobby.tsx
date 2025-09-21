import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { forceStart, mockStatus, totalBalls, StatusResponse } from '../lib/mockServer';
import { classifyBall } from '../lib/game';

interface LobbyRow {
  uuid: string;
  ball: string;
  name: string;
  isBot: boolean;
}

export default function PresenterLobby(){
  const navigate = useNavigate();
  const [participants, setParticipants] = useState<LobbyRow[]>([]);
  const [polling, setPolling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(()=>{
    let cancelled = false;
    let timer: number | null = null;

    const poll = async ()=>{
      try{
        setPolling(true);
        const res = await mockStatus();
        if(cancelled) return;
        handleStatus(res);
      }catch(err){
        if(!cancelled){
          setError((err as Error).message);
        }
      }finally{
        if(!cancelled) setPolling(false);
      }
    };

    const handleStatus = (res: StatusResponse)=>{
      if(res.status === 0){
        setParticipants(res.participants);
      }
      if(res.status === 1){
        navigate('/presenter/live');
      }
      if(res.status === 2){
        navigate('/presenter/results');
      }
    };

    poll();
    timer = window.setInterval(poll, 1000) as unknown as number;
    return ()=>{
      cancelled = true;
      if(timer !== null) window.clearInterval(timer);
    };
  }, [navigate]);

  const rows = useMemo(()=>{
    if(participants.length === 0) return null;
    return participants.map((p, idx)=>{
      const side = classifyBall(p.ball);
      return (
        <tr key={p.uuid}>
          <td className="meta">{idx+1}</td>
          <td><span className={`pill ${side}`}>{p.ball}</span></td>
          <td>{p.name}</td>
          <td className="meta">Ready</td>
        </tr>
      );
    });
  }, [participants]);

  const participantCount = participants.length;
  const capacity = totalBalls();

  return (
    <div className="container">
      <div className="header">
        <div className="brand">
          <span className="badge">Oh&nbsp;My&nbsp;Balls</span>
          <div className="title">Presenter — Lobby</div>
        </div>
        <div className="meta">Max players <b>{capacity}</b> · Session length <b>30s</b></div>
      </div>

      <div className="grid" style={{gridTemplateColumns:'360px 1fr'}}>
        <div className="card">
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:8}}>
            <div style={{fontWeight:800}}>Join Game</div>
            <span className="tag">Scan to join</span>
          </div>
          <div className="qr" style={{padding:12,display:'flex',alignItems:'center',justifyContent:'center'}}>
            <img
              src="/qr-code.png"
              alt="Join Oh My Balls lobby"
              style={{width:300,maxWidth:'100%',height:'auto'}}
            />
          </div>
          <hr/>
          <div className="meta">Tip: map this to <span className="kbd">#/user/lobby</span> (no wallet required)</div>
        </div>

        <div className="card">
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:12,marginBottom:8}}>
            <div style={{display:'flex',alignItems:'center',gap:10}}>
              <div style={{fontWeight:800}}>Participants</div>
              <span className="pill" id="count" style={{background:'rgba(34,211,238,.15)',border:'1px solid rgba(34,211,238,.35)',color:'#67e8f9'}}>{participantCount}/{capacity}</span>
            </div>
            <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}>
              <button className="btn" onClick={async ()=>{
                try{
                  await forceStart();
                }catch(err){
                  setError((err as Error).message);
                }
              }}>Force Start</button>
            </div>
          </div>
          <table className="table" id="ptable">
            <thead>
              <tr><th style={{width:44}}>#</th><th>Ball</th><th>Name</th><th>Status</th></tr>
            </thead>
            <tbody>
              {rows || (
                <tr><td colSpan={4} className="meta" style={{textAlign:'center',padding:'18px 10px'}}>Waiting for players…</td></tr>
              )}
            </tbody>
          </table>
          {error && <div className="notice" style={{marginTop:12}}>Error: {error}</div>}
          {polling && <div className="meta" style={{marginTop:8}}>Polling…</div>}
        </div>
      </div>

      <div className="footer">Demo UI · Replace placeholders with your backend events</div>
    </div>
  );
}
