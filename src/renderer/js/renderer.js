// renderer.js - VERSÃO FINAL COM EXAMES FÍSICOS DINÂMICOS

// Variáveis globais
let currentView = 'list';
let editingId = null;
let currentPhotoPaths = [];

// Elementos da interface
const listView = document.getElementById('list-view');
const formView = document.getElementById('form-view');
const loadingView = document.getElementById('loading-view');
const laudosList = document.getElementById('laudos-list');
const btnNew = document.getElementById('btn-new');
const btnList = document.getElementById('btn-list');
const btnCancel = document.getElementById('btn-cancel');
const laudoForm = document.getElementById('laudo-form');

// --- FUNÇÕES DE SETUP DA UI DINÂMICA ---
function setupQuesitosUI() {
    const container = document.getElementById('quesitos-group-container');
    if (!container) return;
    const quesitoTemplate = (type, title) => `<div class="mb-3"><h5>${title}</h5><div id="quesitos-${type}-list" class="quesitos-list"></div><button type="button" class="btn btn-outline-secondary btn-sm mt-2" data-type="${type}">Adicionar Pergunta</button></div>`;
    container.innerHTML = quesitoTemplate('juizo', 'Quesitos do Juízo');
}

// --- INICIALIZAÇÃO E EVENTOS PRINCIPAIS ---
document.addEventListener('DOMContentLoaded', () => {
    const yearSpan = document.getElementById('year');
    if (yearSpan) yearSpan.textContent = new Date().getFullYear();
    
    loadLaudos();

    const inputs = {
        processo: document.getElementById('numero_processo'),
        cpf: document.getElementById('cpf'),
        valorHonorarios: document.getElementById('valor_honorarios'),
        dataNascimento: document.getElementById('data_nascimento'),
        idade: document.getElementById('idade'),
        peso: document.getElementById('peso'),
        altura: document.getElementById('altura'),
        imc: document.getElementById('imc'),
        btnAddPhoto: document.getElementById('btn-add-photo'),
        photosPreviewContainer: document.getElementById('photos-preview-container'),
        quesitosContainer: document.getElementById('quesitos-group-container'),
        examesListContainer: document.getElementById('exames-list-container'),
        btnAddExame: document.getElementById('btn-add-exame'),
        passadoLaboralList: document.getElementById('passado-laboral-list'),
        btnAddPassadoLaboral: document.getElementById('btn-add-passado-laboral'),
        selectTipoExame: document.getElementById('tipo-exame-especifico'),
        examesEspecificosContainer: document.getElementById('exames-especificos-container')
    };

    // Máscaras
    if (inputs.processo) IMask(inputs.processo, { mask: '0000000-00.0000.0.00.0000' });
    if (inputs.cpf) IMask(inputs.cpf, { mask: '000.000.000-00' });
    if (inputs.valorHonorarios) IMask(inputs.valorHonorarios, { mask: 'R$ num', blocks: { num: { mask: Number, scale: 2, thousandsSeparator: '.', padFractionalZeros: true, radix: ',' } } });

    // Cálculos e Eventos
    const calcularIMC = () => {
        const alturaStr = String(inputs.altura.value).replace(',', '.');
        const pesoStr = String(inputs.peso.value).replace(',', '.');
        let altura = parseFloat(alturaStr);
        let peso = parseFloat(pesoStr);
        if (isNaN(altura) || isNaN(peso)) { inputs.imc.value = ''; return; }
        if (altura > 3) altura = altura / 100;
        if (peso > 400) peso = peso / 10;
        if (peso > 0 && altura > 0) {
            const imc = peso / (altura * altura);
            let classificacao = '';
            if (imc < 18.5) classificacao = 'Abaixo do peso';
            else if (imc < 25) classificacao = 'Peso normal';
            else if (imc < 30) classificacao = 'Sobrepeso';
            else if (imc < 35) classificacao = 'Obesidade Grau I';
            else if (imc < 40) classificacao = 'Obesidade Grau II';
            else classificacao = 'Obesidade Grau III';
            inputs.imc.value = `${imc.toFixed(2).replace('.', ',')} (${classificacao})`;
        } else { inputs.imc.value = ''; }
    };
    
    const calcularIdade = () => {
        const dataValue = inputs.dataNascimento.value;
        if (!dataValue) { inputs.idade.value = ''; return; }
        const [year] = dataValue.split('-').map(Number);
        if (isNaN(year) || year > 9999 || year < 1000) { inputs.idade.value = 'Ano inválido'; return; }
        const hoje = new Date(); const nascimento = new Date(dataValue);
        nascimento.setHours(0, 0, 0, 0);
        if (nascimento > hoje) { inputs.idade.value = 'Data futura'; return; }
        let idade = hoje.getFullYear() - nascimento.getFullYear();
        const m = hoje.getMonth() - nascimento.getMonth();
        if (m < 0 || (m === 0 && hoje.getDate() < nascimento.getDate())) idade--;
        inputs.idade.value = idade;
    };

    if (inputs.dataNascimento) { inputs.dataNascimento.max = new Date().toISOString().split("T")[0]; inputs.dataNascimento.addEventListener('change', calcularIdade); }
    if (inputs.peso) inputs.peso.addEventListener('input', calcularIMC);
    if (inputs.altura) inputs.altura.addEventListener('input', calcularIMC);
    if (inputs.altura) { inputs.altura.addEventListener('blur', (e) => { let alturaVal = parseFloat(String(e.target.value).replace(',', '.')); if (!isNaN(alturaVal) && alturaVal > 3) e.target.value = (alturaVal / 100).toFixed(2).replace('.', ','); }); }
    if (inputs.peso) { inputs.peso.addEventListener('blur', (e) => { let pesoVal = parseFloat(String(e.target.value).replace(',', '.')); if (!isNaN(pesoVal) && pesoVal > 400) e.target.value = (pesoVal / 10).toFixed(1).replace('.', ','); }); }

    // Exames Físicos Específicos
    if (inputs.selectTipoExame && typeof examesEspecificos !== 'undefined') {
        inputs.selectTipoExame.innerHTML = '<option selected value="">Nenhum (Geral)</option>';
        for (const key in examesEspecificos) {
            const option = document.createElement('option');
            option.value = key;
            option.textContent = key;
            inputs.selectTipoExame.appendChild(option);
        }

        inputs.selectTipoExame.addEventListener('change', (e) => {
            const selectedKey = e.target.value;
            inputs.examesEspecificosContainer.innerHTML = '';
            if (selectedKey && examesEspecificos[selectedKey]) {
                const examesHtml = examesEspecificos[selectedKey].map(exame => `
                    <div class="col-md-6">
                        <label for="${exame.id}" class="form-label">${exame.label}</label>
                        <input type="text" class="form-control form-control-sm" id="${exame.id}" name="${exame.id}" placeholder="${exame.placeholder || ''}">
                    </div>
                `).join('');
                inputs.examesEspecificosContainer.innerHTML = examesHtml;
            }
        });
    }

    // Fotos, Exames Complementares, Passado Laboral, Quesitos
    const renderPhotos = () => { if(inputs.photosPreviewContainer) inputs.photosPreviewContainer.innerHTML = currentPhotoPaths.map((path, index) => `<div class="photo-thumbnail"><img src="${path.replaceAll('\\', '/')}" alt="Foto ${index + 1}" /><button type="button" class="remove-photo-btn" data-index="${index}">&times;</button></div>`).join(''); };
    if (inputs.btnAddPhoto) inputs.btnAddPhoto.addEventListener('click', async () => { const result = await window.electronAPI.selectPhotos(); if (result.success) { currentPhotoPaths.push(...result.paths); renderPhotos(); } });
    if (inputs.photosPreviewContainer) inputs.photosPreviewContainer.addEventListener('click', (e) => { if (e.target.classList.contains('remove-photo-btn')) { currentPhotoPaths.splice(parseInt(e.target.dataset.index, 10), 1); renderPhotos(); } });
    if (inputs.btnAddExame) { inputs.btnAddExame.addEventListener('click', () => { const newExame = document.createElement('div'); newExame.className = 'exame-item'; newExame.innerHTML = `<input type="text" class="form-control form-control-sm exame-descricao" placeholder="Ex: Audiometria de DD/MM/AAAA..."><button type="button" class="btn btn-danger btn-sm remove-btn remove-exame-btn">&times;</button>`; inputs.examesListContainer.appendChild(newExame); newExame.querySelector('input').focus(); }); }
    if (inputs.examesListContainer) { inputs.examesListContainer.addEventListener('click', (e) => { if (e.target.classList.contains('remove-exame-btn')) e.target.closest('.exame-item').remove(); }); }
    if (inputs.btnAddPassadoLaboral) { inputs.btnAddPassadoLaboral.addEventListener('click', () => { const newEntry = document.createElement('div'); newEntry.className = 'passado-laboral-item'; newEntry.innerHTML = `<input type="text" class="form-control form-control-sm laboral-empresa" placeholder="Empresa"><input type="text" class="form-control form-control-sm laboral-funcao" placeholder="Função"><input type="text" class="form-control form-control-sm laboral-periodo" placeholder="Período (ex: jan/2020 a dez/2022)"><button type="button" class="btn btn-danger btn-sm remove-btn remove-passado-laboral-btn">&times;</button>`; inputs.passadoLaboralList.appendChild(newEntry); newEntry.querySelector('.laboral-empresa').focus(); }); }
    if (inputs.passadoLaboralList) { inputs.passadoLaboralList.addEventListener('click', (e) => { if (e.target.classList.contains('remove-passado-laboral-btn')) e.target.closest('.passado-laboral-item').remove(); }); }
    if (inputs.quesitosContainer) { inputs.quesitosContainer.addEventListener('click', e => { const type = e.target.dataset.type; if (type) { const list = document.getElementById(`quesitos-${type}-list`); const quesitos = getQuesitosFromDOM(list); quesitos.push({ pergunta: '', resposta: '' }); renderQuesitos(list, quesitos); } if (e.target.classList.contains('remove-quesito-btn')) { const item = e.target.closest('.quesito-item'); const list = item.parentElement; item.remove(); list.querySelectorAll('.number').forEach((num, index) => { num.textContent = `${index + 1}.`; }); } }); }
});

