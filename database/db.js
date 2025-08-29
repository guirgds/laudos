const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const { app } = require('electron');

let db;
let dbPath;

function initDatabase() {
  return new Promise((resolve, reject) => {
    // Define dbPath (depende se está em dev ou produção)
    if (process.env.NODE_ENV === 'development') {
      dbPath = path.join(__dirname, '..', 'laudos.db');
    } else {
      dbPath = path.join(app.getPath('userData'), 'database', 'laudos.db');
      const dbDir = path.dirname(dbPath);
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
      }
    }

    db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('Erro ao conectar com o banco de dados:', err);
        reject(err);
      } else {
        console.log('Conectado ao banco de dados SQLite.');

        db.serialize(() => {
          db.run(`
            CREATE TABLE IF NOT EXISTS laudos (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              numero_processo TEXT NOT NULL,
              cidade TEXT,
              reclamante TEXT NOT NULL,
              reclamada TEXT,
              data_admissao TEXT,
              data_demissao TEXT,
              funcao_reclamante TEXT,
              data_nascimento TEXT,
              cpf TEXT,
              naturalidade TEXT,
              horario_trabalho TEXT,
              empresa_atual TEXT,
              funcao_atual TEXT,
              queixa_principal TEXT,
              inicio_sintomas TEXT,
              sintomas_detalhes TEXT,
              zumbido TEXT,
              antecedentes TEXT,
              uso_protetor TEXT,
              altura REAL,
              peso REAL,
              pressao_arterial TEXT,
              otoscopia TEXT,
              oroscopia TEXT,
              orofaringe TEXT,
              data_pericia TEXT,
              hora_pericia TEXT,
              diagnostico TEXT,
              relacao_causal TEXT,
              nexo_tecnico TEXT,
              aptidao TEXT,
              reducao_capacidade TEXT,
              percentual_reducao INTEGER,
              valor_honorarios REAL,
              valor_por_extenso TEXT,
              data_laudo TEXT,
              perito TEXT,
              crm TEXT,
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
          `);

          // Índices (otimizam buscas)
          db.run(`CREATE INDEX IF NOT EXISTS idx_numero_processo ON laudos (numero_processo)`);
          db.run(`CREATE INDEX IF NOT EXISTS idx_reclamante ON laudos (reclamante)`);
          db.run(`CREATE INDEX IF NOT EXISTS idx_cpf ON laudos (cpf)`);
        });

        resolve();
      }
    });
  });
}

// 🔹 Insere ou atualiza um laudo dinamicamente
function saveLaudo(laudoData) {
  return new Promise((resolve, reject) => {
    const fields = Object.keys(laudoData).filter(f => f !== 'id'); // todos menos id
    const values = fields.map(f => laudoData[f]);

    if (laudoData.id) {
      // UPDATE dinâmico
      const setClause = fields.map(f => `${f} = ?`).join(', ');
      const sql = `UPDATE laudos SET ${setClause} WHERE id = ?`;
      db.run(sql, [...values, laudoData.id], function (err) {
        if (err) reject(err);
        else resolve({ updated: this.changes });
      });
    } else {
      // INSERT dinâmico
      const placeholders = fields.map(() => '?').join(', ');
      const sql = `INSERT INTO laudos (${fields.join(', ')}) VALUES (${placeholders})`;
      db.run(sql, values, function (err) {
        if (err) reject(err);
        else resolve({ id: this.lastID });
      });
    }
  });
}

// 🔹 Lista todos os laudos
function loadLaudos() {
  return new Promise((resolve, reject) => {
    db.all(`SELECT * FROM laudos ORDER BY created_at DESC`, [], (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

// 🔹 Busca laudo por ID
function getLaudo(id) {
  return new Promise((resolve, reject) => {
    db.get(`SELECT * FROM laudos WHERE id = ?`, [id], (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

// 🔹 Exclui laudo por ID
function deleteLaudo(id) {
  return new Promise((resolve, reject) => {
    db.run(`DELETE FROM laudos WHERE id = ?`, [id], function (err) {
      if (err) reject(err);
      else resolve({ deleted: this.changes });
    });
  });
}

module.exports = {
  initDatabase,
  saveLaudo,
  loadLaudos,
  getLaudo,
  deleteLaudo
};
