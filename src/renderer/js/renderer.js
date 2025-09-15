// renderer.js - VERSÃO COM QUESITOS SIMPLIFICADOS

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

// --- FUNÇÃO PARA INICIALIZAR A UI DOS QUESITOS (SIMPLIFICADA) ---
function setupQuesitosUI() {
    const container = document.getElementById('quesitos-group-container');
    if (!container) return;

    const quesitoTemplate = (type, title) => `
        <div class="mb-3">
            <h5>${title}</h5>
            <div id="quesitos-${type}-list" class="quesitos-list"></div>
            <button type="button" class="btn btn-outline-secondary btn-sm mt-2" data-type="${type}">Adicionar Pergunta</button>
        </div>
    `;
    
    // REMOVIDO: As linhas para 'reclamante' e 'reclamada' foram apagadas.
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
        quesitosContainer: document.getElementById('quesitos-group-container')
    };

    // Cálculos e Máscaras
    const calcularIMC = () => inputs.imc.value = (parseFloat(inputs.peso.value) > 0 && parseFloat(inputs.altura.value) > 0) ? (parseFloat(inputs.peso.value) / (parseFloat(inputs.altura.value) ** 2)).toFixed(2) : '';
    const calcularIdade = () => {
        if (!inputs.dataNascimento.value) { inputs.idade.value = ''; return; }
        const hoje = new Date(); const nascimento = new Date(inputs.dataNascimento.value);
        let idade = hoje.getFullYear() - nascimento.getFullYear();
        const m = hoje.getMonth() - nascimento.getMonth();
        if (m < 0 || (m === 0 && hoje.getDate() < nascimento.getDate())) idade--;
        inputs.idade.value = idade;
    };
    if (inputs.processo) inputs.processo.addEventListener('input', (e) => e.target.value = maskProcesso(e.target.value));
    if (inputs.cpf) inputs.cpf.addEventListener('input', (e) => e.target.value = maskCPF(e.target.value));
    if (inputs.valorHonorarios) inputs.valorHonorarios.addEventListener('input', (e) => e.target.value = maskCurrency(e.target.value));
    if (inputs.dataNascimento) inputs.dataNascimento.addEventListener('change', calcularIdade);
    if (inputs.peso) inputs.peso.addEventListener('input', calcularIMC);
    if (inputs.altura) inputs.altura.addEventListener('input', calcularIMC);

    // Fotos
    const renderPhotos = () => { inputs.photosPreviewContainer.innerHTML = currentPhotoPaths.map((path, index) => `<div class="photo-thumbnail"><img src="${path.replaceAll('\\', '/')}" alt="Foto ${index + 1}" /><button type="button" class="remove-photo-btn" data-index="${index}">&times;</button></div>`).join(''); };
    if (inputs.btnAddPhoto) inputs.btnAddPhoto.addEventListener('click', async () => {
        const result = await window.electronAPI.selectPhotos();
        if (result.success) { currentPhotoPaths.push(...result.paths); renderPhotos(); }
    });
    if (inputs.photosPreviewContainer) inputs.photosPreviewContainer.addEventListener('click', (e) => {
        if (e.target.classList.contains('remove-photo-btn')) { currentPhotoPaths.splice(parseInt(e.target.dataset.index, 10), 1); renderPhotos(); }
    });
    
    // Quesitos
    if (inputs.quesitosContainer) {
        inputs.quesitosContainer.addEventListener('click', e => {
            const type = e.target.dataset.type;
            if (type) {
                const list = document.getElementById(`quesitos-${type}-list`);
                const quesitos = getQuesitosFromDOM(list);
                quesitos.push({ pergunta: '', resposta: '' });
                renderQuesitos(list, quesitos);
            }
            if (e.target.classList.contains('remove-quesito-btn')) {
                const item = e.target.closest('.quesito-item');
                const list = item.parentElement;
                const index = parseInt(item.dataset.index, 10);
                const quesitos = getQuesitosFromDOM(list);
                quesitos.splice(index, 1);
                renderQuesitos(list, quesitos);
            }
        });
    }
});

