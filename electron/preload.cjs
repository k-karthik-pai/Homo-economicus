const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('homoEconomicusDesktop', {
  platform: process.platform,
  apiKey: {
    get: () => ipcRenderer.invoke('secure-api-key:get'),
    set: (key) => ipcRenderer.invoke('secure-api-key:set', key),
    clear: () => ipcRenderer.invoke('secure-api-key:clear'),
  },
});
