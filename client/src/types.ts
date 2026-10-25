export interface UserData {
  userId: string;
  targetDate: string;
  targetName: string;
  dailyGoalHours: number;
}

export interface GoalData extends UserData {
  todayStudyMinutes: number;
  date: string;
}

export interface Todo {
  todoId: string;
  userId: string;
  text: string;
  isCompleted: boolean;
  isSubmission: boolean;
  createdAt: string;
}

