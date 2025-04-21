

const title = document.getElementById('mini-title');
const playBtn = document.getElementById('mini-play');
const nextBtn = document.getElementById('mini-next');
const prevBtn = document.getElementById('mini-prev');

playBtn.addEventListener('click', () => {
    window.electron.sendMiniControl('play-pause');
  });
  nextBtn.addEventListener('click', () => {
    window.electron.sendMiniControl('next-track');
  });
  prevBtn.addEventListener('click', () => {
    window.electron.sendMiniControl('previous-track');
  });
 
  const shuffleBtn = document.getElementById('mini-shuffle');

shuffleBtn.addEventListener('click', () => {
  window.electron.sendMiniControl('toggle-shuffle');
});

  const imageElem = document.getElementById('mini-image');

  window.electron.onUpdateTrack((data) => {
    console.log("🎧 Dados recebidos no Mini Player:", data);
  
    if (data?.image) {
      imageElem.src = data.image;
    } else {
      imageElem.src = 'images/default-artist.png';
    }
  });

  
