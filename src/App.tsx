import React, { useState, useEffect, useMemo } from 'react';
import {
  INITIAL_TRANSACTIONS,
  INITIAL_BUDGETS,
  INITIAL_BANK_CONNECTORS,
  createInitialMLModel,
  retrainModelWithSample,
  generateMonthlyReport,
  evaluateBudgets,
  synchronizeOfflineQueue,
  generateOpenBankingBatch,
  generateDeterministicChecksum,
  type Transaction,
  type BudgetRule,
  type BankConnector,
  type OfflineQueueItem,
  type CategoryId,
  type MLModelState,
} from './lib/financeSkill';
import { TransactionsMLView } from './components/TransactionsMLView';
import { MonthlyReportView } from './components/MonthlyReportView';
import { BudgetsAlertsView } from './components/BudgetsAlertsView';
import { BankOfflineSyncView } from './components/BankOfflineSyncView';
import { SkillManifestView } from './components/SkillManifestView';

type ActiveSection = 'transactions' | 'reports' | 'budgets' | 'banks' | 'manifest';

const STORAGE_KEYS = {
  TRANSACTIONS: 'finpulse_transactions_v1',
  BUDGETS: 'finpulse_budgets_v1',
  OFFLINE_QUEUE: 'finpulse_offline_queue_v1',
  IS_OFFLINE: 'finpulse_is_offline_v1',
};

