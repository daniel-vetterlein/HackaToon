const { DatabaseSync } = require('node:sqlite');
const path = require('node:path');
const fs = require('node:fs');

const pasta = path.join(__dirname, '..', 'data');
fs.mkdirSync(pasta, { recursive: true});

const db = new DatabaseSync(path.join(pasta, 'dados.db'));

db.exec('PRAGMA foreign_keys = ON');

db.exec(`
	CREATE TABLE IF NOT EXISTS participantes (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		nome TEXT NOT NULL,
		email TEXT NOT NULL UNIQUE COLLATE NOCASE,
		telefone TEXT NOT NULL UNIQUE,
		senha_hash TEXT NOT NULL,
		criado_em TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
	);


	CREATE TABLE IF NOT EXISTS organizador (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		nome TEXT NOT NULL,
		email TEXT NOT NULL UNIQUE COLLATE NOCASE,
		telefone TEXT NOT NULL UNIQUE,
		senha_hash TEXT NOT NULL,
		criado_em TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
	);
`);

module.exports = db;