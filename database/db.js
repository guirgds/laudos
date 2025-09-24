// database/db.js

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const { app } = require('electron');

let db;
let dbPath;

// NOVA FUNÇÃO para adicionar os dados iniciais
function seedInitialData(db) {
  return new Promise((resolve, reject) => {
    db.get('SELECT COUNT(*) as count FROM doencas', (err, row) => {
      if (err) return reject(err);

      // Roda apenas se a tabela de doenças estiver vazia
      if (row.count === 0) {
        console.log('Banco de dados de doenças vazio. Inserindo dados iniciais...');
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

        db.serialize(() => {
          const stmtDoenca = db.prepare('INSERT INTO doencas (nome) VALUES (?)');
          const stmtTeste = db.prepare('INSERT INTO testes (doenca_id, label, placeholder, test_id) VALUES (?, ?, ?, ?)');

          defaultDoencas.forEach(doenca => {
            stmtDoenca.run(doenca.nome, function(err) {
              if (err) {
                console.error(`Erro ao inserir doença ${doenca.nome}:`, err);
                return;
              }
              const doencaId = this.lastID;
              doenca.testes.forEach(teste => {
                const test_id = (doenca.nome + '_' + teste.label).trim().toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_{2,}/g, '_');
                stmtTeste.run(doencaId, teste.label, teste.placeholder, test_id);
              });
            });
          });

          stmtDoenca.finalize();
          stmtTeste.finalize(err => {
            if (err) reject(err);
            else {
              console.log('Dados iniciais de doenças inseridos com sucesso.');
              resolve();
            }
          });
        });
      } else {
        console.log('Banco de dados de doenças já contém dados.');
        resolve();
      }
    });
  });
}


function initDatabase() {
  return new Promise((resolve, reject) => {
    const dbDir = app ? path.join(app.getPath('userData'), 'database') : path.join(__dirname, 'user_data');
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }
    dbPath = path.join(dbDir, 'laudos.db');

    db = new sqlite3.Database(dbPath, async (err) => { // Tornando o callback async
      if (err) {
        console.error('Erro ao conectar com o banco de dados:', err);
        reject(err);
      } else {
        console.log('Conectado ao banco de dados SQLite em:', dbPath);

        const createTables = () => new Promise((res, rej) => {
          db.serialize(() => {
            db.run(`
              CREATE TABLE IF NOT EXISTS laudos (
                id INTEGER PRIMARY KEY AUTOINCREMENT, numero_processo TEXT NOT NULL, vara_trabalho TEXT, cidade TEXT, reclamante TEXT NOT NULL, reclamada TEXT, data_admissao TEXT, data_demissao TEXT, funcao_reclamante TEXT, data_nascimento TEXT, cpf TEXT, naturalidade TEXT, queixa_principal TEXT, historia_molestia TEXT, passado_laboral TEXT, altura REAL, peso REAL, imc REAL, fotos_paths TEXT, exame_fisico_geral TEXT, exames_complementares TEXT, analise_pericial TEXT, referencial_tecnico TEXT, conclusao TEXT, quesitos_juizo TEXT, data_pericia TEXT, hora_pericia TEXT, perito TEXT, crm TEXT, valor_honorarios REAL, valor_por_extenso TEXT, data_laudo TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP
              )
            `);
            db.run(`CREATE TABLE IF NOT EXISTS doencas (id INTEGER PRIMARY KEY AUTOINCREMENT, nome TEXT NOT NULL UNIQUE)`);
            db.run(`
              CREATE TABLE IF NOT EXISTS testes (
                id INTEGER PRIMARY KEY AUTOINCREMENT, doenca_id INTEGER NOT NULL, label TEXT NOT NULL, placeholder TEXT, test_id TEXT NOT NULL, FOREIGN KEY (doenca_id) REFERENCES doencas (id) ON DELETE CASCADE
              )
            `, (err) => {
              if (err) rej(err); else res();
            });
          });
        });

        try {
          await createTables();
          await seedInitialData(db); // CHAMANDO A NOVA FUNÇÃO AQUI
          resolve();
        } catch (error) {
          reject(error);
        }
      }
    });
  });
}

