/* Gentle, perspective-scaled surf. Only the water moves; the horizon stays fixed. */
(() => {
  const canvas = document.getElementById('coastline');
  const photo = document.getElementById('sunset-photo');
  const button = document.getElementById('motion-toggle');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const gl = canvas.getContext('webgl', {alpha:false, antialias:false});
  if (!gl) { button.hidden = true; return; }
  const vertex = `attribute vec2 position; varying vec2 uv;
    void main(){ uv=vec2(position.x*.5+.5,.5-position.y*.5); gl_Position=vec4(position,0.,1.); }`;
  const fragment = `precision highp float;
    varying vec2 uv; uniform sampler2D photo; uniform float time;
    float edge(float y) {
      if(y<.45) return mix(.94,.97,smoothstep(.326,.45,y));
      if(y<.60) return mix(.97,.83,smoothstep(.45,.60,y));
      if(y<.74) return mix(.83,.60,smoothstep(.60,.74,y));
      if(y<.86) return mix(.60,.65,smoothstep(.74,.86,y));
      return mix(.65,.20,smoothstep(.86,1.,y));
    }
    void main(){
      float depth=max(0.,(uv.y-.326)/.674);
      float wet=1.-smoothstep(edge(uv.y)-.015,edge(uv.y)+.085,uv.x);
      float water=smoothstep(.326,.37,uv.y)*wet;
      // Compressed distant crests spread as they approach the beach.
      float phase=25.*sqrt(depth+.015)-uv.x*3.4;
      float swell=sin(phase-time*1.12);
      float secondary=sin(phase*1.71-time*1.65+uv.x*2.1);
      float ripple=sin(uv.y*225.+uv.x*18.-time*2.2);
      float surge=(swell*.7+secondary*.3)*(.003+.020*depth);
      float wash=sin(time*.72+uv.y*6.)*.018*depth;
      float shore=exp(-abs(uv.x-edge(uv.y))*22.);
      vec2 offset=vec2(surge*.55+wash*shore, surge*.45+ripple*.0014*depth)*water;
      vec3 color=texture2D(photo,clamp(uv-offset,vec2(.001),vec2(.999))).rgb;
      // Moving grazing light across the small swells, kept very subtle.
      float glint=(sin(phase-time*1.12+.45)-sin(phase+.45))*.012*water;
      color+=vec3(1.,.80,.54)*glint;
      gl_FragColor=vec4(color,1.);
    }`;
  function shader(type, source) {
    const item = gl.createShader(type); gl.shaderSource(item, source); gl.compileShader(item);
    if (!gl.getShaderParameter(item, gl.COMPILE_STATUS)) throw Error(gl.getShaderInfoLog(item));
    return item;
  }
  let program;
  try {
    program=gl.createProgram();
    gl.attachShader(program,shader(gl.VERTEX_SHADER,vertex));
    gl.attachShader(program,shader(gl.FRAGMENT_SHADER,fragment));
    gl.linkProgram(program);
    if(!gl.getProgramParameter(program,gl.LINK_STATUS)) throw Error('Wave program unavailable');
  } catch (_) {button.hidden=true; return;}
  gl.useProgram(program);
  const buffer=gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
  gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
  const position=gl.getAttribLocation(program,'position');
  gl.enableVertexAttribArray(position); gl.vertexAttribPointer(position,2,gl.FLOAT,false,0,0);
  const texture=gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D,texture);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
  gl.uniform1i(gl.getUniformLocation(program,'photo'),0);
  const time=gl.getUniformLocation(program,'time');
  let ready=false, paused=reduced.matches, visible=true, frame=0, elapsed=0, previous=0;
  function sync(){button.textContent=paused?'Play waves':'Pause waves';button.setAttribute('aria-label',paused?'Play beach waves':'Pause beach waves');}
  function draw(){gl.uniform1f(time,elapsed*2);gl.drawArrays(gl.TRIANGLES,0,6);}
  function resize(){
    const scale=Math.min(devicePixelRatio||1,1.75);
    canvas.width=Math.min(960,Math.round(canvas.clientWidth*scale));
    canvas.height=Math.round(canvas.width*1.25);
    gl.viewport(0,0,canvas.width,canvas.height);if(ready)draw();
  }
  function tick(now){
    frame=0;
    if(!ready||paused||!visible||document.hidden)return;
    if(previous)elapsed+=Math.min((now-previous)/1000,.06);
    previous=now;draw();frame=requestAnimationFrame(tick);
  }
  function schedule(){cancelAnimationFrame(frame);previous=0;if(ready&&!paused&&visible&&!document.hidden)frame=requestAnimationFrame(tick);}
  function load(){
    if(ready||!photo.naturalWidth)return;
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGB,gl.RGB,gl.UNSIGNED_BYTE,photo);
    ready=true;resize();canvas.style.opacity='1';sync();schedule();
  }
  button.addEventListener('click',()=>{paused=!paused;sync();schedule();});
  reduced.addEventListener('change',()=>{paused=reduced.matches;sync();schedule();});
  document.addEventListener('visibilitychange',schedule);
  if('IntersectionObserver' in window)new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;schedule();}).observe(canvas);
  canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();cancelAnimationFrame(frame);canvas.style.opacity='0';button.hidden=true;});
  window.addEventListener('resize',resize);
  photo.addEventListener('load',load);photo.addEventListener('error',()=>{button.hidden=true;});load();sync();
})();
