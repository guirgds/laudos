// src/renderer/js/renderer.js

// --- VARIÁVEIS GLOBAIS ---
let editingId = null;
let currentPhotoPaths = [];
let DADOS_DOENCAS = {}; // Armazena as doenças e testes carregados do banco de dados

// --- ELEMENTOS DA INTERFACE (serão buscados no DOMContentLoaded) ---
let listView, formView, loadingView, laudosList, btnNew, btnList, btnCancel, laudoForm, btnManageDoencas, modalDoencasElement, modalDoencas, doencasManagementContent;

// --- FUNÇÕES AUXILIARES ---
function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    const offset = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() + offset).toLocaleDateString('pt-BR');
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

// --- FUNÇÃO PARA FORMATAR ALTURA ---
function formatarAltura(valor) {
    if (!valor) return '';
    const numeros = String(valor).replace(/\D/g, '');
    if (numeros.length === 0) return '';
    
    if (numeros.length === 1) return `0,0${numeros}`;
    if (numeros.length === 2) return `0,${numeros}`;
    
    const metros = numeros.slice(0, -2);
    const centimetros = numeros.slice(-2);
    return `${metros},${centimetros}`;
}

// --- CARREGAMENTO ROBUSTO DO IMASK ---
function loadIMaskOnce() {
    return new Promise((resolve, reject) => {
        if (window.IMask) {
            console.log('[IMask] já disponível em window.IMask');
            return resolve(window.IMask);
        }
        const sources = ['js/imask.min.js', 'https://unpkg.com/imask'];
        let i = 0;
        function tryLoad() {
            if (i >= sources.length) return reject(new Error('Não foi possível carregar IMask de nenhuma fonte.'));
            const src = sources[i++];
            console.log(`[IMask] tentando carregar ${src}`);
            const s = document.createElement('script');
            s.src = src;
            s.onload = () => {
                setTimeout(() => {
                    if (window.IMask) {
                        console.log('[IMask] carregado com sucesso de', src);
                        resolve(window.IMask);
                    } else {
                        console.warn('[IMask] script carregado mas window.IMask indefinido, tentando próximo...');
                        tryLoad();
                    }
                }, 50);
            };
            s.onerror = () => {
                console.warn('[IMask] erro ao carregar', src);
                tryLoad();
            };
            document.head.appendChild(s);
        }
        tryLoad();
    });
}

function setupQuesitosUI() {
    const container = document.getElementById('quesitos-group-container');
    if (!container) return;
    const quesitoTemplate = (type, title) => `<div class="mb-3"><h5>${title}</h5><div id="quesitos-${type}-list" class="quesitos-list"></div><button type="button" class="btn btn-outline-secondary btn-sm mt-2" data-type="${type}">Adicionar Pergunta</button></div>`;
    
    // CORREÇÃO: Cria as seções para Reclamante e Reclamada
    container.innerHTML = quesitoTemplate('reclamante', 'Quesitos do Reclamante');
    container.innerHTML += quesitoTemplate('reclamada', 'Quesitos da Reclamada');
}

