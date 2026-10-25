import express, { Request, Response } from 'express';
import cors from 'cors';
import path from 'node:path';
import fs from 'node:fs';
import {
  db,
  getOrCreateUser,
  getTodayStudyMinutes,
  setTodayStudyMinutes,
  TodoRow,
} from './db.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Helper for today's date in YYYY-MM-DD
function getTodayString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// 1. GET /users/:userId/goals - ゴールの取得 (目標設定 + 本日の勉強時間)
const handleGetGoals = (req: Request, res: Response) => {
  const { userId } = req.params;
  const user = getOrCreateUser(userId);
  const today = (req.query.date as string) || getTodayString();
  const todayStudyMinutes = getTodayStudyMinutes(userId, today);

  res.json({
    userId: user.userId,
    targetDate: user.targetDate,
    targetName: user.targetName,
    dailyGoalHours: user.dailyGoalHours,
    todayStudyMinutes,
    date: today,
  });
};

app.get('/users/:userId/goals', handleGetGoals);
app.get('/api/users/:userId/goals', handleGetGoals);

// 2. POST /users/:userId/goals - ゴールの登録・更新 (目標設定 or 今日の勉強時間の更新)
const handlePostGoals = (req: Request, res: Response) => {
  const { userId } = req.params;
  const user = getOrCreateUser(userId);
  const { targetDate, targetName, dailyGoalHours, studyMinutes, date } = req.body;

  const targetDateVal = targetDate !== undefined ? targetDate : user.targetDate;
  const targetNameVal = targetName !== undefined ? targetName : user.targetName;
  const dailyGoalHoursVal = dailyGoalHours !== undefined ? Number(dailyGoalHours) : user.dailyGoalHours;

  const updateStmt = db.prepare(`
    UPDATE users
    SET targetDate = ?, targetName = ?, dailyGoalHours = ?
    WHERE userId = ?
  `);
  updateStmt.run(targetDateVal, targetNameVal, dailyGoalHoursVal, userId);

  const targetDateStr = date || getTodayString();
  let updatedMinutes = getTodayStudyMinutes(userId, targetDateStr);

  if (studyMinutes !== undefined) {
    updatedMinutes = setTodayStudyMinutes(userId, targetDateStr, Number(studyMinutes));
  }

  res.json({
    success: true,
    user: {
      userId,
      targetDate: targetDateVal,
      targetName: targetNameVal,
      dailyGoalHours: dailyGoalHoursVal,
    },
    todayStudyMinutes: updatedMinutes,
    date: targetDateStr,
  });
};

app.post('/users/:userId/goals', handlePostGoals);
app.post('/api/users/:userId/goals', handlePostGoals);

// 3. GET /users/:userId/todos - タスク一覧取得
const handleGetTodos = (req: Request, res: Response) => {
  const { userId } = req.params;
  const stmt = db.prepare('SELECT * FROM todos WHERE userId = ? ORDER BY createdAt ASC');
  const rows = stmt.all(userId) as unknown as TodoRow[];
  const todos = rows.map((r) => ({
    todoId: r.todoId,
    userId: r.userId,
    text: r.text,
    isCompleted: Boolean(r.isCompleted),
    isSubmission: Boolean(r.isSubmission),
    createdAt: r.createdAt,
  }));
  res.json(todos);
};

app.get('/users/:userId/todos', handleGetTodos);
app.get('/api/users/:userId/todos', handleGetTodos);

// 4. POST /users/:userId/todos - タスクの登録
const handlePostTodos = (req: Request, res: Response) => {
  const { userId } = req.params;
  const { text, isSubmission } = req.body;

  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    return res.status(400).json({ error: 'タスク内容を入力してください。' });
  }

  const todoId = 'todo_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);
  const isSubmissionVal = isSubmission ? 1 : 0;
  const createdAt = new Date().toISOString();

  const stmt = db.prepare(`
    INSERT INTO todos (todoId, userId, text, isCompleted, isSubmission, createdAt)
    VALUES (?, ?, ?, 0, ?, ?)
  `);
  stmt.run(todoId, userId, text.trim(), isSubmissionVal, createdAt);

  res.status(201).json({
    success: true,
    todo: {
      todoId,
      userId,
      text: text.trim(),
      isCompleted: false,
      isSubmission: Boolean(isSubmissionVal),
      createdAt,
    },
  });
};

app.post('/users/:userId/todos', handlePostTodos);
app.post('/api/users/:userId/todos', handlePostTodos);

// 5. PUT /users/:userId/todos/:todoId - タスクの更新
const handlePutTodo = (req: Request, res: Response) => {
  const { userId, todoId } = req.params;
  const { text, isCompleted, isSubmission } = req.body;

  const selectStmt = db.prepare('SELECT * FROM todos WHERE todoId = ? AND userId = ?');
  const current = selectStmt.get(todoId, userId) as unknown as TodoRow | undefined;

  if (!current) {
    return res.status(404).json({ error: 'タスクが見つかりませんでした。' });
  }

  const newText = text !== undefined ? String(text).trim() : current.text;
  const newIsCompleted = isCompleted !== undefined ? (isCompleted ? 1 : 0) : current.isCompleted;
  const newIsSubmission = isSubmission !== undefined ? (isSubmission ? 1 : 0) : current.isSubmission;

  const updateStmt = db.prepare(`
    UPDATE todos
    SET text = ?, isCompleted = ?, isSubmission = ?
    WHERE todoId = ? AND userId = ?
  `);
  updateStmt.run(newText, newIsCompleted, newIsSubmission, todoId, userId);

  res.json({
    success: true,
    todo: {
      todoId,
      userId,
      text: newText,
      isCompleted: Boolean(newIsCompleted),
      isSubmission: Boolean(newIsSubmission),
      createdAt: current.createdAt,
    },
  });
};

app.put('/users/:userId/todos/:todoId', handlePutTodo);
app.put('/api/users/:userId/todos/:todoId', handlePutTodo);

// 6. DELETE /users/:userId/todos/:todoId - タスクの削除
const handleDeleteTodo = (req: Request, res: Response) => {
  const { userId, todoId } = req.params;
  const stmt = db.prepare('DELETE FROM todos WHERE todoId = ? AND userId = ?');
  const result = stmt.run(todoId, userId);

  if (result.changes === 0) {
    return res.status(404).json({ error: 'タスクが見つかりませんでした。' });
  }

  res.json({ success: true, message: 'タスクを削除しました。' });
};

app.delete('/users/:userId/todos/:todoId', handleDeleteTodo);
app.delete('/api/users/:userId/todos/:todoId', handleDeleteTodo);

// Serve static frontend build if available
const clientDistPath = path.resolve(process.cwd(), '../client/dist');
if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`🚀 Study Compass AI サーバーが起動しました: http://localhost:${PORT}`);
});
