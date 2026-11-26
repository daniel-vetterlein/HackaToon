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
`);

module.exports = db;