// --- LÓGICA DE GERENCIAMENTO DE DOENÇAS ---
const renderDoencasManagement = () => {
    if (!doencasManagementContent) return;
    
    const existingDoencasHtml = Object.keys(DADOS_DOENCAS).map(nome => {
        const doenca = DADOS_DOENCAS[nome];
        const doencaId = doenca.id;
        const testesHtml = doenca.testes.map(teste => `
            <div class="row g-2 mb-2 align-items-center teste-row">
                <div class="col-md-5"><input type="text" class="form-control form-control-sm teste-label" value="${teste.label}" placeholder="Nome do Teste" required></div>
                <div class="col-md-5"><input type="text" class="form-control form-control-sm teste-placeholder" value="${teste.placeholder || ''}" placeholder="Texto de Exemplo"></div>
                <div class="col-md-2 text-end"><button type="button" class="btn btn-sm btn-outline-danger remove-teste-field">Remover</button></div>
            </div>
        `).join('');

        return `
        <div class="accordion-item">
            <h2 class="accordion-header" id="heading-${doencaId}">
                <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#collapse-${doencaId}">
                    ${nome}
                </button>
            </h2>
            <div id="collapse-${doencaId}" class="accordion-collapse collapse" data-bs-parent="#existing-doencas-accordion">
                <div class="accordion-body">
                    <div data-doenca-id="${doencaId}" class="edit-doenca-form">
                        <div class="mb-3"><label class="form-label">Nome da Doença:</label><input type="text" class="form-control form-control-sm doenca-name-input" value="${nome}" required></div>
                        <h6>Testes:</h6>
                        <div class="testes-container">${testesHtml}</div>
                        <button type="button" class="btn btn-sm btn-outline-secondary add-teste-field-edit mt-2">Adicionar Teste</button>
                        <hr>
                        <div class="text-end">
                            <button type="button" class="btn btn-sm btn-danger me-2 delete-doenca-btn">Excluir Doença</button>
                            <button type="button" class="btn btn-sm btn-primary save-doenca-changes-btn">Salvar Alterações</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        `;
    }).join('');

    doencasManagementContent.innerHTML = `
        <div class="mb-4">
            <h4>Doenças Cadastradas</h4>
            <div class="accordion" id="existing-doencas-accordion">
                ${existingDoencasHtml || '<p class="text-muted">Nenhuma doença cadastrada.</p>'}
            </div>
        </div>
        <hr>
        <h4>Adicionar Nova Doença</h4>
        <form id="form-add-doenca">
            <div class="mb-3"><label for="new-doenca-name" class="form-label">Nome da Doença:</label><input type="text" id="new-doenca-name" class="form-control" required></div>
            <h6>Testes Específicos</h6>
            <div id="new-testes-container" class="mb-3"></div>
            <button type="button" id="btn-add-teste-field" class="btn btn-outline-secondary btn-sm">Adicionar Campo de Teste</button>
            <div class="text-end mt-3"><button type="submit" class="btn btn-primary">Salvar Nova Doença</button></div>
        </form>
    `;
};

function attachDoencasModalHandlers() {
    if (!btnManageDoencas || !modalDoencas) return;

    btnManageDoencas.addEventListener('click', () => {
        renderDoencasManagement();
        modalDoencas.show();
    });

    if (!modalDoencasElement) return;

    modalDoencasElement.addEventListener('click', async (e) => {
        const addTesteField = (container) => {
            const newRow = document.createElement('div');
            newRow.className = 'row g-2 mb-2 align-items-center teste-row';
            newRow.innerHTML = `
                <div class="col-md-5"><input type="text" class="form-control form-control-sm teste-label" placeholder="Nome do Teste" required></div>
                <div class="col-md-5"><input type="text" class="form-control form-control-sm teste-placeholder" placeholder="Texto de Exemplo"></div>
                <div class="col-md-2 text-end"><button type="button" class="btn btn-sm btn-outline-danger remove-teste-field">Remover</button></div>
            `;
            container.appendChild(newRow);
            newRow.querySelector('.teste-label').focus();
        };

        if (e.target.id === 'btn-add-teste-field') {
            addTesteField(document.getElementById('new-testes-container'));
        }
        if (e.target.classList.contains('add-teste-field-edit')) {
            addTesteField(e.target.previousElementSibling);
        }
        if (e.target.classList.contains('remove-teste-field')) {
            e.target.closest('.teste-row').remove();
        }

        if (e.target.classList.contains('save-doenca-changes-btn')) {
            const form = e.target.closest('.edit-doenca-form');
            const data = {
                id: form.dataset.doencaId,
                nome: form.querySelector('.doenca-name-input').value.trim(),
                testes: Array.from(form.querySelectorAll('.testes-container .teste-row')).map(row => ({
                    label: row.querySelector('.teste-label').value.trim(),
                    placeholder: row.querySelector('.teste-placeholder').value.trim()
                })).filter(t => t.label)
            };
            if (!data.nome) return alert('O nome da doença é obrigatório.');
            
            const result = await window.electronAPI.updateDoenca(data);
            if (result.success) {
                showNotification('Doença atualizada!', 'success');
                modalDoencas.hide();
                await loadDoencas();
            } else {
                alert('Erro ao atualizar: ' + result.error);
            }
        }
        
        if (e.target.classList.contains('delete-doenca-btn')) {
            if (!confirm('Tem certeza que deseja excluir esta doença e todos os seus testes?')) return;
            const doencaId = e.target.closest('.edit-doenca-form').dataset.doencaId;
            const result = await window.electronAPI.deleteDoenca(doencaId);
            if (result.success) {
                showNotification('Doença excluída!', 'success');
                modalDoencas.hide();
                await loadDoencas();
            } else {
                alert('Erro ao excluir: ' + result.error);
            }
        }
    });

    modalDoencasElement.addEventListener('submit', async (e) => {
        if (e.target.id === 'form-add-doenca') {
            e.preventDefault();
            const nome = document.getElementById('new-doenca-name').value.trim();
            if (!nome) return alert('O nome da doença é obrigatório.');
            
            const data = {
                nome: nome,
                testes: Array.from(document.querySelectorAll('#new-testes-container .teste-row')).map(row => ({
                    label: row.querySelector('.teste-label').value.trim(),
                    placeholder: row.querySelector('.teste-placeholder').value.trim()
                })).filter(t => t.label)
            };
            
            const result = await window.electronAPI.saveDoenca(data);
            if (result.success) {
                showNotification('Doença salva!', 'success');
                modalDoencas.hide();
                await loadDoencas();
            } else {
                alert('Erro ao salvar: ' + result.error);
            }
        }
    });
}

