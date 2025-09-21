import React from 'react';

export default function UserResults(){
  return (
    <div className="container" style={{maxWidth:720}}>
      <div className="header">
        <div className="brand">
          <span className="badge">Oh&nbsp;My&nbsp;Balls</span>
          <div className="title">Results</div>
        </div>
        <button className="btn">Play Again</button>
      </div>

      <div className="card" style={{textAlign:'center',padding:28}}>
        <div className="meta">Final Place</div>
        <div className="place">5th</div>
        <div className="meta">Your Ball <span className="pill long">B0</span></div>
        <hr/>
        <div className="notice">Mock screen — wire up to backend resolve.</div>
      </div>

      <div className="footer">Congrats & thanks for playing!</div>
    </div>
  );
}
