export function createLeagueRefresh(run, {now=Date.now, ttlMs=30000}={}) {
  const running=new Map(), recent=new Map();
  return function refresh(leagueId,week=null,{coreOnly=false,automatic=false}={}) {
    const key=JSON.stringify([String(leagueId),week,coreOnly]);
    if(running.has(key))return running.get(key);
    const cached=recent.get(key);
    if(automatic && coreOnly && cached && now()-cached.at<ttlMs)return Promise.resolve({...cached.value,reused:true});
    const pending=Promise.resolve().then(()=>run(leagueId,week,{coreOnly})).then(value=>{
      recent.set(key,{value,at:now()});
      for(const [k,v] of recent)if(now()-v.at>=ttlMs)recent.delete(k);
      return value;
    }).finally(()=>running.delete(key));
    running.set(key,pending);return pending;
  };
}
