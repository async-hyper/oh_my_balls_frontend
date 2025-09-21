import React from 'react';

export default function UserLobby(){
  return (
    <div className="container" style={{maxWidth:720}}>
      <div className="header">
        <div className="brand">
          <span className="badge">Oh&nbsp;My&nbsp;Balls</span>
          <div className="title">Your Assignment</div>
        </div>
        <span className="tag">Waiting for start…</span>
      </div>

      <div className="card" style={{textAlign:'center',padding:28}}>
        <div className="meta">Your Ball</div>
        <div className="bigball pill long" style={{display:'inline-block',margin:'10px 0',padding:'10px 16px'}}>B0</div>
        <div className="meta">Keep this page open. The game will start automatically.</div>
        <hr/>
        <div className="notice">Mock screen — actual assignment comes from backend.</div>
        <div style={{marginTop:12}}><button className="btn">Preview Live Screen →</button></div>
      </div>

      <div className="footer">Tip: add a sound/vibrate on start</div>
    </div>
  );
}
