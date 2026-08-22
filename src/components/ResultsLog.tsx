import React, { useState, useEffect, useCallback } from 'react';
import { TestResult } from '../types';
import { fetchResults, deleteResult, clearAllResults } from '../api';
import {
  Award,
  Search,
  Trash2,
  FileSpreadsheet,
  Eye,
  RefreshCw,
  X,
  AlertTriangle,
} from 'lucide-react';

export const ResultsLog: React.FC = () => {
  const [results, setResults] = useState<TestResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [modeFilter, setModeFilter] = useState<'all' | 'exam' | 'training'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedResult, setSelectedResult] = useState<TestResult | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [isConfirmClearAll, setIsConfirmClearAll] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const loadResults = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await fetchResults(modeFilter, searchQuery.trim());
      setResults(data);
    } catch (err: any) {
      console.error('Ошибка загрузки журнала:', err);
    } finally {
      setIsLoading(false);
    }
  }, [modeFilter, searchQuery]);

  useEffect(() => {
    const handler = setTimeout(() => {
      loadResults();
    }, 250);
    return () => clearTimeout(handler);
  }, [loadResults]);

  const executeDelete = async (id: number) => {
    setIsProcessing(true);
    try {
      await deleteResult(id);
      setActionMessage(`Запись #${id} успешно удалена`);
      setTimeout(() => setActionMessage(null), 3000);
      setConfirmDeleteId(null);
      if (selectedResult?.id === id) {
        setSelectedResult(null);
      }
      await loadResults();
    } catch (err: any) {
      setActionMessage(err.message || 'Ошибка удаления записи');
    } finally {
      setIsProcessing(false);
    }
  };

  const executeClearAll = async () => {
    setIsProcessing(true);
    try {
      await clearAllResults();
      setActionMessage('Журнал результатов успешно очищен');
      setTimeout(() => setActionMessage(null), 3000);
      setIsConfirmClearAll(false);
      setSelectedResult(null);
      await loadResults();
    } catch (err: any) {
      setActionMessage(err.message || 'Ошибка очистки журнала');
    } finally {
      setIsProcessing(false);
    }
  };

  const exportToCSV = () => {
    if (results.length === 0) return;

    const headers = [
      'ID',
      'Дата и время',
      'ФИО сотрудника',
      'Отдел / Подразделение',
      'Тема тестирования',
      'Режим',
      'Баллы',
      'Всего вопросов',
      'Процент',
      'Результат (Статус)',
      'Время (сек)',
    ];

    const rows = results.map((r) => [
      r.id,
      `"${new Date(r.created_at).toLocaleString('ru-RU')}"`,
      `"${r.employee_name}"`,
      `"${r.department}"`,
      `"${r.topic_title || r.topic_id}"`,
      r.mode === 'exam' ? 'Экзамен' : 'Тренировка',
      r.score,
      r.total_questions,
      `${Math.round((r.score / r.total_questions) * 100)}%`,
      r.passed ? 'Сдал' : 'Не сдал',
      r.time_spent_seconds || 0,
    ]);

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map((e) => e.join(';'))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `safety_test_protocols_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatDuration = (sec?: number) => {
    if (!sec) return '—';
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}М ${s}С`;
  };

  return (
    <div className="max-w-7xl mx-auto py-10 px-4 sm:px-6 space-y-6">
      {/* Header Banner */}
      <div className="bg-[#141414] text-[#E4E3E0] border-4 border-[#141414] p-6 sm:p-8 shadow-[8px_8px_0px_#141414] flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-3">
            <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-[#E4E3E0]">
              Журнал протоколов проверки знаний
            </h1>
            <span className="bg-[#F27D26] text-[#141414] font-mono text-xs font-black uppercase px-2.5 py-0.5 border border-[#141414]">
              {results.length} ЗАПИСЕЙ
            </span>
          </div>
          <p className="font-mono text-xs text-[#E4E3E0]/70 uppercase tracking-wider mt-1">
            История прохождения экзаменов и тренировок персоналом организации
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {results.length > 0 && (
            <button
              onClick={() => setIsConfirmClearAll(true)}
              className="px-4 py-2.5 bg-transparent hover:bg-red-600 hover:text-white text-[#E4E3E0] font-black uppercase text-xs tracking-wider border-2 border-[#E4E3E0]/40 hover:border-red-600 transition-all flex items-center space-x-2 cursor-pointer"
              title="Очистить весь журнал"
            >
              <Trash2 className="w-4 h-4 stroke-[2.5]" />
              <span>Очистить журнал</span>
            </button>
          )}
          <button
            onClick={exportToCSV}
            disabled={results.length === 0}
            className="px-5 py-2.5 bg-[#F27D26] hover:bg-white text-[#141414] disabled:opacity-50 font-black uppercase text-xs tracking-wider border-2 border-[#141414] shadow-[4px_4px_0px_#E4E3E0] active:translate-x-[2px] active:translate-y-[2px] transition-all flex items-center space-x-2 cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 stroke-[2.5]" />
            <span>Выгрузить в Excel (CSV)</span>
          </button>
        </div>
      </div>

      {actionMessage && (
        <div className="p-4 bg-emerald-500/20 border-3 border-emerald-500 flex items-center justify-between text-[#141414]">
          <span className="font-mono text-xs font-bold uppercase tracking-wider">{actionMessage}</span>
          <button onClick={() => setActionMessage(null)} className="cursor-pointer text-[#141414]">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="bg-white border-4 border-[#141414] p-4 sm:p-5 shadow-[6px_6px_0px_#141414] flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
          {/* Mode toggle */}
          <div className="flex items-center space-x-1 bg-[#141414] p-1 border border-[#141414]">
            <button
              onClick={() => setModeFilter('all')}
              className={`px-3 py-1.5 font-mono text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                modeFilter === 'all'
                  ? 'bg-[#F27D26] text-[#141414]'
                  : 'text-[#E4E3E0] hover:text-[#F27D26]'
              }`}
            >
              Все
            </button>
            <button
              onClick={() => setModeFilter('exam')}
              className={`px-3 py-1.5 font-mono text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                modeFilter === 'exam'
                  ? 'bg-[#F27D26] text-[#141414]'
                  : 'text-[#E4E3E0] hover:text-[#F27D26]'
              }`}
            >
              Экзамены
            </button>
            <button
              onClick={() => setModeFilter('training')}
              className={`px-3 py-1.5 font-mono text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                modeFilter === 'training'
                  ? 'bg-[#F27D26] text-[#141414]'
                  : 'text-[#E4E3E0] hover:text-[#F27D26]'
              }`}
            >
              Тренировки
            </button>
          </div>

          {/* Search input */}
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 absolute left-3 top-3 text-[#141414]/50" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && loadResults()}
              placeholder="ПОИСК ПО ФИО ИЛИ ОТДЕЛУ..."
              className="w-full pl-9 pr-4 py-2.5 bg-[#E4E3E0]/30 border-2 border-[#141414] font-mono text-xs font-bold uppercase text-[#141414] placeholder-[#141414]/40 focus:bg-white focus:outline-none focus:border-[#F27D26]"
            />
          </div>

          <button
            onClick={loadResults}
            className="p-2.5 bg-[#141414] hover:bg-[#F27D26] text-[#E4E3E0] hover:text-[#141414] border-2 border-[#141414] transition-all cursor-pointer"
            title="Обновить"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Results Table */}
      <div className="bg-white border-4 border-[#141414] shadow-[8px_8px_0px_#141414] overflow-hidden">
        {results.length === 0 ? (
          <div className="p-16 text-center text-[#141414]">
            <Award className="w-12 h-12 text-[#141414]/30 mx-auto mb-3" />
            <p className="text-base font-black uppercase">Записей тестирования пока нет</p>
            <p className="font-mono text-xs text-[#141414]/60 uppercase mt-1">
              Результаты сотрудников сохраняются здесь автоматически.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-xs text-[#141414]">
              <thead className="bg-[#141414] text-[#E4E3E0] uppercase font-black text-[11px] tracking-wider border-b-2 border-[#141414]">
                <tr>
                  <th className="py-4 px-4">№ / ДАТА</th>
                  <th className="py-4 px-4">СОТРУДНИК</th>
                  <th className="py-4 px-4">ОТДЕЛ</th>
                  <th className="py-4 px-4">ТЕМА</th>
                  <th className="py-4 px-4">РЕЖИМ</th>
                  <th className="py-4 px-4">БАЛЛЫ</th>
                  <th className="py-4 px-4">СТАТУС</th>
                  <th className="py-4 px-4">ВРЕМЯ</th>
                  <th className="py-4 px-4 text-right">ДЕЙСТВИЯ</th>
                </tr>
              </thead>
              <tbody className="divide-y-2 divide-[#141414]/20">
                {results.map((r) => (
                  <tr
                    key={r.id}
                    className="hover:bg-[#E4E3E0]/40 transition-colors font-bold"
                  >
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="text-[#141414] font-black">#{r.id}</span>
                      <span className="block text-[10px] text-[#141414]/60">
                        {new Date(r.created_at).toLocaleDateString('ru-RU', {
                          day: '2-digit',
                          month: '2-digit',
                          year: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-black uppercase text-[#141414] whitespace-nowrap">
                      {r.employee_name}
                    </td>
                    <td className="py-3.5 px-4 uppercase whitespace-nowrap text-[#141414]/80">
                      {r.department}
                    </td>
                    <td className="py-3.5 px-4 uppercase max-w-[200px] truncate">
                      {r.topic_title || `Тема #${r.topic_id}`}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 text-[10px] font-black uppercase border border-[#141414] ${
                          r.mode === 'exam'
                            ? 'bg-[#F27D26] text-[#141414]'
                            : 'bg-[#141414] text-[#E4E3E0]'
                        }`}
                      >
                        {r.mode === 'exam' ? 'Экзамен' : 'Тренировка'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap font-black">
                      <span>{r.score}</span>
                      <span className="text-[#141414]/50"> / {r.total_questions}</span>
                      <span className="text-[10px] text-[#141414]/60 ml-1">
                        ({Math.round((r.score / r.total_questions) * 100)}%)
                      </span>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {r.passed ? (
                        <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-black uppercase bg-[#F27D26] text-[#141414] border border-[#141414]">
                          СДАЛ
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-black uppercase bg-[#141414] text-white border border-[#141414]">
                          НЕ СДАЛ
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap text-[#141414]/70">
                      {formatDuration(r.time_spent_seconds)}
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end space-x-1">
                        <button
                          onClick={() => setSelectedResult(r)}
                          className="p-1.5 bg-[#141414] text-[#E4E3E0] hover:bg-[#F27D26] hover:text-[#141414] border border-[#141414] transition-colors cursor-pointer"
                          title="Протокол"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(r.id)}
                          className="p-1.5 bg-transparent text-[#141414] hover:bg-red-600 hover:text-white border border-[#141414] hover:border-red-600 transition-colors cursor-pointer"
                          title="Удалить запись"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Protocol Details Modal */}
      {selectedResult && (
        <div className="fixed inset-0 bg-[#141414]/80 z-50 flex items-center justify-center p-4">
          <div className="bg-white border-4 border-[#141414] max-w-lg w-full p-8 shadow-[12px_12px_0px_#141414]">
            <div className="flex items-center justify-between border-b-3 border-[#141414] pb-3 mb-6">
              <h3 className="text-lg font-black uppercase tracking-tight text-[#141414]">
                Протокол тестирования #{selectedResult.id}
              </h3>
              <button
                onClick={() => setSelectedResult(null)}
                className="text-[#141414] hover:text-[#F27D26] cursor-pointer"
              >
                <X className="w-6 h-6 stroke-[3]" />
              </button>
            </div>

            <div className="space-y-3 font-mono text-xs uppercase mb-8">
              <div className="flex justify-between p-2.5 bg-[#E4E3E0]/40 border-2 border-[#141414]">
                <span className="text-[#141414]/60">ФИО СОТРУДНИКА:</span>
                <span className="font-black text-[#141414]">{selectedResult.employee_name}</span>
              </div>
              <div className="flex justify-between p-2.5 bg-[#E4E3E0]/40 border-2 border-[#141414]">
                <span className="text-[#141414]/60">ПОДРАЗДЕЛЕНИЕ:</span>
                <span className="font-black text-[#141414]">{selectedResult.department}</span>
              </div>
              <div className="flex justify-between p-2.5 bg-[#E4E3E0]/40 border-2 border-[#141414]">
                <span className="text-[#141414]/60">ТЕМАТИКА:</span>
                <span className="font-black text-[#141414]">{selectedResult.topic_title || selectedResult.topic_id}</span>
              </div>
              <div className="flex justify-between p-2.5 bg-[#E4E3E0]/40 border-2 border-[#141414]">
                <span className="text-[#141414]/60">РЕЖИМ:</span>
                <span className="font-black text-[#F27D26]">{selectedResult.mode === 'exam' ? 'Экзамен' : 'Тренировка'}</span>
              </div>
              <div className="flex justify-between p-2.5 bg-[#E4E3E0]/40 border-2 border-[#141414]">
                <span className="text-[#141414]/60">РЕЗУЛЬТАТ:</span>
                <span className={`font-black ${selectedResult.passed ? 'text-[#F27D26]' : 'text-[#141414]'}`}>
                  {selectedResult.passed ? 'СДАЛ' : 'НЕ СДАЛ'} ({selectedResult.score} / {selectedResult.total_questions}, {Math.round((selectedResult.score / selectedResult.total_questions) * 100)}%)
                </span>
              </div>
              <div className="flex justify-between p-2.5 bg-[#E4E3E0]/40 border-2 border-[#141414]">
                <span className="text-[#141414]/60">ВРЕМЯ:</span>
                <span className="font-black text-[#141414]">{formatDuration(selectedResult.time_spent_seconds)}</span>
              </div>
              <div className="flex justify-between p-2.5 bg-[#E4E3E0]/40 border-2 border-[#141414]">
                <span className="text-[#141414]/60">ДАТА И ВРЕМЯ:</span>
                <span className="font-black text-[#141414]">
                  {new Date(selectedResult.created_at).toLocaleString('ru-RU')}
                </span>
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => window.print()}
                className="px-5 py-2.5 bg-transparent hover:bg-[#141414] hover:text-[#E4E3E0] text-[#141414] font-black uppercase text-xs border-2 border-[#141414] cursor-pointer"
              >
                Печать
              </button>
              <button
                onClick={() => setSelectedResult(null)}
                className="px-6 py-2.5 bg-[#141414] hover:bg-[#F27D26] text-[#E4E3E0] hover:text-[#141414] font-black uppercase text-xs border-2 border-[#141414] cursor-pointer"
              >
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Single Record Delete Confirmation Modal */}
      {confirmDeleteId !== null && (
        <div className="fixed inset-0 bg-[#141414]/80 z-50 flex items-center justify-center p-4">
          <div className="bg-white border-4 border-[#141414] max-w-md w-full p-6 shadow-[10px_10px_0px_#141414]">
            <div className="flex items-center space-x-3 mb-4 text-red-600">
              <AlertTriangle className="w-6 h-6 stroke-[2.5]" />
              <h3 className="text-lg font-black uppercase text-[#141414]">
                Удалить запись #{confirmDeleteId}?
              </h3>
            </div>
            <p className="font-mono text-xs text-[#141414]/80 uppercase leading-relaxed mb-6">
              Вы действительно хотите удалить этот результат тестирования из журнала? Данное действие необратимо.
            </p>
            <div className="flex items-center justify-end space-x-3">
              <button
                onClick={() => setConfirmDeleteId(null)}
                disabled={isProcessing}
                className="px-4 py-2 bg-transparent hover:bg-[#141414] hover:text-white text-[#141414] font-black text-xs uppercase border-2 border-[#141414] cursor-pointer"
              >
                Отмена
              </button>
              <button
                onClick={() => executeDelete(confirmDeleteId)}
                disabled={isProcessing}
                className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white font-black text-xs uppercase border-2 border-[#141414] shadow-[3px_3px_0px_#141414] cursor-pointer flex items-center space-x-2"
              >
                <Trash2 className="w-4 h-4 stroke-[2.5]" />
                <span>{isProcessing ? 'Удаление...' : 'Да, удалить'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clear All Results Confirmation Modal */}
      {isConfirmClearAll && (
        <div className="fixed inset-0 bg-[#141414]/80 z-50 flex items-center justify-center p-4">
          <div className="bg-white border-4 border-[#141414] max-w-md w-full p-6 shadow-[10px_10px_0px_#141414]">
            <div className="flex items-center space-x-3 mb-4 text-red-600">
              <AlertTriangle className="w-7 h-7 stroke-[2.5]" />
              <h3 className="text-lg font-black uppercase text-[#141414]">
                Очистить весь журнал?
              </h3>
            </div>
            <p className="font-mono text-xs text-[#141414]/80 uppercase leading-relaxed mb-6">
              Внимание: будут безвозвратно удалены все протоколы тестирования ({results.length} записей). Вы уверены?
            </p>
            <div className="flex items-center justify-end space-x-3">
              <button
                onClick={() => setIsConfirmClearAll(false)}
                disabled={isProcessing}
                className="px-4 py-2 bg-transparent hover:bg-[#141414] hover:text-white text-[#141414] font-black text-xs uppercase border-2 border-[#141414] cursor-pointer"
              >
                Отмена
              </button>
              <button
                onClick={executeClearAll}
                disabled={isProcessing}
                className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white font-black text-xs uppercase border-2 border-[#141414] shadow-[3px_3px_0px_#141414] cursor-pointer flex items-center space-x-2"
              >
                <Trash2 className="w-4 h-4 stroke-[2.5]" />
                <span>{isProcessing ? 'Очистка...' : 'Да, очистить всё'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
