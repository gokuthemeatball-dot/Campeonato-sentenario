const canvas = document.querySelector('#gameCanvas');
const ctx = canvas.getContext('2d');
const liveRegion = document.querySelector('#liveRegion');
const objectiveText = document.querySelector('#objectiveText');
const visualMessage = document.querySelector('#visualMessage');
const dangerStatus = document.querySelector('#dangerStatus');
const powerStatus = document.querySelector('#powerStatus');
const energyStatus = document.querySelector('#energyStatus');
const chanceItem = document.querySelector('#chanceItem');
const memoryItem = document.querySelector('#memoryItem');
const fuseItem = document.querySelector('#fuseItem');
const keyItem = document.querySelector('#keyItem');
const foodItem = document.querySelector('#foodItem');
const clueItem = document.querySelector('#clueItem');
const craftItem = document.querySelector('#craftItem');
const mapItem = document.querySelector('#mapItem');
const lureItem = document.querySelector('#lureItem');
const cameraItem = document.querySelector('#cameraItem');
const wedgeItem = document.querySelector('#wedgeItem');
const maskItem = document.querySelector('#maskItem');
const narrationToggle = document.querySelector('#narrationToggle');
const soundToggle = document.querySelector('#soundToggle');
const installButton = document.querySelector('#installButton');
const dangerMusic = new Audio('danger-song.mp3?v=51');
dangerMusic.loop = true;
dangerMusic.preload = 'auto';
const deathMusic = new Audio('death-song.mp3?v=51');
deathMusic.loop = true;
deathMusic.preload = 'auto';
const lightsOutMusic = new Audio('lights-out-song.mp3?v=51');
lightsOutMusic.loop = false;
lightsOutMusic.preload = 'auto';
const storeTrack = new Audio('store-song.mp3?v=51');
storeTrack.loop = true;
storeTrack.preload = 'auto';
const explorationTrack = new Audio('exploration-song.mp3?v=51');
explorationTrack.loop = false;
explorationTrack.preload = 'auto';

const TILE = 40;
const COLS = 32;
const ROWS = 20;
const playerStart = { x: 2, y: 2 };
const bossStart = { x: 28, y: 17 };
const fuse = { x: 3, y: 17, name: 'stockroom fuse' };
const keycard = { x: 28, y: 2, name: 'office keycard' };
const exit = { x: 30, y: 18, name: 'loading exit' };
const cleaningSpots = [{x:4,y:3},{x:7,y:3}];
const checkoutSpot = {x:4,y:2};
const foodSpots = [{x:3,y:7},{x:10,y:8},{x:23,y:12},{x:28,y:9}];
const bottleSpot = {x:10,y:2};
const cleanerSpot = {x:15,y:8};
const paperSpot = {x:18,y:8};
const markerSpot = {x:23,y:3};
const canSpot = {x:9,y:12};
const batterySpot = {x:28,y:14};
const cameraSpot = {x:3,y:10};
const flashCellSpot = {x:20,y:2};
const handleSpot = {x:11,y:16};
const tapeSpot = {x:29,y:6};
const ragSpot = {x:18,y:12};
const coffeeSpot = {x:6,y:7};
const clueSpots = [{x:2,y:15},{x:15,y:2},{x:22,y:16},{x:29,y:11}];
const clueTexts = [
  'A timecard dated 1987. Every employee clocked out except one. The missing name is scratched away.',
  'A staff photograph shows Mr. Hollow in the same green vest. The photograph is dated forty years ago.',
  'A damaged training tape says: If the manager learns your route, change it. He remembers repeated footsteps.',
  'The night ledger already contains your name. It lists every shift you will work for the next thirteen years.'
];
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
let crouching;
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
let foodPortions;
let hasPaper;
let hasMarker;
let hasMap;
let hasCan;
let hasBattery;
let hasLure;
let showMapUntil;
let lureTarget;
let lureTurns;
let hasCamera;
let hasFlashCell;
let hasFlashCamera;
let hasHandle;
let hasTape;
let hasDoorJammer;
let jammerSpot;
let hasRag;
let hasCoffee;
let hasScentMask;
let scentMaskUntil;
let flickerUntil;
let lastFearEvent;
let lastJumpScare;
let customersServed;
let dialogueSteps;
let dialogueIndex;
let dialogueOnDone;
let foundClues;
let lastKnownPlayer;
let huntMemory;
let bossSearching;
let lastAmbush;
let dangerMusicActive;
let dangerNearSince;
let dangerFarSince;
let dangerFadeTimer;
let lightsOutMusicActive;
let lightsOutTransitionTimer;
let storeTrackActive;
let storeTrackFadeTimer;
let explorationTrackActive;
let explorationFadeTimer;
let explorationSegmentTimer;
let memoryFragments;
let memorySideTaskActive;
let audioContext;
let ambientGain;
let lastAnnouncement = '';
let blindMode = false;
let deferredInstallPrompt = null;

function resetGame() {
  stopDangerMusic(true);
  stopDeathMusic();
  stopLightsOutMusic();
  stopStoreTrack(true);
  stopExplorationTrack(true);
  if(themeTimer){clearInterval(themeTimer);themeTimer=null;}
  player = {...playerStart};
  boss = {...bossStart};
  hasFuse = false;
  powerOn = false;
  hasKey = false;
  hidden = false;
  crouching = false;
  flashlight = true;
  paused = false;
  running = true;
  won = false;
  noiseTurns = 0;
  lastBossMove = 0;
  patrolIndex = 0;
  facing = 0;
  phase = 'intro';
  if(ambientGain)ambientGain.gain.setTargetAtTime(soundToggle.checked?.018:0,audioContext.currentTime,.25);
  cleanedSpots = new Set();
  catches = 0;
  energy = 100;
  eatenFood = new Set();
  hasBottle = false;
  hasCleaner = false;
  hasStunBottle = false;
  bossStunnedUntil = 0;
  foodPortions = 0;
  hasPaper = false;
  hasMarker = false;
  hasMap = false;
  hasCan = false;
  hasBattery = false;
  hasLure = false;
  showMapUntil = 0;
  lureTarget = null;
  lureTurns = 0;
  hasCamera = false;
  hasFlashCell = false;
  hasFlashCamera = false;
  hasHandle = false;
  hasTape = false;
  hasDoorJammer = false;
  jammerSpot = null;
  hasRag = false;
  hasCoffee = false;
  hasScentMask = false;
  scentMaskUntil = 0;
  flickerUntil = 0;
  lastFearEvent = 0;
  lastJumpScare = -20000;
  customersServed = 0;
  dialogueSteps = [];
  dialogueIndex = 0;
  dialogueOnDone = null;
  foundClues = new Set();
  lastKnownPlayer = {...playerStart};
  huntMemory = 0;
  bossSearching = false;
  lastAmbush = 0;
  dangerMusicActive = false;
  dangerNearSince = 0;
  dangerFarSince = 0;
  lightsOutMusicActive = false;
  storeTrackActive = false;
  explorationTrackActive = false;
  memoryFragments = [];
  memorySideTaskActive = false;
  powerOn = true;
  document.querySelector('#endModal').hidden = true;
  document.querySelector('#storyModal').hidden = true;
  document.querySelector('#pauseCard').hidden = true;
  updateHud();
  draw();
}