// Botões Principais e Funções de Navegação
btnNew.addEventListener('click', () => showFormView());
btnList.addEventListener('click', loadLaudos);
btnCancel.addEventListener('click', () => { editingId = null; showListView(); });
laudoForm.addEventListener('submit', async (e) => { e.preventDefault(); await saveOrUpdateLaudo(); });
laudoForm.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') e.preventDefault(); });
function showFormView(id = null) { editingId = id; listView.style.display = 'none'; formView.style.display = 'block'; loadingView.classList.add('d-none'); if (id) { loadLaudoForEditing(id); } else { resetForm(); } }
function showListView() { listView.style.display = 'block'; formView.style.display = 'none'; loadingView.classList.add('d-none'); resetForm(); }
function showLoading() { listView.style.display = 'none'; formView.style.display = 'none'; loadingView.classList.remove('d-none'); loadingView.classList.add('d-flex'); }

// Funções CRUD
async function loadLaudos() { showLoading(); try { const result = await window.electronAPI.loadLaudos(); if (result.success) renderLaudosList(result.data); else showNotification('Erro ao carregar: ' + result.error, 'error'); } catch (error) { showNotification('Erro ao carregar: ' + error.message, 'error'); } showListView(); }
async function loadLaudoForEditing(id) { showLoading(); try { const result = await window.electronAPI.getLaudo(id); if (result.success) { populateForm(result.data); formView.style.display = 'block'; loadingView.classList.add('d-none'); } else { showNotification('Erro ao carregar laudo: ' + result.error, 'error'); showListView(); } } catch (error) { showNotification('Erro ao carregar laudo: ' + error.message, 'error'); showListView(); } }
async function deleteLaudo(id) { if (confirm('Tem certeza?')) { showLoading(); try { const result = await window.electronAPI.deleteLaudo(id); if (result.success) { showNotification('Laudo excluído!', 'success'); loadLaudos(); } else { showNotification('Erro ao excluir: ' + result.error, 'error'); } } catch (error) { showNotification('Erro ao excluir: ' + error.message, 'error'); } } }
async function exportToWord(id) { /* Lógica de exportação futura */ }