// Botões Principais
btnNew.addEventListener('click', () => showFormView());
btnList.addEventListener('click', loadLaudos);
btnCancel.addEventListener('click', () => { editingId = null; showListView(); });
laudoForm.addEventListener('submit', async (e) => { e.preventDefault(); await saveOrUpdateLaudo(); });

// Funções de Navegação
function showFormView(id = null) { editingId = id; listView.style.display = 'none'; formView.style.display = 'block'; loadingView.classList.add('d-none'); if (id) { loadLaudoForEditing(id); } else { resetForm(); } }
function showListView() { listView.style.display = 'block'; formView.style.display = 'none'; loadingView.classList.add('d-none'); resetForm(); }
function showLoading() { listView.style.display = 'none'; formView.style.display = 'none'; loadingView.classList.remove('d-none'); loadingView.classList.add('d-flex'); }

// Funções CRUD
async function loadLaudos() { showLoading(); try { const result = await window.electronAPI.loadLaudos(); if (result.success) renderLaudosList(result.data); else showNotification('Erro ao carregar: ' + result.error, 'error'); } catch (error) { showNotification('Erro ao carregar: ' + error.message, 'error'); } showListView(); }
async function loadLaudoForEditing(id) { showLoading(); try { const result = await window.electronAPI.getLaudo(id); if (result.success) { populateForm(result.data); formView.style.display = 'block'; loadingView.classList.add('d-none'); } else { showNotification('Erro ao carregar laudo: ' + result.error, 'error'); showListView(); } } catch (error) { showNotification('Erro ao carregar laudo: ' + error.message, 'error'); showListView(); } }
async function deleteLaudo(id) { if (confirm('Tem certeza?')) { showLoading(); try { const result = await window.electronAPI.deleteLaudo(id); if (result.success) { showNotification('Laudo excluído!', 'success'); loadLaudos(); } else { showNotification('Erro ao excluir: ' + result.error, 'error'); } } catch (error) { showNotification('Erro ao excluir: ' + error.message, 'error'); } } }
async function exportToWord(id) { /* Lógica de exportação futura */ }

const getQuesitosFromDOM = (container) => Array.from(container.querySelectorAll('.quesito-item')).map(item => ({ pergunta: item.querySelector('.quesito-pergunta').value, resposta: item.querySelector('.quesito-resposta').value }));

async function saveOrUpdateLaudo() {
    const formDataObj = new FormData(laudoForm);
    const formData = {};
    for (let [key, value] of formDataObj.entries()) formData[key] = value.trim();
    if (!formData.numero_processo || !formData.reclamante) { showNotification('Processo e Reclamante são obrigatórios.', 'error'); return; }

    formData.fotos_paths = JSON.stringify(currentPhotoPaths);
    formData.quesitos_juizo = JSON.stringify(getQuesitosFromDOM(document.getElementById('quesitos-juizo-list')));
    // REMOVIDO: As linhas para 'reclamante' e 'reclamada' foram apagadas.
    
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
    if (document.getElementById('peso').value) document.getElementById('peso').dispatchEvent(new Event('input'));

    currentPhotoPaths = data.fotos_paths ? JSON.parse(data.fotos_paths) : [];
    document.getElementById('photos-preview-container').innerHTML = currentPhotoPaths.map((path, index) => `<div class="photo-thumbnail"><img src="${path.replaceAll('\\', '/')}" alt="Foto ${index + 1}" /><button type="button" class="remove-photo-btn" data-index="${index}">&times;</button></div>`).join('');
    
    const quesitosJuizo = data.quesitos_juizo ? JSON.parse(data.quesitos_juizo) : [];
    renderQuesitos(document.getElementById('quesitos-juizo-list'), quesitosJuizo);
    // REMOVIDO: As linhas para 'reclamante' e 'reclamada' foram apagadas.
}

function resetForm() {
    laudoForm.reset();
    currentPhotoPaths = [];
    if(document.getElementById('photos-preview-container')) document.getElementById('photos-preview-container').innerHTML = '';
    
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