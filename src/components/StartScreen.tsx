import React, { useState, useEffect } from 'react';
import { Topic } from '../types';
import { User, Building2, BookOpen, GraduationCap, AlertTriangle, Flame, Zap, HeartPulse, ShieldCheck, HardHat, Sparkles } from 'lucide-react';

interface StartScreenProps {
  topics: Topic[];
  onStartTest: (params: {
    employeeName: string;
    department: string;
    topicId: number;
    mode: 'training' | 'exam';
  }) => void;
}

export const StartScreen: React.FC<StartScreenProps> = ({ topics, onStartTest }) => {
  const [employeeName, setEmployeeName] = useState('');
  const [department, setDepartment] = useState('');
  const [selectedTopicId, setSelectedTopicId] = useState<number>(topics[0]?.id || 1);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Sync selected topic when topics load or change
  useEffect(() => {
    if (topics && topics.length > 0) {
      if (!selectedTopicId || !topics.some((t) => t.id === Number(selectedTopicId))) {
        setSelectedTopicId(topics[0].id);
      }
    }
  }, [topics, selectedTopicId]);

  const selectedTopic = topics.find((t) => t.id === Number(selectedTopicId)) || topics[0];

  const handleQuickFill = () => {
    setEmployeeName('Иванов Алексей Петрович');
    setDepartment('Служба главного энергетика');
    setValidationError(null);
  };

  const handleStart = (mode: 'training' | 'exam') => {
    let finalName = employeeName.trim();
    let finalDept = department.trim();

    // In training mode, if fields are left blank, auto-fill sensible defaults so user can immediately practice
    if (mode === 'training') {
      if (!finalName) {
        finalName = 'Слушатель (Самоподготовка)';
      }
      if (!finalDept) {
        finalDept = 'Учебный сектор / Охрана труда';
      }
    } else {
      // In exam mode, require non-empty fields or prompt
      if (!finalName) {
        setValidationError('Для сдачи экзамена под протокол укажите ФИО сотрудника (или нажмите «Быстрое заполнение»)');
        const el = document.getElementById('input-employee-name');
        el?.focus();
        return;
      }
      if (!finalDept) {
        setValidationError('Для сдачи экзамена укажите отдел или цех сотрудника');
        const el = document.getElementById('input-department');
        el?.focus();
        return;
      }
    }

    const topicIdNum = Number(selectedTopicId) || topics[0]?.id || 1;
    if (!topicIdNum) {
      setValidationError('Пожалуйста, выберите тему тестирования');
      return;
    }

    setValidationError(null);
    onStartTest({
      employeeName: finalName,
      department: finalDept,
      topicId: topicIdNum,
      mode,
    });
  };

  const getTopicIcon = (iconName?: string) => {
    switch (iconName) {
      case 'flame':
        return <Flame className="w-6 h-6 text-[#141414] stroke-[2.5]" />;
      case 'zap':
        return <Zap className="w-6 h-6 text-[#141414] stroke-[2.5]" />;
      case 'heart-pulse':
        return <HeartPulse className="w-6 h-6 text-[#141414] stroke-[2.5]" />;
      case 'shield-check':
        return <ShieldCheck className="w-6 h-6 text-[#141414] stroke-[2.5]" />;
      case 'hard-hat':
        return <HardHat className="w-6 h-6 text-[#141414] stroke-[2.5]" />;
      default:
        return <BookOpen className="w-6 h-6 text-[#141414] stroke-[2.5]" />;
    }
  };

  return (
    <div className="max-w-5xl mx-auto py-10 px-4 sm:px-6 space-y-8">
      {/* Heavy Bold Intro Banner */}
      <div className="bg-[#141414] text-[#E4E3E0] border-4 border-[#141414] p-8 sm:p-12 shadow-[8px_8px_0px_#F27D26] relative">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4 border-b border-[#E4E3E0]/20 pb-4">
          <div className="flex items-center space-x-2">
            <span className="w-3 h-3 bg-[#F27D26]"></span>
            <span className="font-mono text-xs uppercase font-bold tracking-[0.2em] text-[#F27D26]">
              АТТЕСТАЦИОННЫЙ СТАНДАРТ ТБ-2026
            </span>
          </div>
          <span className="font-mono text-xs uppercase tracking-widest text-[#E4E3E0]/60">
            ВЕРСИЯ 4.0.2 / ЛОКАЛЬНАЯ СИСТЕМА
          </span>
        </div>

        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black uppercase tracking-tighter leading-[0.95] mb-4">
          ПРОВЕРКА ЗНАНИЙ <br />
          <span className="text-[#F27D26]">ПО ТЕХНИКЕ БЕЗОПАСНОСТИ</span>
        </h1>
        
        <p className="max-w-2xl font-mono text-xs sm:text-sm text-[#E4E3E0]/80 uppercase tracking-wide leading-relaxed">
          Официальный программный комплекс аттестации персонала по охране труда, пожарной и электробезопасности. Подготовка в режиме тренировки или сдача экзамена под протокол.
        </p>
      </div>

      {/* Form Card */}
      <div className="bg-white border-4 border-[#141414] p-6 sm:p-10 shadow-[8px_8px_0px_#141414]">
        <div className="flex flex-wrap items-center justify-between border-b-4 border-[#141414] pb-4 mb-8 gap-3">
          <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-[#141414] flex items-center space-x-3">
            <span className="bg-[#141414] text-[#E4E3E0] font-mono text-sm px-2.5 py-1">01</span>
            <span>Данные сотрудника и выбор темы</span>
          </h2>
          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={handleQuickFill}
              className="px-3.5 py-1.5 bg-[#E4E3E0] hover:bg-[#F27D26] text-[#141414] border-2 border-[#141414] font-mono text-xs uppercase font-bold tracking-wider flex items-center space-x-1.5 transition-all shadow-[2px_2px_0px_#141414] cursor-pointer"
              title="Заполнить типовые данные сотрудника"
            >
              <Sparkles className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Быстрое заполнение</span>
            </button>
            <span className="font-mono text-xs font-bold uppercase text-[#141414]/50 hidden sm:inline">
              ОБЯЗАТЕЛЬНЫЕ ПОЛЯ (*)
            </span>
          </div>
        </div>

        {validationError && (
          <div className="mb-8 p-4 bg-[#F27D26]/15 border-3 border-[#F27D26] flex items-center justify-between space-x-3 text-[#141414]">
            <div className="flex items-center space-x-3">
              <AlertTriangle className="w-5 h-5 text-[#F27D26] shrink-0 stroke-[3]" />
              <span className="font-mono text-xs font-bold uppercase tracking-wide">{validationError}</span>
            </div>
            <button
              type="button"
              onClick={handleQuickFill}
              className="px-3 py-1 bg-[#141414] text-[#E4E3E0] hover:bg-[#F27D26] hover:text-[#141414] font-mono text-xs uppercase font-bold border border-[#141414] shrink-0 cursor-pointer"
            >
              Заполнить образец
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          {/* Employee Name */}
          <div>
            <label htmlFor="input-employee-name" className="block text-xs font-black uppercase tracking-wider text-[#141414] mb-2">
              Ф.И.О. сотрудника <span className="text-[#F27D26]">*</span>
            </label>
            <div className="relative">
              <input
                id="input-employee-name"
                type="text"
                value={employeeName}
                onChange={(e) => setEmployeeName(e.target.value)}
                placeholder="ИВАНОВ ИВАН ИВАНОВИЧ"
                className="w-full px-4 py-3.5 bg-[#E4E3E0]/30 border-2 border-[#141414] text-[#141414] placeholder-[#141414]/30 font-mono text-sm font-bold uppercase tracking-wider focus:outline-none focus:bg-white focus:border-[#F27D26] transition-all"
              />
              <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-[#141414]/40">
                <User className="w-5 h-5" />
              </div>
            </div>
            <p className="mt-1.5 font-mono text-[11px] uppercase tracking-wider text-[#141414]/60">
              Вносится в протокол и экзаменационный лист
            </p>
          </div>

          {/* Department */}
          <div>
            <label htmlFor="input-department" className="block text-xs font-black uppercase tracking-wider text-[#141414] mb-2">
              Отдел / Подразделение / Цех <span className="text-[#F27D26]">*</span>
            </label>
            <div className="relative">
              <input
                id="input-department"
                type="text"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="СЛУЖБА ГЛАВНОГО ЭНЕРГЕТИКА / ЦЕХ №1"
                className="w-full px-4 py-3.5 bg-[#E4E3E0]/30 border-2 border-[#141414] text-[#141414] placeholder-[#141414]/30 font-mono text-sm font-bold uppercase tracking-wider focus:outline-none focus:bg-white focus:border-[#F27D26] transition-all"
              />
              <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-[#141414]/40">
                <Building2 className="w-5 h-5" />
              </div>
            </div>
            <p className="mt-1.5 font-mono text-[11px] uppercase tracking-wider text-[#141414]/60">
              Укажите службу или производственный участок
            </p>
          </div>
        </div>

        {/* Topic Selection Dropdown */}
        <div className="mb-10">
          <label htmlFor="select-topic" className="block text-xs font-black uppercase tracking-wider text-[#141414] mb-2">
            Тематический раздел тестирования <span className="text-[#F27D26]">*</span>
          </label>
          <div className="relative">
            <select
              id="select-topic"
              value={selectedTopicId}
              onChange={(e) => setSelectedTopicId(Number(e.target.value))}
              className="w-full px-4 py-4 bg-[#E4E3E0]/40 border-3 border-[#141414] text-[#141414] font-black uppercase text-sm sm:text-base tracking-tight focus:outline-none focus:border-[#F27D26] appearance-none cursor-pointer"
            >
              {topics.map((t) => (
                <option key={t.id} value={t.id} className="font-bold uppercase">
                  {t.title} — [{t.question_count ?? 0} ВОПРОСОВ]
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-[#141414]">
              <svg className="w-5 h-5 fill-current stroke-[2]" viewBox="0 0 20 20">
                <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
              </svg>
            </div>
          </div>

          {selectedTopic && (
            <div className="mt-4 p-4 bg-[#E4E3E0]/30 border-2 border-[#141414] flex items-start space-x-4">
              <div className="p-3 bg-[#F27D26] border-2 border-[#141414] shrink-0">
                {getTopicIcon(selectedTopic.icon)}
              </div>
              <div className="flex-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h4 className="text-sm font-black uppercase tracking-tight text-[#141414]">
                    {selectedTopic.title}
                  </h4>
                  <span className="font-mono text-xs font-bold uppercase bg-[#141414] text-[#E4E3E0] px-2 py-0.5">
                    БАЗА: {selectedTopic.question_count ?? 0} ВОПРОСОВ
                  </span>
                </div>
                <p className="text-xs font-mono text-[#141414]/80 mt-1 uppercase tracking-wide leading-relaxed">
                  {selectedTopic.description || 'Вопросы для проверки знаний отраслевых стандартов и правил безопасности.'}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Mode Selector Section */}
        <div>
          <div className="flex items-center justify-between border-b-4 border-[#141414] pb-4 mb-6">
            <h3 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-[#141414] flex items-center space-x-3">
              <span className="bg-[#141414] text-[#E4E3E0] font-mono text-sm px-2.5 py-1">02</span>
              <span>Выбор режима тестирования</span>
            </h3>
          </div>

          {validationError && (
            <div className="mb-6 p-4 bg-[#F27D26]/20 border-3 border-[#F27D26] flex items-center justify-between gap-3 text-[#141414]">
              <div className="flex items-center space-x-2.5">
                <AlertTriangle className="w-5 h-5 text-[#F27D26] shrink-0 stroke-[3]" />
                <span className="font-mono text-xs font-bold uppercase tracking-wide">{validationError}</span>
              </div>
              <button
                type="button"
                onClick={handleQuickFill}
                className="px-3 py-1 bg-[#141414] text-[#E4E3E0] hover:bg-[#F27D26] hover:text-[#141414] font-mono text-xs uppercase font-bold border border-[#141414] shrink-0 cursor-pointer"
              >
                Быстрое заполнение
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Training Card */}
            <div
              id="card-mode-training"
              className="border-4 border-[#141414] bg-[#E4E3E0]/20 p-6 sm:p-8 flex flex-col justify-between hover:bg-[#E4E3E0]/40 transition-all shadow-[6px_6px_0px_#141414]"
            >
              <div>
                <div className="flex items-center justify-between mb-4 border-b-2 border-[#141414] pb-3">
                  <span className="font-mono text-xs font-black uppercase tracking-widest bg-[#141414] text-[#E4E3E0] px-2.5 py-1">
                    РЕЖИМ 01 // ОБУЧЕНИЕ
                  </span>
                  <span className="font-mono text-xs font-bold uppercase text-[#141414]/70">
                    БЕЗ ЛИМИТА
                  </span>
                </div>

                <h4 className="text-2xl sm:text-3xl font-black uppercase tracking-tighter text-[#141414] mb-3">
                  ТРЕНИРОВКА
                </h4>

                <ul className="text-xs font-mono uppercase space-y-2.5 mb-8 text-[#141414]">
                  <li className="flex items-start space-x-2">
                    <span className="w-2 h-2 bg-[#141414] mt-1 shrink-0"></span>
                    <span>Мгновенная подсветка правильного ответа</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="w-2 h-2 bg-[#141414] mt-1 shrink-0"></span>
                    <span>Подробные пояснения к нормам и ГОСТ</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="w-2 h-2 bg-[#141414] mt-1 shrink-0"></span>
                    <span>Право на ошибку без штрафа и ограничений</span>
                  </li>
                </ul>
              </div>

              <button
                id="btn-start-training"
                type="button"
                onClick={() => handleStart('training')}
                className="w-full py-4 px-6 bg-[#141414] hover:bg-[#F27D26] text-[#E4E3E0] hover:text-[#141414] font-black uppercase text-xs sm:text-sm tracking-widest border-2 border-[#141414] shadow-[4px_4px_0px_#141414] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0px_#141414] transition-all flex items-center justify-center space-x-2 cursor-pointer"
              >
                <BookOpen className="w-4 h-4 stroke-[3]" />
                <span>НАЧАТЬ ТРЕНИРОВКУ</span>
              </button>
            </div>

            {/* Exam Card */}
            <div
              id="card-mode-exam"
              className="border-4 border-[#141414] bg-[#F27D26]/10 p-6 sm:p-8 flex flex-col justify-between hover:bg-[#F27D26]/20 transition-all shadow-[6px_6px_0px_#141414]"
            >
              <div>
                <div className="flex items-center justify-between mb-4 border-b-2 border-[#141414] pb-3">
                  <span className="font-mono text-xs font-black uppercase tracking-widest bg-[#F27D26] text-[#141414] px-2.5 py-1 border border-[#141414]">
                    РЕЖИМ 02 // АТТЕСТАЦИЯ
                  </span>
                  <span className="font-mono text-xs font-black uppercase text-[#F27D26] bg-[#141414] px-2 py-0.5">
                    100% ТОЧНОСТЬ
                  </span>
                </div>

                <h4 className="text-2xl sm:text-3xl font-black uppercase tracking-tighter text-[#141414] mb-3">
                  ЭКЗАМЕН
                </h4>

                <ul className="text-xs font-mono uppercase space-y-2.5 mb-8 text-[#141414]">
                  <li className="flex items-start space-x-2">
                    <span className="w-2 h-2 bg-[#F27D26] border border-[#141414] mt-1 shrink-0"></span>
                    <span>Без подсказок по ходу прохождения</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="w-2 h-2 bg-[#F27D26] border border-[#141414] mt-1 shrink-0"></span>
                    <span>Результат и статус только в самом конце</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="w-2 h-2 bg-[#F27D26] border border-[#141414] mt-1 shrink-0"></span>
                    <span>Экзамен сдан только при 100% правильных</span>
                  </li>
                </ul>
              </div>

              <button
                id="btn-start-exam"
                type="button"
                onClick={() => handleStart('exam')}
                className="w-full py-4 px-6 bg-[#F27D26] hover:bg-[#141414] text-[#141414] hover:text-[#E4E3E0] font-black uppercase text-xs sm:text-sm tracking-widest border-2 border-[#141414] shadow-[4px_4px_0px_#141414] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0px_#141414] transition-all flex items-center justify-center space-x-2 cursor-pointer"
              >
                <GraduationCap className="w-4 h-4 stroke-[3]" />
                <span>НАЧАТЬ ЭКЗАМЕН</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
