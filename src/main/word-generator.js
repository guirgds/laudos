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

function generateWordDocument(data, outputPath) {
  return new Promise((resolve, reject) => {
    try {
      console.log("📝 Iniciando geração do documento Word com imagens...");
      
      const templatePath = path.join(__dirname, '../../assets/molde-laudo.docx');
      
      if (!fs.existsSync(templatePath)) {
        throw new Error(`Template não encontrado: ${templatePath}`);
      }

      const content = fs.readFileSync(templatePath, 'binary');
      const zip = new PizZip(content);
      
      const imageOpts = {
        centered: false,
        // A função getImage recebe o valor da tag (o caminho do arquivo) 
        // e deve retornar o conteúdo da imagem como um Buffer.
        getImage: (tagValue) => {
          if (tagValue && fs.existsSync(tagValue)) {
            return fs.readFileSync(tagValue);
          }
          return null; // Retorna nulo se o arquivo não existir
        },
        // Define um tamanho padrão para todas as imagens no documento
        getSize: () => [450, 300], // [largura, altura] em pixels
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

      // Processa todos os outros dados complexos
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
      // 1. Lê os caminhos das fotos a partir dos dados.
      const fotoPaths = safeParse(data.fotos_paths);
      // 2. Transforma o array de caminhos em um array de objetos.
      //    Isso torna a tag no template explícita e menos propensa a erros.
      renderData.fotos = fotoPaths.map(p => ({ image: p }));
      
      console.log(`🎯 Renderizando documento com ${renderData.fotos.length} fotos...`);
      
      // 3. Passa os dados diretamente para o método .render()
      doc.render(renderData);

      const buf = doc.getZip().generate({ type: 'nodebuffer' });
      fs.writeFileSync(outputPath, buf);

      console.log(`✅ Documento Word gerado com sucesso em: ${outputPath}`);
      resolve({ 
        success: true, 
        path: outputPath,
        message: "Laudo exportado com sucesso (com imagens)"
      });

    } catch (error) {
      console.error("❌ Erro CRÍTICO ao gerar documento Word:", error);
      reject(error);
    }
  });
}

module.exports = { generateWordDocument };