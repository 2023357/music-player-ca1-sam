const { app, BrowserWindow, globalShortcut, dialog, ipcMain, Tray, Menu, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');
const Store = require('electron-store').default;
const mm = require('music-metadata');
const os = require("os");

const store = new Store();
let mainWindow;
let tray; // tray variable outside for potential future updates
let miniPlayerWindow = null;
let lastTrack = null;
let folderWatcher = null;

function getSafeMusicFolders() {
    const home = os.homedir();
  
    const folders = [
      path.join(home, 'Music'),
      path.join(home, 'Downloads'),
      path.join(home, 'Documents'),
      'D:\\Musicas',
      'E:\\Musicas'
    ];
  
    return folders.filter(fs.existsSync);
  }
  
  async function scanForMusicFiles(folder) {
    const results = [];
  
    async function walk(dir) {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
  
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
  
        if (entry.isDirectory()) {
          const ignored = ['node_modules', 'Windows', 'AppData', '$Recycle.Bin'];
          if (!ignored.includes(entry.name)) {
            await walk(fullPath);
          }
        } else if (entry.isFile() && /\.(mp3|wav|ogg)$/i.test(entry.name)) {
          try {
            const metadata = await mm.parseFile(fullPath);
            results.push({
              title: metadata.common.title || entry.name,
              artist: metadata.common.artist || 'Unknown Artist',
              duration: metadata.format.duration
                ? formatDuration(metadata.format.duration)
                : '00:00',
              file: entry.name,
              path: fullPath
            });
          } catch {
            results.push({
              title: entry.name,
              artist: 'Erro de leitura',
              duration: '00:00',
              file: entry.name,
              path: fullPath
            });
          }
        }
      }
    }
  
    await walk(folder);
    return results;
  }
  
  
  
  
    
app.whenReady().then(() => {
    mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        minWidth: 400,
        minHeight: 300,
        resizable: true,
        icon: path.join(__dirname, 'images', 'final_player_icon.ico'), // ✅ icon for window
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            enableRemoteModule: false,
            nodeIntegration: false,
        }
    });

    mainWindow.loadFile('index.html');




function createMiniPlayer() {
    miniPlayerWindow = new BrowserWindow({
        width: 300,
        height: 100,
        frame: false,
        alwaysOnTop: true,
        resizable: false,
        skipTaskbar: true,
        webPreferences: {
            preload: path.join(__dirname, "preload.js"),
            contextIsolation: true,
        }
    });

    miniPlayerWindow.loadFile("mini-player.html");

    miniPlayerWindow.once("ready-to-show", () => {
        if (lastTrack) {
            miniPlayerWindow.webContents.send('update-track', lastTrack);
        }
    });

    miniPlayerWindow.on("closed", () => {
        miniPlayerWindow = null;
    });
}

mainWindow.on("minimize", () => {
    if (!miniPlayerWindow) {
        createMiniPlayer();
    }
    miniPlayerWindow.show();
});

mainWindow.on("restore", () => {
    if (miniPlayerWindow) {
        miniPlayerWindow.close();
    }
});

ipcMain.on('mini-control', (_, action) => {
    mainWindow.webContents.send('tray-control', action);
});


function updateMiniPlayer(data) {
        lastTrack = data;
        if (miniPlayerWindow) {
            miniPlayerWindow.webContents.send('update-track', data);
        }
    }
    


ipcMain.on('update-mini-track', (_, text) => {
    updateMiniPlayer(text);
});

app.on('window-all-closed', () => {
    if (miniPlayerWindow) {
        miniPlayerWindow.destroy();
        miniPlayerWindow = null;
    }

    if (process.platform !== "darwin") {
        app.quit();
    }
});


