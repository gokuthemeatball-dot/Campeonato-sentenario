const fileInput = document.querySelector('#audioFile');
const dropZone = document.querySelector('#dropZone');
const filePanel = document.querySelector('#filePanel');
const processingPanel = document.querySelector('#processingPanel');
const resultsPanel = document.querySelector('#resultsPanel');
const processButton = document.querySelector('#processButton');
const rightsCheck = document.querySelector('#rightsCheck');
const progressBar = document.querySelector('#progressBar');
const progressText = document.querySelector('#progressText');
const trackList = document.querySelector('#trackList');

let selectedFile = null;
let objectUrls = [];
let activeAudio = null;

document.querySelector('#chooseFile').addEventListener('click', () => fileInput.click());
document.querySelector('#removeFile').addEventListener('click', resetStudio);
document.querySelector('#startOver').addEventListener('click', resetStudio);
rightsCheck.addEventListener('change', () => {
  processButton.disabled = !rightsCheck.checked;
});

['dragenter', 'dragover'].forEach(type => dropZone.addEventListener(type, event => {
  event.preventDefault();
  dropZone.classList.add('is-dragging');
}));
['dragleave', 'drop'].forEach(type => dropZone.addEventListener(type, event => {
  event.preventDefault();
  dropZone.classList.remove('is-dragging');
}));
dropZone.addEventListener('drop', event => selectFile(event.dataTransfer.files[0]));
fileInput.addEventListener('change', () => selectFile(fileInput.files[0]));
processButton.addEventListener('click', processAudio);

function selectFile(file) {
  if (!file) return;
  if (!file.type.startsWith('audio/') && !/\.(mp3|wav|m4a|aac|ogg)$/i.test(file.name)) {
    alert('Please choose an MP3, WAV, M4A, AAC, or OGG audio file.');
    return;
  }
  selectedFile = file;
  document.querySelector('#fileName').textContent = file.name;
  document.querySelector('#fileDetails').textContent = `${formatBytes(file.size)} · Ready to process`;
  dropZone.hidden = true;
  filePanel.hidden = false;
  processingPanel.hidden = true;
  resultsPanel.hidden = true;
}

function resetStudio() {
  if (activeAudio) activeAudio.pause();
  objectUrls.forEach(URL.revokeObjectURL);
  objectUrls = [];
  selectedFile = null;
  activeAudio = null;
  fileInput.value = '';
  rightsCheck.checked = false;
  processButton.disabled = true;
  trackList.innerHTML = '';
  dropZone.hidden = false;
  filePanel.hidden = true;
  processingPanel.hidden = true;
  resultsPanel.hidden = true;
}