// --- LÓGICA DE CARREGAMENTO ---
async function loadDoencas() {
    const result = await window.electronAPI.getDoencas();
    if (result.success) {
        DADOS_DOENCAS = result.data;
        populateDoencasDropdown();
    } else {
        showNotification("Não foi possível carregar os modelos de doenças.", "error");
    }
}

function populateDoencasDropdown() {
    const select = document.getElementById('tipo-exame-especifico');
    if (!select) return;
    const currentValue = select.value;
    select.innerHTML = '<option selected value="">Nenhum (Geral)</option>';
    Object.keys(DADOS_DOENCAS).sort().forEach(nome => {
        const option = document.createElement('option');
        option.value = nome;
        option.textContent = nome;
        select.appendChild(option);
    });
    select.value = currentValue;
}

// --- INICIALIZAÇÃO E EVENTOS PRINCIPAIS (ESTRUTURA CORRIGIDA) ---
document.addEventListener('DOMContentLoaded', () => {
    // 1. Atribui elementos globais
    listView = document.getElementById('list-view');
    formView = document.getElementById('form-view');
    loadingView = document.getElementById('loading-view');
    laudosList = document.getElementById('laudos-list');
    btnNew = document.getElementById('btn-new');
    btnList = document.getElementById('btn-list');
    btnCancel = document.getElementById('btn-cancel');
    laudoForm = document.getElementById('laudo-form');
    btnManageDoencas = document.getElementById('btn-manage-doencas');
    modalDoencasElement = document.getElementById('modal-doencas');
    modalDoencas = modalDoencasElement ? new bootstrap.Modal(modalDoencasElement) : null;
    doencasManagementContent = document.getElementById('doencas-management-content');

    const yearSpan = document.getElementById('year');
    if (yearSpan) yearSpan.textContent = new Date().getFullYear();

    // 2. Anexa todos os handlers de eventos
    attachDoencasModalHandlers();
    btnNew.addEventListener('click', () => showFormView());
    btnList.addEventListener('click', loadLaudos);
    btnCancel.addEventListener('click', () => { editingId = null; showListView(); });
    laudoForm.addEventListener('submit', async (e) => { e.preventDefault(); await saveOrUpdateLaudo(); });
    
    // 3. Carrega os dados iniciais
    loadLaudos();
    loadDoencas();

    // 4. Configura as lógicas do formulário
    setupFormLogic();
});

