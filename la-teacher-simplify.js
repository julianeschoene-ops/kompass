/* Lernatelier: ruhige Lehrkraftansicht, vorhandene Lärmampel wiederverwenden. */
(function(){
 const original=learningAtelier;
 learningAtelier=function(){
   original();
   if(laViewMode==='student')return;
   const root=document.getElementById('app');
   if(!root)return;
   const places=root.querySelector('.laPanel-places');
   if(places){
     places.querySelectorAll('.laPlaceSettings').forEach(x=>x.remove());
     places.querySelectorAll('.card').forEach(x=>{
       const s=x.textContent||'';
       if(s.includes('Sammelzuordnung')||s.includes('noch keinem Lernatelier zugeordnet'))x.remove();
     });
   }
   const noise=root.querySelector('.laPanel-noise');
   if(noise){
     const old=noise.querySelector('.card');
     if(old)old.remove();
     const hub=document.createElement('div');
     hub.className='laNoiseTeacherHub';
     hub.innerHTML='<section class="card"><h2>Lärmampel · '+esc(laSelectedRoom)+'</h2>'+laNoiseMeterUI()+'</section><section id="laNoiseScoreboard">'+laNoiseScoreboardHTML()+'</section>';
     noise.appendChild(hub);
   }
 };
})();