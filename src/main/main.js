// main.js
const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const db = require('./database/db'); // ajuste conforme seu caminho real

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    icon: path.join(__dirname, 'build/icons/icon.ico'),
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer/index.html'));

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
    const laudos = await db.getAllLaudos();
    return { success: true, data: laudos };
  } catch (error) {
    console.error(error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-laudo', async (event, id) => {
  try {
    const laudo = await db.getLaudoById(id);
    return { success: true, data: laudo };
  } catch (error) {
    console.error(error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('save-laudo', async (event, laudoData) => {
  try {
    const result = await db.saveLaudo(laudoData);
    return { success: true, data: { id: result.id } };
  } catch (error) {
    console.error(error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('update-laudo', async (event, id, laudoData) => {
  try {
    const result = await db.updateLaudo(id, laudoData);
    return { success: true, data: result };
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

ipcMain.handle('export-laudo', async (event, laudoData) => {
  try {
    const { filePath } = await dialog.showSaveDialog(mainWindow, {
      defaultPath: `laudo-${Date.now()}.docx`,
      filters: [{ name: 'Documentos Word', extensions: ['docx'] }],
    });

    if (!filePath) return { success: false, error: 'Operação cancelada' };

    // Aqui você implementa a geração do Word (docx)
    // Ex.: gerarDocx(laudoData, filePath)

    return { success: true, data: { path: filePath } };
  } catch (error) {
    console.error(error);
    return { success: false, error: error.message };
  }
});
