// src/main/main.js

const { app, BrowserWindow, ipcMain, dialog, protocol, shell } = require('electron'); 
const fs = require('fs');
const path = require('path');
const db = require('../../database/db');
const { generateWordDocument } = require('./word-generator');

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

  // BLOCO DE INICIALIZAÇÃO DO BANCO DE DADOS ATUALIZADO COM TRATAMENTO DE ERRO
  try {
    await db.initDatabase();
    console.log('Banco de dados pronto para uso.');
    createWindow();
  } catch (error) {
    console.error('FALHA CRÍTICA AO INICIAR BANCO DE DADOS:', error);
    dialog.showErrorBox(
      'Erro Crítico na Inicialização',
      `Não foi possível iniciar o banco de dados. O aplicativo será fechado.\n\nDetalhes: ${error.message}`
    );
    app.quit();
    return;
  }

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

ipcMain.handle('get-doencas', async () => {
  try {
      const doencas = await db.getDoencasComTestes();
      return { success: true, data: doencas };
  } catch (error) {
      console.error(error);
      return { success: false, error: error.message };
  }
});

ipcMain.handle('save-doenca', async (event, doenca) => {
  try {
      const result = await db.saveDoencaComTestes(doenca);
      return { success: true, data: result };
  } catch (error) {
      console.error(error);
      return { success: false, error: error.message };
  }
});

// --- NOVOS HANDLERS ADICIONADOS AQUI ---
ipcMain.handle('delete-doenca', async (event, id) => {
    try {
        await db.deleteDoenca(id);
        return { success: true };
    } catch (error) {
        console.error(error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('update-doenca', async (event, doencaData) => {
    try {
        await db.updateDoenca(doencaData);
        return { success: true };
    } catch (error) {
        console.error(error);
        return { success: false, error: error.message };
    }
});
// --- FIM DOS NOVOS HANDLERS ---


ipcMain.handle('export-word', async (event, laudoData) => {
  try {
    // Sanitiza o número do processo para ser um nome de arquivo válido
    // Substitui caracteres inválidos (qualquer coisa que não seja letra, número, ponto ou traço) por '_'
    const sanitizedProcessNumber = (laudoData.numero_processo || 'laudo').replace(/[^a-zA-Z0-9.-]/g, '_');

    const { filePath } = await dialog.showSaveDialog(mainWindow, {
      title: 'Salvar Laudo',
      // Agora o nome padrão do arquivo é o número do processo sanitizado
      defaultPath: `${sanitizedProcessNumber}.docx`,
      filters: [{ name: 'Documentos Word', extensions: ['docx'] }],
    });

    if (!filePath) {
      console.log('Operação de salvar foi cancelada.');
      return { success: false, error: 'Operação cancelada' };
    }

    await generateWordDocument(laudoData, filePath);
    await shell.openPath(filePath); 
    return { success: true, path: filePath };

  } catch (error) {
    console.error('Falha na exportação para Word:', error);
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