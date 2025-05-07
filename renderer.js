// renderer.js
console.log("renderer.js lodaded ✅");


// General state
let manualViewActive = false; // 

let currentFolderPath = '';
let musicList = [];
let currentTrackIndex = -1;
let isShuffling = false;
let isMuted = false;
let isLooping = false;
let darkMode = false;
let translations = {};
let currentLang = 'pt';
let easterEggInterval = null;

// 🎧 Elements DOM
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
const showAllBtn = document.getElementById('show-all');
const showFavoritesBtn = document.getElementById('show-favorites');
const showLibraryBtn = document.getElementById('show-library');

// handles opening, closing and themre toggling for the sidebar
menuButton?.addEventListener('click', () => sidebar?.classList.add('open'));
closeSidebar?.addEventListener('click', () => sidebar?.classList.remove('open'));
themeToggleSidebar?.addEventListener('click', () => {
  darkMode = !darkMode;
  document.body.classList.toggle('dark-mode');
  updateThemeIcon();
});
// this hows or hides the music list view
function toggleMusicList(show) {
  const wrapper = document.getElementById('music-section');
  if (wrapper) {
    wrapper.style.display = show ? 'block' : 'none';
    wrapper.classList.toggle('show', show);
  }

  // CLose the sidebar when the list opens
  if (show && sidebar?.classList.contains('open')) {
    sidebar.classList.remove('open');
  }
}



function showNowPlayingOnly() {
  toggleMusicList(false); // hide the list
}




// keep an eye for changes in the folder
window.electron.onFolderChanged(() => {
  const folderPath = currentFolderPath;
  loadMusicFiles(folderPath);
});


// load the last folder on Startup
window.addEventListener('DOMContentLoaded', async () => {
  const lastFolder = await window.electron.getLastFolder();
  if (lastFolder) {
    currentFolderPath = lastFolder;
    await window.electron.startFolderWatch(lastFolder);
    await loadMusicFiles(lastFolder);
  }
});
// load the music files
async function loadMusicFiles(folder) {
  const list = await window.electron.getMusicFiles(folder);
  musicList = list;
  currentTrackIndex = 0;
  if (musicList.length > 0) {
    playTrack(0);
    showNowPlayingOnly();
  }
}
//BUild music cards with the tillte, the artists, album cover and the favorite button
function renderMusicList(list) {
  const grid = document.getElementById('music-grid');
  if (!grid) return;

  grid.innerHTML = '';

  list.forEach((track, i) => {
    const card = document.createElement('div');
    card.classList.add('music-card');
    card.addEventListener('click', () => playTrack(i));

    const coverWrapper = document.createElement('div');
    coverWrapper.classList.add('music-cover');

    const img = document.createElement('img');
    window.electron.getArtistImage(track.artist).then(url => {
      img.src = url || 'images/default-artist.png';
    });
    img.alt = track.artist || 'Unknown Artist';

    coverWrapper.appendChild(img);

    const info = document.createElement('div');
    info.classList.add('music-info');
    info.innerHTML = `
      <div class="music-title">${track.title || 'unknown title'}</div>
      <div class="music-artist">${track.artist || 'unknown artist'}</div>
    `;

    const favBtn = document.createElement('button');
    favBtn.classList.add('fav-btn');
    favBtn.innerHTML = `<i data-lucide="heart"></i>`;
    favBtn.setAttribute('data-file', track.file);

    // Set as favorite if its already like that
    const favs = JSON.parse(localStorage.getItem('favorites') || '[]');
    if (favs.includes(track.file)) {
      favBtn.classList.add('active');
    }

    favBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const filename = favBtn.getAttribute('data-file');
      toggleFavorite(filename);
    });

    card.appendChild(favBtn);
    card.appendChild(coverWrapper);
    card.appendChild(info);
    grid.appendChild(card);
  });

  lucide.createIcons(); // Icon updating
}


