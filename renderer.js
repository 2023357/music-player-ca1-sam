// renderer.js
console.log("renderer.js carregado ✅");

// 📁 Estado geral
let currentFolderPath = '';
let musicList = [];
let currentTrackIndex = -1;
let isShuffling = false;
let isMuted = false;
let isLooping = false;
let darkMode = false;
let translations = {};
let currentLang = 'pt';

// 🎧 Elementos DOM
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
const shuffleBtn = document.getElementById('shuffle-btn');
const canvas = document.getElementById('visualizer');
const canvasCtx = canvas.getContext('2d');
const albumArt = document.getElementById('album-art');
const artistContainer = document.getElementById('artist-container');
const menuButton = document.getElementById('menu-button');
const sidebar = document.getElementById('sidebar');
const closeSidebar = document.getElementById('close-sidebar');
const themeToggleSidebar = document.getElementById('theme-toggle-sidebar');

menuButton?.addEventListener('click', () => sidebar?.classList.add('open'));
closeSidebar?.addEventListener('click', () => sidebar?.classList.remove('open'));
themeToggleSidebar?.addEventListener('click', () => {
  darkMode = !darkMode;
  document.body.classList.toggle('dark-mode', darkMode);
});

function toggleMusicList(show) {
  const wrapper = document.getElementById('music-section');
  if (wrapper) wrapper.style.display = show ? 'block' : 'none';
}

function showNowPlayingOnly() {
  toggleMusicList(false);
  const ul = document.getElementById('music-list');
  if (!ul) return;
  ul.innerHTML = '';
  if (musicList[currentTrackIndex]) {
    const track = musicList[currentTrackIndex];
    const li = document.createElement('li');
    li.textContent = `${track.title} - ${track.artist} (${track.duration})`;

    const favBtn = document.createElement('button');
    favBtn.classList.add('fav-btn');
    favBtn.textContent = '⭐';
    favBtn.style.marginLeft = '10px';

    const favs = JSON.parse(localStorage.getItem('favorites') || '[]');
    if (favs.includes(track.file)) favBtn.classList.add('active');

    favBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleFavorite(track.file);
      favBtn.classList.toggle('active');
    });

    li.appendChild(favBtn);
    ul.appendChild(li);
  }
}

const showAllBtn = document.getElementById('show-all');
const showFavoritesBtn = document.getElementById('show-favorites');
const showLibraryBtn = document.getElementById('show-library');

showAllBtn?.addEventListener('click', () => {
  renderMusicList(musicList);
  toggleMusicList(true);
});

showFavoritesBtn?.addEventListener('click', () => {
  const favs = JSON.parse(localStorage.getItem('favorites') || '[]');
  const filtered = musicList.filter(track => favs.includes(track.file));
  renderMusicList(filtered);
  toggleMusicList(true);
});

showLibraryBtn?.addEventListener('click', async () => {
  const autoTracks = await window.electron.getAutoLibrary();
  renderMusicList(autoTracks);
  toggleMusicList(true);
});

// 📁 Selecionar pasta
document.getElementById('select-folder')?.addEventListener('click', async () => {
  const folder = await window.electron.selectFolder();
  if (folder) {
    currentFolderPath = folder;
    await window.electron.startFolderWatch(folder);
    loadMusicFiles(folder);
  }
});

window.electron.onFolderChanged(() => {
  const folderPath = currentFolderPath;
  loadMusicFiles(folderPath);
});

window.addEventListener('DOMContentLoaded', async () => {
  const lastFolder = await window.electron.getLastFolder();
  if (lastFolder) {
    currentFolderPath = lastFolder;
    await window.electron.startFolderWatch(lastFolder);
    await loadMusicFiles(lastFolder);
  }
});

async function loadMusicFiles(folder) {
  const list = await window.electron.getMusicFiles(folder);
  musicList = list;
  currentTrackIndex = 0;
  if (musicList.length > 0) {
    playTrack(0);
    showNowPlayingOnly();
  }
}