// 🔹 Insere ou atualiza um laudo dinamicamente
function saveLaudo(laudoData) {
  return new Promise((resolve, reject) => {
    const fields = Object.keys(laudoData).filter(f => f !== 'id');
    const values = fields.map(f => laudoData[f]);

    if (laudoData.id) {
      const setClause = fields.map(f => `${f} = ?`).join(', ');
      const sql = `UPDATE laudos SET ${setClause} WHERE id = ?`;
      db.run(sql, [...values, laudoData.id], function (err) {
        if (err) reject(err); else resolve({ updated: this.changes });
      });
    } else {
      const placeholders = fields.map(() => '?').join(', ');
      const sql = `INSERT INTO laudos (${fields.join(', ')}) VALUES (${placeholders})`;
      db.run(sql, values, function (err) {
        if (err) reject(err); else resolve({ id: this.lastID });
      });
    }
  });
}

// 🔹 Lista todos os laudos
function loadLaudos() {
  return new Promise((resolve, reject) => {
    db.all(`SELECT * FROM laudos ORDER BY created_at DESC`, [], (err, rows) => {
      if (err) reject(err); else resolve(rows);
    });
  });
}

// 🔹 Busca laudo por ID
function getLaudo(id) {
  return new Promise((resolve, reject) => {
    db.get(`SELECT * FROM laudos WHERE id = ?`, [id], (err, row) => {
      if (err) reject(err); else resolve(row);
    });
  });
}

// 🔹 Exclui laudo por ID
function deleteLaudo(id) {
  return new Promise((resolve, reject) => {
    db.run(`DELETE FROM laudos WHERE id = ?`, [id], function (err) {
      if (err) reject(err); else resolve({ deleted: this.changes });
    });
  });
}

// --- FUNÇÕES PARA GERENCIAR DOENÇAS E TESTES ---

function getDoencasComTestes() {
  return new Promise((resolve, reject) => {
    const sql = `
      SELECT 
        d.id as doenca_id, d.nome, t.id as teste_id_pk, t.label, t.placeholder, t.test_id
      FROM doencas d LEFT JOIN testes t ON d.id = t.doenca_id
      ORDER BY d.nome, t.id;
    `;
    db.all(sql, [], (err, rows) => {
      if (err) return reject(err);
      const doencas = {};
      rows.forEach(row => {
        if (!doencas[row.nome]) {
          doencas[row.nome] = { id: row.doenca_id, testes: [] };
        }
        if (row.teste_id_pk) {
          doencas[row.nome].testes.push({
            id: row.teste_id_pk, label: row.label, placeholder: row.placeholder, test_id: row.test_id
          });
        }
      });
      resolve(doencas);
    });
  });
}

function saveDoencaComTestes(doenca) {
  return new Promise((resolve, reject) => {
    db.run('INSERT INTO doencas (nome) VALUES (?)', [doenca.nome], function(err) {
      if (err) return reject(err);
      const doencaId = this.lastID;
      if (doenca.testes && doenca.testes.length > 0) {
        const stmt = db.prepare('INSERT INTO testes (doenca_id, label, placeholder, test_id) VALUES (?, ?, ?, ?)');
        doenca.testes.forEach(teste => {
          stmt.run(doencaId, teste.label, teste.placeholder, teste.test_id);
        });
        stmt.finalize(err => {
          if (err) reject(err); else resolve({ id: doencaId });
        });
      } else {
        resolve({ id: doencaId });
      }
    });
  });
}

module.exports = {
  initDatabase,
  saveLaudo,
  loadLaudos,
  getLaudo,
  deleteLaudo,
  getDoencasComTestes,
  saveDoencaComTestes
};