function setupFormLogic() {
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

     loadIMaskOnce().then((IMaskLib) => {
        try {
            if (inputs.processo) IMaskLib(inputs.processo, { mask: '0000000-00.0000.0.00.0000' });
            if (inputs.cpf) IMaskLib(inputs.cpf, { mask: '000.000.000-00' });
            
            const numberMaskOptions = {
                mask: Number,
                scale: 2,
                signed: false,
                thousandsSeparator: '',
                radix: ',',
                mapToRadix: ['.']
            };

            if (inputs.valorHonorarios) IMaskLib(inputs.valorHonorarios, {...numberMaskOptions, thousandsSeparator: '.'});
            if (inputs.peso) IMaskLib(inputs.peso, numberMaskOptions);

            // MÁSCARA ESPECÍFICA PARA ALTURA
            if (inputs.altura) {
                IMaskLib(inputs.altura, {
                    mask: function (value) {
                        // Remove tudo que não é número
                        const cleanValue = value.replace(/\D/g, '');
                        
                        if (cleanValue.length === 0) return { value: '' };
                        
                        // Se tiver 3 dígitos ou mais, formata como 1,80
                        if (cleanValue.length >= 3) {
                            const metros = cleanValue.slice(0, -2);
                            const centimetros = cleanValue.slice(-2);
                            return { value: `${metros},${centimetros}` };
                        }
                        // Se tiver 1 ou 2 dígitos, assume que são centímetros (0,XX)
                        else {
                            return { value: `0,${cleanValue.padStart(2, '0')}` };
                        }
                    },
                    // Função para converter o valor formatado de volta para número puro
                    commit: function(value, masked) {
                        // Remove a vírgula e zeros à esquerda desnecessários
                        return value.replace(',', '').replace(/^0+/, '');
                    }
                });
            }

        } catch (err) {
            console.error('[renderer] erro aplicando máscaras:', err);
            showNotification('Erro ao aplicar máscaras: ' + err.message, 'error');
        }
    }).catch(err => {
        console.error('[renderer] falha ao carregar IMask:', err);
        showNotification('A biblioteca de máscaras não pôde ser carregada.', 'error');
    });

    const calcularIMC = () => {
        if (!inputs.altura || !inputs.peso || !inputs.imc) return;
        const alturaStr = String(inputs.altura.value || '').replace(',', '.');
        const pesoStr = String(inputs.peso.value || '').replace(',', '.');
        let altura = parseFloat(alturaStr);
        let peso = parseFloat(pesoStr);
        if (isNaN(altura) || isNaN(peso) || altura <= 0 || peso <= 0) { inputs.imc.value = ''; return; }
        const alturaMetros = altura > 3 ? altura / 100 : altura;
        const imc = peso / (alturaMetros * alturaMetros);
        let classificacao = '';
        if (imc < 18.5) classificacao = 'Abaixo do peso'; else if (imc < 25) classificacao = 'Peso normal'; else if (imc < 30) classificacao = 'Sobrepeso'; else if (imc < 35) classificacao = 'Obesidade Grau I'; else if (imc < 40) classificacao = 'Obesidade Grau II'; else classificacao = 'Obesidade Grau III';
        inputs.imc.value = `${imc.toFixed(2)} (${classificacao})`;
    };

    const calcularIdade = () => {
        if (!inputs.dataNascimento || !inputs.idade) return;
        const dataValue = inputs.dataNascimento.value;
        if (!dataValue) { inputs.idade.value = ''; return; }
        const hoje = new Date();
        const nascimento = new Date(dataValue);
        if (nascimento > hoje || isNaN(nascimento.getTime())) { inputs.idade.value = 'Data inválida'; return; }
        let idade = hoje.getFullYear() - nascimento.getFullYear();
        const m = hoje.getMonth() - nascimento.getMonth();
        if (m < 0 || (m === 0 && hoje.getDate() < nascimento.getDate())) idade--;
        inputs.idade.value = idade;
    };

    if (inputs.dataNascimento) { inputs.dataNascimento.addEventListener('change', calcularIdade); }
    if (inputs.peso) { inputs.peso.addEventListener('input', calcularIMC); }
    if (inputs.altura) {
        inputs.altura.addEventListener('input', calcularIMC);
        inputs.altura.addEventListener('blur', function() {
            this.value = formatarAltura(this.value);
            calcularIMC();
        });
    }

    // EVENTOS ADICIONAIS PARA FORMATAR ALTURA
    if (inputs.altura) {
        // Formata quando o campo perde o foco
        inputs.altura.addEventListener('blur', function() {
            this.value = formatarAltura(this.value);
            calcularIMC(); // Recalcula o IMC após formatar
        });
        
        // Formata quando o campo é alterado (opcional)
        inputs.altura.addEventListener('input', function() {
            // Formata em tempo real se o usuário digitar vírgula
            if (this.value.includes(',')) {
                this.value = formatarAltura(this.value);
            }
        });
    }

    if (inputs.selectTipoExame) {
        inputs.selectTipoExame.addEventListener('change', (e) => {
            const selectedKey = e.target.value;
            if (!inputs.examesEspecificosContainer) return;
            inputs.examesEspecificosContainer.innerHTML = '';
            if (selectedKey && DADOS_DOENCAS[selectedKey]) {
                const examesHtml = DADOS_DOENCAS[selectedKey].testes.map(exame => `<div class="col-md-6"><label for="${exame.test_id}" class="form-label">${exame.label}</label><input type="text" class="form-control form-control-sm" id="${exame.test_id}" name="${exame.test_id}" placeholder="${exame.placeholder || ''}"></div>`).join('');
                inputs.examesEspecificosContainer.innerHTML = examesHtml;
            }
        });
    }

    const renderPhotos = () => {
        if (inputs.photosPreviewContainer) {
            inputs.photosPreviewContainer.innerHTML = currentPhotoPaths.map((path, index) => {
                const safePath = `safe-file://${path.replaceAll('\\', '/')}`;
                return `<div class="photo-thumbnail"><img src="${safePath}" alt="Foto ${index + 1}" /><button type="button" class="remove-photo-btn" data-index="${index}">&times;</button></div>`;
            }).join('');
        }
    };

    if (inputs.btnAddPhoto) {
        inputs.btnAddPhoto.addEventListener('click', async () => {
            if (window.electronAPI && typeof window.electronAPI.selectPhotos === 'function') {
                const result = await window.electronAPI.selectPhotos();
                if (result && result.success) { currentPhotoPaths.push(...result.paths); renderPhotos(); }
            } else {
                showNotification('selectPhotos não disponível.', 'error');
            }
        });
    }
    if (inputs.photosPreviewContainer) {
        inputs.photosPreviewContainer.addEventListener('click', (e) => {
            if (e.target.classList.contains('remove-photo-btn')) {
                currentPhotoPaths.splice(parseInt(e.target.dataset.index, 10), 1);
                renderPhotos();
            }
        });
    }

    if (inputs.btnAddExame) {
        inputs.btnAddExame.addEventListener('click', () => {
            const newExame = document.createElement('div');
            newExame.className = 'exame-item';
            newExame.innerHTML = `<textarea class="form-control form-control-sm exame-descricao" rows="2" placeholder="Ex: Audiometria de DD/MM/AAAA..."></textarea><button type="button" class="btn btn-danger btn-sm remove-btn remove-exame-btn">&times;</button>`;
            if (inputs.examesListContainer) inputs.examesListContainer.appendChild(newExame);
            newExame.querySelector('input').focus();
        });
    }
    if (inputs.examesListContainer) {
        inputs.examesListContainer.addEventListener('click', (e) => {
            if (e.target.classList.contains('remove-exame-btn')) e.target.closest('.exame-item').remove();
        });
    }

    if (inputs.btnAddPassadoLaboral) {
        inputs.btnAddPassadoLaboral.addEventListener('click', () => {
            const newEntry = document.createElement('div');
            newEntry.className = 'passado-laboral-item';
            newEntry.innerHTML = `<input type="text" class="form-control form-control-sm laboral-empresa" placeholder="Empresa"><input type="text" class="form-control form-control-sm laboral-funcao" placeholder="Função"><input type="text" class="form-control form-control-sm laboral-periodo" placeholder="Período (ex: jan/2020 a dez/2022)"><button type="button" class="btn btn-danger btn-sm remove-btn remove-passado-laboral-btn">&times;</button>`;
            if (inputs.passadoLaboralList) inputs.passadoLaboralList.appendChild(newEntry);
            newEntry.querySelector('.laboral-empresa').focus();
        });
    }
    if (inputs.passadoLaboralList) {
        inputs.passadoLaboralList.addEventListener('click', (e) => {
            if (e.target.classList.contains('remove-passado-laboral-btn')) e.target.closest('.passado-laboral-item').remove();
        });
    }

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
                item.remove();
                list.querySelectorAll('.number').forEach((num, index) => { num.textContent = `${index + 1}.`; });
            }
        });
    }
};

