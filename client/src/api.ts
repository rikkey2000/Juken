import { GoalData, Todo } from './types';

const API_BASE = import.meta.env.VITE_API_URL || '';

export async function fetchGoals(userId: string): Promise<GoalData> {
  const res = await fetch(`${API_BASE}/users/${encodeURIComponent(userId)}/goals`);
  if (!res.ok) {
    throw new Error('ゴール情報の取得に失敗しました');
  }
  return res.json();
}

export async function saveGoals(
  userId: string,
  data: {
    targetDate?: string;
    targetName?: string;
    dailyGoalHours?: number;
    studyMinutes?: number;
  }
): Promise<{ success: boolean; user: GoalData; todayStudyMinutes: number }> {
  const res = await fetch(`${API_BASE}/users/${encodeURIComponent(userId)}/goals`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    throw new Error('ゴール情報の更新に失敗しました');
  }
  return res.json();
}

export async function fetchTodos(userId: string): Promise<Todo[]> {
  const res = await fetch(`${API_BASE}/users/${encodeURIComponent(userId)}/todos`);
  if (!res.ok) {
    throw new Error('ToDoリストの取得に失敗しました');
  }
  return res.json();
}

export async function createTodo(
  userId: string,
  text: string,
  isSubmission: boolean
): Promise<{ success: boolean; todo: Todo }> {
  const res = await fetch(`${API_BASE}/users/${encodeURIComponent(userId)}/todos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, isSubmission }),
  });
  if (!res.ok) {
    throw new Error('ToDoの登録に失敗しました');
  }
  return res.json();
}

export async function updateTodoApi(
  userId: string,
  todoId: string,
  updates: { text?: string; isCompleted?: boolean; isSubmission?: boolean }
): Promise<{ success: boolean; todo: Todo }> {
  const res = await fetch(
    `${API_BASE}/users/${encodeURIComponent(userId)}/todos/${encodeURIComponent(todoId)}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    }
  );
  if (!res.ok) {
    throw new Error('ToDoの更新に失敗しました');
  }
  return res.json();
}

export async function deleteTodoApi(
  userId: string,
  todoId: string
): Promise<{ success: boolean }> {
  const res = await fetch(
    `${API_BASE}/users/${encodeURIComponent(userId)}/todos/${encodeURIComponent(todoId)}`,
    {
      method: 'DELETE',
    }
  );
  if (!res.ok) {
    throw new Error('ToDoの削除に失敗しました');
  }
  return res.json();
}

