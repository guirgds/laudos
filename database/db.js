const sqlite3 = require('sqlite3').verbose();
const path = require('path');

let db;

function initDatabase() {
  return new Promise((resolve, reject) => {
    const dbPath = path.join(__dirname, '..', 'laudos.db');
    
    db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('Erro ao conectar com o banco de dados:', err);
        reject(err);
      } else {
        console.log('Conectado ao banco de dados SQLite.');
        createTables().then(resolve).catch(reject);
      }
    });
  });
}

function createTables() {
  return new Promise((resolve, reject) => {
    const createLaudosTable = `
      CREATE TABLE IF NOT EXISTS laudos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        numero_processo TEXT NOT NULL,
        cidade TEXT,
        reclamante TEXT,
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
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `;

    db.run(createLaudosTable, (err) => {
      if (err) {
        console.error('Erro ao criar tabela:', err);
        reject(err);
      } else {
        console.log('Tabela "laudos" verificada/criada com sucesso.');
        resolve();
      }
    });
  });
}

function saveLaudo(laudoData) {
  return new Promise((resolve, reject) => {
    const sql = `
      INSERT INTO laudos (
        numero_processo, cidade, reclamante, reclamada, data_admissao, data_demissao,
        funcao_reclamante, data_nascimento, cpf, naturalidade, horario_trabalho,
        empresa_atual, funcao_atual, queixa_principal, inicio_sintomas, sintomas_detalhes,
        zumbido, antecedentes, uso_protetor, altura, peso, pressao_arterial, otoscopia,
        oroscopia, orofaringe, data_pericia, hora_pericia, diagnostico, relacao_causal,
        nexo_tecnico, aptidao, reducao_capacidade, percentual_reducao, valor_honorarios,
        valor_por_extenso, data_laudo
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      laudoData.numero_processo, laudoData.cidade, laudoData.reclamante, laudoData.reclamada,
      laudoData.data_admissao, laudoData.data_demissao, laudoData.funcao_reclamante,
      laudoData.data_nascimento, laudoData.cpf, laudoData.naturalidade, laudoData.horario_trabalho,
      laudoData.empresa_atual, laudoData.funcao_atual, laudoData.queixa_principal,
      laudoData.inicio_sintomas, laudoData.sintomas_detalhes, laudoData.zumbido,
      laudoData.antecedentes, laudoData.uso_protetor, laudoData.altura, laudoData.peso,
      laudoData.pressao_arterial, laudoData.otoscopia, laudoData.oroscopia, laudoData.orofaringe,
      laudoData.data_pericia, laudoData.hora_pericia, laudoData.diagnostico, laudoData.relacao_causal,
      laudoData.nexo_tecnico, laudoData.aptidao, laudoData.reducao_capacidade,
      laudoData.percentual_reducao, laudoData.valor_honorarios, laudoData.valor_por_extenso,
      laudoData.data_laudo
    ];

    db.run(sql, params, function(err) {
      if (err) {
        reject(err);
      } else {
        resolve({ id: this.lastID });
      }
    });
  });
}

function getAllLaudos() {
  return new Promise((resolve, reject) => {
    const sql = `SELECT id, numero_processo, reclamante, reclamada, data_laudo FROM laudos ORDER BY created_at DESC`;
    
    db.all(sql, (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
}

function getLaudoById(id) {
  return new Promise((resolve, reject) => {
    const sql = `SELECT * FROM laudos WHERE id = ?`;
    
    db.get(sql, [id], (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve(row);
      }
    });
  });
}

function deleteLaudo(id) {
  return new Promise((resolve, reject) => {
    const sql = `DELETE FROM laudos WHERE id = ?`;
    
    db.run(sql, [id], function(err) {
      if (err) {
        reject(err);
      } else {
        resolve({ changes: this.changes });
      }
    });
  });
}

function closeDatabase() {
  return new Promise((resolve, reject) => {
    if (db) {
      db.close((err) => {
        if (err) {
          reject(err);
        } else {
          console.log('Conexão com o banco de dados fechada.');
          resolve();
        }
      });
    } else {
      resolve();
    }
  });
}

// Fechar a conexão com o banco quando o processo terminar
process.on('exit', () => {
  closeDatabase();
});

module.exports = {
  initDatabase,
  saveLaudo,
  getAllLaudos,
  getLaudoById,
  deleteLaudo,
  closeDatabase
};