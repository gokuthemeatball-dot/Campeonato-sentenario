const canvas = document.querySelector('#gameCanvas');
const ctx = canvas.getContext('2d');
const liveRegion = document.querySelector('#liveRegion');
const objectiveText = document.querySelector('#objectiveText');
const visualMessage = document.querySelector('#visualMessage');
const dangerStatus = document.querySelector('#dangerStatus');
const powerStatus = document.querySelector('#powerStatus');
const energyStatus = document.querySelector('#energyStatus');
const fuseItem = document.querySelector('#fuseItem');
const keyItem = document.querySelector('#keyItem');
const craftItem = document.querySelector('#craftItem');
const narrationToggle = document.querySelector('#narrationToggle');
const soundToggle = document.querySelector('#soundToggle');

const TILE = 40;
const COLS = 32;
const ROWS = 20;
const playerStart = { x: 2, y: 2 };
const bossStart = { x: 28, y: 17 };
const fuse = { x: 3, y: 17, name: 'stockroom fuse' };
const keycard = { x: 28, y: 2, name: 'office keycard' };
const exit = { x: 30, y: 18, name: 'loading exit' };
const cleaningSpots = [{x:4,y:3},{x:7,y:3},{x:7,y:7}];
const foodSpots = [{x:3,y:7},{x:10,y:8},{x:23,y:12},{x:28,y:9}];
const bottleSpot = {x:10,y:2};
const cleanerSpot = {x:15,y:8};
const hideSpots = [{x:6,y:2},{x:25,y:17},{x:15,y:9},{x:5,y:11},{x:26,y:8}];
const patrolPoints = [{x:28,y:3},{x:28,y:15},{x:21,y:17},{x:12,y:17},{x:3,y:12},{x:5,y:3},{x:16,y:9}];

const walls = new Set();
for (let x = 0; x < COLS; x++) { walls.add(`${x},0`); walls.add(`${x},${ROWS - 1}`); }
for (let y = 0; y < ROWS; y++) { walls.add(`0,${y}`); walls.add(`${COLS - 1},${y}`); }
[
  [4,4,5,2],[4,9,5,2],[4,14,5,2],
  [12,3,2,5],[12,10,2,5],
  [17,4,5,2],[17,9,5,2],[17,14,5,2],
  [25,3,2,5],[25,10,2,5],
  [2,13,2,1],[9,17,7,1],[23,17,4,1],[29,6,2,1]
].forEach(([x,y,w,h]) => {
  for (let ix=x; ix<x+w; ix++) for (let iy=y; iy<y+h; iy++) walls.add(`${ix},${iy}`);
});

let player;
let boss;
let hasFuse;
let powerOn;
let hasKey;
let hidden;
let flashlight;
let paused;
let running;
let won;
let noiseTurns;
let lastBossMove;
let patrolIndex;
let facing;
let phase;
let cleanedSpots;
let themeTimer;
let catches;
let energy;
let eatenFood;
let hasBottle;
let hasCleaner;
let hasStunBottle;
let bossStunnedUntil;
let audioContext;
let ambientGain;
let lastAnnouncement = '';
let blindMode = false;

function resetGame() {
  if(themeTimer){clearInterval(themeTimer);themeTimer=null;}
  player = {...playerStart};
  boss = {...bossStart};
  hasFuse = false;
  powerOn = false;
  hasKey = false;
  hidden = false;
  flashlight = true;
  paused = false;
  running = true;
  won = false;
  noiseTurns = 0;
  lastBossMove = 0;
  patrolIndex = 0;
  facing = 0;
  phase = 'cleaning';
  cleanedSpots = new Set();
  catches = 0;
  energy = 100;
  eatenFood = new Set();
  hasBottle = false;
  hasCleaner = false;
  hasStunBottle = false;
  bossStunnedUntil = 0;
  powerOn = true;
  document.querySelector('#endModal').hidden = true;
  document.querySelector('#pauseCard').hidden = true;
  updateHud();
  draw();
}

function objective() {
  if (phase === 'cleaning') return `Clean the marked spills. ${cleaningSpots.length-cleanedSpots.size} remaining.`;
  if (!hasFuse) return 'Find the stockroom fuse in the southwest corner.';
  if (!powerOn) return 'Install the fuse at the breaker beside you.';
  if (!hasKey) return 'Find the office keycard in the northeast corner.';
  return 'Reach the loading exit in the southeast corner.';
}

