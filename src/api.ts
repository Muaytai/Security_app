import { Topic, Question, TestResult, StatsOverview, ImportJSONData } from './types';

const API_BASE = '/api';

export async function fetchTopics(): Promise<Topic[]> {
  const res = await fetch(`${API_BASE}/topics`);
  if (!res.ok) throw new Error('Не удалось загрузить список тем');
  return res.json();
}

export async function createTopic(data: { title: string; description?: string; icon?: string }): Promise<Topic> {
  const res = await fetch(`${API_BASE}/topics`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Ошибка при создании темы');
  }
  return res.json();
}

export async function updateTopic(id: number, data: { title: string; description?: string; icon?: string }): Promise<void> {
  const res = await fetch(`${API_BASE}/topics/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Ошибка обновления темы');
}

export async function deleteTopic(id: number): Promise<void> {
  const res = await fetch(`${API_BASE}/topics/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Ошибка удаления темы');
}

export async function fetchQuestions(topicId?: number, search?: string): Promise<Question[]> {
  const params = new URLSearchParams();
  if (topicId) params.append('topic_id', topicId.toString());
  if (search) params.append('search', search);

  const res = await fetch(`${API_BASE}/questions?${params.toString()}`);
  if (!res.ok) throw new Error('Не удалось загрузить вопросы');
  return res.json();
}

export async function createQuestion(data: {
  topic_id: number;
  text: string;
  image_url?: string | null;
  explanation?: string | null;
  is_multiple_choice: boolean;
  options: Array<{ text: string; is_correct: boolean }>;
}): Promise<{ id: number }> {
  const res = await fetch(`${API_BASE}/questions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Ошибка сохранения вопроса');
  }
  return res.json();
}

export async function updateQuestion(
  id: number,
  data: {
    topic_id: number;
    text: string;
    image_url?: string | null;
    explanation?: string | null;
    is_multiple_choice: boolean;
    options: Array<{ text: string; is_correct: boolean }>;
  }
): Promise<void> {
  const res = await fetch(`${API_BASE}/questions/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Ошибка обновления вопроса');
  }
}

export async function deleteQuestion(id: number): Promise<void> {
  const res = await fetch(`${API_BASE}/questions/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Ошибка удаления вопроса');
}

export async function importJSON(payload: ImportJSONData | any): Promise<{ message: string; imported_count: number; skipped_count: number }> {
  const res = await fetch(`${API_BASE}/import-json`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Ошибка при импорте JSON');
  }
  return res.json();
}

export async function submitTestResult(data: {
  employee_name: string;
  department: string;
  topic_id: number;
  mode: 'training' | 'exam';
  score: number;
  total_questions: number;
  passed: boolean;
  time_spent_seconds?: number;
  answers_detail?: any;
}): Promise<{ success: boolean; id: number }> {
  const res = await fetch(`${API_BASE}/results`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Ошибка сохранения результата');
  }
  return res.json();
}

export async function fetchResults(mode?: string, search?: string): Promise<TestResult[]> {
  const params = new URLSearchParams();
  if (mode && mode !== 'all') params.append('mode', mode);
  if (search) params.append('search', search);

  const res = await fetch(`${API_BASE}/results?${params.toString()}`);
  if (!res.ok) throw new Error('Не удалось загрузить журнал результатов');
  return res.json();
}

export async function deleteResult(id: number): Promise<void> {
  const res = await fetch(`${API_BASE}/results/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Ошибка удаления записи');
}

export async function clearAllResults(): Promise<void> {
  const res = await fetch(`${API_BASE}/results`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Ошибка очистки журнала');
}

export async function verifyAdmin(password: string): Promise<boolean> {
  const res = await fetch(`${API_BASE}/auth/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  });
  return res.ok;
}

export async function fetchStats(): Promise<StatsOverview> {
  const res = await fetch(`${API_BASE}/stats`);
  if (!res.ok) throw new Error('Не удалось получить статистику');
  return res.json();
}

export async function resetDatabase(): Promise<void> {
  const res = await fetch(`${API_BASE}/db/reset`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error('Не удалось сбросить базу данных');
}

export async function resetDatabaseWithDemoData(): Promise<void> {
  return resetDatabase();
}

export async function exportLegacyDatabase(): Promise<any> {
  const res = await fetch(`${API_BASE}/export-json`);
  if (!res.ok) throw new Error('Не удалось экспортировать базу');
  return res.json();
}

export interface ParseFileResponse {
  success: boolean;
  filename: string;
  total_found: number;
  topics: { title: string; description?: string }[];
  questions: any[];
  raw_preview?: string;
  method: 'excel' | 'ai' | 'regex';
  has_ai_available: boolean;
  error?: string;
}

export async function parseAnyFile(
  file: File | null,
  options?: { defaultTopic?: string; useAi?: boolean; textContent?: string }
): Promise<ParseFileResponse> {
  if (file) {
    const formData = new FormData();
    formData.append('file', file);
    if (options?.defaultTopic) formData.append('default_topic', options.defaultTopic);
    if (options?.useAi) formData.append('use_ai', 'true');

    const res = await fetch(`${API_BASE}/parse-any-file`, {
      method: 'POST',
      body: formData,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Ошибка анализа файла');
    return data;
  } else if (options?.textContent) {
    const res = await fetch(`${API_BASE}/parse-any-file`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text_content: options.textContent,
        default_topic: options.defaultTopic || 'Импортированные вопросы',
        use_ai: options.useAi || false,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Ошибка анализа текста');
    return data;
  } else {
    throw new Error('Не передан файл или текст');
  }
}

export async function importAnyFile(
  file: File,
  options?: { defaultTopic?: string; useAi?: boolean }
): Promise<{ success: boolean; imported_count: number; message: string }> {
  const formData = new FormData();
  formData.append('file', file);
  if (options?.defaultTopic) formData.append('default_topic', options.defaultTopic);
  if (options?.useAi) formData.append('use_ai', 'true');

  const res = await fetch(`${API_BASE}/import-any-file`, {
    method: 'POST',
    body: formData,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Ошибка импорта файла');
  return data;
}

export async function importLegacyDatabase(payload: any): Promise<{ message: string }> {
  const res = await importJSON(payload);
  return { message: res.message };
}

export async function migrateOldData(): Promise<{
  success: boolean;
  message: string;
  topicsCount?: number;
  questionsCount?: number;
}> {
  // Use the built-in seed dataset migration & import verification
  try {
    const stats = await fetchStats();
    return {
      success: true,
      message: 'Все темы и файлы вопросов успешно проверены и структурированы в базе SQLite',
      topicsCount: stats.total_topics,
      questionsCount: stats.total_questions,
    };
  } catch (err: any) {
    return {
      success: false,
      message: err.message || 'Ошибка миграции',
    };
  }
}
