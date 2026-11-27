const { DatabaseSync } = require('node:sqlite');
const path = require('node:path');
const fs = require('node:fs');

// Caminho configurável (ex.: volume do Railway: DB_PATH=/data/dados.db)
const caminhoDb = path.resolve(process.env.DB_PATH || path.join(__dirname, '..', 'data', 'dados.db'));
fs.mkdirSync(path.dirname(caminhoDb), { recursive: true });

const db = new DatabaseSync(caminhoDb);

db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA foreign_keys = ON');

db.exec(`
    CREATE TABLE IF NOT EXISTS usuarios (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tipo TEXT NOT NULL CHECK (tipo IN ('participante', 'organizador')),
        nome TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE COLLATE NOCASE,
        telefone TEXT NOT NULL UNIQUE,
        senha_hash TEXT NOT NULL,
        instituicao TEXT,
        criado_em TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CHECK (tipo <> 'organizador' OR instituicao IS NOT NULL)
    );

    CREATE TABLE IF NOT EXISTS sessoes (
        token_hash TEXT PRIMARY KEY,
        usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
        expira_em INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_sessoes_usuario ON sessoes(usuario_id);

    DROP TABLE IF EXISTS verificacoes;

    CREATE TABLE IF NOT EXISTS eventos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL,
        descricao TEXT NOT NULL DEFAULT '',
        codigo_equipe TEXT NOT NULL UNIQUE,
        codigo_jurado TEXT NOT NULL UNIQUE,
        criado_por INTEGER NOT NULL REFERENCES usuarios(id),
        criado_em TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    -- organizadores/jurados que têm acesso ao evento (o criador também entra aqui)
    CREATE TABLE IF NOT EXISTS evento_organizadores (
        evento_id INTEGER NOT NULL REFERENCES eventos(id) ON DELETE CASCADE,
        usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
        criado_em TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (evento_id, usuario_id)
    );

    CREATE TABLE IF NOT EXISTS cronograma (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        evento_id INTEGER NOT NULL REFERENCES eventos(id) ON DELETE CASCADE,
        titulo TEXT NOT NULL,
        inicio TEXT NOT NULL,
        fim TEXT,
        descricao TEXT NOT NULL DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS desafios (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        evento_id INTEGER NOT NULL REFERENCES eventos(id) ON DELETE CASCADE,
        titulo TEXT NOT NULL,
        descricao TEXT NOT NULL DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS equipes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        evento_id INTEGER NOT NULL REFERENCES eventos(id) ON DELETE CASCADE,
        nome TEXT NOT NULL,
        codigo TEXT NOT NULL UNIQUE,
        criado_por INTEGER NOT NULL REFERENCES usuarios(id),
        criado_em TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (evento_id, nome COLLATE NOCASE)
    );

    CREATE TABLE IF NOT EXISTS equipe_membros (
        equipe_id INTEGER NOT NULL REFERENCES equipes(id) ON DELETE CASCADE,
        usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
        PRIMARY KEY (equipe_id, usuario_id)
    );

    CREATE TABLE IF NOT EXISTS projetos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        equipe_id INTEGER NOT NULL UNIQUE REFERENCES equipes(id) ON DELETE CASCADE,
        nome TEXT NOT NULL,
        descricao TEXT NOT NULL DEFAULT '',
        github TEXT NOT NULL DEFAULT '',
        atualizado_em TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS avaliacoes (
        projeto_id INTEGER NOT NULL REFERENCES projetos(id) ON DELETE CASCADE,
        avaliador_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
        nota REAL NOT NULL CHECK (nota >= 0 AND nota <= 10),
        comentario TEXT NOT NULL DEFAULT '',
        atualizado_em TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (projeto_id, avaliador_id)
    );
`);

// Migração: bancos criados antes do encerramento de evento não têm a coluna
if (!db.prepare('PRAGMA table_info(eventos)').all().some((c) => c.name === 'encerrado')) {
  db.exec('ALTER TABLE eventos ADD COLUMN encerrado INTEGER NOT NULL DEFAULT 0');
}

// Migração: telefones antigos eram guardados sem o código do país (55)
db.exec("UPDATE usuarios SET telefone = '55' || telefone WHERE length(telefone) IN (10, 11)");

module.exports = db;
