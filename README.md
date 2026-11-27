# 🚀 HackaToon - Ideias Malucas. Código de Verdade.

> *Junte criatividade, tecnologia e uma boa dose de diversão. No HackaToon, sua próxima grande ideia pode sair do rascunho e ganhar vida.*

---

## 📌 Sobre o Projeto

O **HackaToon** é uma plataforma web para organizar e participar de hackathons. Organizadores criam eventos, cadastram cronograma e desafios e avaliam os projetos; participantes formam equipes e cadastram o projeto que vão apresentar; jurados atribuem notas e, ao final, o sistema calcula a média e monta o pódio.

Este repositório foi desenvolvido como parte de uma atividade acadêmica da faculdade.

---

## ✨ Funcionalidades

**Para todos**
- Cadastro e login com sessão por cookie, logout e rotas protegidas por perfil (organizador ou participante).
- Recuperação de senha por código de recuperação, exibido uma única vez no cadastro.
- Páginas informativas: Cronograma, Sobre, Dúvidas e Privacidade (LGPD).

**Organizadores**
- Criação de eventos, que geram dois códigos separados: um para equipes e outro para jurados/organizadores.
- Entrada em um evento existente pelo código de jurados.
- Cadastro de cronograma e de desafios.
- Visualização dos projetos enviados e avaliação com notas de 0 a 10, com cálculo da média.
- Botão para encerrar (e reabrir) o evento: ao encerrar, os projetos e as notas ficam travados e o pódio e o ranking final são liberados.

**Participantes**
- Criação de equipe com o código do evento e o nome da equipe, que gera um código próprio da equipe.
- Entrada em uma equipe existente usando apenas o código da equipe; saída da equipe e remoção de integrantes (pelo criador).
- Consulta de cronograma e desafios do evento.
- Cadastro e edição do projeto (nome, descrição, link do GitHub e desafio escolhido) enquanto o evento estiver aberto.

---

## 🛠️ Tecnologias

- **Front-end:** HTML5, CSS3 e JavaScript puro, sem frameworks.
- **Back-end:** Node.js (servidor HTTP nativo, sem Express).
- **Banco de Dados:** SQLite, usando o módulo nativo `node:sqlite` do Node.js.
- **Segurança de senhas:** argon2.
- **Hospedagem & Deploy:** Railway.

---

## 🔒 Segurança e Privacidade

- **Proteção de senhas:** as senhas são guardadas apenas como hash argon2 (argon2id), nunca em texto puro. O código de recuperação também é guardado somente como hash.
- **Prevenção a injeções de código:** todas as consultas ao banco usam *prepared statements*, evitando *SQL Injection*. O conteúdo exibido nas páginas é inserido como texto, o que previne XSS.
- **Sessões:** o cookie de sessão é `HttpOnly` e `SameSite=Lax` (e `Secure` em produção); o servidor guarda apenas o hash do token da sessão.
- **Controle de acesso:** cada rota e cada página valida o perfil do usuário e a participação no evento ou na equipe.
- **Limite de tentativas:** o login e a recuperação de senha bloqueiam temporariamente após várias tentativas incorretas.
- **Configuração por variáveis de ambiente:** a porta (`PORT`), o caminho do banco (`DB_PATH`) e o modo de execução (`NODE_ENV`) são definidos fora do código. O arquivo do banco (`*.db`) e os arquivos `.env` não são versionados (`.gitignore`). Veja o modelo em `.env.example`.
- **LGPD:** a página `/lgpd` do sistema traz a Política de Privacidade, com os dados coletados, a finalidade, o compartilhamento e os direitos do titular.

---

## 👥 Equipe / Autores

- Daniel de Sousa Vetterlein
- Davi Takashi Bueno Umeda
- Victor Luiz Ostrovski 
- Vitor Joaquim da Cruz Rodrigues 

---

## Quadro de Tarefas

https://trello.com/invite/b/6a9a05e45669467847515342/ATTId43fcde91579bf9fbee9b66f8b0ef945B4CF1CB8/hackaton

## Proposta de Telas

https://www.figma.com/design/MkYodMBQ4hdo8khKjL690c/Sem-t%C3%ADtulo?node-id=10-22&t=kWz3qyCeH3gDlEgx-1

## 📝 Licença

Este projeto está sob a licença MIT - consulte o arquivo [LICENSE](LICENSE) para mais detalhes.