// Funções para pegar dados das listas dinâmicas
const getQuesitosFromDOM = (container) => Array.from(container.querySelectorAll('.quesito-item')).map(item => ({ pergunta: item.querySelector('.quesito-pergunta').value, resposta: item.querySelector('.quesito-resposta').value }));
const getExamesFromDOM = () => Array.from(document.getElementById('exames-list-container').querySelectorAll('.exame-item')).map(item => ({ descricao: item.querySelector('.exame-descricao').value }));
const getPassadoLaboralFromDOM = () => Array.from(document.getElementById('passado-laboral-list').querySelectorAll('.passado-laboral-item')).map(item => ({ empresa: item.querySelector('.laboral-empresa').value, funcao: item.querySelector('.laboral-funcao').value, periodo: item.querySelector('.laboral-periodo').value }));

async function saveOrUpdateLaudo() {
    document.getElementById('altura').dispatchEvent(new Event('blur'));
    document.getElementById('peso').dispatchEvent(new Event('blur'));
    const formDataObj = new FormData(laudoForm);
    const formData = {};
    for (let [key, value] of formDataObj.entries()) formData[key] = value.trim();
    if (!formData.numero_processo || !formData.reclamante) { showNotification('Processo e Reclamante são obrigatórios.', 'error'); return; }
    formData.fotos_paths = JSON.stringify(currentPhotoPaths);
    formData.quesitos_juizo = JSON.stringify(getQuesitosFromDOM(document.getElementById('quesitos-juizo-list')));
    formData.exames_complementares = JSON.stringify(getExamesFromDOM());
    formData.passado_laboral = JSON.stringify(getPassadoLaboralFromDOM());
    showLoading();
    try {
        if (editingId) formData.id = editingId;
        const result = await window.electronAPI.saveLaudo(formData);
        if (result.success) { showNotification('Laudo salvo!', 'success'); editingId = null; loadLaudos(); } 
        else { showNotification('Erro ao salvar: ' + result.error, 'error'); showFormView(editingId); }
    } catch (error) { showNotification('Erro ao salvar: ' + error.message, 'error'); showFormView(editingId); }
}

