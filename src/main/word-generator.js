// src/main/word-generator.js

const fs = require('fs');
const path = require('path');
const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');
const ImageModule = require("docxtemplater-image-module-free");

function formatDateToExtensive(dateString) {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    return date.toLocaleDateString('pt-BR', { year: 'numeric', month: 'long', day: 'numeric' });
  } catch (e) { return ''; }
}

/**
 * Agrupa um array de fotos em pares para exibição em uma tabela de duas colunas.
 * @param {string[]} photoPaths Array com os caminhos das fotos.
 * @returns {Array<Object>} Array de objetos, onde cada objeto representa uma linha da tabela.
 * Exemplo de retorno: [ { col1: 'path1.jpg', col2: 'path2.jpg' }, { col1: 'path3.jpg', col2: null } ]
 */
function groupPhotosInPairs(photoPaths) {
  const photoRows = [];
  for (let i = 0; i < photoPaths.length; i += 2) {
    photoRows.push({
      col1: photoPaths[i],      // A foto na primeira coluna
      col2: photoPaths[i + 1] || null, // A foto na segunda coluna (ou nulo se for ímpar)
    });
  }
  return photoRows;
}

function generateWordDocument(data, outputPath) {
  return new Promise((resolve, reject) => {
    try {
      console.log("📝 Iniciando geração do documento Word...");
      
      const templatePath = path.join(__dirname, '../../assets/molde-laudo.docx');
      if (!fs.existsSync(templatePath)) throw new Error(`Template não encontrado: ${templatePath}`);

      const content = fs.readFileSync(templatePath, 'binary');
      const zip = new PizZip(content);
      
      const imageOpts = {
        centered: true,
        getImage: (tagValue) => {
          // Retorna nulo se tagValue for nulo (célula vazia) ou se o arquivo não existir
          if (tagValue && fs.existsSync(tagValue)) {
            return fs.readFileSync(tagValue);
          }
          return null;
        },
        // Tamanho um pouco menor para caberem 2 fotos lado a lado confortavelmente
        getSize: () => [300, 225], 
      };
      
      const doc = new Docxtemplater(zip, {
        modules: [new ImageModule(imageOpts)],
        paragraphLoop: true,
        linebreaks: true,
      });

      // --- Preparação dos Dados ---
      const renderData = { 
        vara_trabalho: data.vara_trabalho || '',
        cidade: data.cidade || '',
        numero_processo: data.numero_processo || '',
        reclamante: data.reclamante || '',
        reclamada: data.reclamada || '',
        data_admissao: data.data_admissao || '',
        data_demissao: data.data_demissao || '',
        funcao_reclamante: data.funcao_reclamante || '',
        data_nascimento: data.data_nascimento || '',
        naturalidade: data.naturalidade || '',
        idade: data.idade || '',
        cpf: data.cpf || '',
        queixa_principal: data.queixa_principal || '',
        historia_molestia: data.historia_molestia || '',
        altura: data.altura || '',
        peso: data.peso || '',
        imc: data.imc || '',
        analise_pericial: data.analise_pericial || '',
        referencial_tecnico: data.referencial_tecnico || '',
        exame_fisico_geral: data.exame_fisico_geral || '',
        apto_trabalho: data.apto_trabalho || '',
        conclusao: data.conclusao || '',
        data_pericia: data.data_pericia || '',
        hora_pericia: data.hora_pericia || '',
        valor_honorarios: data.valor_honorarios || '',
        valor_por_extenso: data.valor_por_extenso || ''
      };

      if (data.data_laudo) {
        renderData.data_laudo = `Porto Alegre, ${formatDateToExtensive(data.data_laudo)}`;
      }

      const safeParse = (value, fallback = []) => {
        if (!value) return fallback;
        if (Array.isArray(value)) return value;
        try { return JSON.parse(value); } catch { return fallback; }
      };
      
      // Processa todos os outros dados
      renderData.quesitos_juizo = safeParse(data.quesitos_juizo);
      renderData.quesitos_reclamante = safeParse(data.quesitos_reclamante);
      renderData.quesitos_reclamada = safeParse(data.quesitos_reclamada);
      renderData.exames_complementares = safeParse(data.exames_complementares);
      renderData.passado_laboral = safeParse(data.passado_laboral);
      const examesData = safeParse(data.exames_especificos, { modelo: '', testes: {} });
      renderData.exames_especificos = {
          modelo: examesData.modelo || '',
          testes: Object.entries(examesData.testes || {}).map(([key, value]) => ({ key, value }))
      };

      // --- Lógica Final e Corrigida para as Fotos ---
      const fotoPaths = safeParse(data.fotos_paths);
      // Usamos a nova função para agrupar as fotos em pares (linhas de tabela)
      renderData.fotos = groupPhotosInPairs(fotoPaths);
      
      console.log(`🎯 Renderizando documento com ${fotoPaths.length} fotos em ${renderData.fotos.length} linhas...`);
      doc.render(renderData);

      const buf = doc.getZip().generate({ type: 'nodebuffer' });
      fs.writeFileSync(outputPath, buf);

      console.log(`✅ Documento Word gerado com sucesso em: ${outputPath}`);
      resolve({ success: true, path: outputPath });

    } catch (error) {
      console.error("❌ Erro CRÍTICO ao gerar documento Word:", error);
      reject(error);
    }
  });
}

module.exports = { generateWordDocument };