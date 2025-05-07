const { contextBridge, ipcRenderer } = require('electron');

// API principal
contextBridge.exposeInMainWorld('electron', {
  selectFolder: () => ipcRenderer.invoke('select-folder'),
  getLastFolder: () => ipcRenderer.invoke('get-last-folder'),
  getMusicFiles: (folderPath) => ipcRenderer.invoke('get-music-files', folderPath),
  getAutoLibrary: () => ipcRenderer.invoke('get-auto-library'),
  clearAutoLibraryCache: () => ipcRenderer.invoke('clear-auto-library-cache'),
  updatePlayPauseState: (state) => ipcRenderer.send('update-play-pause', state),
  getArtistImage: (artist) => ipcRenderer.invoke('get-artist-image', artist),
  startFolderWatch: (folderPath) => ipcRenderer.invoke('start-folder-watch', folderPath),
  setLastTrack: (track) => ipcRenderer.send('update-mini-track', track),
  toggleMiniPlayer: () => ipcRenderer.invoke('toggle-mini-player'),
  // Main events
  onShortcut: (callback) => ipcRenderer.on('global-shortcut', (_, action) => callback(action)),
  onTrayControl: (callback) => ipcRenderer.on('tray-control', (_, action) => callback(action)),
  onFolderChanged: (callback) => ipcRenderer.on('folder-changed', callback),
  onUpdateTrack: (callback) => ipcRenderer.on('update-track', (_, data) => callback(data)),

  // Mini player
  updateMiniPlayerState: (isPlaying) => ipcRenderer.send('mini-player-update-state', isPlaying),
  updateMiniTrack: (text) => ipcRenderer.send('update-mini-track', text),
  sendMiniControl: (action) => ipcRenderer.send('mini-control', action)
});

// Mini player exclusive APIS
contextBridge.exposeInMainWorld('electronMini', {
  sendControl: (action) => {
    ipcRenderer.invoke('ensure-main-ready').then(() => {
      ipcRenderer.send('mini-control', action);
    });
  },
  
  minimize: () => ipcRenderer.send('minimize-mini'),
  close: () => ipcRenderer.send('close-mini'),
  onUpdateTrack: (callback) => ipcRenderer.on('update-track', (_, data) => callback(data)),
  onUpdateMiniPlayerState: (callback) => ipcRenderer.on('update-mini-player-state', (_, isPlaying) => callback(isPlaying)),
});

