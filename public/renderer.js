// Variáveis globais
let currentView = 'list';
let formData = {};
let editingId = null;

// Elementos da interface
const listView = document.getElementById('list-view');
const formView = document.getElementById('form-view');
const loadingView = document.getElementById('loading-view');
const laudosList = document.getElementById('laudos-list');
const btnNew = document.getElementById('btn-new');
const btnList = document.getElementById('btn-list');

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    initApp();
    loadLaudos();
});

// Event listeners
btnNew.addEventListener('click', showFormView);
btnList.addEventListener('click', showListView);

// Funções de navegação
function showFormView(id = null) {
    editingId = id;
    listView.style.display = 'none';
    formView.style.display = 'block';
    loadingView.style.display = 'none';
    currentView = 'form';
    
    if (id) {
        loadLaudoForEditing(id);
    } else {
        resetForm();
    }
}

function showListView() {
    listView.style.display = 'block';
    formView.style.display = 'none';
    loadingView.style.display = 'none';
    currentView = 'list';
    loadLaudos();
}

function showLoading() {
    listView.style.display = 'none';
    formView.style.display = 'none';
    loadingView.style.display = 'flex';
}

// Funções de manipulação de dados
async function loadLaudos() {
    showLoading();
    try {
        const result = await window.electronAPI.loadLaudos();
        if (result.success) {
            renderLaudosList(result.data);
        } else {
            showNotification('Erro ao carregar laudos: ' + result.error, 'error');
        }
    } catch (error) {
        showNotification('Erro ao carregar laudos: ' + error.message, 'error');
    }
    showListView();
}

async function loadLaudoForEditing(id) {
    showLoading();
    try {
        const result = await window.electronAPI.getLaudo(id);
        if (result.success) {
            populateForm(result.data);
        } else {
            showNotification('Erro ao carregar laudo: ' + result.error, 'error');
            showListView();
        }
    } catch (error) {
        showNotification('Erro ao carregar laudo: ' + error.message, 'error');
        showListView();
    }
}

async function saveLaudo() {
    // Coletar dados do formulário
    const form = document.getElementById('laudo-form');
    const formDataObj = new FormData(form);
    
    formData = {};
    for (let [key, value] of formDataObj.entries()) {
        formData[key] = value;
    }
    
    // Calcular IMC
    const altura = parseFloat(formData.altura);
    const peso = parseFloat(formData.peso);
    formData.imc = (peso / (altura * altura)).toFixed(2);
    
    // Salvar no banco de dados
    showLoading();
    try {
        const result = await window.electronAPI.saveLaudo(formData);
        if (result.success) {
            showNotification('Laudo salvo com sucesso!', 'success');
            showListView();
        } else {
            showNotification('Erro ao salvar laudo: ' + result.error, 'error');
            showFormView(editingId);
        }
    } catch (error) {
        showNotification('Erro ao salvar laudo: ' + error.message, 'error');
        showFormView(editingId);
    }
}

async function deleteLaudo(id) {
    if (confirm('Tem certeza que deseja excluir este laudo?')) {
        showLoading();
        try {
            const result = await window.electronAPI.deleteLaudo(id);
            if (result.success) {
                showNotification('Laudo excluído com sucesso!', 'success');
                loadLaudos();
            } else {
                showNotification('Erro ao excluir laudo: ' + result.error, 'error');
                showListView();
            }
        } catch (error) {
            showNotification('Erro ao excluir laudo: ' + error.message, 'error');
            showListView();
        }
    }
}

async function exportToWord(id) {
    showLoading();
    try {
        const result = await window.electronAPI.getLaudo(id);
        if (result.success) {
            const exportResult = await window.electronAPI.exportWord(result.data);
            if (exportResult.success) {
                showNotification('Documento Word gerado com sucesso!', 'success');
            } else {
                showNotification('Erro ao exportar: ' + exportResult.error, 'error');
            }
        } else {
            showNotification('Erro ao carregar laudo: ' + result.error, 'error');
        }
    } catch (error) {
        showNotification('Erro ao exportar: ' + error.message, 'error');
    }
    showListView();
}

// Funções de renderização
function renderLaudosList(laudos) {
    if (laudos.length === 0) {
        laudosList.innerHTML = '<p class="no-data">Nenhum laudo cadastrado.</p>';
        return;
    }
    
    laudosList.innerHTML = laudos.map(laudo => `
        <div class="laudo-card">
            <h3>Processo: ${laudo.numero_processo}</h3>
            <div class="laudo-details">
                <p><strong>Reclamante:</strong> ${laudo.reclamante}</p>
                <p><strong>Reclamada:</strong> ${laudo.reclamada}</p>
                <p><strong>Data do laudo:</strong> ${formatDate(laudo.data_laudo)}</p>
            </div>
            <div class="laudo-actions">
                <button class="btn-primary" onclick="showFormView(${laudo.id})">Editar</button>
                <button class="btn-success" onclick="exportToWord(${laudo.id})">Exportar</button>
                <button class="btn-danger" onclick="deleteLaudo(${laudo.id})">Excluir</button>
            </div>
        </div>
    `).join('');
}

function populateForm(data) {
    // Preencher todos os campos do formulário com os dados
    Object.keys(data).forEach(key => {
        const element = document.getElementById(key);
        if (element && data[key] !== null) {
            element.value = data[key];
        }
    });
    
    // Mostrar o formulário
    formView.style.display = 'block';
    loadingView.style.display = 'none';
}

function resetForm() {
    const form = document.getElementById('laudo-form');
    form.reset();
    
    // Definir valores padrão
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('data_pericia').value = today;
    document.getElementById('data_laudo').value = today;
    
    const now = new Date();
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    document.getElementById('hora_pericia').value = `${hours}:${minutes}`;
}

// Funções utilitárias
function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
}

function showNotification(message, type) {
    // Remove notificações existentes
    const existingNotifications = document.querySelectorAll('.notification');
    existingNotifications.forEach(notification => notification.remove());
    
    // Cria nova notificação
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // Remove após 3 segundos
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

function initApp() {
    // Inicializar qualquer configuração necessária
    console.log('Aplicativo inicializado');
}