app.on('before-quit', () => {
    if (miniPlayerWindow) {
        miniPlayerWindow.destroy();
    }
});

    // ✅ Setup system tray with .png icon using nativeImage
    const iconPath = path.join(__dirname, 'images', 'icon.png.png'); // 👈 YOUR TRAY ICON (.png)
    let trayIcon = nativeImage.createFromPath(iconPath);
    if (!trayIcon.isEmpty()) {
        trayIcon = trayIcon.resize({ width: 16, height: 16 });
        tray = new Tray(trayIcon);

        const trayMenu = Menu.buildFromTemplate([
            {
                label: 'Play/Pause',
                click: () => {
                    mainWindow.webContents.send('tray-control', 'play-pause');
                }
            },
            {
                label: 'Next Track',
                click: () => {
                    mainWindow.webContents.send('tray-control', 'next-track');
                }
            },
            {
                label: 'Previous Track',
                click: () => {
                    mainWindow.webContents.send('tray-control', 'previous-track');
                }
            },
            {
                type: 'separator'
            },
            {
                label: 'Quit',
                click: () => {
                    app.quit();
                }
            }
        ]);

        tray.setToolTip('Music Player');
        tray.setContextMenu(trayMenu);
    } else {
        console.warn('⚠️ Tray icon not found or failed to load.');
    }

    // 🎧 Global Shortcuts
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
ipcMain.handle('get-auto-library', async () => {
    const cached = store.get('autoLibraryCache', null);

  // Se existe cache recente, usa ele
  const oneHour = 60 * 60 * 1000;
  if (cached && (Date.now() - cached.timestamp) < oneHour) {
    console.log('📦 Usando cache da biblioteca automática');
    return cached.tracks;
  }

  // Senão, faz nova varredura
  console.log('🔍 Fazendo varredura de músicas...');
  const folders = getSafeMusicFolders();
  let allTracks = [];

  for (const folder of folders) {
    const tracks = await scanForMusicFiles(folder);
    allTracks = allTracks.concat(tracks);
  }
  store.delete('autoLibraryCache');

  // Salva no cache
  store.set('autoLibraryCache', {
    timestamp: Date.now(),
    tracks: allTracks
  });

  return allTracks;
});
  

// Get last used folder
ipcMain.handle('get-last-folder', () => {
    return store.get('lastFolder', null);
});

ipcMain.handle('clear-auto-library-cache', () => {
    store.delete('autoLibraryCache');
    console.log('🗑️ Cache da biblioteca automática apagado manualmente');
  });
  

// Get music files with metadata
ipcMain.handle('get-music-files', async (_, folderPath) => {
    if (folderWatcher) {
        folderWatcher.close(); // limpa o anterior
    }

    folderWatcher = fs.watch(folderPath, (eventType, filename) => {
        if (filename && /\.(mp3|wav|ogg)$/i.test(filename)) {
            mainWindow.webContents.send('folder-changed');
        }
    });

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
                file: file,
                path: fullPath // ✅ ESSENCIAL
              };
            } catch {
              return {
                title: file,
                artist: 'Erro de leitura',
                duration: '00:00',
                file: file,
                path: fullPath // ✅ Mesmo no erro
              };
            }
          }));
          
        return tracks;
    } catch  {
        console.error("Error reading folder:", err);
        return [];
    }
});


function formatDuration(seconds) {
    const min = Math.floor(seconds / 60);
    const sec = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${min}:${sec}`;
}

const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

// Function to retrieve Spotify access token using Client Credentials Flow
async function getSpotifyToken() {
  const clientId = '70a9d2e6ef6245dc921fed6043ab1bd3';
  const clientSecret = 'a75d6b15f30b4287877067792493a436';

  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Authorization': 'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: 'grant_type=client_credentials'
  });

  const data = await response.json();
  return data.access_token;
}

// IPC handler to fetch artist image from Spotify API
ipcMain.handle('get-artist-image', async (_, artistName) => {
  try {
    const token = await getSpotifyToken();
    const searchUrl = `https://api.spotify.com/v1/search?q=${encodeURIComponent(artistName)}&type=artist&limit=1`;

    const response = await fetch(searchUrl, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const data = await response.json();

    // Return the first available artist image, or null if not found
    const imageUrl = data.artists?.items?.[0]?.images?.[0]?.url || null;
    return imageUrl;
  } catch (err) {
    console.error('Error fetching artist image from Spotify:', err);
    return null;
  }
});

