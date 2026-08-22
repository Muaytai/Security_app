import React from 'react';
import { ShieldCheck, BookOpen, Settings, Award, Database } from 'lucide-react';

interface HeaderProps {
  activeTab: 'test' | 'admin' | 'results' | 'migration';
  setActiveTab: (tab: 'test' | 'admin' | 'results' | 'migration') => void;
  isTesting: boolean;
  onExitTest?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  isTesting,
  onExitTest,
}) => {
  return (
    <header className="bg-[#141414] border-b-4 border-[#141414] text-[#E4E3E0] sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-18">
          {/* Logo & Title */}
          <div
            id="header-brand-logo"
            onClick={() => {
              if (isTesting && onExitTest) {
                if (window.confirm('Вы действительно хотите прервать текущее тестирование?')) {
                  onExitTest();
                  setActiveTab('test');
                }
              } else {
                setActiveTab('test');
              }
            }}
            className="flex items-center space-x-3 cursor-pointer select-none group"
          >
            <div className="w-10 h-10 bg-[#F27D26] text-[#141414] flex items-center justify-center border-2 border-[#141414] shadow-[3px_3px_0px_#E4E3E0] group-hover:translate-x-[1px] group-hover:translate-y-[1px] group-hover:shadow-[2px_2px_0px_#E4E3E0] transition-all">
              <ShieldCheck className="w-6 h-6 stroke-[3]" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-black text-xl sm:text-2xl uppercase tracking-tighter text-[#E4E3E0] group-hover:text-[#F27D26] transition-colors">
                  ТБ КОНТРОЛЬ
                </span>
                <span className="bg-[#F27D26] text-[#141414] text-[10px] font-mono font-black uppercase px-2 py-0.5 tracking-widest border border-[#141414]">
                  SQLITE
                </span>
              </div>
              <p className="text-[11px] font-mono text-[#E4E3E0]/70 uppercase tracking-wider">
                Аттестация по технике безопасности
              </p>
            </div>
          </div>

          {/* Navigation */}
          {!isTesting && (
            <nav className="flex items-center space-x-1 sm:space-x-2">
              <button
                id="nav-tab-testing"
                onClick={() => setActiveTab('test')}
                className={`flex items-center space-x-2 px-4 py-2 text-xs font-black uppercase tracking-wider border-2 transition-all cursor-pointer ${
                  activeTab === 'test'
                    ? 'bg-[#F27D26] text-[#141414] border-[#F27D26] shadow-[3px_3px_0px_#E4E3E0]'
                    : 'text-[#E4E3E0] border-transparent hover:border-[#E4E3E0]/40 hover:bg-[#141414]'
                }`}
              >
                <BookOpen className="w-4 h-4 stroke-[2.5]" />
                <span className="hidden sm:inline">Тестирование</span>
              </button>

              <button
                id="nav-tab-results"
                onClick={() => setActiveTab('results')}
                className={`flex items-center space-x-2 px-4 py-2 text-xs font-black uppercase tracking-wider border-2 transition-all cursor-pointer ${
                  activeTab === 'results'
                    ? 'bg-[#F27D26] text-[#141414] border-[#F27D26] shadow-[3px_3px_0px_#E4E3E0]'
                    : 'text-[#E4E3E0] border-transparent hover:border-[#E4E3E0]/40 hover:bg-[#141414]'
                }`}
              >
                <Award className="w-4 h-4 stroke-[2.5]" />
                <span className="hidden sm:inline">Журнал</span>
              </button>

              <button
                id="nav-tab-migration"
                onClick={() => setActiveTab('migration')}
                className={`flex items-center space-x-2 px-4 py-2 text-xs font-black uppercase tracking-wider border-2 transition-all cursor-pointer ${
                  activeTab === 'migration'
                    ? 'bg-[#F27D26] text-[#141414] border-[#F27D26] shadow-[3px_3px_0px_#E4E3E0]'
                    : 'text-[#E4E3E0] border-transparent hover:border-[#E4E3E0]/40 hover:bg-[#141414]'
                }`}
              >
                <Database className="w-4 h-4 stroke-[2.5]" />
                <span className="hidden md:inline">Миграция</span>
              </button>

              <button
                id="nav-tab-admin"
                onClick={() => setActiveTab('admin')}
                className={`flex items-center space-x-2 px-4 py-2 text-xs font-black uppercase tracking-wider border-2 transition-all cursor-pointer ${
                  activeTab === 'admin'
                    ? 'bg-[#F27D26] text-[#141414] border-[#F27D26] shadow-[3px_3px_0px_#E4E3E0]'
                    : 'text-[#E4E3E0] border-transparent hover:border-[#E4E3E0]/40 hover:bg-[#141414]'
                }`}
              >
                <Settings className="w-4 h-4 stroke-[2.5]" />
                <span>Админка</span>
              </button>
            </nav>
          )}

          {isTesting && (
            <div className="flex items-center space-x-3">
              <span className="font-mono text-xs font-bold uppercase tracking-widest bg-[#F27D26] text-[#141414] px-3 py-1 border border-[#141414] animate-pulse">
                СЕССИЯ АКТИВНА
              </span>
              <button
                id="btn-abort-test"
                onClick={onExitTest}
                className="text-xs font-black uppercase tracking-wider bg-transparent text-[#E4E3E0] hover:bg-[#E4E3E0] hover:text-[#141414] px-3.5 py-1.5 border-2 border-[#E4E3E0] transition-all cursor-pointer"
              >
                Прервать
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
