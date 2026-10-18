import React, { useState, useMemo } from 'react';
import {
  CATEGORIES,
  EXPENSE_CATEGORY_IDS,
  classifyTransactionML,
  generateDeterministicChecksum,
  type CategoryId,
  type MLModelState,
  type MLPrediction,
  type Transaction,
} from '../lib/financeSkill';
import { Search, Plus, Sparkles, Download, RotateCcw } from 'lucide-react';

interface TransactionsMLViewProps {
  transactions: Transaction[];
  mlModel: MLModelState;
  isOffline: boolean;
  onAddTransaction: (tx: Transaction) => void;
  onUpdateCategory: (txId: string, newCat: CategoryId) => void;
}

const PRESET_MCC_OPTIONS = [
  { code: '5411', label: '5411 — Супермаркеты' },
  { code: '5812', label: '5812 — Рестораны и кафе' },
  { code: '5814', label: '5814 — Фастфуд и кофейни' },
  { code: '4121', label: '4121 — Такси и каршеринг' },
  { code: '5541', label: '5541 — АЗС и топливо' },
  { code: '4900', label: '4900 — ЖКХ и энергия' },
  { code: '4814', label: '4814 — Связь и интернет' },
  { code: '5912', label: '5912 — Аптеки' },
  { code: '8011', label: '8011 — Медклиники' },
  { code: '5311', label: '5311 — Маркетплейсы' },
  { code: '5651', label: '5651 — Одежда и обувь' },
  { code: '5815', label: '5815 — Подписки и кино' },
  { code: '3011', label: '3011 — Авиабилеты' },
  { code: '4829', label: '4829 — Переводы СБП' },
  { code: '0000', label: '0000 — Зарплата / Доход' },
];

