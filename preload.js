const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
    selectFolder: () => ipcRenderer.invoke('select-folder'),
    getLastFolder: () => ipcRenderer.invoke('get-last-folder'),
    getMusicFiles: (folderPath) => ipcRenderer.invoke('get-music-files', folderPath),
    onShortcut: (callback) => ipcRenderer.on('global-shortcut', (event, action) => callback(action)),
    onTrayControl: (callback) => ipcRenderer.on('tray-control', (event, action) => callback(action)),
    getArtistImage: (artist) => ipcRenderer.invoke('get-artist-image', artist),
    updateMiniTrack: (data) => ipcRenderer.send('update-mini-track', data),
    sendMiniControl: (action) => ipcRenderer.send('mini-control', action),
    onUpdateTrack: (callback) => ipcRenderer.on('update-track', (event, data) => callback(data)),
    startFolderWatch: (folderPath) => ipcRenderer.invoke('start-folder-watch', folderPath),
  onFolderChanged: (callback) => ipcRenderer.on('folder-changed', callback),
  getAutoLibrary: () => ipcRenderer.invoke('get-auto-library'),
  clearAutoLibraryCache: () => ipcRenderer.invoke('clear-auto-library-cache'),
  setLastTrack: (track) => ipcRenderer.send('update-mini-track', track),

});
