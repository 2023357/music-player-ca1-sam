// Import required Electron and Node modules
const { app, BrowserWindow, globalShortcut, dialog, ipcMain, Tray, Menu, nativeImage } = require('electron');

// Disable GPU shader cache to avoid unnecessary disk usage
app.commandLine.appendSwitch('disable-gpu-shader-disk-cache');
// Node modules for file paths, filesystem operations, config storage, metadata, and OS
const path = require('path');
const fs = require('fs');
const Store = require('electron-store').default;
const mm = require('music-metadata');
const os = require("os");
const chokidar = require('chokidar');

//  App-wide state variables
const store = new Store();
let mainWindow;
let tray;
let miniPlayerWindow = null;
let lastTrack = null;
let lastIsPlaying = false;
let folderWatcher = null;

app.setPath('userData', path.join(app.getPath('appData'), 'MusicPlayerUserData'));


// Get default "safe" folders to scan for music automatically
function getSafeMusicFolders() {
    const home = os.homedir();// Get the current user's home directory
   // List of folders commonly used to store music
    const folders = [
        path.join(home, 'Music'),
        path.join(home, 'Downloads'),
        path.join(home, 'Documents'),
        'D:\\Musicas',
        'E:\\Musicas'
    ];
     // Only return the folders that actually exist on the user's system
    return folders.filter(fs.existsSync);
}

// 🔍 Recursively scan for music files and extract metadata
async function scanForMusicFiles(folder) {
    const results = [];// Store results (metadata of each music file)

     // Helper function to walk through directories recursively
    async function walk(dir) {
        const entries = fs.readdirSync(dir, { withFileTypes: true });// Read directory entries
        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);

            if (entry.isDirectory()) {
                const ignored = ['node_modules', 'Windows', 'AppData', '$Recycle.Bin'];
                if (!ignored.includes(entry.name)) {
                    await walk(fullPath);// Recurse into subdirectory
                }
                // 🎵 If it's a supported music file, extract its metadata
            } else if (entry.isFile() && /\.(mp3|wav|ogg)$/i.test(entry.name)) {
                try {
                    const metadata = await mm.parseFile(fullPath);
                    results.push({
                        title: metadata.common.title || entry.name,
                        artist: metadata.common.artist || 'Unknown Artist',
                        duration: metadata.format.duration ? formatDuration(metadata.format.duration) : '00:00',
                        file: entry.name,
                        path: fullPath
                    });
                    // If metadata can't be read (corrupted file), add with default values
                } catch {
                    results.push({
                        title: entry.name,
                        artist: 'Reading error',
                        duration: '00:00',
                        file: entry.name,
                        path: fullPath
                    });
                }
            }
        }
    }

    await walk(folder); // Start the recursive walk from the given folder
    return results;// Return all collected track data
}

