import React, { useState } from 'react';
import {
  migrateOldData,
  exportLegacyDatabase,
  importLegacyDatabase,
  resetDatabaseWithDemoData,
} from '../api';
import {
  Database,
  Download,
  Upload,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  FolderArchive,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';

export const LegacyMigrationView: React.FC = () => {
  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationStatus, setMigrationStatus] = useState<{
    success: boolean;
    message: string;
    topicsCount?: number;
    questionsCount?: number;
  } | null>(null);

  const [isResetting, setIsResetting] = useState(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);

  const handleRunMigration = async () => {
    setIsMigrating(true);
    setMigrationStatus(null);
    try {
      const res = await migrateOldData();
      setMigrationStatus(res);
    } catch (err: any) {
      setMigrationStatus({
        success: false,
        message: 'Ошибка миграции: ' + err.message,
      });
    } finally {
      setIsMigrating(false);
    }
  };

  const handleExport = async () => {
    try {
      const data = await exportLegacyDatabase();
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tb_backup_full_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert('Ошибка резервного копирования: ' + err.message);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const json = JSON.parse(evt.target?.result as string);
        const res = await importLegacyDatabase(json);
        setImportStatus(res.message);
      } catch (err: any) {
        setImportStatus('Ошибка импорта: ' + err.message);
      }
    };
    reader.readAsText(file);
  };

  const handleResetDemo = async () => {
    if (!window.confirm('ВНИМАНИЕ! База данных будет перезаполнена стандартным демо-набором по ТБ. Все добавленные вручную вопросы и история тестов будут перезаписаны. Продолжить?')) {
      return;
    }
    setIsResetting(true);
    try {
      await resetDatabaseWithDemoData();
      alert('База данных успешно сброшена и наполнена эталонными вопросами по ТБ!');
      window.location.reload();
    } catch (err: any) {
      alert('Ошибка сброса: ' + err.message);
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto py-10 px-4 sm:px-6 space-y-8">
      {/* Hero Header */}
      <div className="bg-[#141414] text-[#E4E3E0] border-4 border-[#141414] p-6 sm:p-10 shadow-[8px_8px_0px_#F27D26]">
        <div className="flex items-center space-x-3 mb-2">
          <Database className="w-8 h-8 text-[#F27D26] stroke-[2.5]" />
          <h1 className="text-2xl sm:text-4xl font-black uppercase tracking-tight text-[#E4E3E0]">
            Управление данными и Миграция
          </h1>
        </div>
        <p className="font-mono text-xs sm:text-sm uppercase tracking-wide text-[#E4E3E0]/70 mt-2">
          Инструменты переноса базы данных, экспорта/импорта архивов и сброса структуры SQLite
        </p>
      </div>

      {/* Migration Action Card */}
      <div className="bg-white border-4 border-[#141414] p-6 sm:p-8 shadow-[8px_8px_0px_#141414]">
        <div className="flex items-center space-x-3 border-b-3 border-[#141414] pb-4 mb-6">
          <FolderArchive className="w-6 h-6 text-[#141414] stroke-[2.5]" />
          <h2 className="text-xl font-black uppercase tracking-tight text-[#141414]">
            1. Миграция файлов из директории data/
          </h2>
        </div>

        <p className="text-xs font-mono uppercase text-[#141414]/80 leading-relaxed mb-6">
          Автоматический парсер проверит файлы в папке <code className="bg-[#141414] text-[#E4E3E0] px-1.5 py-0.5 font-bold">data/</code>, сконвертирует старые форматы тем и вопросов в реляционную SQLite базу данных с сохранением вариантов ответов и обоснований.
        </p>

        {migrationStatus && (
          <div
            className={`p-5 mb-6 border-3 border-[#141414] font-mono text-xs uppercase ${
              migrationStatus.success
                ? 'bg-[#F27D26]/20 text-[#141414]'
                : 'bg-[#141414] text-white'
            }`}
          >
            <div className="flex items-center space-x-2 font-bold mb-2">
              {migrationStatus.success ? (
                <CheckCircle2 className="w-5 h-5 text-[#141414] stroke-[3]" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-[#F27D26] stroke-[3]" />
              )}
              <span className="text-sm font-black">{migrationStatus.message}</span>
            </div>
            {migrationStatus.topicsCount !== undefined && (
              <div className="space-y-1 text-[11px] text-[#141414]/80 mt-2">
                <p>• Обработано тем: <strong>{migrationStatus.topicsCount}</strong></p>
                <p>• Перенесено вопросов: <strong>{migrationStatus.questionsCount}</strong></p>
              </div>
            )}
          </div>
        )}

        <button
          id="btn-run-migration"
          onClick={handleRunMigration}
          disabled={isMigrating}
          className="px-6 py-3.5 bg-[#141414] hover:bg-[#F27D26] text-[#E4E3E0] hover:text-[#141414] disabled:opacity-50 font-black uppercase text-xs sm:text-sm tracking-wider border-2 border-[#141414] shadow-[4px_4px_0px_#141414] active:translate-x-[2px] active:translate-y-[2px] transition-all flex items-center space-x-2 cursor-pointer"
        >
          <RefreshCw className={`w-4 h-4 stroke-[3] ${isMigrating ? 'animate-spin' : ''}`} />
          <span>{isMigrating ? 'Выполняется конвертация...' : 'Запустить миграцию старых данных'}</span>
          <ArrowRight className="w-4 h-4 stroke-[3]" />
        </button>
      </div>

      {/* Backup & Restore Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Export Card */}
        <div className="bg-white border-4 border-[#141414] p-6 sm:p-8 shadow-[6px_6px_0px_#141414] flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-2 border-b-2 border-[#141414] pb-3 mb-4">
              <Download className="w-5 h-5 text-[#141414] stroke-[2.5]" />
              <h3 className="text-lg font-black uppercase tracking-tight text-[#141414]">
                Резервная копия (JSON)
              </h3>
            </div>
            <p className="text-xs font-mono uppercase text-[#141414]/80 mb-6 leading-relaxed">
              Выгрузка всей базы данных (темы, вопросы, варианты, протоколы) в единый переносимый JSON-файл.
            </p>
          </div>

          <button
            onClick={handleExport}
            className="w-full py-3.5 px-4 bg-[#141414] hover:bg-[#F27D26] text-[#E4E3E0] hover:text-[#141414] font-black uppercase text-xs tracking-wider border-2 border-[#141414] shadow-[4px_4px_0px_#141414] transition-all flex items-center justify-center space-x-2 cursor-pointer"
          >
            <Download className="w-4 h-4 stroke-[3]" />
            <span>Скачать бэкап базы</span>
          </button>
        </div>

        {/* Import Card */}
        <div className="bg-white border-4 border-[#141414] p-6 sm:p-8 shadow-[6px_6px_0px_#141414] flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-2 border-b-2 border-[#141414] pb-3 mb-4">
              <Upload className="w-5 h-5 text-[#141414] stroke-[2.5]" />
              <h3 className="text-lg font-black uppercase tracking-tight text-[#141414]">
                Восстановление из файла
              </h3>
            </div>
            <p className="text-xs font-mono uppercase text-[#141414]/80 mb-6 leading-relaxed">
              Загрузка ранее созданного JSON-бэкапа для восстановления или переноса на другое рабочее место.
            </p>
          </div>

          <div>
            {importStatus && (
              <p className="font-mono text-xs uppercase font-bold text-[#141414] bg-[#F27D26]/20 p-2.5 border-2 border-[#141414] mb-3">
                {importStatus}
              </p>
            )}
            <label className="w-full py-3.5 px-4 bg-[#F27D26] hover:bg-[#141414] text-[#141414] hover:text-[#E4E3E0] font-black uppercase text-xs tracking-wider border-2 border-[#141414] shadow-[4px_4px_0px_#141414] transition-all flex items-center justify-center space-x-2 cursor-pointer">
              <Upload className="w-4 h-4 stroke-[3]" />
              <span>Выбрать файл бэкапа</span>
              <input
                type="file"
                accept=".json"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>
        </div>
      </div>

      {/* Danger Zone: Reset with Demo Data */}
      <div className="bg-white border-4 border-[#141414] p-6 sm:p-8 shadow-[8px_8px_0px_#141414]">
        <div className="flex items-center space-x-3 border-b-3 border-[#141414] pb-4 mb-4">
          <ShieldAlert className="w-6 h-6 text-[#F27D26] stroke-[3]" />
          <h3 className="text-lg font-black uppercase tracking-tight text-[#141414]">
            Сброс и восстановление заводского набора вопросов ТБ
          </h3>
        </div>
        <p className="text-xs font-mono uppercase text-[#141414]/80 mb-6 leading-relaxed">
          Пересоздает таблицы SQLite и загружает полный комплект официальных экзаменационных билетов по 5 ключевым отраслям охраны труда и техники безопасности.
        </p>

        <button
          onClick={handleResetDemo}
          disabled={isResetting}
          className="px-6 py-3 bg-transparent hover:bg-[#141414] hover:text-[#E4E3E0] text-[#141414] font-black uppercase text-xs tracking-wider border-2 border-[#141414] transition-all flex items-center space-x-2 cursor-pointer"
        >
          <RefreshCw className={`w-4 h-4 stroke-[3] ${isResetting ? 'animate-spin' : ''}`} />
          <span>Сбросить к заводским тестам по ТБ</span>
        </button>
      </div>
    </div>
  );
};