function renderMusicList(list) {
  const ul = document.getElementById('music-list');
  if (!ul) return;
  ul.innerHTML = '';
  list.forEach((track, i) => {
    const li = document.createElement('li');
    li.textContent = `${track.title} - ${track.artist} (${track.duration})`;
    li.classList.add('track-item');
    li.addEventListener('click', () => playTrack(i));

    const favBtn = document.createElement('button');
    favBtn.classList.add('fav-btn');
    favBtn.textContent = '⭐';
    favBtn.style.marginLeft = '10px';

    const favs = JSON.parse(localStorage.getItem('favorites') || '[]');
    if (favs.includes(track.file)) favBtn.classList.add('active');

    favBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleFavorite(track.file);
      favBtn.classList.toggle('active');
    });

    li.appendChild(favBtn);
    ul.appendChild(li);
  });
}

function toggleFavorite(filename) {
  let favs = JSON.parse(localStorage.getItem('favorites') || '[]');
  if (favs.includes(filename)) {
    favs = favs.filter(f => f !== filename);
  } else {
    favs.push(filename);
  }
  localStorage.setItem('favorites', JSON.stringify(favs));
}

function playTrack(index) {
  if (musicList.length === 0) {
    alert("Nenhuma música carregada.");
    return;
  }

  // Faz loop circular
  if (index >= musicList.length) {
    index = 0; // volta pro começo
  } else if (index < 0) {
    index = musicList.length - 1; // vai pro final
  }

  const track = musicList[index];
  currentTrackIndex = index;

  if (!track || (!track.file && !track.path)) {
    alert("A faixa selecionada está inválida.");
    return;
  }

  // ... o restante do seu código segue igual aqui

  currentTrackIndex = index;
  const fileUrl = `file://${track.path.replace(/\\/g, '/')}`;
  audio.src = fileUrl;

  audio.oncanplay = () => {
  audio.play()
    .then(() => {
      showNowPlayingOnly(); // garante que só mostra após tocar
    })
    .catch(err => console.error("Erro ao tocar:", err));
};


  audio.onerror = () => {
    console.error("Erro ao carregar:", fileUrl);
    alert("Erro ao carregar a música.");
  };

  const title = `${track.title} - ${track.artist} (${track.duration})`;
  const favBtn = document.getElementById('favorite-current');
if (favBtn) {
  const favs = JSON.parse(localStorage.getItem('favorites') || '[]');
  favBtn.classList.toggle('active', favs.includes(track.file));

  favBtn.onclick = () => {
    toggleFavorite(track.file);
    favBtn.classList.toggle('active');
  };
}


  window.electron.updateMiniTrack(title);
  window.electron.setLastTrack(track);
  updateArtistImage(track.artist);
}

function updateArtistImage(artist) {
  const artistImage = document.getElementById('artist-image');
  artistImage.classList.remove('visible');

  if (!artist || artist === 'Unknown Artist' || artist === 'Erro de leitura') {
    artistImage.src = 'images/default-artist.png';
    artistImage.alt = 'Default Artist';
    return;
  }

  window.electron.getArtistImage(artist).then(url => {
    artistImage.src = url || 'images/default-artist.png';
    artistImage.alt = `Imagem de ${artist}`;
    void artistImage.offsetWidth;
    setTimeout(() => artistImage.classList.add('visible'), 50);
    artistContainer.style.display = 'block';
  });
}
async function loadTranslations(lang) {
  const res = await fetch(`locales/${lang}.json`);
  translations = await res.json();
  currentLang = lang;
}

function translateUI() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (translations[key]) el.innerText = translations[key];
  });
}

// 📁 Pasta atual
function getFolderPath() {
  return currentFolderPath;
}

// 📁 Selecionar pasta
document.getElementById('select-folder').addEventListener('click', async () => {
  const folder = await window.electron.selectFolder();
  if (folder) {
    currentFolderPath = folder;
    await window.electron.startFolderWatch(folder);
    const folderName = folder.split(/[\\/]/).pop();
    document.getElementById('folder-path').innerText = `${translations.current_folder}: ${folderName}`;
    loadMusicFiles(folder);
  }
});

