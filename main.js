const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const db = require('./database/db');

// Variável global para a janela principal
let mainWindow;

function createWindow() {
  // Criar a janela do navegador
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, 'public', 'icon.png') // Adicione um ícone se desejar
  });

  // Carregar o arquivo HTML
  mainWindow.loadFile('public/index.html');

  // Abrir o DevTools em modo de desenvolvimento
  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools();
  }

  // Evento quando a janela é fechada
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Este método será chamado quando o Electron terminar de inicializar
app.whenReady().then(() => {
  createWindow();
  
  // Inicializar o banco de dados
  db.initDatabase();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// Sair quando todas as janelas estiverem fechadas
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// IPC handlers para comunicação com o frontend
ipcMain.handle('save-laudo', async (event, laudoData) => {
  try {
    const result = await db.saveLaudo(laudoData);
    return { success: true, id: result.id };
  } catch (error) {
    console.error('Erro ao salvar laudo:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('load-laudos', async () => {
  try {
    const laudos = await db.getAllLaudos();
    return { success: true, data: laudos };
  } catch (error) {
    console.error('Erro ao carregar laudos:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-laudo', async (event, id) => {
  try {
    const laudo = await db.getLaudoById(id);
    return { success: true, data: laudo };
  } catch (error) {
    console.error('Erro ao carregar laudo:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('delete-laudo', async (event, id) => {
  try {
    await db.deleteLaudo(id);
    return { success: true };
  } catch (error) {
    console.error('Erro ao deletar laudo:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('export-word', async (event, laudoData) => {
  try {
    // Esta função seria implementada para gerar o documento Word
    // Por enquanto, vamos apenas simular
    const { filePath } = await dialog.showSaveDialog(mainWindow, {
      defaultPath: `laudo-${Date.now()}.docx`,
      filters: [
        { name: 'Documentos Word', extensions: ['docx'] }
      ]
    });
    
    if (filePath) {
      // Aqui você implementaria a geração do Word
      // Por exemplo, usando a biblioteca docx
      return { success: true, path: filePath };
    } else {
      return { success: false, error: 'Operação cancelada' };
    }
  } catch (error) {
    console.error('Erro ao exportar para Word:', error);
    return { success: false, error: error.message };
  }
});