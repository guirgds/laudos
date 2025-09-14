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

// --- LÓGICA DAS ABAS ---
function openTab(evt, tabName) {
  const tabcontent = document.getElementsByClassName("tab-content");
  for (let i = 0; i < tabcontent.length; i++) tabcontent[i].style.display = "none";
  const tablinks = document.getElementsByClassName("tab-link");
  for (let i = 0; i < tablinks.length; i++) tablinks[i].className = tablinks[i].className.replace(" active", "");
  document.getElementById(tabName).style.display = "block";
  evt.currentTarget.className += " active";
}

// --- INICIALIZAÇÃO E EVENTOS PRINCIPAIS ---
document.addEventListener('DOMContentLoaded', () => {
    loadLaudos();

    // --- Seleciona elementos ---
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
        btnAddQuesitoJuizo: document.getElementById('btn-add-quesito-juizo'),
        quesitosJuizoList: document.getElementById('quesitos-juizo-list'),
        btnAddQuesitoReclamante: document.getElementById('btn-add-quesito-reclamante'),
        quesitosReclamanteList: document.getElementById('quesitos-reclamante-list'),
        btnAddQuesitoReclamada: document.getElementById('btn-add-quesito-reclamada'),
        quesitosReclamadaList: document.getElementById('quesitos-reclamada-list'),
    };

    // --- Lógica de Cálculos e Máscaras ---
    const calcularIMC = () => inputs.imc.value = (parseFloat(inputs.peso.value) > 0 && parseFloat(inputs.altura.value) > 0) ? (parseFloat(inputs.peso.value) / (parseFloat(inputs.altura.value) ** 2)).toFixed(2) : '';
    const calcularIdade = () => {
        if (!inputs.dataNascimento.value) { inputs.idade.value = ''; return; }
        const hoje = new Date();
        const nascimento = new Date(inputs.dataNascimento.value);
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

    // --- Lógica de Fotos ---
    const renderPhotos = () => {
        inputs.photosPreviewContainer.innerHTML = currentPhotoPaths.map((path, index) => `
            <div class="photo-thumbnail">
                <img src="${path.replaceAll('\\', '/')}" alt="Foto ${index + 1}" />
                <button type="button" class="remove-photo-btn" data-index="${index}">&times;</button>
            </div>`).join('');
    };
    if (inputs.btnAddPhoto) inputs.btnAddPhoto.addEventListener('click', async () => {
        const result = await window.electronAPI.selectPhotos();
        if (result.success) { currentPhotoPaths.push(...result.paths); renderPhotos(); }
    });
    if (inputs.photosPreviewContainer) inputs.photosPreviewContainer.addEventListener('click', (e) => {
        if (e.target.classList.contains('remove-photo-btn')) {
            currentPhotoPaths.splice(parseInt(e.target.dataset.index, 10), 1);
            renderPhotos();
        }
    });

    // --- LÓGICA DOS QUESITOS DINÂMICOS ---
    const renderQuesitos = (container, quesitos) => {
        container.innerHTML = quesitos.map((q, index) => `
            <div class="quesito-item" data-index="${index}">
                <span class="number">${index + 1}.</span>
                <div class="fields">
                    <textarea class="quesito-pergunta" placeholder="Digite a pergunta">${q.pergunta}</textarea>
                    <textarea class="quesito-resposta" placeholder="Digite a resposta">${q.resposta}</textarea>
                    <button type="button" class="remove-quesito-btn btn-danger">Remover</button>
                </div>
            </div>
        `).join('');
    };

    const setupQuesitosGroup = (addButton, container) => {
        addButton.addEventListener('click', () => {
            const quesitos = getQuesitosFromDOM(container);
            quesitos.push({ pergunta: '', resposta: '' });
            renderQuesitos(container, quesitos);
        });

        container.addEventListener('click', (e) => {
            if (e.target.classList.contains('remove-quesito-btn')) {
                const indexToRemove = parseInt(e.target.closest('.quesito-item').dataset.index, 10);
                const quesitos = getQuesitosFromDOM(container);
                quesitos.splice(indexToRemove, 1);
                renderQuesitos(container, quesitos);
            }
        });
    };
    
    setupQuesitosGroup(inputs.btnAddQuesitoJuizo, inputs.quesitosJuizoList);
    setupQuesitosGroup(inputs.btnAddQuesitoReclamante, inputs.quesitosReclamanteList);
    setupQuesitosGroup(inputs.btnAddQuesitoReclamada, inputs.quesitosReclamadaList);

    document.getElementById('tab-processo').style.display = 'block';
});

// --- Eventos de Botões Principais ---
btnNew.addEventListener('click', () => showFormView());
btnList.addEventListener('click', loadLaudos);
btnCancel.addEventListener('click', () => { editingId = null; resetForm(); showListView(); });
laudoForm.addEventListener('submit', async (e) => { e.preventDefault(); await saveOrUpdateLaudo(); });

// --- Funções de Navegação ---
function showFormView(id = null) { editingId = id; listView.style.display = 'none'; formView.style.display = 'block'; loadingView.style.display = 'none'; if (id) { loadLaudoForEditing(id); } else { resetForm(); } }
function showListView() { listView.style.display = 'block'; formView.style.display = 'none'; loadingView.style.display = 'none'; }
function showLoading() { listView.style.display = 'none'; formView.style.display = 'none'; loadingView.style.display = 'flex'; }

