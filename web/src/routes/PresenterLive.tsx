import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { mockLiveStatus, resetMockLive } from '../lib/mockServer';

const verticalSpacingMultiplier = 2.3;
const durSec = 30;
const tickMs = 100;

function fmtUSD(n: number | null){
  if(n == null || Number.isNaN(n)) return '—';
  return '$'+n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}
function fmtPct(p: number | null){
  if(p == null || Number.isNaN(p)) return '—';
  return (p>=0?'+':'')+(p*100).toFixed(2)+'%';
}

export default function PresenterLive(){
  const navigate = useNavigate();
  const labels = useMemo(()=>[
    ...Array.from({length:9},(_,i)=>`B${9-i}`),
    'B0','S0',
    ...Array.from({length:9},(_,i)=>`S${i+1}`)
  ], []);
  const mid = (labels.length-1)/2;
  const lanePct = 0.05 / mid;
  const clampPctTotal = 0.07;
  const clampLanes = clampPctTotal / lanePct;

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const indicatorRef = useRef<HTMLDivElement>(null);
  const lanesWrapRef = useRef<HTMLDivElement>(null);
  const lanesHeaderRef = useRef<HTMLDivElement>(null);
  const rightCardRef = useRef<HTMLDivElement>(null);
  const resetRef = useRef<() => void>(()=>{});
  const tickRefs = useRef<(HTMLDivElement | null)[]>([]);
  const laneRefs = useRef<(HTMLDivElement | null)[]>([]);

  const [p0, setP0] = useState<number | null>(null);
  const [pc, setPc] = useState<number | null>(null);
  const [chgPct, setChgPct] = useState<number | null>(null);
  const [direction, setDirection] = useState<string>('—');
  const [countdown, setCountdown] = useState<number>(durSec);

  useEffect(()=>{
    const canvasEl = canvasRef.current;
    const indicatorEl = indicatorRef.current;
    if(!canvasEl || !indicatorEl) return;
    const context = canvasEl.getContext('2d');
    if(!context) return;
    const canvas = canvasEl;
    const indicator = indicatorEl;
    const ctx = context;

    const samples: { tMs:number, idxFloat:number }[] = [];
    let p0Val: number | null = null;
    let idxFloat = mid;
    let elapsedMs = 0;
    let secCount = 0;
    let tickTimer: number | null = null;
    let secTimer: number | null = null;

    const lanesWrap = lanesWrapRef.current;
    const laneEls = laneRefs.current;
    const tickEls = tickRefs.current;

    function resizeCanvasToDisplaySize(){
      const dpr = window.devicePixelRatio || 1;
      const cssW = canvas.clientWidth;
      const cssH = canvas.clientHeight;
      if(canvas.width !== Math.round(cssW*dpr) || canvas.height !== Math.round(cssH*dpr)){
        canvas.width = Math.round(cssW*dpr);
        canvas.height = Math.round(cssH*dpr);
      }
      return dpr;
    }

    function yScaleDOM(idxLike:number){
      const cssH = canvas.clientHeight;
      const centerY = cssH / 2;
      const gridZoneHeight = cssH * 0.6;
      const maxOffset = gridZoneHeight / 2;
      const normalizedPos = (idxLike - mid) / (labels.length - 1) * verticalSpacingMultiplier;
      const y = centerY + (normalizedPos * maxOffset);
      return Math.max(0, Math.min(cssH, y));
    }

    function yScale(idxLike:number){
      const lo = mid - clampLanes;
      const hi = mid + clampLanes;
      const t = (idxLike - lo) / (hi - lo);
      return canvas.height * t;
    }

    function drawGrid(){
      const dpr = resizeCanvasToDisplaySize();
      ctx.save();
      ctx.clearRect(0,0,canvas.width,canvas.height);
      ctx.fillStyle = 'rgba(255,255,255,0.02)';
      ctx.fillRect(0,0,canvas.width,canvas.height);

      ctx.strokeStyle = 'rgba(255,255,255,0.2)';
      ctx.setLineDash([4*dpr,4*dpr]);
      ctx.lineWidth = 1*dpr;
      const yTop = yScale(mid - clampLanes);
      const yBot = yScale(mid + clampLanes);
      ctx.beginPath(); ctx.moveTo(0,yTop); ctx.lineTo(canvas.width,yTop); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0,yBot); ctx.lineTo(canvas.width,yBot); ctx.stroke();
      ctx.setLineDash([]);

      ctx.strokeStyle = 'rgba(255,255,255,0.25)';
      const centerY = canvas.height/2;
      ctx.beginPath(); ctx.moveTo(0,centerY); ctx.lineTo(canvas.width,centerY); ctx.stroke();

      ctx.strokeStyle = 'rgba(255,255,255,0.09)';
      for(let i=0;i<labels.length;i++){
        const cssH = canvas.height;
        const center = cssH / 2;
        const gridZoneHeight = cssH * 0.6;
        const maxOffset = gridZoneHeight / 2;
        const normalizedPos = (i - mid) / (labels.length - 1) * verticalSpacingMultiplier;
        const y = center + (normalizedPos * maxOffset);
        if(y>=0 && y<=canvas.height){
          ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(canvas.width,y); ctx.stroke();
        }
      }
      ctx.restore();
    }

    function drawTrail(){
      const dpr = window.devicePixelRatio || 1;
      ctx.save();
      ctx.lineWidth = 2*dpr;
      ctx.strokeStyle = '#34d399';
      ctx.beginPath();
      for(let i=0;i<samples.length;i++){
        const sample = samples[i];
        const padL = 24*dpr, padR = 24*dpr;
        const w = canvas.width - padL - padR;
        const x = padL + (sample.tMs/(durSec*1000))*w;
        const cssH = canvas.height;
        const center = cssH / 2;
        const gridZoneHeight = cssH * 0.6;
        const maxOffset = gridZoneHeight / 2;
        const normalizedPos = (sample.idxFloat - mid) / (labels.length - 1) * verticalSpacingMultiplier;
        const y = center + (normalizedPos * maxOffset);
        if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
      }
      ctx.stroke();
      ctx.restore();
    }

    function updateIndicatorLine(idxRounded:number){
      if(!indicator) return;
      indicator.style.top = yScaleDOM(idxRounded) + 'px';
    }

    function positionRightLanes(){
      const lanesWrapEl = lanesWrapRef.current;
      const lanesHeaderEl = lanesHeaderRef.current;
      const rightCardEl = rightCardRef.current;
      if(!lanesWrapEl || !lanesHeaderEl || !rightCardEl) return;
      const canvasRect = canvas.getBoundingClientRect();
      const cardRect = rightCardEl.getBoundingClientRect();
      const headerHeight = lanesHeaderEl.offsetHeight + 8;
      const offset = canvasRect.top - cardRect.top - headerHeight;
      lanesWrapEl.style.marginTop = offset + 'px';
      lanesWrapEl.style.height = canvas.clientHeight + 'px';
      laneEls.forEach((el, idx)=>{
        if(!el) return;
        el.style.top = yScaleDOM(idx) + 'px';
      });
    }

    function updateBoard(idxRounded:number){
      laneEls.forEach((el, idx)=>{
        if(!el) return;
        if(idx===idxRounded) el.classList.add('win'); else el.classList.remove('win');
      });
      updateIndicatorLine(idxRounded);
    }

    function start(){
      resetMockLive();
      laneEls.forEach(el=> el?.classList.remove('win'));
      tickEls.forEach(el=> el?.classList.remove('active'));
      p0Val = null;
      idxFloat = mid;
      elapsedMs = 0;
      secCount = 0;
      samples.length = 0;
      setP0(null);
      setPc(null);
      setChgPct(null);
      setDirection('—');
      setCountdown(durSec);
      resizeCanvasToDisplaySize();
      drawGrid();
      drawTrail();
      positionRightLanes();
      updateIndicatorLine(Math.round(idxFloat));

      if(secTimer) window.clearInterval(secTimer);
      if(tickTimer) window.clearInterval(tickTimer);

      secTimer = window.setInterval(()=>{
        const el = tickEls[secCount];
        if(el) el.classList.add('active');
        secCount++;
        const remaining = Math.max(0, durSec - secCount);
        setCountdown(remaining);
        if(secCount>durSec){
          if(secTimer){ window.clearInterval(secTimer); secTimer=null; }
          if(tickTimer){ window.clearInterval(tickTimer); tickTimer=null; }
          setTimeout(()=>{ navigate('/presenter/results'); }, 700);
        }
      }, 1000);

      const applyPrice = (price:number, base:number)=>{
        if(p0Val == null){
          p0Val = base;
          setP0(base);
        }
        const currentBase = p0Val ?? base;
        const offsetPct = (price - currentBase) / currentBase;
        setPc(price);
        setChgPct(offsetPct);
        setDirection(offsetPct>0 ? '↑ Long (B)' : offsetPct<0 ? '↓ Short (S)' : '—');
        idxFloat = mid - (offsetPct / lanePct);
        const lo = mid - clampLanes;
        const hi = mid + clampLanes;
        if(idxFloat < lo) idxFloat = lo;
        if(idxFloat > hi) idxFloat = hi;
        elapsedMs += tickMs;
        if(elapsedMs>durSec*1000) elapsedMs = durSec*1000;
        samples.push({ tMs: elapsedMs, idxFloat });
        drawGrid();
        drawTrail();
        updateBoard(Math.max(0, Math.min(labels.length-1, Math.round(idxFloat))));
      };

      const poll = async ()=>{
        if(elapsedMs >= durSec*1000) return;
        try{
          const res = await mockLiveStatus();
          const price = res?.realtime_price?.price;
          const base = res?.realtime_price?.p0 ?? price;
          if(price!=null && base!=null){
            applyPrice(price, base);
          }
        }catch{/* ignore */}
      };

      poll();
      tickTimer = window.setInterval(()=>{ void poll(); }, tickMs);
    }

    function stop(){
      if(secTimer){ window.clearInterval(secTimer); secTimer=null; }
      if(tickTimer){ window.clearInterval(tickTimer); tickTimer=null; }
    }

    const handleResize = ()=>{
      resizeCanvasToDisplaySize();
      drawGrid();
      drawTrail();
      positionRightLanes();
      updateIndicatorLine(Math.round(idxFloat));
    };

    start();
    window.addEventListener('resize', handleResize);
    resetRef.current = ()=>{ stop(); start(); };

    return ()=>{
      stop();
      window.removeEventListener('resize', handleResize);
    };
  }, [labels, mid, clampLanes, lanePct, navigate]);

  const ticks = Array.from({length:31});
  if(tickRefs.current.length !== ticks.length){
    tickRefs.current = Array(ticks.length).fill(null);
  }
  if(laneRefs.current.length !== labels.length){
    laneRefs.current = Array(labels.length).fill(null);
  }

  return (
    <div className="container" style={{maxWidth:900}}>
      <div className="header">
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          <span className="badge">Oh&nbsp;My&nbsp;Balls</span>
          <div className="title">Presenter — Live (Synced Panels · Fixed Top)</div>
        </div>
        <div className="timeline card" style={{padding:'8px 12px'}}>
          <div className="meta">t0</div>
          <div className="ticks">
            {ticks.map((_,i)=>(
              <div
                key={i}
                className="tick"
                ref={el=>{ tickRefs.current[i]=el; }}
              />
            ))}
          </div>
          <div className="meta">t30</div>
          <div className="meta">{countdown}s</div>
        </div>
      </div>

      <div className="stage">
        <div className="leftPanel">
          <div className="card">
            <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:8,marginBottom:8}}>
              <div className="stat"><div className="meta">Anchor p0</div><div className="v">{fmtUSD(p0)}</div></div>
              <div className="stat"><div className="meta">Current</div><div className="v">{fmtUSD(pc)}</div></div>
              <div className="stat"><div className="meta">Δ %</div><div className="v">{fmtPct(chgPct)}</div></div>
              <div className="stat"><div className="meta">Direction</div><div className="v">{direction}</div></div>
            </div>
            <div className="meta" style={{marginBottom:8}}>Синхрон: шары справа выравнены с сеткой графика. Ограничение движения ±7%, увеличенные интервалы.</div>
            <div style={{position:'relative'}}>
              <canvas ref={canvasRef} className="chart" style={{display:'block',width:'100%',height:700,borderRadius:12,border:'1px solid rgba(255,255,255,.08)',background:'linear-gradient(180deg,rgba(255,255,255,.02),rgba(255,255,255,.01))'}} />
              <div ref={indicatorRef} className="indicatorLine" style={{top:'50%'}} />
            </div>
            <div style={{display:'flex',gap:8,marginTop:10}}>
              <button className="btn" onClick={()=>resetRef.current()}>Reset</button>
              <button className="btn" onClick={()=>navigate('/presenter/results')}>Resolve →</button>
            </div>
          </div>
        </div>

        <div className="rightPanel">
          <div className="card" ref={rightCardRef}>
            <div ref={lanesHeaderRef} style={{fontWeight:800,marginBottom:8}}>Balls (S9→B9)</div>
            <div className="lanesWrap" ref={lanesWrapRef}>
              {labels.map((label, idx)=>(
                <div key={label} className="laneDot" ref={el=>{ laneRefs.current[idx]=el; }}>
                  <span className={`ball ${label.startsWith('B')?'long':'short'}`}>{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
