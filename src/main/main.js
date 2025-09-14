// main.js
const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const db = require('../../database/db'); // Caminho CORRETO

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    // O caminho do ícone também precisa ser corrigido para a raiz do projeto
    icon: path.join(__dirname, '../../build/icons/icon.ico'), 
  });

  // Caminho CORRETO para o index.html
  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => (mainWindow = null));
}

app.whenReady().then(async () => {
  try {
    await db.initDatabase();
    console.log('Banco de dados inicializado com sucesso.');
  } catch (error) {
    console.error('Erro ao inicializar banco de dados:', error);
  }

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// ------------------ IPC HANDLERS ------------------

ipcMain.handle('load-laudos', async () => {
  try {
    // CORREÇÃO: Nome da função
    const laudos = await db.loadLaudos(); 
    return { success: true, data: laudos };
  } catch (error) {
    console.error(error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-laudo', async (event, id) => {
  try {
    // CORREÇÃO: Nome da função
    const laudo = await db.getLaudo(id); 
    return { success: true, data: laudo };
  } catch (error) {
    console.error(error);
    return { success: false, error: error.message };
  }
});

// O save e o update podem usar a mesma função do db.js
ipcMain.handle('save-laudo', async (event, laudoData) => {
  try {
    const result = await db.saveLaudo(laudoData);
    return { success: true, data: { id: result.id || laudoData.id } };
  } catch (error) {
    console.error(error);
    return { success: false, error: error.message };
  }
});

// A função 'update-laudo' no main.js pode ser removida ou redirecionada,
// mas vamos mantê-la simples por enquanto e fazer o renderer.js chamar save-laudo
// tanto para criar quanto para atualizar.

ipcMain.handle('delete-laudo', async (event, id) => {
  try {
    const result = await db.deleteLaudo(id);
    return { success: true, data: result };
  } catch (error) {
    console.error(error);
    return { success: false, error: error.message };
  }
});

// Renomeando para 'export-word' para corresponder ao preload.js
ipcMain.handle('export-word', async (event, laudoData) => {
  try {
    const { filePath } = await dialog.showSaveDialog(mainWindow, {
      defaultPath: `laudo-${laudoData.numero_processo || Date.now()}.docx`,
      filters: [{ name: 'Documentos Word', extensions: ['docx'] }],
    });

    if (!filePath) return { success: false, error: 'Operação cancelada' };

    // Lógica para gerar o Word virá aqui
    console.log(`Salvar laudo em: ${filePath}`);

    return { success: true, data: { path: filePath } };
  } catch (error) {
    console.error(error);
    return { success: false, error: error.message };
  }
});