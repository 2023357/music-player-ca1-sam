const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
    selectFolder: () => ipcRenderer.invoke('select-folder'),
    getLastFolder: () => ipcRenderer.invoke('get-last-folder'),
    getMusicFiles: (folderPath) => ipcRenderer.invoke('get-music-files', folderPath)
});
