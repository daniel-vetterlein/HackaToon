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

    await configurarSessao(alvo);
    configurarNavMobile(alvo);
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

async function sair() {
  await fetch('/api/logout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{}',
  }).catch(() => {});
  location.href = '/login';
}
window.hkSair = sair;

// Troca "Entrar / Criar conta" por "Painel / Sair" quando há sessão
async function configurarSessao(alvo) {
  try {
    const resp = await fetch('/api/me');
    if (!resp.ok) return;
    const { usuario } = await resp.json();
    const acoes = alvo.querySelector('.header-actions');
    if (!acoes) return;
    acoes.innerHTML = '';

    const painel = document.createElement('a');
    painel.className = 'btn btn-ghost';
    painel.href = '/painel';
    painel.textContent = usuario.nome.split(' ')[0];

    const botao = document.createElement('button');
    botao.className = 'btn btn-primary comic-button';
    botao.textContent = 'Sair';
    botao.addEventListener('click', sair);

    acoes.append(painel, botao);
  } catch { /* segue deslogado */ }
}


function configurarNavMobile(alvo) {
  const botao = alvo.querySelector('#menu-toggle');
  const nav = alvo.querySelector('#menu-nav');
  if (!botao || !nav) return;

  const definir = (aberto) => {
    nav.classList.toggle('aberto', aberto);
    botao.setAttribute('aria-expanded', String(aberto));
    botao.setAttribute('aria-label', aberto ? 'Fechar menu' : 'Abrir menu');
  };

  botao.addEventListener('click', () => definir(!nav.classList.contains('aberto')));
  nav.addEventListener('click', (e) => { if (e.target.closest('a')) definir(false); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') definir(false); });
  window.matchMedia('(min-width: 861px)').addEventListener('change', () => definir(false));
}
