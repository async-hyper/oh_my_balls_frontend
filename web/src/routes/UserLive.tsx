import React from 'react';

export default function UserLive(){
  return (
    <div className="container" style={{maxWidth:720}}>
      <div className="header">
        <div className="brand">
          <span className="badge">Oh&nbsp;My&nbsp;Balls</span>
          <div className="title">Live</div>
        </div>
        <span className="tag">30s</span>
      </div>

      <div className="card" style={{textAlign:'center',padding:28}}>
        <div className="meta">Your Ball</div>
        <div className="pill long" style={{display:'inline-block',margin:'8px 0',fontSize:24,padding:'8px 14px'}}>B0</div>
        <div className="meta">Ball index (0..20)</div>
        <div className="placing">10</div>
        <hr/>
        <div className="meta">You’re close! Hold tight…</div>
        <div className="progress" style={{marginTop:10}}><div style={{width:'50%'}} /></div>
      </div>

      <div className="footer">You’ll see final place on resolve</div>
    </div>
  );
}
