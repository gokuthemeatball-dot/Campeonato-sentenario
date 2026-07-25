const canvas = document.querySelector('#gameCanvas');
const ctx = canvas.getContext('2d');
const liveRegion = document.querySelector('#liveRegion');
const objectiveText = document.querySelector('#objectiveText');
const visualMessage = document.querySelector('#visualMessage');
const dangerStatus = document.querySelector('#dangerStatus');
const powerStatus = document.querySelector('#powerStatus');
const fuseItem = document.querySelector('#fuseItem');
const keyItem = document.querySelector('#keyItem');
const narrationToggle = document.querySelector('#narrationToggle');
const soundToggle = document.querySelector('#soundToggle');

const TILE = 40;
const COLS = 24;
const ROWS = 15;
const playerStart = { x: 2, y: 2 };
const bossStart = { x: 21, y: 12 };
const fuse = { x: 3, y: 12, name: 'stockroom fuse' };
const keycard = { x: 20, y: 2, name: 'office keycard' };
const exit = { x: 22, y: 13, name: 'loading exit' };
const hideSpots = [{x:5,y:2},{x:18,y:12},{x:12,y:7}];
const patrolPoints = [{x:20,y:3},{x:20,y:11},{x:14,y:12},{x:8,y:12},{x:3,y:8},{x:4,y:3}];

