import React, { useEffect } from 'react';
import { Question, UserSelectedAnswer } from '../types';
import confetti from 'canvas-confetti';
import { CheckCircle2, XCircle, Award, RotateCcw, Home, Printer, Clock, FileText, ChevronDown, ChevronUp } from 'lucide-react';

interface ResultScreenProps {
  score: number;
  total: number;
  passed: boolean;
  timeSpentSeconds: number;
  employeeName: string;
  department: string;
  topicTitle: string;
  mode: 'training' | 'exam';
  questions: Question[];
  answersDetail: UserSelectedAnswer[];
  onRestart: () => void;
  onHome: () => void;
  onViewResultsLog: () => void;
}

export const ResultScreen: React.FC<ResultScreenProps> = ({
  score,
  total,
  passed,
  timeSpentSeconds,
  employeeName,
  department,
  topicTitle,
  mode,
  questions,
  answersDetail,
  onRestart,
  onHome,
  onViewResultsLog,
}) => {
  const [showDetails, setShowDetails] = React.useState(true);

  const percentage = Math.round((score / total) * 100);

  useEffect(() => {
    if (passed && mode === 'exam') {
      try {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
        });
      } catch (e) {
        // Ignore if confetti fails
      }
    }
  }, [passed, mode]);

  const formatTime = (totalSeconds: number) => {
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m} МИН. ${s} СЕК.`;
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="max-w-5xl mx-auto py-10 px-4 sm:px-6 space-y-8">
      {/* Main Result Hero Card */}
      <div className={`border-4 border-[#141414] p-8 sm:p-12 shadow-[10px_10px_0px_#141414] relative ${
        passed
          ? 'bg-[#141414] text-[#E4E3E0]'
          : 'bg-[#141414] text-[#E4E3E0]'
      }`}>
        <div className="text-center max-w-2xl mx-auto">
          {/* Status Icon Badge */}
          <div className="mb-6 inline-flex">
            {passed ? (
              <div className="w-20 h-20 bg-[#F27D26] text-[#141414] border-3 border-[#E4E3E0] flex items-center justify-center shadow-[4px_4px_0px_#E4E3E0]">
                <Award className="w-10 h-10 stroke-[2.5]" />
              </div>
            ) : (
              <div className="w-20 h-20 bg-white text-[#141414] border-3 border-[#F27D26] flex items-center justify-center shadow-[4px_4px_0px_#F27D26]">
                <XCircle className="w-10 h-10 text-[#F27D26] stroke-[2.5]" />
              </div>
            )}
          </div>

          {/* Title & Verdict */}
          <div className="mb-4">
            <span className="font-mono text-xs uppercase font-bold tracking-[0.2em] text-[#F27D26] block mb-2">
              РЕЗУЛЬТАТ АТТЕСТАЦИИ ({mode === 'exam' ? 'ОФИЦИАЛЬНЫЙ ЭКЗАМЕН' : 'ТРЕНИРОВКА'})
            </span>
            <h1 className={`text-4xl sm:text-6xl font-black uppercase tracking-tighter leading-none ${
              passed ? 'text-[#F27D26]' : 'text-white'
            }`}>
              {passed ? 'ЭКЗАМЕН СДАН' : 'ЭКЗАМЕН НЕ СДАН'}
            </h1>
          </div>

          <p className="font-mono text-xs sm:text-sm text-[#E4E3E0]/80 uppercase tracking-wide leading-relaxed mb-8">
            {passed
              ? 'Поздравляем! Вы успешно подтвердили квалификацию и требования правил охраны труда.'
              : mode === 'exam'
              ? 'По нормативному регламенту, экзамен считается сданным при результате 80% и выше (не более 1 ошибки на билет). Рекомендуем повторить материал в режиме тренировки.'
              : 'Тренировка завершена. Ознакомьтесь с подробным разбором ответов ниже.'}
          </p>

          {/* Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 max-w-lg mx-auto mb-8 text-[#141414]">
            <div className="bg-white border-2 border-[#141414] p-4 text-center">
              <span className="font-mono text-[10px] uppercase tracking-widest text-[#141414]/70 block mb-1">
                ПРАВИЛЬНЫХ
              </span>
              <span className="text-2xl font-black font-mono text-[#141414]">
                {score} / {total}
              </span>
            </div>

            <div className="bg-white border-2 border-[#141414] p-4 text-center">
              <span className="font-mono text-[10px] uppercase tracking-widest text-[#141414]/70 block mb-1">
                ТОЧНОСТЬ
              </span>
              <span className={`text-2xl font-black font-mono ${passed ? 'text-[#F27D26]' : 'text-[#141414]'}`}>
                {percentage}%
              </span>
            </div>

            <div className="bg-white border-2 border-[#141414] p-4 text-center col-span-2 sm:col-span-1">
              <span className="font-mono text-[10px] uppercase tracking-widest text-[#141414]/70 block mb-1">
                ВРЕМЯ
              </span>
              <span className="text-sm font-black font-mono text-[#141414] flex items-center justify-center space-x-1 mt-1">
                <Clock className="w-3.5 h-3.5" />
                <span>{formatTime(timeSpentSeconds)}</span>
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              id="btn-restart-test"
              onClick={onRestart}
              className="px-6 py-3 bg-[#F27D26] hover:bg-white text-[#141414] font-black uppercase text-xs tracking-wider border-2 border-[#141414] shadow-[4px_4px_0px_#E4E3E0] active:translate-x-[2px] active:translate-y-[2px] transition-all flex items-center space-x-2 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4 stroke-[3]" />
              <span>Пройти повторно</span>
            </button>

            <button
              id="btn-home-screen"
              onClick={onHome}
              className="px-6 py-3 bg-transparent hover:bg-white hover:text-[#141414] text-[#E4E3E0] font-black uppercase text-xs tracking-wider border-2 border-[#E4E3E0] transition-all flex items-center space-x-2 cursor-pointer"
            >
              <Home className="w-4 h-4 stroke-[2.5]" />
              <span>Выбрать тему</span>
            </button>

            <button
              id="btn-print-protocol"
              onClick={handlePrint}
              className="px-6 py-3 bg-transparent hover:bg-white hover:text-[#141414] text-[#E4E3E0] font-black uppercase text-xs tracking-wider border-2 border-[#E4E3E0] transition-all flex items-center space-x-2 cursor-pointer"
            >
              <Printer className="w-4 h-4 stroke-[2.5]" />
              <span>Печать протокола</span>
            </button>
          </div>
        </div>
      </div>

      {/* Protocol Summary Card */}
      <div className="bg-white border-4 border-[#141414] p-6 sm:p-8 shadow-[8px_8px_0px_#141414] print:border-none print:shadow-none">
        <div className="flex items-center justify-between border-b-3 border-[#141414] pb-4 mb-6">
          <div className="flex items-center space-x-3">
            <FileText className="w-6 h-6 text-[#F27D26] stroke-[2.5]" />
            <h3 className="font-black uppercase text-lg text-[#141414] tracking-tight">
              Экзаменационный лист аттестации
            </h3>
          </div>
          <span className="font-mono text-xs uppercase font-bold text-[#141414]/70">
            {new Date().toLocaleDateString('ru-RU', {
              day: '2-digit',
              month: 'long',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs font-mono uppercase">
          <div className="p-3 bg-[#E4E3E0]/30 border-2 border-[#141414]">
            <span className="text-[#141414]/60 block text-[10px] tracking-widest">ФИО СОТРУДНИКА:</span>
            <span className="font-bold text-sm text-[#141414]">{employeeName}</span>
          </div>
          <div className="p-3 bg-[#E4E3E0]/30 border-2 border-[#141414]">
            <span className="text-[#141414]/60 block text-[10px] tracking-widest">ПОДРАЗДЕЛЕНИЕ / ОТДЕЛ:</span>
            <span className="font-bold text-sm text-[#141414]">{department}</span>
          </div>
          <div className="p-3 bg-[#E4E3E0]/30 border-2 border-[#141414]">
            <span className="text-[#141414]/60 block text-[10px] tracking-widest">ТЕМА АТТЕСТАЦИИ:</span>
            <span className="font-bold text-sm text-[#141414]">{topicTitle}</span>
          </div>
          <div className="p-3 bg-[#E4E3E0]/30 border-2 border-[#141414]">
            <span className="text-[#141414]/60 block text-[10px] tracking-widest">ИТОГОВЫЙ ВЕРДИКТ:</span>
            <span className={`font-black text-sm ${passed ? 'text-[#141414] bg-[#F27D26] px-2 py-0.5' : 'text-white bg-[#141414] px-2 py-0.5'}`}>
              {passed ? 'АТТЕСТОВАН (СДАЛ)' : 'НЕ АТТЕСТОВАН (НЕ СДАЛ)'}
            </span>
          </div>
        </div>
      </div>

      {/* Detailed Question Review Accordion */}
      <div className="bg-white border-4 border-[#141414] shadow-[8px_8px_0px_#141414] overflow-hidden">
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="w-full px-6 py-5 flex items-center justify-between bg-[#141414] text-[#E4E3E0] hover:bg-[#F27D26] hover:text-[#141414] transition-colors text-left cursor-pointer"
        >
          <div className="flex items-center space-x-2">
            <span className="font-black uppercase text-sm tracking-wider">
              РАЗБОР ВОПРОСОВ И ОТВЕТОВ ({questions.length})
            </span>
          </div>
          {showDetails ? <ChevronUp className="w-5 h-5 stroke-[3]" /> : <ChevronDown className="w-5 h-5 stroke-[3]" />}
        </button>

        {showDetails && (
          <div className="p-6 sm:p-8 space-y-8 divide-y-2 divide-[#141414]">
            {questions.map((q, idx) => {
              const userAns = answersDetail.find((a) => a.question_id === q.id);
              const isCorrect = userAns ? userAns.is_correct : false;
              const selectedIds = userAns ? userAns.selected_option_ids : [];

              return (
                <div key={q.id} className={idx > 0 ? 'pt-8' : ''}>
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <h4 className="text-base sm:text-lg font-black uppercase text-[#141414]">
                      ВОПРОС {idx + 1}. {q.text}
                    </h4>
                    <span className={`shrink-0 font-mono text-xs font-black uppercase px-2.5 py-1 border-2 border-[#141414] ${
                      isCorrect
                        ? 'bg-[#F27D26] text-[#141414]'
                        : 'bg-[#141414] text-white'
                    }`}>
                      {isCorrect ? 'ВЕРНО' : 'ОШИБКА'}
                    </span>
                  </div>

                  {q.image_url && (
                    <div className="my-4 max-w-sm border-2 border-[#141414] p-2 bg-[#E4E3E0]/30">
                      <img
                        src={q.image_url}
                        alt="Иллюстрация к вопросу"
                        className="max-h-48 object-contain mx-auto"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  )}

                  {/* Options status */}
                  <div className="space-y-2 mt-4 mb-4 font-mono text-xs uppercase">
                    {q.options.map((opt) => {
                      const wasSelected = selectedIds.includes(opt.id);
                      const isOptionCorrect = opt.is_correct;

                      let rowClass = 'bg-[#E4E3E0]/20 text-[#141414] border-2 border-[#141414]';
                      if (isOptionCorrect) {
                        rowClass = 'bg-[#F27D26]/20 border-2 border-[#141414] text-[#141414] font-bold';
                      } else if (wasSelected && !isOptionCorrect) {
                        rowClass = 'bg-[#141414] text-[#E4E3E0] border-2 border-[#141414] line-through';
                      }

                      return (
                        <div
                          key={opt.id}
                          className={`p-3 border text-xs sm:text-sm flex items-center justify-between ${rowClass}`}
                        >
                          <div className="flex items-center space-x-2">
                            <span>{opt.text}</span>
                          </div>
                          <div className="flex items-center space-x-2 shrink-0 ml-3">
                            {wasSelected && (
                              <span className="text-[10px] font-black px-2 py-0.5 bg-[#141414] text-[#E4E3E0]">
                                ВАШ ВЫБОР
                              </span>
                            )}
                            {isOptionCorrect && (
                              <span className="text-[10px] font-black px-2 py-0.5 bg-[#F27D26] text-[#141414] border border-[#141414]">
                                ПРАВИЛЬНЫЙ
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {q.explanation && (
                    <div className="p-4 bg-[#E4E3E0]/40 border-2 border-[#141414] font-mono text-xs text-[#141414]">
                      <strong className="text-[#F27D26] block mb-1 font-bold uppercase">Обоснование (ГОСТ / ПБ):</strong>
                      {q.explanation}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
