const { DatabaseSync } = require('node:sqlite');
const path = require('node:path');
const fs = require('node:fs');

const pasta = path.join(__dirname, '..', 'data');
fs.mkdirSync(pasta, { recursive: true });

const db = new DatabaseSync(path.join(pasta, 'dados.db'));

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

    CREATE TABLE IF NOT EXISTS verificacoes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT NOT NULL COLLATE NOCASE,
        codigo_hash TEXT NOT NULL,
        expira_em TEXT NOT NULL,
        tentativas INTEGER NOT NULL DEFAULT 0
    );
`);

module.exports = db;