function announce(message, speak = true) {
  if (!message || message === lastAnnouncement) return;
  lastAnnouncement = message;
  liveRegion.textContent = '';
  setTimeout(() => { liveRegion.textContent = message; }, 20);
  visualMessage.textContent = message;
  if (speak && narrationToggle.checked && 'speechSynthesis' in window) {
    speechSynthesis.cancel();
    const voice = new SpeechSynthesisUtterance(message);
    voice.rate = blindMode ? 1.05 : 1;
    voice.pitch = 0.9;
    speechSynthesis.speak(voice);
  }
}

function updateHud() {
  objectiveText.textContent = objective().replace(/\.$/, '');
  powerStatus.textContent = `POWER: ${powerOn ? 'ON' : 'OFF'}`;
  powerStatus.style.color = powerOn ? '#c7ff4a' : '#ff414d';
  energyStatus.textContent = `ENERGY: ${Math.round(energy)}`;
  energyStatus.style.color = energy<=20?'#ff414d':energy<=45?'#ffc44a':'#c7ff4a';
  fuseItem.textContent = `FUSE ${hasFuse ? '●' : '○'}`;
  keyItem.textContent = `KEYCARD ${hasKey ? '●' : '○'}`;
  fuseItem.classList.toggle('found', hasFuse);
  keyItem.classList.toggle('found', hasKey);
  craftItem.textContent=`STUN BOTTLE ${hasStunBottle?'●':'○'}`;
  craftItem.classList.toggle('found',hasStunBottle);
  const distance = manhattan(player, boss);
  if(phase==='cleaning'){dangerStatus.textContent='SHIFT: NORMAL';dangerStatus.style.color='#c7ff4a';return;}
  const bossPhase=hasKey?'ENRAGED':powerOn?'HUNTING':'STALKING';
  dangerStatus.textContent = distance <= 3 ? `${bossPhase}: CRITICAL` : distance <= 7 ? `${bossPhase}: NEAR` : `${bossPhase}: DISTANT`;
  dangerStatus.style.color = distance <= 3 ? '#ff414d' : distance <= 7 ? '#ffc44a' : '#c7ff4a';
}

function movePlayer(dx, dy, quiet = false, energyCost = 1) {
  if (!running || paused || hidden) return;
  if(energy<energyCost){announce('You are out of energy. Find food and press E to eat.',true);return;}
  const next = {x:player.x+dx,y:player.y+dy};
  if (walls.has(`${next.x},${next.y}`)) {
    announce('Blocked. A shelf or wall is in that direction.', blindMode);
    tone(120, .06, 0);
    return;
  }
  player = next;
  energy=Math.max(0,energy-energyCost);
  noiseTurns = quiet ? 0 : 2;
  footstepSound(dx);
  describeTile();
  updateHud();
  draw();
  checkCaught();
}

const facingVectors = [{x:0,y:-1},{x:1,y:0},{x:0,y:1},{x:-1,y:0}];
const facingNames = ['north','east','south','west'];
function turnPlayer(amount) {
  if (!running || paused || hidden) return;
  facing = (facing + amount + 4) % 4;
  announce(`Facing ${facingNames[facing]}.`, blindMode);
  tone(260,.035,amount);
  draw();
}
function moveFacing(backward = false, run = false) {
  const vector = facingVectors[facing];
  const dx = vector.x * (backward ? -1 : 1);
  const dy = vector.y * (backward ? -1 : 1);
  movePlayer(dx,dy,false,run?3:1);
  if (run && running && !paused && !hidden) {
    noiseTurns = 5;
    movePlayer(dx,dy,false,3);
  }
}

function describeTile() {
  const nearby = nearestImportant();
  const place = areaName(player);
  if (blindMode || nearby.distance <= 1) {
    announce(`${place}. ${nearby.text}`, true);
  } else {
    announce(place, false);
  }
}

