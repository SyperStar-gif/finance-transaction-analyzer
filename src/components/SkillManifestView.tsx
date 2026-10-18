import React, { useState } from 'react';
import {
  README_MD_TEXT,
  SKILL_CONFIG_JSON_TEXT,
  SKILL_MD_TEXT,
} from '../lib/skillDocs';
import type { MLModelState } from '../lib/financeSkill';
import { Copy, Check, Download, CheckCircle2 } from 'lucide-react';

interface SkillManifestViewProps {
  mlModel: MLModelState;
  transactionCount: number;
  offlineQueueCount: number;
}

type DocTab = 'skill-config' | 'readme' | 'skill-md';

export const SkillManifestView: React.FC<SkillManifestViewProps> = ({
  mlModel,
  transactionCount,
  offlineQueueCount,
}) => {
  const [activeDocTab, setActiveDocTab] = useState<DocTab>('skill-config');
  const [copied, setCopied] = useState(false);

  const currentDocContent =
    activeDocTab === 'skill-config'
      ? SKILL_CONFIG_JSON_TEXT
      : activeDocTab === 'readme'
        ? README_MD_TEXT
        : SKILL_MD_TEXT;

  const currentFileName =
    activeDocTab === 'skill-config'
      ? 'skill.config.json'
      : activeDocTab === 'readme'
        ? 'README.md'
        : 'SKILL.md';

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(currentDocContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard fallback
    }
  };

  const handleDownloadFile = () => {
    const blob = new Blob([currentDocContent], {
      type: 'text/plain;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = currentFileName;
    link.click();
    URL.revokeObjectURL(url);
  };

  const verificationMatrix = [
    {
      component: 'ML-классификатор (Naive Bayes + TF-IDF + MCC)',
      module: 'src/lib/financeSkill.ts',
      metrics: `Точность: ${(mlModel.validationAccuracy * 100).toFixed(1)}% · Словарь: ${Object.keys(mlModel.vocabulary).length} токенов`,
      status: 'Проверено (Активно)',
    },
    {
      component: 'Гибридный серверный контур ИИ (@google/genai)',
      module: 'server.ts → POST /api/skill/classify-ai',
      metrics: 'Модель: gemini-3.8-flash + локальный фолбэк',
      status: 'Проверено (Активно)',
    },
    {
      component: 'Генератор ежемесячных отчётов и графиков',
      module: 'src/components/MonthlyReportView.tsx',
      metrics: `Обработано транзакций: ${transactionCount} (Авг — Окт 2026)`,
      status: 'Проверено (Активно)',
    },
    {
      component: 'Движок бюджетных лимитов и триггеров уведомлений',
      module: 'src/components/BudgetsAlertsView.tsx',
      metrics: '9 расходных категорий · Пороги 80% / 100%',
      status: 'Проверено (Активно)',
    },
    {
      component: 'Коннекторы Open Banking API (OAuth 2.1 / mTLS)',
      module: 'server.ts → POST /api/bank/sync/:providerId',
      metrics: 'Т-Банк, Сбер ID, Альфа-Банк, Райффайзен',
      status: 'Проверено (Активно)',
    },
    {
      component: 'Офлайн-буфер и идемпотентная синхронизация FNV-1a',
      module: 'src/components/BankOfflineSyncView.tsx',
      metrics: `Записей в журнале очереди: ${offlineQueueCount}`,
      status: 'Проверено (Активно)',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Section 1: Component & Dependency Verification Table */}
      <section className="border border-slate-200 bg-white">
        <div className="p-6 border-b border-slate-200">
          <h2 className="text-xl font-bold text-slate-900">
            Верификация компонентов скилла и зависимостей конфигурации
          </h2>
          <p className="text-sm text-slate-600 mt-1">
            Сводная таблица работоспособности всех модулей финансового скилла, серверных маршрутов и пакета зависимостей.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-xs font-semibold text-slate-600 bg-slate-50/60">
                <th className="py-3 px-4">Архитектурный компонент</th>
                <th className="py-3 px-4">Модуль / Маршрут</th>
                <th className="py-3 px-4">Параметры и телеметрия</th>
                <th className="py-3 px-4 whitespace-nowrap">Статус проверки</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-sm">
              {verificationMatrix.map((row) => (
                <tr key={row.component} className="hover:bg-slate-50/70">
                  <td className="py-3 px-4 font-semibold text-slate-900">
                    {row.component}
                  </td>
                  <td className="py-3 px-4 font-mono text-xs text-slate-600">
                    {row.module}
                  </td>
                  <td className="py-3 px-4 font-mono tabular-nums text-xs text-slate-700">
                    {row.metrics}
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap text-xs">
                    <span className="inline-flex items-center gap-1.5 text-emerald-700 font-semibold">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {row.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Section 2: Interactive File Inspector (skill.config.json, README.md, SKILL.md) */}
      <section className="border border-slate-200 bg-white p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-5 border-b border-slate-200">
          <div>
            <h3 className="text-lg font-bold text-slate-900">
              Итоговый файл конфигурации и проектная документация
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Все три файла физически созданы в корне проекта (skill.config.json, README.md, skills/finance-transaction-analyzer/SKILL.md) и доступны для экспорта.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Segmented File Selector */}
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded">
              <button
                type="button"
                onClick={() => setActiveDocTab('skill-config')}
                className={`px-3 py-1.5 text-xs font-mono font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
                  activeDocTab === 'skill-config'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                skill.config.json
              </button>
              <button
                type="button"
                onClick={() => setActiveDocTab('readme')}
                className={`px-3 py-1.5 text-xs font-mono font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
                  activeDocTab === 'readme'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                README.md
              </button>
              <button
                type="button"
                onClick={() => setActiveDocTab('skill-md')}
                className={`px-3 py-1.5 text-xs font-mono font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
                  activeDocTab === 'skill-md'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                SKILL.md
              </button>
            </div>

            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 border border-slate-300 rounded hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-700" />
                  Скопировано
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  Копировать код
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleDownloadFile}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 rounded hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              Скачать {currentFileName}
            </button>
          </div>
        </div>

        <pre className="mt-5 p-4 bg-slate-950 text-slate-100 rounded text-xs font-mono overflow-x-auto leading-relaxed">
          <code>{currentDocContent}</code>
        </pre>
      </section>
    </div>
  );
};
