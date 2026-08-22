export interface Topic {
  id: number;
  title: string;
  code?: string;
  description: string;
  icon?: string;
  question_count?: number;
  created_at?: string;
}

export interface AnswerOption {
  id: number;
  question_id: number;
  text: string;
  is_correct: boolean;
}

export interface Question {
  id: number;
  topic_id: number;
  topic_title?: string;
  text: string;
  image_url?: string | null;
  explanation?: string | null;
  is_multiple_choice: boolean;
  options: AnswerOption[];
  created_at?: string;
}

export interface UserSelectedAnswer {
  question_id: number;
  selected_option_ids: number[];
  is_correct: boolean;
}

export interface TestResult {
  id: number;
  employee_name: string;
  department: string;
  topic_id: number;
  topic_title: string;
  mode: 'training' | 'exam';
  score: number;
  total_questions: number;
  passed: boolean;
  time_spent_seconds?: number;
  created_at: string;
  answers_detail?: UserSelectedAnswer[];
}

export interface ImportJSONData {
  topics?: Array<{
    id?: number;
    title: string;
    description?: string;
    icon?: string;
  }>;
  questions: Array<{
    topic_id?: number;
    topic_title?: string;
    text: string;
    image_url?: string | null;
    explanation?: string | null;
    is_multiple_choice?: boolean;
    options: Array<{
      text: string;
      is_correct: boolean;
    }>;
  }>;
}

export interface StatsOverview {
  total_topics: number;
  total_questions: number;
  total_exams: number;
  total_trainings: number;
  exams_passed: number;
  pass_rate_percentage: number;
}
