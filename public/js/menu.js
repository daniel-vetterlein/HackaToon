async function carregarMenu() {
  const alvo = document.getElementById('menu');
  if (!alvo) return;

  try {
    const resposta = await fetch('/components/menu.html');
    alvo.innerHTML = await resposta.text();

    alvo.querySelectorAll('a').forEach((link) => {
      if (link.getAttribute('href') === location.pathname) {
        link.classList.add('active');
      }
    });

    const respModal = await fetch('/components/modal-registrar.html');
    const htmlModal = await respModal.text();
    document.body.insertAdjacentHTML('beforeend', htmlModal);

    configurarModal();
    
  } catch (erro) {
    console.error('Não foi possível carregar o menu', erro);
  }
}

function configurarModal() {
  const btnAbrir = document.getElementById('btn-criar-conta');
  const modal = document.getElementById('modal-registrar');
  const btnFechar = document.getElementById('fechar-modal');

  if (!btnAbrir || !modal) return;

  // Abre o modal ao clicar em "Criar conta"
  btnAbrir.addEventListener('click', (e) => {
    e.preventDefault();
    modal.classList.add('ativo');
  });

  // Fecha no botão X
  if (btnFechar) {
    btnFechar.addEventListener('click', () => {
      modal.classList.remove('ativo');
    });
  }

  // Fecha ao clicar fora da caixinha (no fundo escuro)
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.classList.remove('ativo');
    }
  });

  // Fecha ao apertar a tecla ESC
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('ativo')) {
      modal.classList.remove('ativo');
    }
  });
}

carregarMenu();