function objective() {
  if (phase === 'intro') return 'Listen to Mr. Hollow’s instructions.';
  if (phase === 'customers') return `Serve customers at the front checkout. ${customersServed} of 3 served.`;
  if (phase === 'cleaning') return `Clean the marked spills. ${cleaningSpots.length-cleanedSpots.size} remaining.`;
  const lostMemories=memorySideTaskActive?memoryFragments.filter(fragment=>!fragment.recovered).length:0;
  if(lostMemories>0)return `Recover your lost memories before escaping. ${lostMemories} remaining.`;
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

function openDialogue(steps,onDone){
  dialogueSteps=steps;
  dialogueIndex=0;
  dialogueOnDone=onDone;
  document.querySelector('#storyModal').hidden=false;
  showDialogueStep();
}
function showDialogueStep(){
  const step=dialogueSteps[dialogueIndex];
  document.querySelector('#storySpeaker').textContent=step.speaker;
  document.querySelector('#storyText').textContent=step.text;
  document.querySelector('#storyNextButton').innerHTML=dialogueIndex===dialogueSteps.length-1?'BEGIN TASK <span>→</span>':'CONTINUE <span>→</span>';
  announce(`${step.speaker} says: ${step.text}`,true);
}
function advanceDialogue(){
  dialogueIndex++;
  if(dialogueIndex<dialogueSteps.length){showDialogueStep();return;}
  document.querySelector('#storyModal').hidden=true;
  const onDone=dialogueOnDone;
  dialogueOnDone=null;
  if(onDone)onDone();
  canvas.focus();
}
function startIntro(){
  startStoreMusic();
  openDialogue([
    {speaker:'MR. HOLLOW',text:'You are the new night employee. I am Mr. Hollow. While these doors are open, every customer leaves satisfied.'},
    {speaker:'YOU',text:'Understood. Where do you need me?'},
    {speaker:'MR. HOLLOW',text:'Front checkout. Three customers remain. Scan their items, take payment, and do not ask why they are shopping this late.'}
  ],()=>{stopStoreMusic();phase='customers';playStoreTrack(false);announce('Walk to the front checkout and press E to serve each customer.',true);updateHud();draw();});
}

function updateHud() {
  objectiveText.textContent = objective().replace(/\.$/, '');
  powerStatus.textContent = `POWER: ${powerOn ? 'ON' : 'OFF'}`;
  powerStatus.style.color = powerOn ? '#c7ff4a' : '#ff414d';
  energyStatus.textContent = `ENERGY: ${Math.round(energy)}`;
  energyStatus.style.color = energy<=20?'#ff414d':energy<=45?'#ffc44a':'#c7ff4a';
  chanceItem.textContent=`CHANCES ×${Math.max(0,6-catches)}`;
  chanceItem.style.color=catches>=5?'#ff414d':catches>=3?'#ffc44a':'';
  const restoredMemories=memoryFragments.filter(fragment=>fragment.recovered).length;
  memoryItem.textContent=!memoryFragments.length?'MEMORY STABLE':memorySideTaskActive?`MEMORY REQUIRED ${restoredMemories}/${memoryFragments.length}`:'MEMORY FADING';
  memoryItem.classList.toggle('found',memoryFragments.length>0&&restoredMemories===memoryFragments.length);
  fuseItem.textContent = `FUSE ${hasFuse ? '●' : '○'}`;
  keyItem.textContent = `KEYCARD ${hasKey ? '●' : '○'}`;
  foodItem.textContent=`FOOD ×${foodPortions}`;
  clueItem.textContent=`MYSTERY ${foundClues.size}/4`;
  clueItem.classList.toggle('found',foundClues.size>0);
  fuseItem.classList.toggle('found', hasFuse);
  keyItem.classList.toggle('found', hasKey);
  craftItem.textContent=`STUN BOTTLE ${hasStunBottle?'●':'○'}`;
  craftItem.classList.toggle('found',hasStunBottle);
  mapItem.textContent=`MAP ${hasMap?'●':'○'}`;
  mapItem.classList.toggle('found',hasMap);
  lureItem.textContent=`NOISE LURE ${hasLure?'●':'○'}`;
  lureItem.classList.toggle('found',hasLure);
  cameraItem.textContent=`FLASH CAMERA ${hasFlashCamera?'●':'○'}`;
  cameraItem.classList.toggle('found',hasFlashCamera);
  wedgeItem.textContent=`DOOR JAMMER ${hasDoorJammer?'●':'○'}`;
  wedgeItem.classList.toggle('found',hasDoorJammer);
  maskItem.textContent=`SCENT MASK ${hasScentMask?'●':'○'}`;
  maskItem.classList.toggle('found',hasScentMask);
  const distance = manhattan(player, boss);
  if(phase!=='escape'){dangerStatus.textContent=phase==='customers'?'STORE: OPEN':'SHIFT: NORMAL';dangerStatus.style.color='#c7ff4a';return;}
  const bossPhase=hasKey?'ENRAGED':powerOn?'HUNTING':'STALKING';
  dangerStatus.textContent = distance <= 3 ? `${bossPhase}: CRITICAL` : distance <= 7 ? `${bossPhase}: NEAR` : `${bossPhase}: DISTANT`;
  dangerStatus.style.color = distance <= 3 ? '#ff414d' : distance <= 7 ? '#ffc44a' : '#c7ff4a';
}

function movePlayer(dx, dy, quiet = false, energyCost = 1) {
  if (!running || paused || hidden) return;
  const energyActive=phase==='escape';
  if(energyActive&&energy<energyCost){announce('You are out of energy. Find food and press E to eat.',true);return;}
  const next = {x:player.x+dx,y:player.y+dy};
  if (walls.has(`${next.x},${next.y}`)) {
    announce('Blocked. A shelf or wall is in that direction.', blindMode);
    tone(120, .06, 0);
    return;
  }
  player = next;
  if(energyActive)energy=Math.max(0,energy-energyCost);
  noiseTurns = quiet||crouching ? 0 : 2;
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
  const actuallyRunning=run&&!crouching;
  movePlayer(dx,dy,crouching,actuallyRunning?3:1);
  if (actuallyRunning && running && !paused && !hidden) {
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
  if (phase === 'customers') {
    if(manhattan(player,checkoutSpot)<=1){
      const customerLines=[
        'Customer one buys milk and bread. The register drawer sticks before opening.',
        'Customer two returns a damaged music box. It plays one note by itself.',
        'The final customer pays without speaking, then stares past you toward Mr. Hollow.'
      ];
      announce(customerLines[customersServed],true);
      customersServed++;
      checkoutSound();
      if(customersServed>=3){
        stopStoreTrack(false);
        startStoreMusic();
        openDialogue([
          {speaker:'MR. HOLLOW',text:'That is enough. Lock the register. The customers always leave before dark.'},
          {speaker:'MR. HOLLOW',text:'Two spills remain in aisles three and four. Clean them, then report to me. Do not open the loading door.'}
        ],()=>{stopStoreMusic();phase='cleaning';playStoreTrack(true);announce('Mr. Hollow orders you to clean the two marked spills.',true);updateHud();draw();});
      }
      updateHud();draw();return;
    }
    announce(`The next customer is waiting at checkout, ${directionWords(checkoutSpot.x-player.x,checkoutSpot.y-player.y)}, ${manhattan(player,checkoutSpot)} steps away.`,true);
    return;
  }
  if(phase==='intro')return;
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
    announce(`Find the next marked spill. ${cleaningSpots.length-cleanedSpots.size} remain.`,true);
    return;
  }
  const memoryIndex=phase==='escape'&&memorySideTaskActive?memoryFragments.findIndex(fragment=>!fragment.recovered&&manhattan(player,fragment)<=1):-1;
  if(memoryIndex>=0){
    memoryFragments[memoryIndex].recovered=true;
    energy=Math.min(100,energy+14);
    huntMemory=Math.max(0,huntMemory-3);
    pickupSound();
    const remaining=memoryFragments.filter(fragment=>!fragment.recovered).length;
    if(remaining===0){
      bossStunnedUntil=Math.max(bossStunnedUntil,performance.now()+4000);
      announce('Your memory becomes whole again. Your breathing steadies, your energy rises, and Mr. Hollow loses your trail for four seconds.',true);
    }else{
      announce(`Memory fragment restored. ${remaining} lost fragment${remaining===1?' remains':'s remain'}.`,true);
    }
    updateHud();draw();return;
  }
  const foodIndex=phase==='escape'?foodSpots.findIndex((spot,index)=>!eatenFood.has(index)&&manhattan(player,spot)<=1):-1;
  if(foodIndex>=0){
    eatenFood.add(foodIndex);foodPortions=Math.min(6,foodPortions+1);pickupSound();
    announce(`Food packed. You now carry ${foodPortions} portion${foodPortions===1?'':'s'}. Press R to eat anywhere.`,false);updateHud();draw();return;
  }
  if(phase==='escape'&&!hasBottle&&manhattan(player,bottleSpot)<=1){
    hasBottle=true;pickupSound();announce('Empty bottle collected. Find cleaner to craft a stun bottle.',false);tryCraft();updateHud();draw();return;
  }
  if(phase==='escape'&&!hasCleaner&&manhattan(player,cleanerSpot)<=1){
    hasCleaner=true;pickupSound();announce('Cleaner collected. Find an empty bottle to craft a stun bottle.',false);tryCraft();updateHud();draw();return;
  }
  if(phase==='escape'&&!hasPaper&&manhattan(player,paperSpot)<=1){hasPaper=true;pickupSound();announce('Store plan collected. Find a marker to finish the guidance map.',false);tryCraftMap();updateHud();draw();return;}
  if(phase==='escape'&&!hasMarker&&manhattan(player,markerSpot)<=1){hasMarker=true;pickupSound();announce('Marker collected. Find the store plan to finish the guidance map.',false);tryCraftMap();updateHud();draw();return;}
  if(phase==='escape'&&!hasCan&&manhattan(player,canSpot)<=1){hasCan=true;pickupSound();announce('Empty can collected. Find batteries to build a noise lure.',false);tryCraftLure();updateHud();draw();return;}
  if(phase==='escape'&&!hasBattery&&manhattan(player,batterySpot)<=1){hasBattery=true;pickupSound();announce('Batteries collected. Find an empty can to build a noise lure.',false);tryCraftLure();updateHud();draw();return;}
  if(phase==='escape'&&!hasCamera&&manhattan(player,cameraSpot)<=1){hasCamera=true;pickupSound();announce('Disposable camera collected. Find a flash cell to weaponize it.',false);tryCraftCamera();updateHud();draw();return;}
  if(phase==='escape'&&!hasFlashCell&&manhattan(player,flashCellSpot)<=1){hasFlashCell=true;pickupSound();announce('Flash cell collected. Find the disposable camera.',false);tryCraftCamera();updateHud();draw();return;}
  if(phase==='escape'&&!hasHandle&&manhattan(player,handleSpot)<=1){hasHandle=true;pickupSound();announce('Broken broom handle collected. Find duct tape for a door jammer.',false);tryCraftJammer();updateHud();draw();return;}
  if(phase==='escape'&&!hasTape&&manhattan(player,tapeSpot)<=1){hasTape=true;pickupSound();announce('Duct tape collected. Find a broken handle for a door jammer.',false);tryCraftJammer();updateHud();draw();return;}
  if(phase==='escape'&&!hasRag&&manhattan(player,ragSpot)<=1){hasRag=true;pickupSound();announce('Cleaning rag collected. Find coffee grounds for a scent mask.',false);tryCraftMask();updateHud();draw();return;}
  if(phase==='escape'&&!hasCoffee&&manhattan(player,coffeeSpot)<=1){hasCoffee=true;pickupSound();announce('Coffee grounds collected. Find a cleaning rag for a scent mask.',false);tryCraftMask();updateHud();draw();return;}
  const clueIndex=phase==='escape'?clueSpots.findIndex((spot,index)=>!foundClues.has(index)&&manhattan(player,spot)<=1):-1;
  if(clueIndex>=0){
    foundClues.add(clueIndex);
    tapeGlitchSound();
    announce(`Mystery fragment ${foundClues.size} of 4. ${clueTexts[clueIndex]}`,true);
    updateHud();draw();return;
  }
  const hide = hideSpots.find(h => manhattan(player,h) <= 1);
  if (hidden) {
    hidden = false;
    announce('You leave the hiding place. Listen before moving.', true);
    return;
  }
  if (hide) {
    hidden = true;
    crouching = false;
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
    announce('Office keycard collected. Mr. Hollow enters his enraged phase. Reach the loading exit southeast.', true);
  } else if (hasKey && manhattan(player,exit) <= 1) {
    const lostMemories=memorySideTaskActive?memoryFragments.filter(fragment=>!fragment.recovered).length:0;
    if(lostMemories>0)announce(`You cannot leave without your memories. ${lostMemories} fragment${lostMemories===1?' remains':'s remain'}. Use the audio compass to find them.`,true);
    else endGame(true);
  } else {
    const near = nearestImportant();
    announce(`Nothing to use here. ${near.text}`, true);
  }
  updateHud();
  draw();
}

function nearestImportant() {
  const requiredMemories=phase==='escape'&&memorySideTaskActive?memoryFragments.filter(fragment=>!fragment.recovered):[];
  if(requiredMemories.length){
    requiredMemories.sort((a,b)=>manhattan(player,a)-manhattan(player,b));
    const memory=requiredMemories[0];
    const dx=memory.x-player.x,dy=memory.y-player.y;
    return {distance:manhattan(player,memory),text:`Required lost memory is ${directionWords(dx,dy)}, ${manhattan(player,memory)} steps away.`};
  }
  const targets = [];
  if(phase==='customers')targets.push({...checkoutSpot,label:'Checkout'});
  else if (phase==='cleaning') cleaningSpots.forEach((spot,index)=>{if(!cleanedSpots.has(index))targets.push({...spot,label:'Spill'});});
  else if (!hasFuse) targets.push({...fuse,label:'Fuse'});
  else if (!powerOn) targets.push({...fuse,label:'Breaker'});
  else if (!hasKey) targets.push({...keycard,label:'Keycard'});
  else targets.push({...exit,label:'Exit'});
  if(phase==='escape')hideSpots.forEach(h => targets.push({...h,label:'Hiding place'}));
  if(phase==='escape'&&energy<55)foodSpots.forEach((spot,index)=>{if(!eatenFood.has(index))targets.push({...spot,label:'Food'});});
  if(phase==='escape'&&!hasBottle)targets.push({...bottleSpot,label:'Empty bottle'});
  if(phase==='escape'&&!hasCleaner)targets.push({...cleanerSpot,label:'Cleaner'});
  if(phase==='escape'&&!hasPaper)targets.push({...paperSpot,label:'Store plan'});
  if(phase==='escape'&&!hasMarker)targets.push({...markerSpot,label:'Marker'});
  if(phase==='escape'&&!hasCan)targets.push({...canSpot,label:'Empty can'});
  if(phase==='escape'&&!hasBattery)targets.push({...batterySpot,label:'Batteries'});
  if(phase==='escape'&&!hasCamera)targets.push({...cameraSpot,label:'Camera'});
  if(phase==='escape'&&!hasFlashCell)targets.push({...flashCellSpot,label:'Flash cell'});
  if(phase==='escape'&&!hasHandle)targets.push({...handleSpot,label:'Handle'});
  if(phase==='escape'&&!hasTape)targets.push({...tapeSpot,label:'Duct tape'});
  if(phase==='escape'&&!hasRag)targets.push({...ragSpot,label:'Rag'});
  if(phase==='escape'&&!hasCoffee)targets.push({...coffeeSpot,label:'Coffee'});
  if(phase==='escape')clueSpots.forEach((spot,index)=>{if(!foundClues.has(index))targets.push({...spot,label:'Mystery fragment'});});
  if(phase==='escape'&&memorySideTaskActive)memoryFragments.forEach(fragment=>{if(!fragment.recovered)targets.push({...fragment,label:'Lost memory'});});
  targets.sort((a,b)=>manhattan(player,a)-manhattan(player,b));
  const target = targets[0];
  const dx=target.x-player.x,dy=target.y-player.y;
  return {distance:manhattan(player,target),text:`${target.label} is ${directionWords(dx,dy)}, ${manhattan(player,target)} steps away.`};
}

function audioCompass() {
  if (!running) return;
  const uncleaned=cleaningSpots.find((spot,index)=>!cleanedSpots.has(index));
  const goal = phase==='customers' ? checkoutSpot : phase==='cleaning' ? uncleaned : !hasFuse || !powerOn ? fuse : !hasKey ? keycard : exit;
  const goalName = phase==='customers' ? 'Checkout' : phase==='cleaning' ? 'Next spill' : !hasFuse ? 'Fuse' : !powerOn ? 'Breaker' : !hasKey ? 'Keycard' : 'Exit';
  const enemyDirection = directionWords(boss.x-player.x,boss.y-player.y);
  const dangerLine=phase!=='escape'?'Mr. Hollow is watching from the service desk.':`Mr. Hollow: ${enemyDirection}, ${manhattan(player,boss)} steps.`;
  announce(`${goalName}: ${directionWords(goal.x-player.x,goal.y-player.y)}, ${manhattan(player,goal)} steps. ${dangerLine}`, true);
  spatialCue(goal.x-player.x, 520);
  if(phase==='escape')setTimeout(()=>spatialCue(boss.x-player.x,110),280);
}

function bossStep(time) {
  const bossDelay=Math.max(430,(hasKey?620:powerOn?850:1150)-catches*90-foundClues.size*15);
  if (!running || paused || phase!=='escape' || time-lastBossMove < bossDelay) return;
  lastBossMove = time;
  if(time<bossStunnedUntil){dangerStatus.textContent='BOSS: STUNNED';dangerStatus.style.color='#54cfff';return;}
  const baseSight=flashlight ? (hasKey?9:6) : (hasKey?5:3);
  const scentMasked = time < scentMaskUntil;
  const seesPlayer = !hidden&&manhattan(player,boss) <= Math.max(scentMasked?1:2,baseSight-(crouching?3:0)-(scentMasked?4:0));
  const distanceBeforeMove=manhattan(player,boss);
  if(distanceBeforeMove>7&&Math.random()<.08)return;
  if(time-lastAmbush>14000&&distanceBeforeMove>14&&Math.random()<.14){
    const ambushPoints=patrolPoints.filter(point=>{const distance=manhattan(player,point);return distance>=7&&distance<=12;});
    if(ambushPoints.length){
      boss={...ambushPoints[Math.floor(Math.random()*ambushPoints.length)]};
      lastAmbush=time;
      patrolIndex=Math.floor(Math.random()*patrolPoints.length);
      if(blindMode)announce('The store falls silent. Mr. Hollow’s location is unknown.',true);
    }
  }
  let target;
  if(lureTurns>0&&lureTarget){
    target=lureTarget;lureTurns--;bossSearching=false;
  } else if(hidden&&(bossSearching||Math.random()<(hasKey ? .3 : .18))) {
    target=player;
    bossSearching=true;
  } else if (seesPlayer || noiseTurns > 0) {
    lastKnownPlayer={...player};
    huntMemory=5+Math.floor(Math.random()*5);
    target = lastKnownPlayer;
    bossSearching=false;
    noiseTurns = Math.max(0,noiseTurns-1);
  } else if(huntMemory>0) {
    target=lastKnownPlayer;
    huntMemory--;
    bossSearching=false;
  } else {
    target = patrolPoints[patrolIndex];
    bossSearching=false;
    if (manhattan(boss,target) <= 1) {
      let nextIndex=patrolIndex;
      while(nextIndex===patrolIndex)nextIndex=Math.floor(Math.random()*patrolPoints.length);
      patrolIndex=nextIndex;
    }
  }
  const path = findPath(boss,target);
  const bossBeforeMove = {...boss};
  if (path.length > 1) boss = path[1];
  if(jammerSpot&&manhattan(boss,jammerSpot)===0){
    boss=bossBeforeMove;
    jammerSpot=null;
    bossStunnedUntil=time+7000;
    impactSound();
    announce('Mr. Hollow hits the door jammer. The aisle shakes, but the pursuit stops for seven seconds.',true);
  }
  const distance = manhattan(player,boss);
  bossFootstepSound(distance,boss.x-player.x);
  if (distance <= 6) {
    spatialCue(boss.x-player.x, distance <= 2 ? 75 : 105);
    if(distance<=4)heartbeatSound(distance);
    if (Math.random() < .18) keyRattle(boss.x-player.x);
    if(distance<=3&&time-lastJumpScare>11000&&Math.random()<.16)triggerJumpScare('DON’T MOVE.',false);
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
  if(player.x!==boss.x||player.y!==boss.y)return;
  if(hidden&&!bossSearching)return;
  if(hidden&&bossSearching){
    hidden=false;
    cabinetRipSound();
    announce('The cabinet door is ripped open. Mr. Hollow found your hiding place.',true);
  }
  const memoryDrop={x:player.x,y:player.y,recovered:false};
  catches++;
  triggerJumpScare(catches>=6?'CAUGHT.':'HE FOUND YOU.',true);
  if(catches>=6){endGame(false);return;}
  memoryFragments.push(memoryDrop);
  if(catches>=2)memorySideTaskActive=true;
  impactSound();
  player={...playerStart};
  boss={...bossStart};
  flashlight=false;
  noiseTurns=0;
  huntMemory=0;
  bossSearching=false;
  const chancesLeft=6-catches;
  const memoryMessage=memorySideTaskActive?' Lost pieces of your memory remain where he caught you. You must recover every fragment by finding it and pressing E before you can escape.':' Something from the encounter is already becoming difficult to remember.';
  announce(`Mr. Hollow grabbed you, but you broke free. ${chancesLeft} chance${chancesLeft===1?'':'s'} left. He is getting faster.${memoryMessage}`,true);
  updateHud();draw();
}
function endGame(success){
  running=false;won=success;
  stopDangerMusic(!success);
  stopLightsOutMusic();
  stopStoreTrack(true);
  stopExplorationTrack(true);
  if(themeTimer){clearInterval(themeTimer);themeTimer=null;}
  document.querySelector('#endKicker').textContent=success?'SHIFT SURVIVED':'SHIFT ENDED';
  document.querySelector('#endTitle').textContent=success?'YOU ESCAPED.':'CAUGHT.';
  document.querySelector('#endMessage').textContent=success?'The loading door slams behind you. From inside, Mr. Hollow quietly says: “See you tomorrow.”':'Mr. Hollow found you between the aisles. Listen, hide, and try a quieter route.';
  document.querySelector('#endModal').hidden=false;
  if(!success)playDeathMusic();
  announce(success?'You escaped Aisle 13. Shift survived.':'Caught by Mr. Hollow. Shift ended.',true);
}

function draw() {
  ctx.fillStyle=powerOn?'#101817':'#070a0b';ctx.fillRect(0,0,canvas.width,canvas.height);
  for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++){
    const wall=walls.has(`${x},${y}`);
    ctx.fillStyle=wall?(powerOn?'#293231':'#171d1d'):((x+y)%2?'#101515':'#0d1212');
    ctx.fillRect(x*TILE,y*TILE,TILE,TILE);
    if(!wall){ctx.strokeStyle='rgba(105,120,116,.06)';ctx.strokeRect(x*TILE,y*TILE,TILE,TILE);}
    if(wall){ctx.strokeStyle='#3c4947';ctx.strokeRect(x*TILE+2,y*TILE+2,TILE-4,TILE-4);}
  }
  if(phase==='escape')hideSpots.forEach(h=>drawMarker(h,'#50645f','H'));
  if(phase==='customers')drawMarker(checkoutSpot,'#7fd9e8',`C${customersServed+1}`);
  if(phase==='cleaning')cleaningSpots.forEach((spot,index)=>{if(!cleanedSpots.has(index))drawMarker(spot,'#7fd9e8','CLEAN');});
  if(phase==='escape')foodSpots.forEach((spot,index)=>{if(!eatenFood.has(index))drawMarker(spot,'#c7ff4a','FOOD');});
  if(phase==='escape'&&!hasBottle)drawMarker(bottleSpot,'#9bc8ff','BOT');
  if(phase==='escape'&&!hasCleaner)drawMarker(cleanerSpot,'#d49bff','SOAP');
  if(phase==='escape'&&!hasPaper)drawMarker(paperSpot,'#d6cfac','PLAN');
  if(phase==='escape'&&!hasMarker)drawMarker(markerSpot,'#d9a06d','PEN');
  if(phase==='escape'&&!hasCan)drawMarker(canSpot,'#a8b1ae','CAN');
  if(phase==='escape'&&!hasBattery)drawMarker(batterySpot,'#e3c866','CELL');
  if(phase==='escape'&&!hasCamera)drawMarker(cameraSpot,'#8be7ff','CAM');
  if(phase==='escape'&&!hasFlashCell)drawMarker(flashCellSpot,'#fff38b','FLASH');
  if(phase==='escape'&&!hasHandle)drawMarker(handleSpot,'#b68b67','WOOD');
  if(phase==='escape'&&!hasTape)drawMarker(tapeSpot,'#bdc7c4','TAPE');
  if(phase==='escape'&&!hasRag)drawMarker(ragSpot,'#9aaea8','RAG');
  if(phase==='escape'&&!hasCoffee)drawMarker(coffeeSpot,'#9b6948','COFFEE');
  if(phase==='escape')clueSpots.forEach((spot,index)=>{if(!foundClues.has(index))drawMarker(spot,'#ff6b84','?');});
  if(phase==='escape'&&memorySideTaskActive)memoryFragments.forEach(fragment=>{if(!fragment.recovered)drawMarker(fragment,'#b58cff','MEM');});
  if(phase==='escape'&&!hasFuse)drawMarker(fuse,'#ffc44a','F');
  if(phase==='escape'&&powerOn&&!hasKey)drawMarker(keycard,'#54cfff','K');
  if(phase==='escape')drawMarker(exit,hasKey?'#c7ff4a':'#5a665f','EXIT');
  if(!hidden) {
    ctx.beginPath();ctx.fillStyle=crouching?'#73827e':flashlight?'#c7ff4a':'#9aa8a3';ctx.arc(player.x*TILE+20,player.y*TILE+20,crouching?7:11,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle='#fff';ctx.lineWidth=2;ctx.stroke();
    const face=facingVectors[facing];
    ctx.beginPath();ctx.moveTo(player.x*TILE+20,player.y*TILE+20);ctx.lineTo(player.x*TILE+20+face.x*18,player.y*TILE+20+face.y*18);ctx.strokeStyle='#07100d';ctx.lineWidth=4;ctx.stroke();
    if(crouching){ctx.fillStyle='#b7c2be';ctx.font='8px IBM Plex Mono';ctx.fillText('CROUCHED',player.x*TILE-2,player.y*TILE+34);}
  } else {
    ctx.fillStyle='#c7ff4a';ctx.font='bold 11px IBM Plex Mono';ctx.fillText('HIDDEN',player.x*TILE-4,player.y*TILE+5);
  }
  if(phase==='escape'&&manhattan(player,boss)<=7){
    const bx=boss.x*TILE+20,by=boss.y*TILE+20;
    ctx.shadowColor='#000';ctx.shadowBlur=18;ctx.fillStyle='#111616';ctx.fillRect(bx-15,by-18,30,38);ctx.shadowBlur=0;
    ctx.fillStyle='#ff414d';ctx.fillRect(bx-8,by-6,5,3);ctx.fillRect(bx+3,by-6,5,3);
    ctx.fillStyle='#e7ede9';ctx.fillRect(bx-2,by+2,4,13);
  }
  if(!powerOn){ctx.fillStyle='rgba(0,0,0,.62)';ctx.fillRect(0,0,canvas.width,canvas.height);}
  if(flashlight&&!hidden&&!powerOn){
    const gradient=ctx.createRadialGradient(player.x*TILE+20,player.y*TILE+20,10,player.x*TILE+20,player.y*TILE+20,150);
    gradient.addColorStop(0,'rgba(220,255,180,.38)');gradient.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle=gradient;ctx.fillRect(0,0,canvas.width,canvas.height);
  }
  if(hasMap&&performance.now()<showMapUntil){
    const goal=currentGoal();ctx.strokeStyle='rgba(199,255,74,.68)';ctx.lineWidth=3;ctx.setLineDash([8,8]);ctx.beginPath();ctx.moveTo(player.x*TILE+20,player.y*TILE+20);ctx.lineTo(goal.x*TILE+20,goal.y*TILE+20);ctx.stroke();ctx.setLineDash([]);
  }
  if(jammerSpot)drawMarker(jammerSpot,'#ff9f43','JAM');
  if(performance.now()<flickerUntil){ctx.fillStyle='rgba(0,0,0,.78)';ctx.fillRect(0,0,canvas.width,canvas.height);}
}

function drawMarker(point,color,label){
  const cx=point.x*TILE+20,cy=point.y*TILE+20;
  ctx.fillStyle='rgba(4,8,8,.82)';ctx.beginPath();ctx.arc(cx,cy,13,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle=color;ctx.lineWidth=2;ctx.stroke();
  ctx.fillStyle='#d6dfdb';ctx.font='bold 7px IBM Plex Mono';ctx.textAlign='center';ctx.fillText(label,cx,cy+3);ctx.textAlign='start';
}
function areaName(p){if(p.y<=3)return p.x>=23?'Manager office hall':'Front checkout';if(p.y>=15)return p.x<=9?'Stockroom':p.x>=23?'Loading bay':'Back aisle';return `Aisle ${Math.max(1,Math.floor(p.x/2))}`;}
function directionWords(dx,dy){const vertical=dy<0?'north':dy>0?'south':'';const horizontal=dx<0?'west':dx>0?'east':'';return vertical&&horizontal?`${vertical}-${horizontal}`:vertical||horizontal||'here';}
function manhattan(a,b){return Math.abs(a.x-b.x)+Math.abs(a.y-b.y);}
function currentGoal(){return !hasFuse||!powerOn?fuse:!hasKey?keycard:exit;}

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
function checkoutSound(){tone(880,.055,-.2);setTimeout(()=>tone(1180,.06,.2),70);setTimeout(()=>noiseBurst(.09,.025,0),145);}
function bossFootstepSound(distance,dx){
  if(!soundToggle.checked||distance>14)return;
  const pan=Math.max(-1,Math.min(1,dx/6));
  const closeness=Math.max(0,1-distance/15);
  noiseBurst(.13,.025+closeness*.065,pan);
  tone(48+Math.random()*8,.13+closeness*.07,pan);
  setTimeout(()=>{noiseBurst(.055,.018+closeness*.038,pan);tone(72,.045,pan);},85);
  if(distance<=6)setTimeout(()=>keyRattle(dx),150);
}
function cleaningSound(){noiseBurst(.38,.045,0);tone(540,.12,-.2);setTimeout(()=>noiseBurst(.28,.035,.2),150);setTimeout(()=>tone(880,.11,0),310);}
function flashlightSound(){noiseBurst(.025,.06,0);tone(flashlight?1250:480,.035,0);setTimeout(()=>tone(flashlight?760:260,.045,0),38);}
function eatSound(){noiseBurst(.16,.045,0);tone(330,.08,0);setTimeout(()=>tone(440,.12,0),120);}
function heartbeatSound(distance){tone(54,.08,0);setTimeout(()=>tone(47,.1,0),120+distance*18);}
function pickupSound(){tone(720,.06,-.2);setTimeout(()=>tone(980,.09,.2),70);}
function tapeGlitchSound(){noiseBurst(.28,.06,-.3);setTimeout(()=>tone(930,.07,.3),90);setTimeout(()=>noiseBurst(.18,.045,0),170);}
function cabinetRipSound(){noiseBurst(.55,.13,0);tone(73,.4,0);setTimeout(()=>noiseBurst(.3,.1,0),120);}
function tryCraft(){
  if(!hasBottle||!hasCleaner||hasStunBottle)return;
  hasStunBottle=true;
  tone(520,.08,-.3);setTimeout(()=>tone(760,.08,0),90);setTimeout(()=>tone(1040,.13,.3),180);
  announce('Stun bottle crafted. Press B when Mr. Hollow gets close.',true);
}
function tryCraftMap(){if(!hasPaper||!hasMarker||hasMap)return;hasMap=true;tone(480,.08,-.3);setTimeout(()=>tone(720,.12,.3),100);announce('Guidance map completed. Press M to reveal a route toward your objective.',true);}
function tryCraftLure(){if(!hasCan||!hasBattery||hasLure)return;hasLure=true;tone(260,.07,-.2);setTimeout(()=>tone(520,.12,.2),90);announce('Noise lure assembled. Press N to pull Mr. Hollow away from you.',true);}
function tryCraftCamera(){if(!hasCamera||!hasFlashCell||hasFlashCamera)return;hasFlashCamera=true;tone(700,.06,-.3);setTimeout(()=>tone(1300,.1,.3),80);announce('Flash camera crafted. Press X at close range to blind Mr. Hollow, but the flash reveals your position.',true);}
function tryCraftJammer(){if(!hasHandle||!hasTape||hasDoorJammer)return;hasDoorJammer=true;tone(240,.08,-.3);setTimeout(()=>tone(410,.12,.3),100);announce('Door jammer crafted. Press V to place it. Mr. Hollow will be stopped when he crosses that tile.',true);}
function tryCraftMask(){if(!hasRag||!hasCoffee||hasScentMask)return;hasScentMask=true;tone(360,.09,-.2);setTimeout(()=>noiseBurst(.12,.025,.2),90);announce('Scent mask crafted. Press Z for a short stealth window.',true);}
function eatCarriedFood(){
  if(!running||paused)return;
  if(foodPortions<1){announce('No food remains in your pack.',false);return;}
  if(energy>=95){announce('Your energy is already full.',false);return;}
  foodPortions--;energy=Math.min(100,energy+38);eatSound();announce(`You eat one portion. Energy ${Math.round(energy)}. ${foodPortions} portions remain.`,false);updateHud();
}
function useMap(){
  if(!hasMap){announce('Craft a map by collecting the store plan and marker.',false);return;}
  const goal=currentGoal();showMapUntil=performance.now()+9000;announce(`Map route: ${directionWords(goal.x-player.x,goal.y-player.y)}, ${manhattan(player,goal)} steps.`,true);tone(620,.12,goal.x-player.x);draw();
}
function useLure(){
  if(!hasLure){announce('Craft a noise lure from an empty can and batteries.',false);return;}
  hasLure=false;lureTarget=patrolPoints.reduce((best,point)=>manhattan(player,point)>manhattan(player,best)?point:best,patrolPoints[0]);lureTurns=12;
  [880,660,920,540].forEach((frequency,index)=>setTimeout(()=>tone(frequency,.12,lureTarget.x>player.x?1:-1),index*150));
  announce('Noise lure deployed. Mr. Hollow turns toward the sound.',true);updateHud();
}
function useStunBottle(){
  if(!running||paused)return;
  if(!hasStunBottle){announce('You need an empty bottle and cleaner to craft a stun bottle.',false);return;}
  hasStunBottle=false;noiseBurst(.22,.1,boss.x-player.x);tone(1250,.12,boss.x-player.x);
  if(phase==='escape'&&manhattan(player,boss)<=10){
    bossStunnedUntil=performance.now()+9000;announce('Direct hit. Mr. Hollow is stunned for nine seconds.',true);
  }else announce('The bottle shattered, but Mr. Hollow was too far away.',true);
  updateHud();draw();
}
function useFlashCamera(){
  if(!running||paused)return;
  if(!hasFlashCamera){announce('Craft a flash camera from a disposable camera and flash cell.',false);return;}
  hasFlashCamera=false;
  noiseBurst(.1,.13,0);[1500,1900,2300].forEach((f,i)=>setTimeout(()=>tone(f,.05,0),i*35));
  flickerUntil=performance.now()+320;
  noiseTurns=7;
  if(phase==='escape'&&manhattan(player,boss)<=8){bossStunnedUntil=performance.now()+6000;announce('The flash catches Mr. Hollow. He is blinded for six seconds, but now he knows exactly where you are.',true);}
  else announce('The camera flashes into an empty aisle. The noise gives away your position.',true);
  updateHud();draw();
}
function placeJammer(){
  if(!running||paused)return;
  if(!hasDoorJammer){announce('Craft a door jammer from a broken handle and duct tape.',false);return;}
  hasDoorJammer=false;jammerSpot={...player};tone(180,.1,0);setTimeout(()=>tone(120,.14,0),90);
  announce('Door jammer placed here. Lead Mr. Hollow across this tile to stop him.',true);updateHud();draw();
}
function useScentMask(){
  if(!running||paused)return;
  if(!hasScentMask){announce('Craft a scent mask from a rag and coffee grounds.',false);return;}
  hasScentMask=false;scentMaskUntil=performance.now()+18000;noiseTurns=0;noiseBurst(.18,.025,0);
  announce('Scent mask active for eighteen seconds. Stay crouched and keep your flashlight off for the best concealment.',true);updateHud();
}
function impactSound(){noiseBurst(.3,.09,0);tone(58,.45,0);}
function powerFailureSound(){[520,410,300,180].forEach((frequency,index)=>setTimeout(()=>tone(frequency,.22,0),index*110));}
function fadeDangerMusic(target,duration,onDone){
  if(dangerFadeTimer)clearInterval(dangerFadeTimer);
  const startVolume=dangerMusic.volume;
  const started=performance.now();
  dangerFadeTimer=setInterval(()=>{
    const progress=Math.min(1,(performance.now()-started)/duration);
    dangerMusic.volume=Math.max(0,Math.min(1,startVolume+(target-startVolume)*progress));
    if(progress>=1){
      clearInterval(dangerFadeTimer);
      dangerFadeTimer=null;
      if(onDone)onDone();
    }
  },40);
}
function startDangerMusic(){
  if(dangerMusicActive||!soundToggle.checked)return;
  stopExplorationTrack(false);
  dangerMusicActive=true;
  dangerMusic.currentTime=0;
  dangerMusic.volume=0;
  dangerMusic.play().then(()=>fadeDangerMusic(.78,550)).catch(()=>{dangerMusicActive=false;});
}
function stopDangerMusic(immediate=false){
  dangerNearSince=0;
  dangerFarSince=0;
  if(dangerFadeTimer){clearInterval(dangerFadeTimer);dangerFadeTimer=null;}
  if(immediate){
    dangerMusic.pause();
    dangerMusic.currentTime=0;
    dangerMusic.volume=0;
    dangerMusicActive=false;
    return;
  }
  if(!dangerMusicActive)return;
  fadeDangerMusic(0,650,()=>{
    dangerMusic.pause();
    dangerMusic.currentTime=0;
    dangerMusicActive=false;
    playRandomExplorationSegment();
  });
}
function updateDangerMusic(time,distance){
  if(lightsOutMusicActive)return;
  if(!running||paused||phase!=='escape'||!soundToggle.checked){
    if(dangerMusicActive)stopDangerMusic(false);
    return;
  }
  if(distance<=6){
    const returningDuringFade=dangerFarSince>0&&dangerMusicActive&&dangerMusic.volume<.7;
    dangerFarSince=0;
    if(returningDuringFade)fadeDangerMusic(.78,300);
    if(!dangerNearSince)dangerNearSince=time;
    if(!dangerMusicActive&&time-dangerNearSince>=450)startDangerMusic();
  }else if(distance>=9){
    dangerNearSince=0;
    if(!dangerFarSince)dangerFarSince=time;
    if(dangerMusicActive&&time-dangerFarSince>=1100)stopDangerMusic(false);
  }
}
function primeDangerMusic(){
  dangerMusic.volume=0;
  const primed=dangerMusic.play();
  if(primed)primed.then(()=>{dangerMusic.pause();dangerMusic.currentTime=0;}).catch(()=>{});
}
function playDeathMusic(){
  if(!soundToggle.checked)return;
  deathMusic.currentTime=0;
  deathMusic.volume=.82;
  deathMusic.play().catch(()=>{});
}
function stopDeathMusic(){
  deathMusic.pause();
  deathMusic.currentTime=0;
}
function primeDeathMusic(){
  deathMusic.volume=0;
  const primed=deathMusic.play();
  if(primed)primed.then(()=>{deathMusic.pause();deathMusic.currentTime=0;deathMusic.volume=.82;}).catch(()=>{});
}
function playLightsOutMusic(){
  if(!soundToggle.checked){lightsOutMusicActive=false;return;}
  if(themeTimer){clearInterval(themeTimer);themeTimer=null;}
  lightsOutMusicActive=true;
  lightsOutMusic.currentTime=0;
  lightsOutMusic.volume=.82;
  lightsOutMusic.play().catch(()=>{lightsOutMusicActive=false;});
}
function stopLightsOutMusic(){
  if(lightsOutTransitionTimer){clearTimeout(lightsOutTransitionTimer);lightsOutTransitionTimer=null;}
  lightsOutMusic.pause();
  lightsOutMusic.currentTime=0;
  lightsOutMusicActive=false;
}
function primeLightsOutMusic(){
  lightsOutMusic.volume=0;
  const primed=lightsOutMusic.play();
  if(primed)primed.then(()=>{lightsOutMusic.pause();lightsOutMusic.currentTime=0;lightsOutMusic.volume=.82;}).catch(()=>{});
}
lightsOutMusic.addEventListener('ended',()=>{
  lightsOutMusicActive=false;
  playRandomExplorationSegment();
});
function fadeExplorationTrack(target,duration,onDone){
  if(explorationFadeTimer)clearInterval(explorationFadeTimer);
  const startVolume=explorationTrack.volume;
  const started=performance.now();
  explorationFadeTimer=setInterval(()=>{
    const progress=Math.min(1,(performance.now()-started)/duration);
    explorationTrack.volume=Math.max(0,Math.min(1,startVolume+(target-startVolume)*progress));
    if(progress>=1){
      clearInterval(explorationFadeTimer);
      explorationFadeTimer=null;
      if(onDone)onDone();
    }
  },40);
}
function playRandomExplorationSegment(){
  if(!running||paused||phase!=='escape'||!soundToggle.checked||lightsOutMusicActive||dangerMusicActive||explorationTrackActive)return;
  if(manhattan(player,boss)<=7)return;
  if(explorationSegmentTimer){clearTimeout(explorationSegmentTimer);explorationSegmentTimer=null;}
  if(explorationFadeTimer){clearInterval(explorationFadeTimer);explorationFadeTimer=null;}
  const segmentLength=14+Math.random()*10;
  const duration=explorationTrack.duration;
  explorationTrack.currentTime=Number.isFinite(duration)&&duration>segmentLength+2?Math.random()*(duration-segmentLength-1):0;
  explorationTrack.volume=0;
  explorationTrackActive=true;
  explorationTrack.play().then(()=>{
    fadeExplorationTrack(.6,700);
    explorationSegmentTimer=setTimeout(()=>{
      explorationSegmentTimer=null;
      fadeExplorationTrack(0,700,()=>{
        explorationTrack.pause();
        explorationTrackActive=false;
        playRandomExplorationSegment();
      });
    },segmentLength*1000);
  }).catch(()=>{explorationTrackActive=false;});
}
function stopExplorationTrack(reset=false){
  if(explorationSegmentTimer){clearTimeout(explorationSegmentTimer);explorationSegmentTimer=null;}
  if(explorationFadeTimer){clearInterval(explorationFadeTimer);explorationFadeTimer=null;}
  if(reset){
    explorationTrack.pause();
    explorationTrack.currentTime=0;
    explorationTrack.volume=0;
    explorationTrackActive=false;
    return;
  }
  if(!explorationTrackActive)return;
  fadeExplorationTrack(0,450,()=>{
    explorationTrack.pause();
    explorationTrackActive=false;
  });
}
function primeExplorationTrack(){
  explorationTrack.volume=0;
  const primed=explorationTrack.play();
  if(primed)primed.then(()=>{explorationTrack.pause();explorationTrack.currentTime=0;}).catch(()=>{});
}
explorationTrack.addEventListener('ended',()=>{
  if(explorationSegmentTimer){clearTimeout(explorationSegmentTimer);explorationSegmentTimer=null;}
  explorationTrackActive=false;
  playRandomExplorationSegment();
});
function fadeStoreTrack(target,duration,onDone){
  if(storeTrackFadeTimer)clearInterval(storeTrackFadeTimer);
  const startVolume=storeTrack.volume;
  const started=performance.now();
  storeTrackFadeTimer=setInterval(()=>{
    const progress=Math.min(1,(performance.now()-started)/duration);
    storeTrack.volume=Math.max(0,Math.min(1,startVolume+(target-startVolume)*progress));
    if(progress>=1){
      clearInterval(storeTrackFadeTimer);
      storeTrackFadeTimer=null;
      if(onDone)onDone();
    }
  },40);
}
function playStoreTrack(resume=false){
  if(!soundToggle.checked)return;
  if(storeTrackFadeTimer){clearInterval(storeTrackFadeTimer);storeTrackFadeTimer=null;}
  if(!resume)storeTrack.currentTime=0;
  storeTrackActive=true;
  storeTrack.volume=0;
  storeTrack.play().then(()=>fadeStoreTrack(.62,550)).catch(()=>{storeTrackActive=false;});
}
function stopStoreTrack(reset=false){
  if(storeTrackFadeTimer){clearInterval(storeTrackFadeTimer);storeTrackFadeTimer=null;}
  if(reset){
    storeTrack.pause();
    storeTrack.currentTime=0;
    storeTrack.volume=0;
    storeTrackActive=false;
    return;
  }
  if(!storeTrackActive)return;
  fadeStoreTrack(0,400,()=>{
    storeTrack.pause();
    storeTrackActive=false;
  });
}
function primeStoreTrack(){
  storeTrack.volume=0;
  const primed=storeTrack.play();
  if(primed)primed.then(()=>{storeTrack.pause();storeTrack.currentTime=0;}).catch(()=>{});
}
function startStoreMusic(){
  if(themeTimer)clearInterval(themeTimer);
  let pulse=0;const drones=[98,103,92,87];
  themeTimer=setInterval(()=>{if(!running||paused||!soundToggle.checked||dangerMusicActive)return;tone(drones[pulse%4],.85,pulse%2?-.35:.35);if(pulse%3===0)noiseBurst(.18,.012,0);pulse++;},1100);
}
function stopStoreMusic(){
  if(themeTimer){clearInterval(themeTimer);themeTimer=null;}
}
function startTheme(){
  if(themeTimer)clearInterval(themeTimer);
  let beat=0;
  themeTimer=setInterval(()=>{if(!running||paused||!soundToggle.checked||dangerMusicActive)return;const notes=hasKey?[55,62,58,47]:[65,69,58,62];tone(notes[beat%4],hasKey?.42:.34,beat%2?-.55:.55);tone(notes[beat%4]*1.414,.13,-(beat%2?-.35:.35));if(beat%2===0)noiseBurst(.11,hasKey?.055:.035,0);if(beat%4===3)keyRattle(boss.x-player.x);beat++;},hasKey?430:620);
}
function beginHorror(){
  stopDangerMusic(true);
  phase='escape';
  if(ambientGain)ambientGain.gain.setTargetAtTime(soundToggle.checked?.038:0,audioContext.currentTime,.65);
  powerOn=false;
  foodPortions=3;
  boss={...bossStart};
  noiseTurns=0;
  lastKnownPlayer={...player};
  huntMemory=0;
  bossSearching=false;
  lastAmbush=performance.now();
  lastFearEvent=performance.now();
  lightsOutMusicActive=true;
  fadeStoreTrack(0,750,()=>{
    storeTrack.pause();
    storeTrack.currentTime=0;
    storeTrackActive=false;
  });
  lightsOutTransitionTimer=setTimeout(()=>{
    lightsOutTransitionTimer=null;
    powerFailureSound();
    playLightsOutMusic();
    setTimeout(()=>tone(55,.7,0),430);
  },550);
  announce('The final spill is clean. The lights die. Mr. Hollow locks the doors. You pocket three food portions. Find the stockroom fuse and escape.',true);
}
function tone(frequency,duration,pan=0){if(!soundToggle.checked)return;ensureAudio();const o=audioContext.createOscillator(),g=audioContext.createGain(),p=audioContext.createStereoPanner?audioContext.createStereoPanner():audioContext.createGain();o.frequency.value=frequency;o.type='triangle';g.gain.setValueAtTime(.055,audioContext.currentTime);g.gain.exponentialRampToValueAtTime(.001,audioContext.currentTime+duration);if('pan'in p)p.pan.value=Math.max(-1,Math.min(1,pan));o.connect(g).connect(p).connect(audioContext.destination);o.start();o.stop(audioContext.currentTime+duration);}
function spatialCue(dx,frequency){tone(frequency,.13,Math.max(-1,Math.min(1,dx/5)));}
function keyRattle(dx){[1480,1810,1320].forEach((f,i)=>setTimeout(()=>tone(f,.025,Math.max(-1,Math.min(1,dx/5))),i*42));}
function triggerJumpScare(text='RUN.',force=false){
  const now=performance.now();
  if(!force&&now-lastJumpScare<10000)return;
  lastJumpScare=now;
  const scare=document.querySelector('#jumpScare');
  document.querySelector('#jumpScareText').textContent=text;
  scare.hidden=false;
  document.body.classList.add('danger-flash');
  noiseBurst(.42,.16,boss.x>player.x?1:-1);
  [48,39,61,32].forEach((frequency,index)=>setTimeout(()=>tone(frequency,.28,0),index*65));
  setTimeout(()=>{scare.hidden=true;document.body.classList.remove('danger-flash');},force?760:420);
}

function fearEvent(time){
  if(!running||paused||phase!=='escape'||time-lastFearEvent<8000)return;
  lastFearEvent=time+Math.random()*5000;flickerUntil=time+350+Math.random()*500;
  const eventRoll=Math.random();
  if(eventRoll<.34){
    const fakePan=boss.x>player.x?-1:1;
    [86,72,91].forEach((frequency,index)=>setTimeout(()=>{noiseBurst(.11,.04,fakePan);tone(frequency,.09,fakePan);},index*190));
  }else if(eventRoll<.68){
    keyRattle(boss.x-player.x);
  }else{
    const messages=[
      'Store speaker: Cleanup required in aisle thirteen. No aisle thirteen appears on the map.',
      'Store speaker: The building is now closed. One customer remains.',
      'Store speaker: Employee attendance corrected. No one is permitted to leave.',
      'A child’s voice whispers through the speaker: He changes when the lights go out.'
    ];
    const message=messages[Math.floor(Math.random()*messages.length)];
    noiseBurst(.32,.055,0);setTimeout(()=>announce(message,true),180);
  }
  draw();setTimeout(()=>{if(running)draw();},900);
}
function gameLoop(time){bossStep(time);updateDangerMusic(time,manhattan(player,boss));fearEvent(time);requestAnimationFrame(gameLoop);}
window.addEventListener('keydown',event=>{
  if(document.querySelector('#storyModal').hidden===false){
    if(event.code==='Enter'&&!event.repeat){event.preventDefault();advanceDialogue();}
    return;
  }
  if(document.querySelector('#startModal').hidden===false||document.querySelector('#accessModal').hidden===false)return;
  const code=event.code;
  if(code==='ArrowUp'){event.preventDefault();moveFacing(false,event.shiftKey);}
  else if(code==='ArrowDown'){event.preventDefault();moveFacing(true,false);}
  else if(code==='ArrowLeft'||code==='ArrowRight'){event.preventDefault();turnPlayer(code==='ArrowLeft'?-1:1);}
  else if(code==='KeyE'||code==='Space'){event.preventDefault();interact();}
  else if(code==='KeyC'){event.preventDefault();audioCompass();}
  else if(code==='KeyQ'){event.preventDefault();announce(objective(),true);}
  else if(code==='KeyF'){event.preventDefault();flashlight=!flashlight;announce(`Flashlight ${flashlight?'on':'off'}.`,true);flashlightSound();draw();}
  else if(code==='KeyB'){event.preventDefault();useStunBottle();}
  else if(code==='KeyR'){event.preventDefault();eatCarriedFood();}
  else if(code==='KeyM'){event.preventDefault();useMap();}
  else if(code==='KeyN'){event.preventDefault();useLure();}
  else if(code==='KeyX'){event.preventDefault();useFlashCamera();}
  else if(code==='KeyV'){event.preventDefault();placeJammer();}
  else if(code==='KeyZ'){event.preventDefault();useScentMask();}
  else if(code==='KeyH'){event.preventDefault();if(!event.repeat&&!hidden){crouching=!crouching;announce(crouching?'Crouched. You can move quietly and are harder to see.':'Standing. You move normally again.',true);draw();}}
  else if(code==='KeyP'){event.preventDefault();paused=!paused;document.querySelector('#pauseCard').hidden=!paused;announce(paused?'Game paused.':'Game resumed.',true);}
},{capture:true});
document.querySelectorAll('[data-move]').forEach(button=>button.addEventListener('click',()=>{
  const action=button.dataset.move;
  if(action==='up')moveFacing(false,false);
  else if(action==='down')moveFacing(true,false);
  else turnPlayer(action==='left'?-1:1);
}));
document.querySelectorAll('[data-action]').forEach(button=>button.addEventListener('click',()=>{
  const action=button.dataset.action;
  if(action==='flashlight'){flashlight=!flashlight;announce(`Flashlight ${flashlight?'on':'off'}.`,true);flashlightSound();draw();}
  else if(action==='crouch'&&!hidden){crouching=!crouching;announce(crouching?'Crouched. You move quietly.':'Standing.',true);draw();}
  else if(action==='compass')audioCompass();
  else if(action==='food')eatCarriedFood();
  else if(action==='camera')useFlashCamera();
  else if(action==='jammer')placeJammer();
  else if(action==='mask')useScentMask();
}));
document.querySelector('#touchInteract').addEventListener('click',interact);
document.querySelector('#storyNextButton').addEventListener('click',advanceDialogue);
document.querySelector('#compassButton').addEventListener('click',audioCompass);
document.querySelector('#repeatButton').addEventListener('click',()=>announce(objective(),true));
document.querySelector('#contrastToggle').addEventListener('change',event=>document.body.classList.toggle('extra-contrast',event.target.checked));
soundToggle.addEventListener('change',()=>{
  if(ambientGain)ambientGain.gain.setTargetAtTime(soundToggle.checked?(phase==='escape'?.038:.018):0,audioContext.currentTime,.08);
  if(!soundToggle.checked){stopDangerMusic(true);stopDeathMusic();stopLightsOutMusic();stopStoreTrack(true);stopExplorationTrack(true);}
});
document.querySelector('#startButton').addEventListener('click',()=>{
  blindMode=document.querySelector('#blindModeStart').checked;
  document.querySelector('#startModal').hidden=true;
  ensureAudio();primeDangerMusic();primeDeathMusic();primeLightsOutMusic();primeStoreTrack();primeExplorationTrack();resetGame();
  canvas.focus();
  tone(660,.09,0);setTimeout(()=>tone(880,.14,0),110);
  startIntro();
});
document.querySelector('#restartButton').addEventListener('click',()=>{resetGame();startIntro();});
document.querySelector('#accessButton').addEventListener('click',()=>{document.querySelector('#accessModal').hidden=false;});
document.querySelector('#closeAccessButton').addEventListener('click',()=>{blindMode=document.querySelector('#blindModeStart').checked;document.querySelector('#accessModal').hidden=true;canvas.focus();});
document.querySelector('#helpButton').addEventListener('click',()=>announce('Arrows move and turn. H crouches. E interacts. R eats food. B throws a stun bottle. M uses the map. N deploys a noise lure. X fires the flash camera. V places a door jammer. Z uses the scent mask. F toggles the flashlight. P pauses.',true));
window.addEventListener('beforeinstallprompt',event=>{
  event.preventDefault();
  deferredInstallPrompt=event;
  installButton.hidden=false;
});
installButton.addEventListener('click',async()=>{
  if(!deferredInstallPrompt)return;
  deferredInstallPrompt.prompt();
  const choice=await deferredInstallPrompt.userChoice;
  if(choice.outcome==='accepted')installButton.hidden=true;
  deferredInstallPrompt=null;
});
window.addEventListener('appinstalled',()=>{installButton.hidden=true;deferredInstallPrompt=null;});
if('serviceWorker'in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));

resetGame();
running = false;
requestAnimationFrame(gameLoop);