const walls = new Set();
for (let x = 0; x < COLS; x++) { walls.add(`${x},0`); walls.add(`${x},${ROWS - 1}`); }
for (let y = 0; y < ROWS; y++) { walls.add(`0,${y}`); walls.add(`${COLS - 1},${y}`); }
[
  [4,4,4,2],[4,8,4,2],[10,3,2,4],[10,9,2,3],
  [14,3,2,4],[14,9,2,3],[18,4,2,5],[2,10,3,1],
  [6,12,7,1],[17,2,1,2],[21,5,2,1]
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
let audioContext;
let lastAnnouncement = '';
let blindMode = false;

function resetGame() {
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
  document.querySelector('#endModal').hidden = true;
  document.querySelector('#pauseCard').hidden = true;
  updateHud();
  draw();
}

function objective() {
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
  fuseItem.textContent = `FUSE ${hasFuse ? '●' : '○'}`;
  keyItem.textContent = `KEYCARD ${hasKey ? '●' : '○'}`;
  fuseItem.classList.toggle('found', hasFuse);
  keyItem.classList.toggle('found', hasKey);
  const distance = manhattan(player, boss);
  dangerStatus.textContent = distance <= 3 ? 'DANGER: CRITICAL' : distance <= 7 ? 'DANGER: NEAR' : 'DANGER: CLEAR';
  dangerStatus.style.color = distance <= 3 ? '#ff414d' : distance <= 7 ? '#ffc44a' : '#c7ff4a';
}

function movePlayer(dx, dy, quiet = false) {
  if (!running || paused || hidden) return;
  const next = {x:player.x+dx,y:player.y+dy};
  if (walls.has(`${next.x},${next.y}`)) {
    announce('Blocked. A shelf or wall is in that direction.', blindMode);
    tone(120, .06, 0);
    return;
  }
  player = next;
  noiseTurns = quiet ? 0 : 2;
  tone(quiet ? 150 : 220, .035, dx);
  describeTile();
  updateHud();
  draw();
  checkCaught();
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
    announce('Office keycard collected. Reach the loading exit southeast.', true);
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
  if (!hasFuse) targets.push({...fuse,label:'Fuse'});
  else if (!powerOn) targets.push({...fuse,label:'Breaker'});
  else if (!hasKey) targets.push({...keycard,label:'Keycard'});
  else targets.push({...exit,label:'Exit'});
  hideSpots.forEach(h => targets.push({...h,label:'Hiding place'}));
  targets.sort((a,b)=>manhattan(player,a)-manhattan(player,b));
  const target = targets[0];
  const dx=target.x-player.x,dy=target.y-player.y;
  return {distance:manhattan(player,target),text:`${target.label} is ${directionWords(dx,dy)}, ${manhattan(player,target)} steps away.`};
}

function audioCompass() {
  if (!running) return;
  const goal = !hasFuse || !powerOn ? fuse : !hasKey ? keycard : exit;
  const goalName = !hasFuse ? 'Fuse' : !powerOn ? 'Breaker' : !hasKey ? 'Keycard' : 'Exit';
  const enemyDirection = directionWords(boss.x-player.x,boss.y-player.y);
  announce(`${goalName}: ${directionWords(goal.x-player.x,goal.y-player.y)}, ${manhattan(player,goal)} steps. Mr. Hollow: ${enemyDirection}, ${manhattan(player,boss)} steps.`, true);
  spatialCue(goal.x-player.x, 520);
  setTimeout(()=>spatialCue(boss.x-player.x,110),280);
}

function bossStep(time) {
  if (!running || paused || time-lastBossMove < (powerOn ? 430 : 620)) return;
  lastBossMove = time;
  const seesPlayer = manhattan(player,boss) <= (flashlight ? 7 : 4);
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

function checkCaught(){if(!hidden&&player.x===boss.x&&player.y===boss.y)endGame(false);}
function endGame(success){
  running=false;won=success;
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
  if(!hasFuse)drawMarker(fuse,'#ffc44a','F');
  if(powerOn&&!hasKey)drawMarker(keycard,'#54cfff','K');
  drawMarker(exit,hasKey?'#c7ff4a':'#5a665f','EXIT');
  if(!hidden) {
    ctx.beginPath();ctx.fillStyle=flashlight?'#c7ff4a':'#9aa8a3';ctx.arc(player.x*TILE+20,player.y*TILE+20,11,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle='#fff';ctx.lineWidth=2;ctx.stroke();
  } else {
    ctx.fillStyle='#c7ff4a';ctx.font='bold 11px IBM Plex Mono';ctx.fillText('HIDDEN',player.x*TILE-4,player.y*TILE+5);
  }
  const bx=boss.x*TILE+20,by=boss.y*TILE+20;
  ctx.fillStyle='#1c2322';ctx.fillRect(bx-12,by-13,24,28);
  ctx.fillStyle='#ff414d';ctx.fillRect(bx-8,by-6,5,3);ctx.fillRect(bx+3,by-6,5,3);
  ctx.fillStyle='#e7ede9';ctx.fillRect(bx-2,by+2,4,13);
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
function areaName(p){if(p.y<=3)return p.x>=16?'Manager office hall':'Front checkout';if(p.y>=10)return p.x<=6?'Stockroom':p.x>=17?'Loading bay':'Back aisle';return `Aisle ${Math.max(1,Math.floor(p.x/2))}`;}
function directionWords(dx,dy){const vertical=dy<0?'north':dy>0?'south':'';const horizontal=dx<0?'west':dx>0?'east':'';return vertical&&horizontal?`${vertical}-${horizontal}`:vertical||horizontal||'here';}
function manhattan(a,b){return Math.abs(a.x-b.x)+Math.abs(a.y-b.y);}

function ensureAudio(){if(!audioContext)audioContext=new(window.AudioContext||window.webkitAudioContext)();}
function tone(frequency,duration,pan=0){if(!soundToggle.checked)return;ensureAudio();const o=audioContext.createOscillator(),g=audioContext.createGain(),p=audioContext.createStereoPanner?audioContext.createStereoPanner():audioContext.createGain();o.frequency.value=frequency;o.type='triangle';g.gain.setValueAtTime(.055,audioContext.currentTime);g.gain.exponentialRampToValueAtTime(.001,audioContext.currentTime+duration);if('pan'in p)p.pan.value=Math.max(-1,Math.min(1,pan));o.connect(g).connect(p).connect(audioContext.destination);o.start();o.stop(audioContext.currentTime+duration);}
function spatialCue(dx,frequency){tone(frequency,.13,Math.max(-1,Math.min(1,dx/5)));}

function gameLoop(time){bossStep(time);requestAnimationFrame(gameLoop);}
document.addEventListener('keydown',event=>{
  if(document.querySelector('#startModal').hidden===false)return;
  const quiet=event.shiftKey;
  const key=event.key.toLowerCase();
  const moves={w:[0,-1],arrowup:[0,-1],s:[0,1],arrowdown:[0,1],a:[-1,0],arrowleft:[-1,0],d:[1,0],arrowright:[1,0]};
  if(moves[key]){event.preventDefault();movePlayer(...moves[key],quiet);}
  else if(key==='e'||key===' '){event.preventDefault();interact();}
  else if(key==='c')audioCompass();
  else if(key==='q')announce(objective(),true);
  else if(key==='f'){flashlight=!flashlight;announce(`Flashlight ${flashlight?'on':'off'}.`,true);draw();}
  else if(key==='p'){paused=!paused;document.querySelector('#pauseCard').hidden=!paused;announce(paused?'Game paused.':'Game resumed.',true);}
});
document.querySelectorAll('[data-move]').forEach(button=>button.addEventListener('click',()=>{
  const map={up:[0,-1],down:[0,1],left:[-1,0],right:[1,0]};movePlayer(...map[button.dataset.move],false);
}));
document.querySelector('#touchInteract').addEventListener('click',interact);
document.querySelector('#compassButton').addEventListener('click',audioCompass);
document.querySelector('#repeatButton').addEventListener('click',()=>announce(objective(),true));
document.querySelector('#contrastToggle').addEventListener('change',event=>document.body.classList.toggle('extra-contrast',event.target.checked));
document.querySelector('#startButton').addEventListener('click',()=>{
  blindMode=document.querySelector('#blindModeStart').checked;
  narrationToggle.checked=true;
  document.querySelector('#startModal').hidden=true;
  ensureAudio();resetGame();
  announce(`Night Shift begins. ${objective()} Press C at any time for the audio compass.`,true);
});
document.querySelector('#restartButton').addEventListener('click',()=>{resetGame();announce(objective(),true);});
document.querySelector('#helpButton').addEventListener('click',()=>announce('Move with W A S D or arrow keys. Press E to interact or hide. C gives directions. Q repeats the objective. Shift moves quietly. F toggles the flashlight. P pauses.',true));

draw();
requestAnimationFrame(gameLoop);
