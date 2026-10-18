import React, { useState } from 'react';
import {
  CATEGORIES,
  classifyTransactionML,
  generateDeterministicChecksum,
  type BankConnector,
  type MLModelState,
  type OfflineQueueItem,
  type Transaction,
} from '../lib/financeSkill';
import {
  RefreshCw,
  Wifi,
  WifiOff,
  ShieldCheck,
  Plus,
  CheckCircle2,
  Link2,
} from 'lucide-react';

interface BankOfflineSyncViewProps {
  connectors: BankConnector[];
  offlineQueue: OfflineQueueItem[];
  isOffline: boolean;
  mlModel: MLModelState;
  onToggleOffline: (nextOffline: boolean) => void;
  onSyncBankProvider: (providerId: string) => Promise<void>;
  onToggleBankConnection: (providerId: string) => void;
  onFlushOfflineQueue: () => void;
  onAddOfflineDemoTransaction: (tx: Transaction) => void;
}

export const BankOfflineSyncView: React.FC<BankOfflineSyncViewProps> = ({
  connectors,
  offlineQueue,
  isOffline,
  mlModel,
  onToggleOffline,
  onSyncBankProvider,
  onToggleBankConnection,
  onFlushOfflineQueue,
  onAddOfflineDemoTransaction,
}) => {
  const [syncingBankId, setSyncingBankId] = useState<string | null>(null);
  const [lastSyncBanner, setLastSyncBanner] = useState<string | null>(null);

  const pendingItems = offlineQueue.filter((q) => q.status === 'queued');

  const handleBankPull = async (bank: BankConnector) => {
    if (isOffline) {
      setLastSyncBanner(
        'Офлайн-режим активен: прямой запрос к банковскому шлюзу отложен. Переключитесь в онлайн-режим для опроса API.'
      );
      return;
    }
    setSyncingBankId(bank.id);
    setLastSyncBanner(null);
    try {
      await onSyncBankProvider(bank.id);
      setLastSyncBanner(
        `Выписка из «${bank.bankName}» успешно загружена по защищённому каналу (${bank.encryptionStandard}) и размечена ML-классификатором.`
      );
    } finally {
      setSyncingBankId(null);
    }
  };

  const handleCreateOfflineSample = () => {
    const sampleMerchant = 'Яндекс Лавка (Офлайн-чек)';
    const sampleDesc = 'Покупка фермерского молока, хлеба и фруктов без сети';
    const sampleAmount = 1690;
    const sampleMcc = '5499';
    const pred = classifyTransactionML(mlModel, {
      merchant: sampleMerchant,
      description: sampleDesc,
      mcc: sampleMcc,
      amount: sampleAmount,
      type: 'expense',
    });

    const tx: Transaction = {
      id: `tx-offline-${Date.now()}`,
      date: '2026-10-17',
      merchant: sampleMerchant,
      description: sampleDesc,
      amount: sampleAmount,
      type: 'expense',
      mcc: sampleMcc,
      categoryId: pred.categoryId,
      mlConfidence: pred.confidence,
      mlMatchedFeatures: pred.matchedFeatures,
      bankSource: 'Офлайн-кэш (IndexedQueue)',
      syncStatus: 'pending_sync',
      checksum: generateDeterministicChecksum({
        date: '2026-10-17',
        merchant: sampleMerchant,
        amount: sampleAmount,
        mcc: sampleMcc,
      }),
    };

    onAddOfflineDemoTransaction(tx);
    setLastSyncBanner(
      `Транзакция «${sampleMerchant}» (1 690 ₽) сохранена в локальное офлайн-хранилище с контрольной суммой ${tx.checksum}.`
    );
  };

  const handleFlushQueueClick = () => {
    const count = pendingItems.length;
    onFlushOfflineQueue();
    setLastSyncBanner(
      count > 0
        ? `Синхронизация завершена: ${count} опер. из офлайн-очереди верифицированы по контрольным суммам FNV-1a и перенесены в основной реестр.`
        : 'Очередь синхронизации пуста — все локальные записи уже синхронизированы.'
    );
  };

  return (
    <div className="space-y-8">
      {/* Section 1: Offline Mode & Deferred Synchronization Engine */}
      <section className="border border-slate-200 bg-white p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-6 border-b border-slate-200">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              Режим работы офлайн и очередь идемпотентной синхронизации
            </h2>
            <p className="text-sm text-slate-600 mt-1">
              При потере связи скилл классифицирует расходы локальной моделью Naive Bayes, сохраняет операции в локальном хранилище (localStorage) и синхронизирует их без дубликатов по отпечатку FNV-1a.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            {/* Segmented Mode Control */}
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded">
              <button
                type="button"
                onClick={() => onToggleOffline(false)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
                  !isOffline
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Wifi className="w-3.5 h-3.5" />
                Онлайн-режим
              </button>
              <button
                type="button"
                onClick={() => onToggleOffline(true)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
                  isOffline
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <WifiOff className="w-3.5 h-3.5" />
                Офлайн-режим
              </button>
            </div>

            <button
              type="button"
              onClick={handleCreateOfflineSample}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-800 border border-slate-300 rounded hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              Записать офлайн-операцию
            </button>

            <button
              type="button"
              onClick={handleFlushQueueClick}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Синхронизировать очередь ({pendingItems.length})
            </button>
          </div>
        </div>

        {lastSyncBanner && (
          <div
            role="status"
            className="mt-4 p-3.5 border border-slate-200 bg-slate-50 rounded flex items-center gap-2.5 text-xs text-slate-800"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
            <span>{lastSyncBanner}</span>
          </div>
        )}

        {/* Offline Queue Table */}
        <div className="pt-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold text-slate-700">
              Журнал локальной очереди синхронизации (Всего записей: {offlineQueue.length} · Ожидает отправки: {pendingItems.length})
            </h3>
            <span className="text-xs font-mono tabular-nums text-slate-500">
              Хранилище: localStorage / FNV-1a 32-bit
            </span>
          </div>

          {offlineQueue.length === 0 ? (
            <div className="p-6 border border-slate-200 bg-slate-50/50 rounded text-center">
              <p className="text-xs font-medium text-slate-700">
                Очередь офлайн-операций пуста
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Переключитесь в «Офлайн-режим» или нажмите «Записать офлайн-операцию», чтобы проверить буферизацию и последующую синхронизацию данных.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto border border-slate-200 rounded">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-xs font-semibold text-slate-600 bg-slate-50">
                    <th className="py-2.5 px-4 whitespace-nowrap">Время записи</th>
                    <th className="py-2.5 px-4 whitespace-nowrap">Тип события</th>
                    <th className="py-2.5 px-4">Детали операции</th>
                    <th className="py-2.5 px-4 whitespace-nowrap">Контрольная сумма</th>
                    <th className="py-2.5 px-4 whitespace-nowrap">Статус</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-xs">
                  {offlineQueue.map((item) => (
                    <tr key={item.queueId} className="hover:bg-slate-50/70">
                      <td className="py-2.5 px-4 font-mono tabular-nums text-slate-600 whitespace-nowrap">
                        {item.createdAt.slice(0, 19).replace('T', ' ')}
                      </td>
                      <td className="py-2.5 px-4 font-mono text-slate-800 whitespace-nowrap">
                        {item.actionType}
                      </td>
                      <td className="py-2.5 px-4 text-slate-700">
                        {item.payload.transaction ? (
                          <span>
                            {item.payload.transaction.merchant} —{' '}
                            <strong className="font-mono tabular-nums">
                              {item.payload.transaction.amount.toLocaleString('ru-RU')} ₽
                            </strong>{' '}
                            ({CATEGORIES[item.payload.transaction.categoryId].shortName})
                          </span>
                        ) : item.payload.newCategoryId ? (
                          <span>
                            Перекатегоризация ID {item.payload.transactionId} →{' '}
                            {CATEGORIES[item.payload.newCategoryId].name}
                          </span>
                        ) : (
                          <span>Обновление бюджетного правила</span>
                        )}
                      </td>
                      <td className="py-2.5 px-4 font-mono tabular-nums text-slate-500 whitespace-nowrap">
                        {item.checksum}
                      </td>
                      <td className="py-2.5 px-4 whitespace-nowrap">
                        <span
                          className={
                            item.status === 'queued'
                              ? 'text-amber-700 font-semibold'
                              : 'text-emerald-700 font-medium'
                          }
                        >
                          {item.status === 'queued'
                            ? 'В очереди (офлайн)'
                            : 'Синхронизировано'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {/* Section 2: Open Banking API Integrations */}
      <section className="border border-slate-200 bg-white">
        <div className="p-6 border-b border-slate-200 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900">
              Интеграция с банковскими API (Open Banking / ISO 20022)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Безопасное получение банковских выписок по протоколам OAuth 2.1 + mTLS и FAPI 2.0 с автоматической потоковой ML-классификацией.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-600 font-mono shrink-0">
            <ShieldCheck className="w-4 h-4 text-emerald-700" />
            <span>Шифрование канала: TLS 1.3 / AES-256-GCM</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-xs font-semibold text-slate-600 bg-slate-50/60">
                <th className="py-3 px-4">Банковский провайдер и счёт</th>
                <th className="py-3 px-4">Протокол безопасности и шифрование</th>
                <th className="py-3 px-4 whitespace-nowrap">Статус шлюза</th>
                <th className="py-3 px-4 text-right whitespace-nowrap">Импортировано</th>
                <th className="py-3 px-4 text-right whitespace-nowrap">Действия API</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-sm">
              {connectors.map((bank) => {
                const isSyncing = syncingBankId === bank.id;
                const isConnected = bank.status === 'connected';

                return (
                  <tr key={bank.id} className="hover:bg-slate-50/70">
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-900">
                        {bank.bankName}
                      </div>
                      <div className="text-xs text-slate-500 font-mono tabular-nums mt-0.5">
                        Счёт: {bank.accountMasked} · Синхр.: {bank.lastSyncAt}
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="text-xs font-medium text-slate-800">
                        {bank.protocol}
                      </div>
                      <div className="text-xs text-slate-500 font-mono mt-0.5">
                        {bank.encryptionStandard}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap text-xs">
                      <span
                        className={
                          isConnected
                            ? 'text-emerald-700 font-semibold'
                            : 'text-slate-500 font-medium'
                        }
                      >
                        {isConnected ? 'Подключён (Активен)' : 'Отключён'}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right font-mono tabular-nums text-xs text-slate-700 whitespace-nowrap">
                      {bank.importedCount} опер.
                    </td>

                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => onToggleBankConnection(bank.id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-700 border border-slate-300 rounded hover:bg-slate-100 transition-colors whitespace-nowrap shrink-0"
                        >
                          <Link2 className="w-3.5 h-3.5" />
                          {isConnected ? 'Отключить' : 'Подключить OAuth'}
                        </button>

                        <button
                          type="button"
                          disabled={!isConnected || isSyncing}
                          onClick={() => handleBankPull(bank)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 rounded hover:bg-slate-800 disabled:opacity-40 transition-colors whitespace-nowrap shrink-0"
                        >
                          <RefreshCw
                            className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`}
                          />
                          {isSyncing ? 'Запрос API...' : 'Загрузить выписку API'}
                        </button>
                      </div>
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