// Funções de Renderização e Utilidades
function renderLaudosList(laudos) { if (!laudos || laudos.length === 0) { laudosList.innerHTML = '<p class="text-muted">Nenhum laudo cadastrado.</p>'; return; } laudosList.innerHTML = laudos.map(laudo => `<div class="col-lg-4 col-md-6"><div class="card h-100"><div class="card-body"><h5 class="card-title">${laudo.numero_processo || 'N/A'}</h5><p class="card-text"><strong>Reclamante:</strong> ${laudo.reclamante || 'N/A'}</p><p class="card-text"><small class="text-muted">Data: ${formatDate(laudo.data_laudo)}</small></p></div><div class="card-footer bg-transparent border-top-0 text-end"><button class="btn btn-sm btn-outline-primary" onclick="showFormView(${laudo.id})">Editar</button><button class="btn btn-sm btn-outline-success" onclick="exportToWord(${laudo.id})">Exportar</button><button class="btn btn-sm btn-outline-danger" onclick="deleteLaudo(${laudo.id})">Excluir</button></div></div></div>`).join(''); }
const renderQuesitos = (container, quesitos) => { container.innerHTML = quesitos.map((q, index) => `<div class="quesito-item" data-index="${index}"><span class="number">${index + 1}.</span><div class="fields flex-grow-1"><textarea class="form-control mb-2 quesito-pergunta" rows="2" placeholder="Digite a pergunta">${q.pergunta}</textarea><textarea class="form-control quesito-resposta" rows="3" placeholder="Digite a resposta">${q.resposta}</textarea></div><button type="button" class="btn btn-danger btn-sm remove-quesito-btn align-self-start">&times;</button></div>`).join(''); };

