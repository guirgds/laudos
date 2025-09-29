// src/main/word-generator.js

const fs = require('fs');
const path = require('path');
const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');

function formatDateToExtensive(dateString) {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    return date.toLocaleDateString('pt-BR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch (e) {
    return '';
  }
}

function generateWordDocument(data, outputPath) {
  return new Promise((resolve, reject) => {
    try {
      const templatePath = path.join(__dirname, '../../assets/molde-laudo.docx');
      
      if (!fs.existsSync(templatePath)) {
        throw new Error(`Template não encontrado: ${templatePath}`);
      }

      const content = fs.readFileSync(templatePath, 'binary');
      const zip = new PizZip(content);
      
      const doc = new Docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,
      });

      // Preparar dados básicos
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
        apto: data.apto || '',
        data_pericia: data.data_pericia || '',
        hora_pericia: data.hora_pericia || '',
        valor_honorarios: data.valor_honorarios || '',
        valor_por_extenso: data.valor_por_extenso || ''
      };

      // Data formatada
      if (data.data_laudo) {
        renderData.data_laudo = `Porto Alegre, ${formatDateToExtensive(data.data_laudo)}`;
      }

      // CORREÇÃO: ESTRUTURA ANINHADA CORRETA
      console.log("📊 Dados brutos de exames_especificos:", data.exames_especificos);
      
      if (data.exames_especificos && typeof data.exames_especificos === 'object') {
        // ESTRUTURA CORRETA PARA TEMPLATE ANINHADO
        renderData.exames_especificos = {
          modelo: data.exames_especificos.modelo || '',
          testes: []
        };
        
        // Processar testes se existirem
        if (data.exames_especificos.testes && typeof data.exames_especificos.testes === 'object') {
          renderData.exames_especificos.testes = Object.entries(data.exames_especificos.testes).map(([key, value]) => {
            return {
              key: key || '',
              value: value || ''
            };
          });
        }
      } else {
        // Estrutura vazia mas válida
        renderData.exames_especificos = {
          modelo: '',
          testes: []
        };
      }

      console.log("✅ Estrutura final de exames_especificos:");
      console.log(JSON.stringify(renderData.exames_especificos, null, 2));

      // Processar arrays simples
      const safeParse = (value, fallback = []) => {
        if (!value) return fallback;
        if (Array.isArray(value)) return value;
        if (typeof value === 'object') return value;
        if (typeof value === 'string') {
          try {
            return JSON.parse(value);
          } catch(e) {
            return fallback;
          }
        }
        return fallback;
      };

      renderData.quesitos_juizo = safeParse(data.quesitos_juizo).filter(q => q && (q.pergunta || q.resposta));
      renderData.quesitos_reclamante = safeParse(data.quesitos_reclamante).filter(q => q && (q.pergunta || q.resposta));
      renderData.quesitos_reclamada = safeParse(data.quesitos_reclamada).filter(q => q && (q.pergunta || q.resposta));
      renderData.exames_complementares = safeParse(data.exames_complementares);
      renderData.passado_laboral = safeParse(data.passado_laboral);

      // FOTOS - vazias por enquanto
      renderData.fotos = [];

      console.log("Renderizando documento...");
      doc.setData(renderData);
      doc.render();

      const buf = doc.getZip().generate({ type: 'nodebuffer' });
      
      const outputDir = path.dirname(outputPath);
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }
      
      fs.writeFileSync(outputPath, buf);

      console.log(`✅ Documento gerado com sucesso em: ${outputPath}`);
      resolve({ success: true, path: outputPath });

    } catch (error) {
      console.error("❌ Erro ao gerar documento:", error);
      reject(error);
    }
  });
}

module.exports = { generateWordDocument };