function interact() {
  if (!running || paused) return;
  if (phase === 'cleaning') {
    const spillIndex=cleaningSpots.findIndex((spot,index)=>!cleanedSpots.has(index)&&manhattan(player,spot)<=1);
    if(spillIndex>=0){
      cleanedSpots.add(spillIndex);
      cleaningSound();
      if(cleanedSpots.size===cleaningSpots.length)beginHorror();
      else announce(`Spill cleaned. ${cleaningSpots.length-cleanedSpots.size} left.`,false);
      updateHud();draw();
      return;
    }
  }
  const foodIndex=foodSpots.findIndex((spot,index)=>!eatenFood.has(index)&&manhattan(player,spot)<=1);
  if(foodIndex>=0){
    eatenFood.add(foodIndex);energy=Math.min(100,energy+35);eatSound();
    announce(`Food eaten. Energy restored to ${Math.round(energy)}.`,false);updateHud();draw();return;
  }
  if(!hasBottle&&manhattan(player,bottleSpot)<=1){
    hasBottle=true;pickupSound();announce('Empty bottle collected. Find cleaner to craft a stun bottle.',false);tryCraft();updateHud();draw();return;
  }
  if(!hasCleaner&&manhattan(player,cleanerSpot)<=1){
    hasCleaner=true;pickupSound();announce('Cleaner collected. Find an empty bottle to craft a stun bottle.',false);tryCraft();updateHud();draw();return;
  }
  const hide = hideSpots.find(h => manhattan(player,h) <= 1);
  if (hidden) {
    hidden = false;
    announce('You leave the hiding place. Listen before moving.', true);
    return;
  }
  if (hide) {
    hidden = true;
    flashlight = false;
    announce('Hidden inside a supply cabinet. Mr. Hollow cannot see you. Press E to leave.', true);
    draw();
    return;
  }
  if (!hasFuse && manhattan(player,fuse) <= 1) {
    hasFuse = true;
    announce('Fuse collected. Install it at the breaker here by pressing E again.', true);
  } else if (hasFuse && !powerOn && manhattan(player,fuse) <= 1) {
    powerOn = true;
    tone(440,.12,0); setTimeout(()=>tone(660,.18,0),130);
    announce('Power restored. Mr. Hollow heard the breaker. Find the office keycard northeast.', true);
    boss = {x:7,y:11};
    noiseTurns = 5;
  } else if (powerOn && !hasKey && manhattan(player,keycard) <= 1) {
    hasKey = true;
    startTheme();
    announce('Office keycard collected. Mr. Hollow enters his enraged phase. Reach the loading exit southeast.', true);
  } else if (hasKey && manhattan(player,exit) <= 1) {
    endGame(true);
  } else {
    const near = nearestImportant();
    announce(`Nothing to use here. ${near.text}`, true);
  }
  updateHud();
  draw();
}

function nearestImportant() {
  const targets = [];
  if (phase==='cleaning') cleaningSpots.forEach((spot,index)=>{if(!cleanedSpots.has(index))targets.push({...spot,label:'Spill'});});
  else if (!hasFuse) targets.push({...fuse,label:'Fuse'});
  else if (!powerOn) targets.push({...fuse,label:'Breaker'});
  else if (!hasKey) targets.push({...keycard,label:'Keycard'});
  else targets.push({...exit,label:'Exit'});
  hideSpots.forEach(h => targets.push({...h,label:'Hiding place'}));
  if(energy<55)foodSpots.forEach((spot,index)=>{if(!eatenFood.has(index))targets.push({...spot,label:'Food'});});
  if(!hasBottle)targets.push({...bottleSpot,label:'Empty bottle'});
  if(!hasCleaner)targets.push({...cleanerSpot,label:'Cleaner'});
  targets.sort((a,b)=>manhattan(player,a)-manhattan(player,b));
  const target = targets[0];
  const dx=target.x-player.x,dy=target.y-player.y;
  return {distance:manhattan(player,target),text:`${target.label} is ${directionWords(dx,dy)}, ${manhattan(player,target)} steps away.`};
}

function audioCompass() {
  if (!running) return;
  const uncleaned=cleaningSpots.find((spot,index)=>!cleanedSpots.has(index));
  const goal = phase==='cleaning' ? uncleaned : !hasFuse || !powerOn ? fuse : !hasKey ? keycard : exit;
  const goalName = phase==='cleaning' ? 'Next spill' : !hasFuse ? 'Fuse' : !powerOn ? 'Breaker' : !hasKey ? 'Keycard' : 'Exit';
  const enemyDirection = directionWords(boss.x-player.x,boss.y-player.y);
  const dangerLine=phase==='cleaning'?'Mr. Hollow is in his office.':`Mr. Hollow: ${enemyDirection}, ${manhattan(player,boss)} steps.`;
  announce(`${goalName}: ${directionWords(goal.x-player.x,goal.y-player.y)}, ${manhattan(player,goal)} steps. ${dangerLine}`, true);
  spatialCue(goal.x-player.x, 520);
  if(phase!=='cleaning')setTimeout(()=>spatialCue(boss.x-player.x,110),280);
}