// 📁 Mudança na pasta observada
window.electron.onFolderChanged(() => {
  const folderPath = getFolderPath();
  loadMusicFiles(folderPath);
});

// 🌐 DOM carregado
window.addEventListener('DOMContentLoaded', async () => {
  await loadTranslations('pt');
  translateUI();

  const lastFolder = await window.electron.getLastFolder();
  if (lastFolder) {
    currentFolderPath = lastFolder;
    const folderName = lastFolder.split(/[\\/]/).pop();
    document.getElementById('folder-path').innerText = `${translations.current_folder}: ${folderName}`;
    loadMusicFiles(lastFolder);
  }
  document.getElementById('select-folder').addEventListener('click', async () => {
    const folder = await window.electron.selectFolder();
    if (folder) {
      currentFolderPath = folder;
      await window.electron.startFolderWatch(folder);
      await window.electron.setLastFolder(folder); // <- Adicione isso!
      loadMusicFiles(folder);
    }
  });
  

  // Favoritos
  document.getElementById('show-favorites').addEventListener('click', () => {
    const favs = JSON.parse(localStorage.getItem('favorites') || '[]');
    const filtered = musicList.filter(track => favs.includes(track.file));
    renderMusicList(filtered);
  });

  // Todas as músicas
  document.getElementById('show-all').addEventListener('click', () => {
    renderMusicList(musicList);
  });

  // Biblioteca automática
  document.getElementById('show-library').addEventListener('click', async () => {
    const autoTracks = await window.electron.getAutoLibrary();
    renderMusicList(autoTracks);
  });

  // Atualizar biblioteca
  document.getElementById('refresh-library').addEventListener('click', async () => {
    await window.electron.clearAutoLibraryCache();
    document.getElementById('show-library').click();
  });

  // Troca de idioma
  document.getElementById('lang-selector').addEventListener('change', async (e) => {
    await loadTranslations(e.target.value);
    translateUI();

    const lastFolder = await window.electron.getLastFolder();
    if (lastFolder) {
      currentFolderPath = lastFolder;
      const folderName = lastFolder.split(/[\\/]/).pop();
      document.getElementById('folder-path').innerText = `${translations.current_folder}: ${folderName}`;
      loadMusicFiles(lastFolder);
    }
  });
});

async function loadMusicFiles(folder) {
  const list = await window.electron.getMusicFiles(folder);
  musicList = list;
  currentTrackIndex = 0;

  if (musicList.length > 0) {
    playTrack(0); // já chama o play automaticamente
  }
}


// 🎶 Renderiza lista de músicas
function renderMusicList(list) {
  const ul = document.getElementById('music-list');
  ul.innerHTML = '';

  list.forEach((track, i) => {
    const li = document.createElement('li');
    li.textContent = `${track.title} - ${track.artist} (${track.duration})`;
    li.classList.add('track-item');
    li.addEventListener('click', () => playTrack(i));

    const favBtn = document.createElement('button');
    favBtn.classList.add('fav-btn');
    favBtn.textContent = '⭐';
    favBtn.style.marginLeft = '10px';

    const favs = JSON.parse(localStorage.getItem('favorites') || '[]');
    if (favs.includes(track.file)) favBtn.classList.add('active');

    favBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleFavorite(track.file);
      favBtn.classList.toggle('active');
    });

    li.appendChild(favBtn);
    ul.appendChild(li);
  });
}

// ⭐ Favoritos
function toggleFavorite(filename) {
  let favs = JSON.parse(localStorage.getItem('favorites') || '[]');
  if (favs.includes(filename)) {
    favs = favs.filter(f => f !== filename);
  } else {
    favs.push(filename);
  }
  localStorage.setItem('favorites', JSON.stringify(favs));
}