// --- Funções de Manipulação de Dados (CRUD) ---
async function loadLaudos() { showLoading(); try { const result = await window.electronAPI.loadLaudos(); if (result.success) renderLaudosList(result.data); else showNotification('Erro ao carregar laudos: ' + result.error, 'error'); } catch (error) { showNotification('Erro ao carregar laudos: ' + error.message, 'error'); } showListView(); }
async function loadLaudoForEditing(id) { showLoading(); try { const result = await window.electronAPI.getLaudo(id); if (result.success) { populateForm(result.data); formView.style.display = 'block'; loadingView.style.display = 'none'; } else { showNotification('Erro ao carregar laudo: ' + result.error, 'error'); showListView(); } } catch (error) { showNotification('Erro ao carregar laudo: ' + error.message, 'error'); showListView(); } }
async function deleteLaudo(id) { if (confirm('Tem certeza?')) { showLoading(); try { const result = await window.electronAPI.deleteLaudo(id); if (result.success) { showNotification('Laudo excluído!', 'success'); loadLaudos(); } else { showNotification('Erro ao excluir: ' + result.error, 'error'); showListView(); } } catch (error) { showNotification('Erro ao excluir: ' + error.message, 'error'); showListView(); } } }
async function exportToWord(id) { /* Lógica de exportação futura */ }

function getQuesitosFromDOM(container) {
    const items = [];
    container.querySelectorAll('.quesito-item').forEach(item => {
        const pergunta = item.querySelector('.quesito-pergunta').value;
        const resposta = item.querySelector('.quesito-resposta').value;
        items.push({ pergunta, resposta });
    });
    return items;
}

async function saveOrUpdateLaudo() {
    const formDataObj = new FormData(laudoForm);
    const formData = {};
    for (let [key, value] of formDataObj.entries()) formData[key] = value.trim();
    if (!formData.numero_processo || !formData.reclamante) { showNotification('Processo e Reclamante são obrigatórios.', 'error'); return; }

    formData.fotos_paths = JSON.stringify(currentPhotoPaths);
    formData.quesitos_juizo = JSON.stringify(getQuesitosFromDOM(document.getElementById('quesitos-juizo-list')));
    formData.quesitos_reclamante = JSON.stringify(getQuesitosFromDOM(document.getElementById('quesitos-reclamante-list')));
    formData.quesitos_reclamada = JSON.stringify(getQuesitosFromDOM(document.getElementById('quesitos-reclamada-list')));
    
    showLoading();
    try {
        if (editingId) formData.id = editingId;
        const result = await window.electronAPI.saveLaudo(formData);
        if (result.success) { showNotification('Laudo salvo!', 'success'); editingId = null; resetForm(); loadLaudos(); } 
        else { showNotification('Erro ao salvar: ' + result.error, 'error'); showFormView(editingId); }
    } catch (error) { showNotification('Erro ao salvar: ' + error.message, 'error'); showFormView(editingId); }
}

// --- Funções de Renderização e Utilidades ---
function renderLaudosList(laudos) { if (!laudos || laudos.length === 0) { laudosList.innerHTML = '<p class="no-data">Nenhum laudo cadastrado.</p>'; return; } laudosList.innerHTML = laudos.map(laudo => `<div class="laudo-card"><h3>Processo: ${laudo.numero_processo || 'N/A'}</h3><div class="laudo-details"><p><strong>Reclamante:</strong> ${laudo.reclamante || 'N/A'}</p><p><strong>Data:</strong> ${formatDate(laudo.data_laudo)}</p></div><div class="laudo-actions"><button class="btn-primary" onclick="showFormView(${laudo.id})">Editar</button><button class="btn-success" onclick="exportToWord(${laudo.id})">Exportar</button><button class="btn-danger" onclick="deleteLaudo(${laudo.id})">Excluir</button></div></div>`).join(''); }

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
    const quesitosReclamante = data.quesitos_reclamante ? JSON.parse(data.quesitos_reclamante) : [];
    const quesitosReclamada = data.quesitos_reclamada ? JSON.parse(data.quesitos_reclamada) : [];

    const renderQuesitos = (container, quesitos) => {
        container.innerHTML = quesitos.map((q, index) => `
            <div class="quesito-item" data-index="${index}">
                <span class="number">${index + 1}.</span>
                <div class="fields">
                    <textarea class="quesito-pergunta" placeholder="Digite a pergunta">${q.pergunta}</textarea>
                    <textarea class="quesito-resposta" placeholder="Digite a resposta">${q.resposta}</textarea>
                    <button type="button" class="remove-quesito-btn btn-danger">Remover</button>
                </div>
            </div>
        `).join('');
    };
    
    renderQuesitos(document.getElementById('quesitos-juizo-list'), quesitosJuizo);
    renderQuesitos(document.getElementById('quesitos-reclamante-list'), quesitosReclamante);
    renderQuesitos(document.getElementById('quesitos-reclamada-list'), quesitosReclamada);
}

function resetForm() {
    laudoForm.reset();
    currentPhotoPaths = [];
    document.getElementById('photos-preview-container').innerHTML = '';
    document.getElementById('quesitos-juizo-list').innerHTML = '';
    document.getElementById('quesitos-reclamante-list').innerHTML = '';
    document.getElementById('quesitos-reclamada-list').innerHTML = '';

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