function bossStep(time) {
  const bossDelay=Math.max(550,(hasKey?700:powerOn?1000:1400)-catches*80);
  if (!running || paused || phase==='cleaning' || time-lastBossMove < bossDelay) return;
  lastBossMove = time;
  if(time<bossStunnedUntil){dangerStatus.textContent='BOSS: STUNNED';dangerStatus.style.color='#54cfff';return;}
  const seesPlayer = manhattan(player,boss) <= (flashlight ? (hasKey?9:6) : (hasKey?5:3));
  let target;
  if (seesPlayer || noiseTurns > 0) {
    target = player;
    noiseTurns = Math.max(0,noiseTurns-1);
  } else {
    target = patrolPoints[patrolIndex];
    if (manhattan(boss,target) <= 1) patrolIndex=(patrolIndex+1)%patrolPoints.length;
  }
  const path = findPath(boss,target);
  if (path.length > 1) boss = path[1];
  const distance = manhattan(player,boss);
  if (distance <= 6) {
    spatialCue(boss.x-player.x, distance <= 2 ? 75 : 105);
    if (Math.random() < .18) keyRattle(boss.x-player.x);
    if (blindMode && distance === 3) announce(`Danger. Mr. Hollow is ${directionWords(boss.x-player.x,boss.y-player.y)}, three steps away.`,true);
  }
  updateHud();
  draw();
  checkCaught();
}

function findPath(start,target) {
  const queue=[start], came=new Map([[`${start.x},${start.y}`,null]]);
  while(queue.length) {
    const current=queue.shift();
    if(current.x===target.x&&current.y===target.y) break;
    [[1,0],[-1,0],[0,1],[0,-1]].forEach(([dx,dy])=>{
      const next={x:current.x+dx,y:current.y+dy},key=`${next.x},${next.y}`;
      if(!walls.has(key)&&!came.has(key)){came.set(key,current);queue.push(next);}
    });
  }
  const endKey=`${target.x},${target.y}`;
  if(!came.has(endKey)) return [start];
  const path=[]; let current=target;
  while(current){path.unshift(current);current=came.get(`${current.x},${current.y}`);}
  return path;
}

function checkCaught(){
  if(hidden||player.x!==boss.x||player.y!==boss.y)return;
  catches++;
  if(catches>=3){endGame(false);return;}
  impactSound();
  player={...playerStart};
  boss={...bossStart};
  flashlight=false;
  noiseTurns=0;
  announce(`Mr. Hollow grabbed you, but you broke free. ${3-catches} chance${3-catches===1?'':'s'} left. He is getting faster.`,true);
  updateHud();draw();
}
function endGame(success){
  running=false;won=success;
  if(themeTimer){clearInterval(themeTimer);themeTimer=null;}
  document.querySelector('#endKicker').textContent=success?'SHIFT SURVIVED':'SHIFT ENDED';
  document.querySelector('#endTitle').textContent=success?'YOU ESCAPED.':'CAUGHT.';
  document.querySelector('#endMessage').textContent=success?'The loading door slams behind you. From inside, Mr. Hollow quietly says: “See you tomorrow.”':'Mr. Hollow found you between the aisles. Listen, hide, and try a quieter route.';
  document.querySelector('#endModal').hidden=false;
  announce(success?'You escaped Aisle 13. Shift survived.':'Caught by Mr. Hollow. Shift ended.',true);
}

