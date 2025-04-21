const { app, BrowserWindow, globalShortcut, dialog, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const Store = require('electron-store').default;
const mm = require('music-metadata');

const store = new Store();
let mainWindow;

app.whenReady().then(() => {
    mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        minWidth: 400, // <- prevent it from getting too small
        minHeight: 300,
        resizable: true,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            enableRemoteModule: false,
            nodeIntegration: false,
        }
    });

    mainWindow.loadFile('index.html');
    // GLOBAL SHORTCUTS
    globalShortcut.register('CommandOrControl+Right', () => {
        mainWindow.webContents.send('global-shortcut', 'next-track');
      });
      
      globalShortcut.register('CommandOrControl+Left', () => {
        mainWindow.webContents.send('global-shortcut', 'previous-track');
      });
      
      globalShortcut.register('CommandOrControl+M', () => {
        mainWindow.webContents.send('global-shortcut', 'mute');
      });
      
      globalShortcut.register('CommandOrControl+Up', () => {
        mainWindow.webContents.send('global-shortcut', 'volume-up');
      });
      
      globalShortcut.register('CommandOrControl+Down', () => {
        mainWindow.webContents.send('global-shortcut', 'volume-down');
      });
      
      globalShortcut.register('CommandOrControl+Space', () => {
        mainWindow.webContents.send('global-shortcut', 'play-pause');
      });
      
    
      app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
      });
      app.on('will-quit', () => {
        globalShortcut.unregisterAll();
      });
    });

    app.on('window-all-closed', () => {
        if (process.platform !== 'darwin') app.quit();
    });



// Select folder
ipcMain.handle('select-folder', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openDirectory']
    });

    if (result.filePaths.length > 0) {
        store.set('lastFolder', result.filePaths[0]);
        return result.filePaths[0];
    }

    return null;
});

// Get last used folder
ipcMain.handle('get-last-folder', () => {
    return store.get('lastFolder', null);
});

// Get music files with metadata
ipcMain.handle('get-music-files', async (_, folderPath) => {
    if (!folderPath) return [];

    try {
        const files = fs.readdirSync(folderPath);
        const musicFiles = files.filter(file => file.match(/\.(mp3|wav|ogg)$/i));

        const tracks = await Promise.all(musicFiles.map(async (file) => {
            const fullPath = path.join(folderPath, file);
            try {
                const metadata = await mm.parseFile(fullPath);
                return {
                    title: metadata.common.title || file,
                    artist: metadata.common.artist || 'Unknown Artist',
                    duration: metadata.format.duration
                        ? formatDuration(metadata.format.duration)
                        : '00:00',
                    file: file
                };
            } catch {
                return {
                    title: file,
                    artist: 'Error reading metadata',
                    duration: '00:00',
                    file: file
                };
            }
        }));

        return tracks;
    } catch (err) {
        console.error("Error reading folder:", err);
        return [];
    }
});

function formatDuration(seconds) {
    const min = Math.floor(seconds / 60);
    const sec = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${min}:${sec}`;
}
