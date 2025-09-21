import { useEffect, useRef, useState } from 'react';
import { api } from './api';

export function useInterval(cb:()=>void, delay:number|null){
  const ref = useRef<()=>void>();
  useEffect(()=>{ ref.current = cb; }, [cb]);
  useEffect(()=>{ if(delay==null) return; const id=setInterval(()=>ref.current&&ref.current(), delay); return ()=>clearInterval(id); }, [delay]);
}

export function useStatusPolling(role: 'presenter'|'user'){
  const [status, setStatus] = useState<any>(null);
  const interval = role==='presenter'? 100 : 1000;
  useInterval(async ()=>{ try{ setStatus(await api.status()); }catch{} }, interval);
  useEffect(()=>{ (async()=>{ try{ setStatus(await api.status()); }catch{} })(); }, []);
  return status;
}


