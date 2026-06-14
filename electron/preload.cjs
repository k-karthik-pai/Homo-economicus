const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('homoEconomicusDesktop', {
  platform: process.platform,
});