// Mark or unmark song as favorite and changes the icon
function toggleFavorite(filename) {
  let favs = JSON.parse(localStorage.getItem('favorites') || '[]');

  if (favs.includes(filename)) {
    favs = favs.filter(f => f !== filename);
  } else {
    favs.push(filename);
  }

  localStorage.setItem('favorites', JSON.stringify(favs));

  const isFavorite = favs.includes(filename);

  //Update the botton list 
  document.querySelectorAll(`.fav-btn[data-file="${filename}"]`).forEach(btn => {
    btn.classList.toggle('active', isFavorite);
    btn.innerHTML = `<i data-lucide="${isFavorite ? 'heart' : 'heart-off'}"></i>`;
  });

  // update the button list while playing 
  const favCurrent = document.getElementById('favorite-current');
  if (favCurrent && favCurrent.getAttribute('data-file') === filename) {
    favCurrent.classList.toggle('active', isFavorite);
    favCurrent.innerHTML = `<i data-lucide="${isFavorite ? 'heart' : 'heart-off'}"></i>`;
  }

  lucide.createIcons(); // Re-renderer all the icons 
}

// play the track, handles favorite button, spotfy image, error fallback and miniplayer update
function playTrack(index) {
  if (musicList.length === 0) {
    alert("No track loaded.");
    return;
  }

  if (index >= musicList.length) index = 0;
  else if (index < 0) index = musicList.length - 1;

  const track = musicList[index];
  currentTrackIndex = index;

  if (!track || (!track.file && !track.path)) {
    alert("The selected track is invalid.");
    return;
  }

  updateArtistImage(track.artist);

  const fileUrl = `file://${track.path.replace(/\\/g, '/')}`;
  audio.src = fileUrl;

  audio.addEventListener('canplay', function autoPlayOnce() {
    audio.play().catch(err => console.error("Playback error:", err));
    if (!manualViewActive) showNowPlayingOnly();
    audio.removeEventListener('canplay', autoPlayOnce);
  });

  audio.onerror = () => {
    console.error(" Error when loading:", fileUrl);
    alert("Error when loading the track");
  };

  const title = `${track.title} - ${track.artist} (${track.duration})`;
  const isFavorite = JSON.parse(localStorage.getItem('favorites') || '[]').includes(track.file);

  trackTitle.innerHTML = `
  <div class="info">
    <span title="${title}">${title}</span>
    <button id="favorite-current" class="fav-btn ${isFavorite ? 'active' : ''}" data-file="${track.file}">
      <i data-lucide="${isFavorite ? 'heart' : 'heart-off'}"></i>
    </button>
  </div>
`;

  lucide.createIcons(); // Actualise the icons after changing the html

  document.getElementById('favorite-current')?.addEventListener('click', (e) => {
    e.stopPropagation();
    const filename = e.currentTarget.getAttribute('data-file');
    toggleFavorite(filename);
  });

  updateArtistImage(track.artist).then((finalImageUrl) => {
    window.electron.updateMiniTrack({
      title: `${track.title} - ${track.artist}`,
      image: finalImageUrl
    });
  });

  window.electron.setLastTrack(track);
}



//fetches artist image and put it on screen with a fallback
function updateArtistImage(artist) {
  const artistImage = document.getElementById('artist-image');
  artistImage.classList.remove('visible');

  return new Promise((resolve) => {
    if (!artist || artist === 'Unknown Artist' || artist === 'Erro de leitura') {
      const fallback = 'images/default-artist.png';
      artistImage.src = fallback;
      artistImage.alt = 'Default Artist';
      resolve(fallback);
      return;
    }

    window.electron.getArtistImage(artist).then(url => {
      const finalUrl = url || 'images/default-artist.png';
      artistImage.src = finalUrl;
      artistImage.alt = `Imagem de ${artist}`;
      void artistImage.offsetWidth;
      setTimeout(() => artistImage.classList.add('visible'), 50);
      artistContainer.style.display = 'block';
      resolve(finalUrl);
    }).catch(err => {
      console.error('Erro ao buscar imagem do artista:', err);
      const fallback = 'images/default-artist.png';
      artistImage.src = fallback;
      artistImage.alt = 'Default Artist';
      resolve(fallback);
    });
  });
}

// loads and applies translations from locales jsons
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

// Actual folder
function getFolderPath() {
  return currentFolderPath;
}

// Selecting folder
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

// Change in the checked folder
window.electron.onFolderChanged(() => {
  const folderPath = getFolderPath();
  loadMusicFiles(folderPath);
});

