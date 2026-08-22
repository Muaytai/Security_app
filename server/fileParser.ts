import { GoogleGenAI } from '@google/genai';
import * as XLSX from 'xlsx';
import mammoth from 'mammoth';
// @ts-ignore
import pdf from 'pdf-parse/lib/pdf-parse.js';

export interface ParsedOption {
  text: string;
  is_correct: boolean;
}

export interface ParsedQuestion {
  text: string;
  topic_title?: string;
  image_url?: string;
  explanation?: string;
  is_multiple_choice?: boolean;
  options: ParsedOption[];
}

export interface ParsedFileResult {
  topics: { title: string; description?: string }[];
  questions: ParsedQuestion[];
  rawTextPreview?: string;
  method: 'excel' | 'ai' | 'regex';
}

function getGeminiClient(): GoogleGenAI | null {
  if (!process.env.GEMINI_API_KEY) return null;
  return new GoogleGenAI();
}

/**
 * Extract raw text or tabular data from any uploaded file buffer
 */
export async function extractContentFromFile(
  buffer: Buffer,
  fileName: string,
  mimeType: string
): Promise<{ text: string; excelRows?: any[][] }> {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';

  // 1. Excel files (.xlsx, .xls, .csv, .ods)
  if (['xlsx', 'xls', 'csv', 'ods'].includes(ext) || mimeType.includes('spreadsheet') || mimeType.includes('excel') || mimeType.includes('csv')) {
    try {
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const firstSheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[firstSheetName];
      const rows = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1 });
      const text = rows.map((r) => (Array.isArray(r) ? r.join(' | ') : String(r))).join('\n');
      return { text, excelRows: rows };
    } catch (e) {
      console.warn('Excel parse error, falling back to text:', e);
    }
  }

  // 2. Word documents (.docx)
  if (ext === 'docx' || mimeType.includes('wordprocessingml')) {
    try {
      const res = await mammoth.extractRawText({ buffer });
      return { text: res.value };
    } catch (e) {
      console.warn('Mammoth docx parse error:', e);
    }
  }

  // 3. PDF documents (.pdf)
  if (ext === 'pdf' || mimeType.includes('pdf')) {
    try {
      const data = await (pdf as any)(buffer);
      return { text: data.text || '' };
    } catch (e) {
      console.warn('PDF parse error:', e);
    }
  }

  // 4. Default: decode as text (UTF-8 with Windows-1251 fallback detection)
  try {
    let text = buffer.toString('utf-8');
    // If it looks like corrupted CP1251 decoded as utf8, check
    if (text.includes('') || /[\u00C0-\u00FF]{4,}/.test(text)) {
      // try decoding with iconv-lite if available, or keep text
    }
    return { text };
  } catch (e) {
    return { text: buffer.toString('latin1') };
  }
}

/**
 * Direct tabular parser for Excel sheets
 */
export function parseExcelRowsToQuestions(rows: any[][], defaultTopic = 'Импортированные вопросы'): ParsedQuestion[] {
  if (!rows || rows.length < 2) return [];

  const questions: ParsedQuestion[] = [];
  const header = rows[0].map((c) => String(c || '').trim().toLowerCase());

  // Find column indices
  let qIdx = header.findIndex((h) => h.includes('вопрос') || h.includes('question') || h.includes('текст'));
  let correctIdx = header.findIndex((h) => h.includes('правильн') || h.includes('верн') || h.includes('correct') || h.includes('ответ'));
  let topicIdx = header.findIndex((h) => h.includes('тем') || h.includes('раздел') || h.includes('topic') || h.includes('билет'));
  let expIdx = header.findIndex((h) => h.includes('пояснен') || h.includes('комментар') || h.includes('explanation') || h.includes('обоснован'));

  if (qIdx === -1) qIdx = 0; // Default first col is question

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || !row[qIdx]) continue;

    const qText = String(row[qIdx]).trim();
    if (!qText || qText.length < 3) continue;

    const topicTitle = topicIdx !== -1 && row[topicIdx] ? String(row[topicIdx]).trim() : defaultTopic;
    const explanation = expIdx !== -1 && row[expIdx] ? String(row[expIdx]).trim() : '';

    const options: ParsedOption[] = [];
    const correctVal = correctIdx !== -1 && row[correctIdx] !== undefined ? String(row[correctIdx]).trim().toLowerCase() : '';

    // Collect options from other columns
    for (let c = 0; c < row.length; c++) {
      if (c === qIdx || c === topicIdx || c === expIdx || (c === correctIdx && !header[c].includes('вариант') && !header[c].includes('ответ 1'))) {
        continue;
      }
      const optText = String(row[c] || '').trim();
      if (!optText) continue;

      // Check if this option is marked as correct
      const optNum = options.length + 1;
      const isCorrect =
        optText.startsWith('*') ||
        optText.startsWith('+') ||
        optText.includes('(верно)') ||
        optText.includes('(правильно)') ||
        correctVal === String(optNum) ||
        correctVal === optText.toLowerCase() ||
        correctVal.includes(`вариант ${optNum}`) ||
        correctVal.includes(`ответ ${optNum}`);

      const cleanText = optText.replace(/^[\*\+]\s*/, '').replace(/\((верно|правильно|true)\)/i, '').trim();
      if (cleanText) {
        options.push({ text: cleanText, is_correct: isCorrect });
      }
    }

    // If options were collected and at least 2 exist
    if (options.length >= 2) {
      // If none marked as correct, make option 1 correct by default
      if (!options.some((o) => o.is_correct)) {
        options[0].is_correct = true;
      }
      questions.push({
        text: qText,
        topic_title: topicTitle,
        explanation,
        options,
        is_multiple_choice: options.filter((o) => o.is_correct).length > 1,
      });
    }
  }

  return questions;
}

