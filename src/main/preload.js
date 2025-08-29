const { contextBridge, ipcRenderer } = require('electron');

// Função auxiliar de validação para laudos
function validateLaudo(laudoData) {
  if (!laudoData) throw new Error("Dados do laudo não informados.");
  if (!laudoData.titulo || typeof laudoData.titulo !== "string") {
    throw new Error("O laudo precisa ter um título válido.");
  }
  if (!laudoData.conteudo || typeof laudoData.conteudo !== "string") {
    throw new Error("O laudo precisa ter um conteúdo válido.");
  }
  return true;
}

// Expõe APIs protegidas para o renderer process
contextBridge.exposeInMainWorld("electronAPI", {
  saveLaudo: async (laudoData) => {
    validateLaudo(laudoData);
    return ipcRenderer.invoke("save-laudo", laudoData);
  },
  loadLaudos: () => ipcRenderer.invoke("load-laudos"),
  getLaudo: (id) => {
    if (!id) throw new Error("ID do laudo não fornecido.");
    return ipcRenderer.invoke("get-laudo", id);
  },
  deleteLaudo: (id) => {
    if (!id) throw new Error("ID do laudo não fornecido.");
    return ipcRenderer.invoke("delete-laudo", id);
  },
  exportWord: async (laudoData) => {
    validateLaudo(laudoData);
    return ipcRenderer.invoke("export-word", laudoData);
  }
});
