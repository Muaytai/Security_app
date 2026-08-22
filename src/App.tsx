import React, { useState, useEffect } from 'react';
import { Topic, Question, UserSelectedAnswer } from './types';
import { fetchTopics, fetchQuestions, submitTestResult } from './api';
import { Header } from './components/Header';
import { StartScreen } from './components/StartScreen';
import { TestingScreen } from './components/TestingScreen';
import { ResultScreen } from './components/ResultScreen';
import { AdminPanel } from './components/AdminPanel';
import { ResultsLog } from './components/ResultsLog';
import { LegacyMigrationView } from './components/LegacyMigrationView';
import { AlertCircle, Loader2 } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'test' | 'admin' | 'results' | 'migration'>('test');
  const [topics, setTopics] = useState<Topic[]>([]);
  const [isLoadingTopics, setIsLoadingTopics] = useState(true);
  const [topicsError, setTopicsError] = useState<string | null>(null);

  // Active Testing Session state
  const [testState, setTestState] = useState<'idle' | 'testing' | 'finished'>('idle');
  const [sessionParams, setSessionParams] = useState<{
    employeeName: string;
    department: string;
    topicId: number;
    topicTitle: string;
    mode: 'training' | 'exam';
  } | null>(null);
  const [sessionQuestions, setSessionQuestions] = useState<Question[]>([]);
  const [sessionResults, setSessionResults] = useState<{
    score: number;
    total: number;
    passed: boolean;
    timeSpentSeconds: number;
    answersDetail: UserSelectedAnswer[];
  } | null>(null);
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(false);

  useEffect(() => {
    loadTopics();
  }, []);

  const loadTopics = async () => {
    setIsLoadingTopics(true);
    setTopicsError(null);
    try {
      const data = await fetchTopics();
      setTopics(data);
    } catch (err: any) {
      console.error(err);
      setTopicsError('Не удалось подключиться к локальной базе данных SQLite');
    } finally {
      setIsLoadingTopics(false);
    }
  };

  const handleStartTest = async ({
    employeeName,
    department,
    topicId,
    mode,
  }: {
    employeeName: string;
    department: string;
    topicId: number;
    mode: 'training' | 'exam';
  }) => {
    setIsLoadingQuestions(true);
    try {
      const qList = await fetchQuestions(topicId);
      const chosenTopic = topics.find((t) => t.id === topicId);
      const topicTitle = chosenTopic ? chosenTopic.title : `Тема #${topicId}`;

      setSessionParams({
        employeeName,
        department,
        topicId,
        topicTitle,
        mode,
      });
      setSessionQuestions(qList);
      setTestState('testing');
    } catch (err: any) {
      alert('Ошибка загрузки вопросов: ' + err.message);
    } finally {
      setIsLoadingQuestions(false);
    }
  };

  const handleTestComplete = async (results: {
    score: number;
    total: number;
    passed: boolean;
    timeSpentSeconds: number;
    answersDetail: UserSelectedAnswer[];
  }) => {
    setSessionResults(results);
    setTestState('finished');

    // Save result to SQLite database
    if (sessionParams) {
      try {
        await submitTestResult({
          employee_name: sessionParams.employeeName,
          department: sessionParams.department,
          topic_id: sessionParams.topicId,
          mode: sessionParams.mode,
          score: results.score,
          total_questions: results.total,
          passed: results.passed,
          time_spent_seconds: results.timeSpentSeconds,
          answers_detail: results.answersDetail,
        });
      } catch (err) {
        console.error('Ошибка сохранения результата в SQLite:', err);
      }
    }
  };

  const handleExitTest = () => {
    setTestState('idle');
    setSessionParams(null);
    setSessionQuestions([]);
    setSessionResults(null);
  };

  const handleRestartSameTest = () => {
    if (sessionParams) {
      handleStartTest({
        employeeName: sessionParams.employeeName,
        department: sessionParams.department,
        topicId: sessionParams.topicId,
        mode: sessionParams.mode,
      });
    } else {
      handleExitTest();
    }
  };

  return (
    <div className="min-h-screen bg-[#E4E3E0] text-[#141414] flex flex-col font-sans selection:bg-[#F27D26] selection:text-[#141414]">
      {/* Top Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={(tab) => {
          setActiveTab(tab);
          if (testState !== 'idle' && tab !== 'test') {
            setTestState('idle');
          }
        }}
        isTesting={testState === 'testing'}
        onExitTest={handleExitTest}
      />

      {/* Main Content Area */}
      <main className="flex-1">
        {/* Loading Spinner */}
        {(isLoadingTopics || isLoadingQuestions) && (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-10 h-10 text-[#F27D26] animate-spin mb-3 stroke-[2.5]" />
            <p className="text-xs font-mono uppercase font-bold tracking-widest text-[#141414]">
              {isLoadingTopics ? 'Инициализация базы данных SQLite...' : 'Загрузка вопросов теста...'}
            </p>
          </div>
        )}

        {/* Database Error Banner */}
        {topicsError && !isLoadingTopics && (
          <div className="max-w-xl mx-auto my-12 p-8 bg-white border-4 border-[#141414] shadow-[8px_8px_0px_#141414] text-center">
            <AlertCircle className="w-12 h-12 text-[#F27D26] mx-auto mb-3" />
            <h2 className="text-xl font-black uppercase tracking-tight text-[#141414] mb-2">
              Ошибка базы данных
            </h2>
            <p className="text-xs font-mono text-[#141414]/80 mb-6">{topicsError}</p>
            <button
              onClick={loadTopics}
              className="px-6 py-3 bg-[#141414] hover:bg-[#F27D26] text-[#E4E3E0] hover:text-[#141414] font-black uppercase text-xs tracking-wider border-2 border-[#141414] transition-all cursor-pointer"
            >
              Повторить попытку
            </button>
          </div>
        )}

        {!isLoadingTopics && !topicsError && (
          <>
            {/* TAB: TESTING */}
            {activeTab === 'test' && (
              <>
                {testState === 'idle' && (
                  <StartScreen topics={topics} onStartTest={handleStartTest} />
                )}

                {testState === 'testing' && sessionParams && (
                  <TestingScreen
                    questions={sessionQuestions}
                    topicTitle={sessionParams.topicTitle}
                    employeeName={sessionParams.employeeName}
                    department={sessionParams.department}
                    mode={sessionParams.mode}
                    onComplete={handleTestComplete}
                    onExit={handleExitTest}
                  />
                )}

                {testState === 'finished' && sessionParams && sessionResults && (
                  <ResultScreen
                    score={sessionResults.score}
                    total={sessionResults.total}
                    passed={sessionResults.passed}
                    timeSpentSeconds={sessionResults.timeSpentSeconds}
                    employeeName={sessionParams.employeeName}
                    department={sessionParams.department}
                    topicTitle={sessionParams.topicTitle}
                    mode={sessionParams.mode}
                    questions={sessionQuestions}
                    answersDetail={sessionResults.answersDetail}
                    onRestart={handleRestartSameTest}
                    onHome={handleExitTest}
                    onViewResultsLog={() => {
                      handleExitTest();
                      setActiveTab('results');
                    }}
                  />
                )}
              </>
            )}

            {/* TAB: ADMIN PANEL */}
            {activeTab === 'admin' && (
              <AdminPanel onRefreshGlobalData={loadTopics} />
            )}

            {/* TAB: RESULTS LOG */}
            {activeTab === 'results' && <ResultsLog />}

            {/* TAB: DATA MIGRATION */}
            {activeTab === 'migration' && <LegacyMigrationView />}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-[#141414] border-t-4 border-[#141414] py-5 text-center text-xs text-[#E4E3E0]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 bg-[#F27D26]"></span>
            <span className="font-mono text-xs uppercase font-bold tracking-widest">
              Система проверки знаний по ТБ • Локальная база SQLite
            </span>
          </div>
          <span className="font-mono text-[11px] uppercase tracking-widest text-[#E4E3E0]/70">
            СТАНДАРТ ТБ / REACT 19 + EXPRESS + SQLITE
          </span>
        </div>
      </footer>
    </div>
  );
}
