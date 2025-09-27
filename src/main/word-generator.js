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

      if (renderData.fotos_paths) {
        try {
          renderData.fotos = JSON.parse(renderData.fotos_paths);
        } catch (e) {
          renderData.fotos = [];
        }
      }
      
      if (renderData.data_laudo) {
        renderData.data_laudo = `Porto Alegre, ${formatDateToExtensive(renderData.data_laudo)}`;
      }
      
      // Lógica completa e correta para todos os quesitos
      try {
        const parseQuesitos = (quesitosStr) => {
          if (!quesitosStr) return [];
          const quesitos = JSON.parse(quesitosStr);
          // Filtra itens que são completamente vazios
          return quesitos.filter(q => q.pergunta || q.resposta);
        };
        
        renderData.quesitos_juizo = parseQuesitos(renderData.quesitos_juizo);
        renderData.quesitos_reclamante = parseQuesitos(renderData.quesitos_reclamante);
        renderData.quesitos_reclamada = parseQuesitos(renderData.quesitos_reclamada);

      } catch (e) {
        console.error("Erro ao processar quesitos:", e);
        renderData.quesitos_juizo = [];
        renderData.quesitos_reclamante = [];
        renderData.quesitos_reclamada = [];
      }

      doc.setData(renderData);
      doc.render();

      const buf = doc.getZip().generate({ type: 'nodebuffer' });
      fs.writeFileSync(outputPath, buf);

      console.log(`Documento gerado com sucesso em: ${outputPath}`);
      resolve({ success: true, path: outputPath });

    } catch (error)      {
      console.error("Erro ao gerar o documento Word:", error);
      reject(error);
    }
  });
}

module.exports = { generateWordDocument };