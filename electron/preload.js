// Electron preload script — contextIsolation ON, no nodeIntegration
const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
});

