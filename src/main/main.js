// main.js - VERSÃO FINAL E CORRIGIDA
const { app, BrowserWindow, ipcMain, dialog, protocol } = require('electron'); // 1. Adicionado 'protocol'
const fs = require('fs');
const path = require('path');
const db = require('../../database/db');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    icon: path.join(__dirname, '../../build/icons/icon.ico'), 
  });

  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => (mainWindow = null));
}

app.whenReady().then(async () => {
  // 2. ADIÇÃO DO PROTOCOLO SEGURO (ESSENCIAL PARA AS FOTOS)
  protocol.registerFileProtocol('safe-file', (request, callback) => {
    const url = request.url.replace('safe-file://', '');
    const decodedUrl = decodeURI(url);
    try {
      return callback(path.normalize(decodedUrl));
    } catch (error) {
      console.error('ERRO: Não foi possível carregar o arquivo via protocolo safe-file:', error);
      return callback({ error: -6 }); // FILE_NOT_FOUND
    }
  });

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

// --- IPC HANDLERS ---
ipcMain.handle('load-laudos', async () => {
  try {
    const laudos = await db.loadLaudos(); 
    return { success: true, data: laudos };
  } catch (error) {
    console.error(error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-laudo', async (event, id) => {
  try {
    const laudo = await db.getLaudo(id); 
    return { success: true, data: laudo };
  } catch (error) {
    console.error(error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('save-laudo', async (event, laudoData) => {
  try {
    const result = await db.saveLaudo(laudoData);
    return { success: true, data: { id: result.id || laudoData.id } };
  } catch (error) {
    console.error(error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('delete-laudo', async (event, id) => {
  try {
    const result = await db.deleteLaudo(id);
    return { success: true, data: result };
  } catch (error) {
    console.error(error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('export-word', async (event, laudoData) => {
  try {
    const { filePath } = await dialog.showSaveDialog(mainWindow, {
      defaultPath: `laudo-${laudoData.numero_processo || Date.now()}.docx`,
      filters: [{ name: 'Documentos Word', extensions: ['docx'] }],
    });
    if (!filePath) return { success: false, error: 'Operação cancelada' };
    console.log(`Salvar laudo em: ${filePath}`);
    return { success: true, data: { path: filePath } };
  } catch (error) {
    console.error(error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('select-photos', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile', 'multiSelections'],
    filters: [{ name: 'Images', extensions: ['jpg', 'png', 'gif', 'jpeg'] }]
  });
  if (result.canceled) {
    return { success: false, error: 'Seleção cancelada' };
  }
  const imagesDir = path.join(app.getPath('userData'), 'laudo_images');
  if (!fs.existsSync(imagesDir)){
      fs.mkdirSync(imagesDir);
  }
  const newPaths = [];
  for (const oldPath of result.filePaths) {
    const fileName = `${Date.now()}-${path.basename(oldPath)}`;
    const newPath = path.join(imagesDir, fileName);
    fs.copyFileSync(oldPath, newPath);
    newPaths.push(newPath);
  }
  return { success: true, paths: newPaths };
});