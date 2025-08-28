const { contextBridge, ipcRenderer } = require('electron');

// Expõe APIs protegidas para o renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  saveLaudo: (laudoData) => ipcRenderer.invoke('save-laudo', laudoData),
  loadLaudos: () => ipcRenderer.invoke('load-laudos'),
  getLaudo: (id) => ipcRenderer.invoke('get-laudo', id),
  deleteLaudo: (id) => ipcRenderer.invoke('delete-laudo', id),
  exportWord: (laudoData) => ipcRenderer.invoke('export-word', laudoData)
});