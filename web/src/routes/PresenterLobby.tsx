import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { mockStatus, resetMockLobby, totalBalls } from '../lib/mockServer';

export default function PresenterLobby(){
  const navigate = useNavigate();
  const [balls, setBalls] = useState<string[]>([]);

  useEffect(()=>{
    resetMockLobby();
    setBalls([]);
    let cancelled = false;
    let intervalId: number | null = null;
    const fetchStatus = async ()=>{
      const res = await mockStatus();
      if(cancelled) return;
      setBalls(res.balls);
      if(res.balls.length >= totalBalls() && intervalId !== null){
        window.clearInterval(intervalId);
        intervalId = null;
      }
    };
    fetchStatus();
    intervalId = window.setInterval(fetchStatus, 1000) as unknown as number;
    return ()=>{
      cancelled = true;
      if(intervalId !== null) window.clearInterval(intervalId);
    };
  }, []);

  useEffect(()=>{
    if(balls.length >= totalBalls()){
      const timer = window.setTimeout(()=>navigate('/presenter/live'), 400);
      return ()=> window.clearTimeout(timer);
    }
    return undefined;
  }, [balls.length, navigate]);

  const rows = useMemo(()=>{
    if(balls.length === 0) return null;
    return balls.map((ball, idx)=>{
      const side = ball.startsWith('B') ? 'long' : 'short';
      return (
        <tr key={ball+idx}>
          <td className="meta">{idx+1}</td>
          <td><span className={`pill ${side}`}>{ball}</span></td>
          <td><span className="meta">Ready</span></td>
        </tr>
      );
    });
  }, [balls]);

  const participantCount = balls.length;
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
          <div className="qr" style={{padding:12,display:'flex',alignItems:'center',justifyContent:'center'}}>
            <img
              src="/qr-code.png"
              alt="Join Oh My Balls lobby"
              style={{width:300,maxWidth:'100%',height:'auto'}}
            />
          </div>
          <hr/>
          <div className="meta">Tip: map this to <span className="kbd">/user-lobby.html</span> (no wallet required)</div>
        </div>

        <div className="card">
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:12,marginBottom:8}}>
            <div style={{display:'flex',alignItems:'center',gap:10}}>
              <div style={{fontWeight:800}}>Participants</div>
              <span className="pill" id="count" style={{background:'rgba(34,211,238,.15)',border:'1px solid rgba(34,211,238,.35)',color:'#67e8f9'}}>{participantCount}/{totalBalls()}</span>
            </div>
            <div className="meta">Polling mock status every 1s…</div>
          </div>
          <table className="table" id="ptable">
            <thead>
              <tr><th style={{width:44}}>#</th><th>Ball</th><th>Status</th></tr>
            </thead>
            <tbody>
              {rows || (
                <tr><td colSpan={3} className="meta" style={{textAlign:'center',padding:'18px 10px'}}>Waiting for players…</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="footer">Demo UI · Replace placeholders with your backend events</div>
    </div>
  );
}
