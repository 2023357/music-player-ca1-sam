// Mini-Player frontend

// 📦 Interface elements
const trackInfoElem = document.getElementById('track-info');
const playBtn = document.getElementById('play');
const prevBtn = document.getElementById('prev');
const nextBtn = document.getElementById('next');
const minimizeBtn = document.getElementById('minimize-btn');
const closeBtn = document.getElementById('close-btn');
const vinylWrapper = document.getElementById('vinyl-wrapper');
const artistImage = document.getElementById('artist-image');

// reproduction state 
let isPlaying = false;

// Update the music info 
window.electronMini.onUpdateTrack((trackData) => {
  const title = trackData?.title || 'No track playing';
  const image = trackData?.image || window.electronMini.getDefaultArtistImage();


  trackInfoElem.innerText = title;
  artistImage.src = image;
  artistImage.alt = ' Artist image';
  artistImage.classList.add('visible');

});

// Update the pause/play state
window.electronMini.onUpdateMiniPlayerState((isPlayingNow) => {
  isPlaying = isPlayingNow;
  updateVisualState();
});

// update the button and rotation vision 
function updateVisualState() {
  const icon = isPlaying ? 'pause' : 'play';
  playBtn.innerHTML = `<i data-lucide="${icon}"></i>`;
  lucide.createIcons(); // Redesenha o ícone

  if (isPlaying) {
    vinylWrapper.classList.add('rotate');
  } else {
    vinylWrapper.classList.remove('rotate');
  }
}

// Midia controls
playBtn.addEventListener('click', () => {
  window.electronMini.sendControl('play-pause');
});

prevBtn.addEventListener('click', () => {
  window.electronMini.sendControl('previous-track');
});

nextBtn.addEventListener('click', () => {
  window.electronMini.sendControl('next-track');
});

// Window controls
minimizeBtn.addEventListener('click', () => window.electronMini.minimize());
closeBtn.addEventListener('click', () => window.electronMini.close());
