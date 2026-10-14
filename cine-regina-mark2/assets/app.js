'use strict';
const CHAPTERS=[{"parte": "", "titulo": "Palavra do autor", "tempo": "0:56", "src": "/cine-regina-mark2/videos/capitulo-00/filme.m3u8", "poster": "/cine-regina-mark2/assets/capitulo-00.jpg"}, {"parte": "Parte I", "titulo": "A construção do Cinema", "tempo": "6:22", "src": "/cine-regina-mark2/videos/capitulo-01/filme.m3u8", "poster": "/cine-regina-mark2/assets/capitulo-01.jpg"}, {"parte": "Parte II", "titulo": "A ligação com o Geraldo Zebral", "tempo": "3:41", "src": "/cine-regina-mark2/videos/capitulo-02/filme.m3u8", "poster": "/cine-regina-mark2/assets/capitulo-02.jpg"}, {"parte": "Parte III", "titulo": "Um Filme do Passado", "tempo": "3:36", "src": "/cine-regina-mark2/videos/capitulo-03/filme.m3u8", "poster": "/cine-regina-mark2/assets/capitulo-03.jpg"}, {"parte": "Parte IV", "titulo": "O discurso de inauguração", "tempo": "5:32", "src": "/cine-regina-mark2/videos/capitulo-04/filme.m3u8", "poster": "/cine-regina-mark2/assets/capitulo-04.jpg"}, {"parte": "Parte V", "titulo": "A Inauguração: Melodia Imortal", "tempo": "13:01", "src": "/cine-regina-mark2/videos/capitulo-05/filme.m3u8", "poster": "/cine-regina-mark2/assets/capitulo-05.jpg"}, {"parte": "Parte VI", "titulo": "O Baile do Clube Carijós – Parte I", "tempo": "17:14", "src": "/cine-regina-mark2/videos/capitulo-06/filme.m3u8", "poster": "/cine-regina-mark2/assets/capitulo-06.jpg"}, {"parte": "Parte VII", "titulo": "O Baile do Clube Carijós – Parte II", "tempo": "16:33", "src": "/cine-regina-mark2/videos/capitulo-07/filme.m3u8", "poster": "/cine-regina-mark2/assets/capitulo-07.jpg"}, {"parte": "Parte VIII", "titulo": "Crônica: Cine Regina", "tempo": "6:27", "src": "/cine-regina-mark2/videos/capitulo-08/filme.m3u8", "poster": "/cine-regina-mark2/assets/capitulo-08.jpg"}, {"parte": "Parte IX", "titulo": "Anos Dourados do Cinema", "tempo": "5:50", "src": "/cine-regina-mark2/videos/capitulo-09/filme.m3u8", "poster": "/cine-regina-mark2/assets/capitulo-09.jpg"}];
const $=id=>document.getElementById(id);
const menu=$('original-scene'),music=$('cine-regina-bg-music'),projector=$('projector-noise'),splash=$('splash-screen');
const mirror=$('mirror-layer'),reflection=$('mirror-copy'),shine=$('mirror-shine'),edge=$('mirror-edge'),lock=$('transition-lock');
const reduceMotion=matchMedia('(prefers-reduced-motion: reduce)');
let current=menu,index=-1,started=false,busy=false,pendingRoute=null,finishAnimation=null,raf=0;
const pausedAnimations=new WeakMap();
const audioStates=new WeakMap(),activeFades=new Set();let audioContext=null;
const clamp=(p,a=0,b=1)=>Math.max(a,Math.min(b,p));
const smooth=p=>p*p*p*(p*(6*p-15)+10);
const MUSIC_LEVEL=.55,PROJECTOR_LEVEL=.30;music.volume=MUSIC_LEVEL;music.playbackRate=.985;projector.volume=PROJECTOR_LEVEL;
function audioState(media){
 let state=audioStates.get(media);if(state)return state;
 state={level:media===music?MUSIC_LEVEL:media===projector?PROJECTOR_LEVEL:1,gain:null,source:null,cancel:null};
 try{
  const Audio=window.AudioContext||window.webkitAudioContext;
  if(Audio){audioContext??=new Audio();const source=audioContext.createMediaElementSource(media),gain=audioContext.createGain();source.connect(gain);gain.connect(audioContext.destination);gain.gain.value=state.level;media.volume=1;state.gain=gain;state.source=source;}
 }catch(_){}
 audioStates.set(media,state);return state;
}
function setAudioLevel(media,level){
 const state=audioState(media);state.level=clamp(level);
 if(state.gain){const param=state.gain.gain;param.setTargetAtTime(state.level,audioContext.currentTime,.012);}else media.volume=state.level;
}
function unlockAudio(){try{if(audioContext?.state==='suspended')audioContext.resume().catch(()=>{});}catch(_){}}
function fadeAudio(media,target,ms=720,pauseAtEnd=false){
 const state=audioState(media);if(state.cancel)state.cancel();
 if(document.hidden||ms===0||media.paused){setAudioLevel(media,target);if(pauseAtEnd)media.pause();return Promise.resolve();}
 return new Promise(resolve=>{
  const from=state.level;let initial=null,frame=0,done=false;
  const cancel=()=>{if(done)return;done=true;cancelAnimationFrame(frame);activeFades.delete(finish);state.cancel=null;resolve();};
  const finish=()=>{if(done)return;setAudioLevel(media,target);if(pauseAtEnd)media.pause();cancel();};
  state.cancel=cancel;activeFades.add(finish);
  const tick=now=>{if(initial===null)initial=now;const p=clamp((now-initial)/ms);setAudioLevel(media,from+(target-from)*smooth(p));if(p<1)frame=requestAnimationFrame(tick);else finish();};
  frame=requestAnimationFrame(tick);
 });
}
function announce(s){$('status').textContent=s;}
function show(el,active){el.hidden=!active;el.inert=!active;el.setAttribute('aria-hidden',String(!active));}
function pauseAmbient(scene){
 const paused=[];if(scene.getAnimations)for(const a of scene.getAnimations({subtree:true})){if(a.playState==='running'){a.pause();paused.push(a);}}
 pausedAnimations.set(scene,paused);
}
function resumeAmbient(scene){for(const a of pausedAnimations.get(scene)||[])a.play();pausedAnimations.delete(scene);}
function resumeMusic(){if(started&&current===menu&&!document.hidden){audioState(music);unlockAudio();if(music.paused)setAudioLevel(music,0);try{music.play().then(()=>{if(current===menu&&!document.hidden)fadeAudio(music,MUSIC_LEVEL,950);}).catch(()=>{});}catch(_){}}}
function videoIn(scene){return scene.querySelector('.local-video');}
function freezeVideo(video){
 const canvas=document.createElement('canvas'),box=video.getBoundingClientRect(),ratio=Math.min(devicePixelRatio||1,2);
 canvas.width=Math.max(1,Math.round(box.width*ratio));canvas.height=Math.max(1,Math.round(box.height*ratio));
 const ctx=canvas.getContext('2d');ctx.fillStyle='#000';ctx.fillRect(0,0,canvas.width,canvas.height);
 const ready=video.dataset.presented==='true'&&video.readyState>=2&&video.videoWidth>0;
 if(ready){
  const scale=Math.min(canvas.width/video.videoWidth,canvas.height/video.videoHeight),w=video.videoWidth*scale,h=video.videoHeight*scale;
  ctx.drawImage(video,(canvas.width-w)/2,(canvas.height-h)/2,w,h);
 }else{
  const poster=posterCache.get(video.poster);
  if(poster&&poster.complete&&poster.naturalWidth){const scale=Math.min(canvas.width/poster.naturalWidth,canvas.height/poster.naturalHeight),w=poster.naturalWidth*scale,h=poster.naturalHeight*scale;ctx.drawImage(poster,(canvas.width-w)/2,(canvas.height-h)/2,w,h);}
 }
 canvas.dataset.frameTime=String(video.currentTime||0);return canvas;
}
// Freeze the actual DOM appearance and scroll position. Native local video is
// replaced with the frame currently on screen, drawn directly into a canvas.
// No substitute picture, iframe, remote screenshot, or video timestamp guess.
function captureScene(scene){
 const copy=scene.cloneNode(true),sources=[scene,...scene.querySelectorAll('*')],copies=[copy,...copy.querySelectorAll('*')],scrolls=[];
 sources.forEach((source,i)=>{
  let target=copies[i];const computed=getComputedStyle(source);
  target.style.cssText=Array.from(computed).map(p=>p+':'+computed.getPropertyValue(p)+';').join('');
  target.style.animation='none';target.style.transition='none';
  target.removeAttribute('id');target.removeAttribute('autofocus');target.removeAttribute('tabindex');
  if(source.tagName==='INPUT'){target.value=source.value;target.checked=source.checked;target.setAttribute('value',source.value);}
  if(source.tagName==='VIDEO'){
   const frame=freezeVideo(source);frame.style.cssText=target.style.cssText;frame.style.objectFit='fill';frame.className=target.className;
   target.replaceWith(frame);target=frame;
  }else if(source.tagName==='CANVAS'){target.width=source.width;target.height=source.height;target.getContext('2d').drawImage(source,0,0);}
  if(source.scrollTop||source.scrollLeft)scrolls.push([target,source.scrollTop,source.scrollLeft]);
 });
 copy.inert=true;copy.setAttribute('aria-hidden','true');copy.classList.add('frozen-screen');
 return {copy,scrolls};
}
function animate(ms,draw){return new Promise(resolve=>{
 let initial=null,done=false;const finish=()=>{if(done)return;done=true;cancelAnimationFrame(raf);draw(1);finishAnimation=null;resolve();};finishAnimation=finish;
 const tick=now=>{if(initial===null)initial=now;const t=clamp((now-initial)/ms);draw(t);if(t<1)raf=requestAnimationFrame(tick);else finish();};raf=requestAnimationFrame(tick);
});}
function mirrorFrame(t,from,to,reverse){
 const p=smooth(clamp(t/.92)),w=innerWidth,x=(reverse?1-p:p)*w;
 if(t>=.92){from.style.opacity='0';to.style.clipPath='none';mirror.style.opacity='0';return;}
 to.style.clipPath=reverse?'inset(0 0 0 '+((1-p)*100)+'%)':'inset(0 '+((1-p)*100)+'% 0 0)';
 const strength=16*p*p*(1-p)*(1-p),half=Math.min(145,w*.15)*smooth(clamp(strength*2));
 mirror.style.opacity=String(smooth(clamp(strength*2)));
 mirror.style.clipPath='inset(0 '+Math.max(0,w-x-half)+'px 0 '+Math.max(0,x-half)+'px)';
 // Reflection around the moving vertical axis: x' = 2 * axis - x.
 reflection.style.transform='matrix(-1,0,0,1,'+(2*x)+',0)';
 shine.style.left=(x-half)+'px';shine.style.width=(2*half)+'px';edge.style.left=x+'px';
}
async function transition(from,to,reverse){
 pauseAmbient(from);
 const skip=reduceMotion.matches||document.hidden;let snapshot;
 // Capture before focus, inert state, z-order or the visible destination changes.
 if(!skip){try{snapshot=captureScene(from);}catch(error){announce('O reflexo não pôde ser preparado. A passagem continua.');}}
 show(to,true);show(from,true);from.inert=to.inert=true;from.style.zIndex='20';to.style.zIndex='21';
 if(skip){show(from,false);show(to,true);from.style.zIndex=to.style.zIndex='';return;}
 // Set the destination clip synchronously, before the browser can paint it.
 to.style.clipPath=reverse?'inset(0 0 0 100%)':'inset(0 100% 0 0)';
 if(snapshot){reflection.replaceChildren(snapshot.copy);for(const [node,top,left]of snapshot.scrolls){node.scrollTop=top;node.scrollLeft=left;}}
 mirror.hidden=!snapshot;mirrorFrame(0,from,to,reverse);
 try{await animate(2150,t=>mirrorFrame(t,from,to,reverse));}
 finally{
  show(from,false);show(to,true);from.style.opacity='';from.style.zIndex='';to.style.clipPath='';to.style.zIndex='';
  mirror.hidden=true;reflection.replaceChildren();mirror.style.opacity='0';
 }
}
const posterCache=new Map();
function cachePoster(url){if(!posterCache.has(url)){const img=new Image();img.src=url;posterCache.set(img.src,img);posterCache.set(url,img);}return posterCache.get(url);}
function timeLabel(value){if(!Number.isFinite(value))return '0:00';return Math.floor(value/60)+':'+String(Math.floor(value%60)).padStart(2,'0');}
function attachVideo(video,item,view){
 if(!item.src.endsWith('.m3u8')){video.src=item.src;return;}
 if(video.canPlayType('application/vnd.apple.mpegurl')){video.src=item.src;return;}
 if(window.Hls?.isSupported()){
  const hls=new Hls({maxBufferLength:30,backBufferLength:20});view.hls=hls;hls.loadSource(item.src);hls.attachMedia(video);
  hls.on(Hls.Events.ERROR,(_,data)=>{if(data.fatal)view.querySelector('.video-error').hidden=false;});
 }else view.querySelector('.video-error').hidden=false;
}
function primePlayback(view){
 const video=videoIn(view);video.waitingForReveal=true;setAudioLevel(video,0);unlockAudio();
 // Request playback inside the chapter click, retaining media permission on Safari.
 // Freeze at the beginning until the mirror has completely revealed the screen.
 try{video.play().then(()=>{if(video.waitingForReveal){video.pause();try{video.currentTime=0;}catch(_){}}}).catch(()=>{});}catch(_){}
}
function startFilm(view){
 const video=videoIn(view);video.waitingForReveal=false;if(document.hidden)return;
 unlockAudio();try{video.play().then(()=>{if(current===view&&!document.hidden)fadeAudio(video,Number(view.querySelector('.volume').value),400);else video.pause();}).catch(()=>{setAudioLevel(video,Number(view.querySelector('.volume').value));announce('Toque em Reproduzir para iniciar o filme.');});}catch(_){}
}
function makeViewer(i){
 const item=CHAPTERS[i],view=document.createElement('section');view.className='cinema-scene local-viewer';view.hidden=true;view.inert=true;view.setAttribute('aria-label','Exibição de '+item.titulo);
 view.innerHTML='<header class="projection-header"><button class="local-button back">← Voltar ao Menu</button><div class="projection-heading"><p></p><h2 tabindex="-1"></h2></div><span class="projection-count"></span><button class="local-button fullscreen" type="button" aria-label="Entrar em tela cheia" aria-pressed="false" title="Tela cheia"><svg class="fullscreen-enter" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M8 3H3v5M16 3h5v5M21 16v5h-5M8 21H3v-5"></path></svg><svg class="fullscreen-exit" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M3 8h5V3M16 3v5h5M21 16h-5v5M8 21v-5H3"></path></svg></button></header><div class="projection-stage"><video class="local-video" playsinline preload="auto"></video><div class="video-error" hidden>Não foi possível carregar o vídeo.<br>Confira a conexão e abra novamente este capítulo pelo Menu.</div></div><footer class="player-controls"><input class="seek" type="range" min="0" max="1000" value="0" step="1" aria-label="Posição do vídeo"><div class="transport"><button class="local-button play-toggle">▶ Reproduzir</button><span class="video-time">0:00 / '+item.tempo+'</span><span class="transport-spacer"></span><label><span class="screen-reader">Volume do vídeo</span><input class="volume" type="range" min="0" max="1" step="0.01" value="1" aria-label="Volume do vídeo"></label></div></footer>';
 view.querySelector('.projection-heading p').textContent=item.parte||'Palavra do autor';view.querySelector('h2').textContent=item.titulo;view.querySelector('.projection-count').textContent=String(i+1).padStart(2,'0')+' / 10';
 const video=videoIn(view),play=view.querySelector('.play-toggle'),seek=view.querySelector('.seek'),label=view.querySelector('.video-time');
 video.poster=item.poster;video.dataset.presented='false';cachePoster(video.poster);attachVideo(video,item,view);
 for(const event of ['playing','seeked'])video.addEventListener(event,()=>{video.dataset.presented='true';});
 const update=()=>{play.textContent=video.paused?'▶ Reproduzir':'Ⅱ Pausar';play.setAttribute('aria-label',video.paused?'Reproduzir vídeo':'Pausar vídeo');label.textContent=timeLabel(video.currentTime)+' / '+(Number.isFinite(video.duration)?timeLabel(video.duration):item.tempo);seek.value=video.duration?String(Math.round(video.currentTime/video.duration*1000)):'0';};
 const toggle=()=>{if(busy)return;if(video.paused){unlockAudio();setAudioLevel(video,Number(view.querySelector('.volume').value));video.play().catch(()=>announce('Clique em Reproduzir para iniciar o vídeo.'));}else video.pause();};
 play.addEventListener('click',toggle);video.addEventListener('click',toggle);
 for(const event of ['timeupdate','loadedmetadata','play','pause','ended'])video.addEventListener(event,update);
 video.addEventListener('ended',()=>{if(current===view&&!busy)navigate(-1);});
 video.addEventListener('error',()=>{view.querySelector('.video-error').hidden=false;});
 seek.addEventListener('input',()=>{if(Number.isFinite(video.duration))video.currentTime=Number(seek.value)/1000*video.duration;update();});
 view.querySelector('.volume').addEventListener('input',e=>{const state=audioState(video);if(state.cancel)state.cancel();setAudioLevel(video,Number(e.target.value));});
 view.querySelector('.back').addEventListener('click',()=>navigate(-1));
 const fullscreen=view.querySelector('.fullscreen');
 view.addEventListener('fullscreenchange',()=>{const active=document.fullscreenElement===view;fullscreen.setAttribute('aria-pressed',String(active));fullscreen.setAttribute('aria-label',active?'Sair da tela cheia':'Entrar em tela cheia');fullscreen.setAttribute('title',active?'Sair da tela cheia':'Tela cheia');});
 fullscreen.addEventListener('click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await view.requestFullscreen();}catch(_){announce('A tela cheia não está disponível neste navegador.');}});
 document.body.appendChild(view);return view;
}
function dispose(view){if(view===menu)return;const video=videoIn(view);if(video){video.waitingForReveal=false;const state=audioStates.get(video);if(state?.cancel)state.cancel();video.pause();view.hls?.destroy();state?.source?.disconnect();state?.gain?.disconnect();video.removeAttribute('src');video.load();}view.remove();}
function routeIndex(){const m=/^#capitulo-(\d+)$/.exec(location.hash);return m&&Number(m[1])<CHAPTERS.length?Number(m[1]):-1;}
async function navigate(next,record=true){
 if(!started||busy||next===index||!Number.isInteger(next)||next< -1||next>=CHAPTERS.length)return;
 busy=true;lock.hidden=false;const from=current,oldIndex=index;
 const to=next<0?menu:makeViewer(next);if(next>=0)primePlayback(to);
 if(document.fullscreenElement){try{await document.exitFullscreen();}catch(_){}}
 current=to;index=next;
 if(record){try{const url=new URL(location.href);url.hash=next<0?'':'capitulo-'+next;history.pushState({cineRegina:true,index:next},'',url);}catch(_){}}
 const outgoing=from===menu?music:videoIn(from);
 try{await Promise.all([transition(from,to,next<oldIndex),fadeAudio(outgoing,0,760,true)]);}
 finally{
  dispose(from);busy=false;lock.hidden=true;to.inert=false;
  if(next<0){resumeAmbient(menu);resumeMusic();const button=menu.querySelector('[data-chapter="'+oldIndex+'"]');if(button)button.focus({preventScroll:true});}
  else{to.querySelector('h2').focus({preventScroll:true});if(pendingRoute===null||pendingRoute===index)startFilm(to);}
  announce(next<0?'Menu restaurado.':'Capítulo aberto: '+CHAPTERS[next].titulo);
 }
 if(pendingRoute!==null){const n=pendingRoute;pendingRoute=null;if(n!==index)await navigate(n,false);}
}
async function start(){
 if(started)return;started=true;splash.style.display='none';resumeMusic();
 const countdown=$('cinema-countdown'),number=$('countdown-number'),flash=$('frame-flash');
 if(!reduceMotion.matches){
  countdown.style.display='flex';let digit=3;number.textContent='3';flash.classList.add('flash-active');
  if(!document.hidden){audioState(projector);unlockAudio();projector.currentTime=0;try{projector.play().catch(()=>{});}catch(_){}}
  await animate(3000,t=>{const n=Math.max(1,3-Math.floor(t*3));if(n!==digit){digit=n;number.textContent=String(n);flash.classList.remove('flash-active');void flash.offsetWidth;flash.classList.add('flash-active');}});
  await Promise.all([animate(600,t=>{countdown.style.opacity=String(1-smooth(t));}),fadeAudio(projector,0,360,true)]);
 }
 countdown.remove();const target=routeIndex();if(target>=0)navigate(target,false);
}
menu.querySelectorAll('[data-chapter]').forEach(b=>b.addEventListener('click',()=>navigate(Number(b.dataset.chapter))));
splash.addEventListener('click',start);
window.addEventListener('popstate',()=>{if(!started)return;const n=routeIndex();if(busy)pendingRoute=n;else navigate(n,false);});
window.addEventListener('hashchange',()=>{if(!started)return;const n=routeIndex();if(busy)pendingRoute=n;else navigate(n,false);});
document.addEventListener('keydown',e=>{
 if(!started||busy||/^(INPUT|SELECT|TEXTAREA)$/.test(e.target.tagName))return;
 if(e.key==='Escape'&&index>=0&&!document.fullscreenElement){e.preventDefault();navigate(-1);}
 if(e.key==='ArrowRight'&&index>=0&&index<9){e.preventDefault();navigate(index+1);}
 if(e.key==='ArrowLeft'&&index>0){e.preventDefault();navigate(index-1);}
 if(e.code==='Space'&&index>=0&&e.target.tagName!=='BUTTON'){e.preventDefault();current.querySelector('.play-toggle').click();}
});
document.addEventListener('visibilitychange',()=>{if(document.hidden){for(const finish of [...activeFades])finish();music.pause();projector.pause();const video=videoIn(current);if(video)video.pause();if(finishAnimation)finishAnimation();}else resumeMusic();});
window.addEventListener('pagehide',()=>{music.pause();projector.pause();const video=videoIn(current);if(video)video.pause();});
