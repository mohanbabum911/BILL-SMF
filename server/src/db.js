import sqlite3 from 'sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from './config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbDir = path.resolve(__dirname, '../db');
const dbPath = path.resolve(__dirname, '..', config.dbPath.startsWith('.') ? config.dbPath.replace(/^\.\//, '') : config.dbPath);

if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Database connection failed:', err.message);
  } else {
    console.log(`Connected to SQLite database: ${dbPath}`);
  }
});

export const runSql = (sql, params = []) => new Promise((resolve, reject) => {
  db.run(sql, params, function (err) {
    if (err) return reject(err);
    resolve({ id: this.lastID, changes: this.changes });
  });
});

export const getSql = (sql, params = []) => new Promise((resolve, reject) => {
  db.get(sql, params, (err, row) => {
    if (err) return reject(err);
    resolve(row);
  });
});

export const allSql = (sql, params = []) => new Promise((resolve, reject) => {
  db.all(sql, params, (err, rows) => {
    if (err) return reject(err);
    resolve(rows);
  });
});

export const initializeDatabase = () => {
  const schemaPath = path.resolve(__dirname, '../../docs/database-schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf8');

  return new Promise((resolve, reject) => {
    db.exec(schema, (err) => {
      if (err) return reject(err);
      console.log('SQLite schema initialized');
      resolve();
    });
  });
};

export default db;
