import React from 'react';

export default function App(){
  return (
    <div className="container">
      <div className="header">
        <div className="brand"><span className="badge">Oh&nbsp;My&nbsp;Balls</span><div className="title">App</div></div>
      </div>
      <div className="grid" style={{gridTemplateColumns:'repeat(2,1fr)'}}>
        <div className="card"><div style={{fontWeight:800,marginBottom:8}}>Presenter</div><button className="btn" onClick={()=>location.hash='#/presenter/lobby'}>Open Presenter Lobby</button></div>
        <div className="card"><div style={{fontWeight:800,marginBottom:8}}>User</div><button className="btn" onClick={()=>location.hash='#/user/lobby'}>Open User Lobby</button></div>
      </div>
      <div className="footer">Mock API by default — add ?api=remote to use backend</div>
    </div>
  );
}