// ▶️ Reproduzir faixa
function playTrack(index) {
  const track = musicList[index];
  if (!track || (!track.file && !track.path)) {
    alert("A faixa selecionada está inválida.");
    return;
  }

  currentTrackIndex = index;
  const fileUrl = `file://${track.path.replace(/\\/g, '/')}`;
  audio.src = fileUrl;

  audio.oncanplay = () => {
    audio.play().catch(err => console.error("Erro ao tocar:", err));
  };

  audio.onerror = () => {
    console.error("Erro ao carregar:", fileUrl);
    alert("Erro ao carregar a música.");
  };

  const title = `${track.title} - ${track.artist} (${track.duration})`;
  trackTitle.innerText = title;

  window.electron.updateMiniTrack(title);
  window.electron.setLastTrack(track);
  updateArtistImage(track.artist);
}

// 🧠 Imagem de artista
function updateArtistImage(artist) {
  const artistContainer = document.getElementById('artist-container');
  const artistImage = document.getElementById('artist-image');
  artistImage.classList.remove('visible');

  if (!artist || artist === 'Unknown Artist' || artist === 'Erro de leitura') {
    artistImage.src = 'images/default-artist.png';
    artistImage.alt = 'Default Artist';
    return;
  }

  window.electron.getArtistImage(artist).then(url => {
    artistImage.src = url || 'images/default-artist.png';
    artistImage.alt = `Imagem de ${artist}`;
    void artistImage.offsetWidth;
    setTimeout(() => artistImage.classList.add('visible'), 50);
    artistContainer.style.display = 'block';
  });
}

// 🔁 Loop e shuffle
loopBtn.addEventListener('click', () => {
  isLooping = !isLooping;
  audio.loop = isLooping;
  loopBtn.innerText = isLooping ? '🔂' : '🔁';
  loopBtn.classList.toggle('active', isLooping);
});

shuffleBtn.addEventListener('click', () => {
  isShuffling = !isShuffling;
  shuffleBtn.classList.toggle('active', isShuffling);
});

// 🎛️ Controles de reprodução
playPauseBtn.addEventListener('click', togglePlayPause);

prevBtn.addEventListener('click', () => playTrack(currentTrackIndex - 1));
nextBtn.addEventListener('click', () => {
  if (isShuffling) {
    playTrack(Math.floor(Math.random() * musicList.length));
  } else {
    const nextIndex = (currentTrackIndex + 1) % musicList.length;
    playTrack(nextIndex);
  }
});

function togglePlayPause() {
  audio.paused ? audio.play() : audio.pause();
}

audio.addEventListener('play', () => {
  document.getElementById('vinyl-wrapper').classList.add('rotate');
  playPauseBtn.innerText = '⏸️';
});

audio.addEventListener('pause', () => {
  document.getElementById('vinyl-wrapper').classList.remove('rotate');
  playPauseBtn.innerText = '▶️';
});
audio.addEventListener('ended', () => {
  if (isShuffling) {
    const randomIndex = Math.floor(Math.random() * musicList.length);
    playTrack(randomIndex);
  } else {
    const nextIndex = currentTrackIndex + 1;
    const isValidNext = musicList[nextIndex] && musicList[nextIndex].path;

    if (isValidNext) {
      playTrack(nextIndex);
    } else {
      playTrack(0); // reinicia com segurança
    }
  }
});


// 🔊 Volume
volumeControl.addEventListener('input', e => audio.volume = e.target.value / 10);
audio.addEventListener('volumechange', () => volumeControl.value = audio.volume * 10);

function toggleMute() {
  isMuted = !isMuted;
  audio.muted = isMuted;
  muteBtn.innerText = isMuted ? '🔇' : '🔊';
  volumeControl.style.display = isMuted ? 'none' : 'block';
}
muteBtn.addEventListener('click', toggleMute);

