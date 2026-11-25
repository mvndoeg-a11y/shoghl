const { DatabaseSync } = require('node:sqlite');
function open(file) {
  const db = new DatabaseSync(file);
  db.exec(`
  PRAGMA foreign_keys=ON;
  CREATE TABLE IF NOT EXISTS users(id INTEGER PRIMARY KEY, email TEXT UNIQUE NOT NULL, name TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN('seeker','hr')), pass TEXT NOT NULL, company TEXT, headline TEXT, bio TEXT,
    skills TEXT, city TEXT, phone TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP);
  CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id));
  CREATE TABLE IF NOT EXISTS jobs(id INTEGER PRIMARY KEY, hr_id INTEGER NOT NULL REFERENCES users(id), title TEXT NOT NULL,
    company TEXT NOT NULL, city TEXT NOT NULL, type TEXT NOT NULL, remote INTEGER DEFAULT 0, category TEXT,
    salary_min INTEGER, salary_max INTEGER, description TEXT NOT NULL, requirements TEXT, status TEXT DEFAULT 'open',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP);
  CREATE TABLE IF NOT EXISTS applications(id INTEGER PRIMARY KEY, job_id INTEGER NOT NULL REFERENCES jobs(id),
    seeker_id INTEGER NOT NULL REFERENCES users(id), note TEXT, status TEXT DEFAULT 'new',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP, UNIQUE(job_id, seeker_id));
  CREATE TABLE IF NOT EXISTS saved(user_id INTEGER, job_id INTEGER, PRIMARY KEY(user_id, job_id));
  `);
  return db;
}
module.exports = { open };
