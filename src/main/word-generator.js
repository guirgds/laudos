// src/main/word-generator.js

const fs = require('fs');
const path = require('path');
const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');
const ImageModule = require('docxtemplater-image-module');

function formatDateToExtensive(dateString) {
  if (!dateString) return '';
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
        getImage: (tagValue) => fs.readFileSync(tagValue),
        getSize: () => [450, 300],
      };

      const zip = new PizZip(content);
      const doc = new Docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,
        modules: [new ImageModule(imageOpts)],
      });

      const renderData = { ...data };

      // --- BLOCO DE PROCESSAMENTO DE DADOS JSON (MAIS SEGURO) ---
      const parseJson = (jsonString, fallback = []) => {
          if (!jsonString) return fallback;
          try {
              return JSON.parse(jsonString);
          } catch(e) {
              console.error("Erro ao processar JSON:", e);
              return fallback;
          }
      };

      renderData.fotos = parseJson(renderData.fotos_paths);
      renderData.quesitos_juizo = parseJson(renderData.quesitos_juizo).filter(q => q.pergunta || q.resposta);
      renderData.quesitos_reclamante = parseJson(renderData.quesitos_reclamante).filter(q => q.pergunta || q.resposta);
      renderData.quesitos_reclamada = parseJson(renderData.quesitos_reclamada).filter(q => q.pergunta || q.resposta);
      renderData.exames_complementares = parseJson(renderData.exames_complementares);
      renderData.passado_laboral = parseJson(renderData.passado_laboral);
      
      let examesData = parseJson(renderData.exames_especificos, { modelo: '', testes: [] });
      if (examesData && examesData.testes) {
          examesData.testes = Object.entries(examesData.testes).map(([key, value]) => ({ key, value }));
      }
      renderData.exames_especificos = examesData;
      // --- FIM DO BLOCO DE PROCESSAMENTO ---
      
      if (renderData.data_laudo) {
        renderData.data_laudo = `Porto Alegre, ${formatDateToExtensive(renderData.data_laudo)}`;
      }

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