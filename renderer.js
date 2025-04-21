console.log("renderer.js carregado ✅");

const audio = document.getElementById('audio-player');
const playPauseBtn = document.getElementById('play-pause-btn');
const nextBtn = document.getElementById('next-btn');
const prevBtn = document.getElementById('prev-btn');
const muteBtn = document.getElementById('mute-btn');
const volumeControl = document.getElementById('volume-control');
const loopBtn = document.getElementById('loop-btn');
const trackTitle = document.getElementById('track-title');
const progressBar = document.getElementById('progress-bar');
const currentTimeElem = document.getElementById('current-time');
const totalTimeElem = document.getElementById('total-time');

let musicList = [];
let currentTrackIndex = -1;
let isMuted = false;
let isLooping = false;

function getFolderPath() {
  return document.getElementById('folder-path').innerText.replace(/^.*Folder: /, '');
}

// Selecionar pasta
document.getElementById('select-folder').addEventListener('click', async () => {
  const folder = await window.electron.selectFolder();
  if (folder) {
    document.getElementById('folder-path').innerText = `Folder: ${folder}`;
    loadMusicFiles(folder);
  }
});

// Carregar última pasta usada
window.addEventListener('DOMContentLoaded', async () => {
  const lastFolder = await window.electron.getLastFolder();
  if (lastFolder) {
    document.getElementById('folder-path').innerText = `Folder: ${lastFolder}`;
    loadMusicFiles(lastFolder);
  }
});

// Atalhos do sistema
window.electron.onShortcut((action) => {
  switch (action) {
    case 'play-pause':
      togglePlayPause();
      break;
    case 'next-track':
      playTrack(currentTrackIndex + 1);
      break;
    case 'previous-track':
      playTrack(currentTrackIndex - 1);
      break;
    case 'mute':
      toggleMute();
      break;
    case 'volume-up':
      audio.volume = Math.min(1, audio.volume + 0.1);
      volumeControl.value = audio.volume * 10;
      break;
    case 'volume-down':
      audio.volume = Math.max(0, audio.volume - 0.1);
      volumeControl.value = audio.volume * 10;
      break;
  }
});

// Carregar músicas
async function loadMusicFiles(folder) {
    const list = await window.electron.getMusicFiles(folder);
    musicList = list;
    currentTrackIndex = 0;
  
    const ul = document.getElementById('music-list');
    ul.innerHTML = '';
  
    list.forEach((track, i) => {
      const li = document.createElement('li');
      li.textContent = `${track.title} - ${track.artist} (${track.duration})`;
      li.classList.add('track-item');
      li.addEventListener('click', () => playTrack(i));
      ul.appendChild(li);
    });
  
    // Auto-play the first track after loading
    if (musicList.length > 0) {
      playTrack(0);
    }
  }
  
// Tocar faixa
function playTrack(index) {
  if (index < 0 || index >= musicList.length) return;

  currentTrackIndex = index;
  const track = musicList[index];
  const folderPath = getFolderPath();
  const fullPath = `${folderPath}\\${track.file}`;
  const fileUrl = `file://${fullPath.replace(/\\/g, '/')}`;

  audio.src = fileUrl;
  audio.play();

  trackTitle.innerText = `${track.title} - ${track.artist} (${track.duration})`;
}

// Formatar tempo (MM:SS)
function formatTime(secs) {
  const min = Math.floor(secs / 60);
  const sec = Math.floor(secs % 60);
  return `${min}:${sec < 10 ? '0' + sec : sec}`;
}

// Botão Play/Pause
function togglePlayPause() {
  audio.paused ? audio.play() : audio.pause();
}

playPauseBtn.addEventListener('click', togglePlayPause);

audio.addEventListener('play', () => {
  playPauseBtn.innerText = '⏸️';
});

audio.addEventListener('pause', () => {
  playPauseBtn.innerText = '▶️';
});

// Próximo/Anterior
nextBtn.addEventListener('click', () => playTrack(currentTrackIndex + 1));
prevBtn.addEventListener('click', () => playTrack(currentTrackIndex - 1));

// Progresso
audio.addEventListener('timeupdate', () => {
  if (audio.duration) {
    const progress = (audio.currentTime / audio.duration) * 100;
    progressBar.value = progress;
    currentTimeElem.innerText = formatTime(audio.currentTime);
  }
});

audio.addEventListener('loadedmetadata', () => {
  totalTimeElem.innerText = formatTime(audio.duration);
});

progressBar.addEventListener('input', (e) => {
  const newTime = (e.target.value / 100) * audio.duration;
  audio.currentTime = newTime;
});

// Volume
volumeControl.addEventListener('input', (e) => {
  audio.volume = e.target.value / 10;
});

audio.addEventListener('volumechange', () => {
  volumeControl.value = audio.volume * 10;
});

// Mute
function toggleMute() {
  isMuted = !isMuted;
  audio.muted = isMuted;
  muteBtn.innerText = isMuted ? '🔇' : '🔊';
  volumeControl.style.display = isMuted ? 'none' : 'block';
}

muteBtn.addEventListener('click', toggleMute);

// Loop
loopBtn.addEventListener('click', () => {
  isLooping = !isLooping;
  audio.loop = isLooping;
  loopBtn.innerText = isLooping ? '🔂' : '🔁';
  loopBtn.classList.toggle('active', isLooping);
});

// Tema (dark mode)
const themeToggle = document.createElement('button');
themeToggle.textContent = '🌙';
themeToggle.className = 'theme-toggle';
document.body.appendChild(themeToggle);

let darkMode = false;
themeToggle.addEventListener('click', () => {
  darkMode = !darkMode;
  document.body.classList.toggle('dark-mode', darkMode);
  themeToggle.textContent = darkMode ? '☀️' : '🌙';
});

// Atalhos de teclado
window.addEventListener('keydown', (e) => {
  switch (e.key) {
    case 'Enter':
      togglePlayPause();
      break;
    case 'ArrowRight':
      playTrack(currentTrackIndex + 1);
      break;
    case 'ArrowLeft':
      playTrack(currentTrackIndex - 1);
      break;
    case 'ArrowUp':
      e.preventDefault();
      audio.volume = Math.min(audio.volume + 0.1, 1);
      break;
    case 'ArrowDown':
      e.preventDefault();
      audio.volume = Math.max(audio.volume - 0.1, 0);
      break;
    case 'm':
    case 'M':
      toggleMute();
      break;
    case 'r':
    case 'R':
      loopBtn.click();
      break;
    case 'Escape':
      audio.pause();
      audio.currentTime = 0;
      break;
  }
});
audio.addEventListener('ended', () => {
    // Se estiver na última música e não em loop, volta para a primeira
    if (currentTrackIndex < musicList.length - 1) {
      playTrack(currentTrackIndex + 1);
    } else if (!isLooping) {
      playTrack(0); // reinicia do começo
    }
  });
  