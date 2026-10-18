import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createInitialMLModel,
  classifyTransactionML,
  retrainModelWithSample,
  generateMonthlyReport,
  evaluateBudgets,
  synchronizeOfflineQueue,
  generateDeterministicChecksum,
  INITIAL_TRANSACTIONS,
  INITIAL_BUDGETS,
  type OfflineQueueItem,
  type Transaction,
} from './financeSkill.ts';

test('ML classifier accurately categorizes Russian merchants and MCC codes', () => {
  const model = createInitialMLModel();

  const groceryPred = classifyTransactionML(model, {
    merchant: 'Перекрёсток Супермаркет',
    description: 'Покупка продуктов молоко хлеб',
    mcc: '5411',
    type: 'expense',
  });
  assert.equal(groceryPred.categoryId, 'groceries');
  assert.ok(groceryPred.confidence >= 0.75);

  const taxiPred = classifyTransactionML(model, {
    merchant: 'Яндекс Go Такси',
    description: 'Поездка по городу',
    mcc: '4121',
    type: 'expense',
  });
  assert.equal(taxiPred.categoryId, 'transport');
  assert.ok(taxiPred.confidence >= 0.75);

  const medicalPred = classifyTransactionML(model, {
    merchant: 'Инвитро Диагностика',
    description: 'Лабораторные анализы крови',
    mcc: '8011',
    type: 'expense',
  });
  assert.equal(medicalPred.categoryId, 'health');

  const incomePred = classifyTransactionML(model, {
    merchant: 'ООО ТехноЛаб',
    description: 'Зачисление заработной платы аванс',
    mcc: '0000',
    type: 'income',
  });
  assert.equal(incomePred.categoryId, 'income');
});

test('Online ML retraining shifts prediction for custom merchant descriptions', () => {
  const initialModel = createInitialMLModel();

  const customMerchant = {
    merchant: 'Термальный Комплекс Оазис',
    description: 'Посещение велнес центра и бассейна',
    mcc: '7999',
    amount: 4200,
  };

  const retrainedModel = retrainModelWithSample(initialModel, {
    text: `${customMerchant.merchant} ${customMerchant.description}`,
    mcc: customMerchant.mcc,
    amount: customMerchant.amount,
    categoryId: 'health',
  });

  const afterPred = classifyTransactionML(retrainedModel, {
    merchant: customMerchant.merchant,
    description: customMerchant.description,
    mcc: customMerchant.mcc,
    type: 'expense',
  });

  assert.equal(afterPred.categoryId, 'health');
  assert.equal(retrainedModel.userCorrectionsCount, 1);
  assert.ok(afterPred.confidence >= 0.65);
});

test('Monthly report aggregator computes accurate totals, category shares, and MoM delta', () => {
  const octReport = generateMonthlyReport(INITIAL_TRANSACTIONS, '2026-10');

  assert.equal(octReport.month, '2026-10');
  assert.equal(octReport.totalIncome, 165000);
  assert.ok(octReport.totalExpense > 0);
  assert.equal(octReport.netCashflow, octReport.totalIncome - octReport.totalExpense);
  assert.ok(octReport.previousMonthExpense > 0);
  assert.notEqual(octReport.momExpenseDeltaPercent, null);

  const shareSum = octReport.categoryBreakdown.reduce(
    (acc, item) => acc + item.sharePercent,
    0
  );
  assert.ok(Math.abs(shareSum - 100) <= 1.0);
});

test('Budget evaluation engine detects exceeded and warning thresholds accurately', () => {
  // In INITIAL_TRANSACTIONS for 2026-10, restaurants spend is 5400 + 6850 + 3420 = 15670 RUB,
  // while INITIAL_BUDGETS limit for restaurants is 15000 RUB -> should be 'exceeded'
  const evaluations = evaluateBudgets(INITIAL_TRANSACTIONS, INITIAL_BUDGETS, '2026-10');

  const restaurantEval = evaluations.find((e) => e.categoryId === 'restaurants');
  assert.ok(restaurantEval);
  assert.equal(restaurantEval.spent, 15670);
  assert.equal(restaurantEval.limit, 15000);
  assert.equal(restaurantEval.status, 'exceeded');
  assert.equal(restaurantEval.overage, 670);
  assert.ok(restaurantEval.alertMessage && restaurantEval.alertMessage.includes('Превышен лимит'));

  // Groceries spend in 2026-10 is 4680 + 7890 + 9240 + 6420 = 28230 RUB out of 35000 RUB (80.7%) -> 'warning'
  const groceriesEval = evaluations.find((e) => e.categoryId === 'groceries');
  assert.ok(groceriesEval);
  assert.equal(groceriesEval.spent, 28230);
  assert.equal(groceriesEval.status, 'warning');
});

test('Offline synchronization merges queued transactions and deduplicates checksum collisions', () => {
  const model = createInitialMLModel();
  const offlineTx: Transaction = {
    id: 'tx-offline-001',
    date: '2026-10-17',
    merchant: 'Аптека Горздрав',
    description: 'Покупка медикаментов офлайн',
    amount: 1350,
    type: 'expense',
    mcc: '5912',
    categoryId: 'health',
    mlConfidence: 0.94,
    mlMatchedFeatures: ['MCC:5912', 'аптека'],
    bankSource: 'Офлайн-кэш',
    syncStatus: 'pending_sync',
    checksum: generateDeterministicChecksum({
      date: '2026-10-17',
      merchant: 'Аптека Горздрав',
      amount: 1350,
      mcc: '5912',
    }),
  };

  const queue: OfflineQueueItem[] = [
    {
      queueId: 'q-1',
      createdAt: '2026-10-17T14:00:00Z',
      actionType: 'CREATE_TRANSACTION',
      payload: { transaction: offlineTx },
      checksum: offlineTx.checksum,
      status: 'queued',
    },
    // Duplicate checksum entry to verify deduplication
    {
      queueId: 'q-2',
      createdAt: '2026-10-17T14:01:00Z',
      actionType: 'CREATE_TRANSACTION',
      payload: { transaction: { ...offlineTx, id: 'tx-offline-002' } },
      checksum: offlineTx.checksum,
      status: 'queued',
    },
  ];

  const syncResult = synchronizeOfflineQueue(
    INITIAL_TRANSACTIONS,
    INITIAL_BUDGETS,
    queue,
    model
  );

  assert.equal(syncResult.syncedCount, 2);
  assert.equal(syncResult.deduplicatedCount, 1);
  assert.equal(syncResult.transactions.length, INITIAL_TRANSACTIONS.length + 1);
  assert.equal(syncResult.transactions[0].syncStatus, 'synced');
});
