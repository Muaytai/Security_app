import React, { useState, useEffect } from 'react';
import { Question, UserSelectedAnswer } from '../types';
import { CheckCircle2, XCircle, ArrowRight, ArrowLeft, Check, Maximize2, AlertCircle } from 'lucide-react';

interface TestingScreenProps {
  questions: Question[];
  topicTitle: string;
  employeeName: string;
  department: string;
  mode: 'training' | 'exam';
  onComplete: (results: {
    score: number;
    total: number;
    passed: boolean;
    timeSpentSeconds: number;
    answersDetail: UserSelectedAnswer[];
  }) => void;
  onExit: () => void;
}

export const TestingScreen: React.FC<TestingScreenProps> = ({
  questions,
  topicTitle,
  employeeName,
  department,
  mode,
  onComplete,
  onExit,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOptions, setSelectedOptions] = useState<Record<number, number[]>>({});
  const [answeredTraining, setAnsweredTraining] = useState<Record<number, boolean>>({});
  const [showImageZoom, setShowImageZoom] = useState<string | null>(null);
  const [startTime] = useState<number>(Date.now());
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [showConfirmFinishModal, setShowConfirmFinishModal] = useState(false);

  // Timer
  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, [startTime]);

  if (!questions || questions.length === 0) {
    return (
      <div className="max-w-xl mx-auto py-16 px-4 text-center">
        <div className="p-8 bg-white border-4 border-[#141414] shadow-[8px_8px_0px_#141414]">
          <AlertCircle className="w-12 h-12 text-[#F27D26] mx-auto mb-3" />
          <h3 className="text-xl font-black uppercase tracking-tight text-[#141414] mb-2">
            Вопросы по данной теме не найдены
          </h3>
          <p className="text-xs font-mono text-[#141414]/70 mb-6 uppercase tracking-wider">
            В выбранной теме пока нет добавленных вопросов. Вы можете добавить их в панели администратора.
          </p>
          <button
            onClick={onExit}
            className="px-6 py-3 bg-[#141414] hover:bg-[#F27D26] text-[#E4E3E0] hover:text-[#141414] font-black uppercase text-xs tracking-wider border-2 border-[#141414] transition-all cursor-pointer"
          >
            Вернуться назад
          </button>
        </div>
      </div>
    );
  }

  const currentQ = questions[currentIndex];
  const isMulti = currentQ.is_multiple_choice || currentQ.options.filter((o) => o.is_correct).length > 1;
  const currentSelected = selectedOptions[currentQ.id] || [];
  const isTrainingAnswered = mode === 'training' && !!answeredTraining[currentQ.id];

  const handleOptionToggle = (optionId: number) => {
    if (mode === 'training' && isTrainingAnswered) {
      return;
    }

    if (isMulti) {
      const exists = currentSelected.includes(optionId);
      const updated = exists
        ? currentSelected.filter((id) => id !== optionId)
        : [...currentSelected, optionId];
      setSelectedOptions((prev) => ({ ...prev, [currentQ.id]: updated }));
    } else {
      setSelectedOptions((prev) => ({ ...prev, [currentQ.id]: [optionId] }));
    }
  };

  const handleTrainingSubmitAnswer = () => {
    if (currentSelected.length === 0) return;
    setAnsweredTraining((prev) => ({ ...prev, [currentQ.id]: true }));
  };

  const isCurrentTrainingCorrect = () => {
    const correctIds = currentQ.options.filter((o) => o.is_correct).map((o) => o.id);
    if (currentSelected.length !== correctIds.length) return false;
    return correctIds.every((id) => currentSelected.includes(id));
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      if (mode === 'training') {
        finishTesting();
      } else {
        setShowConfirmFinishModal(true);
      }
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  const finishTesting = () => {
    const timeSpent = Math.max(1, Math.floor((Date.now() - startTime) / 1000));
    let score = 0;
    const answersDetail: UserSelectedAnswer[] = [];

    questions.forEach((q) => {
      const chosen = selectedOptions[q.id] || [];
      const correctIds = q.options.filter((o) => o.is_correct).map((o) => o.id);
      
      const isCorrect = 
        chosen.length === correctIds.length &&
        correctIds.every((id) => chosen.includes(id));

      if (isCorrect) {
        score += 1;
      }

      answersDetail.push({
        question_id: q.id,
        selected_option_ids: chosen,
        is_correct: isCorrect,
      });
    });

    // 80% passing threshold for occupational safety certification (allowing 1 error per standard 5-question ticket)
    const passed = questions.length > 0 ? (score / questions.length) >= 0.8 : true;

    onComplete({
      score,
      total: questions.length,
      passed,
      timeSpentSeconds: timeSpent,
      answersDetail,
    });
  };

  const answeredCount = Object.keys(selectedOptions).filter(
    (k) => (selectedOptions[Number(k)] || []).length > 0
  ).length;

  const formatTime = (totalSeconds: number) => {
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 sm:px-6 space-y-6">
      {/* Top Session Bar */}
      <div className="bg-[#141414] text-[#E4E3E0] border-4 border-[#141414] p-5 sm:p-6 shadow-[6px_6px_0px_#141414] flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className={`px-3 py-1 text-xs font-mono font-black uppercase tracking-widest border-2 ${
            mode === 'training'
              ? 'bg-[#141414] text-[#E4E3E0] border-[#E4E3E0]'
              : 'bg-[#F27D26] text-[#141414] border-[#141414]'
          }`}>
            {mode === 'training' ? 'РЕЖИМ: ТРЕНИРОВКА' : 'РЕЖИМ: ЭКЗАМЕН'}
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-black uppercase tracking-tight text-[#E4E3E0]">
              {topicTitle}
            </h2>
            <p className="text-xs font-mono uppercase tracking-wider text-[#E4E3E0]/70">
              СОТРУДНИК: <span className="text-[#F27D26] font-bold">{employeeName}</span> ({department})
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-6">
          <div className="text-right">
            <span className="text-[10px] font-mono uppercase tracking-widest text-[#E4E3E0]/60 block">ТАЙМЕР</span>
            <span className="text-base font-mono font-black text-[#F27D26]">
              {formatTime(elapsedSeconds)}
            </span>
          </div>
          <div className="text-right border-l border-[#E4E3E0]/30 pl-6">
            <span className="text-[10px] font-mono uppercase tracking-widest text-[#E4E3E0]/60 block">ВОПРОС</span>
            <span className="text-base font-mono font-black text-[#E4E3E0]">
              {currentIndex + 1} / {questions.length}
            </span>
          </div>
        </div>
      </div>

      {/* Question Stepper / Navigation Grid */}
      <div className="bg-white border-4 border-[#141414] p-4 sm:p-5 shadow-[6px_6px_0px_#141414]">
        <div className="flex items-center justify-between text-xs font-mono uppercase font-bold text-[#141414]/70 mb-3">
          <span>Навигация ({answeredCount} из {questions.length} отвечено)</span>
          {isMulti && (
            <span className="text-[#F27D26] bg-[#141414] px-2 py-0.5 text-[11px] font-black uppercase tracking-wider">
              МНОЖЕСТВЕННЫЙ ВЫБОР
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {questions.map((q, idx) => {
            const hasAnswer = (selectedOptions[q.id] || []).length > 0;
            const isCurrent = idx === currentIndex;
            const isTrainingDone = mode === 'training' && answeredTraining[q.id];

            let btnClass = 'bg-[#E4E3E0]/40 text-[#141414] border-2 border-[#141414] hover:bg-[#E4E3E0]';

            if (isCurrent) {
              btnClass = 'bg-[#F27D26] text-[#141414] font-black border-2 border-[#141414] shadow-[3px_3px_0px_#141414]';
            } else if (mode === 'training' && isTrainingDone) {
              btnClass = 'bg-[#141414] text-[#E4E3E0] font-bold border-2 border-[#141414]';
            } else if (hasAnswer) {
              btnClass = 'bg-[#141414]/80 text-[#E4E3E0] font-bold border-2 border-[#141414]';
            }

            return (
              <button
                key={q.id}
                onClick={() => setCurrentIndex(idx)}
                className={`w-10 h-10 font-mono text-xs font-bold flex items-center justify-center transition-all cursor-pointer ${btnClass}`}
              >
                {idx + 1}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Question Card */}
      <div className="bg-white border-4 border-[#141414] p-6 sm:p-10 shadow-[8px_8px_0px_#141414]">
        {/* Question Header */}
        <div className="flex items-start justify-between gap-4 mb-6 border-b-2 border-[#141414] pb-4">
          <div className="inline-flex items-center space-x-2 bg-[#141414] text-[#E4E3E0] px-3 py-1 font-mono text-xs font-black uppercase tracking-wider">
            <span>ВОПРОС #{currentIndex + 1}</span>
            <span>//</span>
            <span>{isMulti ? 'НЕСКОЛЬКО ВАРИАНТОВ' : 'ОДИН ВАРИАНТ'}</span>
          </div>
        </div>

        {/* Question Text */}
        <h3 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-[#141414] leading-snug mb-8">
          {currentQ.text}
        </h3>

        {/* Optional Question Image */}
        {currentQ.image_url && (
          <div className="mb-8 border-3 border-[#141414] bg-[#E4E3E0]/30 p-3 relative group max-w-xl mx-auto">
            <img
              src={currentQ.image_url}
              alt={`Иллюстрация к вопросу ${currentIndex + 1}`}
              className="w-full h-auto max-h-80 object-contain mx-auto cursor-pointer"
              onClick={() => setShowImageZoom(currentQ.image_url!)}
              referrerPolicy="no-referrer"
            />
            <button
              onClick={() => setShowImageZoom(currentQ.image_url!)}
              className="absolute top-4 right-4 bg-[#141414] text-[#E4E3E0] hover:bg-[#F27D26] hover:text-[#141414] p-2 border border-[#141414] opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
              title="Увеличить изображение"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Options List */}
        <div className="space-y-4 mb-8">
          {currentQ.options.map((option, optIdx) => {
            const isSelected = currentSelected.includes(option.id);
            const isCorrect = option.is_correct;

            let optionStyle = 'border-2 border-[#141414] bg-[#E4E3E0]/20 hover:bg-[#E4E3E0]/60 text-[#141414]';

            if (mode === 'training' && isTrainingAnswered) {
              if (isCorrect) {
                optionStyle = 'border-3 border-[#141414] bg-[#F27D26]/20 text-[#141414] font-bold shadow-[4px_4px_0px_#141414]';
              } else if (isSelected && !isCorrect) {
                optionStyle = 'border-3 border-[#141414] bg-[#141414] text-[#E4E3E0] font-bold';
              } else {
                optionStyle = 'border-2 border-[#141414]/40 opacity-50 text-[#141414]/60';
              }
            } else if (isSelected) {
              optionStyle = 'border-3 border-[#141414] bg-[#F27D26] text-[#141414] font-black shadow-[4px_4px_0px_#141414]';
            }

            return (
              <div
                key={option.id || optIdx}
                id={`option-item-${option.id}`}
                onClick={() => handleOptionToggle(option.id)}
                className={`p-4 sm:p-5 transition-all cursor-pointer flex items-start space-x-4 select-none ${optionStyle}`}
              >
                {/* Indicator box */}
                <div className={`mt-0.5 w-6 h-6 shrink-0 border-2 border-[#141414] flex items-center justify-center transition-colors ${
                  mode === 'training' && isTrainingAnswered
                    ? isCorrect
                      ? 'bg-[#F27D26] text-[#141414]'
                      : isSelected
                      ? 'bg-[#141414] text-[#E4E3E0]'
                      : 'bg-white'
                    : isSelected
                    ? 'bg-[#141414] text-[#F27D26]'
                    : 'bg-white'
                }`}>
                  {isSelected && <Check className="w-4 h-4 stroke-[3]" />}
                  {mode === 'training' && isTrainingAnswered && isCorrect && !isSelected && (
                    <Check className="w-4 h-4 stroke-[3]" />
                  )}
                </div>

                {/* Option Text */}
                <div className="flex-1 text-sm sm:text-base font-bold leading-snug">
                  <span>{option.text}</span>
                </div>

                {/* Correct/Incorrect badge in training mode */}
                {mode === 'training' && isTrainingAnswered && (
                  <div className="shrink-0">
                    {isCorrect ? (
                      <span className="font-mono text-xs font-black uppercase bg-[#141414] text-[#F27D26] px-2 py-1">
                        ВЕРНЫЙ
                      </span>
                    ) : isSelected ? (
                      <span className="font-mono text-xs font-black uppercase bg-[#E4E3E0] text-[#141414] px-2 py-1">
                        ОШИБКА
                      </span>
                    ) : null}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Training Mode Feedback & Explanation */}
        {mode === 'training' && isTrainingAnswered && (
          <div className="p-5 border-3 border-[#141414] bg-[#E4E3E0]/40 mb-8">
            <div className="flex items-center space-x-2 font-black uppercase text-sm mb-2 text-[#141414]">
              {isCurrentTrainingCorrect() ? (
                <>
                  <CheckCircle2 className="w-5 h-5 text-[#141414] shrink-0 stroke-[3]" />
                  <span>ОТВЕТ ВЕРНЫЙ</span>
                </>
              ) : (
                <>
                  <XCircle className="w-5 h-5 text-[#F27D26] shrink-0 stroke-[3]" />
                  <span>ОТВЕТ НЕВЕРНЫЙ (ПРАВИЛЬНЫЙ ПОДСВЕЧЕН)</span>
                </>
              )}
            </div>

            {currentQ.explanation && (
              <div className="mt-3 text-xs font-mono text-[#141414] bg-white p-3.5 border-2 border-[#141414]">
                <strong className="block mb-1 uppercase text-[#F27D26] font-bold">
                  НОРМАТИВНОЕ ОБОСНОВАНИЕ (ГОСТ / ПБ):
                </strong>
                {currentQ.explanation}
              </div>
            )}
          </div>
        )}

        {/* Action Controls Footer */}
        <div className="flex items-center justify-between pt-6 border-t-3 border-[#141414]">
          <button
            id="btn-prev-question"
            onClick={handlePrev}
            disabled={currentIndex === 0}
            className={`px-5 py-3 font-black uppercase text-xs tracking-wider border-2 border-[#141414] flex items-center space-x-2 transition-all ${
              currentIndex === 0
                ? 'opacity-30 cursor-not-allowed text-[#141414]'
                : 'bg-transparent hover:bg-[#141414] hover:text-[#E4E3E0] text-[#141414] cursor-pointer'
            }`}
          >
            <ArrowLeft className="w-4 h-4 stroke-[3]" />
            <span className="hidden sm:inline">Предыдущий</span>
          </button>

          <div className="flex items-center space-x-4">
            {/* In Training mode, if not answered yet, show Answer button */}
            {mode === 'training' && !isTrainingAnswered && (
              <button
                id="btn-submit-training-answer"
                onClick={handleTrainingSubmitAnswer}
                disabled={currentSelected.length === 0}
                className={`px-8 py-3 font-black uppercase text-xs sm:text-sm tracking-widest border-2 border-[#141414] shadow-[4px_4px_0px_#141414] transition-all flex items-center space-x-2 ${
                  currentSelected.length === 0
                    ? 'bg-[#E4E3E0] text-[#141414]/40 cursor-not-allowed shadow-none'
                    : 'bg-[#F27D26] hover:bg-[#141414] text-[#141414] hover:text-[#E4E3E0] cursor-pointer active:translate-x-[2px] active:translate-y-[2px]'
                }`}
              >
                <span>ОТВЕТИТЬ</span>
              </button>
            )}

            {/* In Training mode, if answered, show Next button */}
            {mode === 'training' && isTrainingAnswered && (
              <button
                id="btn-next-training-question"
                onClick={handleNext}
                className="px-8 py-3 bg-[#141414] hover:bg-[#F27D26] text-[#E4E3E0] hover:text-[#141414] font-black uppercase text-xs sm:text-sm tracking-widest border-2 border-[#141414] shadow-[4px_4px_0px_#141414] active:translate-x-[2px] active:translate-y-[2px] transition-all flex items-center space-x-2 cursor-pointer"
              >
                <span>{currentIndex < questions.length - 1 ? 'СЛЕДУЮЩИЙ ВОПРОС' : 'ЗАВЕРШИТЬ ТРЕНИРОВКУ'}</span>
                <ArrowRight className="w-4 h-4 stroke-[3]" />
              </button>
            )}

            {/* In Exam mode, show standard Next or Finish button */}
            {mode === 'exam' && (
              <>
                {currentIndex < questions.length - 1 ? (
                  <button
                    id="btn-next-exam-question"
                    onClick={handleNext}
                    className="px-8 py-3 bg-[#141414] hover:bg-[#F27D26] text-[#E4E3E0] hover:text-[#141414] font-black uppercase text-xs sm:text-sm tracking-widest border-2 border-[#141414] shadow-[4px_4px_0px_#141414] active:translate-x-[2px] active:translate-y-[2px] transition-all flex items-center space-x-2 cursor-pointer"
                  >
                    <span>СЛЕДУЮЩИЙ ВОПРОС</span>
                    <ArrowRight className="w-4 h-4 stroke-[3]" />
                  </button>
                ) : (
                  <button
                    id="btn-finish-exam-test"
                    onClick={() => setShowConfirmFinishModal(true)}
                    className="px-8 py-3 bg-[#F27D26] hover:bg-[#141414] text-[#141414] hover:text-[#E4E3E0] font-black uppercase text-xs sm:text-sm tracking-widest border-2 border-[#141414] shadow-[4px_4px_0px_#141414] active:translate-x-[2px] active:translate-y-[2px] transition-all flex items-center space-x-2 cursor-pointer"
                  >
                    <span>ЗАВЕРШИТЬ ЭКЗАМЕН</span>
                    <CheckCircle2 className="w-4 h-4 stroke-[3]" />
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Confirmation Dialog for finishing Exam */}
      {showConfirmFinishModal && (
        <div className="fixed inset-0 bg-[#141414]/80 z-50 flex items-center justify-center p-4">
          <div className="bg-white border-4 border-[#141414] max-w-md w-full p-8 shadow-[12px_12px_0px_#141414]">
            <h4 className="text-xl font-black uppercase tracking-tight text-[#141414] mb-3">
              Завершение экзамена
            </h4>
            <p className="text-xs font-mono uppercase text-[#141414] mb-6 leading-relaxed">
              Вы ответили на <strong className="text-[#F27D26]">{answeredCount}</strong> из <strong className="text-[#141414]">{questions.length}</strong> вопросов.
              {answeredCount < questions.length && (
                <span className="block mt-2 text-[#F27D26] font-bold">
                  Внимание: неотвеченные вопросы будут засчитаны как ошибки!
                </span>
              )}
            </p>
            <div className="flex items-center justify-end space-x-3">
              <button
                id="btn-cancel-finish"
                onClick={() => setShowConfirmFinishModal(false)}
                className="px-4 py-2.5 bg-transparent hover:bg-[#141414] hover:text-[#E4E3E0] text-[#141414] font-black uppercase text-xs border-2 border-[#141414] transition-all cursor-pointer"
              >
                Назад
              </button>
              <button
                id="btn-confirm-finish"
                onClick={() => {
                  setShowConfirmFinishModal(false);
                  finishTesting();
                }}
                className="px-6 py-2.5 bg-[#F27D26] hover:bg-[#141414] text-[#141414] hover:text-[#E4E3E0] font-black uppercase text-xs border-2 border-[#141414] shadow-[4px_4px_0px_#141414] transition-all cursor-pointer"
              >
                Сдать экзамен
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image Zoom Modal */}
      {showImageZoom && (
        <div
          className="fixed inset-0 bg-[#141414]/90 z-50 flex items-center justify-center p-4"
          onClick={() => setShowImageZoom(null)}
        >
          <div className="max-w-4xl max-h-[90vh] bg-white p-4 border-4 border-[#141414] shadow-[12px_12px_0px_#F27D26]">
            <img
              src={showImageZoom}
              alt="Zoomed"
              className="max-h-[75vh] w-auto mx-auto object-contain"
              referrerPolicy="no-referrer"
            />
            <p className="text-center font-mono text-xs uppercase font-bold text-[#141414] mt-3">
              Кликните в любом месте для закрытия
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
