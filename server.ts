import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import multer from 'multer';
import { getDb, persistDb } from './server/db';
import { initialSeedTopics, initialSeedQuestions } from './server/seedData';
import {
  extractContentFromFile,
  parseExcelRowsToQuestions,
  parseTextToQuestionsOffline,
  parseWithGeminiAI,
} from './server/fileParser';

const currentDir = typeof __dirname !== 'undefined' ? __dirname : path.dirname(fileURLToPath(import.meta.url));

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 40 * 1024 * 1024 }, // 40MB limit for rich PDFs/DOCX
});

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // Initialize DB
  await getDb();

  // -------------------------------------------------------------
  // API ROUTES
  // -------------------------------------------------------------

  // Health check
  app.get('/api/health', (req: Request, res: Response) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  // Admin Auth verify
  app.post('/api/auth/verify', (req: Request, res: Response) => {
    const { password } = req.body;
    // Default admin password is admin123
    if (password === 'admin123' || password === 'admin' || password === '12345') {
      res.json({ success: true, message: 'Авторизация успешна' });
    } else {
      res.status(401).json({ success: false, message: 'Неверный пароль администратора' });
    }
  });

  // Summary stats
  app.get('/api/stats', async (req: Request, res: Response) => {
    try {
      const db = await getDb();
      const topicsCount = (db.exec('SELECT COUNT(*) FROM topics')[0]?.values[0]?.[0] as number) || 0;
      const questionsCount = (db.exec('SELECT COUNT(*) FROM questions')[0]?.values[0]?.[0] as number) || 0;
      const resultsRes = db.exec('SELECT COUNT(*), SUM(CASE WHEN mode = "exam" THEN 1 ELSE 0 END), SUM(CASE WHEN mode = "training" THEN 1 ELSE 0 END), SUM(CASE WHEN passed = 1 AND mode = "exam" THEN 1 ELSE 0 END) FROM test_results');
      
      const totalResults = (resultsRes[0]?.values[0]?.[0] as number) || 0;
      const totalExams = (resultsRes[0]?.values[0]?.[1] as number) || 0;
      const totalTrainings = (resultsRes[0]?.values[0]?.[2] as number) || 0;
      const examsPassed = (resultsRes[0]?.values[0]?.[3] as number) || 0;
      const passRate = totalExams > 0 ? Math.round((examsPassed / totalExams) * 100) : 0;

      res.json({
        total_topics: topicsCount,
        total_questions: questionsCount,
        total_results: totalResults,
        total_exams: totalExams,
        total_trainings: totalTrainings,
        exams_passed: examsPassed,
        pass_rate_percentage: passRate
      });
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });

  // GET /api/topics
  app.get('/api/topics', async (req: Request, res: Response) => {
    try {
      const db = await getDb();
      const query = `
        SELECT t.id, t.title, t.description, t.icon, t.created_at,
               COUNT(q.id) as question_count
        FROM topics t
        LEFT JOIN questions q ON q.topic_id = t.id
        GROUP BY t.id
        ORDER BY t.id ASC
      `;
      const result = db.exec(query);
      if (!result[0]) {
        return res.json([]);
      }
      const columns = result[0].columns;
      const topics = result[0].values.map((row) => {
        const obj: any = {};
        columns.forEach((col, idx) => {
          obj[col] = row[idx];
        });
        return obj;
      });
      res.json(topics);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/topics
  app.post('/api/topics', async (req: Request, res: Response) => {
    try {
      const { title, description, icon } = req.body;
      if (!title || !title.trim()) {
        return res.status(400).json({ error: 'Название темы обязательно' });
      }
      const db = await getDb();
      db.run('INSERT INTO topics (title, description, icon) VALUES (?, ?, ?)', [
        title.trim(),
        description || '',
        icon || 'book-open'
      ]);
      const idRes = db.exec('SELECT last_insert_rowid() as id');
      const newId = idRes[0]?.values[0]?.[0];
      persistDb();
      res.json({ id: newId, title, description, icon });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // PUT /api/topics/:id
  app.put('/api/topics/:id', async (req: Request, res: Response) => {
    try {
      const topicId = Number(req.params.id);
      const { title, description, icon } = req.body;
      const db = await getDb();
      db.run('UPDATE topics SET title = ?, description = ?, icon = ? WHERE id = ?', [
        title.trim(),
        description || '',
        icon || 'book-open',
        topicId
      ]);
      persistDb();
      res.json({ success: true, id: topicId });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // DELETE /api/topics/:id
  app.delete('/api/topics/:id', async (req: Request, res: Response) => {
    try {
      const topicId = Number(req.params.id);
      const db = await getDb();
      
      // Delete options first for related questions
      db.run('DELETE FROM options WHERE question_id IN (SELECT id FROM questions WHERE topic_id = ?)', [topicId]);
      db.run('DELETE FROM questions WHERE topic_id = ?', [topicId]);
      db.run('DELETE FROM topics WHERE id = ?', [topicId]);
      
      persistDb();
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // GET /api/questions
  app.get('/api/questions', async (req: Request, res: Response) => {
    try {
      const db = await getDb();
      const topicId = req.query.topic_id ? Number(req.query.topic_id) : null;
      const search = req.query.search ? String(req.query.search).trim() : null;

      let whereClause = '1=1';
      const params: any[] = [];

      if (topicId) {
        whereClause += ' AND q.topic_id = ?';
        params.push(topicId);
      }
      if (search) {
        whereClause += ' AND q.text LIKE ?';
        params.push(`%${search}%`);
      }

      const qQuery = `
        SELECT q.id, q.topic_id, q.text, q.image_url, q.explanation, q.is_multiple_choice, q.created_at,
               t.title as topic_title
        FROM questions q
        LEFT JOIN topics t ON t.id = q.topic_id
        WHERE ${whereClause}
        ORDER BY q.id ASC
      `;

      const qRes = db.exec(qQuery, params);
      if (!qRes[0]) {
        return res.json([]);
      }

      const qCols = qRes[0].columns;
      const questions = qRes[0].values.map((row) => {
        const obj: any = {};
        qCols.forEach((col, idx) => {
          obj[col] = row[idx];
        });
        obj.is_multiple_choice = Boolean(obj.is_multiple_choice);
        obj.options = [];
        return obj;
      });

      if (questions.length === 0) {
        return res.json([]);
      }

      const qIds = questions.map((q: any) => q.id);
      const optQuery = `
        SELECT id, question_id, text, is_correct
        FROM options
        WHERE question_id IN (${qIds.join(',')})
        ORDER BY id ASC
      `;
      const optRes = db.exec(optQuery);

      if (optRes[0]) {
        const optCols = optRes[0].columns;
        const qMap = new Map();
        questions.forEach((q: any) => qMap.set(q.id, q));

        optRes[0].values.forEach((row) => {
          const opt: any = {};
          optCols.forEach((col, idx) => {
            opt[col] = row[idx];
          });
          opt.is_correct = Boolean(opt.is_correct);
          const q = qMap.get(opt.question_id);
          if (q) {
            q.options.push(opt);
          }
        });
      }

      res.json(questions);
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/questions
  app.post('/api/questions', async (req: Request, res: Response) => {
    try {
      const { topic_id, text, image_url, explanation, is_multiple_choice, options } = req.body;
      if (!text || !text.trim()) {
        return res.status(400).json({ error: 'Текст вопроса обязателен' });
      }
      if (!options || !Array.isArray(options) || options.length < 2) {
        return res.status(400).json({ error: 'Вопрос должен содержать минимум 2 варианта ответа' });
      }
      const hasCorrect = options.some((opt: any) => opt.is_correct);
      if (!hasCorrect) {
        return res.status(400).json({ error: 'Необходимо указать хотя бы один правильный ответ' });
      }

      const db = await getDb();
      db.run(
        'INSERT INTO questions (topic_id, text, image_url, explanation, is_multiple_choice) VALUES (?, ?, ?, ?, ?)',
        [topic_id, text.trim(), image_url || null, explanation || null, is_multiple_choice ? 1 : 0]
      );

      const idRes = db.exec('SELECT last_insert_rowid() as id');
      const questionId = idRes[0]?.values[0]?.[0] as number;

      for (const opt of options) {
        db.run(
          'INSERT INTO options (question_id, text, is_correct) VALUES (?, ?, ?)',
          [questionId, opt.text.trim(), opt.is_correct ? 1 : 0]
        );
      }

      persistDb();
      res.json({ success: true, id: questionId });
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });

  // PUT /api/questions/:id
  app.put('/api/questions/:id', async (req: Request, res: Response) => {
    try {
      const questionId = Number(req.params.id);
      const { topic_id, text, image_url, explanation, is_multiple_choice, options } = req.body;

      if (!text || !text.trim()) {
        return res.status(400).json({ error: 'Текст вопроса обязателен' });
      }
      if (!options || !Array.isArray(options) || options.length < 2) {
        return res.status(400).json({ error: 'Вопрос должен содержать минимум 2 варианта ответа' });
      }

      const db = await getDb();
      db.run(
        'UPDATE questions SET topic_id = ?, text = ?, image_url = ?, explanation = ?, is_multiple_choice = ? WHERE id = ?',
        [topic_id, text.trim(), image_url || null, explanation || null, is_multiple_choice ? 1 : 0, questionId]
      );

      // Re-insert options
      db.run('DELETE FROM options WHERE question_id = ?', [questionId]);
      for (const opt of options) {
        db.run(
          'INSERT INTO options (question_id, text, is_correct) VALUES (?, ?, ?)',
          [questionId, opt.text.trim(), opt.is_correct ? 1 : 0]
        );
      }

      persistDb();
      res.json({ success: true, id: questionId });
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });

  // DELETE /api/questions/:id
  app.delete('/api/questions/:id', async (req: Request, res: Response) => {
    try {
      const questionId = Number(req.params.id);
      const db = await getDb();
      db.run('DELETE FROM options WHERE question_id = ?', [questionId]);
      db.run('DELETE FROM questions WHERE id = ?', [questionId]);
      persistDb();
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Helper to insert questions and topics into SQLite
  async function insertQuestionsHelper(questionsData: any[], topicsData?: any[], defaultTopicName = 'Импортированные вопросы') {
    const db = await getDb();

    // Ensure topics from payload or mapping
    if (topicsData && Array.isArray(topicsData)) {
      for (const t of topicsData) {
        if (t.title) {
          const existing = db.exec('SELECT id FROM topics WHERE title = ?', [t.title.trim()]);
          if (!existing[0] || existing[0].values.length === 0) {
            db.run('INSERT INTO topics (title, description, icon) VALUES (?, ?, ?)', [
              t.title.trim(),
              t.description || '',
              t.icon || 'folder'
            ]);
          }
        }
      }
    }

    // Build topic cache
    const currentTopicsRes = db.exec('SELECT id, title FROM topics');
    const topicMap = new Map<string, number>();
    if (currentTopicsRes[0]) {
      currentTopicsRes[0].values.forEach((row) => {
        topicMap.set(String(row[1]).trim().toLowerCase(), Number(row[0]));
      });
    }

    let defaultTopicId = topicMap.values().next().value || 1;
    if (defaultTopicName) {
      const defKey = defaultTopicName.trim().toLowerCase();
      if (topicMap.has(defKey)) {
        defaultTopicId = topicMap.get(defKey)!;
      } else {
        db.run('INSERT INTO topics (title, description, icon) VALUES (?, ?, ?)', [
          defaultTopicName.trim(),
          'Импортированная тема',
          'folder'
        ]);
        const newDefId = db.exec('SELECT last_insert_rowid()')[0]?.values[0]?.[0] as number;
        topicMap.set(defKey, newDefId);
        defaultTopicId = newDefId;
      }
    }

    let importedCount = 0;
    let skippedCount = 0;

    for (const item of questionsData) {
      if (!item.text || !item.options || !Array.isArray(item.options) || item.options.length < 2) {
        skippedCount++;
        continue;
      }

      let targetTopicId = defaultTopicId;
      if (item.topic_title) {
        const key = String(item.topic_title).trim().toLowerCase();
        if (topicMap.has(key)) {
          targetTopicId = topicMap.get(key)!;
        } else {
          // Create topic on the fly
          db.run('INSERT INTO topics (title, description, icon) VALUES (?, ?, ?)', [
            item.topic_title.trim(),
            'Импортированная тема',
            'folder'
          ]);
          const newTId = db.exec('SELECT last_insert_rowid()')[0]?.values[0]?.[0] as number;
          topicMap.set(key, newTId);
          targetTopicId = newTId;
        }
      } else if (item.topic_id && Number(item.topic_id)) {
        targetTopicId = Number(item.topic_id);
      }

      const isMulti = item.is_multiple_choice !== undefined 
        ? Boolean(item.is_multiple_choice) 
        : item.options.filter((o: any) => o.is_correct).length > 1;

      db.run(
        'INSERT INTO questions (topic_id, text, image_url, explanation, is_multiple_choice) VALUES (?, ?, ?, ?, ?)',
        [targetTopicId, item.text.trim(), item.image_url || null, item.explanation || null, isMulti ? 1 : 0]
      );

      const qId = db.exec('SELECT last_insert_rowid()')[0]?.values[0]?.[0] as number;

      for (const opt of item.options) {
        db.run(
          'INSERT INTO options (question_id, text, is_correct) VALUES (?, ?, ?)',
          [qId, (opt.text || '').trim(), opt.is_correct ? 1 : 0]
        );
      }
      importedCount++;
    }

    persistDb();
    return { importedCount, skippedCount };
  }

  // POST /api/import-json
  app.post('/api/import-json', async (req: Request, res: Response) => {
    try {
      const payload = req.body;
      const questionsData = Array.isArray(payload) ? payload : (payload.questions || []);

      if (!questionsData || questionsData.length === 0) {
        return res.status(400).json({ error: 'Файл не содержит списка вопросов (questions)' });
      }

      const result = await insertQuestionsHelper(questionsData, payload.topics);
      res.json({
        success: true,
        imported_count: result.importedCount,
        skipped_count: result.skippedCount,
        message: `Успешно импортировано ${result.importedCount} вопросов (пропущено ${result.skippedCount})`
      });
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/parse-any-file (Multi-format preview parser: PDF, DOCX, XLSX, XLS, CSV, TXT)
  app.post('/api/parse-any-file', upload.single('file'), async (req: Request, res: Response) => {
    try {
      let buffer: Buffer | null = null;
      let originalname = 'document.txt';
      let mimetype = 'text/plain';
      let defaultTopic = req.body.default_topic || 'Импортированные вопросы';
      let useAi = req.body.use_ai === 'true' || req.body.use_ai === true;

      const uploadFile = (req as any).file;
      if (uploadFile) {
        buffer = uploadFile.buffer;
        originalname = Buffer.from(uploadFile.originalname, 'latin1').toString('utf8'); // Handle Russian filenames
        mimetype = uploadFile.mimetype;
      } else if (req.body.file_base64) {
        buffer = Buffer.from(req.body.file_base64, 'base64');
        originalname = req.body.file_name || 'document.txt';
        mimetype = req.body.mime_type || 'text/plain';
      } else if (req.body.text_content) {
        buffer = Buffer.from(req.body.text_content, 'utf-8');
        originalname = 'pasted_text.txt';
        mimetype = 'text/plain';
      }

      if (!buffer || buffer.length === 0) {
        return res.status(400).json({ error: 'Файл не передан или пуст' });
      }

      // 1. Extract content
      const { text, excelRows } = await extractContentFromFile(buffer, originalname, mimetype);

      let parseResult: any = null;

      // 2. If excel tabular rows found
      if (excelRows && excelRows.length >= 2 && !useAi) {
        const questions = parseExcelRowsToQuestions(excelRows, defaultTopic);
        if (questions.length > 0) {
          const topicsSet = new Set(questions.map((q) => q.topic_title || defaultTopic));
          parseResult = {
            topics: Array.from(topicsSet).map((t) => ({ title: t })),
            questions,
            rawTextPreview: text.slice(0, 1500),
            method: 'excel',
            filename: originalname,
          };
        }
      }

      // 3. If AI requested or Gemini available & requested
      if (!parseResult && useAi && process.env.GEMINI_API_KEY) {
        try {
          parseResult = await parseWithGeminiAI(text, defaultTopic);
          parseResult.filename = originalname;
        } catch (aiErr: any) {
          console.warn('AI Parsing failed, falling back to rule-based parser:', aiErr.message);
        }
      }

      // 4. Fallback to Offline Regex / Rule-based parser
      if (!parseResult) {
        parseResult = parseTextToQuestionsOffline(text, defaultTopic);
        parseResult.filename = originalname;
      }

      res.json({
        success: true,
        filename: originalname,
        total_found: parseResult.questions.length,
        topics: parseResult.topics,
        questions: parseResult.questions,
        raw_preview: parseResult.rawTextPreview,
        method: parseResult.method,
        has_ai_available: Boolean(process.env.GEMINI_API_KEY),
      });
    } catch (err: any) {
      console.error('Parse file error:', err);
      res.status(500).json({ error: err.message || 'Ошибка обработки файла' });
    }
  });

  // POST /api/import-any-file (Direct file upload and database import)
  app.post('/api/import-any-file', upload.single('file'), async (req: Request, res: Response) => {
    try {
      let buffer: Buffer | null = null;
      let originalname = 'document.txt';
      let mimetype = 'text/plain';
      let defaultTopic = req.body.default_topic || 'Импортированные вопросы';
      let useAi = req.body.use_ai === 'true' || req.body.use_ai === true;

      const uploadFile = (req as any).file;
      if (uploadFile) {
        buffer = uploadFile.buffer;
        originalname = Buffer.from(uploadFile.originalname, 'latin1').toString('utf8');
        mimetype = uploadFile.mimetype;
      } else if (req.body.file_base64) {
        buffer = Buffer.from(req.body.file_base64, 'base64');
        originalname = req.body.file_name || 'document.txt';
        mimetype = req.body.mime_type || 'text/plain';
      }

      if (!buffer || buffer.length === 0) {
        return res.status(400).json({ error: 'Файл не передан или пуст' });
      }

      const { text, excelRows } = await extractContentFromFile(buffer, originalname, mimetype);
      let parseResult: any = null;

      if (excelRows && excelRows.length >= 2 && !useAi) {
        const questions = parseExcelRowsToQuestions(excelRows, defaultTopic);
        if (questions.length > 0) {
          const topicsSet = new Set(questions.map((q) => q.topic_title || defaultTopic));
          parseResult = {
            topics: Array.from(topicsSet).map((t) => ({ title: t })),
            questions,
            method: 'excel',
          };
        }
      }

      if (!parseResult && useAi && process.env.GEMINI_API_KEY) {
        try {
          parseResult = await parseWithGeminiAI(text, defaultTopic);
        } catch (aiErr) {
          console.warn('AI fallback:', aiErr);
        }
      }

      if (!parseResult) {
        parseResult = parseTextToQuestionsOffline(text, defaultTopic);
      }

      if (!parseResult.questions || parseResult.questions.length === 0) {
        return res.status(400).json({
          error: 'В файле не обнаружено подходящих вопросов. Проверьте формат файла или используйте предпросмотр перед импортом.',
          raw_preview: text.slice(0, 1000)
        });
      }

      const result = await insertQuestionsHelper(parseResult.questions, parseResult.topics, defaultTopic);

      res.json({
        success: true,
        filename: originalname,
        imported_count: result.importedCount,
        skipped_count: result.skippedCount,
        method: parseResult.method,
        message: `Успешно импортировано ${result.importedCount} вопросов в базу данных SQLite`
      });
    } catch (err: any) {
      console.error('Import file error:', err);
      res.status(500).json({ error: err.message || 'Ошибка импорта файла' });
    }
  });

  // GET /api/export-json
  app.get('/api/export-json', async (req: Request, res: Response) => {
    try {
      const db = await getDb();
      const topicId = req.query.topic_id ? Number(req.query.topic_id) : null;

      const topicsRes = db.exec('SELECT id, title, description, icon FROM topics ORDER BY id ASC');
      const topics = topicsRes[0] ? topicsRes[0].values.map((r) => ({
        id: r[0],
        title: r[1],
        description: r[2],
        icon: r[3]
      })) : [];

      let qQuery = `
        SELECT q.id, q.topic_id, q.text, q.image_url, q.explanation, q.is_multiple_choice, t.title as topic_title
        FROM questions q
        LEFT JOIN topics t ON t.id = q.topic_id
      `;
      if (topicId) {
        qQuery += ` WHERE q.topic_id = ${topicId}`;
      }
      qQuery += ' ORDER BY q.id ASC';

      const qRes = db.exec(qQuery);
      const questions: any[] = [];
      if (qRes[0]) {
        for (const row of qRes[0].values) {
          const qObj: any = {
            id: row[0],
            topic_id: row[1],
            topic_title: row[6],
            text: row[2],
            image_url: row[3],
            explanation: row[4],
            is_multiple_choice: Boolean(row[5]),
            options: []
          };
          const optRes = db.exec('SELECT text, is_correct FROM options WHERE question_id = ? ORDER BY id ASC', [qObj.id]);
          if (optRes[0]) {
            qObj.options = optRes[0].values.map((oRow) => ({
              text: oRow[0],
              is_correct: Boolean(oRow[1])
            }));
          }
          questions.push(qObj);
        }
      }

      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename="safety_tests_export.json"');
      res.json({
        export_date: new Date().toISOString(),
        format_version: '1.0',
        topics,
        questions
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/results
  app.post('/api/results', async (req: Request, res: Response) => {
    try {
      const {
        employee_name,
        user_name,
        department,
        topic_id,
        mode,
        score,
        total_questions,
        passed,
        time_spent_seconds,
        answers_detail,
        details,
      } = req.body;

      const finalName = employee_name || user_name;
      const finalDept = department || 'Общий отдел';

      if (!finalName || !finalName.trim()) {
        return res.status(400).json({ error: 'ФИО сотрудника обязательно для фиксации результата' });
      }

      const db = await getDb();
      const finalAnswers = answers_detail || details;
      const answersJson = finalAnswers ? JSON.stringify(finalAnswers) : null;

      db.run(
        `INSERT INTO test_results (employee_name, department, topic_id, mode, score, total_questions, passed, time_spent_seconds, answers_json)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          finalName.trim(),
          finalDept.trim(),
          topic_id ? Number(topic_id) : 0,
          mode || 'exam',
          score,
          total_questions,
          passed ? 1 : 0,
          time_spent_seconds || 0,
          answersJson
        ]
      );

      const idRes = db.exec('SELECT last_insert_rowid() as id');
      const newId = idRes[0]?.values[0]?.[0];
      persistDb();

      res.json({ success: true, id: newId });
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });

  // GET /api/results
  app.get('/api/results', async (req: Request, res: Response) => {
    try {
      const db = await getDb();
      const mode = req.query.mode ? String(req.query.mode) : null;
      const search = req.query.search ? String(req.query.search).trim() : null;

      let whereClause = '1=1';
      const params: any[] = [];

      if (mode && mode !== 'all') {
        whereClause += ' AND r.mode = ?';
        params.push(mode);
      }
      if (search) {
        whereClause += ' AND (r.employee_name LIKE ? OR r.department LIKE ? OR t.title LIKE ?)';
        params.push(`%${search}%`, `%${search}%`, `%${search}%`);
      }

      const query = `
        SELECT r.id, r.employee_name, r.department, r.topic_id, r.mode, r.score, r.total_questions, r.passed,
               r.time_spent_seconds, r.answers_json, r.created_at,
               t.title as topic_title
        FROM test_results r
        LEFT JOIN topics t ON t.id = r.topic_id
        WHERE ${whereClause}
        ORDER BY r.id DESC
        LIMIT 500
      `;

      const result = db.exec(query, params);
      if (!result[0]) {
        return res.json([]);
      }

      const cols = result[0].columns;
      const records = result[0].values.map((row) => {
        const obj: any = {};
        cols.forEach((col, idx) => {
          obj[col] = row[idx];
        });
        obj.passed = Boolean(obj.passed);
        if (obj.answers_json) {
          try {
            obj.answers_detail = JSON.parse(obj.answers_json);
          } catch (e) {
            obj.answers_detail = [];
          }
        }
        return obj;
      });

      res.json(records);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // DELETE /api/results (clear all)
  app.delete('/api/results', async (req: Request, res: Response) => {
    try {
      const db = await getDb();
      db.run('DELETE FROM test_results');
      persistDb();
      res.json({ success: true, message: 'Журнал протоколов очищен' });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // DELETE /api/results/:id
  app.delete('/api/results/:id', async (req: Request, res: Response) => {
    try {
      const db = await getDb();
      db.run('DELETE FROM test_results WHERE id = ?', [Number(req.params.id)]);
      persistDb();
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Reset database endpoint
  app.post('/api/db/reset', async (req: Request, res: Response) => {
    try {
      const db = await getDb();
      db.run('DELETE FROM options');
      db.run('DELETE FROM questions');
      db.run('DELETE FROM topics');
      db.run('DELETE FROM test_results');
      
      for (const topic of initialSeedTopics) {
        db.run('INSERT INTO topics (title, description, icon) VALUES (?, ?, ?)', [topic.title, topic.description, topic.icon]);
      }
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
        const lastId = db.exec('SELECT last_insert_rowid() as id')[0]?.values[0]?.[0] as number;
        for (const opt of q.options) {
          db.run('INSERT INTO options (question_id, text, is_correct) VALUES (?, ?, ?)', [lastId, opt.text, opt.is_correct ? 1 : 0]);
        }
      }
      persistDb();
      res.json({ success: true, message: 'База данных успешно сброшена к исходному состоянию' });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // -------------------------------------------------------------
  // VITE / STATIC SERVING
  // -------------------------------------------------------------
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    let distPath = path.join(process.cwd(), 'dist');
    if (!fs.existsSync(path.join(distPath, 'index.html'))) {
      distPath = currentDir;
    }
    if (!fs.existsSync(path.join(distPath, 'index.html'))) {
      distPath = path.join(currentDir, 'dist');
    }
    if (!fs.existsSync(path.join(distPath, 'index.html'))) {
      distPath = path.join(currentDir, '..', 'dist');
    }
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Проверка знаний по ТБ: Сервер запущен на http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal server startup error:', err);
});
