import React, { useState, useEffect } from 'react';
import { Topic, Question, ImportJSONData } from '../types';
import {
  fetchTopics,
  fetchQuestions,
  createTopic,
  updateTopic,
  deleteTopic,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  importJSON,
  resetDatabase,
  verifyAdmin,
  fetchStats,
  parseAnyFile,
  importAnyFile,
  ParseFileResponse,
} from '../api';
import {
  Plus,
  Trash2,
  Edit2,
  Upload,
  Download,
  Search,
  Lock,
  Unlock,
  FolderPlus,
  RefreshCw,
  Image as ImageIcon,
  CheckCircle,
  AlertTriangle,
  FileJson,
  Database,
  Layers,
  X,
  Check,
  Laptop,
  Terminal,
  FileCode,
  HardDrive,
  Copy,
  ExternalLink,
  FileType,
  FileSpreadsheet,
  FileText,
  Sparkles,
  Loader2,
  ArrowRight,
  Eye,
  CheckSquare,
  Square,
} from 'lucide-react';

interface AdminPanelProps {
  onRefreshGlobalData: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ onRefreshGlobalData }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);

  const [activeSubTab, setActiveSubTab] = useState<'questions' | 'topics' | 'import_export' | 'stats' | 'windows_setup'>('questions');
  const [topics, setTopics] = useState<Topic[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [selectedTopicFilter, setSelectedTopicFilter] = useState<number | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Question Modal
  const [isQuestionModalOpen, setIsQuestionModalOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [qTopicId, setQTopicId] = useState<number>(1);
  const [qText, setQText] = useState('');
  const [qImageUrl, setQImageUrl] = useState('');
  const [qExplanation, setQExplanation] = useState('');
  const [qIsMulti, setQIsMulti] = useState(false);
  const [qOptions, setQOptions] = useState<Array<{ text: string; is_correct: boolean }>>([
    { text: '', is_correct: true },
    { text: '', is_correct: false },
    { text: '', is_correct: false },
    { text: '', is_correct: false },
  ]);
  const [modalError, setModalError] = useState<string | null>(null);

  // Topic Modal
  const [isTopicModalOpen, setIsTopicModalOpen] = useState(false);
  const [editingTopic, setEditingTopic] = useState<Topic | null>(null);
  const [topicTitle, setTopicTitle] = useState('');
  const [topicDescription, setTopicDescription] = useState('');
  const [topicIcon, setTopicIcon] = useState('book-open');

  // Universal Multi-Format Import State (PDF, Word, Excel, TXT, JSON)
  const [importInputMode, setImportInputMode] = useState<'file' | 'text'>('file');
  const [fileToParse, setFileToParse] = useState<File | null>(null);
  const [rawTextToParse, setRawTextToParse] = useState('');
  const [selectedImportTopicId, setSelectedImportTopicId] = useState<number | 'new'>('new');
  const [customImportTopicName, setCustomImportTopicName] = useState('Импортированные вопросы');
  const [useAiExtraction, setUseAiExtraction] = useState(true);
  const [isParsing, setIsParsing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [parseResponse, setParseResponse] = useState<ParseFileResponse | null>(null);
  const [parseErrorMsg, setParseErrorMsg] = useState<string | null>(null);
  const [selectedQuestionIndices, setSelectedQuestionIndices] = useState<Set<number>>(new Set());
  const [isDragOver, setIsDragOver] = useState(false);

  // Stats
  const [stats, setStats] = useState<any>(null);

  // Deletion modals state
  const [confirmDeleteQuestionId, setConfirmDeleteQuestionId] = useState<number | null>(null);
  const [confirmDeleteTopicId, setConfirmDeleteTopicId] = useState<number | null>(null);
  const [isConfirmResetDb, setIsConfirmResetDb] = useState(false);
  const [adminNotification, setAdminNotification] = useState<{ text: string; isError?: boolean } | null>(null);

  useEffect(() => {
    if (isAuthenticated) {
      loadData();
    }
  }, [isAuthenticated, selectedTopicFilter]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [tList, qList, st] = await Promise.all([
        fetchTopics(),
        fetchQuestions(selectedTopicFilter === 'all' ? undefined : selectedTopicFilter, searchQuery),
        fetchStats(),
      ]);
      setTopics(tList);
      setQuestions(qList);
      setStats(st);
      if (tList.length > 0 && !editingQuestion) {
        setQTopicId(tList[0].id);
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    const ok = await verifyAdmin(passwordInput);
    if (ok) {
      setIsAuthenticated(true);
    } else {
      setAuthError('Неверный пароль. По умолчанию: admin123');
    }
  };

  // Open add/edit question modal
  const openQuestionModal = (q?: Question) => {
    setModalError(null);
    if (q) {
      setEditingQuestion(q);
      setQTopicId(q.topic_id);
      setQText(q.text);
      setQImageUrl(q.image_url || '');
      setQExplanation(q.explanation || '');
      setQIsMulti(q.is_multiple_choice);
      setQOptions(q.options.map((o) => ({ text: o.text, is_correct: o.is_correct })));
    } else {
      setEditingQuestion(null);
      setQTopicId(selectedTopicFilter !== 'all' ? selectedTopicFilter : (topics[0]?.id || 1));
      setQText('');
      setQImageUrl('');
      setQExplanation('');
      setQIsMulti(false);
      setQOptions([
        { text: '', is_correct: true },
        { text: '', is_correct: false },
        { text: '', is_correct: false },
        { text: '', is_correct: false },
      ]);
    }
    setIsQuestionModalOpen(true);
  };

  const handleSaveQuestion = async () => {
    if (!qText.trim()) {
      setModalError('Введите текст вопроса');
      return;
    }
    const cleanOptions = qOptions.filter((o) => o.text.trim().length > 0);
    if (cleanOptions.length < 2) {
      setModalError('Вопрос должен иметь как минимум 2 непустых варианта ответа');
      return;
    }
    const hasCorrect = cleanOptions.some((o) => o.is_correct);
    if (!hasCorrect) {
      setModalError('Отметьте хотя бы один вариант как правильный');
      return;
    }

    try {
      const payload = {
        topic_id: qTopicId,
        text: qText.trim(),
        image_url: qImageUrl.trim() || null,
        explanation: qExplanation.trim() || null,
        is_multiple_choice: qIsMulti,
        options: cleanOptions,
      };

      if (editingQuestion) {
        await updateQuestion(editingQuestion.id, payload);
      } else {
        await createQuestion(payload);
      }

      setIsQuestionModalOpen(false);
      loadData();
      onRefreshGlobalData();
    } catch (err: any) {
      setModalError(err.message || 'Ошибка при сохранении вопроса');
    }
  };

  const executeDeleteQuestion = async (id: number) => {
    try {
      await deleteQuestion(id);
      setAdminNotification({ text: `Вопрос #${id} успешно удален` });
      setTimeout(() => setAdminNotification(null), 3000);
      setConfirmDeleteQuestionId(null);
      loadData();
      onRefreshGlobalData();
    } catch (err: any) {
      setAdminNotification({ text: err.message || 'Ошибка удаления вопроса', isError: true });
    }
  };

  const handleImageFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 3 * 1024 * 1024) {
      setAdminNotification({ text: 'Размер файла превышает 3МБ. Выберите изображение меньшего размера.', isError: true });
      return;
    }

    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const base64 = uploadEvent.target?.result as string;
      setQImageUrl(base64);
    };
    reader.readAsDataURL(file);
  };

  // Open Topic Modal
  const openTopicModal = (t?: Topic) => {
    if (t) {
      setEditingTopic(t);
      setTopicTitle(t.title);
      setTopicDescription(t.description || '');
      setTopicIcon(t.icon || 'book-open');
    } else {
      setEditingTopic(null);
      setTopicTitle('');
      setTopicDescription('');
      setTopicIcon('book-open');
    }
    setIsTopicModalOpen(true);
  };

  const handleSaveTopic = async () => {
    if (!topicTitle.trim()) return;
    try {
      if (editingTopic) {
        await updateTopic(editingTopic.id, {
          title: topicTitle.trim(),
          description: topicDescription.trim(),
          icon: topicIcon,
        });
        setAdminNotification({ text: 'Тема успешно обновлена' });
      } else {
        await createTopic({
          title: topicTitle.trim(),
          description: topicDescription.trim(),
          icon: topicIcon,
        });
        setAdminNotification({ text: 'Новая тема успешно создана' });
      }
      setTimeout(() => setAdminNotification(null), 3000);
      setIsTopicModalOpen(false);
      loadData();
      onRefreshGlobalData();
    } catch (err: any) {
      setAdminNotification({ text: err.message || 'Ошибка сохранения темы', isError: true });
    }
  };

  const executeDeleteTopic = async (id: number) => {
    try {
      await deleteTopic(id);
      setAdminNotification({ text: 'Тема и привязанные вопросы удалены' });
      setTimeout(() => setAdminNotification(null), 3000);
      setConfirmDeleteTopicId(null);
      loadData();
      onRefreshGlobalData();
    } catch (err: any) {
      setAdminNotification({ text: err.message || 'Ошибка удаления темы', isError: true });
    }
  };

  // Multi-Format File Import Handlers
  const handleSelectFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileToParse(file);
    setParseResponse(null);
    setParseErrorMsg(null);
  };

  const handleDropFile = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    setFileToParse(file);
    setParseResponse(null);
    setParseErrorMsg(null);
  };

  const handleAnalyzeContent = async () => {
    setParseErrorMsg(null);
    setParseResponse(null);

    const defaultTopic =
      selectedImportTopicId === 'new'
        ? customImportTopicName.trim() || 'Импортированные вопросы'
        : topics.find((t) => t.id === selectedImportTopicId)?.title || 'Импортированные вопросы';

    if (importInputMode === 'file' && !fileToParse) {
      setParseErrorMsg('Пожалуйста, выберите файл для анализа');
      return;
    }

    if (importInputMode === 'text' && !rawTextToParse.trim()) {
      setParseErrorMsg('Пожалуйста, вставьте текст с вопросами');
      return;
    }

    setIsParsing(true);
    try {
      const res = await parseAnyFile(importInputMode === 'file' ? fileToParse : null, {
        defaultTopic,
        useAi: useAiExtraction,
        textContent: importInputMode === 'text' ? rawTextToParse : undefined,
      });

      if (!res.questions || res.questions.length === 0) {
        throw new Error('В файле не обнаружено вопросов. Проверьте форматирование или включите режим ИИ-распознавания.');
      }

      setParseResponse(res);
      // Select all found questions by default
      setSelectedQuestionIndices(new Set(res.questions.map((_, i) => i)));
      setAdminNotification({ text: `Найдено вопросов: ${res.questions.length}. Проверьте предпросмотр ниже.` });
      setTimeout(() => setAdminNotification(null), 3500);
    } catch (err: any) {
      console.error(err);
      setParseErrorMsg(err.message || 'Ошибка распознавания файла');
    } finally {
      setIsParsing(false);
    }
  };

  const handleCommitParsedQuestions = async () => {
    if (!parseResponse || selectedQuestionIndices.size === 0) {
      setParseErrorMsg('Не выбрано ни одного вопроса для импорта');
      return;
    }

    setIsImporting(true);
    try {
      const questionsToSave = parseResponse.questions.filter((_, idx) => selectedQuestionIndices.has(idx));
      const payload = {
        topics: parseResponse.topics,
        questions: questionsToSave,
      };

      const res = await importJSON(payload);
      setAdminNotification({ text: `Успешно сохранено ${res.imported_count} вопросов в базу данных SQLite!` });
      setTimeout(() => setAdminNotification(null), 4000);
      setParseResponse(null);
      setFileToParse(null);
      setRawTextToParse('');
      loadData();
      onRefreshGlobalData();
    } catch (err: any) {
      setParseErrorMsg(err.message || 'Ошибка сохранения в базу данных');
    } finally {
      setIsImporting(false);
    }
  };

  const toggleQuestionSelection = (index: number) => {
    const next = new Set(selectedQuestionIndices);
    if (next.has(index)) {
      next.delete(index);
    } else {
      next.add(index);
    }
    setSelectedQuestionIndices(next);
  };

  const toggleSelectAllQuestions = () => {
    if (!parseResponse) return;
    if (selectedQuestionIndices.size === parseResponse.questions.length) {
      setSelectedQuestionIndices(new Set());
    } else {
      setSelectedQuestionIndices(new Set(parseResponse.questions.map((_, i) => i)));
    }
  };

  const handleDownloadSampleExcel = () => {
    const csvContent = `Тема;Вопрос;Вариант 1;Вариант 2;Вариант 3;Вариант 4;Правильный ответ;Пояснение
Электробезопасность;Какое напряжение считается безопасным в нормальных помещениях?;До 220 В;До 1000 В;До 10 кВ;До 380 В;1;В сухих помещениях допускается эксплуатация оборудования до 220В.
Пожарная безопасность;Какой огнетушитель применяется для электроустановок под напряжением?;Водный;Пенный;Углекислотный;Химический;3;Углекислотные огнетушители не проводят электрический ток.
Охрана труда;Какова периодичность проверки знаний руководителей по охране труда?;1 раз в год;1 раз в 3 года;1 раз в 5 лет;1 раз в 6 месяцев;2;В соответствии с правилами обучения проверка проводится 1 раз в 3 года.`;

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sample_questions_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadSampleWordTxt = () => {
    const txtContent = `================================================================================
ОБРАЗЕЦ ОФОРМЛЕНИЯ ВОПРОСОВ ДЛЯ ИМПОРТА (WORD / TXT / PDF)
================================================================================

Тема: Пожарная безопасность

1. Первичным средством пожаротушения является:
a) Пожарный гидрант
b) Огнетушитель (верно)
c) Пожарный кран
d) Спринклерная система
Пояснение: Огнетушители относятся к первичным средствам тушения первичных возгораний.

2. При обнаружении пожара в первую очередь необходимо:
1) Приступить к эвакуации ценностей
2) Немедленно вызвать пожарную охрану по номеру 101 или 112 (+)
3) Начать тушение всеми доступными средствами
4) Закрыть все окна и двери
Пояснение: Вызов спасателей является первоочередной обязанностью каждого сотрудника.

Тема: Оказание первой помощи

3. При артериальном кровотечении жгут накладывается:
a) Ниже места ранения
b) Выше места ранения (верно)
c) Непосредственно на рану
Пояснение: Артериальный жгут всегда накладывается выше раны для пережатия сосуда к сердцу.
`;

    const blob = new Blob([txtContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sample_questions_template.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopyCode = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const handleDownloadSetupBat = () => {
    const content = `@echo off
chcp 65001 > nul
title Установка и настройка системы «Экзамен» (Windows Setup)
color 0A

echo ===============================================================================
echo     СИСТЕМА ПРОВЕРКИ ЗНАНИЙ И АТТЕСТАЦИИ «ЭКЗАМЕН» - УСТАНОВКА ДЛЯ WINDOWS
echo ===============================================================================
echo.

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [!] Node.js не обнаружен на вашем компьютере.
    echo [*] Для работы автономного сервера требуется среда Node.js (LTS).
    echo [*] Открываем официальный сайт для быстрой загрузки...
    start https://nodejs.org/en/download/
    echo.
    echo После установки Node.js перезапустите этот файл Setup_Windows.bat.
    pause
    exit /b 1
)

echo [OK] Среда Node.js обнаружена:
node -v
npm -v
echo.

echo [*] Шаг 1/3: Установка компонентов и модулей базы данных...
call npm install
if %errorlevel% neq 0 (
    echo [ОШИБКА] Не удалось установить модули npm.
    pause
    exit /b 1
)
echo [OK] Модули успешно установлены.
echo.

echo [*] Шаг 2/3: Компиляция локального автономного сервера и интерфейса...
call npm run build
if %errorlevel% neq 0 (
    echo [ОШИБКА] Сборка завершилась с ошибкой.
    pause
    exit /b 1
)
echo [OK] Приложение успешно скомпилировано в папку dist/.
echo.

echo [*] Шаг 3/3: Создание ярлыка на Рабочем столе...
set SCRIPT_DIR=%~dp0
set SCRIPT_DIR=%SCRIPT_DIR:~0,-1%

powershell -Command "$WshShell = New-Object -comObject WScript.Shell; $Shortcut = $WshShell.CreateShortcut([Environment]::GetFolderPath('Desktop') + '\\Экзамен - Охрана труда.lnk'); $Shortcut.TargetPath = '%SCRIPT_DIR%\\Запустить_Экзамен.bat'; $Shortcut.WorkingDirectory = '%SCRIPT_DIR%'; $Shortcut.Description = 'Система проверки знаний и аттестации Экзамен'; $Shortcut.Save()"

echo [OK] Ярлык «Экзамен - Охрана труда» создан на вашем Рабочем столе!
echo.
echo ===============================================================================
echo                      УСТАНОВКА УСПЕШНО ЗАВЕРШЕНА!
echo ===============================================================================
echo.
timeout /t 2 > nul
start "" "%SCRIPT_DIR%\\Запустить_Экзамен.bat"
`;
    const blob = new Blob([content], { type: 'application/x-bat;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Setup_Windows.bat';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadStartBat = () => {
    const content = `@echo off
chcp 65001 > nul
title Система «Экзамен» - Локальный сервер
color 0B

echo ===============================================================================
echo                СИСТЕМА ПРОВЕРКИ ЗНАНИЙ «ЭКЗАМЕН» (ОФЛАЙН / СЕТЬ)
echo ===============================================================================
echo.
echo [*] Запуск локального сервера проверки знаний...
echo [*] Адрес для сдачи тестирования: http://localhost:3000
echo [*] Для доступа сотрудников по локальной сети используйте IP этого компьютера.
echo.

if not exist "dist\\index.html" (
    echo [*] Первоначальная сборка интерфейса...
    call npm run build
)

start "" cmd /c "timeout /t 2 > nul && start http://localhost:3000"
node dist/server.cjs
if %errorlevel% neq 0 (
    npm start
)
pause
`;
    const blob = new Blob([content], { type: 'application/x-bat;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Запустить_Экзамен.bat';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadStopBat = () => {
    const content = `@echo off
chcp 65001 > nul
title Остановка системы Экзамен
color 0C

echo ===============================================================================
echo                ОСТАНОВКА ЛОКАЛЬНОГО СЕРВЕРА «ЭКЗАМЕН»
echo ===============================================================================
echo.

for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3000" ^| findstr "LISTENING"') do (
    echo [*] Завершение процесса с PID %%a...
    taskkill /F /PID %%a > nul 2>&1
)

echo [OK] Локальный сервер Экзамен успешно остановлен.
timeout /t 2 > nul
`;
    const blob = new Blob([content], { type: 'application/x-bat;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Остановить_Экзамен.bat';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadReadmeTxt = () => {
    const content = `================================================================================
   СИСТЕМА ПРОВЕРКИ ЗНАНИЙ И АТТЕСТАЦИИ «ЭКЗАМЕН» (ЛОКАЛЬНАЯ ВЕРСИЯ WINDOWS)
================================================================================

1. БЫСТРАЯ УСТАНОВКА В 1 КЛИК:
1) Распакуйте архив с программой в любую удобную папку (например, C:\\Ekzamen).
2) Запустите файл: Setup_Windows.bat
   - Скрипт проверит наличие среды Node.js;
   - Установит все необходимые модули базы данных;
   - Скомпилирует автономный сервер;
   - Создаст ярлык «Экзамен - Охрана труда» на вашем Рабочем столе.

2. ЕЖЕДНЕВНЫЙ ЗАПУСК:
- Двойной клик по ярлыку на Рабочем столе ИЛИ по файлу «Запустить_Экзамен.bat».
- Программа автоматически откроется в браузере по адресу: http://localhost:3000

3. РАБОТА ПО ЛОКАЛЬНОЙ СЕТИ ПРЕДПРИЯТИЯ (СЕТЕВОЙ РЕЖИМ):
- Узнайте IP-адрес главного компьютера (в командной строке: ipconfig).
- На компьютерах сотрудников откройте браузер и введите: http://<IP_СЕРВЕРА>:3000
- Все протоколы будут централизованно сохраняться в единой базе SQLite на сервере!
`;
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'README_WINDOWS_INSTALL.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadSampleJson = () => {
    const sample: ImportJSONData = {
      topics: [
        {
          title: 'Электробезопасность (Пример)',
          description: 'Вопросы по безопасности в электроустановках',
          icon: 'zap',
        },
      ],
      questions: [
        {
          topic_title: 'Электробезопасность (Пример)',
          text: 'Какое напряжение считается безопасным в помещениях без повышенной опасности?',
          explanation: 'В помещениях без повышенной опасности допускается напряжение до 220 В при соблюдении изоляции.',
          is_multiple_choice: false,
          options: [
            { text: 'До 220 В', is_correct: true },
            { text: 'До 1000 В', is_correct: false },
            { text: 'До 10 кВ', is_correct: false },
          ],
        },
        {
          topic_title: 'Электробезопасность (Пример)',
          text: 'Какие средства защиты относятся к основным до 1000 В? (выберите все)',
          explanation: 'Диэлектрические перчатки и изолированный инструмент — основные средства.',
          is_multiple_choice: true,
          options: [
            { text: 'Диэлектрические перчатки', is_correct: true },
            { text: 'Изолированный инструмент', is_correct: true },
            { text: 'Диэлектрический коврик (дополнительное)', is_correct: false },
          ],
        },
      ],
    };

    const blob = new Blob([JSON.stringify(sample, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sample_safety_test_import.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportDatabaseJson = () => {
    const a = document.createElement('a');
    a.href = '/api/export-json';
    a.download = 'safety_tests_export.json';
    a.click();
  };

  const executeResetDatabase = async () => {
    try {
      await resetDatabase();
      setAdminNotification({ text: 'База данных успешно восстановлена к стандартному набору вопросов.' });
      setTimeout(() => setAdminNotification(null), 3000);
      setIsConfirmResetDb(false);
      loadData();
      onRefreshGlobalData();
    } catch (err: any) {
      setAdminNotification({ text: err.message || 'Ошибка сброса базы данных', isError: true });
    }
  };

  // Password Lock Screen
  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto py-16 px-4">
        <div className="bg-white border-4 border-[#141414] p-8 sm:p-10 shadow-[10px_10px_0px_#141414] text-center">
          <div className="w-16 h-16 bg-[#F27D26] border-3 border-[#141414] flex items-center justify-center mx-auto mb-5 text-[#141414] shadow-[4px_4px_0px_#141414]">
            <Lock className="w-8 h-8 stroke-[2.5]" />
          </div>
          <h2 className="text-2xl font-black uppercase tracking-tight text-[#141414] mb-2">
            Панель управления
          </h2>
          <p className="text-xs font-mono uppercase text-[#141414]/70 mb-6 leading-relaxed">
            Для редактирования вопросов, добавления тем и импорта данных введите пароль доступа
          </p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <input
                type="password"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                placeholder="ПАРОЛЬ..."
                className="w-full px-4 py-3 bg-[#E4E3E0]/40 border-2 border-[#141414] text-[#141414] text-center text-sm font-mono uppercase font-bold tracking-widest focus:outline-none focus:bg-white focus:border-[#F27D26]"
              />
            </div>

            {authError && (
              <p className="text-xs font-mono uppercase font-bold text-[#141414] bg-[#F27D26]/20 p-2 border-2 border-[#141414]">{authError}</p>
            )}

            <button
              type="submit"
              className="w-full py-3.5 bg-[#141414] hover:bg-[#F27D26] text-[#E4E3E0] hover:text-[#141414] font-black uppercase text-xs tracking-wider border-2 border-[#141414] shadow-[4px_4px_0px_#141414] transition-all flex items-center justify-center space-x-2 cursor-pointer"
            >
              <Unlock className="w-4 h-4 stroke-[3]" />
              <span>Войти в систему</span>
            </button>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  setPasswordInput('admin123');
                }}
                className="text-[11px] font-mono uppercase text-[#141414]/70 hover:text-[#F27D26] underline font-bold"
              >
                Подставить демо-пароль (admin123)
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // Admin Dashboard Content
  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 space-y-6">
      {/* Admin Header */}
      <div className="bg-[#141414] text-[#E4E3E0] border-4 border-[#141414] p-6 sm:p-8 shadow-[8px_8px_0px_#F27D26] flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-3">
            <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-[#E4E3E0]">
              Администрирование базы знаний ТБ
            </h1>
            <span className="bg-[#F27D26] text-[#141414] font-mono text-xs font-black uppercase px-2.5 py-0.5 border border-[#141414]">
              SQLITE ONLINE
            </span>
          </div>
          <p className="font-mono text-xs text-[#E4E3E0]/70 uppercase tracking-wider mt-1">
            Управление темами, вопросами, загрузка JSON и обслуживание базы данных
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsAuthenticated(false)}
            className="px-4 py-2 bg-transparent hover:bg-white hover:text-[#141414] text-[#E4E3E0] font-black uppercase text-xs tracking-wider border-2 border-[#E4E3E0] transition-all flex items-center space-x-1.5 cursor-pointer"
          >
            <Lock className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Заблокировать</span>
          </button>
        </div>
      </div>

      {/* Sub-tabs navigation */}
      {adminNotification && (
        <div
          className={`p-4 border-3 flex items-center justify-between text-[#141414] ${
            adminNotification.isError
              ? 'bg-red-500/20 border-red-600 text-red-900'
              : 'bg-emerald-500/20 border-emerald-600'
          }`}
        >
          <span className="font-mono text-xs font-bold uppercase tracking-wider">
            {adminNotification.text}
          </span>
          <button onClick={() => setAdminNotification(null)} className="cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setActiveSubTab('questions')}
          className={`px-5 py-2.5 text-xs font-black uppercase tracking-wider border-2 transition-all flex items-center space-x-2 cursor-pointer ${
            activeSubTab === 'questions'
              ? 'bg-[#141414] text-[#E4E3E0] border-[#141414] shadow-[4px_4px_0px_#141414]'
              : 'bg-white text-[#141414] border-[#141414] hover:bg-[#E4E3E0]'
          }`}
        >
          <Layers className="w-4 h-4 stroke-[2.5]" />
          <span>База вопросов ({questions.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('topics')}
          className={`px-5 py-2.5 text-xs font-black uppercase tracking-wider border-2 transition-all flex items-center space-x-2 cursor-pointer ${
            activeSubTab === 'topics'
              ? 'bg-[#141414] text-[#E4E3E0] border-[#141414] shadow-[4px_4px_0px_#141414]'
              : 'bg-white text-[#141414] border-[#141414] hover:bg-[#E4E3E0]'
          }`}
        >
          <FolderPlus className="w-4 h-4 stroke-[2.5]" />
          <span>Темы тестирования ({topics.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('import_export')}
          className={`px-5 py-2.5 text-xs font-black uppercase tracking-wider border-2 transition-all flex items-center space-x-2 cursor-pointer ${
            activeSubTab === 'import_export'
              ? 'bg-[#141414] text-[#E4E3E0] border-[#141414] shadow-[4px_4px_0px_#141414]'
              : 'bg-white text-[#141414] border-[#141414] hover:bg-[#E4E3E0]'
          }`}
        >
          <Upload className="w-4 h-4 stroke-[2.5]" />
          <span>Импорт файлов (PDF, Word, Excel, TXT, JSON)</span>
        </button>

        <button
          onClick={() => setActiveSubTab('stats')}
          className={`px-5 py-2.5 text-xs font-black uppercase tracking-wider border-2 transition-all flex items-center space-x-2 cursor-pointer ${
            activeSubTab === 'stats'
              ? 'bg-[#141414] text-[#E4E3E0] border-[#141414] shadow-[4px_4px_0px_#141414]'
              : 'bg-white text-[#141414] border-[#141414] hover:bg-[#E4E3E0]'
          }`}
        >
          <Database className="w-4 h-4 stroke-[2.5]" />
          <span>Статистика и БД</span>
        </button>

        <button
          onClick={() => setActiveSubTab('windows_setup')}
          className={`px-5 py-2.5 text-xs font-black uppercase tracking-wider border-2 transition-all flex items-center space-x-2 cursor-pointer ${
            activeSubTab === 'windows_setup'
              ? 'bg-[#F27D26] text-[#141414] border-[#141414] shadow-[4px_4px_0px_#141414] font-black'
              : 'bg-white text-[#141414] border-[#141414] hover:bg-[#F27D26]/20'
          }`}
        >
          <Laptop className="w-4 h-4 stroke-[2.5]" />
          <span>Локальный запуск Windows (.exe / .bat)</span>
        </button>
      </div>

      {/* ---------------------------------------------------- */}
      {/* SUBTAB 1: QUESTIONS */}
      {/* ---------------------------------------------------- */}
      {activeSubTab === 'questions' && (
        <div className="space-y-6">
          {/* Controls Bar */}
          <div className="bg-white border-4 border-[#141414] p-4 sm:p-5 shadow-[6px_6px_0px_#141414] flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
              {/* Topic Selector */}
              <div className="w-64">
                <select
                  value={selectedTopicFilter}
                  onChange={(e) => setSelectedTopicFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                  className="w-full px-3 py-2.5 bg-[#E4E3E0]/40 border-2 border-[#141414] text-xs font-black uppercase text-[#141414] focus:outline-none focus:border-[#F27D26]"
                >
                  <option value="all">ВСЕ ТЕМЫ ({topics.reduce((acc, t) => acc + (t.question_count || 0), 0)} ВОПР.)</option>
                  {topics.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.title} ({t.question_count || 0})
                    </option>
                  ))}
                </select>
              </div>

              {/* Search Bar */}
              <div className="relative flex-1 min-w-[200px]">
                <Search className="w-4 h-4 absolute left-3 top-3 text-[#141414]/50" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && loadData()}
                  placeholder="ПОИСК ПО ТЕКСТУ ВОПРОСА..."
                  className="w-full pl-9 pr-4 py-2.5 bg-[#E4E3E0]/30 border-2 border-[#141414] font-mono text-xs font-bold uppercase text-[#141414] placeholder-[#141414]/40 focus:bg-white focus:outline-none focus:border-[#F27D26]"
                />
              </div>

              <button
                onClick={loadData}
                className="p-2.5 bg-[#141414] hover:bg-[#F27D26] text-[#E4E3E0] hover:text-[#141414] border-2 border-[#141414] transition-all cursor-pointer"
                title="Обновить"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {/* Add Question Button */}
            <button
              id="btn-add-question-modal"
              onClick={() => openQuestionModal()}
              className="px-5 py-2.5 bg-[#F27D26] hover:bg-[#141414] text-[#141414] hover:text-[#E4E3E0] font-black uppercase text-xs tracking-wider border-2 border-[#141414] shadow-[4px_4px_0px_#141414] transition-all flex items-center space-x-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Добавить вопрос</span>
            </button>
          </div>

          {/* Questions List */}
          <div className="space-y-4">
            {questions.length === 0 ? (
              <div className="bg-white border-4 border-[#141414] p-12 text-center text-[#141414]">
                <p className="text-base font-black uppercase">Вопросов не найдено</p>
                <button
                  onClick={() => openQuestionModal()}
                  className="mt-3 font-mono text-xs text-[#F27D26] font-bold uppercase underline"
                >
                  + Создать первый вопрос
                </button>
              </div>
            ) : (
              questions.map((q, idx) => (
                <div
                  key={q.id}
                  className="bg-white border-4 border-[#141414] p-6 shadow-[6px_6px_0px_#141414]"
                >
                  <div className="flex items-start justify-between gap-4 mb-3 border-b-2 border-[#141414] pb-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="bg-[#141414] text-[#E4E3E0] font-mono font-black text-xs px-2.5 py-0.5">
                        № {idx + 1}
                      </span>
                      <span className="bg-[#E4E3E0] text-[#141414] font-mono text-xs px-2.5 py-0.5 border border-[#141414] font-bold uppercase">
                        {q.topic_title || `Тема ID: ${q.topic_id}`}
                      </span>
                      {q.is_multiple_choice && (
                        <span className="bg-[#F27D26] text-[#141414] text-xs px-2 py-0.5 font-mono font-bold uppercase border border-[#141414]">
                          Множественный выбор
                        </span>
                      )}
                      {q.image_url && (
                        <span className="bg-[#141414] text-[#E4E3E0] text-xs px-2 py-0.5 font-mono font-bold uppercase flex items-center space-x-1">
                          <ImageIcon className="w-3 h-3" />
                          <span>С иллюстрацией</span>
                        </span>
                      )}
                    </div>

                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => openQuestionModal(q)}
                        className="p-1.5 bg-[#141414] text-[#E4E3E0] hover:bg-[#F27D26] hover:text-[#141414] border border-[#141414] transition-colors cursor-pointer"
                        title="Редактировать"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setConfirmDeleteQuestionId(q.id)}
                        className="p-1.5 bg-transparent text-[#141414] hover:bg-red-600 hover:text-white border border-[#141414] hover:border-red-600 transition-colors cursor-pointer"
                        title="Удалить"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <h3 className="text-base sm:text-lg font-black uppercase text-[#141414] mb-4">
                    {q.text}
                  </h3>

                  {q.image_url && (
                    <div className="mb-4 max-w-xs border-2 border-[#141414] p-2 bg-[#E4E3E0]/30">
                      <img
                        src={q.image_url}
                        alt="Question"
                        className="max-h-32 object-contain"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  )}

                  {/* Options */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4 font-mono text-xs">
                    {q.options.map((opt) => (
                      <div
                        key={opt.id}
                        className={`p-3 border-2 border-[#141414] flex items-center justify-between uppercase ${
                          opt.is_correct
                            ? 'bg-[#F27D26]/20 font-bold text-[#141414]'
                            : 'bg-[#E4E3E0]/20 text-[#141414]/70'
                        }`}
                      >
                        <span>{opt.text}</span>
                        {opt.is_correct && (
                          <span className="text-[10px] bg-[#141414] text-[#F27D26] px-2 py-0.5 font-black ml-2 shrink-0">
                            ВЕРНЫЙ
                          </span>
                        )}
                      </div>
                    ))}
                  </div>

                  {q.explanation && (
                    <div className="text-xs font-mono text-[#141414] bg-[#E4E3E0]/40 p-3 border-2 border-[#141414]">
                      <strong className="text-[#F27D26] block mb-0.5 font-bold uppercase">ОБОСНОВАНИЕ:</strong>
                      {q.explanation}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* SUBTAB 2: TOPICS */}
      {/* ---------------------------------------------------- */}
      {activeSubTab === 'topics' && (
        <div>
          <div className="flex justify-between items-center mb-6 border-b-3 border-[#141414] pb-4">
            <h2 className="text-xl font-black uppercase text-[#141414]">
              Список тематических разделов ТБ
            </h2>
            <button
              onClick={() => openTopicModal()}
              className="px-5 py-2.5 bg-[#F27D26] hover:bg-[#141414] text-[#141414] hover:text-[#E4E3E0] font-black uppercase text-xs tracking-wider border-2 border-[#141414] shadow-[4px_4px_0px_#141414] flex items-center space-x-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Создать новую тему</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {topics.map((t) => (
              <div
                key={t.id}
                className="bg-white border-4 border-[#141414] p-6 shadow-[6px_6px_0px_#141414] flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between mb-3 border-b-2 border-[#141414] pb-3">
                    <div className="flex items-center space-x-3">
                      <span className="w-8 h-8 bg-[#141414] text-[#E4E3E0] font-mono font-black text-xs flex items-center justify-center border border-[#141414]">
                        #{t.id}
                      </span>
                      <h3 className="font-black uppercase text-[#141414] text-lg">
                        {t.title}
                      </h3>
                    </div>
                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => openTopicModal(t)}
                        className="p-1.5 bg-[#141414] text-[#E4E3E0] hover:bg-[#F27D26] hover:text-[#141414] border border-[#141414] cursor-pointer"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setConfirmDeleteTopicId(t.id)}
                        className="p-1.5 bg-transparent text-[#141414] hover:bg-red-600 hover:text-white border border-[#141414] hover:border-red-600 cursor-pointer"
                        title="Удалить тему"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <p className="text-xs font-mono uppercase text-[#141414]/80 mb-6 leading-relaxed">
                    {t.description || 'Описание отсутствует'}
                  </p>
                </div>

                <div className="pt-4 border-t-2 border-[#141414] flex items-center justify-between font-mono text-xs text-[#141414]">
                  <span>ВОПРОСОВ В ТЕМЕ: <strong className="text-[#F27D26] font-black">{t.question_count || 0}</strong></span>
                  <button
                    onClick={() => {
                      setSelectedTopicFilter(t.id);
                      setActiveSubTab('questions');
                    }}
                    className="font-black uppercase underline hover:text-[#F27D26] cursor-pointer"
                  >
                    Перейти к вопросам &rarr;
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* SUBTAB 3: MULTI-FORMAT FILE & DOCUMENT IMPORT */}
      {/* ---------------------------------------------------- */}
      {activeSubTab === 'import_export' && (
        <div className="space-y-8">
          {/* Main Upload & Configuration Container */}
          <div className="bg-white border-4 border-[#141414] p-6 sm:p-8 shadow-[8px_8px_0px_#141414]">
            {/* Header & Badges */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b-2 border-[#141414]/10 mb-6">
              <div>
                <h3 className="text-xl font-black uppercase text-[#141414] flex items-center space-x-2.5">
                  <Upload className="w-6 h-6 text-[#F27D26] stroke-[3]" />
                  <span>Универсальный импорт вопросов в базу данных</span>
                </h3>
                <p className="text-xs font-mono uppercase text-[#141414]/70 mt-1">
                  Поддерживает любые документы: PDF, Word, Excel, TXT, JSON с авто-распознаванием вопросов и правильных ответов
                </p>
              </div>

              {/* Supported Format Badges */}
              <div className="flex flex-wrap items-center gap-1.5 font-mono text-[10px] font-bold">
                <span className="px-2.5 py-1 bg-red-100 text-red-900 border border-red-400 flex items-center gap-1">
                  <FileType className="w-3 h-3" /> PDF
                </span>
                <span className="px-2.5 py-1 bg-blue-100 text-blue-900 border border-blue-400 flex items-center gap-1">
                  <FileText className="w-3 h-3" /> DOCX / DOC
                </span>
                <span className="px-2.5 py-1 bg-emerald-100 text-emerald-900 border border-emerald-400 flex items-center gap-1">
                  <FileSpreadsheet className="w-3 h-3" /> XLSX / CSV
                </span>
                <span className="px-2.5 py-1 bg-amber-100 text-amber-900 border border-amber-400 flex items-center gap-1">
                  <FileCode className="w-3 h-3" /> TXT / MD
                </span>
                <span className="px-2.5 py-1 bg-purple-100 text-purple-900 border border-purple-400 flex items-center gap-1">
                  <FileJson className="w-3 h-3" /> JSON
                </span>
              </div>
            </div>

            {/* Quick Templates & Export Bar */}
            <div className="bg-[#E4E3E0]/40 p-4 border-2 border-[#141414] mb-6 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-black uppercase font-mono text-[#141414]/80 mr-1">
                  Скачать образцы:
                </span>
                <button
                  type="button"
                  onClick={handleDownloadSampleExcel}
                  className="px-3 py-1.5 bg-white hover:bg-emerald-600 hover:text-white text-[#141414] font-mono text-xs font-bold border-2 border-[#141414] flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Таблица Excel (.csv)</span>
                </button>
                <button
                  type="button"
                  onClick={handleDownloadSampleWordTxt}
                  className="px-3 py-1.5 bg-white hover:bg-blue-600 hover:text-white text-[#141414] font-mono text-xs font-bold border-2 border-[#141414] flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Документ Word / TXT</span>
                </button>
                <button
                  type="button"
                  onClick={handleDownloadSampleJson}
                  className="px-3 py-1.5 bg-white hover:bg-purple-600 hover:text-white text-[#141414] font-mono text-xs font-bold border-2 border-[#141414] flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <FileJson className="w-3.5 h-3.5" />
                  <span>Структура JSON</span>
                </button>
              </div>

              <button
                type="button"
                onClick={handleExportDatabaseJson}
                className="px-4 py-1.5 bg-[#F27D26] hover:bg-[#141414] text-[#141414] hover:text-[#E4E3E0] font-black uppercase text-xs tracking-wider border-2 border-[#141414] shadow-[3px_3px_0px_#141414] flex items-center gap-2 cursor-pointer transition-all"
              >
                <Download className="w-3.5 h-3.5 stroke-[3]" />
                <span>Резервная копия всей базы (JSON)</span>
              </button>
            </div>

            {/* Input Mode Selector Tabs */}
            <div className="flex border-b-2 border-[#141414] mb-6">
              <button
                type="button"
                onClick={() => {
                  setImportInputMode('file');
                  setParseResponse(null);
                  setParseErrorMsg(null);
                }}
                className={`px-6 py-3 font-mono text-xs font-black uppercase tracking-wider border-t-2 border-l-2 border-r-2 border-[#141414] -mb-[2px] transition-all flex items-center gap-2 cursor-pointer ${
                  importInputMode === 'file'
                    ? 'bg-white text-[#141414] border-b-2 border-b-white z-10 shadow-[0px_-2px_0px_#F27D26]'
                    : 'bg-[#E4E3E0]/60 text-[#141414]/60 hover:bg-[#E4E3E0]'
                }`}
              >
                <Upload className="w-4 h-4 text-[#F27D26]" />
                <span>1. Загрузить файл документа</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setImportInputMode('text');
                  setParseResponse(null);
                  setParseErrorMsg(null);
                }}
                className={`px-6 py-3 font-mono text-xs font-black uppercase tracking-wider border-t-2 border-l-2 border-r-2 border-[#141414] -mb-[2px] transition-all flex items-center gap-2 cursor-pointer ${
                  importInputMode === 'text'
                    ? 'bg-white text-[#141414] border-b-2 border-b-white z-10 shadow-[0px_-2px_0px_#F27D26]'
                    : 'bg-[#E4E3E0]/60 text-[#141414]/60 hover:bg-[#E4E3E0]'
                }`}
              >
                <FileText className="w-4 h-4 text-[#F27D26]" />
                <span>2. Вставить текст вопросов вручную</span>
              </button>
            </div>

            {/* Step 1: Input Source (File or Text) */}
            {importInputMode === 'file' ? (
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragOver(true);
                }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={handleDropFile}
                className={`border-3 border-dashed p-8 sm:p-12 text-center transition-all cursor-pointer relative ${
                  isDragOver
                    ? 'border-[#F27D26] bg-[#F27D26]/10'
                    : fileToParse
                    ? 'border-emerald-600 bg-emerald-500/5'
                    : 'border-[#141414] bg-[#E4E3E0]/20 hover:bg-[#E4E3E0]/40'
                }`}
              >
                <input
                  type="file"
                  accept=".pdf,.docx,.doc,.xlsx,.xls,.csv,.txt,.md,.json"
                  onChange={handleSelectFile}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />

                {fileToParse ? (
                  <div className="space-y-3">
                    <div className="w-14 h-14 bg-emerald-500 border-3 border-[#141414] flex items-center justify-center mx-auto shadow-[4px_4px_0px_#141414] text-white">
                      <CheckCircle className="w-8 h-8 stroke-[2.5]" />
                    </div>
                    <div className="font-mono">
                      <p className="text-base font-black text-[#141414]">{fileToParse.name}</p>
                      <p className="text-xs text-[#141414]/70 mt-1">
                        Размер файла: {(fileToParse.size / 1024).toFixed(1)} КБ • Формат: {fileToParse.name.split('.').pop()?.toUpperCase()}
                      </p>
                    </div>
                    <p className="text-xs font-mono font-bold text-[#F27D26] uppercase">
                      Нажмите, чтобы выбрать другой файл или перетащите новый
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="w-14 h-14 bg-[#F27D26] border-3 border-[#141414] flex items-center justify-center mx-auto shadow-[4px_4px_0px_#141414] text-[#141414]">
                      <Upload className="w-7 h-7 stroke-[2.5]" />
                    </div>
                    <div>
                      <p className="text-base font-black uppercase text-[#141414]">
                        Перетащите сюда любой файл с вопросами
                      </p>
                      <p className="text-xs font-mono text-[#141414]/70 mt-1">
                        или кликните в любое место для выбора с компьютера
                      </p>
                    </div>
                    <div className="text-[11px] font-mono font-bold text-[#141414]/60 uppercase pt-2">
                      PDF • Word (.docx, .doc) • Excel (.xlsx, .csv) • Текст (.txt) • JSON
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div>
                <label className="block text-xs font-black uppercase font-mono text-[#141414] mb-2">
                  Вставьте текст с билетами или вопросами:
                </label>
                <textarea
                  rows={9}
                  value={rawTextToParse}
                  onChange={(e) => {
                    setRawTextToParse(e.target.value);
                    setParseResponse(null);
                    setParseErrorMsg(null);
                  }}
                  placeholder={`Пример:
1. Какой огнетушитель применяется для тушения электроустановок?
a) Водный
b) Углекислотный (верно)
c) Пенный
Пояснение: Углекислотные огнетушители не проводят электрический ток.

2. Сроки проверки знаний по охране труда:
1) 1 раз в год
2) 1 раз в 3 года (+)`}
                  className="w-full p-4 bg-[#E4E3E0]/30 border-2 border-[#141414] font-mono text-xs text-[#141414] placeholder-[#141414]/40 focus:bg-white focus:outline-none focus:border-[#F27D26]"
                />
              </div>
            )}

            {/* Target Topic and Recognition Mode Settings */}
            <div className="mt-6 pt-6 border-t-2 border-[#141414]/10 grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Topic Target */}
              <div className="space-y-2">
                <label className="block text-xs font-black uppercase font-mono text-[#141414]">
                  Категория / Тема для импортируемых вопросов:
                </label>
                <div className="flex flex-col gap-2">
                  <select
                    value={selectedImportTopicId}
                    onChange={(e) => {
                      const val = e.target.value === 'new' ? 'new' : Number(e.target.value);
                      setSelectedImportTopicId(val);
                    }}
                    className="w-full p-2.5 bg-white border-2 border-[#141414] font-mono text-xs text-[#141414] focus:outline-none focus:border-[#F27D26]"
                  >
                    <option value="new">+ Создать новую тему / Автоопределение из файла</option>
                    {topics.map((t) => (
                      <option key={t.id} value={t.id}>
                        Существующая: {t.title}
                      </option>
                    ))}
                  </select>

                  {selectedImportTopicId === 'new' && (
                    <input
                      type="text"
                      value={customImportTopicName}
                      onChange={(e) => setCustomImportTopicName(e.target.value)}
                      placeholder="Название новой темы (напр. Охрана труда 2026)"
                      className="w-full p-2.5 bg-white border-2 border-[#141414] font-mono text-xs text-[#141414] focus:outline-none focus:border-[#F27D26]"
                    />
                  )}
                </div>
                <p className="text-[11px] font-mono text-[#141414]/60">
                  Если в самом файле указаны темы (например «Тема: Электробезопасность»), система автоматически распределит вопросы по соответствующим темам.
                </p>
              </div>

              {/* Extraction Engine */}
              <div className="space-y-2">
                <label className="block text-xs font-black uppercase font-mono text-[#141414]">
                  Режим анализа документа:
                </label>
                <div
                  onClick={() => setUseAiExtraction(!useAiExtraction)}
                  className={`p-3 border-2 border-[#141414] flex items-start gap-3 cursor-pointer transition-colors ${
                    useAiExtraction ? 'bg-[#F27D26]/10 border-[#141414]' : 'bg-white hover:bg-[#E4E3E0]/30'
                  }`}
                >
                  <div className={`mt-0.5 w-5 h-5 border-2 border-[#141414] flex items-center justify-center font-black ${
                    useAiExtraction ? 'bg-[#F27D26] text-[#141414]' : 'bg-white'
                  }`}>
                    {useAiExtraction && <Check className="w-4 h-4 stroke-[3]" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-[#F27D26]" />
                      <span className="text-xs font-black uppercase font-mono text-[#141414]">
                        Умный ИИ-анализ (Gemini 2.5)
                      </span>
                    </div>
                    <p className="text-[11px] font-mono text-[#141414]/70 mt-1 leading-relaxed">
                      Рекомендуется для сканов, сложных неструктурированных файлов Word/PDF, таблиц и документов с нестандартными обозначениями правильных ответов.
                    </p>
                  </div>
                </div>
                <p className="text-[10px] font-mono text-[#141414]/60">
                  * Если ИИ выключен или нет интернета, используется автономный офлайн-парсер регулярных выражений.
                </p>
              </div>
            </div>

            {/* Error Notification */}
            {parseErrorMsg && (
              <div className="mt-6 p-4 bg-red-500/20 border-3 border-red-600 font-mono text-xs text-red-900 font-bold uppercase flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 flex-shrink-0 stroke-[2.5]" />
                  <span>{parseErrorMsg}</span>
                </div>
                <button onClick={() => setParseErrorMsg(null)} className="cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Big Action Button: Run Analysis */}
            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={handleAnalyzeContent}
                disabled={isParsing}
                className="px-8 py-3.5 bg-[#141414] hover:bg-[#F27D26] text-[#E4E3E0] hover:text-[#141414] font-black uppercase text-xs tracking-wider border-2 border-[#141414] shadow-[4px_4px_0px_#141414] transition-all flex items-center gap-2.5 cursor-pointer disabled:opacity-50"
              >
                {isParsing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Распознавание файла...</span>
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4 stroke-[3]" />
                    <span>Распознать и извлечь вопросы</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Parsed Preview and Confirmation Section */}
          {parseResponse && (
            <div className="bg-white border-4 border-[#141414] p-6 sm:p-8 shadow-[8px_8px_0px_#141414] space-y-6">
              {/* Preview Header */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b-2 border-[#141414]">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 bg-[#141414] text-[#E4E3E0] font-mono text-xs font-black uppercase">
                      Предпросмотр вопросов
                    </span>
                    <span className="px-2.5 py-1 bg-[#F27D26]/20 border border-[#F27D26] text-[#141414] font-mono text-xs font-bold">
                      {parseResponse.meta?.detectionMethod || 'Анализ завершен'}
                    </span>
                  </div>
                  <h4 className="text-lg font-black uppercase text-[#141414] mt-2">
                    Обнаружено {parseResponse.questions.length} вопросов (выбрано для импорта: {selectedQuestionIndices.size})
                  </h4>
                  {parseResponse.topics && parseResponse.topics.length > 0 && (
                    <p className="text-xs font-mono text-[#141414]/70 mt-1">
                      Темы: {parseResponse.topics.map((t) => t.title).join(', ')}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={toggleSelectAllQuestions}
                    className="px-4 py-2 bg-white hover:bg-[#E4E3E0] text-[#141414] font-mono text-xs font-bold border-2 border-[#141414] cursor-pointer flex items-center gap-1.5"
                  >
                    {selectedQuestionIndices.size === parseResponse.questions.length ? (
                      <>
                        <Square className="w-4 h-4" /> Снять выбор
                      </>
                    ) : (
                      <>
                        <CheckSquare className="w-4 h-4" /> Выбрать все
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleCommitParsedQuestions}
                    disabled={isImporting || selectedQuestionIndices.size === 0}
                    className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-[#141414] font-black uppercase text-xs tracking-wider border-2 border-[#141414] shadow-[4px_4px_0px_#141414] cursor-pointer flex items-center gap-2 disabled:opacity-50 transition-all"
                  >
                    {isImporting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Сохранение в SQLite...</span>
                      </>
                    ) : (
                      <>
                        <Database className="w-4 h-4 stroke-[2.5]" />
                        <span>Сохранить в базу SQLite ({selectedQuestionIndices.size})</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Scrollable Questions List */}
              <div className="space-y-4 max-h-[700px] overflow-y-auto pr-2">
                {parseResponse.questions.map((q, idx) => {
                  const isSelected = selectedQuestionIndices.has(idx);
                  return (
                    <div
                      key={idx}
                      onClick={() => toggleQuestionSelection(idx)}
                      className={`p-5 border-3 transition-all cursor-pointer ${
                        isSelected
                          ? 'border-[#141414] bg-white shadow-[4px_4px_0px_#141414]'
                          : 'border-dashed border-[#141414]/40 bg-[#E4E3E0]/20 opacity-60'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <div className="flex items-start gap-3">
                          <div className={`mt-0.5 w-5 h-5 border-2 border-[#141414] flex items-center justify-center font-black ${
                            isSelected ? 'bg-[#F27D26] text-[#141414]' : 'bg-white'
                          }`}>
                            {isSelected && <Check className="w-4 h-4 stroke-[3]" />}
                          </div>
                          <div>
                            <span className="font-mono text-[11px] font-bold text-[#F27D26] uppercase mr-2">
                              Вопрос #{idx + 1}
                            </span>
                            <span className="px-2 py-0.5 bg-[#141414] text-[#E4E3E0] font-mono text-[10px] font-bold uppercase">
                              {q.topic_title || 'Охрана труда'}
                            </span>
                            {q.is_multiple_choice && (
                              <span className="ml-2 px-2 py-0.5 bg-amber-200 border border-amber-500 text-amber-950 font-mono text-[10px] font-bold uppercase">
                                Несколько ответов
                              </span>
                            )}
                            <h5 className="text-sm font-bold text-[#141414] mt-1.5 leading-snug">
                              {q.text}
                            </h5>
                          </div>
                        </div>
                      </div>

                      {/* Options Grid */}
                      <div className="pl-8 grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2 font-mono text-xs">
                        {q.options.map((opt, oIdx) => (
                          <div
                            key={oIdx}
                            className={`p-2.5 border-2 flex items-start gap-2 ${
                              opt.is_correct
                                ? 'bg-emerald-100/70 border-emerald-700 text-emerald-950 font-bold'
                                : 'bg-[#E4E3E0]/30 border-[#141414]/30 text-[#141414]/80'
                            }`}
                          >
                            <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-black flex-shrink-0 mt-0.5 ${
                              opt.is_correct ? 'bg-emerald-700 text-white' : 'bg-[#141414]/20 text-[#141414]'
                            }`}>
                              {opt.is_correct ? '✓' : String.fromCharCode(65 + oIdx)}
                            </span>
                            <span className="leading-snug">{opt.text}</span>
                          </div>
                        ))}
                      </div>

                      {q.explanation && (
                        <div className="pl-8 mt-3 text-[11px] font-mono text-[#141414]/70 bg-[#E4E3E0]/40 p-2 border-l-3 border-[#F27D26]">
                          <span className="font-bold text-[#141414]">Нормативное обоснование: </span>
                          {q.explanation}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Bottom Commit Button */}
              <div className="pt-4 border-t-2 border-[#141414] flex justify-between items-center">
                <span className="text-xs font-mono font-bold text-[#141414]/70">
                  Выбрано {selectedQuestionIndices.size} из {parseResponse.questions.length} вопросов
                </span>
                <button
                  type="button"
                  onClick={handleCommitParsedQuestions}
                  disabled={isImporting || selectedQuestionIndices.size === 0}
                  className="px-8 py-3 bg-[#141414] hover:bg-[#F27D26] text-[#E4E3E0] hover:text-[#141414] font-black uppercase text-xs tracking-wider border-2 border-[#141414] shadow-[4px_4px_0px_#141414] cursor-pointer flex items-center gap-2 transition-all disabled:opacity-50"
                >
                  {isImporting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Сохранение в базу SQLite...</span>
                    </>
                  ) : (
                    <>
                      <Database className="w-4 h-4 stroke-[2.5]" />
                      <span>Импортировать выбранные вопросы в SQLite</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* SUBTAB 4: STATS & MAINTENANCE */}
      {/* ---------------------------------------------------- */}
      {activeSubTab === 'stats' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-[#141414]">
            <div className="bg-white border-4 border-[#141414] p-5 text-center shadow-[4px_4px_0px_#141414]">
              <span className="font-mono text-[10px] uppercase tracking-widest text-[#141414]/70 block mb-1">ВСЕГО ТЕМ</span>
              <span className="text-3xl font-black font-mono">{stats?.total_topics || 0}</span>
            </div>
            <div className="bg-white border-4 border-[#141414] p-5 text-center shadow-[4px_4px_0px_#141414]">
              <span className="font-mono text-[10px] uppercase tracking-widest text-[#141414]/70 block mb-1">ВСЕГО ВОПРОСОВ</span>
              <span className="text-3xl font-black font-mono text-[#F27D26]">{stats?.total_questions || 0}</span>
            </div>
            <div className="bg-white border-4 border-[#141414] p-5 text-center shadow-[4px_4px_0px_#141414]">
              <span className="font-mono text-[10px] uppercase tracking-widest text-[#141414]/70 block mb-1">СДАНО ЭКЗАМЕНОВ</span>
              <span className="text-3xl font-black font-mono">{stats?.exams_passed || 0}</span>
            </div>
            <div className="bg-white border-4 border-[#141414] p-5 text-center shadow-[4px_4px_0px_#141414]">
              <span className="font-mono text-[10px] uppercase tracking-widest text-[#141414]/70 block mb-1">ПРОЦЕНТ СДАЧИ</span>
              <span className="text-3xl font-black font-mono text-[#F27D26]">{stats?.pass_rate_percentage || 0}%</span>
            </div>
          </div>

          <div className="bg-white border-4 border-[#141414] p-6 sm:p-8 shadow-[8px_8px_0px_#141414]">
            <h3 className="text-lg font-black uppercase text-[#141414] mb-2">
              Обслуживание и сброс базы данных SQLite
            </h3>
            <p className="text-xs font-mono uppercase text-[#141414]/80 mb-6">
              База данных хранится в локальном файле <code className="bg-[#141414] text-[#E4E3E0] px-1 font-bold">safety_test.sqlite</code> на сервере. При необходимости вы можете восстановить исходную структуру сертифицированных вопросов по технике безопасности.
            </p>

            <button
              onClick={() => setIsConfirmResetDb(true)}
              className="px-6 py-3 bg-transparent hover:bg-red-600 hover:text-white text-[#141414] font-black uppercase text-xs tracking-wider border-2 border-[#141414] hover:border-red-600 transition-all cursor-pointer"
            >
              Сбросить базу к эталонным вопросам ТБ
            </button>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* SUBTAB 5: WINDOWS LOCAL SETUP & LAUNCHER */}
      {/* ---------------------------------------------------- */}
      {activeSubTab === 'windows_setup' && (
        <div className="space-y-6">
          {/* Header Banner */}
          <div className="bg-white border-4 border-[#141414] p-6 sm:p-8 shadow-[8px_8px_0px_#141414]">
            <div className="flex items-start justify-between flex-wrap gap-4">
              <div>
                <span className="bg-[#F27D26] text-[#141414] text-xs font-mono font-black uppercase px-2.5 py-0.5 border border-[#141414] inline-block mb-3">
                  WINDOWS OFFLINE & STANDALONE
                </span>
                <h3 className="text-xl sm:text-2xl font-black uppercase text-[#141414] tracking-tight">
                  Пакет для автономной установки и локального запуска в Windows
                </h3>
                <p className="font-mono text-xs text-[#141414]/80 uppercase tracking-wide mt-2 max-w-3xl leading-relaxed">
                  Вы можете скачать готовые установочные скрипты для запуска программы на любом ПК предприятия без интернета, без старых BDE-драйверов и с автоматическим созданием ярлыка на Рабочем столе.
                </p>
              </div>
            </div>

            {/* Download Buttons Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
              <button
                onClick={handleDownloadSetupBat}
                className="p-5 bg-[#141414] hover:bg-[#F27D26] text-[#E4E3E0] hover:text-[#141414] border-3 border-[#141414] shadow-[4px_4px_0px_#F27D26] transition-all flex flex-col items-start justify-between cursor-pointer group text-left"
              >
                <div className="flex items-center justify-between w-full mb-3">
                  <Terminal className="w-6 h-6 stroke-[2.5]" />
                  <span className="text-[10px] font-mono font-black uppercase bg-[#F27D26] text-[#141414] group-hover:bg-[#141414] group-hover:text-[#E4E3E0] px-2 py-0.5">
                    УСТАНОВКА
                  </span>
                </div>
                <div>
                  <span className="font-black text-sm uppercase block">Setup_Windows.bat</span>
                  <span className="font-mono text-[11px] opacity-80 mt-1 block">
                    Полная установка в 1 клик и создание ярлыка
                  </span>
                </div>
              </button>

              <button
                onClick={handleDownloadStartBat}
                className="p-5 bg-white hover:bg-[#141414] hover:text-[#E4E3E0] text-[#141414] border-3 border-[#141414] shadow-[4px_4px_0px_#141414] transition-all flex flex-col items-start justify-between cursor-pointer group text-left"
              >
                <div className="flex items-center justify-between w-full mb-3">
                  <FileCode className="w-6 h-6 stroke-[2.5] text-[#F27D26]" />
                  <span className="text-[10px] font-mono font-black uppercase bg-[#E4E3E0] text-[#141414] px-2 py-0.5">
                    ЗАПУСК
                  </span>
                </div>
                <div>
                  <span className="font-black text-sm uppercase block">Запустить_Экзамен.bat</span>
                  <span className="font-mono text-[11px] opacity-80 mt-1 block">
                    Быстрый запуск сервера и открытие браузера
                  </span>
                </div>
              </button>

              <button
                onClick={handleDownloadStopBat}
                className="p-5 bg-white hover:bg-red-600 hover:text-white text-[#141414] border-3 border-[#141414] shadow-[4px_4px_0px_#141414] transition-all flex flex-col items-start justify-between cursor-pointer group text-left"
              >
                <div className="flex items-center justify-between w-full mb-3">
                  <X className="w-6 h-6 stroke-[3] text-red-600 group-hover:text-white" />
                  <span className="text-[10px] font-mono font-black uppercase bg-[#E4E3E0] text-[#141414] px-2 py-0.5">
                    СТОП
                  </span>
                </div>
                <div>
                  <span className="font-black text-sm uppercase block">Остановить_Экзамен.bat</span>
                  <span className="font-mono text-[11px] opacity-80 mt-1 block">
                    Завершение локального процесса сервера
                  </span>
                </div>
              </button>

              <button
                onClick={handleDownloadReadmeTxt}
                className="p-5 bg-white hover:bg-[#141414] hover:text-[#E4E3E0] text-[#141414] border-3 border-[#141414] shadow-[4px_4px_0px_#141414] transition-all flex flex-col items-start justify-between cursor-pointer group text-left"
              >
                <div className="flex items-center justify-between w-full mb-3">
                  <Download className="w-6 h-6 stroke-[2.5]" />
                  <span className="text-[10px] font-mono font-black uppercase bg-[#E4E3E0] text-[#141414] px-2 py-0.5">
                    ИНСТРУКЦИЯ
                  </span>
                </div>
                <div>
                  <span className="font-black text-sm uppercase block">README_INSTALL.txt</span>
                  <span className="font-mono text-[11px] opacity-80 mt-1 block">
                    Текстовая памятка для системного администратора
                  </span>
                </div>
              </button>
            </div>
          </div>

          {/* 3 Steps Guide */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white border-4 border-[#141414] p-6 shadow-[6px_6px_0px_#141414] flex flex-col justify-between">
              <div>
                <span className="text-4xl font-black font-mono text-[#F27D26] block mb-2">01</span>
                <h4 className="text-base font-black uppercase text-[#141414] mb-2">
                  Скачайте проект
                </h4>
                <p className="font-mono text-xs text-[#141414]/80 uppercase leading-relaxed">
                  В меню настроек приложения выберите <strong>«Export to ZIP»</strong> (или выгрузите файлы) и распакуйте в любую папку на ПК (например, <code className="bg-[#141414] text-[#E4E3E0] px-1 font-bold">C:\Ekzamen</code>).
                </p>
              </div>
            </div>

            <div className="bg-white border-4 border-[#141414] p-6 shadow-[6px_6px_0px_#141414] flex flex-col justify-between">
              <div>
                <span className="text-4xl font-black font-mono text-[#F27D26] block mb-2">02</span>
                <h4 className="text-base font-black uppercase text-[#141414] mb-2">
                  Запустите Setup_Windows.bat
                </h4>
                <p className="font-mono text-xs text-[#141414]/80 uppercase leading-relaxed">
                  Скрипт автоматически проверит Node.js, установит все модули БД SQLite, скомпилирует приложение и создаст готовый ярлык на Рабочем столе.
                </p>
              </div>
            </div>

            <div className="bg-white border-4 border-[#141414] p-6 shadow-[6px_6px_0px_#141414] flex flex-col justify-between">
              <div>
                <span className="text-4xl font-black font-mono text-[#F27D26] block mb-2">03</span>
                <h4 className="text-base font-black uppercase text-[#141414] mb-2">
                  Сетевой доступ для сотрудников
                </h4>
                <p className="font-mono text-xs text-[#141414]/80 uppercase leading-relaxed">
                  Сервер слушает порт 3000 на всех интерфейсах. Любой компьютер или планшет в вашей сети может открыть тестирование по ссылке <code className="bg-[#141414] text-[#E4E3E0] px-1 font-bold">http://&lt;IP_КОМПЬЮТЕРА&gt;:3000</code>.
                </p>
              </div>
            </div>
          </div>

          {/* Code Viewer: Setup_Windows.bat */}
          <div className="bg-[#141414] text-[#E4E3E0] border-4 border-[#141414] p-6 sm:p-8 shadow-[8px_8px_0px_#F27D26]">
            <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
              <div className="flex items-center space-x-3">
                <Terminal className="w-5 h-5 text-[#F27D26]" />
                <h4 className="font-black text-sm uppercase tracking-wide">
                  Содержимое файла Setup_Windows.bat
                </h4>
              </div>
              <button
                onClick={() => handleCopyCode(`@echo off\nchcp 65001 > nul\ntitle Установка «Экзамен»\ncall npm install\ncall npm run build\nstart Запустить_Экзамен.bat`, 'setup_code')}
                className="px-3.5 py-1.5 bg-[#F27D26] hover:bg-white text-[#141414] font-mono text-xs font-black uppercase flex items-center space-x-1.5 cursor-pointer"
              >
                {copiedKey === 'setup_code' ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedKey === 'setup_code' ? 'СКОПИРОВАНО!' : 'СКОПИРОВАТЬ КОД'}</span>
              </button>
            </div>

            <pre className="bg-black/50 p-4 border border-[#E4E3E0]/20 font-mono text-xs text-[#E4E3E0]/90 overflow-x-auto leading-relaxed">
{`@echo off
chcp 65001 > nul
title Установка и настройка системы «Экзамен» (Windows Setup)
color 0A

:: 1. Проверка Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [!] Node.js не обнаружен. Открываем сайт для загрузки...
    start https://nodejs.org/en/download/
    pause
    exit /b 1
)

:: 2. Установка зависимостей и сборка
call npm install
call npm run build

:: 3. Создание ярлыка на Рабочем столе
powershell -Command "$WshShell = New-Object -comObject WScript.Shell; $Shortcut = $WshShell.CreateShortcut([Environment]::GetFolderPath('Desktop') + '\\Экзамен - Охрана труда.lnk'); $Shortcut.TargetPath = '%~dp0Запустить_Экзамен.bat'; $Shortcut.WorkingDirectory = '%~dp0'; $Shortcut.Save()"

:: 4. Запуск приложения
start "" "%~dp0Запустить_Экзамен.bat"`}
            </pre>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* QUESTION MODAL */}
      {/* ---------------------------------------------------- */}
      {isQuestionModalOpen && (
        <div className="fixed inset-0 bg-[#141414]/80 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border-4 border-[#141414] max-w-2xl w-full p-6 sm:p-8 shadow-[12px_12px_0px_#141414] my-8">
            <div className="flex items-center justify-between border-b-3 border-[#141414] pb-4 mb-4">
              <h3 className="text-xl font-black uppercase tracking-tight text-[#141414]">
                {editingQuestion ? 'Редактирование вопроса' : 'Создание нового вопроса'}
              </h3>
              <button
                onClick={() => setIsQuestionModalOpen(false)}
                className="text-[#141414] hover:text-[#F27D26] cursor-pointer"
              >
                <X className="w-6 h-6 stroke-[3]" />
              </button>
            </div>

            {modalError && (
              <div className="mb-4 p-3 bg-[#F27D26]/20 border-2 border-[#141414] font-mono text-xs font-bold uppercase text-[#141414] flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 text-[#F27D26] shrink-0 stroke-[3]" />
                <span>{modalError}</span>
              </div>
            )}

            <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
              {/* Topic Select */}
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-[#141414] mb-1">
                  Тематический раздел
                </label>
                <select
                  value={qTopicId}
                  onChange={(e) => setQTopicId(Number(e.target.value))}
                  className="w-full px-3 py-2.5 bg-[#E4E3E0]/40 border-2 border-[#141414] text-xs font-black uppercase text-[#141414] focus:outline-none focus:border-[#F27D26]"
                >
                  {topics.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.title}
                    </option>
                  ))}
                </select>
              </div>

              {/* Question Text */}
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-[#141414] mb-1">
                  Текст вопроса <span className="text-[#F27D26]">*</span>
                </label>
                <textarea
                  rows={3}
                  value={qText}
                  onChange={(e) => setQText(e.target.value)}
                  placeholder="ВВЕДИТЕ ТЕКСТ ВОПРОСА..."
                  className="w-full p-3 bg-[#E4E3E0]/30 border-2 border-[#141414] text-xs font-bold uppercase text-[#141414] placeholder-[#141414]/40 focus:bg-white focus:outline-none focus:border-[#F27D26]"
                />
              </div>

              {/* Image attachment */}
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-[#141414] mb-1">
                  Изображение / Схема (опционально)
                </label>
                <div className="flex items-center gap-2 mb-2">
                  <input
                    type="text"
                    value={qImageUrl}
                    onChange={(e) => setQImageUrl(e.target.value)}
                    placeholder="URL картинки или выберите файл..."
                    className="flex-1 px-3 py-2 bg-[#E4E3E0]/30 border-2 border-[#141414] text-xs font-mono text-[#141414]"
                  />
                  <label className="px-4 py-2 bg-[#141414] hover:bg-[#F27D26] text-[#E4E3E0] hover:text-[#141414] font-black uppercase text-xs border-2 border-[#141414] cursor-pointer shrink-0">
                    <span>Обзор</span>
                    <input type="file" accept="image/*" onChange={handleImageFileUpload} className="hidden" />
                  </label>
                </div>
                {qImageUrl && (
                  <div className="relative inline-block border-2 border-[#141414] p-1 bg-[#E4E3E0]/30">
                    <img src={qImageUrl} alt="Preview" className="max-h-24" referrerPolicy="no-referrer" />
                    <button
                      type="button"
                      onClick={() => setQImageUrl('')}
                      className="absolute -top-2 -right-2 bg-[#141414] text-white p-1"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>

              {/* Multiple Choice Toggle */}
              <div className="flex items-center space-x-3 p-3 bg-[#E4E3E0]/40 border-2 border-[#141414]">
                <input
                  type="checkbox"
                  id="q-multi-toggle"
                  checked={qIsMulti}
                  onChange={(e) => setQIsMulti(e.target.checked)}
                  className="w-4 h-4 text-[#F27D26] accent-[#F27D26] cursor-pointer"
                />
                <label htmlFor="q-multi-toggle" className="text-xs font-black uppercase tracking-wider text-[#141414] cursor-pointer">
                  Несколько правильных вариантов ответа (множественный выбор)
                </label>
              </div>

              {/* Options Builder */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-black uppercase tracking-wider text-[#141414]">
                    Варианты ответов (отметьте галочкой правильные)
                  </label>
                  <button
                    type="button"
                    onClick={() => setQOptions([...qOptions, { text: '', is_correct: false }])}
                    className="text-[11px] font-mono uppercase text-[#F27D26] font-black hover:underline"
                  >
                    + Добавить вариант
                  </button>
                </div>

                <div className="space-y-2">
                  {qOptions.map((opt, oIdx) => (
                    <div key={oIdx} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={opt.is_correct}
                        onChange={(e) => {
                          const updated = [...qOptions];
                          if (!qIsMulti) {
                            updated.forEach((o, i) => (o.is_correct = i === oIdx));
                          } else {
                            updated[oIdx].is_correct = e.target.checked;
                          }
                          setQOptions(updated);
                        }}
                        className="w-5 h-5 accent-[#F27D26] cursor-pointer shrink-0"
                        title="Отметить как правильный"
                      />
                      <input
                        type="text"
                        value={opt.text}
                        onChange={(e) => {
                          const updated = [...qOptions];
                          updated[oIdx].text = e.target.value;
                          setQOptions(updated);
                        }}
                        placeholder={`ВАРИАНТ ОТВЕТА #${oIdx + 1}`}
                        className="flex-1 px-3 py-2 bg-[#E4E3E0]/30 border-2 border-[#141414] text-xs font-bold text-[#141414] uppercase focus:bg-white focus:outline-none focus:border-[#F27D26]"
                      />
                      {qOptions.length > 2 && (
                        <button
                          type="button"
                          onClick={() => setQOptions(qOptions.filter((_, i) => i !== oIdx))}
                          className="p-2 text-[#141414] hover:text-[#F27D26]"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Explanation */}
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-[#141414] mb-1">
                  Нормативное обоснование / Ссылка на ГОСТ (показывается при тренировке)
                </label>
                <textarea
                  rows={2}
                  value={qExplanation}
                  onChange={(e) => setQExplanation(e.target.value)}
                  placeholder="ПУЭ п. 1.7.51, ГОСТ 12.1.004-91..."
                  className="w-full p-3 bg-[#E4E3E0]/30 border-2 border-[#141414] text-xs font-mono text-[#141414] placeholder-[#141414]/40 focus:bg-white focus:outline-none focus:border-[#F27D26]"
                />
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-4 border-t-3 border-[#141414] mt-4">
              <button
                type="button"
                onClick={() => setIsQuestionModalOpen(false)}
                className="px-5 py-2.5 bg-transparent hover:bg-[#141414] hover:text-[#E4E3E0] text-[#141414] font-black uppercase text-xs border-2 border-[#141414] cursor-pointer"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={handleSaveQuestion}
                className="px-6 py-2.5 bg-[#F27D26] hover:bg-[#141414] text-[#141414] hover:text-[#E4E3E0] font-black uppercase text-xs border-2 border-[#141414] shadow-[4px_4px_0px_#141414] cursor-pointer"
              >
                Сохранить вопрос
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* TOPIC MODAL */}
      {/* ---------------------------------------------------- */}
      {isTopicModalOpen && (
        <div className="fixed inset-0 bg-[#141414]/80 z-50 flex items-center justify-center p-4">
          <div className="bg-white border-4 border-[#141414] max-w-md w-full p-8 shadow-[12px_12px_0px_#141414]">
            <div className="flex items-center justify-between border-b-3 border-[#141414] pb-4 mb-4">
              <h3 className="text-xl font-black uppercase tracking-tight text-[#141414]">
                {editingTopic ? 'Редактирование темы' : 'Создание новой темы'}
              </h3>
              <button
                onClick={() => setIsTopicModalOpen(false)}
                className="text-[#141414] hover:text-[#F27D26] cursor-pointer"
              >
                <X className="w-6 h-6 stroke-[3]" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-[#141414] mb-1">
                  Название раздела <span className="text-[#F27D26]">*</span>
                </label>
                <input
                  type="text"
                  value={topicTitle}
                  onChange={(e) => setTopicTitle(e.target.value)}
                  placeholder="НАПР.: ПОЖАРНАЯ БЕЗОПАСНОСТЬ..."
                  className="w-full px-3 py-2.5 bg-[#E4E3E0]/30 border-2 border-[#141414] text-xs font-bold uppercase text-[#141414] focus:bg-white focus:outline-none focus:border-[#F27D26]"
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-[#141414] mb-1">
                  Краткое описание
                </label>
                <textarea
                  rows={3}
                  value={topicDescription}
                  onChange={(e) => setTopicDescription(e.target.value)}
                  placeholder="ОПИСАНИЕ..."
                  className="w-full p-3 bg-[#E4E3E0]/30 border-2 border-[#141414] text-xs font-mono text-[#141414] focus:bg-white focus:outline-none focus:border-[#F27D26]"
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-[#141414] mb-1">
                  Иконка темы
                </label>
                <select
                  value={topicIcon}
                  onChange={(e) => setTopicIcon(e.target.value)}
                  className="w-full px-3 py-2 bg-[#E4E3E0]/40 border-2 border-[#141414] text-xs font-mono uppercase text-[#141414]"
                >
                  <option value="book-open">Книга (Общая)</option>
                  <option value="flame">Огонь (Пожарная безопасность)</option>
                  <option value="zap">Молния (Электробезопасность)</option>
                  <option value="heart-pulse">Пульс (Первая помощь)</option>
                  <option value="shield-check">Щит (Охрана труда)</option>
                  <option value="hard-hat">Каска (Строительные работы)</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-6 border-t-3 border-[#141414] mt-6">
              <button
                type="button"
                onClick={() => setIsTopicModalOpen(false)}
                className="px-5 py-2.5 bg-transparent hover:bg-[#141414] hover:text-[#E4E3E0] text-[#141414] font-black uppercase text-xs border-2 border-[#141414] cursor-pointer"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={handleSaveTopic}
                className="px-6 py-2.5 bg-[#F27D26] hover:bg-[#141414] text-[#141414] hover:text-[#E4E3E0] font-black uppercase text-xs border-2 border-[#141414] shadow-[4px_4px_0px_#141414] cursor-pointer"
              >
                Сохранить
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Question Confirmation Modal */}
      {confirmDeleteQuestionId !== null && (
        <div className="fixed inset-0 bg-[#141414]/80 z-50 flex items-center justify-center p-4">
          <div className="bg-white border-4 border-[#141414] max-w-md w-full p-6 shadow-[10px_10px_0px_#141414]">
            <div className="flex items-center space-x-3 mb-4 text-red-600">
              <AlertTriangle className="w-6 h-6 stroke-[2.5]" />
              <h3 className="text-lg font-black uppercase text-[#141414]">
                Удалить вопрос #{confirmDeleteQuestionId}?
              </h3>
            </div>
            <p className="font-mono text-xs text-[#141414]/80 uppercase leading-relaxed mb-6">
              Вы уверены, что хотите безвозвратно удалить этот вопрос и все связанные варианты ответов из базы данных?
            </p>
            <div className="flex items-center justify-end space-x-3">
              <button
                onClick={() => setConfirmDeleteQuestionId(null)}
                className="px-4 py-2 bg-transparent hover:bg-[#141414] hover:text-white text-[#141414] font-black text-xs uppercase border-2 border-[#141414] cursor-pointer"
              >
                Отмена
              </button>
              <button
                onClick={() => executeDeleteQuestion(confirmDeleteQuestionId)}
                className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white font-black text-xs uppercase border-2 border-[#141414] shadow-[3px_3px_0px_#141414] cursor-pointer flex items-center space-x-2"
              >
                <Trash2 className="w-4 h-4 stroke-[2.5]" />
                <span>Да, удалить</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Topic Confirmation Modal */}
      {confirmDeleteTopicId !== null && (
        <div className="fixed inset-0 bg-[#141414]/80 z-50 flex items-center justify-center p-4">
          <div className="bg-white border-4 border-[#141414] max-w-md w-full p-6 shadow-[10px_10px_0px_#141414]">
            <div className="flex items-center space-x-3 mb-4 text-red-600">
              <AlertTriangle className="w-7 h-7 stroke-[2.5]" />
              <h3 className="text-lg font-black uppercase text-[#141414]">
                Удалить тему #{confirmDeleteTopicId}?
              </h3>
            </div>
            <p className="font-mono text-xs text-[#141414]/80 uppercase leading-relaxed mb-6">
              Внимание! При удалении темы будут автоматически удалены <strong>ВСЕ привязанные к ней вопросы</strong>. Продолжить?
            </p>
            <div className="flex items-center justify-end space-x-3">
              <button
                onClick={() => setConfirmDeleteTopicId(null)}
                className="px-4 py-2 bg-transparent hover:bg-[#141414] hover:text-white text-[#141414] font-black text-xs uppercase border-2 border-[#141414] cursor-pointer"
              >
                Отмена
              </button>
              <button
                onClick={() => executeDeleteTopic(confirmDeleteTopicId)}
                className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white font-black text-xs uppercase border-2 border-[#141414] shadow-[3px_3px_0px_#141414] cursor-pointer flex items-center space-x-2"
              >
                <Trash2 className="w-4 h-4 stroke-[2.5]" />
                <span>Да, удалить тему</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset DB Confirmation Modal */}
      {isConfirmResetDb && (
        <div className="fixed inset-0 bg-[#141414]/80 z-50 flex items-center justify-center p-4">
          <div className="bg-white border-4 border-[#141414] max-w-md w-full p-6 shadow-[10px_10px_0px_#141414]">
            <div className="flex items-center space-x-3 mb-4 text-red-600">
              <AlertTriangle className="w-7 h-7 stroke-[2.5]" />
              <h3 className="text-lg font-black uppercase text-[#141414]">
                Сбросить базу данных?
              </h3>
            </div>
            <p className="font-mono text-xs text-[#141414]/80 uppercase leading-relaxed mb-6">
              Внимание! База данных SQLite будет сброшена к исходным эталонным билетам и вопросам по охране труда. Все ваши ручные изменения вопросов будут перезаписаны.
            </p>
            <div className="flex items-center justify-end space-x-3">
              <button
                onClick={() => setIsConfirmResetDb(false)}
                className="px-4 py-2 bg-transparent hover:bg-[#141414] hover:text-white text-[#141414] font-black text-xs uppercase border-2 border-[#141414] cursor-pointer"
              >
                Отмена
              </button>
              <button
                onClick={executeResetDatabase}
                className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white font-black text-xs uppercase border-2 border-[#141414] shadow-[3px_3px_0px_#141414] cursor-pointer flex items-center space-x-2"
              >
                <RefreshCw className="w-4 h-4 stroke-[2.5]" />
                <span>Да, сбросить</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
