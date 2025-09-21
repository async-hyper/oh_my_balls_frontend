import React from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import { PresenterLobby, UserLobby, PresenterLive, PresenterResults, UserLive, UserResults } from './routes';
import { createHashRouter, RouterProvider } from 'react-router-dom';

function Landing(){
  return (
    <div className="container">
      <div className="header"><div className="brand"><span className="badge">Oh&nbsp;My&nbsp;Balls</span><div className="title">Landing</div></div></div>
      <div className="grid" style={{gridTemplateColumns:'repeat(3,1fr)'}}>
        <div className="card">
          <div style={{fontWeight:800,marginBottom:8}}>Presenter</div>
          <div style={{display:'grid',gap:8}}>
            <button className="btn" onClick={()=>location.hash='#/presenter/lobby'}>Presenter Lobby</button>
            <button className="btn" onClick={()=>location.hash='#/presenter/live'}>Presenter Live</button>
            <button className="btn" onClick={()=>location.hash='#/presenter/results'}>Presenter Results</button>
          </div>
        </div>
        <div className="card">
          <div style={{fontWeight:800,marginBottom:8}}>User</div>
          <div style={{display:'grid',gap:8}}>
            <button className="btn" onClick={()=>location.hash='#/user/lobby'}>User Lobby</button>
            <button className="btn" onClick={()=>location.hash='#/user/live'}>User Live</button>
            <button className="btn" onClick={()=>location.hash='#/user/results'}>User Results</button>
          </div>
        </div>
        <div className="card">
          <div style={{fontWeight:800,marginBottom:8}}>Notes</div>
          <div className="meta">All screens are static mocks. No API required.</div>
        </div>
      </div>
    </div>
  );
}

const router = createHashRouter([
  { path: '/', element: <Landing/> },
  { path: '/presenter/lobby', element: <PresenterLobby/> },
  { path: '/presenter/live', element: <PresenterLive/> },
  { path: '/presenter/results', element: <PresenterResults/> },
  { path: '/user/lobby', element: <UserLobby/> },
  { path: '/user/live', element: <UserLive/> },
  { path: '/user/results', element: <UserResults/> }
]);

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);


