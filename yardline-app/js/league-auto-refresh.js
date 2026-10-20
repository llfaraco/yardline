(function(root){
  'use strict';
  function create({refresh,visible=()=>true,online=()=>true,status=()=>{},schedule=setTimeout,cancel=clearTimeout,interval=60000,maxDelay=300000}){
    let timer=null,pending=null,stopped=true,failures=0;
    function queue(delay){if(timer!==null)cancel(timer);if(!stopped)timer=schedule(()=>{timer=null;tick();},delay);}
    function tick(){
      if(stopped)return Promise.resolve();
      if(pending)return pending;
      if(!visible()||!online()){if(!online())status({status:'offline'});queue(interval);return Promise.resolve();}
      status({status:'refreshing'});
      pending=Promise.resolve().then(refresh).then(snapshot=>{
        failures=0;status({status:'synced',syncedAt:snapshot?.syncedAt||null});return snapshot;
      }).catch(error=>{failures++;status({status:'stale',message:error.message});}).finally(()=>{
        pending=null;queue(Math.min(maxDelay,interval*Math.pow(2,Math.min(failures,3))));
      });
      return pending;
    }
    return {start(){if(!stopped)return;stopped=false;queue(1500);},stop(){stopped=true;if(timer!==null)cancel(timer);timer=null;},tick};
  }
  root.YardlineAutoRefresh={create};
  if(typeof document==='undefined'||root.YL_DISABLE_AUTO_REFRESH===true)return;
  const controller=create({
    refresh:()=>root.syncRealSleeperLeagueLive(undefined,{quiet:true,automatic:true}),
    visible:()=>document.visibilityState!=='hidden' && !document.querySelector('.yl-modal-overlay.open') && !document.activeElement?.matches('input,textarea,select,[contenteditable="true"]'),online:()=>root.navigator?.onLine!==false,
    status:value=>{
      root.YL_REFRESH_STATUS=value;
      for(const el of document.querySelectorAll('[data-league-freshness]')){
        el.textContent=value.status==='refreshing'?'Atualizando Sleeper…':value.status==='offline'?'Sem conexão · última atualização salva':value.status==='stale'?'Falha ao atualizar · exibindo dados salvos':value.syncedAt?'Atualizado às '+new Date(value.syncedAt).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}):'Atualização automática ativa';
        el.dataset.status=value.status;
      }
    }
  });
  root.YL_LEAGUE_AUTO_REFRESH=controller;
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>controller.start(),{once:true});else controller.start();
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState!=='hidden')controller.tick();});
  root.addEventListener('online',()=>controller.tick());
  root.addEventListener('pagehide',()=>controller.stop());
  root.addEventListener('pageshow',()=>controller.start());
})(typeof window!=='undefined'?window:globalThis);