// 📈 Visualizador
function setupVisualizer() {
  const audioContext = new (window.AudioContext || window.webkitAudioContext)();
  const analyser = audioContext.createAnalyser();
  const source = audioContext.createMediaElementSource(audio);
  source.connect(analyser);
  analyser.connect(audioContext.destination);
  analyser.fftSize = 256;
  const bufferLength = analyser.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLength);

  function draw() {
    requestAnimationFrame(draw);
    analyser.getByteFrequencyData(dataArray);
    canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
    const barWidth = (canvas.width / dataArray.length) * 2.5;
    let x = 0;
    for (let i = 0; i < dataArray.length; i++) {
      const barHeight = dataArray[i];
      canvasCtx.fillStyle = `rgb(${barHeight + 100},50,150)`;
      canvasCtx.fillRect(x, canvas.height - barHeight / 2, barWidth, barHeight / 2);
      x += barWidth + 1;
    }
  }

  draw();
}
setupVisualizer();

// 🌙 Modo escuro
const themeToggle = document.createElement('button');
themeToggle.textContent = '🌙';
themeToggle.className = 'theme-toggle';
themeToggle.setAttribute('tabindex', '-1');
themeToggle.addEventListener('click', () => {
  darkMode = !darkMode;
  document.body.classList.toggle('dark-mode', darkMode);
  themeToggle.textContent = darkMode ? '☀️' : '🌙';
});
document.body.appendChild(themeToggle);

// ⌨️ Atalhos de teclado
window.addEventListener('keydown', (e) => {
  if (document.activeElement === themeToggle) return;
  switch (e.key) {
    case 'Enter': togglePlayPause(); break;
    case 'ArrowRight': playTrack(currentTrackIndex + 1); break;
    case 'ArrowLeft': playTrack(currentTrackIndex - 1); break;
    case 'ArrowUp': e.preventDefault(); audio.volume = Math.min(audio.volume + 0.1, 1); break;
    case 'ArrowDown': e.preventDefault(); audio.volume = Math.max(audio.volume - 0.1, 0); break;
    case 'm': case 'M': toggleMute(); break;
    case 'r': case 'R': loopBtn.click(); break;
    case 'Escape': audio.pause(); audio.currentTime = 0; break;
  }
});

// 🧠 Suporte a mini player e atalhos externos
window.electron.onTrayControl((action) => {
  switch (action) {
    case 'play-pause': togglePlayPause(); break;
    case 'next-track': playTrack(currentTrackIndex + 1); break;
    case 'previous-track': playTrack(currentTrackIndex - 1); break;
    case 'toggle-shuffle':
      isShuffling = !isShuffling;
      shuffleBtn.classList.toggle('active', isShuffling);
      break;
  }
});

window.electron.onShortcut((action) => {
  switch (action) {
    case 'play-pause': togglePlayPause(); break;
    case 'next-track': playTrack(currentTrackIndex + 1); break;
    case 'previous-track': playTrack(currentTrackIndex - 1); break;
    case 'mute': toggleMute(); break;
    case 'volume-up': audio.volume = Math.min(1, audio.volume + 0.1); break;
    case 'volume-down': audio.volume = Math.max(0, audio.volume - 0.1); break;
  }
});

// ⏱️ Formata duração
function formatTime(secs) {
  const min = Math.floor(secs / 60);
  const sec = Math.floor(secs % 60);
  return `${min}:${sec < 10 ? '0' + sec : sec}`;
}

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
document.getElementById('show-all').addEventListener('click', () => {
  renderMusicList(musicList);
  toggleMusicList(true);
});

document.getElementById('show-favorites').addEventListener('click', () => {
  const favs = JSON.parse(localStorage.getItem('favorites') || '[]');
  const filtered = musicList.filter(track => favs.includes(track.file));
  renderMusicList(filtered);
  toggleMusicList(true);
});

document.getElementById('show-library').addEventListener('click', async () => {
  const autoTracks = await window.electron.getAutoLibrary();
  renderMusicList(autoTracks);
  toggleMusicList(true);
});

audio.addEventListener('play', () => {
  document.getElementById('vinyl-wrapper').classList.add('rotate');
  playPauseBtn.innerText = '⏸️';
  showNowPlayingOnly();
});