export const TransactionsMLView: React.FC<TransactionsMLViewProps> = ({
  transactions,
  mlModel,
  isOffline,
  onAddTransaction,
  onUpdateCategory,
}) => {
  const [merchant, setMerchant] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [mcc, setMcc] = useState('5411');
  const [txType, setTxType] = useState<'expense' | 'income'>('expense');
  const [txDate, setTxDate] = useState('2026-10-17');
  const [manualCategoryOverride, setManualCategoryOverride] = useState<CategoryId | 'auto'>('auto');
  const [formError, setFormError] = useState<string | null>(null);
  const [aiPrediction, setAiPrediction] = useState<MLPrediction | null>(null);
  const [isCallingAi, setIsCallingAi] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<CategoryId | 'all'>('all');
  const [selectedMonthFilter, setSelectedMonthFilter] = useState<string>('all');

  // Real-time local ML prediction as user types
  const livePrediction: MLPrediction = useMemo(() => {
    if (aiPrediction) return aiPrediction;
    return classifyTransactionML(mlModel, {
      merchant: merchant || 'Покупка в супермаркете',
      description,
      mcc,
      amount: Number(amount) || 0,
      type: txType,
    });
  }, [mlModel, merchant, description, mcc, amount, txType, aiPrediction]);

  const topCandidateProbabilities = useMemo(() => {
    const entries = (Object.entries(livePrediction.probabilities) as [CategoryId, number][])
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4);
    return entries;
  }, [livePrediction]);

  const handleRunServerAiCheck = async () => {
    if (!merchant.trim()) {
      setFormError('Укажите название мерчанта или описание для анализа.');
      return;
    }
    setFormError(null);
    if (isOffline) {
      setFormError('В офлайн-режиме используется локальное ML-ядро Naive Bayes + TF-IDF.');
      return;
    }
    setIsCallingAi(true);
    try {
      const res = await fetch('/api/skill/classify-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          merchant: merchant.trim(),
          description: description.trim(),
          mcc,
          amount: Number(amount) || 1000,
          type: txType,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setAiPrediction(data);
      }
    } catch {
      // Fallback to local ML seamlessly
    } finally {
      setIsCallingAi(false);
    }
  };

  const handleSubmitTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanMerchant = merchant.trim();
    const numericAmount = Number(amount);

    if (!cleanMerchant) {
      setFormError('Введите название магазина или контрагента.');
      return;
    }
    if (!amount || Number.isNaN(numericAmount) || numericAmount <= 0) {
      setFormError('Введите корректную сумму транзакции больше 0 ₽.');
      return;
    }

    setFormError(null);
    const resolvedCategory: CategoryId =
      manualCategoryOverride === 'auto' ? livePrediction.categoryId : manualCategoryOverride;

    const checksum = generateDeterministicChecksum({
      date: txDate,
      merchant: cleanMerchant,
      amount: numericAmount,
      mcc,
    });

    const newTx: Transaction = {
      id: `tx-${Date.now()}`,
      date: txDate,
      merchant: cleanMerchant,
      description: description.trim() || `Операция по карте (${CATEGORIES[resolvedCategory].shortName})`,
      amount: numericAmount,
      type: resolvedCategory === 'income' ? 'income' : txType,
      mcc,
      categoryId: resolvedCategory,
      mlConfidence: manualCategoryOverride === 'auto' ? livePrediction.confidence : 1.0,
      mlMatchedFeatures: livePrediction.matchedFeatures,
      bankSource: isOffline ? 'Офлайн-буфер' : 'Ручной ввод / ML',
      syncStatus: isOffline ? 'pending_sync' : 'synced',
      checksum,
      userCorrected: manualCategoryOverride !== 'auto',
    };

    onAddTransaction(newTx);
    setMerchant('');
    setDescription('');
    setAmount('');
    setManualCategoryOverride('auto');
    setAiPrediction(null);
  };

  const handleFillSample = (sample: {
    merchant: string;
    description: string;
    amount: string;
    mcc: string;
  }) => {
    setMerchant(sample.merchant);
    setDescription(sample.description);
    setAmount(sample.amount);
    setMcc(sample.mcc);
    setTxType('expense');
    setManualCategoryOverride('auto');
    setAiPrediction(null);
    setFormError(null);
  };

  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      if (selectedCategoryFilter !== 'all' && t.categoryId !== selectedCategoryFilter) {
        return false;
      }
      if (selectedMonthFilter !== 'all' && !t.date.startsWith(selectedMonthFilter)) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchMerchant = t.merchant.toLowerCase().includes(q);
        const matchDesc = t.description.toLowerCase().includes(q);
        const matchCat = CATEGORIES[t.categoryId].name.toLowerCase().includes(q);
        const matchMcc = t.mcc.includes(q);
        return matchMerchant || matchDesc || matchCat || matchMcc;
      }
      return true;
    });
  }, [transactions, selectedCategoryFilter, selectedMonthFilter, searchQuery]);

  const handleExportCsv = () => {
    const headers = ['ID', 'Дата', 'Мерчант', 'Описание', 'MCC', 'Категория', 'Сумма_RUB', 'Тип', 'Точность_ML', 'Статус_синхронизации', 'Checksum'];
    const rows = filteredTransactions.map((t) => [
      t.id,
      t.date,
      `"${t.merchant.replace(/"/g, '""')}"`,
      `"${t.description.replace(/"/g, '""')}"`,
      t.mcc,
      `"${CATEGORIES[t.categoryId].name}"`,
      t.amount,
      t.type,
      Math.round(t.mlConfidence * 100) + '%',
      t.syncStatus,
      t.checksum,
    ]);
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `finpulse-transactions-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-8">
      {/* Section 1: ML Classification Workbench & Transaction Entry */}
      <section className="border border-slate-200 bg-white p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-6 border-b border-slate-200">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              Классификатор транзакций и добавление операции
            </h2>
            <p className="text-sm text-slate-600 mt-1">
              Алгоритм Multinomial Naive Bayes + TF-IDF анализирует морфологию описания и MCC-код в реальном времени. При смене категории в таблице модель дообучается автоматически.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 font-mono tabular-nums shrink-0">
            <span>Точность на корпусе: {(mlModel.validationAccuracy * 100).toFixed(1)}%</span>
            <span aria-hidden="true">·</span>
            <span>Словарь признаков: {Object.keys(mlModel.vocabulary).length}</span>
            <span aria-hidden="true">·</span>
            <span>Дообучений пользователем: {mlModel.userCorrectionsCount}</span>
          </div>
        </div>

        {/* Quick test presets */}
        <div className="py-4 border-b border-slate-100 flex flex-wrap items-center gap-2">
          <span className="text-xs text-slate-500 mr-1">Быстрые примеры для теста ML:</span>
          <button
            type="button"
            onClick={() =>
              handleFillSample({
                merchant: 'Перекрёсток Экспресс',
                description: 'Доставка продуктов молоко овощи хлеб',
                amount: '2450',
                mcc: '5411',
              })
            }
            className="px-2.5 py-1 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded transition-colors whitespace-nowrap shrink-0"
          >
            Перекрёсток (2 450 ₽)
          </button>
          <button
            type="button"
            onClick={() =>
              handleFillSample({
                merchant: 'Яндекс Go Такси',
                description: 'Поездка по городу в час пик тариф Комфорт',
                amount: '890',
                mcc: '4121',
              })
            }
            className="px-2.5 py-1 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded transition-colors whitespace-nowrap shrink-0"
          >
            Яндекс Go (890 ₽)
          </button>
          <button
            type="button"
            onClick={() =>
              handleFillSample({
                merchant: 'Аптека Ригла',
                description: 'Покупка витаминов и лекарственных препаратов',
                amount: '1760',
                mcc: '5912',
              })
            }
            className="px-2.5 py-1 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded transition-colors whitespace-nowrap shrink-0"
          >
            Аптека Ригла (1 760 ₽)
          </button>
          <button
            type="button"
            onClick={() =>
              handleFillSample({
                merchant: 'Аэрофлот Российские Авиалинии',
                description: 'Авиабилет Москва — Сочи эконом класс',
                amount: '14200',
                mcc: '3011',
              })
            }
            className="px-2.5 py-1 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded transition-colors whitespace-nowrap shrink-0"
          >
            Аэрофлот (14 200 ₽)
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-6">
          {/* Left: Form (7 cols) */}
          <form onSubmit={handleSubmitTransaction} className="lg:col-span-7 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="tx-merchant"
                  className="block text-xs font-semibold text-slate-700 mb-1.5"
                >
                  Мерчант / Контрагент
                </label>
                <input
                  id="tx-merchant"
                  type="text"
                  value={merchant}
                  onChange={(e) => {
                    setMerchant(e.target.value);
                    setAiPrediction(null);
                  }}
                  placeholder="Например: ВкусВилл, Лукойл, Ozon"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div>
                <label
                  htmlFor="tx-amount"
                  className="block text-xs font-semibold text-slate-700 mb-1.5"
                >
                  Сумма (₽)
                </label>
                <input
                  id="tx-amount"
                  type="number"
                  min="1"
                  step="any"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="2450"
                  className="w-full px-3 py-2 text-sm font-mono tabular-nums border border-slate-300 rounded bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <label
                  htmlFor="tx-description"
                  className="block text-xs font-semibold text-slate-700 mb-1.5"
                >
                  Назначение платежа / позиции чека
                </label>
                <input
                  id="tx-description"
                  type="text"
                  value={description}
                  onChange={(e) => {
                    setDescription(e.target.value);
                    setAiPrediction(null);
                  }}
                  placeholder="Доставка продуктов, оплата интернета, такси..."
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div>
                <label
                  htmlFor="tx-date"
                  className="block text-xs font-semibold text-slate-700 mb-1.5"
                >
                  Дата операции
                </label>
                <input
                  id="tx-date"
                  type="date"
                  value={txDate}
                  onChange={(e) => setTxDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm font-mono tabular-nums border border-slate-300 rounded bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label
                  htmlFor="tx-mcc"
                  className="block text-xs font-semibold text-slate-700 mb-1.5"
                >
                  Банковский MCC-код
                </label>
                <select
                  id="tx-mcc"
                  value={mcc}
                  onChange={(e) => {
                    setMcc(e.target.value);
                    setAiPrediction(null);
                  }}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                >
                  {PRESET_MCC_OPTIONS.map((opt) => (
                    <option key={opt.code} value={opt.code}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="tx-type"
                  className="block text-xs font-semibold text-slate-700 mb-1.5"
                >
                  Тип потока
                </label>
                <select
                  id="tx-type"
                  value={txType}
                  onChange={(e) => {
                    setTxType(e.target.value as 'expense' | 'income');
                    setAiPrediction(null);
                  }}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                >
                  <option value="expense">Расход (Списание)</option>
                  <option value="income">Доход (Поступление)</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="tx-category-override"
                  className="block text-xs font-semibold text-slate-700 mb-1.5"
                >
                  Категория (ML-авто или вручную)
                </label>
                <select
                  id="tx-category-override"
                  value={manualCategoryOverride}
                  onChange={(e) =>
                    setManualCategoryOverride(e.target.value as CategoryId | 'auto')
                  }
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                >
                  <option value="auto">
                    Авто: {CATEGORIES[livePrediction.categoryId].shortName}
                  </option>
                  {(Object.keys(CATEGORIES) as CategoryId[]).map((catId) => (
                    <option key={catId} value={catId}>
                      {CATEGORIES[catId].name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {formError && (
              <p role="alert" className="text-xs font-medium text-red-600">
                {formError}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                type="submit"
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded transition-colors whitespace-nowrap shrink-0"
              >
                <Plus className="w-4 h-4" />
                Добавить и классифицировать
              </button>

              <button
                type="button"
                onClick={handleRunServerAiCheck}
                disabled={isCallingAi}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-slate-700 border border-slate-300 bg-white hover:bg-slate-50 rounded transition-colors whitespace-nowrap shrink-0 disabled:opacity-50"
              >
                <Sparkles className="w-3.5 h-3.5" />
                {isCallingAi
                  ? 'Проверка через серверный ИИ...'
                  : 'Уточнить через гибридный контур Gemini'}
              </button>
            </div>
          </form>

          {/* Right: Live ML Telemetry & Probability Breakdown (5 cols) */}
          <div className="lg:col-span-5 border-t lg:border-t-0 lg:border-l border-slate-200 pt-6 lg:pt-0 lg:pl-8 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
                <span>Результат распознавания в реальном времени</span>
                <span className="font-mono tabular-nums">
                  {livePrediction.algorithm === 'gemini-hybrid-nb'
                    ? 'Gemini 3.8 + Naive Bayes'
                    : 'Naive Bayes + TF-IDF'}
                </span>
              </div>

              <div className="py-3 border-b border-slate-200">
                <div className="text-lg font-bold text-slate-900">
                  {CATEGORIES[livePrediction.categoryId].name}
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600 mt-1 font-mono tabular-nums">
                  <span>Уверенность модели: {(livePrediction.confidence * 100).toFixed(0)}%</span>
                  <span aria-hidden="true">·</span>
                  <span>
                    {livePrediction.matchedFeatures.length > 0
                      ? `Токены: ${livePrediction.matchedFeatures.join(', ')}`
                      : 'По базовым весам MCC'}
                  </span>
                </div>
              </div>

              <div className="mt-4 space-y-2.5">
                <div className="text-xs font-semibold text-slate-700">
                  Распределение вероятностей по топ-4 гипотезам:
                </div>
                {topCandidateProbabilities.map(([catId, prob]) => {
                  const pct = Math.round(prob * 100);
                  return (
                    <div key={catId} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-700 font-medium">
                          {CATEGORIES[catId].name}
                        </span>
                        <span className="font-mono tabular-nums text-slate-600">
                          {pct}%
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-slate-900 transition-transform duration-150 origin-left"
                          style={{
                            transform: `scaleX(${Math.max(0.03, Math.min(1, prob))})`,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mt-6 pt-3 border-t border-slate-100 text-xs text-slate-500">
              Контрольная сумма (FNV-1a):{' '}
              <span className="font-mono tabular-nums text-slate-700">
                {generateDeterministicChecksum({
                  date: txDate,
                  merchant: merchant || 'demo',
                  amount: Number(amount) || 0,
                  mcc,
                })}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Section 2: Filterable Ledger & Active Learning Table */}
      <section className="border border-slate-200 bg-white">
        <div className="p-6 border-b border-slate-200 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Реестр транзакций и интерактивное дообучение ({filteredTransactions.length})
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Измените категорию любой строки в выпадающем списке — ML-модель мгновенно пересчитает веса токенов и MCC-кодов.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Search input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="search"
                aria-label="Поиск по мерчанту, описанию или MCC"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Поиск по мерчанту или MCC..."
                className="pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 w-56"
              />
            </div>

            {/* Month selector */}
            <select
              aria-label="Фильтр по месяцу"
              value={selectedMonthFilter}
              onChange={(e) => setSelectedMonthFilter(e.target.value)}
              className="px-3 py-1.5 text-xs border border-slate-300 rounded bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900"
            >
              <option value="all">Все месяцы (Авг — Окт 2026)</option>
              <option value="2026-10">Октябрь 2026</option>
              <option value="2026-09">Сентябрь 2026</option>
              <option value="2026-08">Август 2026</option>
            </select>

            <button
              type="button"
              onClick={handleExportCsv}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 border border-slate-300 rounded hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              Экспорт CSV
            </button>
          </div>
        </div>

        {/* Interactive Category Filter Bar (functional buttons) */}
        <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 flex items-center gap-1.5 overflow-x-auto">
          <button
            type="button"
            onClick={() => setSelectedCategoryFilter('all')}
            className={`px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
              selectedCategoryFilter === 'all'
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            Все категории ({transactions.length})
          </button>
          {EXPENSE_CATEGORY_IDS.map((catId) => (
            <button
              key={catId}
              type="button"
              onClick={() => setSelectedCategoryFilter(catId)}
              className={`px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
                selectedCategoryFilter === catId
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              {CATEGORIES[catId].shortName}
            </button>
          ))}
        </div>

        {/* High-density table */}
        {filteredTransactions.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-sm font-medium text-slate-800">
              По заданным параметрам фильтрации транзакции не найдены
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Сбросьте поисковый запрос или выберите «Все категории», чтобы увидеть полный реестр операций.
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setSelectedCategoryFilter('all');
                setSelectedMonthFilter('all');
              }}
              className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-slate-900 rounded hover:bg-slate-800 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Сбросить фильтры
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-xs font-semibold text-slate-600 bg-slate-50/60">
                  <th className="py-3 px-4 whitespace-nowrap">Дата</th>
                  <th className="py-3 px-4">Мерчант и назначение</th>
                  <th className="py-3 px-4 whitespace-nowrap">Банк и синхронизация</th>
                  <th className="py-3 px-4 whitespace-nowrap">ML-признаки и уверенность</th>
                  <th className="py-3 px-4 whitespace-nowrap">Категория (дообучение ML)</th>
                  <th className="py-3 px-4 text-right whitespace-nowrap">Сумма (₽)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm">
                {filteredTransactions.map((tx) => (
                  <tr
                    key={tx.id}
                    className="hover:bg-slate-50/80 transition-colors"
                  >
                    <td className="py-2.5 px-4 font-mono tabular-nums text-xs text-slate-600 whitespace-nowrap">
                      {tx.date}
                    </td>
                    <td className="py-2.5 px-4">
                      <div className="font-semibold text-slate-900">{tx.merchant}</div>
                      <div className="text-xs text-slate-500 truncate max-w-md">
                        {tx.description}
                      </div>
                    </td>
                    <td className="py-2.5 px-4 text-xs text-slate-600 whitespace-nowrap">
                      <span>{tx.bankSource}</span>
                      <span aria-hidden="true" className="mx-1.5">
                        ·
                      </span>
                      <span
                        className={
                          tx.syncStatus === 'pending_sync'
                            ? 'text-amber-700 font-medium'
                            : 'text-slate-500'
                        }
                      >
                        {tx.syncStatus === 'pending_sync'
                          ? 'Ожидает синхронизации'
                          : 'Синхронизировано'}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-xs text-slate-600 font-mono tabular-nums whitespace-nowrap">
                      <span>MCC {tx.mcc}</span>
                      <span aria-hidden="true" className="mx-1.5">
                        ·
                      </span>
                      <span>
                        {tx.userCorrected
                          ? 'Подтверждено (100%)'
                          : `${Math.round(tx.mlConfidence * 100)}% точность`}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 whitespace-nowrap">
                      <select
                        aria-label={`Изменить категорию для ${tx.merchant}`}
                        value={tx.categoryId}
                        onChange={(e) =>
                          onUpdateCategory(tx.id, e.target.value as CategoryId)
                        }
                        className="px-2.5 py-1 text-xs font-medium border border-slate-300 rounded bg-white text-slate-900 hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900"
                      >
                        {(Object.keys(CATEGORIES) as CategoryId[]).map((catId) => (
                          <option key={catId} value={catId}>
                            {CATEGORIES[catId].shortName}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td
                      className={`py-2.5 px-4 text-right font-mono tabular-nums font-semibold whitespace-nowrap ${
                        tx.type === 'income' || tx.categoryId === 'income'
                          ? 'text-emerald-700'
                          : 'text-slate-900'
                      }`}
                    >
                      {tx.type === 'income' || tx.categoryId === 'income' ? '+' : '−'}
                      {tx.amount.toLocaleString('ru-RU')} ₽
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};
