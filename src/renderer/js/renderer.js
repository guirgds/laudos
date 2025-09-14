// renderer.js - CORRIGIDO

// Variáveis globais
let currentView = 'list';
let editingId = null;

// Elementos da interface
const listView = document.getElementById('list-view');
const formView = document.getElementById('form-view');
const loadingView = document.getElementById('loading-view');
const laudosList = document.getElementById('laudos-list');
const btnNew = document.getElementById('btn-new');
const btnList = document.getElementById('btn-list');
const btnCancel = document.getElementById('btn-cancel');
const laudoForm = document.getElementById('laudo-form');

// Inicialização
// renderer.js
document.addEventListener('DOMContentLoaded', () => {
    // Mantém a chamada original para carregar os laudos ao iniciar
    loadLaudos();

    // Adiciona a lógica para ativar as máscaras
    const cpfInput = document.getElementById('cpf');
    const valorHonorariosInput = document.getElementById('valor_honorarios');

    if (cpfInput) {
        cpfInput.addEventListener('input', (e) => {
            // A função maskCPF vem do arquivo masks.js que criamos
            e.target.value = maskCPF(e.target.value);
        });
    }

    if (valorHonorariosInput) {
        valorHonorariosInput.addEventListener('input', (e) => {
            // A função maskCurrency vem do arquivo masks.js
            e.target.value = maskCurrency(e.target.value);
        });
    }
});

// Event listeners
btnNew.addEventListener('click', () => showFormView());
btnList.addEventListener('click', loadLaudos); // Chama loadLaudos para garantir que a lista está atualizada
btnCancel.addEventListener('click', () => {
    editingId = null;
    resetForm();
    showListView();
});
laudoForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    await saveOrUpdateLaudo();
});

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
    // CORREÇÃO 1: Removida a chamada para loadLaudos() daqui para quebrar o loop.
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
            showListView(); // Mostra a lista APÓS os dados serem carregados e renderizados
        } else {
            showNotification('Erro ao carregar laudos: ' + result.error, 'error');
            showListView(); // Mostra a lista vazia mesmo em caso de erro
        }
    } catch (error) {
        showNotification('Erro ao carregar laudos: ' + error.message, 'error');
        showListView();
    }
}

async function loadLaudoForEditing(id) {
    showLoading();
    try {
        const result = await window.electronAPI.getLaudo(id);
        if (result.success) {
            populateForm(result.data);
            formView.style.display = 'block'; // Mostra o formulário preenchido
            loadingView.style.display = 'none';
        } else {
            showNotification('Erro ao carregar laudo: ' + result.error, 'error');
            showListView();
        }
    } catch (error) {
        showNotification('Erro ao carregar laudo: ' + error.message, 'error');
        showListView();
    }
}

async function saveOrUpdateLaudo() {
    const formDataObj = new FormData(laudoForm);
    const formData = {};
    for (let [key, value] of formDataObj.entries()) {
        formData[key] = value.trim();
    }

    if (!formData.numero_processo || !formData.reclamante) {
        showNotification('Número do processo e reclamante são obrigatórios.', 'error');
        return;
    }

    showLoading();
    try {
        // Adiciona o ID ao objeto de dados se estiver editando
        if (editingId) {
            formData.id = editingId;
        }

        // Usa a mesma função 'save-laudo' para criar e atualizar
        const result = await window.electronAPI.saveLaudo(formData);

        if (result.success) {
            showNotification('Laudo salvo com sucesso!', 'success');
            editingId = null; // Limpa o ID de edição
            resetForm();
            loadLaudos(); // CORREÇÃO 2: Chama loadLaudos() para recarregar a lista atualizada
        } else {
            showNotification('Erro ao salvar laudo: ' + result.error, 'error');
            showFormView(editingId); // Volta para o formulário em caso de erro
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
                loadLaudos(); // Recarrega a lista
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
    try {
        const result = await window.electronAPI.getLaudo(id);
        if (result.success) {
            // A validação de 'titulo' e 'conteudo' no preload vai falhar.
            // Precisamos ajustar o preload.js para validar os campos corretos.
            const exportResult = await window.electronAPI.exportWord(result.data);
            if (exportResult.success) {
                showNotification(`Documento salvo em: ${exportResult.data.path}`, 'success');
            } else if (exportResult.error !== 'Operação cancelada') {
                showNotification('Erro ao exportar: ' + exportResult.error, 'error');
            }
        } else {
            showNotification('Erro ao carregar laudo para exportação: ' + result.error, 'error');
        }
    } catch (error) {
        showNotification('Erro ao exportar: ' + error.message, 'error');
    }
}


// Funções de renderização e utilitárias (sem alterações)
function renderLaudosList(laudos) {
    if (!laudos || laudos.length === 0) {
        laudosList.innerHTML = '<p class="no-data">Nenhum laudo cadastrado.</p>';
        return;
    }
    
    laudosList.innerHTML = laudos.map(laudo => `
        <div class="laudo-card">
            <h3>Processo: ${laudo.numero_processo || 'N/A'}</h3>
            <div class="laudo-details">
                <p><strong>Reclamante:</strong> ${laudo.reclamante || 'N/A'}</p>
                <p><strong>Reclamada:</strong> ${laudo.reclamada || 'N/A'}</p>
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
    resetForm();
    Object.keys(data).forEach(key => {
        const element = document.getElementById(key);
        if (element && data[key] !== null) {
            element.value = data[key];
        }
    });
}

function resetForm() {
    laudoForm.reset();
}

function formatDate(dateString) {
    if (!dateString) return 'N/A';
    // Adiciona um tratamento para datas que podem ou não ter hora
    const date = new Date(dateString.split(' ')[0]);
    // Adiciona 1 dia para corrigir problemas de fuso horário
    date.setDate(date.getDate() + 1);
    return date.toLocaleDateString('pt-BR');
}

function showNotification(message, type) {
    const existing = document.querySelectorAll('.notification');
    existing.forEach(n => n.remove());
    
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 4000);
}