// --- FUNÇÕES GLOBAIS DE CONTROLE ---
function safeGet(id){ return document.getElementById(id); }
const getQuesitosFromDOM = (container) => {
    if (!container) return [];
    return Array.from(container.querySelectorAll('.quesito-item')).map(item => ({ pergunta: item.querySelector('.quesito-pergunta').value, resposta: item.querySelector('.quesito-resposta').value }));
};
const getExamesFromDOM = () => {
    const container = safeGet('exames-list-container');
    if (!container) return [];
    return Array.from(container.querySelectorAll('.exame-item')).map(item => ({ descricao: item.querySelector('.exame-descricao').value }));
};
const getPassadoLaboralFromDOM = () => {
    const container = safeGet('passado-laboral-list');
    if (!container) return [];
    return Array.from(container.querySelectorAll('.passado-laboral-item')).map(item => ({ empresa: item.querySelector('.laboral-empresa').value, funcao: item.querySelector('.laboral-funcao').value, periodo: item.querySelector('.laboral-periodo').value }));
};

// --- NOVA FUNÇÃO PARA COLETAR DADOS DOS EXAMES ESPECÍFICOS ---
function getExamesEspecificosFromDOM() {
    const container = document.getElementById('exames-especificos-container');
    const modeloSelecionado = document.getElementById('tipo-exame-especifico').value;
    
    if (!container || !modeloSelecionado || container.children.length === 0) {
        return null;
    }

    const testes = {};
    const inputs = container.querySelectorAll('input.form-control');
    inputs.forEach(input => {
        // Encontra a label associada pelo atributo 'for' que corresponde ao id do input
        const labelElement = document.querySelector(`label[for="${input.id}"]`);
        if (labelElement) {
            const label = labelElement.textContent;
            testes[label] = input.value;
        }
    });

    return {
        modelo: modeloSelecionado,
        testes: testes
    };
}