function populateForm(data) {
    resetForm();
    Object.keys(data).forEach(key => {
        const element = document.getElementById(key);
        if (element && data[key] !== null) element.value = data[key];
    });
    if (document.getElementById('data_nascimento').value) document.getElementById('data_nascimento').dispatchEvent(new Event('change'));
    if (document.getElementById('peso').value || document.getElementById('altura').value) { document.getElementById('altura').dispatchEvent(new Event('blur')); document.getElementById('peso').dispatchEvent(new Event('blur')); }
    currentPhotoPaths = data.fotos_paths ? JSON.parse(data.fotos_paths) : [];
    document.getElementById('photos-preview-container').innerHTML = currentPhotoPaths.map((path, index) => `<div class="photo-thumbnail"><img src="${path.replaceAll('\\', '/')}" alt="Foto ${index + 1}" /><button type="button" class="remove-photo-btn" data-index="${index}">&times;</button></div>`).join('');
    
    const exames = data.exames_complementares ? JSON.parse(data.exames_complementares) : [];
    const examesContainer = document.getElementById('exames-list-container');
    if(examesContainer) examesContainer.innerHTML = exames.map(exame => `<div class="exame-item"><input type="text" class="form-control form-control-sm exame-descricao" value="${exame.descricao}" placeholder="Ex: Audiometria de DD/MM/AAAA..."><button type="button" class="btn btn-danger btn-sm remove-btn remove-exame-btn">&times;</button></div>`).join('');

    const passadoLaboral = data.passado_laboral ? JSON.parse(data.passado_laboral) : [];
    const passadoLaboralContainer = document.getElementById('passado-laboral-list');
    if(passadoLaboralContainer) passadoLaboralContainer.innerHTML = passadoLaboral.map(item => `<div class="passado-laboral-item"><input type="text" class="form-control form-control-sm laboral-empresa" placeholder="Empresa" value="${item.empresa || ''}"><input type="text" class="form-control form-control-sm laboral-funcao" placeholder="Função" value="${item.funcao || ''}"><input type="text" class="form-control form-control-sm laboral-periodo" placeholder="Período" value="${item.periodo || ''}"><button type="button" class="btn btn-danger btn-sm remove-btn remove-passado-laboral-btn">&times;</button></div>`).join('');

    const quesitosJuizo = data.quesitos_juizo ? JSON.parse(data.quesitos_juizo) : [];
    renderQuesitos(document.getElementById('quesitos-juizo-list'), quesitosJuizo);

    const selectTipoExame = document.getElementById('tipo-exame-especifico');
    if (data.tipo_exame_especifico) {
        selectTipoExame.value = data.tipo_exame_especifico;
        selectTipoExame.dispatchEvent(new Event('change'));
        setTimeout(() => {
            if (examesEspecificos[data.tipo_exame_especifico]) {
                examesEspecificos[data.tipo_exame_especifico].forEach(exame => {
                    if (data[exame.id] && document.getElementById(exame.id)) {
                        document.getElementById(exame.id).value = data[exame.id];
                    }
                });
            }
        }, 100);
    }
}

function resetForm() {
    laudoForm.reset();
    currentPhotoPaths = [];
    if(document.getElementById('photos-preview-container')) document.getElementById('photos-preview-container').innerHTML = '';
    if(document.getElementById('exames-list-container')) document.getElementById('exames-list-container').innerHTML = '';
    if(document.getElementById('passado-laboral-list')) document.getElementById('passado-laboral-list').innerHTML = '';
    if(document.getElementById('exames-especificos-container')) document.getElementById('exames-especificos-container').innerHTML = '';
    if(document.getElementById('tipo-exame-especifico')) document.getElementById('tipo-exame-especifico').value = '';
    setupQuesitosUI();
    const today = new Date().toISOString().split('T')[0];
    const now = new Date();
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    if (document.getElementById('data_pericia')) document.getElementById('data_pericia').value = today;
    if (document.getElementById('data_laudo')) document.getElementById('data_laudo').value = today;
    if (document.getElementById('hora_pericia')) document.getElementById('hora_pericia').value = `${hours}:${minutes}`;
}

function formatDate(dateString) { if (!dateString) return 'N/A'; const date = new Date(dateString); const offset = date.getTimezoneOffset() * 60000; return new Date(date.getTime() + offset).toLocaleDateString('pt-BR'); }
function showNotification(message, type) { const existing = document.querySelectorAll('.notification'); existing.forEach(n => n.remove()); const notification = document.createElement('div'); notification.className = `notification ${type}`; notification.textContent = message; document.body.appendChild(notification); setTimeout(() => notification.remove(), 4000); }