/**
 * Offline Rule-based parser for text / word / pdf
 */
export function parseTextToQuestionsOffline(rawText: string, defaultTopic = 'Импортированные вопросы'): ParsedFileResult {
  const lines = rawText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const questions: ParsedQuestion[] = [];
  const topicsSet = new Set<string>();

  let currentTopic = defaultTopic;
  let currentQuestion: ParsedQuestion | null = null;
  let currentOptions: ParsedOption[] = [];

  const flushQuestion = () => {
    if (currentQuestion && currentOptions.length >= 2) {
      if (!currentOptions.some((o) => o.is_correct)) {
        currentOptions[0].is_correct = true;
      }
      currentQuestion.options = currentOptions;
      currentQuestion.is_multiple_choice = currentOptions.filter((o) => o.is_correct).length > 1;
      questions.push(currentQuestion);
      topicsSet.add(currentQuestion.topic_title || defaultTopic);
    }
    currentQuestion = null;
    currentOptions = [];
  };

  const topicRegex = /^(?:Тема|Раздел|Блок|Билет|Модуль)\s*[:№#]?\s*(.+)$/i;
  const questionHeaderRegex = /^(?:Вопрос\s*(?:№|#|\d+)[:\.]?)\s*(.+)$/i;
  const numberedQuestionRegex = /^(\d+)\.\s+(.+)$/;
  const optionRegex = /^(?:(?:[a-zA-Zа-яА-Я0-9][\.\)\-\–]|[•\*\+\-–])\s*|(?:\([a-zA-Zа-яА-Я0-9]\))\s*)(.+)$/;
  const explanationRegex = /^(?:Пояснение|Обоснование|Справка|Комментарий|Норматив)\s*[:\.]?\s*(.+)$/i;
  const answerMarkerRegex = /^(?:Правильный ответ|Ответ|Верно)\s*[:\.]?\s*(.+)$/i;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Check for Topic declaration
    const topicMatch = line.match(topicRegex);
    if (topicMatch && line.length < 120 && !line.includes('?')) {
      flushQuestion();
      currentTopic = topicMatch[1].trim();
      topicsSet.add(currentTopic);
      continue;
    }

    // Check for Explanation
    const expMatch = line.match(explanationRegex);
    if (expMatch && currentQuestion) {
      currentQuestion.explanation = expMatch[1].trim();
      continue;
    }

    // Check for Correct Answer line (e.g. "Ответ: 2" or "Правильный ответ: А")
    const ansMatch = line.match(answerMarkerRegex);
    if (ansMatch && currentOptions.length > 0) {
      const val = ansMatch[1].trim().toLowerCase();
      const num = parseInt(val, 10);
      if (!isNaN(num) && num > 0 && num <= currentOptions.length) {
        currentOptions.forEach((o, idx) => {
          o.is_correct = idx === num - 1;
        });
      } else {
        const letters = ['а', 'б', 'в', 'г', 'д', 'е', 'a', 'b', 'c', 'd', 'e'];
        const letterIdx = letters.indexOf(val.charAt(0));
        if (letterIdx !== -1 && letterIdx < currentOptions.length) {
          currentOptions.forEach((o, idx) => {
            o.is_correct = idx === letterIdx % (letters.length / 2);
          });
        }
      }
      continue;
    }

    // Explicit Question Header: "Вопрос 1: ..."
    const qHeaderMatch = line.match(questionHeaderRegex);
    if (qHeaderMatch) {
      flushQuestion();
      currentQuestion = {
        text: qHeaderMatch[1].trim(),
        topic_title: currentTopic,
        options: [],
      };
      continue;
    }

    // Numbered Question: "1. Текст вопроса..."
    // If we have no question yet, or if currentQuestion already has >= 2 options collected, this is definitely a new question
    const numQMatch = line.match(numberedQuestionRegex);
    if (numQMatch && (!currentQuestion || currentOptions.length >= 2 || line.endsWith('?') || line.endsWith(':'))) {
      flushQuestion();
      currentQuestion = {
        text: numQMatch[2].trim(),
        topic_title: currentTopic,
        options: [],
      };
      continue;
    }

    // Option detection (e.g. "a) ...", "A. ...", "1) ...", "• ...", "+ ...", "[x] ...")
    const isLetterOrParenOption = /^(?:[a-zA-Zа-яА-Я][\.\)\-\–]|\d+\)|\([a-zA-Zа-яА-Я0-9]\)|[•\*\+\-–])\s*/.test(line);
    const optMatch = line.match(optionRegex);

    if (currentQuestion && (isLetterOrParenOption || (optMatch && currentOptions.length > 0 && !line.includes('?')))) {
      let isCorrect = false;
      let optText = optMatch ? optMatch[1].trim() : line;

      if (
        line.startsWith('*') ||
        line.startsWith('+') ||
        optText.startsWith('+') ||
        optText.startsWith('*') ||
        /\((?:верно|правильно|правильный|да|\+)\)/i.test(line) ||
        /\s\+\s*$/.test(line) ||
        /\[x\]/i.test(line)
      ) {
        isCorrect = true;
      }

      optText = optText
        .replace(/^[\*\+]\s*/, '')
        .replace(/\((?:верно|правильно|правильный|да|\+)\)/gi, '')
        .replace(/\s\+\s*$/g, '')
        .replace(/\[x\]/gi, '')
        .trim();

      if (optText) {
        currentOptions.push({ text: optText, is_correct: isCorrect });
      }
      continue;
    }

    // Fallback for number without dot if none matched yet
    if (numQMatch) {
      flushQuestion();
      currentQuestion = {
        text: numQMatch[2].trim(),
        topic_title: currentTopic,
        options: [],
      };
      continue;
    }

    // If we have an ongoing question and no options yet, append text
    if (currentQuestion && currentOptions.length === 0 && line.length > 0 && !line.startsWith('---')) {
      currentQuestion.text += ' ' + line;
    }
  }

  flushQuestion();

  const topics = Array.from(topicsSet).map((t) => ({ title: t }));
  return {
    topics: topics.length > 0 ? topics : [{ title: defaultTopic }],
    questions,
    rawTextPreview: rawText.slice(0, 1500),
    method: 'regex',
  };
}