function showFormView(id = null) {
    editingId = id;
    if (listView) listView.style.display = 'none';
    if (formView) formView.style.display = 'block';
    if (loadingView) loadingView.classList.add('d-none');
    if (id) { loadLaudoForEditing(id); } else { resetForm(); }
}
function showListView() {
    if (listView) listView.style.display = 'block';
    if (formView) formView.style.display = 'none';
    if (loadingView) loadingView.classList.add('d-none');
    resetForm();
}
function showLoading() {
    if (listView) listView.style.display = 'none';
    if (formView) formView.style.display = 'none';
    if (loadingView) {
        loadingView.classList.remove('d-none');
        loadingView.classList.add('d-flex');
    }
}

async function loadLaudos() {
    showLoading();
    try {
        if (window.electronAPI && typeof window.electronAPI.loadLaudos === 'function') {
            const result = await window.electronAPI.loadLaudos();
            if (result.success) renderLaudosList(result.data);
            else showNotification('Erro ao carregar: ' + result.error, 'error');
        } else {
            renderLaudosList([]);
        }
    } catch (error) {
        showNotification('Erro ao carregar: ' + error.message, 'error');
    }
    showListView();
}

async function loadLaudoForEditing(id) {
    showLoading();
    try {
        if (window.electronAPI && typeof window.electronAPI.getLaudo === 'function') {
            const result = await window.electronAPI.getLaudo(id);
            if (result.success) { populateForm(result.data); showFormView(id); }
            else { showNotification('Erro ao carregar laudo: ' + result.error, 'error'); showListView(); }
        } else {
            showNotification('getLaudo não disponível.', 'error');
            showListView();
        }
    } catch (error) {
        showNotification('Erro ao carregar laudo: ' + error.message, 'error');
        showListView();
    }
}
async function deleteLaudo(id) {
    if (!confirm('Tem certeza?')) return;
    showLoading();
    try {
        if (window.electronAPI && typeof window.electronAPI.deleteLaudo === 'function') {
            const result = await window.electronAPI.deleteLaudo(id);
            if (result.success) { showNotification('Laudo excluído!', 'success'); loadLaudos(); }
            else { showNotification('Erro ao excluir: ' + result.error, 'error'); }
        } else showNotification('deleteLaudo não disponível.', 'error');
    } catch (error) {
        showNotification('Erro ao excluir: ' + error.message, 'error');
    }
}

