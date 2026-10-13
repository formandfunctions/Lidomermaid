(() => {
  const video=document.getElementById('coastline');
  const button=document.getElementById('motion-toggle');
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  let wantsMotion=!reduced.matches, visible=true;
  video.muted=true;
  video.playbackRate=1;
  function sync(){
    button.textContent=video.paused?'Play waves':'Pause waves';
    button.setAttribute('aria-label',video.paused?'Play beach waves':'Pause beach waves');
  }
  function update(){
    if(wantsMotion&&visible&&!document.hidden)video.play().catch(sync);
    else video.pause();
    sync();
  }
  button.addEventListener('click',()=>{wantsMotion=video.paused;update();});
  video.addEventListener('play',sync);video.addEventListener('pause',sync);
  video.addEventListener('error',()=>{button.hidden=true;});
  reduced.addEventListener('change',()=>{wantsMotion=!reduced.matches;update();});
  document.addEventListener('visibilitychange',update);
  if('IntersectionObserver' in window)new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;update();}).observe(video);
  if(reduced.matches){video.autoplay=false;video.pause();}
  update();
})();