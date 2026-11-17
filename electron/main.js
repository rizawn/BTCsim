const { app, BrowserWindow, Menu, dialog } = require('electron');
const path = require('path');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 750,
    minWidth: 1024,
    minHeight: 600,
    title: 'SHA-256 Tycoon — Bitcoin Mining Tycoon',
    backgroundColor: '#1A1D23',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  // Load built Vite production bundle
  const indexPath = path.join(__dirname, '..', 'dist', 'index.html');
  mainWindow.loadFile(indexPath);

  buildNativeMenu();
}

function buildNativeMenu() {
  const template = [
    {
      label: 'Game',
      submenu: [
        {
          label: 'Game Baru (Restart)',
          accelerator: 'CmdOrCtrl+N',
          click: () => {
            mainWindow.webContents.reload();
          },
        },
        { type: 'separator' },
        {
          label: 'Simpan Cepat (Slot 1)',
          accelerator: 'CmdOrCtrl+S',
          click: () => {
            mainWindow.webContents.executeJavaScript('window.__saveGame && window.__saveGame(1)');
          },
        },
        {
          label: 'Muat Cepat (Slot 1)',
          accelerator: 'CmdOrCtrl+L',
          click: () => {
            mainWindow.webContents.executeJavaScript('window.__loadGame && window.__loadGame(1)');
          },
        },
        { type: 'separator' },
        {
          label: 'Keluar',
          role: 'quit',
        },
      ],
    },
    {
      label: 'Tampilan',
      submenu: [
        { role: 'reload', label: 'Muat Ulang' },
        { role: 'toggleDevTools', label: 'Alat Pengembang (DevTools)' },
        { type: 'separator' },
        { role: 'togglefullscreen', label: 'Layar Penuh (Fullscreen)' },
      ],
    },
    {
      label: 'Bantuan',
      submenu: [
        {
          label: 'Tentang SHA-256 Tycoon',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'Tentang SHA-256 Tycoon',
              message: 'SHA-256 Tycoon v0.1.0-playtest',
              detail:
                'Game Tycoon Penambangan Bitcoin Single-Player.\nFokus Simulasi Ekonomi & Edukasi Teknis.\n\n"Pemain bertahan hidup dari kompresi margin; difficulty adalah antagonis yang respawn tiap 2.016 blok."',
            });
          },
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