export default function App() {
  const [activeSection, setActiveSection] = useState<ActiveSection>('transactions');

  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore storage errors
    }
    return INITIAL_TRANSACTIONS;
  });

  const [budgets, setBudgets] = useState<BudgetRule[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.BUDGETS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore
    }
    return INITIAL_BUDGETS;
  });

  const [offlineQueue, setOfflineQueue] = useState<OfflineQueueItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.OFFLINE_QUEUE);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // ignore
    }
    return [];
  });

  const [isOffline, setIsOffline] = useState<boolean>(() => {
    try {
      return localStorage.getItem(STORAGE_KEYS.IS_OFFLINE) === 'true';
    } catch {
      return false;
    }
  });

  const [bankConnectors, setBankConnectors] = useState<BankConnector[]>(
    INITIAL_BANK_CONNECTORS
  );

  const [mlModel, setMlModel] = useState<MLModelState>(() => createInitialMLModel());

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(transactions));
    } catch {
      // ignore
    }
  }, [transactions]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.BUDGETS, JSON.stringify(budgets));
    } catch {
      // ignore
    }
  }, [budgets]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.OFFLINE_QUEUE, JSON.stringify(offlineQueue));
    } catch {
      // ignore
    }
  }, [offlineQueue]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.IS_OFFLINE, String(isOffline));
    } catch {
      // ignore
    }
  }, [isOffline]);

  // Derived KPIs for October 2026
  const currentMonthReport = useMemo(
    () => generateMonthlyReport(transactions, '2026-10'),
    [transactions]
  );

  const currentBudgetEvaluations = useMemo(
    () => evaluateBudgets(transactions, budgets, '2026-10'),
    [transactions, budgets]
  );

  const activeAlertsCount = useMemo(
    () => currentBudgetEvaluations.filter((e) => e.alertMessage !== null).length,
    [currentBudgetEvaluations]
  );

  const pendingOfflineCount = useMemo(
    () => offlineQueue.filter((q) => q.status === 'queued').length,
    [offlineQueue]
  );

  // Handlers
  const handleAddTransaction = (newTx: Transaction) => {
    setTransactions((prev) => [newTx, ...prev]);

    if (newTx.userCorrected) {
      setMlModel((prevModel) =>
        retrainModelWithSample(prevModel, {
          text: `${newTx.merchant} ${newTx.description}`,
          mcc: newTx.mcc,
          amount: newTx.amount,
          categoryId: newTx.categoryId,
        })
      );
    }

    if (isOffline) {
      const queueItem: OfflineQueueItem = {
        queueId: `q-${Date.now()}`,
        createdAt: new Date().toISOString(),
        actionType: 'CREATE_TRANSACTION',
        payload: { transaction: newTx },
        checksum: newTx.checksum,
        status: 'queued',
      };
      setOfflineQueue((prev) => [queueItem, ...prev]);
    }
  };

  const handleUpdateCategory = (txId: string, newCat: CategoryId) => {
    const targetTx = transactions.find((t) => t.id === txId);
    if (!targetTx) return;

    // Retrain ML model immediately on user correction
    setMlModel((prevModel) =>
      retrainModelWithSample(prevModel, {
        text: `${targetTx.merchant} ${targetTx.description}`,
        mcc: targetTx.mcc,
        amount: targetTx.amount,
        categoryId: newCat,
      })
    );

    setTransactions((prev) =>
      prev.map((t) =>
        t.id === txId
          ? {
              ...t,
              categoryId: newCat,
              type: newCat === 'income' ? 'income' : 'expense',
              mlConfidence: 1.0,
              userCorrected: true,
              syncStatus: isOffline ? 'pending_sync' : 'synced',
            }
          : t
      )
    );

    if (isOffline) {
      const queueItem: OfflineQueueItem = {
        queueId: `q-${Date.now()}`,
        createdAt: new Date().toISOString(),
        actionType: 'UPDATE_CATEGORY',
        payload: { transactionId: txId, newCategoryId: newCat },
        checksum: generateDeterministicChecksum({
          date: targetTx.date,
          merchant: `${targetTx.merchant}:${newCat}`,
          amount: targetTx.amount,
          mcc: targetTx.mcc,
        }),
        status: 'queued',
      };
      setOfflineQueue((prev) => [queueItem, ...prev]);
    }
  };

  const handleUpdateBudgetRule = (updatedRule: BudgetRule) => {
    setBudgets((prev) =>
      prev.map((b) => (b.categoryId === updatedRule.categoryId ? updatedRule : b))
    );

    if (isOffline) {
      const queueItem: OfflineQueueItem = {
        queueId: `q-${Date.now()}`,
        createdAt: new Date().toISOString(),
        actionType: 'UPDATE_BUDGET',
        payload: { budgetRule: updatedRule },
        checksum: generateDeterministicChecksum({
          date: '2026-10-17',
          merchant: `budget:${updatedRule.categoryId}`,
          amount: updatedRule.monthlyLimit,
        }),
        status: 'queued',
      };
      setOfflineQueue((prev) => [queueItem, ...prev]);
    }
  };

  const handleSyncBankProvider = async (providerId: string) => {
    let incomingBatch: Transaction[] = [];
    try {
      const res = await fetch(`/api/bank/sync/${providerId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: '2026-10-17' }),
      });
      if (res.ok) {
        const data = await res.json();
        incomingBatch = data.transactions || [];
      } else {
        incomingBatch = generateOpenBankingBatch(providerId, mlModel, '2026-10-17');
      }
    } catch {
      incomingBatch = generateOpenBankingBatch(providerId, mlModel, '2026-10-17');
    }

    setTransactions((prev) => {
      const existingChecksums = new Set(prev.map((t) => t.checksum));
      const uniqueNew = incomingBatch.filter((t) => !existingChecksums.has(t.checksum));
      if (uniqueNew.length === 0) {
        // If already imported once today, append with fresh timestamp checksum so user sees live API batch arrival
        const freshBatch = incomingBatch.map((t, idx) => ({
          ...t,
          id: `bank-${providerId}-${Date.now()}-${idx}`,
          checksum: `chk_${Math.random().toString(16).slice(2, 10)}`,
        }));
        return [...freshBatch, ...prev];
      }
      return [...uniqueNew, ...prev];
    });

    const nowFormatted = `2026-10-17 ${new Date().toTimeString().slice(0, 5)}`;
    setBankConnectors((prev) =>
      prev.map((c) =>
        c.id === providerId
          ? {
              ...c,
              status: 'connected',
              lastSyncAt: nowFormatted,
              importedCount: c.importedCount + incomingBatch.length,
            }
          : c
      )
    );
  };

  const handleToggleBankConnection = (providerId: string) => {
    setBankConnectors((prev) =>
      prev.map((c) =>
        c.id === providerId
          ? {
              ...c,
              status: c.status === 'connected' ? 'disconnected' : 'connected',
              lastSyncAt:
                c.status === 'connected' ? c.lastSyncAt : '2026-10-17 (OAuth 2.1)',
            }
          : c
      )
    );
  };

  const handleFlushOfflineQueue = () => {
    const syncOutcome = synchronizeOfflineQueue(
      transactions,
      budgets,
      offlineQueue,
      mlModel
    );
    setTransactions(syncOutcome.transactions);
    setBudgets(syncOutcome.budgets);
    setOfflineQueue(syncOutcome.queue);
    setMlModel(syncOutcome.mlModel);
    setIsOffline(false);
  };

  const handleAddOfflineDemoTransaction = (tx: Transaction) => {
    setIsOffline(true);
    setTransactions((prev) => [tx, ...prev]);
    const queueItem: OfflineQueueItem = {
      queueId: `q-${Date.now()}`,
      createdAt: new Date().toISOString(),
      actionType: 'CREATE_TRANSACTION',
      payload: { transaction: tx },
      checksum: tx.checksum,
      status: 'queued',
    };
    setOfflineQueue((prev) => [queueItem, ...prev]);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      {/* Strict 3-Zone Top Bar Contract */}
      <header className="flex items-center justify-between gap-8 px-6 py-4 bg-white border-b border-slate-200">
        {/* Zone 1: Single text element wordmark */}
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            setActiveSection('transactions');
          }}
          className="text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0"
        >
          FinPulse
        </a>

        {/* Zone 2: 5 concise single-line text navigation links */}
        <nav
          aria-label="Основная навигация скилла"
          className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600"
        >
          <a
            href="#transactions"
            onClick={(e) => {
              e.preventDefault();
              setActiveSection('transactions');
            }}
            className={`py-1 transition-colors whitespace-nowrap shrink-0 border-b-2 ${
              activeSection === 'transactions'
                ? 'border-slate-900 text-slate-900 font-semibold'
                : 'border-transparent hover:text-slate-900'
            }`}
          >
            Транзакции и ML
          </a>
          <a
            href="#reports"
            onClick={(e) => {
              e.preventDefault();
              setActiveSection('reports');
            }}
            className={`py-1 transition-colors whitespace-nowrap shrink-0 border-b-2 ${
              activeSection === 'reports'
                ? 'border-slate-900 text-slate-900 font-semibold'
                : 'border-transparent hover:text-slate-900'
            }`}
          >
            Отчёты
          </a>
          <a
            href="#budgets"
            onClick={(e) => {
              e.preventDefault();
              setActiveSection('budgets');
            }}
            className={`py-1 transition-colors whitespace-nowrap shrink-0 border-b-2 ${
              activeSection === 'budgets'
                ? 'border-slate-900 text-slate-900 font-semibold'
                : 'border-transparent hover:text-slate-900'
            }`}
          >
            Лимиты ({activeAlertsCount})
          </a>
          <a
            href="#banks"
            onClick={(e) => {
              e.preventDefault();
              setActiveSection('banks');
            }}
            className={`py-1 transition-colors whitespace-nowrap shrink-0 border-b-2 ${
              activeSection === 'banks'
                ? 'border-slate-900 text-slate-900 font-semibold'
                : 'border-transparent hover:text-slate-900'
            }`}
          >
            Банки и Офлайн
          </a>
          <a
            href="#manifest"
            onClick={(e) => {
              e.preventDefault();
              setActiveSection('manifest');
            }}
            className={`py-1 transition-colors whitespace-nowrap shrink-0 border-b-2 ${
              activeSection === 'manifest'
                ? 'border-slate-900 text-slate-900 font-semibold'
                : 'border-transparent hover:text-slate-900'
            }`}
          >
            Конфигурация
          </a>
        </nav>

        {/* Zone 3: 1 primary action */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => {
              if (pendingOfflineCount > 0) {
                handleFlushOfflineQueue();
              } else {
                setIsOffline((prev) => !prev);
              }
            }}
            className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
          >
            {pendingOfflineCount > 0
              ? `Синхронизировать (${pendingOfflineCount})`
              : isOffline
                ? 'Режим: Офлайн (Вкл. сеть)'
                : 'Переключить в Офлайн'}
          </button>
        </div>
      </header>

      {/* Mobile Navigation Bar (visible only on <md viewports) */}
      <div className="md:hidden bg-white border-b border-slate-200 px-4 py-2 flex items-center gap-2 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveSection('transactions')}
          className={`px-3 py-1.5 text-xs font-medium rounded whitespace-nowrap shrink-0 ${
            activeSection === 'transactions'
              ? 'bg-slate-900 text-white'
              : 'text-slate-600'
          }`}
        >
          Транзакции и ML
        </button>
        <button
          type="button"
          onClick={() => setActiveSection('reports')}
          className={`px-3 py-1.5 text-xs font-medium rounded whitespace-nowrap shrink-0 ${
            activeSection === 'reports' ? 'bg-slate-900 text-white' : 'text-slate-600'
          }`}
        >
          Отчёты
        </button>
        <button
          type="button"
          onClick={() => setActiveSection('budgets')}
          className={`px-3 py-1.5 text-xs font-medium rounded whitespace-nowrap shrink-0 ${
            activeSection === 'budgets' ? 'bg-slate-900 text-white' : 'text-slate-600'
          }`}
        >
          Лимиты ({activeAlertsCount})
        </button>
        <button
          type="button"
          onClick={() => setActiveSection('banks')}
          className={`px-3 py-1.5 text-xs font-medium rounded whitespace-nowrap shrink-0 ${
            activeSection === 'banks' ? 'bg-slate-900 text-white' : 'text-slate-600'
          }`}
        >
          Банки и Офлайн
        </button>
        <button
          type="button"
          onClick={() => setActiveSection('manifest')}
          className={`px-3 py-1.5 text-xs font-medium rounded whitespace-nowrap shrink-0 ${
            activeSection === 'manifest' ? 'bg-slate-900 text-white' : 'text-slate-600'
          }`}
        >
          Конфигурация
        </button>
      </div>

      {/* Main Content Container (1440px baseline) */}
      <main className="flex-1 max-w-[1380px] w-full mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Top Executive Context & 4-Column Metric Strip */}
        <section className="border border-slate-200 bg-white p-6">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 pb-6 border-b border-slate-200">
            <div>
              <div className="text-xs text-slate-500 font-mono">
                Финансовый скилл ИИ-агента · finance-transaction-analyzer · v1.4.0
              </div>
              <h1
                className="text-2xl sm:text-3xl font-bold text-slate-900 mt-1 tracking-tight"
                style={{ textWrap: 'balance' }}
              >
                Интеллектуальный анализ транзакций и управление бюджетом
              </h1>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 font-mono tabular-nums shrink-0">
              <span>
                Статус канала:{' '}
                <strong className={isOffline ? 'text-amber-700' : 'text-emerald-700'}>
                  {isOffline ? 'Автономный (Офлайн-кэш)' : 'Онлайн (Open Banking TLS 1.3)'}
                </strong>
              </span>
              <span aria-hidden="true">·</span>
              <span>Очередь синхронизации: {pendingOfflineCount}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-200 pt-6">
            <div className="pr-0 sm:pr-6 pb-4 sm:pb-0">
              <div className="text-xs text-slate-500">Расходы за Октябрь 2026</div>
              <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-1">
                {currentMonthReport.totalExpense.toLocaleString('ru-RU')} ₽
              </div>
              <div className="text-xs text-slate-500 mt-1 font-mono tabular-nums">
                Доходы: +{currentMonthReport.totalIncome.toLocaleString('ru-RU')} ₽ · Сбережения: {currentMonthReport.savingsRatePercent}%
              </div>
            </div>

            <div className="sm:px-6 py-4 sm:py-0">
              <div className="text-xs text-slate-500">Точность ML-классификации</div>
              <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-1">
                {(mlModel.validationAccuracy * 100).toFixed(1)}%
              </div>
              <div className="text-xs text-slate-500 mt-1 font-mono tabular-nums">
                Naive Bayes + TF-IDF · Дообучений: {mlModel.userCorrectionsCount}
              </div>
            </div>

            <div className="sm:px-6 py-4 sm:py-0">
              <div className="text-xs text-slate-500">Бюджетные уведомления</div>
              <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-1">
                {activeAlertsCount} активных
              </div>
              <div className="text-xs text-slate-500 mt-1">
                <button
                  type="button"
                  onClick={() => setActiveSection('budgets')}
                  className="underline hover:text-slate-900"
                >
                  Настроить лимиты и пороги →
                </button>
              </div>
            </div>

            <div className="sm:pl-6 pt-4 sm:pt-0">
              <div className="text-xs text-slate-500">Банковские API и Офлайн-синхр.</div>
              <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-1">
                {bankConnectors.filter((c) => c.status === 'connected').length} из{' '}
                {bankConnectors.length} банков
              </div>
              <div className="text-xs text-slate-500 mt-1">
                <button
                  type="button"
                  onClick={() => setActiveSection('banks')}
                  className="underline hover:text-slate-900"
                >
                  Управление шлюзами и очередью ({pendingOfflineCount}) →
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Active View Content */}
        {activeSection === 'transactions' && (
          <TransactionsMLView
            transactions={transactions}
            mlModel={mlModel}
            isOffline={isOffline}
            onAddTransaction={handleAddTransaction}
            onUpdateCategory={handleUpdateCategory}
          />
        )}

        {activeSection === 'reports' && (
          <MonthlyReportView transactions={transactions} />
        )}

        {activeSection === 'budgets' && (
          <BudgetsAlertsView
            transactions={transactions}
            budgets={budgets}
            onUpdateBudgetRule={handleUpdateBudgetRule}
          />
        )}

        {activeSection === 'banks' && (
          <BankOfflineSyncView
            connectors={bankConnectors}
            offlineQueue={offlineQueue}
            isOffline={isOffline}
            mlModel={mlModel}
            onToggleOffline={setIsOffline}
            onSyncBankProvider={handleSyncBankProvider}
            onToggleBankConnection={handleToggleBankConnection}
            onFlushOfflineQueue={handleFlushOfflineQueue}
            onAddOfflineDemoTransaction={handleAddOfflineDemoTransaction}
          />
        )}

        {activeSection === 'manifest' && (
          <SkillManifestView
            mlModel={mlModel}
            transactionCount={transactions.length}
            offlineQueueCount={offlineQueue.length}
          />
        )}
      </main>

      {/* Quiet Institutional Footer */}
      <footer className="border-t border-slate-200 bg-white px-6 py-4 mt-12">
        <div className="max-w-[1380px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <span>
            FinPulse — Финансовый скилл анализа транзакций и ML-классификации расходов (finance-transaction-analyzer)
          </span>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setActiveSection('manifest')}
              className="hover:text-slate-900 underline"
            >
              README.md и skill.config.json
            </button>
            <span aria-hidden="true">·</span>
            <button
              type="button"
              onClick={() => {
                localStorage.clear();
                setTransactions(INITIAL_TRANSACTIONS);
                setBudgets(INITIAL_BUDGETS);
                setOfflineQueue([]);
                setIsOffline(false);
                setMlModel(createInitialMLModel());
              }}
              className="hover:text-slate-900 underline"
            >
              Сбросить демо-данные
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
