// database/db.js - VERSÃO FINAL CORRIGIDA COM JSON EM exames_especificos

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const { app } = require('electron');

let db;

// --- FUNÇÕES UTILITÁRIAS (PROMISIFY) ---
function runAsync(database, sql, params = []) {
  return new Promise((resolve, reject) => {
    database.run(sql, params, function (err) {
      if (err) return reject(new Error(`Erro na query: ${sql} - ${err.message}`));
      resolve(this);
    });
  });
}

function getAsync(database, sql, params = []) {
  return new Promise((resolve, reject) => {
    database.get(sql, params, (err, row) => {
      if (err) return reject(new Error(`Erro na query: ${sql} - ${err.message}`));
      resolve(row);
    });
  });
}

function allAsync(database, sql, params = []) {
  return new Promise((resolve, reject) => {
    database.all(sql, params, (err, rows) => {
      if (err) return reject(new Error(`Erro na query: ${sql} - ${err.message}`));
      resolve(rows);
    });
  });
}

// --- LÓGICA DE INICIALIZAÇÃO ---
async function seedInitialData(database) {
  const row = await getAsync(database, 'SELECT COUNT(*) as count FROM doencas');
  if (row.count > 0) {
    console.log('O banco de dados de doenças já contém dados.');
    return;
  }

  console.log('Inserindo dados iniciais (PAIR, LER/DORT)...');
  const defaultDoencas = [
    {
      nome: 'PAIR',
      testes: [
        { label: 'Otoscopia', placeholder: 'Sem particularidades' },
        { label: 'Oroscopia', placeholder: 'Sem particularidades' },
        { label: 'Orofaringe', placeholder: 'Sem particularidades' }
      ]
    },
    {
      nome: 'LER/DORT',
      testes: [
        { label: 'Inspeção', placeholder: 'Sem edemas, deformidades ou sinais flogísticos' },
        { label: 'Palpação', placeholder: 'Musculatura normotrófica, sem contraturas' },
        { label: 'Mobilidade Articular', placeholder: 'Amplitude de movimentos preservada' },
        { label: 'Testes Especiais (Phalen, Tinel, etc.)', placeholder: 'Negativos' }
      ]
    }
  ];

  await runAsync(database, 'BEGIN TRANSACTION;');
  try {
    for (const doenca of defaultDoencas) {
      const result = await runAsync(database, 'INSERT INTO doencas (nome) VALUES (?)', [doenca.nome]);
      const doencaId = result.lastID;
      for (const teste of doenca.testes) {
        const test_id = (doenca.nome + '_' + teste.label)
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9]/g, '_')
          .replace(/_{2,}/g, '_');
        await runAsync(database,
          'INSERT INTO testes (doenca_id, label, placeholder, test_id) VALUES (?, ?, ?, ?)',
          [doencaId, teste.label, teste.placeholder, test_id]
        );
      }
    }
    await runAsync(database, 'COMMIT;');
    console.log('Dados iniciais inseridos com sucesso.');
  } catch (error) {
    await runAsync(database, 'ROLLBACK;');
    throw new Error(`Falha ao inserir dados iniciais: ${error.message}`);
  }
}

function initDatabase() {
  return new Promise((resolve, reject) => {
    try {
      const isDev = process.mainModule.filename.indexOf('app.asar') === -1;
      const dbBaseDir = isDev
        ? path.join(__dirname, '..')
        : path.dirname(app.getPath('exe'));

      const dbDir = path.join(dbBaseDir, 'database', 'data');
      const dbPath = path.join(dbDir, 'laudos.db');

      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
        console.log('Diretório do banco de dados criado em:', dbDir);
      }

      db = new sqlite3.Database(dbPath, async (err) => {
        if (err) return reject(new Error(`Falha ao conectar ao arquivo do banco: ${err.message}`));
        console.log('Conexão com o banco de dados estabelecida em:', dbPath);

        try {
          await runAsync(db, 'PRAGMA journal_mode = WAL;');
          await runAsync(db, `CREATE TABLE IF NOT EXISTS laudos (id INTEGER PRIMARY KEY AUTOINCREMENT, numero_processo TEXT NOT NULL, vara_trabalho TEXT, cidade TEXT, reclamante TEXT NOT NULL, reclamada TEXT, data_admissao TEXT, data_demissao TEXT, funcao_reclamante TEXT, data_nascimento TEXT, idade TEXT, cpf TEXT, naturalidade TEXT, queixa_principal TEXT, historia_molestia TEXT, passado_laboral TEXT, altura REAL, peso REAL, imc REAL, fotos_paths TEXT, exame_fisico_geral TEXT, exames_especificos TEXT, exames_complementares TEXT, analise_pericial TEXT, referencial_tecnico TEXT, conclusao TEXT, apto_trabalho TEXT, quesitos_reclamante TEXT, quesitos_reclamada TEXT, quesitos_juizo TEXT, data_pericia TEXT, hora_pericia TEXT, perito TEXT, crm TEXT, valor_honorarios REAL, valor_por_extenso TEXT, data_laudo TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`);


          await runAsync(db, `CREATE TABLE IF NOT EXISTS doencas (id INTEGER PRIMARY KEY AUTOINCREMENT, nome TEXT NOT NULL UNIQUE)`);
          await runAsync(db, `CREATE TABLE IF NOT EXISTS testes (id INTEGER PRIMARY KEY AUTOINCREMENT, doenca_id INTEGER NOT NULL, label TEXT NOT NULL, placeholder TEXT, test_id TEXT NOT NULL, FOREIGN KEY (doenca_id) REFERENCES doencas (id) ON DELETE CASCADE)`);
          
          await seedInitialData(db);

          console.log('Inicialização do banco de dados concluída com sucesso.');
          resolve();
        } catch (initError) {
          reject(initError);
        }
      });
    } catch (pathErr) {
      reject(new Error(`Erro crítico ao determinar o caminho do DB: ${pathErr.message}`));
    }
  });
}

