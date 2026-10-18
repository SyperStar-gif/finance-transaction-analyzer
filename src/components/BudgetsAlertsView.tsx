import React, { useState, useMemo } from 'react';
import {
  evaluateBudgets,
  type BudgetRule,
  type CategoryId,
  type Transaction,
} from '../lib/financeSkill';
import { AlertTriangle, CheckCircle2, Bell, BellOff } from 'lucide-react';

interface BudgetsAlertsViewProps {
  transactions: Transaction[];
  budgets: BudgetRule[];
  onUpdateBudgetRule: (rule: BudgetRule) => void;
}

export const BudgetsAlertsView: React.FC<BudgetsAlertsViewProps> = ({
  transactions,
  budgets,
  onUpdateBudgetRule,
}) => {
  const [selectedMonth, setSelectedMonth] = useState('2026-10');
  const [draftLimits, setDraftLimits] = useState<Record<string, string>>({});

  const evaluations = useMemo(
    () => evaluateBudgets(transactions, budgets, selectedMonth),
    [transactions, budgets, selectedMonth]
  );

  const activeAlerts = useMemo(
    () => evaluations.filter((e) => e.alertMessage !== null),
    [evaluations]
  );

  const totalBudgetLimit = useMemo(
    () => evaluations.reduce((acc, e) => acc + e.limit, 0),
    [evaluations]
  );
  const totalBudgetSpent = useMemo(
    () => evaluations.reduce((acc, e) => acc + e.spent, 0),
    [evaluations]
  );

  const handleSaveLimit = (categoryId: CategoryId, currentRule: BudgetRule) => {
    const rawVal = draftLimits[categoryId];
    if (rawVal === undefined) return;
    const num = Number(rawVal);
    if (!Number.isNaN(num) && num >= 500) {
      onUpdateBudgetRule({
        ...currentRule,
        monthlyLimit: Math.round(num),
      });
    }
  };

  const handleStepLimit = (rule: BudgetRule, delta: number) => {
    const nextLimit = Math.max(1000, rule.monthlyLimit + delta);
    setDraftLimits((prev) => ({ ...prev, [rule.categoryId]: String(nextLimit) }));
    onUpdateBudgetRule({
      ...rule,
      monthlyLimit: nextLimit,
    });
  };

  return (
    <div className="space-y-8">
      {/* Section 1: Active Notifications & Budget Summary */}
      <section className="border border-slate-200 bg-white p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-6 border-b border-slate-200">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              Контроль лимитов и уведомления о превышении бюджета
            </h2>
            <p className="text-sm text-slate-600 mt-1">
              Автоматический мониторинг кассовых лимитов по категориям с ранним предупреждением (80%) и фиксацией перерасхода (100%+).
            </p>
          </div>

          <div className="flex items-center gap-3">
            <label htmlFor="budget-month-select" className="text-xs font-medium text-slate-600">
              Расчётный месяц:
            </label>
            <select
              id="budget-month-select"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-3 py-1.5 text-xs font-medium border border-slate-300 rounded bg-white text-slate-900"
            >
              <option value="2026-10">Октябрь 2026</option>
              <option value="2026-09">Сентябрь 2026</option>
              <option value="2026-08">Август 2026</option>
            </select>
          </div>
        </div>

        {/* Summary KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-slate-200 py-5 border-b border-slate-200">
          <div className="pr-0 sm:pr-6 pb-3 sm:pb-0">
            <div className="text-xs text-slate-500">Общий лимит на месяц</div>
            <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-1">
              {totalBudgetLimit.toLocaleString('ru-RU')} ₽
            </div>
          </div>
          <div className="sm:px-6 py-3 sm:py-0">
            <div className="text-xs text-slate-500">Фактически израсходовано</div>
            <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-1">
              {totalBudgetSpent.toLocaleString('ru-RU')} ₽ (
              {totalBudgetLimit > 0
                ? Math.round((totalBudgetSpent / totalBudgetLimit) * 100)
                : 0}
              %)
            </div>
          </div>
          <div className="sm:pl-6 pt-3 sm:pt-0">
            <div className="text-xs text-slate-500">Активных уведомлений скилла</div>
            <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-1">
              {activeAlerts.length}
            </div>
          </div>
        </div>

        {/* Active Alerts List */}
        <div className="pt-5">
          <h3 className="text-xs font-semibold text-slate-700 mb-3">
            Журнал сработавших триггеров бюджета ({activeAlerts.length}):
          </h3>

          {activeAlerts.length === 0 ? (
            <div className="p-4 border border-slate-200 bg-slate-50 rounded flex items-center gap-3 text-xs text-slate-700">
              <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
              <span>
                Все категории находятся в пределах установленных бюджетных коридоров. Превышений не зафиксировано.
              </span>
            </div>
          ) : (
            <div className="divide-y divide-slate-200 border border-slate-200 rounded">
              {activeAlerts.map((alert) => (
                <div
                  key={alert.categoryId}
                  className="p-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 bg-white"
                >
                  <div className="flex items-start gap-2.5">
                    <AlertTriangle
                      className={`w-4 h-4 mt-0.5 shrink-0 ${
                        alert.status === 'exceeded' ? 'text-red-600' : 'text-amber-600'
                      }`}
                    />
                    <div>
                      <div className="text-xs font-semibold text-slate-900">
                        {alert.status === 'exceeded'
                          ? 'Критическое превышение лимита'
                          : 'Приближение к порогу бюджета'}
                        {' · '}
                        <span>{alert.categoryName}</span>
                      </div>
                      <p className="text-xs text-slate-600 mt-0.5">
                        {alert.alertMessage}
                      </p>
                    </div>
                  </div>
                  <div className="text-xs font-mono tabular-nums text-slate-700 shrink-0">
                    {alert.spent.toLocaleString('ru-RU')} ₽ / {alert.limit.toLocaleString('ru-RU')} ₽
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Section 2: Per-Category Limit Configuration Table */}
      <section className="border border-slate-200 bg-white">
        <div className="p-6 border-b border-slate-200">
          <h3 className="text-lg font-bold text-slate-900">
            Настройка месячных лимитов по категориям
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Измените сумму лимита или используйте кнопки шага (−2 000 ₽ / +2 000 ₽), чтобы мгновенно протестировать срабатывание уведомлений.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-xs font-semibold text-slate-600 bg-slate-50/60">
                <th className="py-3 px-4">Категория расходов</th>
                <th className="py-3 px-4">Статус и заполнение</th>
                <th className="py-3 px-4 text-right whitespace-nowrap">Израсходовано</th>
                <th className="py-3 px-4 whitespace-nowrap">Месячный лимит (₽)</th>
                <th className="py-3 px-4 whitespace-nowrap">Уведомления</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-sm">
              {evaluations.map((ev) => {
                const rule = budgets.find((b) => b.categoryId === ev.categoryId)!;
                const currentInputValue =
                  draftLimits[ev.categoryId] !== undefined
                    ? draftLimits[ev.categoryId]
                    : String(rule.monthlyLimit);

                return (
                  <tr key={ev.categoryId} className="hover:bg-slate-50/70">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">
                        {ev.categoryName}
                      </div>
                      <div className="text-xs text-slate-500 font-mono tabular-nums mt-0.5">
                        {ev.status === 'exceeded'
                          ? `Перерасход: +${ev.overage.toLocaleString('ru-RU')} ₽`
                          : `Остаток: ${ev.remaining.toLocaleString('ru-RU')} ₽`}
                      </div>
                    </td>

                    <td className="py-3 px-4 min-w-[220px]">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span
                          className={
                            ev.status === 'exceeded'
                              ? 'text-red-600 font-semibold'
                              : ev.status === 'warning'
                                ? 'text-amber-700 font-semibold'
                                : 'text-emerald-700 font-medium'
                          }
                        >
                          {ev.status === 'exceeded'
                            ? 'Превышен'
                            : ev.status === 'warning'
                              ? 'Внимание (≥80%)'
                              : 'В норме'}
                        </span>
                        <span className="font-mono tabular-nums text-slate-600">
                          {ev.utilizationPercent}%
                        </span>
                      </div>
                      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-transform duration-150 origin-left ${
                            ev.status === 'exceeded'
                              ? 'bg-red-600'
                              : ev.status === 'warning'
                                ? 'bg-amber-600'
                                : 'bg-slate-900'
                          }`}
                          style={{
                            transform: `scaleX(${Math.min(
                              1,
                              Math.max(0.02, ev.utilizationPercent / 100)
                            )})`,
                          }}
                        />
                      </div>
                    </td>

                    <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold text-slate-900 whitespace-nowrap">
                      {ev.spent.toLocaleString('ru-RU')} ₽
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          aria-label={`Уменьшить лимит ${ev.categoryName}`}
                          onClick={() => handleStepLimit(rule, -2000)}
                          className="px-2 py-1 text-xs font-mono border border-slate-300 rounded hover:bg-slate-100 text-slate-700"
                        >
                          −2к
                        </button>
                        <input
                          type="number"
                          aria-label={`Лимит бюджета для ${ev.categoryName}`}
                          value={currentInputValue}
                          min={500}
                          step={500}
                          onChange={(e) =>
                            setDraftLimits((prev) => ({
                              ...prev,
                              [ev.categoryId]: e.target.value,
                            }))
                          }
                          onBlur={() => handleSaveLimit(ev.categoryId, rule)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleSaveLimit(ev.categoryId, rule);
                            }
                          }}
                          className="w-28 px-2.5 py-1 text-xs font-mono tabular-nums border border-slate-300 rounded bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                        />
                        <button
                          type="button"
                          aria-label={`Увеличить лимит ${ev.categoryName}`}
                          onClick={() => handleStepLimit(rule, 2000)}
                          className="px-2 py-1 text-xs font-mono border border-slate-300 rounded hover:bg-slate-100 text-slate-700"
                        >
                          +2к
                        </button>
                      </div>
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() =>
                          onUpdateBudgetRule({
                            ...rule,
                            notificationsEnabled: !rule.notificationsEnabled,
                          })
                        }
                        className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded border transition-colors whitespace-nowrap shrink-0 ${
                          rule.notificationsEnabled
                            ? 'border-slate-300 bg-white text-slate-900 hover:bg-slate-50'
                            : 'border-slate-200 bg-slate-100 text-slate-500 hover:text-slate-700'
                        }`}
                      >
                        {rule.notificationsEnabled ? (
                          <>
                            <Bell className="w-3.5 h-3.5 text-slate-900" />
                            Включены
                          </>
                        ) : (
                          <>
                            <BellOff className="w-3.5 h-3.5 text-slate-400" />
                            Отключены
                          </>
                        )}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
