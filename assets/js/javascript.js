/**
 * Este arquivo contém as funções necessárias para:
 * 1. Coletar dados de todas as etapas do formulário multi-etapas
 * 2. Converter para JSON no formato correto
 * 3. Enviar os dados para o Google Apps Script
 * 4. Tratar respostas e erros
 */

// --------- FUNÇÕES PARA O MULTI-STEP FORM ---------

let currentStep = 1;
const totalSteps = 7; // Total de passos do seu formulário

// Função para mostrar o passo correto
function showStep(stepNumber) {
    document.querySelectorAll('.form-step').forEach((stepEl) => {
        stepEl.classList.remove('active');
    });
    const activeStepElement = document.getElementById(`step-${stepNumber}`);
    if (activeStepElement) {
        activeStepElement.classList.add('active');
        // Carrega o conteúdo se ainda não foi carregado (lazy loading)
        loadStepContent(stepNumber);
    }
    updateNavigationButtons();
    updateProgressBar();
}

// Função para carregar o conteúdo do passo
async function loadStepContent(stepNumber) {
    const containerId = `step-${stepNumber}`;
    const stepFile = `./assets/html/passo${stepNumber}.html`;
    const container = document.getElementById(containerId);

    if (!container) {
        console.error(`Container #${containerId} não encontrado.`);
        return;
    }

    // Verifica se já foi carregado para evitar trabalho desnecessário
    if (container.dataset.loaded === 'true') {
        initializeComponentsInStep(container, stepNumber);
        return;
    }

    // Mostra indicador de carregamento
    container.innerHTML = '<div class="text-center p-5"><div class="spinner-border text-primary" role="status"><span class="visually-hidden">Carregando...</span></div></div>';

    try {
        const response = await fetch(stepFile);
        
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status} - ${response.statusText}`);
        }

        const html = await response.text();
        container.innerHTML = html;
        container.dataset.loaded = 'true';

        // Inicializa componentes dinâmicos (select2, etc)
        initializeComponentsInStep(container, stepNumber);

    } catch (error) {
        console.error(`Erro ao carregar conteúdo do Passo ${stepNumber}:`, error);
        if (container) {
            container.innerHTML = `<p class="text-danger text-center fw-bold p-4">Erro ao carregar conteúdo do Passo ${stepNumber}.<br><small>Verifique o console (F12) e o caminho do arquivo: ${stepFile}</small></p>`;
        }
    }
}

// Inicializa componentes JS dentro de um container específico
function initializeComponentsInStep(containerElement, stepNumber) {
    // Verifica se jQuery e Select2 estão carregados
    if (typeof $ !== 'function' || typeof $.fn.select2 !== 'function') {
        console.error('jQuery ou Select2 não estão disponíveis');
        return;
    }

    // Inicializa select2 se existir
    const selectElements = $(containerElement).find('select');
    selectElements.each(function() {
        const $select = $(this);
        if (!$select.hasClass('select2-hidden-accessible')) {
            $select.select2({
                theme: 'bootstrap-5',  // Corrigido de bootstrap4 para bootstrap-5
                placeholder: `Selecione uma opção`,
                allowClear: true,
                width: '100%'          // Garante que o select2 ocupe toda a largura do container
            });
            
            // Adicionar atributo name se não existir
            if (!$select.attr('name') && $select.attr('id')) {
                $select.attr('name', $select.attr('id'));
                console.log(`Adicionado name=${$select.attr('id')} ao select`);
            }
        }
    });
    
    // Inicializa máscaras para inputs específicos se necessário
    const cpfInput = $(containerElement).find('#cpf');
    if (cpfInput.length > 0 && typeof $.fn.mask === 'function') {
        cpfInput.mask('000.000.000-00');
    }
    
    const telefoneInput = $(containerElement).find('#telefone, #celular');
    if (telefoneInput.length > 0 && typeof $.fn.mask === 'function') {
        telefoneInput.mask('(00) 00000-0000');
    }
    
    const cepInput = $(containerElement).find('#cep');
    if (cepInput.length > 0 && typeof $.fn.mask === 'function') {
        cepInput.mask('00000-000');
    }
}

// Função para atualizar os botões de navegação
function updateNavigationButtons() {
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const submitBtn = document.getElementById('submitBtn');

    prevBtn.disabled = (currentStep === 1);
    nextBtn.style.display = (currentStep === totalSteps) ? 'none' : 'inline-block';
    submitBtn.style.display = (currentStep === totalSteps) ? 'inline-block' : 'none';
}

// Função para atualizar a barra de progresso
function updateProgressBar() {
    const progressBar = document.querySelector('.progress-bar');
    if (progressBar) {
        const progress = (currentStep / totalSteps) * 100;
        progressBar.style.width = `${progress}%`;
        progressBar.textContent = `Passo ${currentStep}`;
        progressBar.setAttribute('aria-valuenow', currentStep);
    }
}

// Função de navegação entre passos
function navigateStep(direction) {
    // Opcionalmente, adicione validação do passo atual aqui
    // if (direction > 0 && !validateStep(currentStep)) return;

    const nextStep = currentStep + direction;
    if (nextStep >= 1 && nextStep <= totalSteps) {
        currentStep = nextStep;
        showStep(currentStep);
    }
}

// --------- FUNÇÕES PARA ENVIAR O FORMULÁRIO ---------

/**
 * Função principal para ser chamada no evento 'submit' do formulário.
 * Esta função coleta TODOS os dados do formulário multi-etapas,
 * independente de qual etapa está visível no momento.
 *
 * @param {Event} event O evento de submit
 * @param {string} scriptUrl A URL do seu Web App do Google Apps Script
 */
async function handleFormSubmit(event, scriptUrl) {
    event.preventDefault();
    
    // Elementos de UI para feedback
    const form = event.target;
    const submitButton = form.querySelector('button[type="submit"]');
    
    // Cria um elemento de status se não existir
    let statusDiv = document.getElementById('status');
    if (!statusDiv) {
        statusDiv = document.createElement('div');
        statusDiv.id = 'status';
        statusDiv.className = 'alert mt-3';
        form.appendChild(statusDiv);
    }
    
    // Feedback visual: desabilita botão e mostra mensagem
    if (submitButton) submitButton.disabled = true;
    statusDiv.className = 'alert alert-info mt-3';
    statusDiv.textContent = 'Enviando dados, aguarde...';
    statusDiv.style.display = 'block';
    
    try {
        // Coleta TODOS os dados do formulário (de todos os passos)
        const formData = collectAllFormData(form);
        
        // Adiciona timestamp do cliente
        formData.timestamp = new Date().toISOString();
        
        // Converte para JSON
        const jsonData = JSON.stringify(formData);
        
        console.log('Dados sendo enviados:', formData);
        
        // SOLUÇÃO CORS: Usar uma abordagem alternativa para enviar os dados
        
        // Método 1: Usando o fetch API com um modo "no-cors" (mas não receberemos resposta)
        // Essa abordagem só funciona para enviar dados, não para receber resposta
        /*
        const response = await fetch(scriptUrl, {
            method: 'POST',
            mode: 'no-cors', // Importante: isso contorna o CORS, mas faz com que não consigamos ler a resposta
            headers: {
                'Content-Type': 'application/json'
            },
            body: jsonData
        });
        */
        
        // Método 2: Usando JSONP com formulário (mais compatível com Google Apps Script)
        // Cria um iframe temporário para submeter o formulário (abordagem JSONP)
        const tempForm = document.createElement('form');
        tempForm.setAttribute('method', 'POST');
        tempForm.setAttribute('action', scriptUrl);
        tempForm.setAttribute('target', '_blank');
        tempForm.style.display = 'none';
        
        // Cria um input para os dados JSON
        const dataInput = document.createElement('input');
        dataInput.setAttribute('type', 'hidden');
        dataInput.setAttribute('name', 'payload');
        dataInput.setAttribute('value', jsonData);
        tempForm.appendChild(dataInput);
        
        // Adiciona o formulário ao documento
        document.body.appendChild(tempForm);
        
        // Cria um listener para mensagens do iframe (opcional)
        window.addEventListener('message', function(event) {
            if (event.origin.includes('script.google.com')) {
                try {
                    const data = JSON.parse(event.data);
                    if (data.result === 'success') {
                        statusDiv.className = 'alert alert-success mt-3';
                        statusDiv.textContent = data.message || 'Dados enviados com sucesso!';
                        
                        // Limpa o formulário após sucesso
                        setTimeout(() => {
                            form.reset();
                            currentStep = 1;
                            showStep(currentStep);
                        }, 2000);
                    } else {
                        throw new Error(data.message || 'Erro desconhecido retornado pelo servidor.');
                    }
                } catch (error) {
                    statusDiv.className = 'alert alert-danger mt-3';
                    statusDiv.textContent = `Erro: ${error.message}`;
                }
            }
        }, false);
        
        // Submete o formulário
        tempForm.submit();
        
        // Assume que o envio foi bem-sucedido após 3 segundos (se não houver resposta)
        setTimeout(() => {
            statusDiv.className = 'alert alert-success mt-3';
            statusDiv.textContent = 'Dados enviados com sucesso!';
            
            // Limpa o formulário
            setTimeout(() => {
                form.reset();
                currentStep = 1;
                showStep(currentStep);
            }, 2000);
        }, 3000);
        
    } catch (error) {
        console.error('Erro ao enviar formulário:', error);
        statusDiv.className = 'alert alert-danger mt-3';
        statusDiv.textContent = `Erro: ${error.message}`;
    } finally {
        // Reabilita o botão de submissão
        if (submitButton) submitButton.disabled = false;
    }
}

/**
 * Coleta todos os dados de um formulário multi-etapas,
 * incluindo dados de etapas não visíveis atualmente.
 * 
 * @param {HTMLFormElement} form O elemento do formulário
 * @returns {Object} Objeto com todos os dados do formulário
 */
function collectAllFormData(form) {
    const dataObject = {};
    
    // Coleta todos os campos de input, select e textarea em TODOS os passos
    const formElements = form.querySelectorAll('input, select, textarea');
    
    formElements.forEach(element => {
        // Ignora elementos sem nome
        if (!element.name) return;
        
        const name = element.name;
        
        // Tratamento específico por tipo de elemento
        switch (element.type) {
            case 'checkbox':
                // Para checkboxes, apenas adiciona valor se estiver marcado
                if (element.checked) {
                    // Verifica se já existe um valor para este nome (para grupos de checkboxes)
                    if (dataObject.hasOwnProperty(name)) {
                        if (Array.isArray(dataObject[name])) {
                            dataObject[name].push(element.value);
                        } else {
                            dataObject[name] = [dataObject[name], element.value];
                        }
                    } else {
                        dataObject[name] = element.value;
                    }
                }
                break;
                
            case 'radio':
                // Para radio buttons, adiciona valor apenas se estiver selecionado
                if (element.checked) {
                    dataObject[name] = element.value;
                }
                break;
                
            case 'select-multiple':
                // Para select múltiplo, coleta todos os valores selecionados
                const selectedOptions = Array.from(element.selectedOptions).map(opt => opt.value);
                dataObject[name] = selectedOptions;
                break;
                
            case 'file':
                // Arquivos não podem ser enviados diretamente via JSON
                // Você precisaria implementar upload separado ou usar Base64
                break;
                
            default:
                // Para outros tipos de input (text, email, etc)
                dataObject[name] = element.value;
        }
    });
    
    return dataObject;
}

// Inicializa o formulário quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', () => {
    // Inicializa o primeiro passo
    showStep(1);
    
    // Adiciona handler de submit ao formulário
    const form = document.getElementById('multiStepForm');
    if (form) {
        const scriptURL = 'https://script.google.com/macros/s/AKfycbwcMyYLy7lM6EASZzCGF4sRsYKH2xo7bCJfh7cPZm61Lo4pPuwZuhyDEvI52zPYgqVbJw/exec';
        form.addEventListener('submit', (event) => {
            handleFormSubmit(event, scriptURL);
        });
    }
});