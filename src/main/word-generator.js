// src/main/word-generator.js

const fs = require('fs');
const path = require('path');
const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');
const ImageModule = require('docxtemplater-image-module');

function generateWordDocument(data, outputPath) {
  return new Promise((resolve, reject) => {
    try {
      const templatePath = path.join(__dirname, '../../assets/molde-laudo.docx');
      const content = fs.readFileSync(templatePath, 'binary');

      // --- CONFIGURAÇÃO DO MÓDULO DE IMAGEM ---
      const imageOpts = {
        centered: false, // As imagens não serão centralizadas por padrão
        getImage: function(tagValue, tagName) {
          // tagValue é o caminho do arquivo da imagem (ex: C:\Users\...)
          return fs.readFileSync(tagValue);
        },
        getSize: function(img, tagValue, tagName) {
          // Define o tamanho da imagem no documento. [Largura, Altura] em pixels.
          // Você pode ajustar estes valores como desejar.
          return [450, 300]; 
        }
      };

      const zip = new PizZip(content);
      const doc = new Docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,
        modules: [new ImageModule(imageOpts)] // Anexa o módulo de imagem
      });

      // Prepara os dados
      const renderData = { ...data };

      // Converte a string JSON de fotos de volta para um array de caminhos
      if (renderData.fotos_paths) {
        try {
          // Cria um novo campo 'fotos' que o docxtemplater usará para o loop
          renderData.fotos = JSON.parse(renderData.fotos_paths);
        } catch (e) {
          console.error("Erro ao processar os caminhos das fotos:", e);
          renderData.fotos = [];
        }
      }
      
      // Formata datas
      // ... (seu código de formatação de datas existente) ...

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

// ... (sua função formatDate existente) ...

module.exports = { generateWordDocument };