const path = require('path');

// Simula o contexto do Electron para que o script do banco de dados funcione
global.app = {
  getPath: (name) => {
    if (name === 'userData') {
      return path.join(__dirname, 'database', 'user_data');
    }
    return '';
  }
};

const db = require(path.join(__dirname, 'database', 'db.js'));

async function testDatabase() {
  try {
    await db.initDatabase();
    console.log('✅ TESTE CONCLUÍDO: Conexão com o banco de dados bem-sucedida!');
  } catch (error) {
    console.error('❌ TESTE FALHOU: Erro na conexão com o banco de dados.');
    console.error(error);
  }
}

testDatabase();