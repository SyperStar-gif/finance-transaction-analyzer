import React, { useState, useMemo } from 'react';
import {
  generateMonthlyReport,
  CATEGORIES,
  type Transaction,
} from '../lib/financeSkill';
import { Download, FileSpreadsheet } from 'lucide-react';

interface MonthlyReportViewProps {
  transactions: Transaction[];
}

const AVAILABLE_MONTHS = [
  { value: '2026-10', label: 'Октябрь 2026' },
  { value: '2026-09', label: 'Сентябрь 2026' },
  { value: '2026-08', label: 'Август 2026' },
];

export const MonthlyReportView: React.FC<MonthlyReportViewProps> = ({
  transactions,
}) => {
  const [selectedMonth, setSelectedMonth] = useState('2026-10');

  const report = useMemo(
    () => generateMonthlyReport(transactions, selectedMonth),
    [transactions, selectedMonth]
  );

  const activeCategories = useMemo(
    () => report.categoryBreakdown.filter((item) => item.amount > 0),
    [report.categoryBreakdown]
  );

  const maxDailyExpense = useMemo(() => {
    if (report.dailySeries.length === 0) return 1;
    return Math.max(...report.dailySeries.map((d) => d.expense), 1);
  }, [report.dailySeries]);

  const handleDownloadJsonReport = () => {
    const jsonString = JSON.stringify(report, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `finpulse-monthly-report-${report.month}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadCsvReport = () => {
    const headers = [
      'Категория',
      'Расход_за_месяц_RUB',
      'Доля_процент',
      'Количество_операций',
      'Прошлый_месяц_RUB',
      'Динамика_MoM_процент',
    ];
    const rows = report.categoryBreakdown.map((item) => [
      `"${item.categoryName}"`,
      item.amount,
      item.sharePercent,
      item.transactionCount,
      item.previousMonthAmount,
      item.momDeltaPercent !== null ? item.momDeltaPercent : 'N/A',
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `finpulse-monthly-report-${report.month}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-8">
      {/* Header & Month Selector */}
      <section className="border border-slate-200 bg-white p-6">
        <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4 pb-6 border-b border-slate-200">
          <div className="max-w-xl">
            <h2 className="text-xl font-bold text-slate-900">
              Ежемесячный аналитический отчёт: {report.monthLabel}
            </h2>
            <p className="text-sm text-slate-600 mt-1">
              Автоматическая агрегация трат по ML-категориям, сравнение месяц-к-месяцу (MoM) и динамика кассового потока.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {/* Segmented Month Selector */}
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded">
              {AVAILABLE_MONTHS.map((m) => (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => setSelectedMonth(m.value)}
                  className={`px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
                    selectedMonth === m.value
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={handleDownloadCsvReport}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 border border-slate-300 rounded hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              Скачать CSV
            </button>

            <button
              type="button"
              onClick={handleDownloadJsonReport}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-slate-900 rounded hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              Выгрузить JSON-отчёт
            </button>
          </div>
        </div>

        {/* 4-Column Monthly Summary Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-200 pt-6">
          <div className="pr-0 sm:pr-6 pb-4 sm:pb-0">
            <div className="text-xs text-slate-500">Совокупные расходы за месяц</div>
            <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-1">
              {report.totalExpense.toLocaleString('ru-RU')} ₽
            </div>
            <div className="text-xs text-slate-600 mt-1 font-mono tabular-nums">
              {report.momExpenseDeltaPercent !== null ? (
                <span>
                  {report.momExpenseDeltaPercent > 0 ? '+' : ''}
                  {report.momExpenseDeltaPercent}% к прошлому месяцу ({report.previousMonthExpense.toLocaleString('ru-RU')} ₽)
                </span>
              ) : (
                <span>Базовый расчётный период</span>
              )}
            </div>
          </div>

          <div className=" sm:px-6 py-4 sm:py-0">
            <div className="text-xs text-slate-500">Зачисленные доходы</div>
            <div className="text-2xl font-bold font-mono tabular-nums text-emerald-700 mt-1">
              +{report.totalIncome.toLocaleString('ru-RU')} ₽
            </div>
            <div className="text-xs text-slate-600 mt-1 font-mono tabular-nums">
              Операций за период: {report.transactionCount}
            </div>
          </div>

          <div className="sm:px-6 py-4 sm:py-0">
            <div className="text-xs text-slate-500">Чистый поток и сбережения</div>
            <div
              className={`text-2xl font-bold font-mono tabular-nums mt-1 ${
                report.netCashflow >= 0 ? 'text-slate-900' : 'text-red-600'
              }`}
            >
              {report.netCashflow >= 0 ? '+' : ''}
              {report.netCashflow.toLocaleString('ru-RU')} ₽
            </div>
            <div className="text-xs text-slate-600 mt-1 font-mono tabular-nums">
              Норма сбережений: {report.savingsRatePercent}% от дохода
            </div>
          </div>

          <div className="sm:pl-6 pt-4 sm:pt-0">
            <div className="text-xs text-slate-500">Средний чек расхода</div>
            <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-1">
              {report.averageCheck.toLocaleString('ru-RU')} ₽
            </div>
            <div className="text-xs text-slate-600 mt-1">
              Активных категорий: {activeCategories.length} из 9
            </div>
          </div>
        </div>
      </section>

      {/* Visual Breakdown & Daily Dynamics */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left: Category Distribution & Table (7 cols) */}
        <section className="lg:col-span-7 border border-slate-200 bg-white p-6 flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Структура расходов по категориям ({report.monthLabel})
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Пропорциональное распределение затрат и сравнение с предыдущим месяцем.
            </p>

            {/* Stacked Horizontal Distribution Bar */}
            <div
              className="mt-5 h-6 w-full bg-slate-100 rounded overflow-hidden flex"
              role="img"
              aria-label={`Распределение расходов по категориям за ${report.monthLabel}`}
            >
              {activeCategories.map((cat) => (
                <div
                  key={cat.categoryId}
                  style={{
                    width: `${Math.max(2, cat.sharePercent)}%`,
                    backgroundColor: cat.colorHex,
                  }}
                  title={`${cat.categoryName}: ${cat.amount.toLocaleString('ru-RU')} ₽ (${cat.sharePercent}%)`}
                  className="h-full border-r border-white/40 last:border-r-0"
                />
              ))}
            </div>

            {/* Category Breakdown Table */}
            <div className="mt-6 overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-xs font-semibold text-slate-600">
                    <th className="py-2.5 pr-4">Категория</th>
                    <th className="py-2.5 px-3 text-right whitespace-nowrap">Операций</th>
                    <th className="py-2.5 px-3 text-right whitespace-nowrap">Доля</th>
                    <th className="py-2.5 px-3 text-right whitespace-nowrap">Динамика MoM</th>
                    <th className="py-2.5 pl-3 text-right whitespace-nowrap">Сумма (₽)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-sm">
                  {report.categoryBreakdown.map((item) => (
                    <tr key={item.categoryId} className="hover:bg-slate-50/70">
                      <td className="py-2.5 pr-4">
                        <div className="flex items-center gap-2.5">
                          <span
                            className="w-2.5 h-2.5 rounded-xs shrink-0"
                            style={{ backgroundColor: item.colorHex }}
                            aria-hidden="true"
                          />
                          <span className="font-medium text-slate-900">
                            {item.categoryName}
                          </span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums text-xs text-slate-600">
                        {item.transactionCount}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums text-xs text-slate-700">
                        {item.sharePercent}%
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums text-xs">
                        {item.momDeltaPercent === null ? (
                          <span className="text-slate-400">—</span>
                        ) : (
                          <span
                            className={
                              item.momDeltaPercent > 10
                                ? 'text-amber-700 font-medium'
                                : item.momDeltaPercent < 0
                                  ? 'text-emerald-700 font-medium'
                                  : 'text-slate-600'
                            }
                          >
                            {item.momDeltaPercent > 0 ? '+' : ''}
                            {item.momDeltaPercent}%
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 pl-3 text-right font-mono tabular-nums font-semibold text-slate-900 whitespace-nowrap">
                        {item.amount.toLocaleString('ru-RU')} ₽
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Right: Daily Spend Bar Visualization & Top Merchants (5 cols) */}
        <section className="lg:col-span-5 border border-slate-200 bg-white p-6 flex flex-col justify-between space-y-6">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Динамика расходов по дням и крупнейшие контрагенты
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Хронологическая гистограмма ежедневных списаний за {report.monthLabel}.
            </p>

            {/* SVG Bar Chart of Daily Expenses */}
            <div className="mt-5 pt-4 pb-2 px-3 bg-slate-50 border border-slate-200 rounded">
              {report.dailySeries.length === 0 ? (
                <div className="h-36 flex items-center justify-center text-xs text-slate-500">
                  Нет данных о расходах за выбранный месяц
                </div>
              ) : (
                <svg
                  viewBox="0 0 420 150"
                  className="w-full h-36 overflow-visible"
                  role="img"
                  aria-label="Гистограмма ежедневных расходов"
                >
                  {/* Reference horizontal lines */}
                  <line x1="0" y1="20" x2="420" y2="20" stroke="#E2E8F0" strokeDasharray="3 3" />
                  <line x1="0" y1="70" x2="420" y2="70" stroke="#E2E8F0" strokeDasharray="3 3" />
                  <line x1="0" y1="120" x2="420" y2="120" stroke="#CBD5E1" />

                  {report.dailySeries.map((pt, index) => {
                    const count = report.dailySeries.length;
                    const slotWidth = 400 / Math.max(1, count);
                    const barWidth = Math.min(24, Math.max(6, slotWidth * 0.65));
                    const x = 10 + index * slotWidth + (slotWidth - barWidth) / 2;
                    const barHeight = Math.max(
                      4,
                      Math.round((pt.expense / maxDailyExpense) * 95)
                    );
                    const y = 120 - barHeight;

                    return (
                      <g key={pt.date}>
                        <rect
                          x={x}
                          y={y}
                          width={barWidth}
                          height={barHeight}
                          rx={2}
                          fill="#0F172A"
                        >
                          <title>{`${pt.dayLabel}: ${pt.expense.toLocaleString('ru-RU')} ₽`}</title>
                        </rect>
                        {(count <= 8 || index % 2 === 0) && (
                          <text
                            x={x + barWidth / 2}
                            y={138}
                            textAnchor="middle"
                            className="fill-slate-500 text-[9px] font-mono"
                          >
                            {pt.dayLabel}
                          </text>
                        )}
                      </g>
                    );
                  })}
                </svg>
              )}
            </div>
          </div>

          {/* Top Merchants list */}
          <div className="border-t border-slate-200 pt-5">
            <h4 className="text-xs font-semibold text-slate-700 mb-3">
              Крупнейшие получатели платежей за период:
            </h4>
            <div className="divide-y divide-slate-200">
              {report.topMerchants.map((m, idx) => (
                <div
                  key={m.merchant}
                  className="py-2 flex items-center justify-between text-xs"
                >
                  <div>
                    <span className="font-mono text-slate-400 mr-2">
                      0{idx + 1}.
                    </span>
                    <span className="font-semibold text-slate-900">
                      {m.merchant}
                    </span>
                    <span aria-hidden="true" className="mx-1.5 text-slate-400">
                      ·
                    </span>
                    <span className="text-slate-500">
                      {CATEGORIES[m.categoryId].shortName} ({m.count} опер.)
                    </span>
                  </div>
                  <span className="font-mono tabular-nums font-semibold text-slate-900">
                    {m.amount.toLocaleString('ru-RU')} ₽
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};
