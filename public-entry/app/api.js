(function(){
  const REMOTE_BASE = 'https://api-omb.antosha.app';
  const useRemote = !!window.__USE_REMOTE_API__;

  const remoteTransport = {
    async post(path, body){
      const res = await fetch(REMOTE_BASE+path, {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(body)});
      if(!res.ok) throw new Error('HTTP '+res.status);
      return res.json();
    },
    async get(path){
      const res = await fetch(REMOTE_BASE+path);
      if(!res.ok) throw new Error('HTTP '+res.status);
      return res.json();
    }
  };

  const transport = useRemote ? remoteTransport : window.__ombTransport;

  function getOrCreateUUID(){
    const k = 'omb_uuid';
    let v = localStorage.getItem(k);
    if(!v){ v = crypto.randomUUID(); localStorage.setItem(k, v); }
    return v;
  }

  async function join(){
    const uuid = getOrCreateUUID();
    return transport.post('/join', { uuid });
  }

  async function status(){
    return transport.get('/status');
  }

  window.ombApi = { join, status, getOrCreateUUID };
})();


