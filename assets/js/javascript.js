
let currentStep = 1;
const totalSteps = 4;

function showStep(step) {
    for (let i = 1; i <= totalSteps; i++) {
        document.getElementById(`step-${i}`).classList.add('d-none');
    }
    document.getElementById(`step-${step}`).classList.remove('d-none');
    updateProgress(step);
}

function nextStep() {
    if (currentStep < totalSteps) {
        currentStep++;
        if (currentStep === 4) {
            loadPreview();
        }
        showStep(currentStep);
    }
}

function prevStep() {
    if (currentStep > 1) {
        currentStep--;
        showStep(currentStep);
    }
}

function updateProgress(step) {
    const progress = (step / totalSteps) * 100;
    const progressBar = document.getElementById('progress-bar');
    progressBar.style.width = progress + '%';

    let texto = '';
    switch (step) {
        case 1: texto = 'Passo 1/3 - Dados Pessoais'; break;
        case 2: texto = 'Passo 2/3 - Dados de Endereço'; break;
        case 3: texto = 'Passo 3/3 - Redes Sociais'; break;
        case 4: texto = 'Passo 3/3 - Dados Para o Evento'; break;
    }
    progressBar.innerText = texto;
}

function loadPreview() {
    // Pegue os valores dos campos e preencha na visualização
    document.getElementById('preview-campo1').innerText = document.querySelector('[name="campo1"]')?.value || '---';
    document.getElementById('preview-campo2').innerText = document.querySelector('[name="campo2"]')?.value || '---';
}

// Inicializa o primeiro step
showStep(currentStep);





/**
 * Função para ser chamada no evento 'submit' do formulário.
 * Previne o envio padrão, coleta os dados, converte para JSON e envia via Fetch API.
 *
 * @param {Event} event O evento de submit.
 * @param {string} scriptUrl A URL do seu Web App Apps Script (endpoint doPost).
 */
async function handleFormSubmit(event, scriptUrl) {
    event.preventDefault(); // Impede o envio padrão do formulário
  
    const form = event.target; // O próprio elemento <form> que disparou o evento
    const submitButton = form.querySelector('button[type="submit"]'); // Encontra o botão de submit
    const statusDiv = document.getElementById('status'); // Assumindo que você tem uma div com id="status" para mensagens
  
    // Desabilita o botão e mostra status
    if (submitButton) submitButton.disabled = true;
    if (statusDiv) {
        statusDiv.textContent = 'Enviando...';
        statusDiv.className = 'status-message info'; // Use classes CSS para estilo
        statusDiv.style.display = 'block';
    }
  
    // 1. Coleta os dados usando FormData (maneira mais fácil e completa)
    const formData = new FormData(form);
  
    // 2. Converte FormData para um objeto JavaScript simples
    const dataObject = {};
    formData.forEach((value, key) => {
      // Refinamento para checkboxes com mesmo nome (cria array)
      if (dataObject.hasOwnProperty(key)) {
        if (Array.isArray(dataObject[key])) {
          dataObject[key].push(value);
        } else {
          dataObject[key] = [dataObject[key], value];
        }
      } else {
        // Se for um checkbox pode ter só um valor, mas vamos padronizar como array se nome sugere multiplos
        // Ou verificar o tipo do elemento: const element = form.elements[key]; if(element.type === 'checkbox' && document.querySelectorAll(`[name="${key}"]`).length > 1) ...
        // Simplificação: Assumir que nomes com [] no final indicam arrays ou tratar no backend
        // OU apenas enviar o último valor se nomes forem iguais (comportamento padrão de FormData para objeto simples)
        dataObject[key] = value;
      }
    });
  
    // 3. Converte o objeto para JSON
    const jsonData = JSON.stringify(dataObject);
  
    // 4. Envia usando a API Fetch do navegador
    try {
      const response = await fetch(scriptUrl, {
        method: 'POST',
        // mode: 'cors', // Geralmente não necessário para POST simples no Apps Script, mas pode ser preciso em alguns casos. Teste sem primeiro.
        headers: {
          // NÃO defina 'Content-Type': 'application/json' aqui se estiver enviando FormData diretamente.
          // MAS, como convertemos para JSON string, precisamos definir:
           'Content-Type': 'application/json',
        },
        body: jsonData // Envia a string JSON
        // Se fosse enviar FormData direto (sem JSON.stringify): body: formData // NÃO definir Content-Type nesse caso
      });
  
      // Verifica se a resposta da rede foi OK
      if (!response.ok) {
         // Tenta ler a resposta de erro do Apps Script (se houver)
         let errorMsg = `HTTP error! status: ${response.status}`;
         try {
           const errorData = await response.json(); // Tenta parsear como JSON
           errorMsg = errorData.message || JSON.stringify(errorData);
         } catch (e) {
           // Se não for JSON, pega o texto
           errorMsg = await response.text();
         }
         throw new Error(errorMsg);
      }
  
      // Processa a resposta do seu script Apps Script (que definimos para retornar JSON)
      const result = await response.json();
  
      console.log('Resposta do script:', result);
      if (result.result === 'success') {
        // Sucesso! Mostra mensagem, limpa o formulário, etc.
        if (statusDiv) {
            statusDiv.textContent = result.message || 'Enviado com sucesso!';
            statusDiv.className = 'status-message success';
        }
        form.reset(); // Limpa o formulário
      } else {
        // Erro reportado pelo script Apps Script
        throw new Error(result.message || 'Erro desconhecido retornado pelo script.');
      }
  
    } catch (error) {
      console.error('Erro ao enviar formulário:', error);
      if (statusDiv) {
          statusDiv.textContent = `Erro: ${error.message}`;
          statusDiv.className = 'status-message error';
      }
    } finally {
      // Reabilita o botão independentemente do resultado
      if (submitButton) submitButton.disabled = false;
    }
  }
  
  // Como usar: Adicione um listener ao seu formulário no HTML
  // Presumindo que seu formulário tem id="multiStepForm" e a URL do script está numa variável
  
  // const meuFormulario = document.getElementById('multiStepForm');
  // const scriptURL = 'URL_DO_SEU_WEB_APP_APPS_SCRIPT_TERMINADA_EM_EXEC';
  //
  // meuFormulario.addEventListener('submit', (event) => {
  //   handleFormSubmit(event, scriptURL);
  // });