// 🕒 Format seconds into MM:SS
function formatDuration(seconds) {
    const min = Math.floor(seconds / 60);
    const sec = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${min}:${sec}`; 
}

// 🖥️ Create the main application window
function createMainWindow() {
    mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        minWidth: 400,
        minHeight: 300,
        resizable: true,
        icon: path.join(__dirname, 'images', 'tray_icon.ico'), // App icon in taskbar/title
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),// Preload script to expose safe APIs
            contextIsolation: true, // Protect from prototype pollution
            enableRemoteModule: false,
            nodeIntegration: false,  // Block Node.js access from renderer
        }
    });

    mainWindow.loadFile('index.html');

    mainWindow.on('closed', () => {
        mainWindow = null;

        // Minimize event: optionally show mini-player
        if (!miniPlayerWindow) app.quit();
    });
 // Restore event: hide mini-player if it's open
    mainWindow.on('minimize', () => {
        if (!miniPlayerWindow || miniPlayerWindow.isDestroyed()) {
            createMiniPlayer();
        } else {
            miniPlayerWindow.show();
        }
    });
}

// 🎛️ Create the mini player window
function createMiniPlayer() {
    miniPlayerWindow = new BrowserWindow({
        width: 360,
        height: 250,
        minWidth: 360,
        minHeight: 250,
        maxWidth: 360,
        maxHeight: 250,
        resizable: false, 
        frame: false,
        alwaysOnTop: true,
        skipTaskbar: true,
        icon: path.join(__dirname, 'images', 'icon.png'),
        webPreferences: {
          preload: path.join(__dirname, 'preload.js'),
          contextIsolation: true,
        }
      });      
     // Load mini-player HTML file
    miniPlayerWindow.loadFile('mini-player.html');


    // 📡 When the mini-player is ready, send the last known track info
    miniPlayerWindow.once('ready-to-show', () => {
        if (lastTrack && !miniPlayerWindow.isDestroyed()) {
            miniPlayerWindow.webContents.send('update-track', lastTrack);
        }
        miniPlayerWindow.webContents.send('update-mini-player-state', lastIsPlaying);
    });

    miniPlayerWindow.on('minimize', (e) => {
        e.preventDefault();
        miniPlayerWindow.hide();
    });
}

// 🎮 IPC handlers
ipcMain.handle('ensure-main-ready', async () => {
    if (!mainWindow || mainWindow.isDestroyed()) {
      throw new Error('Main window is not ready.');
    }
    return true;
  });
  
ipcMain.on('mini-player-update-state', (_, isPlaying) => {
    lastIsPlaying = isPlaying;
    if (miniPlayerWindow && !miniPlayerWindow.isDestroyed()) {
        miniPlayerWindow.webContents.send('update-mini-player-state', isPlaying);
    }
});
 // IPC: Mini player sends commands (play, pause, next...)
ipcMain.on('mini-control', (_, action) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('tray-control', action);
    }
});
// Function to send current track info to the mini player
ipcMain.on('update-mini-track', (_, trackData) => {
    lastTrack = trackData;
    if (miniPlayerWindow && !miniPlayerWindow.isDestroyed()) {
        miniPlayerWindow.webContents.send('update-track', lastTrack);// Send to renderer
    }
});

ipcMain.on('minimize-mini', () => {
    if (miniPlayerWindow && !miniPlayerWindow.isDestroyed()) {
        miniPlayerWindow.minimize();
    }
});

ipcMain.on('close-mini', () => {
    if (miniPlayerWindow && !miniPlayerWindow.isDestroyed()) {
        miniPlayerWindow.close();
    }
});

// 🖼️ Create system tray
function createTray() {
    const iconPath = path.join(__dirname, 'images', 'tray_icon.ico');// Path to tray icon
    let trayIcon = nativeImage.createFromPath(iconPath); // Load as NativeImage
    // Check that icon loaded successfully
    if (!trayIcon.isEmpty()) {
        trayIcon = trayIcon.resize({ width: 16, height: 16 });// Resize for tray use
        tray = new Tray(trayIcon); // Create tray icon

        tray.setContextMenu(Menu.buildFromTemplate([
            {
                label: 'Show Main Player',
                click: () => {
                    if (mainWindow) mainWindow.show();// Re-create if closed
                    if (miniPlayerWindow) { // Bring main window to front
                        miniPlayerWindow.close(); // Hide mini if main is back
                        miniPlayerWindow = null; 
                    }
                }
            },
            {
                label: 'Show Mini Player',
                click: () => {
                    if (!miniPlayerWindow || miniPlayerWindow.isDestroyed()) {
                        createMiniPlayer();// Open mini player if not running
                    } else {
                        miniPlayerWindow.show();// Just bring to front
                    }
                }
            },
            { label: 'Play/Pause', click: () => mainWindow.webContents.send('tray-control', 'play-pause') },
            { label: 'Next Track', click: () => mainWindow.webContents.send('tray-control', 'next-track') },
            { label: 'Previous Track', click: () => mainWindow.webContents.send('tray-control', 'previous-track') },
            { type: 'separator' },
            { label: 'Quit', click: () => app.quit() }
        ]));

        tray.setToolTip('Music Player');  // Tooltip on hover
    } else {
        console.warn('⚠️ Tray icon not found or failed to load.');
    }
}

// 🏁 App ready
app.whenReady().then(() => {
    createMainWindow();
    createTray();

    globalShortcut.register('CommandOrControl+Right', () => mainWindow.webContents.send('global-shortcut', 'next-track'));
    globalShortcut.register('CommandOrControl+Left', () => mainWindow.webContents.send('global-shortcut', 'previous-track'));
    globalShortcut.register('CommandOrControl+M', () => mainWindow.webContents.send('global-shortcut', 'mute'));
    globalShortcut.register('CommandOrControl+Up', () => mainWindow.webContents.send('global-shortcut', 'volume-up'));
    globalShortcut.register('CommandOrControl+Down', () => mainWindow.webContents.send('global-shortcut', 'volume-down'));
    globalShortcut.register('CommandOrControl+Space', () => mainWindow.webContents.send('global-shortcut', 'play-pause'));
    globalShortcut.register('CommandOrControl+Shift+M', () => {
        if (!miniPlayerWindow || miniPlayerWindow.isDestroyed()) {
            createMiniPlayer();
        } else if (miniPlayerWindow.isVisible()) {
            miniPlayerWindow.hide();
        } else {
            miniPlayerWindow.show();
        }
    });
});

// 🔚 App close behavior
app.on('window-all-closed', () => {
    if (miniPlayerWindow) miniPlayerWindow.destroy();
    if (process.platform !== "darwin") app.quit();
});

app.on('before-quit', () => {
    if (miniPlayerWindow) miniPlayerWindow.destroy();
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
});

app.on('will-quit', () => {
    globalShortcut.unregisterAll(); // Prevents memory leaks
});



// 📁 Folder selection dialog

ipcMain.handle('select-folder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, { properties: ['openDirectory'] });
  if (result.filePaths.length > 0) {
      store.set('lastFolder', result.filePaths[0]);// Save for persistence
      return result.filePaths[0]; // Return folder path to renderer
  }
  return null;// No folder selected
});

//  Retrieve or clear stored folder
ipcMain.handle('get-last-folder', () => store.get('lastFolder', null));
ipcMain.handle('clear-auto-library-cache', () => store.delete('autoLibraryCache'));

//  Auto-scan and cache music library
ipcMain.handle('get-auto-library', async () => {
    if (process.env.PLAYWRIGHT_FAKE_LIBRARY === 'true') {
        console.log('🎭 Returning 1000 fake tracks (Playwright mode)');
        const fakeTracks = Array.from({ length: 1000 }, (_, i) => ({
          title: `Track ${i + 1}`,
          artist: `Artist ${i + 1}`,
          duration: '3:00',
          file: `fake${i + 1}.mp3`,
          path: `/fake/path/fake${i + 1}.mp3`
        }));
        return fakeTracks;
      }
 
 
 
 
    const cached = store.get('autoLibraryCache', null);
  const oneHour = 60 * 60 * 1000;

  


  // Return cached results if they're recent
  if (cached && (Date.now() - cached.timestamp) < oneHour) return cached.tracks;

  const folders = getSafeMusicFolders();
  let allTracks = [];

  for (const folder of folders) {
      const tracks = await scanForMusicFiles(folder);
      allTracks = allTracks.concat(tracks);
  }

  store.set('autoLibraryCache', { timestamp: Date.now(), tracks: allTracks });
  return allTracks;
});

ipcMain.handle('toggle-mini-player', () => {
    if (!miniPlayerWindow || miniPlayerWindow.isDestroyed()) {
      createMiniPlayer();
    } else if (miniPlayerWindow.isVisible()) {
      miniPlayerWindow.hide();
    } else {
      miniPlayerWindow.show();
    }
  });

// 🎵 Scan specific folder for music files
ipcMain.handle('get-music-files', async (_, folderPath) => {
  if (!fs.existsSync(folderPath)) {
      console.error("❌ Folder not found:", folderPath);
      return [];
  }

  if (folderWatcher && typeof folderWatcher.close === 'function') {
      try { folderWatcher.close(); } catch {}
  }

  try {
      folderWatcher = fs.watch(folderPath, (eventType, filename) => {
          if (filename && /\.(mp3|wav|ogg)$/i.test(filename)) {
              mainWindow.webContents.send('folder-changed');// Notify renderer
          }
      });
  } catch (err) {
      console.error("Failed to start fs.watch:", err);
  }

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
                  duration: metadata.format.duration ? formatDuration(metadata.format.duration) : '00:00',
                  file: file,
                  path: fullPath // important for playback
              };
          } catch {
              return {
                  title: file,
                  artist: 'Reading error',
                  duration: '00:00',
                  file: file,
                  path: fullPath
              };
          }
      }));

      return tracks;
  } catch (err) {
      console.error("Failed to read music files:", err);
      return [];
  }
});
// 🛰️ Lazy load node-fetch
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

// 🔑 Get Spotify access token
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

// 🖼️ Search Spotify and return artist image URL
ipcMain.handle('get-artist-image', async (_, artistName) => {
    try {
        const token = await getSpotifyToken();
        const searchUrl = `https://api.spotify.com/v1/search?q=${encodeURIComponent(artistName)}&type=artist&limit=1`;

        const response = await fetch(searchUrl, {
            headers: { Authorization: `Bearer ${token}` }
        });

        const data = await response.json();
        return data.artists?.items?.[0]?.images?.[0]?.url || null;
    } catch (err) {
        console.error('Error fetching artist image from Spotify:', err);
        return null;
    }
});
// 📡 Watch folder for real-time music file changes using chokidar
ipcMain.handle('start-folder-watch', async (_, folderPath) => {
  if (folderWatcher) {
      folderWatcher.close();
  }

  folderWatcher = chokidar.watch(folderPath, { ignoreInitial: true });

  folderWatcher.on('add', () => {
      mainWindow.webContents.send('folder-changed');
  });

  folderWatcher.on('unlink', () => {
      mainWindow.webContents.send('folder-changed');
  });

  return true;
});