async function saveOrUpdateLaudo() {
    if (!laudoForm) { showNotification('Formulário não encontrado', 'error'); return; }
    const formDataObj = new FormData(laudoForm);
    const formData = {};
    for (let [key, value] of formDataObj.entries()) formData[key] = (typeof value === 'string') ? value.trim() : value;

    if (formData.altura) {
        let alturaNum = parseFloat(String(formData.altura).replace(',', '.'));
        if (!isNaN(alturaNum)) {
            let alturaMetros = alturaNum > 3 ? alturaNum / 100 : alturaNum;
            formData.altura = alturaMetros.toFixed(2);
        }
    }
    if (formData.peso) {
        let pesoNum = parseFloat(String(formData.peso).replace(',', '.'));
        if (!isNaN(pesoNum)) {
            formData.peso = pesoNum.toFixed(2);
        }
    }

    if (!formData.numero_processo || !formData.reclamante) { showNotification('Processo e Reclamante são obrigatórios.', 'error'); return; }

    // CORREÇÃO: Salvando nos campos corretos
    formData.quesitos_reclamante = JSON.stringify(getQuesitosFromDOM(document.getElementById('quesitos-reclamante-list')));
    formData.quesitos_reclamada = JSON.stringify(getQuesitosFromDOM(document.getElementById('quesitos-reclamada-list')));
    // REMOVIDO: Linha antiga que salvava quesitos_juizo
    delete formData.quesitos_juizo;

    const examesEspecificosData = getExamesEspecificosFromDOM();
    if (examesEspecificosData) {
        formData.exames_especificos = JSON.stringify(examesEspecificosData);
    }
    
    // --- FIM DA ALTERAÇÃO ---

    formData.fotos_paths = JSON.stringify(currentPhotoPaths);
    formData.quesitos_juizo = JSON.stringify(getQuesitosFromDOM(document.getElementById('quesitos-juizo-list')));
    formData.exames_complementares = JSON.stringify(getExamesFromDOM());
    formData.passado_laboral = JSON.stringify(getPassadoLaboralFromDOM());

    showLoading();
    try {
        if (editingId) formData.id = editingId;
        if (window.electronAPI && typeof window.electronAPI.saveLaudo === 'function') {
            const result = await window.electronAPI.saveLaudo(formData);
            if (result.success) { showNotification('Laudo salvo!', 'success'); editingId = null; loadLaudos(); }
            else { showNotification('Erro ao salvar: ' + result.error, 'error'); showFormView(editingId); }
        } else {
            console.warn('saveLaudo não disponível; simulando salvamento.');
            showNotification('Laudo (simulado) salvo!', 'success');
            editingId = null;
            loadLaudos();
        }
    } catch (error) {
        showNotification('Erro ao salvar: ' + error.message, 'error');
        showFormView(editingId);
    }
}

function renderLaudosList(laudos) {
    if (!laudos || laudos.length === 0) {
        if (laudosList) laudosList.innerHTML = '<p class="text-muted">Nenhum laudo cadastrado.</p>';
        return;
    }
    if (!laudosList) return;
    laudosList.innerHTML = laudos.map(laudo => `<div class="col-lg-4 col-md-6"><div class="card h-100"><div class="card-body"><h5 class="card-title">${laudo.numero_processo || 'N/A'}</h5><p class="card-text"><strong>Reclamante:</strong> ${laudo.reclamante || 'N/A'}</p><p class="card-text"><small class="text-muted">Data: ${formatDate(laudo.data_laudo)}</small></p></div><div class="card-footer bg-transparent border-top-0 text-end"><button class="btn btn-sm btn-outline-primary" onclick="showFormView(${laudo.id})">Editar</button><button class="btn btn-sm btn-outline-danger" onclick="deleteLaudo(${laudo.id})">Excluir</button></div></div></div>`).join('');
}

const renderQuesitos = (container, quesitos) => {
    if (!container) return;
    container.innerHTML = quesitos.map((q, index) => `<div class="quesito-item" data-index="${index}"><span class="number">${index + 1}.</span><div class="fields flex-grow-1"><textarea class="form-control mb-2 quesito-pergunta" rows="2" placeholder="Digite a pergunta">${q.pergunta || ''}</textarea><textarea class="form-control quesito-resposta" rows="3" placeholder="Digite a resposta">${q.resposta || ''}</textarea></div><button type="button" class="btn btn-danger btn-sm remove-quesito-btn align-self-start">&times;</button></div>`).join('');
};

