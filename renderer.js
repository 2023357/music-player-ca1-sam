document.getElementById('select-folder').addEventListener('click', async () => {
    const folderPath = await window.electron.selectFolder();

    if (folderPath) {
        document.getElementById('folder-path').innerText = `Selected Folder: ${folderPath}`;
        loadMusicFiles(folderPath);
    } else {
        document.getElementById('folder-path').innerText = "No folder selected";
    }
});

window.addEventListener('DOMContentLoaded', async () => {
    const lastFolder = await window.electron.getLastFolder();
    
    if (lastFolder) {
        document.getElementById('folder-path').innerText = `Last Used Folder: ${lastFolder}`;
        loadMusicFiles(lastFolder);
    }
});

async function loadMusicFiles(folderPath) {
    const musicList = document.getElementById('music-list');
    musicList.innerHTML = "";

    const musicFiles = await window.electron.getMusicFiles(folderPath);

    if (musicFiles.length === 0) {
        musicList.innerHTML = "<p>No music files found.</p>";
        return;
    }

    musicFiles.forEach(track => {
        const li = document.createElement('li');
        li.innerHTML = `<strong>${track.title}</strong> - ${track.artist} <span style="color:gray">(${track.duration})</span>`;
        musicList.appendChild(li);
    });
}