// 🌐 DOM loaded
window.addEventListener('DOMContentLoaded', async () => {
  await loadTranslations('pt');
  translateUI();

  const lastFolder = await window.electron.getLastFolder();
  if (lastFolder) {
    currentFolderPath = lastFolder;
    const folderName = lastFolder.split(/[\\/]/).pop();
    document.getElementById('folder-path').innerText = `${translations.current_folder}: ${folderName}`;
    await loadMusicFiles(lastFolder);
  }

  //Visualising buttons
  showAllBtn?.addEventListener('click', () => {
    manualViewActive = true;
    renderMusicList(musicList);
    toggleMusicList(true);
  });

  showFavoritesBtn?.addEventListener('click', () => {
    manualViewActive = true;
    const favs = JSON.parse(localStorage.getItem('favorites') || '[]');
    const filtered = musicList.filter(track => favs.includes(track.file));
    renderMusicList(filtered);
    toggleMusicList(true);
  });

  showLibraryBtn?.addEventListener('click', async () => {
    manualViewActive = true;
    const autoTracks = await window.electron.getAutoLibrary();
    if (autoTracks?.length && navigator.userAgent.includes('Playwright')) {
      window.__lastAutoTracks = autoTracks;
    }    
    renderMusicList(autoTracks);
    toggleMusicList(true);
  });

  document.getElementById('refresh-library').addEventListener('click', async () => {
    await window.electron.clearAutoLibraryCache();
    showLibraryBtn.click();
  });

  document.getElementById('close-list').addEventListener('click', () => {
    toggleMusicList(false);
    manualViewActive = false;
  });

  document.getElementById('lang-selector').addEventListener('change', async (e) => {
    await loadTranslations(e.target.value);
    translateUI();
    if (currentFolderPath) {
      const folderName = currentFolderPath.split(/[\\/]/).pop();
      document.getElementById('folder-path').innerText = `${translations.current_folder}: ${folderName}`;
      const list = await window.electron.getMusicFiles(currentFolderPath);
      musicList = list;
      if (manualViewActive) renderMusicList(musicList);
    }
  });
});



  
  



//  Loop
loopBtn.addEventListener('click', () => {
  
  
  loopBtn.innerHTML = `<i data-lucide="${isLooping ? 'repeat-1' : 'repeat'}"></i>`;
  loopBtn.classList.toggle('active', isLooping);
  
  lucide.createIcons(); // update the icons
  loopBtn.blur(); // make it blur
});
playPauseBtn.addEventListener('click', () => {
  togglePlayPause();
  setTimeout(() => playPauseBtn.blur(), 0); // blur in a assincrone way
});

prevBtn.addEventListener('click', () => {
  playTrack(currentTrackIndex - 1);
  setTimeout(() => prevBtn.blur(), 0);
});

nextBtn.addEventListener('click', () => {
  if (isShuffling) {
    playTrack(Math.floor(Math.random() * musicList.length));
  } else {
    const nextIndex = (currentTrackIndex + 1) % musicList.length;
    playTrack(nextIndex);
  }
  setTimeout(() => nextBtn.blur(), 0);
});

loopBtn.addEventListener('click', () => {
  isLooping = !isLooping;
  audio.loop = isLooping;
  loopBtn.innerHTML = `<i data-lucide="${isLooping ? 'repeat-1' : 'repeat'}"></i>`;
  loopBtn.classList.toggle('active', isLooping);
  lucide.createIcons();
  setTimeout(() => loopBtn.blur(), 0);
});

shuffleBtn.addEventListener('click', () => {
  isShuffling = !isShuffling;
  shuffleBtn.classList.toggle('active', isShuffling);
  setTimeout(() => shuffleBtn.blur(), 0);
});

// handles the mute button
function togglePlayPause() {
  if (audio.paused) {
    audio.play();
  } else {
    audio.pause();
  }

  window.electron.updatePlayPauseState(!audio.paused);
}

// update play/pause buttons
audio.addEventListener('play', () => {
  playPauseBtn.innerHTML = '<i data-lucide="pause"></i>';
  window.electron.updateMiniPlayerState(true);
  const vinyl = document.getElementById('vinyl-wrapper');
  vinyl?.classList.add('rotate');
  lucide.createIcons(); // update icons
  if (!easterEggInterval) {
    easterEggInterval = setInterval(() => {
      if (!audio.paused) {
        spawnEasterEgg();
      }
    }, 5000);
  }
});

