import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, StatusResponse } from '../lib/api';
import { LANES, MID_INDEX, classifyBall, formatCurrency, formatPercent } from '../lib/game';

const verticalSpacingMultiplier = 2.3;
const durSec = 30;
const tickMs = 100;

export default function PresenterLive(){
  const labels = useMemo(()=>LANES, []);
  const mid = MID_INDEX;
  const lanePct = 0.05 / mid;
  const clampPctTotal = 0.07;
  const clampLanes = clampPctTotal / lanePct;

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const indicatorRef = useRef<HTMLDivElement>(null);
  const lanesWrapRef = useRef<HTMLDivElement>(null);
  const lanesHeaderRef = useRef<HTMLDivElement>(null);
  const rightCardRef = useRef<HTMLDivElement>(null);
  const samplesRef = useRef<{ tMs:number; price:number; lane:number }[]>([]);

  const [p0, setP0] = useState<number | null>(null);
  const [pc, setPc] = useState<number | null>(null);
  const [chgPct, setChgPct] = useState<number | null>(null);
  const [direction, setDirection] = useState<string>('—');
  const [countdown, setCountdown] = useState<number>(durSec);

  const navigate = useNavigate();

  useEffect(()=>{
    let cancelled = false;
    let timer: number | null = null;

    let inFlight: AbortController | null = null;
    const poll = async ()=>{
      try{
        inFlight?.abort();
        inFlight = new AbortController();
        const res = await api.status({ signal: inFlight.signal });
        if(cancelled) return;
        handleStatus(res);
      }catch(err){
        if((err as any)?.name === 'AbortError'){ return; }
        // swallow other errors here; higher-level UI shows polling state/errors elsewhere
      }
    };

    const handleStatus = (res: StatusResponse)=>{
      if(res.status === 0){
        navigate('/presenter/lobby');
        return;
      }
      if(res.status === 2){
        navigate('/presenter/results');
        return;
      }
      updateFromResponse(res);
      renderScene();
    };

    const updateFromResponse = (res: Extract<StatusResponse,{status:1}>)=>{
      const { realtime_price } = res;
      if(!realtime_price) return;
      setP0(realtime_price.p0);
      setPc(realtime_price.price);
      const pct = (realtime_price.price - realtime_price.p0) / realtime_price.p0;
      setChgPct(pct);
      setDirection(pct>0 ? '↑ Long (B)' : pct<0 ? '↓ Short (S)' : '—');
      setCountdown(Math.max(0, Math.round((durSec * 1000 - realtime_price.elapsedMs)/1000)));
      samplesRef.current = realtime_price.samples;
    };

    const renderScene = ()=>{
      const canvas = canvasRef.current;
      const indicator = indicatorRef.current;
      const lanesWrap = lanesWrapRef.current;
      const lanesHeader = lanesHeaderRef.current;
      const rightCard = rightCardRef.current;
      const samples = samplesRef.current;
      if(!canvas || !indicator || !lanesWrap || !lanesHeader || !rightCard || samples.length === 0) return;
      const ctx = canvas.getContext('2d');
      if(!ctx) return;

      const dpr = resizeCanvasToDisplaySize(canvas);
      const cssHeight = canvas.clientHeight;

      const laneToCss = (lane:number)=>{
        const centerY = cssHeight / 2;
        const gridZoneHeight = cssHeight * 0.6;
        const maxOffset = gridZoneHeight / 2;
        const normalizedPos = (lane - mid) / (labels.length - 1) * verticalSpacingMultiplier;
        return centerY + (normalizedPos * maxOffset);
      };
      const laneToCanvas = (lane:number)=> laneToCss(lane) * dpr;

      drawGrid(ctx, canvas, laneToCanvas);
      drawTrail(ctx, canvas, laneToCanvas, samples);
      positionRightLanes(canvas, lanesWrap, lanesHeader, rightCard, laneToCss);
      highlightLane(canvas, indicator, lanesWrap, samples, laneToCss);
    };

    const resizeCanvasToDisplaySize = (canvas: HTMLCanvasElement)=>{
      const dpr = window.devicePixelRatio || 1;
      const cssW = canvas.clientWidth;
      const cssH = canvas.clientHeight;
      if(canvas.width !== Math.round(cssW*dpr) || canvas.height !== Math.round(cssH*dpr)){
        canvas.width = Math.round(cssW*dpr);
        canvas.height = Math.round(cssH*dpr);
      }
      return dpr;
    };

    const yScaleDOM = (canvas: HTMLCanvasElement, idxLike:number)=>{
      const cssH = canvas.clientHeight;
      const centerY = cssH / 2;
      const gridZoneHeight = cssH * 0.6;
      const maxOffset = gridZoneHeight / 2;
      const normalizedPos = (idxLike - mid) / (labels.length - 1) * verticalSpacingMultiplier;
      const y = centerY + (normalizedPos * maxOffset);
      return Math.max(0, Math.min(cssH, y));
    };

    const drawGrid = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, laneToCanvas:(lane:number)=>number)=>{
      ctx.save();
      ctx.clearRect(0,0,canvas.width,canvas.height);
      ctx.fillStyle = 'rgba(255,255,255,0.02)';
      ctx.fillRect(0,0,canvas.width,canvas.height);

      const dpr = window.devicePixelRatio || 1;
      ctx.strokeStyle = 'rgba(255,255,255,0.2)';
      ctx.setLineDash([4*dpr,4*dpr]);
      ctx.lineWidth = 1*dpr;
      const yTop = laneToCanvas(mid - clampLanes);
      const yBot = laneToCanvas(mid + clampLanes);
      ctx.beginPath(); ctx.moveTo(0,yTop); ctx.lineTo(canvas.width,yTop); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0,yBot); ctx.lineTo(canvas.width,yBot); ctx.stroke();
      ctx.setLineDash([]);

      ctx.strokeStyle = 'rgba(255,255,255,0.25)';
      const centerY = laneToCanvas(mid);
      ctx.beginPath(); ctx.moveTo(0,centerY); ctx.lineTo(canvas.width,centerY); ctx.stroke();

      ctx.strokeStyle = 'rgba(255,255,255,0.09)';
      for(let i=0;i<labels.length;i++){
        const y = laneToCanvas(i);
        if(y>=0 && y<=canvas.height){
          ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(canvas.width,y); ctx.stroke();
        }
      }
      ctx.restore();
    };

    const drawTrail = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, laneToCanvas:(lane:number)=>number, samples: { tMs:number; price:number; lane:number }[])=>{
      ctx.save();
      const dpr = window.devicePixelRatio || 1;
      ctx.lineWidth = 2*dpr;
      ctx.strokeStyle = '#34d399';
      ctx.beginPath();
      for(let i=0;i<samples.length;i++){
        const sample = samples[i];
        const padL = 24*dpr, padR = 24*dpr;
        const w = canvas.width - padL - padR;
        const x = padL + (sample.tMs / (durSec*1000)) * w;
        const y = laneToCanvas(sample.lane);
        if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
      }
      ctx.stroke();
      ctx.restore();
    };

    const positionRightLanes = (canvas: HTMLCanvasElement, lanesWrap: HTMLDivElement, lanesHeader: HTMLDivElement, rightCard: HTMLDivElement, laneToCss:(lane:number)=>number)=>{
      const canvasRect = canvas.getBoundingClientRect();
      const cardRect = rightCard.getBoundingClientRect();
      const headerHeight = lanesHeader.offsetHeight + 8;
      const offset = canvasRect.top - cardRect.top - headerHeight;
      lanesWrap.style.marginTop = offset + 'px';
      lanesWrap.style.height = canvas.clientHeight + 'px';
      for(let i=0;i<lanesWrap.children.length;i++){
        const child = lanesWrap.children[i] as HTMLDivElement;
        child.style.top = laneToCss(i) + 'px';
      }
    };

    const highlightLane = (canvas: HTMLCanvasElement, indicator: HTMLDivElement, lanesWrap: HTMLDivElement, samples: { tMs:number; price:number; lane:number }[], laneToCss:(lane:number)=>number)=>{
      const latest = samples[samples.length - 1];
      const idxRounded = Math.max(0, Math.min(labels.length-1, Math.round(latest.lane)));
      indicator.style.top = laneToCss(latest.lane) + 'px';
      for(let i=0;i<lanesWrap.children.length;i++){
        lanesWrap.children[i].classList.remove('win');
      }
      const active = lanesWrap.children[idxRounded] as HTMLDivElement | undefined;
      if(active){ active.classList.add('win'); }
    };

    const handleResize = ()=>{
      renderScene();
    };

    poll();
    timer = window.setInterval(poll, tickMs) as unknown as number;
    window.addEventListener('resize', handleResize);

    return ()=>{
      cancelled = true;
      inFlight?.abort();
      if(timer) window.clearInterval(timer);
      window.removeEventListener('resize', handleResize);
    };
  }, [navigate, labels, clampLanes, lanePct, mid]);

  return (
    <div className="container" style={{maxWidth:900}}>
      <div className="header">
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          <span className="badge">Oh&nbsp;My&nbsp;Balls</span>
          <div className="title">Presenter — Live</div>
        </div>
        <div className="timeline card" style={{padding:'8px 12px',alignItems:'center'}}>
          <div className="meta">t0</div>
          <div className="ticks">{Array.from({length:31}).map((_,i)=><div key={i} className={`tick ${durSec-countdown>=i?'active':''}`} />)}</div>
          <div className="meta">t30</div>
          <div className="tag" style={{marginLeft:8}}>{countdown}s</div>
        </div>
      </div>

      <div className="stage">
        <div className="leftPanel">
          <div className="card" style={{position:'relative'}}>
            <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:8,marginBottom:12}}>
              <div className="stat"><div className="meta">Anchor p0</div><div className="v">{formatCurrency(p0)}</div></div>
              <div className="stat"><div className="meta">Current</div><div className="v">{formatCurrency(pc)}</div></div>
              <div className="stat"><div className="meta">Δ %</div><div className="v">{formatPercent(chgPct)}</div></div>
              <div className="stat"><div className="meta">Direction</div><div className="v">{direction}</div></div>
            </div>
            <div className="meta" style={{marginBottom:12}}>Synced panels via shared mock status. Clamp ±7% with 30s countdown.</div>
            <div style={{position:'relative'}}>
              <canvas ref={canvasRef} className="chart" style={{display:'block',width:'100%',height:700,borderRadius:12,border:'1px solid rgba(255,255,255,.08)',background:'linear-gradient(180deg,rgba(255,255,255,.02),rgba(255,255,255,.01))'}} />
              <div ref={indicatorRef} className="indicatorLine" style={{top:'50%'}} />
            </div>
            <div style={{display:'flex',gap:8,marginTop:12}}>
              <button className="btn" onClick={()=>navigate('/presenter/lobby')}>Reset</button>
              <button className="btn" onClick={()=>navigate('/presenter/results')}>Resolve →</button>
            </div>
          </div>
        </div>
        <div className="rightPanel">
          <div className="card" ref={rightCardRef}>
            <div ref={lanesHeaderRef} style={{fontWeight:800,marginBottom:8}}>Balls (S9→B9)</div>
            <div className="lanesWrap" ref={lanesWrapRef}>
              {labels.map(label => (
                <div key={label} className="laneDot">
                  <span className={`ball ${classifyBall(label)}`}>{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
