import React, { useEffect, useState, useMemo } from 'react';
import {
  Compass,
  Calendar,
  Clock,
  Plus,
  Minus,
  CheckCircle2,
  Circle,
  Trash2,
  FileCheck2,
  Settings,
  X,
  Sparkles,
  Flame,
  Award,
  BookOpen
} from 'lucide-react';
import { GoalData, Todo } from './types';
import {
  fetchGoals,
  saveGoals,
  fetchTodos,
  createTodo,
  updateTodoApi,
  deleteTodoApi,
} from './api';

const USER_ID = 'student_01';

export default function App() {
  const [goalData, setGoalData] = useState<GoalData | null>(null);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form states for adding todo
  const [newTodoText, setNewTodoText] = useState('');
  const [isSubmission, setIsSubmission] = useState(false);

  // Filter state for todos
  const [filter, setFilter] = useState<'all' | 'active' | 'submissions'>('all');

  // Target Settings Modal
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [editTargetName, setEditTargetName] = useState('');
  const [editTargetDate, setEditTargetDate] = useState('');
  const [editDailyHours, setEditDailyHours] = useState(3);
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  // Load initial data
  useEffect(() => {
    async function loadData() {
      try {
        setIsLoading(true);
        setError(null);
        const [goals, todoList] = await Promise.all([
          fetchGoals(USER_ID),
          fetchTodos(USER_ID),
        ]);
        setGoalData(goals);
        setTodos(todoList);
        setEditTargetName(goals.targetName);
        setEditTargetDate(goals.targetDate);
        setEditDailyHours(goals.dailyGoalHours);
      } catch (err) {
        console.error(err);
        setError('データの読み込みに失敗しました。サーバーが起動しているか確認してください。');
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  // Calculate days remaining
  const daysRemaining = useMemo(() => {
    if (!goalData?.targetDate) return 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(goalData.targetDate);
    target.setHours(0, 0, 0, 0);
    const diffTime = target.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }, [goalData?.targetDate]);

  // Calculate pending submissions count
  const pendingSubmissionsCount = useMemo(() => {
    return todos.filter((t) => t.isSubmission && !t.isCompleted).length;
  }, [todos]);

  // Calculate study progress percentage
  const studyProgress = useMemo(() => {
    if (!goalData) return 0;
    const goalMinutes = (goalData.dailyGoalHours || 1) * 60;
    const currentMinutes = goalData.todayStudyMinutes || 0;
    const pct = Math.min(100, Math.round((currentMinutes / goalMinutes) * 100));
    return pct;
  }, [goalData]);

  // Adjust study time (in minutes)
  const adjustStudyMinutes = async (deltaMinutes: number) => {
    if (!goalData) return;
    const newMinutes = Math.max(0, goalData.todayStudyMinutes + deltaMinutes);
    // Optimistic update
    setGoalData({ ...goalData, todayStudyMinutes: newMinutes });

    try {
      await saveGoals(USER_ID, { studyMinutes: newMinutes });
    } catch (err) {
      console.error(err);
      // Revert on error
      const refreshed = await fetchGoals(USER_ID);
      setGoalData(refreshed);
    }
  };

  // Add new todo
  const handleAddTodo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTodoText.trim()) return;

    const text = newTodoText.trim();
    const submissionFlag = isSubmission;
    setNewTodoText('');
    setIsSubmission(false);

    try {
      const res = await createTodo(USER_ID, text, submissionFlag);
      setTodos((prev) => [...prev, res.todo]);
    } catch (err) {
      console.error(err);
      alert('ToDoの追加に失敗しました');
    }
  };

  // Toggle todo completed
  const handleToggleTodo = async (todo: Todo) => {
    const updatedStatus = !todo.isCompleted;
    // Optimistic update
    setTodos((prev) =>
      prev.map((t) => (t.todoId === todo.todoId ? { ...t, isCompleted: updatedStatus } : t))
    );

    try {
      await updateTodoApi(USER_ID, todo.todoId, { isCompleted: updatedStatus });
    } catch (err) {
      console.error(err);
      // Revert
      setTodos((prev) =>
        prev.map((t) => (t.todoId === todo.todoId ? { ...t, isCompleted: !updatedStatus } : t))
      );
    }
  };

  // Delete todo
  const handleDeleteTodo = async (todoId: string) => {
    // Optimistic update
    const previous = todos;
    setTodos((prev) => prev.filter((t) => t.todoId !== todoId));

    try {
      await deleteTodoApi(USER_ID, todoId);
    } catch (err) {
      console.error(err);
      setTodos(previous);
      alert('ToDoの削除に失敗しました');
    }
  };

  // Save Settings Modal
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSettings(true);
    try {
      await saveGoals(USER_ID, {
        targetName: editTargetName,
        targetDate: editTargetDate,
        dailyGoalHours: Number(editDailyHours),
      });
      const updated = await fetchGoals(USER_ID);
      setGoalData(updated);
      setIsSettingsOpen(false);
    } catch (err) {
      console.error(err);
      alert('設定の保存に失敗しました');
    } finally {
      setIsSavingSettings(false);
    }
  };

  // Filtered todos
  const filteredTodos = todos.filter((todo) => {
    if (filter === 'active') return !todo.isCompleted;
    if (filter === 'submissions') return todo.isSubmission && !todo.isCompleted;
    return true;
  });

  // Helper formatting for minutes -> "X時間 Y分"
  const formatTime = (minutes: number) => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h === 0) return `${m}分`;
    if (m === 0) return `${h}時間`;
    return `${h}時間${m}分`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-600 font-medium text-sm">Study Compass を読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 pb-16">
      {/* Top Mobile-First Container */}
      <div className="max-w-md mx-auto bg-white min-h-screen shadow-xl flex flex-col">
        
        {/* Header */}
        <header className="bg-gradient-to-r from-indigo-600 to-blue-600 text-white p-5 sticky top-0 z-20 shadow-md">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-white/10 rounded-xl backdrop-blur-sm">
                <Compass className="w-6 h-6 text-indigo-200 animate-pulse" />
              </div>
              <div>
                <h1 className="font-bold text-lg leading-tight tracking-tight">Study Compass AI</h1>
                <p className="text-xs text-indigo-100 font-medium">受験・学習マネージャー</p>
              </div>
            </div>
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition active:scale-95 text-white"
              title="目標設定"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>

          {/* Countdown & Target Banner */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20 mt-3">
            <div className="flex items-center justify-between text-xs text-indigo-100 mb-1">
              <span className="flex items-center gap-1 font-semibold">
                <Calendar className="w-3.5 h-3.5" />
                {goalData?.targetName || '目標テスト'}
              </span>
              <span>{goalData?.targetDate}</span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-sm font-medium text-white/90">本番・目標日まで</span>
              <div className="flex items-baseline gap-1">
                <span className="text-xs text-indigo-200">あと</span>
                <span className="text-3xl font-extrabold text-amber-300 tracking-tight drop-shadow-sm">
                  {daysRemaining > 0 ? daysRemaining : daysRemaining === 0 ? '本日' : '終了'}
                </span>
                <span className="text-sm font-bold text-amber-200">{daysRemaining >= 0 ? '日' : ''}</span>
              </div>
            </div>
          </div>
        </header>

        {/* Error Alert if any */}
        {error && (
          <div className="m-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {/* Main Content Area */}
        <main className="p-4 space-y-5 flex-1">

          {/* Section 1: 勉強目標・勉強時間の記録 */}
          <section className="bg-gradient-to-br from-indigo-50/60 to-slate-50 border border-indigo-100/80 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-indigo-600 text-white rounded-lg">
                  <Clock className="w-4 h-4" />
                </div>
                <h2 className="font-bold text-sm text-slate-800">今日の勉強時間</h2>
              </div>
              <div className="flex items-center gap-1 text-xs font-semibold text-indigo-700 bg-indigo-100/80 px-2.5 py-1 rounded-full">
                {studyProgress >= 100 ? (
                  <>
                    <Award className="w-3.5 h-3.5 text-amber-600" />
                    <span>目標達成!</span>
                  </>
                ) : (
                  <>
                    <Flame className="w-3.5 h-3.5 text-orange-500" />
                    <span>目標 {goalData?.dailyGoalHours || 3}時間</span>
                  </>
                )}
              </div>
            </div>

            {/* Time Display */}
            <div className="flex items-baseline justify-between mb-2">
              <div className="text-2xl font-black text-slate-800">
                {formatTime(goalData?.todayStudyMinutes || 0)}
              </div>
              <div className="text-xs font-medium text-slate-500">
                目標まであと {formatTime(Math.max(0, (goalData?.dailyGoalHours || 3) * 60 - (goalData?.todayStudyMinutes || 0)))}
              </div>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-slate-200 h-3.5 rounded-full overflow-hidden mb-4 p-0.5">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  studyProgress >= 100
                    ? 'bg-gradient-to-r from-amber-400 to-amber-500 shadow-sm'
                    : 'bg-gradient-to-r from-indigo-500 to-blue-500'
                }`}
                style={{ width: `${studyProgress}%` }}
              />
            </div>

            {/* Plus / Minus Quick Buttons */}
            <div className="grid grid-cols-4 gap-2">
              <button
                onClick={() => adjustStudyMinutes(-30)}
                disabled={(goalData?.todayStudyMinutes || 0) < 30}
                className="py-2 px-1 bg-white hover:bg-slate-100 active:bg-slate-200 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 disabled:opacity-40 transition flex items-center justify-center gap-0.5"
              >
                <Minus className="w-3.5 h-3.5" /> 30分
              </button>
              <button
                onClick={() => adjustStudyMinutes(-15)}
                disabled={(goalData?.todayStudyMinutes || 0) < 15}
                className="py-2 px-1 bg-white hover:bg-slate-100 active:bg-slate-200 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 disabled:opacity-40 transition flex items-center justify-center gap-0.5"
              >
                <Minus className="w-3.5 h-3.5" /> 15分
              </button>
              <button
                onClick={() => adjustStudyMinutes(15)}
                className="py-2 px-1 bg-indigo-50 hover:bg-indigo-100 active:bg-indigo-200 border border-indigo-200 rounded-xl text-xs font-semibold text-indigo-700 transition flex items-center justify-center gap-0.5"
              >
                <Plus className="w-3.5 h-3.5" /> 15分
              </button>
              <button
                onClick={() => adjustStudyMinutes(30)}
                className="py-2 px-1 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-0.5 shadow-sm shadow-indigo-200"
              >
                <Plus className="w-3.5 h-3.5" /> 30分
              </button>
            </div>
          </section>

          {/* Section 2: 今日のやること & 提出物管理 */}
          <section className="space-y-3">
            {/* Section Header & Submissions Badge */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-blue-600 text-white rounded-lg">
                  <BookOpen className="w-4 h-4" />
                </div>
                <h2 className="font-bold text-sm text-slate-800">今日のやること (ToDo)</h2>
              </div>

              {/* Pending submissions badge */}
              {pendingSubmissionsCount > 0 ? (
                <span className="flex items-center gap-1 text-xs font-bold bg-rose-50 text-rose-600 border border-rose-200 px-2.5 py-1 rounded-full animate-bounce">
                  <FileCheck2 className="w-3.5 h-3.5" />
                  提出物 残り {pendingSubmissionsCount}件
                </span>
              ) : (
                <span className="text-xs text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  提出物 完了!
                </span>
              )}
            </div>

            {/* Add Todo Form */}
            <form onSubmit={handleAddTodo} className="bg-slate-50 p-3 rounded-2xl border border-slate-200 space-y-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="例：数学ワーク P.20〜25 を解く"
                  value={newTodoText}
                  onChange={(e) => setNewTodoText(e.target.value)}
                  className="flex-1 bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent placeholder:text-slate-400"
                />
                <button
                  type="submit"
                  disabled={!newTodoText.trim()}
                  className="bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white px-4 py-2 rounded-xl text-sm font-semibold disabled:opacity-40 transition shadow-sm"
                >
                  追加
                </button>
              </div>

              {/* Submission checkbox */}
              <label className="inline-flex items-center gap-2 text-xs text-slate-700 font-medium cursor-pointer select-none pt-1">
                <input
                  type="checkbox"
                  checked={isSubmission}
                  onChange={(e) => setIsSubmission(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                />
                <span className="flex items-center gap-1">
                  📌 <span className="font-semibold text-indigo-900">学校・塾の提出物</span> として登録する
                </span>
              </label>
            </form>

            {/* Filter Tabs */}
            <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-semibold text-slate-600">
              <button
                onClick={() => setFilter('all')}
                className={`flex-1 py-1.5 rounded-lg transition ${
                  filter === 'all' ? 'bg-white text-indigo-600 shadow-sm' : 'hover:text-slate-900'
                }`}
              >
                すべて ({todos.length})
              </button>
              <button
                onClick={() => setFilter('active')}
                className={`flex-1 py-1.5 rounded-lg transition ${
                  filter === 'active' ? 'bg-white text-indigo-600 shadow-sm' : 'hover:text-slate-900'
                }`}
              >
                未完了 ({todos.filter((t) => !t.isCompleted).length})
              </button>
              <button
                onClick={() => setFilter('submissions')}
                className={`flex-1 py-1.5 rounded-lg transition ${
                  filter === 'submissions' ? 'bg-white text-rose-600 shadow-sm' : 'hover:text-slate-900'
                }`}
              >
                提出物 ({pendingSubmissionsCount})
              </button>
            </div>

            {/* Todo List */}
            <div className="space-y-2">
              {filteredTodos.length === 0 ? (
                <div className="text-center py-8 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <p className="text-sm text-slate-400 font-medium">タスクはありません</p>
                  <p className="text-xs text-slate-400 mt-1">今日の勉強計画を追加してみよう！</p>
                </div>
              ) : (
                filteredTodos.map((todo) => (
                  <div
                    key={todo.todoId}
                    className={`flex items-center justify-between p-3.5 rounded-xl border transition duration-200 ${
                      todo.isCompleted
                        ? 'bg-slate-50/80 border-slate-200 opacity-75'
                        : todo.isSubmission
                        ? 'bg-rose-50/40 border-rose-200 hover:border-rose-300 shadow-sm'
                        : 'bg-white border-slate-200 hover:border-indigo-200 shadow-sm'
                    }`}
                  >
                    <div
                      onClick={() => handleToggleTodo(todo)}
                      className="flex items-start gap-3 flex-1 cursor-pointer select-none pr-2"
                    >
                      <button
                        type="button"
                        className="mt-0.5 text-indigo-600 focus:outline-none"
                      >
                        {todo.isCompleted ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                        ) : (
                          <Circle className="w-5 h-5 text-slate-300 hover:text-indigo-500" />
                        )}
                      </button>

                      <div className="flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {todo.isSubmission && (
                            <span
                              className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                                todo.isCompleted
                                  ? 'bg-slate-200 text-slate-500'
                                  : 'bg-rose-500 text-white shadow-xs'
                              }`}
                            >
                              🔖 提出物
                            </span>
                          )}
                          <span
                            className={`text-sm font-medium transition ${
                              todo.isCompleted
                                ? 'line-through text-slate-400'
                                : 'text-slate-800'
                            }`}
                          >
                            {todo.text}
                          </span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleDeleteTodo(todo.todoId)}
                      className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition"
                      title="削除"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </section>
        </main>

        {/* Footer info */}
        <footer className="p-4 text-center text-xs text-slate-400 border-t border-slate-100">
          Study Compass AI • 迷わず集中できる学習環境へ
        </footer>
      </div>

      {/* Target Settings Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-2xl p-6 space-y-4 shadow-2xl animate-in fade-in slide-in-from-bottom duration-200">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-base text-slate-800 flex items-center gap-2">
                <Settings className="w-5 h-5 text-indigo-600" />
                目標・勉強時間の設定
              </h3>
              <button
                onClick={() => setIsSettingsOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSettings} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  目標の名前（テスト・受験など）
                </label>
                <input
                  type="text"
                  required
                  value={editTargetName}
                  onChange={(e) => setEditTargetName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  placeholder="例：期末テスト / 志望校入試"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  目標日（テスト当日）
                </label>
                <input
                  type="date"
                  required
                  value={editTargetDate}
                  onChange={(e) => setEditTargetDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  1日の目標勉強時間（時間）
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0.5"
                  max="24"
                  required
                  value={editDailyHours}
                  onChange={(e) => setEditDailyHours(parseFloat(e.target.value) || 1)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsSettingsOpen(false)}
                  className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 transition"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  disabled={isSavingSettings}
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold shadow-md shadow-indigo-200 transition"
                >
                  {isSavingSettings ? '保存中...' : '保存する'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