// --- FUNÇÕES CRUD ---

async function saveLaudo(laudoData) {
  // serializa exames_especificos como JSON
  if (laudoData.exames_especificos && typeof laudoData.exames_especificos !== "string") {
    laudoData.exames_especificos = JSON.stringify(laudoData.exames_especificos);
  }

  const fields = Object.keys(laudoData).filter(f => f !== 'id');
  if (laudoData.id) {
    const setClause = fields.map(f => `${f} = ?`).join(', ');
    const sql = `UPDATE laudos SET ${setClause} WHERE id = ?`;
    return runAsync(db, sql, [...fields.map(f => laudoData[f]), laudoData.id]);
  } else {
    const placeholders = fields.map(() => '?').join(', ');
    const sql = `INSERT INTO laudos (${fields.join(', ')}) VALUES (${placeholders})`;
    return runAsync(db, sql, fields.map(f => laudoData[f]));
  }
}

async function loadLaudos() {
  const laudos = await allAsync(db, `SELECT * FROM laudos ORDER BY created_at DESC`);
  // desserializa exames_especificos
  return laudos.map(l => ({
    ...l,
    exames_especificos: l.exames_especificos ? JSON.parse(l.exames_especificos) : null
  }));
}

async function getLaudo(id) {
  const laudo = await getAsync(db, `SELECT * FROM laudos WHERE id = ?`, [id]);
  if (laudo && laudo.exames_especificos) {
    try {
      laudo.exames_especificos = JSON.parse(laudo.exames_especificos);
    } catch {
      laudo.exames_especificos = null;
    }
  }
  return laudo;
}

function deleteLaudo(id) {
  return runAsync(db, `DELETE FROM laudos WHERE id = ?`, [id]);
}

async function getDoencasComTestes() {
  const rows = await allAsync(db, `SELECT d.id as doenca_id, d.nome, t.id as teste_id_pk, t.label, t.placeholder, t.test_id
                                   FROM doencas d LEFT JOIN testes t ON d.id = t.doenca_id
                                   ORDER BY d.nome, t.id;`);
  const doencas = {};
  rows.forEach(row => {
    if (!doencas[row.nome]) doencas[row.nome] = { id: row.doenca_id, testes: [] };
    if (row.teste_id_pk) {
      doencas[row.nome].testes.push({
        id: row.teste_id_pk,
        label: row.label,
        placeholder: row.placeholder,
        test_id: row.test_id
      });
    }
  });
  return doencas;
}

async function saveDoencaComTestes(doenca) {
  await runAsync(db, 'BEGIN TRANSACTION;');
  try {
    const result = await runAsync(db, 'INSERT INTO doencas (nome) VALUES (?)', [doenca.nome]);
    const doencaId = result.lastID;
    if (doenca.testes && doenca.testes.length > 0) {
      for (const teste of doenca.testes) {
        await runAsync(db, 'INSERT INTO testes (doenca_id, label, placeholder, test_id) VALUES (?, ?, ?, ?)',
          [doencaId, teste.label, teste.placeholder, teste.test_id]);
      }
    }
    await runAsync(db, 'COMMIT;');
    return { id: doencaId };
  } catch (error) {
    await runAsync(db, 'ROLLBACK;');
    throw error;
  }
}

function deleteDoenca(id) {
  return runAsync(db, `DELETE FROM doencas WHERE id = ?`, [id]);
}

async function updateDoenca(doencaData) {
  const { id, nome, testes } = doencaData;
  await runAsync(db, 'BEGIN TRANSACTION;');
  try {
    await runAsync(db, 'UPDATE doencas SET nome = ? WHERE id = ?', [nome, id]);
    await runAsync(db, 'DELETE FROM testes WHERE doenca_id = ?', [id]);
    if (testes && testes.length > 0) {
      for (const teste of testes) {
        const test_id = (nome + '_' + teste.label)
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9]/g, '_')
          .replace(/_{2,}/g, '_');
        await runAsync(db,
          'INSERT INTO testes (doenca_id, label, placeholder, test_id) VALUES (?, ?, ?, ?)',
          [id, teste.label, teste.placeholder, test_id]);
      }
    }
    await runAsync(db, 'COMMIT;');
    return { updated: id };
  } catch (error) {
    await runAsync(db, 'ROLLBACK;');
    throw error;
  }
}

module.exports = {
  initDatabase,
  saveLaudo,
  loadLaudos,
  getLaudo,
  deleteLaudo,
  deleteDoenca,
  updateDoenca,
  getDoencasComTestes,
  saveDoencaComTestes
};
