import React, { useCallback, useMemo, useRef, useState } from 'react';

interface PlayerRow {
  id: number;
  name: string;
  ball: string;
  joined: boolean;
}

const NAME_POOL = ["Atlas","Nova","Zora","Kai","Mira","Juno","Vega","Rex","Luna","Orion","Echo","Rune","Iris","Nix","Axel","Skye","Pax","Rio","Nyx","Zed"];
const BALL_POOL = [...Array(10).keys()].map(i=>`B${i}`).concat([...Array(10).keys()].map(i=>`S${i}`));

export default function PresenterLobby(){
  const [players, setPlayers] = useState<PlayerRow[]>([]);
  const nextIdRef = useRef(1);

  const addPlayer = useCallback(()=>{
    setPlayers(prev => {
      if(prev.length >= 20) return prev;
      const used = new Set(prev.map(p=>p.ball));
      const available = BALL_POOL.filter(ball=>!used.has(ball));
      if(available.length === 0) return prev;
      const name = NAME_POOL[Math.floor(Math.random()*NAME_POOL.length)];
      const ball = available[Math.floor(Math.random()*available.length)];
      const player: PlayerRow = { id: nextIdRef.current++, name, ball, joined:true };
      return [...prev, player];
    });
  }, []);

  const seedPlayers = useCallback(()=>{
    nextIdRef.current = 1;
    setPlayers(()=>{
      const seeded: PlayerRow[] = [];
      for(let i=0;i<12;i++){
        const used = new Set(seeded.map(p=>p.ball));
        const available = BALL_POOL.filter(ball=>!used.has(ball));
        if(!available.length) break;
        const name = NAME_POOL[Math.floor(Math.random()*NAME_POOL.length)];
        const ball = available[Math.floor(Math.random()*available.length)];
        seeded.push({ id: nextIdRef.current++, name, ball, joined:true });
      }
      return seeded;
    });
  }, []);

  const participantCount = players.length;

  const rows = useMemo(()=>{
    if(participantCount === 0) return null;
    return players.map((p, idx)=>{
      const side = p.ball.startsWith('B') ? 'long' : 'short';
      return (
        <tr key={p.id}>
          <td className="meta">{idx+1}</td>
          <td>{p.name}</td>
          <td><span className={`pill ${side}`}>{p.ball}</span></td>
          <td><span className="meta">{p.joined ? 'Ready' : 'Pending'}</span></td>
        </tr>
      );
    });
  }, [players, participantCount]);

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
              <span className="pill" id="count" style={{background:'rgba(34,211,238,.15)',border:'1px solid rgba(34,211,238,.35)',color:'#67e8f9'}}>{participantCount}/20</span>
            </div>
            <div style={{display:'flex',alignItems:'center',gap:8}}>
              <button className="btn" onClick={seedPlayers}>Seed Demo</button>
              <button className="btn" onClick={addPlayer}>+ Add</button>
            </div>
          </div>
          <table className="table" id="ptable">
            <thead>
              <tr><th style={{width:44}}>#</th><th>Name</th><th>Ball</th><th>Status</th></tr>
            </thead>
            <tbody>
              {rows || (
                <tr><td colSpan={4} className="meta" style={{textAlign:'center',padding:'18px 10px'}}>Waiting for players…</td></tr>
              )}
            </tbody>
          </table>
          <div style={{display:'flex',justifyContent:'flex-end',gap:8,marginTop:12}}>
            <button className="btn" onClick={()=>{ window.location.hash = '#/presenter/live'; }}>Start Game →</button>
          </div>
        </div>
      </div>

      <div className="footer">Demo UI · Replace placeholders with your backend events</div>
    </div>
  );
}