async function processAudio() {
  if (!selectedFile || !rightsCheck.checked) return;
  filePanel.hidden = true;
  processingPanel.hidden = false;
  setProgress(8, 'Reading your audio');

  try {
    const bytes = await selectedFile.arrayBuffer();
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    const context = new AudioContextClass();
    setProgress(22, 'Decoding the song');
    const buffer = await context.decodeAudioData(bytes.slice(0));

    if (buffer.duration > 600) throw new Error('Please use a song that is 10 minutes or shorter.');
    setProgress(42, 'Analyzing the stereo mix');
    await nextFrame();

    const left = buffer.getChannelData(0);
    const right = buffer.numberOfChannels > 1 ? buffer.getChannelData(1) : left;
    const sampleRate = buffer.sampleRate;
    const karaokeLeft = new Float32Array(left.length);
    const karaokeRight = new Float32Array(left.length);
    const vocalLeft = new Float32Array(left.length);
    const vocalRight = new Float32Array(left.length);
    const backingLeft = new Float32Array(left.length);
    const backingRight = new Float32Array(left.length);

    // Frequency-aware mid/side separation. Removing the filtered center from
    // each original channel keeps the stereo field instead of collapsing the
    // instrumental to a phase-cancelled mono-like result.
    const centerHighPass = createBiquad('highpass', 165, sampleRate, 0.707);
    const centerLowPass = createBiquad('lowpass', 9000, sampleRate, 0.707);
    const sideHighPass = createBiquad('highpass', 120, sampleRate, 0.707);
    const sideLowPass = createBiquad('lowpass', 12000, sampleRate, 0.707);
    const blockSize = 2048;
    let removalStrength = 0.58;
    let fastEnvelope = 0;
    let slowEnvelope = 0;
    let previousMid = 0;

    for (let blockStart = 0; blockStart < left.length; blockStart += blockSize) {
      const blockEnd = Math.min(left.length, blockStart + blockSize);
      const correlation = stereoCorrelation(left, right, blockStart, blockEnd);
      const targetStrength = buffer.numberOfChannels > 1
        ? clamp(0.43 + Math.max(0, correlation) * 0.22, 0.43, 0.65)
        : 0.5;

      for (let i = blockStart; i < blockEnd; i++) {
        removalStrength += (targetStrength - removalStrength) * 0.0025;
        const mid = (left[i] + right[i]) * 0.5;
        const side = (left[i] - right[i]) * 0.5;
        const centerVocalBand = centerLowPass.process(centerHighPass.process(mid));
        const wideVocalBand = sideLowPass.process(sideHighPass.process(side));
        const absoluteMid = Math.abs(mid);
        fastEnvelope += (absoluteMid - fastEnvelope) * 0.18;
        slowEnvelope += (absoluteMid - slowEnvelope) * 0.003;
        const attack = Math.abs(mid - previousMid);
        previousMid = mid;
        const transientProtection = clamp(
          (fastEnvelope - slowEnvelope) * 7 + attack * 2.2,
          0,
          0.42
        );
        const centerToRemove = centerVocalBand * removalStrength * (1 - transientProtection);

        // Subtract equally from the untouched L/R channels. Any stereo
        // ambience and panned instruments remain in their original positions.
        karaokeLeft[i] = softLimit((left[i] - centerToRemove) * 1.015);
        karaokeRight[i] = softLimit((right[i] - centerToRemove) * 1.015);

        // Keep a small amount of width around the centered lead vocal so the
        // vocal mix sounds natural on headphones instead of dual-mono.
        vocalLeft[i] = softLimit(centerVocalBand + wideVocalBand * 0.12);
        vocalRight[i] = softLimit(centerVocalBand - wideVocalBand * 0.12);

        // Backing vocals are often panned wider than the lead. This focuses
        // that side information while maintaining its true stereo direction.
        backingLeft[i] = softLimit(wideVocalBand * 1.6 + centerVocalBand * 0.07);
        backingRight[i] = softLimit(-wideVocalBand * 1.6 + centerVocalBand * 0.07);
      }
    }

    setProgress(68, 'Building your three mixes');
    await nextFrame();
    const baseName = selectedFile.name.replace(/\.[^.]+$/, '') || 'karaokelab';
    const tracks = [
      makeTrack('Producer-preserve instrumental', 'Instruments and stereo image prioritized', `${baseName}-producer-instrumental.wav`, karaokeLeft, karaokeRight, sampleRate),
      makeTrack('Main vocal focus', 'Centered vocal · natural stereo ambience', `${baseName}-main-vocals.wav`, vocalLeft, vocalRight, sampleRate),
      makeTrack('Backing-vocal focus', 'Experimental wide-vocal stereo mix', `${baseName}-backing-vocals.wav`, backingLeft, backingRight, sampleRate)
    ];
    setProgress(92, 'Preparing downloads');
    renderTracks(tracks);
    await context.close();
    setProgress(100, 'Complete');
    await new Promise(resolve => setTimeout(resolve, 350));
    processingPanel.hidden = true;
    resultsPanel.hidden = false;
  } catch (error) {
    processingPanel.hidden = true;
    filePanel.hidden = false;
    alert(error.message || 'This audio could not be processed. Try another file or format.');
  }
}

function makeTrack(title, description, filename, left, right, sampleRate) {
  const blob = encodeWav(left, right, sampleRate);
  const url = URL.createObjectURL(blob);
  objectUrls.push(url);
  return { title, description, filename, url };
}