function draw() {
  ctx.fillStyle=powerOn?'#101817':'#070a0b';ctx.fillRect(0,0,canvas.width,canvas.height);
  for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++){
    const wall=walls.has(`${x},${y}`);
    ctx.fillStyle=wall?(powerOn?'#293231':'#171d1d'):((x+y)%2?'#101515':'#0d1212');
    ctx.fillRect(x*TILE,y*TILE,TILE,TILE);
    if(wall){ctx.strokeStyle='#3c4947';ctx.strokeRect(x*TILE+2,y*TILE+2,TILE-4,TILE-4);}
  }
  hideSpots.forEach(h=>drawMarker(h,'#50645f','H'));
  if(phase==='cleaning')cleaningSpots.forEach((spot,index)=>{if(!cleanedSpots.has(index))drawMarker(spot,'#7fd9e8','CLEAN');});
  foodSpots.forEach((spot,index)=>{if(!eatenFood.has(index))drawMarker(spot,'#c7ff4a','FOOD');});
  if(!hasBottle)drawMarker(bottleSpot,'#9bc8ff','BOT');
  if(!hasCleaner)drawMarker(cleanerSpot,'#d49bff','SOAP');
  if(phase!=='cleaning'&&!hasFuse)drawMarker(fuse,'#ffc44a','F');
  if(powerOn&&!hasKey)drawMarker(keycard,'#54cfff','K');
  drawMarker(exit,hasKey?'#c7ff4a':'#5a665f','EXIT');
  if(!hidden) {
    ctx.beginPath();ctx.fillStyle=flashlight?'#c7ff4a':'#9aa8a3';ctx.arc(player.x*TILE+20,player.y*TILE+20,11,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle='#fff';ctx.lineWidth=2;ctx.stroke();
    const face=facingVectors[facing];
    ctx.beginPath();ctx.moveTo(player.x*TILE+20,player.y*TILE+20);ctx.lineTo(player.x*TILE+20+face.x*18,player.y*TILE+20+face.y*18);ctx.strokeStyle='#07100d';ctx.lineWidth=4;ctx.stroke();
  } else {
    ctx.fillStyle='#c7ff4a';ctx.font='bold 11px IBM Plex Mono';ctx.fillText('HIDDEN',player.x*TILE-4,player.y*TILE+5);
  }
  if(phase!=='cleaning'){
    const bx=boss.x*TILE+20,by=boss.y*TILE+20;
    ctx.fillStyle='#1c2322';ctx.fillRect(bx-12,by-13,24,28);
    ctx.fillStyle='#ff414d';ctx.fillRect(bx-8,by-6,5,3);ctx.fillRect(bx+3,by-6,5,3);
    ctx.fillStyle='#e7ede9';ctx.fillRect(bx-2,by+2,4,13);
  }
  if(!powerOn){ctx.fillStyle='rgba(0,0,0,.62)';ctx.fillRect(0,0,canvas.width,canvas.height);}
  if(flashlight&&!hidden&&!powerOn){
    const gradient=ctx.createRadialGradient(player.x*TILE+20,player.y*TILE+20,10,player.x*TILE+20,player.y*TILE+20,150);
    gradient.addColorStop(0,'rgba(220,255,180,.38)');gradient.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle=gradient;ctx.fillRect(0,0,canvas.width,canvas.height);
  }
}

function drawMarker(point,color,label){
  ctx.fillStyle=color;ctx.fillRect(point.x*TILE+6,point.y*TILE+6,TILE-12,TILE-12);
  ctx.fillStyle='#07100d';ctx.font='bold 9px IBM Plex Mono';ctx.textAlign='center';ctx.fillText(label,point.x*TILE+20,point.y*TILE+24);ctx.textAlign='start';
}
function areaName(p){if(p.y<=3)return p.x>=23?'Manager office hall':'Front checkout';if(p.y>=15)return p.x<=9?'Stockroom':p.x>=23?'Loading bay':'Back aisle';return `Aisle ${Math.max(1,Math.floor(p.x/2))}`;}
function directionWords(dx,dy){const vertical=dy<0?'north':dy>0?'south':'';const horizontal=dx<0?'west':dx>0?'east':'';return vertical&&horizontal?`${vertical}-${horizontal}`:vertical||horizontal||'here';}
function manhattan(a,b){return Math.abs(a.x-b.x)+Math.abs(a.y-b.y);}