function populateForm(data) {
    if (!laudoForm) return;
    resetForm();

    if (data.altura) data.altura = String(data.altura).replace('.', ',');
    if (data.peso) data.peso = String(data.peso).replace('.', ',');

    Object.keys(data).forEach(key => {
        const element = document.getElementById(key);
        if (element && data[key] !== null && !key.startsWith('quesitos_')) {
            element.value = data[key];
        }
    });
    
    // CORRETO: Lendo dos campos corretos
    const quesitosReclamante = data.quesitos_reclamante ? JSON.parse(data.quesitos_reclamante) : [];
    renderQuesitos(document.getElementById('quesitos-reclamante-list'), quesitosReclamante);

    const quesitosReclamada = data.quesitos_reclamada ? JSON.parse(data.quesitos_reclamada) : [];
    renderQuesitos(document.getElementById('quesitos-reclamada-list'), quesitosReclamada);
    
    // --- ALTERAÇÃO AQUI: LENDO E PREENCHENDO OS EXAMES ESPECÍFICOS ---
    if (data.exames_especificos) {
        try {
            const examesData = JSON.parse(data.exames_especificos);
            const select = document.getElementById('tipo-exame-especifico');

            if (select && examesData.modelo) {
                select.value = examesData.modelo;
                select.dispatchEvent(new Event('change')); // Isso renderiza os campos corretos

                // Espera um pouco para os campos serem criados no DOM e depois preenche
                setTimeout(() => {
                    if (examesData.testes) {
                        for (const [label, value] of Object.entries(examesData.testes)) {
                            // Encontra o input pelo texto da sua label associada
                            const allLabels = document.querySelectorAll('#exames-especificos-container label');
                            const targetLabel = Array.from(allLabels).find(l => l.textContent === label);
                            if (targetLabel) {
                                const inputId = targetLabel.getAttribute('for');
                                const inputElement = document.getElementById(inputId);
                                if (inputElement) {
                                    inputElement.value = value;
                                }
                            }
                        }
                    }
                }, 100);
            }
        } catch (e) {
            console.error("Erro ao processar dados de exames específicos:", e);
        }
    }
    // --- FIM DA ALTERAÇÃO ---


    if (document.getElementById('data_nascimento') && document.getElementById('data_nascimento').value) document.getElementById('data_nascimento').dispatchEvent(new Event('change'));
    if ((document.getElementById('peso') && document.getElementById('peso').value) || (document.getElementById('altura') && document.getElementById('altura').value)) {
        if (document.getElementById('altura')) document.getElementById('altura').dispatchEvent(new Event('input'));
    }

    currentPhotoPaths = data.fotos_paths ? JSON.parse(data.fotos_paths) : [];
    const container = document.getElementById('photos-preview-container');
    if (container) {
        container.innerHTML = currentPhotoPaths.map((path, index) => {
            const safePath = `safe-file://${path.replaceAll('\\', '/')}`;
            return `<div class="photo-thumbnail"><img src="${safePath}" alt="Foto ${index + 1}" /><button type="button" class="remove-photo-btn" data-index="${index}">&times;</button></div>`;
        }).join('');
    }

    const exames = data.exames_complementares ? JSON.parse(data.exames_complementares) : [];
    const examesContainer = document.getElementById('exames-list-container');
    if (examesContainer) examesContainer.innerHTML = exames.map(exame => `<div class="exame-item"><input type="text" class="form-control form-control-sm exame-descricao" value="${exame.descricao}" placeholder="Ex: Audiometria de DD/MM/AAAA..."><button type="button" class="btn btn-danger btn-sm remove-btn remove-exame-btn">&times;</button></div>`).join('');

    const passadoLaboral = data.passado_laboral ? JSON.parse(data.passado_laboral) : [];
    const passadoLaboralContainer = document.getElementById('passado-laboral-list');
    if (passadoLaboralContainer) passadoLaboralContainer.innerHTML = passadoLaboral.map(item => `<div class="passado-laboral-item"><input type="text" class="form-control form-control-sm laboral-empresa" placeholder="Empresa" value="${item.empresa || ''}"><input type="text" class="form-control form-control-sm laboral-funcao" placeholder="Função" value="${item.funcao || ''}"><input type="text" class="form-control form-control-sm laboral-periodo" placeholder="Período" value="${item.periodo || ''}"><button type="button" class="btn btn-danger btn-sm remove-btn remove-passado-laboral-btn">&times;</button></div>`).join('');

    const selectTipoExame = document.getElementById('tipo-exame-especifico');
    if (selectTipoExame && data.tipo_exame_especifico) {
        selectTipoExame.value = data.tipo_exame_especifico;
        selectTipoExame.dispatchEvent(new Event('change'));
        setTimeout(() => {
            if (DADOS_DOENCAS[data.tipo_exame_especifico]) {
                DADOS_DOENCAS[data.tipo_exame_especifico].testes.forEach(exame => {
                    if (data[exame.test_id] && document.getElementById(exame.test_id)) {
                        document.getElementById(exame.test_id).value = data[exame.test_id];
                    }
                });
            }
        }, 100);
    }
}

function resetForm() {
    if (!laudoForm) return;
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
    if (document.getElementById('perito')) document.getElementById('perito').value = 'João Alberto Maeso Montes';
}