# HackaToon

Sistema de hackathon (organizadores, jurados e participantes). Node.js puro, SQLite (`node:sqlite`) e argon2.

## Rodar localmente

Requer Node.js 22.13 ou mais novo.

```bash
npm install
npm start        # http://localhost:3000
```

Variáveis opcionais (veja `.env.example`): `PORT`, `DB_PATH`, `NODE_ENV`.

## Deploy no Railway

1. Crie um projeto no Railway a partir do repositório do GitHub.
2. Adicione um **Volume** ao serviço, montado em `/data`.
3. Em *Variables*, defina `DB_PATH=/data/dados.db` e `NODE_ENV=production`.
4. O Railway define `PORT` sozinho; `npm start` e o healthcheck `/api/saude` já estão configurados em `railway.json`.

Sem volume, o banco é apagado a cada novo deploy.
