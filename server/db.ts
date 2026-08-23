import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import initSqlJs, { Database, SqlJsStatic } from 'sql.js';
import { initialSeedTopics, initialSeedQuestions } from './seedData';

const currentDir = typeof __dirname !== 'undefined' ? __dirname : path.dirname(fileURLToPath(import.meta.url));

let SQL: SqlJsStatic;
let db: Database;
const DB_DIR = process.env.USER_DATA_PATH || process.cwd();
const DB_FILE_PATH = path.join(DB_DIR, 'safety_test.sqlite');

export async function getDb(): Promise<Database> {
  if (db) return db;

  const possibleWasmPaths = [
    path.join(currentDir, 'sql-wasm.wasm'),
    path.join(process.cwd(), 'node_modules', 'sql.js', 'dist', 'sql-wasm.wasm'),
    path.join(currentDir, '..', 'node_modules', 'sql.js', 'dist', 'sql-wasm.wasm'),
  ];
  let locateFile: ((file: string) => string) | undefined = undefined;
  for (const p of possibleWasmPaths) {
    if (fs.existsSync(p)) {
      locateFile = () => p;
      break;
    }
  }

  SQL = await initSqlJs(locateFile ? { locateFile } : undefined);

  function initFreshDb(): Database {
    const freshDb = new SQL.Database();
    freshDb.run(`
      CREATE TABLE IF NOT EXISTS topics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT,
        icon TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS questions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        topic_id INTEGER NOT NULL,
        text TEXT NOT NULL,
        image_url TEXT,
        explanation TEXT,
        is_multiple_choice INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(topic_id) REFERENCES topics(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS options (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        question_id INTEGER NOT NULL,
        text TEXT NOT NULL,
        is_correct INTEGER NOT NULL DEFAULT 0,
        FOREIGN KEY(question_id) REFERENCES questions(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS test_results (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        employee_name TEXT NOT NULL,
        department TEXT NOT NULL,
        topic_id INTEGER,
        mode TEXT NOT NULL,
        score INTEGER NOT NULL,
        total_questions INTEGER NOT NULL,
        passed INTEGER NOT NULL,
        time_spent_seconds INTEGER DEFAULT 0,
        answers_json TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);
    return freshDb;
  }

  let loadedSuccessfully = false;
  if (fs.existsSync(DB_FILE_PATH)) {
    try {
      const fileBuffer = fs.readFileSync(DB_FILE_PATH);
      if (fileBuffer.length > 0) {
        db = new SQL.Database(fileBuffer);
        // Verify disk image integrity
        db.exec('PRAGMA schema_version;');
        db.run(`
          CREATE TABLE IF NOT EXISTS topics (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            description TEXT,
            icon TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          );
          CREATE TABLE IF NOT EXISTS questions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            topic_id INTEGER NOT NULL,
            text TEXT NOT NULL,
            image_url TEXT,
            explanation TEXT,
            is_multiple_choice INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          );
          CREATE TABLE IF NOT EXISTS options (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            question_id INTEGER NOT NULL,
            text TEXT NOT NULL,
            is_correct INTEGER NOT NULL DEFAULT 0
          );
          CREATE TABLE IF NOT EXISTS test_results (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            employee_name TEXT NOT NULL,
            department TEXT NOT NULL,
            topic_id INTEGER,
            mode TEXT NOT NULL,
            score INTEGER NOT NULL,
            total_questions INTEGER NOT NULL,
            passed INTEGER NOT NULL,
            time_spent_seconds INTEGER DEFAULT 0,
            answers_json TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          );
        `);
        loadedSuccessfully = true;
      }
    } catch (e) {
      console.error('Existing SQLite file corrupted or malformed, resetting to fresh DB:', e);
      try {
        fs.unlinkSync(DB_FILE_PATH);
      } catch (_) {}
    }
  }

  if (!loadedSuccessfully) {
    db = initFreshDb();
  }

  // Check if we need to seed
  try {
    const countRes = db.exec('SELECT COUNT(*) as count FROM topics');
    const topicsCount = (countRes[0]?.values[0]?.[0] as number) || 0;

    if (topicsCount === 0) {
      seedDatabase();
    }
  } catch (err) {
    console.error('Error during topics check, reseeding:', err);
    db = initFreshDb();
    seedDatabase();
  }

  persistDb();
  return db;
}

export function persistDb() {
  if (!db) return;
  try {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_FILE_PATH, buffer);
  } catch (err) {
    console.error('Failed to persist SQLite database to disk:', err);
  }
}

function seedDatabase() {
  console.log('Seeding initial Occupational Safety (ТБ) topics and questions...');
  
  for (const topic of initialSeedTopics) {
    db.run(
      'INSERT INTO topics (title, description, icon) VALUES (?, ?, ?)',
      [topic.title, topic.description, topic.icon]
    );
  }

  // Fetch topic ids by title
  const topicsRes = db.exec('SELECT id, title FROM topics');
  const topicMap: Record<string, number> = {};
  if (topicsRes[0]) {
    for (const row of topicsRes[0].values) {
      topicMap[row[1] as string] = row[0] as number;
    }
  }

  for (const q of initialSeedQuestions) {
    const topicId = topicMap[q.topic_title] || 1;
    db.run(
      'INSERT INTO questions (topic_id, text, image_url, explanation, is_multiple_choice) VALUES (?, ?, ?, ?, ?)',
      [topicId, q.text, q.image_url || null, q.explanation || null, q.is_multiple_choice ? 1 : 0]
    );

    const lastIdRes = db.exec('SELECT last_insert_rowid() as id');
    const questionId = lastIdRes[0]?.values[0]?.[0] as number;

    for (const opt of q.options) {
      db.run(
        'INSERT INTO options (question_id, text, is_correct) VALUES (?, ?, ?)',
        [questionId, opt.text, opt.is_correct ? 1 : 0]
      );
    }
  }
  console.log('Initial seed complete.');
}
