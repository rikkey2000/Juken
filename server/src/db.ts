import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';

const dataDir = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'study_compass.db');
export const db = new DatabaseSync(dbPath);

// Initialize tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    userId TEXT PRIMARY KEY,
    targetDate TEXT,
    targetName TEXT,
    dailyGoalHours REAL DEFAULT 3.0
  );

  CREATE TABLE IF NOT EXISTS goals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId TEXT NOT NULL,
    date TEXT NOT NULL,
    studyMinutes INTEGER DEFAULT 0,
    UNIQUE(userId, date)
  );

  CREATE TABLE IF NOT EXISTS todos (
    todoId TEXT PRIMARY KEY,
    userId TEXT NOT NULL,
    text TEXT NOT NULL,
    isCompleted INTEGER DEFAULT 0,
    isSubmission INTEGER DEFAULT 0,
    createdAt TEXT NOT NULL
  );
`);

export interface UserRow {
  userId: string;
  targetDate: string;
  targetName: string;
  dailyGoalHours: number;
}

export interface GoalRow {
  id: number;
  userId: string;
  date: string;
  studyMinutes: number;
}

export interface TodoRow {
  todoId: string;
  userId: string;
  text: string;
  isCompleted: number;
  isSubmission: number;
  createdAt: string;
}

export function getOrCreateUser(userId: string): UserRow {
  const selectStmt = db.prepare('SELECT * FROM users WHERE userId = ?');
  const user = selectStmt.get(userId) as unknown as UserRow | undefined;
  if (user) {
    return user;
  }

  // Default target date: 30 days from today
  const targetDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const insertStmt = db.prepare(`
    INSERT INTO users (userId, targetDate, targetName, dailyGoalHours)
    VALUES (?, ?, ?, ?)
  `);
  insertStmt.run(userId, targetDate, '期末テスト / 志望校合格', 3.0);

  return {
    userId,
    targetDate,
    targetName: '期末テスト / 志望校合格',
    dailyGoalHours: 3.0,
  };
}

export function getTodayStudyMinutes(userId: string, today: string): number {
  const stmt = db.prepare('SELECT studyMinutes FROM goals WHERE userId = ? AND date = ?');
  const result = stmt.get(userId, today) as unknown as { studyMinutes: number } | undefined;
  return result ? result.studyMinutes : 0;
}

export function setTodayStudyMinutes(userId: string, today: string, minutes: number): number {
  const validMinutes = Math.max(0, minutes);
  const stmt = db.prepare(`
    INSERT INTO goals (userId, date, studyMinutes)
    VALUES (?, ?, ?)
    ON CONFLICT(userId, date) DO UPDATE SET studyMinutes = excluded.studyMinutes
  `);
  stmt.run(userId, today, validMinutes);
  return validMinutes;
}
