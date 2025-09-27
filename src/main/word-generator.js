// src/main/word-generator.js

const fs = require('fs');
const path = require('path');
const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');
const ImageModule = require('docxtemplater-image-module');

/**
 * Função para formatar a data por extenso
 * Converte 'YYYY-MM-DD' para 'dd de mês de yyyy'.
 * @param {string} dateString - A data no formato YYYY-MM-DD.
 * @returns {string} - A data formatada.
 */
function formatDateToExtensive(dateString) {
  if (!dateString) return '';
  // Corrige o problema de fuso horário que pode alterar o dia
  const date = new Date(dateString);
  const offset = date.getTimezoneOffset() * 60000;
  const correctedDate = new Date(date.getTime() + offset);

  return correctedDate.toLocaleDateString('pt-BR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function generateWordDocument(data, outputPath) {
  return new Promise((resolve, reject) => {
    try {
      const templatePath = path.join(__dirname, '../../assets/molde-laudo.docx');
      const content = fs.readFileSync(templatePath, 'binary');

      const imageOpts = {
        centered: false,
        getImage: function(tagValue) {
          return fs.readFileSync(tagValue);
        },
        getSize: function() {
          return [450, 300];
        },
      };

      const zip = new PizZip(content);
      const doc = new Docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,
        modules: [new ImageModule(imageOpts)],
      });

      const renderData = { ...data };

      if (renderData.fotos_paths) {
        try {
          renderData.fotos = JSON.parse(renderData.fotos_paths);
        } catch (e) {
          console.error("Erro ao processar os caminhos das fotos:", e);
          renderData.fotos = [];
        }
      }
      
      // --- ALTERAÇÃO AQUI: Formatando APENAS a data do laudo ---
      if (renderData.data_laudo) {
        // Adiciona a cidade antes da data formatada
        renderData.data_laudo = `Porto Alegre, ${formatDateToExtensive(renderData.data_laudo)}`;
      }
      // --- FIM DA ALTERAÇÃO ---

      doc.setData(renderData);
      doc.render();

      const buf = doc.getZip().generate({ type: 'nodebuffer' });
      fs.writeFileSync(outputPath, buf);

      console.log(`Documento gerado com sucesso em: ${outputPath}`);
      resolve({ success: true, path: outputPath });

    } catch (error) {
      console.error("Erro ao gerar o documento Word:", error);
      reject(error);
    }
  });
}

module.exports = { generateWordDocument };