audio.addEventListener('pause', () => {
  playPauseBtn.innerHTML = '<i data-lucide="play"></i>';
  window.electron.updateMiniPlayerState(false);
  const vinyl = document.getElementById('vinyl-wrapper');
  vinyl?.classList.remove('rotate');
  lucide.createIcons(); // update icons
  clearInterval(easterEggInterval);
  easterEggInterval = null;

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
      playTrack(0); // reload with safety
    }
  }
});


// Volume
volumeControl.addEventListener('input', e => audio.volume = e.target.value / 10);
audio.addEventListener('volumechange', () => volumeControl.value = audio.volume * 10);
// Avoid the volume-control to steal the focus and break the shortcuts 
volumeControl.addEventListener('mouseup', () => {
  volumeControl.blur();
});

volumeControl.addEventListener('touchend', () => {
  volumeControl.blur();
});

volumeControl.addEventListener('change', () => {
  volumeControl.blur();
});

function toggleMute() {
  isMuted = !isMuted;
  audio.muted = isMuted;
  muteBtn.innerHTML = `<i data-lucide="${isMuted ? 'volume-x' : 'volume-2'}"></i>`;
  volumeControl.style.display = isMuted ? 'none' : 'block';
  lucide.createIcons(); // re-render icons
}
muteBtn.addEventListener('click', toggleMute);

//  Visualizer using Web audio API
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
      canvasCtx.fillStyle = `hsl(${i * 4}, 100%, 60%)`; // live rainbow

      canvasCtx.fillRect(x, canvas.height - barHeight / 2, barWidth, barHeight / 2);
      x += barWidth + 1;
    }
  }

  draw();
}
setupVisualizer();

// 🌙 dark mode
const themeToggle = document.createElement('button');
themeToggle.innerHTML = '<i data-lucide="moon"></i>';
themeToggle.className = 'theme-toggle';
themeToggle.setAttribute('tabindex', '-1');

themeToggle.addEventListener('click', () => {
  darkMode = !darkMode;
  document.body.classList.toggle('dark-mode', darkMode);
  themeToggle.innerHTML = `<i data-lucide="${darkMode ? 'sun' : 'moon'}"></i>`;
  lucide.createIcons();
  updateThemeIcon();
  themeToggle.blur();
});
document.body.appendChild(themeToggle);
lucide.createIcons();
// ⌨️ Key shortcuts
window.addEventListener('keydown', (e) => {
  const active = document.activeElement;
  const tag = active?.tagName?.toUpperCase() || '';

  const isTextField = (
    tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT'
  );

  
  const isTyping = (
    isTextField &&
    (active.getAttribute('type') === null || 
    ['text', 'email', 'password', 'search', 'url', 'tel'].includes(active.type))
  );

  if (isTyping) {
    return; // 
  }

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
      audio.volume = Math.min(1, audio.volume + 0.1);
      break;

    case 'ArrowDown':
      e.preventDefault();
      audio.volume = Math.max(0, audio.volume - 0.1);
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


// support mini player and external shortcuts
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
window.electron.onMiniControl?.((action) => {
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

//  Format duraction
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


function spawnEasterEgg() {
  const imageSources = [
    'images/note.png',
    'images/kitty.png',
    'images/arc.png',
    'images/pao.png'
  ];

  const src = imageSources[Math.floor(Math.random() * imageSources.length)];
  const elem = document.createElement('div');
  elem.classList.add('floating-easteregg');

  const img = document.createElement('img');
  img.src = src;
  img.style.width = '100%';
  img.style.height = '100%';
  img.style.objectFit = 'contain';

  elem.appendChild(img);

  //Random initial position
  const top = Math.random() * 90;
  const left = Math.random() * 90;

  //Random arch direction
  const xOffset = (Math.random() - 0.5) * 200; // -100px to 100px
  const yOffset = (Math.random() - 0.5) * 200; // -100px to 100px

  elem.style.top = `${top}%`;
  elem.style.left = `${left}%`;
  elem.style.setProperty('--x', `${xOffset}px`);
  elem.style.setProperty('--y', `${yOffset}px`);

  document.body.appendChild(elem);

  setTimeout(() => {
    elem.remove();
  }, 5000);
}
