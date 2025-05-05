
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