function renderTracks(tracks) {
  trackList.innerHTML = tracks.map((track, index) => `
    <article class="track">
      <button class="play" type="button" data-play="${index}" aria-label="Play ${escapeHtml(track.title)}">▶</button>
      <div class="track-info"><strong>${escapeHtml(track.title)}</strong><span>${escapeHtml(track.description)}</span></div>
      <a class="download" href="${track.url}" download="${escapeHtml(track.filename)}">Download WAV</a>
      <audio src="${track.url}" preload="metadata"></audio>
    </article>
  `).join('');

  trackList.querySelectorAll('[data-play]').forEach(button => {
    button.addEventListener('click', () => {
      const audio = button.closest('.track').querySelector('audio');
      if (activeAudio && activeAudio !== audio) {
        activeAudio.pause();
        activeAudio.closest('.track').querySelector('.play').textContent = '▶';
      }
      if (audio.paused) {
        audio.play();
        button.textContent = 'Ⅱ';
        activeAudio = audio;
      } else {
        audio.pause();
        button.textContent = '▶';
      }
      audio.onended = () => { button.textContent = '▶'; };
    });
  });
}

function encodeWav(left, right, sampleRate) {
  const frames = Math.min(left.length, right.length);
  const output = new ArrayBuffer(44 + frames * 4);
  const view = new DataView(output);
  writeText(view, 0, 'RIFF');
  view.setUint32(4, 36 + frames * 4, true);
  writeText(view, 8, 'WAVE');
  writeText(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 2, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 4, true);
  view.setUint16(32, 4, true);
  view.setUint16(34, 16, true);
  writeText(view, 36, 'data');
  view.setUint32(40, frames * 4, true);
  let offset = 44;
  for (let i = 0; i < frames; i++) {
    view.setInt16(offset, floatToPcm(left[i]), true);
    view.setInt16(offset + 2, floatToPcm(right[i]), true);
    offset += 4;
  }
  return new Blob([view], { type: 'audio/wav' });
}

function writeText(view, offset, text) {
  for (let i = 0; i < text.length; i++) view.setUint8(offset + i, text.charCodeAt(i));
}
function floatToPcm(value) {
  const clipped = Math.max(-1, Math.min(1, value));
  return clipped < 0 ? clipped * 0x8000 : clipped * 0x7fff;
}
function softLimit(value) {
  return Math.tanh(value * 1.08);
}
function clamp(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, value));
}
function stereoCorrelation(left, right, start, end) {
  let cross = 0;
  let leftEnergy = 0;
  let rightEnergy = 0;
  for (let i = start; i < end; i++) {
    cross += left[i] * right[i];
    leftEnergy += left[i] * left[i];
    rightEnergy += right[i] * right[i];
  }
  const denominator = Math.sqrt(leftEnergy * rightEnergy);
  return denominator > 1e-10 ? clamp(cross / denominator, -1, 1) : 0;
}
function createBiquad(type, frequency, sampleRate, q) {
  const omega = 2 * Math.PI * Math.min(frequency, sampleRate * 0.45) / sampleRate;
  const cosine = Math.cos(omega);
  const sine = Math.sin(omega);
  const alpha = sine / (2 * q);
  const a0 = 1 + alpha;
  let b0;
  let b1;
  let b2;
  if (type === 'highpass') {
    b0 = (1 + cosine) / 2;
    b1 = -(1 + cosine);
    b2 = (1 + cosine) / 2;
  } else {
    b0 = (1 - cosine) / 2;
    b1 = 1 - cosine;
    b2 = (1 - cosine) / 2;
  }
  const a1 = -2 * cosine;
  const a2 = 1 - alpha;
  let x1 = 0;
  let x2 = 0;
  let y1 = 0;
  let y2 = 0;
  return {
    process(input) {
      const output = (b0 / a0) * input + (b1 / a0) * x1 + (b2 / a0) * x2
        - (a1 / a0) * y1 - (a2 / a0) * y2;
      x2 = x1;
      x1 = input;
      y2 = y1;
      y1 = output;
      return output;
    }
  };
}
function setProgress(percent, text) {
  progressBar.style.width = `${percent}%`;
  progressText.textContent = text;
}
function nextFrame() {
  return new Promise(resolve => requestAnimationFrame(() => setTimeout(resolve, 20)));
}
function formatBytes(bytes) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[char]));
}