function ensureAudio(){
  if(audioContext)return;
  audioContext=new(window.AudioContext||window.webkitAudioContext)();
  ambientGain=audioContext.createGain();
  ambientGain.gain.value=soundToggle.checked?.018:0;
  ambientGain.connect(audioContext.destination);
  [46,58,119].forEach((frequency,index)=>{
    const oscillator=audioContext.createOscillator(),gain=audioContext.createGain();
    oscillator.type=index===2?'sine':'triangle';
    oscillator.frequency.value=frequency;
    gain.gain.value=index===2?.18:.34;
    oscillator.connect(gain).connect(ambientGain);
    oscillator.start();
  });
}
function noiseBurst(duration=.08,volume=.035,pan=0){
  if(!soundToggle.checked)return;ensureAudio();
  const length=Math.max(1,Math.floor(audioContext.sampleRate*duration)),buffer=audioContext.createBuffer(1,length,audioContext.sampleRate),data=buffer.getChannelData(0);
  for(let i=0;i<length;i++)data[i]=(Math.random()*2-1)*(1-i/length);
  const source=audioContext.createBufferSource(),gain=audioContext.createGain(),p=audioContext.createStereoPanner?audioContext.createStereoPanner():audioContext.createGain();
  source.buffer=buffer;gain.gain.value=volume;if('pan'in p)p.pan.value=Math.max(-1,Math.min(1,pan));source.connect(gain).connect(p).connect(audioContext.destination);source.start();
}
function footstepSound(pan=0){noiseBurst(.075,.028,pan);tone(105+Math.random()*24,.055,pan);}
function cleaningSound(){noiseBurst(.38,.045,0);tone(540,.12,-.2);setTimeout(()=>noiseBurst(.28,.035,.2),150);setTimeout(()=>tone(880,.11,0),310);}
function flashlightSound(){noiseBurst(.025,.06,0);tone(flashlight?1250:480,.035,0);setTimeout(()=>tone(flashlight?760:260,.045,0),38);}
function eatSound(){noiseBurst(.16,.045,0);tone(330,.08,0);setTimeout(()=>tone(440,.12,0),120);}
function pickupSound(){tone(720,.06,-.2);setTimeout(()=>tone(980,.09,.2),70);}
function tryCraft(){
  if(!hasBottle||!hasCleaner||hasStunBottle)return;
  hasStunBottle=true;
  tone(520,.08,-.3);setTimeout(()=>tone(760,.08,0),90);setTimeout(()=>tone(1040,.13,.3),180);
  announce('Stun bottle crafted. Press B when Mr. Hollow gets close.',true);
}
function useStunBottle(){
  if(!running||paused)return;
  if(!hasStunBottle){announce('You need an empty bottle and cleaner to craft a stun bottle.',false);return;}
  hasStunBottle=false;noiseBurst(.22,.1,boss.x-player.x);tone(1250,.12,boss.x-player.x);
  if(phase!=='cleaning'&&manhattan(player,boss)<=10){
    bossStunnedUntil=performance.now()+9000;announce('Direct hit. Mr. Hollow is stunned for nine seconds.',true);
  }else announce('The bottle shattered, but Mr. Hollow was too far away.',true);
  updateHud();draw();
}
function impactSound(){noiseBurst(.3,.09,0);tone(58,.45,0);}
function powerFailureSound(){[520,410,300,180].forEach((frequency,index)=>setTimeout(()=>tone(frequency,.22,0),index*110));}
function startStoreMusic(){
  if(themeTimer)clearInterval(themeTimer);
  let note=0;const melody=[392,494,440,330,392,523,494,330];
  themeTimer=setInterval(()=>{if(!running||paused||!soundToggle.checked)return;tone(melody[note%melody.length],.22,note%2?-.25:.25);if(note%4===0)tone(196,.3,0);note++;},620);
}
function startTheme(){
  if(themeTimer)clearInterval(themeTimer);
  let beat=0;
  themeTimer=setInterval(()=>{if(!running||paused||!soundToggle.checked)return;const notes=hasKey?[55,62,58,47]:[65,69,58,62];tone(notes[beat%4],hasKey?.42:.34,beat%2?-.55:.55);tone(notes[beat%4]*1.414,.13,-(beat%2?-.35:.35));if(beat%2===0)noiseBurst(.11,hasKey?.055:.035,0);if(beat%4===3)keyRattle(boss.x-player.x);beat++;},hasKey?430:620);
}
function beginHorror(){
  phase='escape';
  powerOn=false;
  boss={...bossStart};
  noiseTurns=0;
  powerFailureSound();
  setTimeout(()=>tone(55,.7,0),430);
  startTheme();
  announce('The final spill is clean. The lights die. Mr. Hollow locks the doors. Find the stockroom fuse and escape.',true);
}
function tone(frequency,duration,pan=0){if(!soundToggle.checked)return;ensureAudio();const o=audioContext.createOscillator(),g=audioContext.createGain(),p=audioContext.createStereoPanner?audioContext.createStereoPanner():audioContext.createGain();o.frequency.value=frequency;o.type='triangle';g.gain.setValueAtTime(.055,audioContext.currentTime);g.gain.exponentialRampToValueAtTime(.001,audioContext.currentTime+duration);if('pan'in p)p.pan.value=Math.max(-1,Math.min(1,pan));o.connect(g).connect(p).connect(audioContext.destination);o.start();o.stop(audioContext.currentTime+duration);}
function spatialCue(dx,frequency){tone(frequency,.13,Math.max(-1,Math.min(1,dx/5)));}
function keyRattle(dx){[1480,1810,1320].forEach((f,i)=>setTimeout(()=>tone(f,.025,Math.max(-1,Math.min(1,dx/5))),i*42));}

