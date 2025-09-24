const { contextBridge, ipcRenderer } = require('electron');

// Função de validação atualizada para os campos corretos do laudo
function validateLaudo(laudoData) {
  if (!laudoData) {
    throw new Error("Dados do laudo não foram informados.");
  }
  if (!laudoData.numero_processo || !laudoData.numero_processo.trim()) {
    throw new Error("O campo 'Número do Processo' é obrigatório.");
  }
  if (!laudoData.reclamante || !laudoData.reclamante.trim()) {
    throw new Error("O campo 'Reclamante' é obrigatório.");
  }
  return true;
}

// Expõe as APIs de forma segura para a interface (renderer)
contextBridge.exposeInMainWorld("electronAPI", {
  // Funções para Laudos
  saveLaudo: (laudoData) => {
    // A validação foi movida para o renderer para dar feedback melhor ao usuário,
    // mas poderia ser mantida aqui como uma segunda camada.
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
  selectPhotos: () => ipcRenderer.invoke("select-photos"),
  exportWord: (laudoData) => {
    // A validação completa deve ser feita antes de chamar a exportação
    return ipcRenderer.invoke("export-word", laudoData);
  },

  // --- FUNÇÕES PARA GERENCIAR DOENÇAS ATUALIZADAS ---
  getDoencas: () => ipcRenderer.invoke('get-doencas'),
  saveDoenca: (doenca) => ipcRenderer.invoke('save-doenca', doenca),
  // --- NOVAS FUNÇÕES ADICIONADAS AQUI ---
  deleteDoenca: (id) => ipcRenderer.invoke('delete-doenca', id),
  updateDoenca: (doencaData) => ipcRenderer.invoke('update-doenca', doencaData)
});