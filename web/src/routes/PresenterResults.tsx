import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function PresenterResults(){
  const navigate = useNavigate();
  return (
    <div className="container">
      <div className="header">
        <div className="brand">
          <span className="badge">Oh&nbsp;My&nbsp;Balls</span>
          <div className="title">Presenter — Results</div>
        </div>
        <div><button className="btn" onClick={()=>navigate('/presenter/lobby')}>New Round</button></div>
      </div>

      <div className="card">
        <div className="win-card">
          <div className="ball long win">★</div>
          <div>
            <div className="pill" style={{background:'rgba(34,211,238,.15)',border:'1px solid rgba(34,211,238,.35)',color:'#67e8f9'}}>Winner</div>
            <div className="big">Player Vega</div>
            <div className="meta">Ball <span className="pill long">B3</span> · Closest to final price</div>
          </div>
        </div>
        <hr/>
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12}}>
          <div className="card"><div className="meta">Anchor p0</div><div className="big">$62,000</div></div>
          <div className="card"><div className="meta">Final p30</div><div className="big">$62,910</div></div>
          <div className="card"><div className="meta">Δ %</div><div className="big">+1.47%</div></div>
        </div>
      </div>

      <div className="footer">Announce the prize IRL (cookies recommended) 🍪</div>
    </div>
  );
}