function gameLoop(time){bossStep(time);requestAnimationFrame(gameLoop);}
window.addEventListener('keydown',event=>{
  if(document.querySelector('#startModal').hidden===false||document.querySelector('#accessModal').hidden===false)return;
  if(event.code==='ArrowUp'){event.preventDefault();moveFacing(false,event.shiftKey);}
  else if(event.code==='ArrowDown'){event.preventDefault();moveFacing(true,false);}
  else if(event.code==='ArrowLeft'){event.preventDefault();turnPlayer(-1);}
  else if(event.code==='ArrowRight'){event.preventDefault();turnPlayer(1);}
  else if(event.code==='KeyE'||event.code==='Space'){event.preventDefault();interact();}
  else if(event.code==='KeyC'){event.preventDefault();audioCompass();}
  else if(event.code==='KeyQ'){event.preventDefault();announce(objective(),true);}
  else if(event.code==='KeyF'){event.preventDefault();flashlight=!flashlight;announce(`Flashlight ${flashlight?'on':'off'}.`,true);flashlightSound();draw();}
  else if(event.code==='KeyB'){event.preventDefault();useStunBottle();}
  else if(event.code==='KeyP'){event.preventDefault();paused=!paused;document.querySelector('#pauseCard').hidden=!paused;announce(paused?'Game paused.':'Game resumed.',true);}
},{capture:true});
document.querySelectorAll('[data-move]').forEach(button=>button.addEventListener('click',()=>{
  const action=button.dataset.move;
  if(action==='up')moveFacing(false,false);
  else if(action==='down')moveFacing(true,false);
  else turnPlayer(action==='left'?-1:1);
}));
document.querySelector('#touchInteract').addEventListener('click',interact);
document.querySelector('#compassButton').addEventListener('click',audioCompass);
document.querySelector('#repeatButton').addEventListener('click',()=>announce(objective(),true));
document.querySelector('#contrastToggle').addEventListener('change',event=>document.body.classList.toggle('extra-contrast',event.target.checked));
soundToggle.addEventListener('change',()=>{if(ambientGain)ambientGain.gain.setTargetAtTime(soundToggle.checked?.018:0,audioContext.currentTime,.08);});
document.querySelector('#startButton').addEventListener('click',()=>{
  blindMode=document.querySelector('#blindModeStart').checked;
  document.querySelector('#startModal').hidden=true;
  ensureAudio();resetGame();
  startStoreMusic();
  canvas.focus();
  tone(660,.09,0);setTimeout(()=>tone(880,.14,0),110);
  announce(`Mr. Hollow says: You're hired for the night shift. Start by cleaning the three marked spills.`,true);
});
document.querySelector('#restartButton').addEventListener('click',()=>{resetGame();startStoreMusic();announce(objective(),true);});
document.querySelector('#accessButton').addEventListener('click',()=>{document.querySelector('#accessModal').hidden=false;});
document.querySelector('#closeAccessButton').addEventListener('click',()=>{blindMode=document.querySelector('#blindModeStart').checked;document.querySelector('#accessModal').hidden=true;canvas.focus();});
document.querySelector('#helpButton').addEventListener('click',()=>announce('Left and right arrows turn. Up walks forward. Down walks backward. Shift plus Up runs. E interacts, collects, or eats. B throws a crafted stun bottle. F toggles the flashlight. P pauses.',true));

resetGame();
running = false;
requestAnimationFrame(gameLoop);