/**
 * AI-powered Parser using Gemini API (if key exists)
 */
export async function parseWithGeminiAI(rawText: string, defaultTopic = 'Импортированные вопросы'): Promise<ParsedFileResult> {
  const ai = getGeminiClient();
  if (!ai) {
    throw new Error('GEMINI_API_KEY is not configured');
  }

  // Truncate safely if too massive
  const textSnippet = rawText.slice(0, 80000);

  const prompt = `Ты — профессиональный эксперт по обработке тестов, экзаменов и билетов по охране труда и технике безопасности.
Проанализируй предоставленный текст документа (из PDF, Word, Excel или текстового файла) и извлеки все вопросы, варианты ответов, правильные ответы, пояснения и темы.

ПРАВИЛА:
1. Если тема указана в тексте (заголовок, раздел, билет), используй её в поле "topic_title". Если нет — используй "${defaultTopic}".
2. У каждого вопроса должно быть от 2 до 6 вариантов ответов ("options").
3. Обязательно укажи хотя бы один правильный вариант ("is_correct": true). Если в тексте правильный ответ помечен звездочкой (*), плюсом (+), жирным шрифтом, словом "верно" или указан в конце блока ответов — отметь его. Если правильный ответ не указан явно, логически определи правильный ответ по правилам охраны труда РФ/РБ.
4. Если есть нормативное обоснование или ссылка на правила/инструкции, добавь в "explanation".
5. Установи "is_multiple_choice": true, если правильных ответов больше одного.

Верни СТРОГО валидный JSON-объект следующего формата:
{
  "topics": [
    { "title": "Название темы", "description": "Краткое описание (необязательно)" }
  ],
  "questions": [
    {
      "topic_title": "Название темы",
      "text": "Полный текст вопроса?",
      "explanation": "Обоснование правильного ответа (если есть)",
      "is_multiple_choice": false,
      "options": [
        { "text": "Текст варианта 1", "is_correct": true },
        { "text": "Текст варианта 2", "is_correct": false },
        { "text": "Текст варианта 3", "is_correct": false }
      ]
    }
  ]
}

ТЕКСТ ДЛЯ АНАЛИЗА:
${textSnippet}`;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      temperature: 0.1,
    },
  });

  const responseText = response.text || '{}';
  const parsed = JSON.parse(responseText);

  return {
    topics: Array.isArray(parsed.topics) && parsed.topics.length > 0 ? parsed.topics : [{ title: defaultTopic }],
    questions: Array.isArray(parsed.questions) ? parsed.questions : [],
    rawTextPreview: rawText.slice(0, 1500),
    method: 'ai',
  };
}
