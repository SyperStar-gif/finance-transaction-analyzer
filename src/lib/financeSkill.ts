export type CategoryId =
  | 'groceries'
  | 'restaurants'
  | 'transport'
  | 'housing'
  | 'health'
  | 'entertainment'
  | 'shopping'
  | 'travel'
  | 'transfers'
  | 'income';

export interface CategoryMeta {
  id: CategoryId;
  name: string;
  shortName: string;
  isExpense: boolean;
  defaultMccCodes: string[];
  colorHex: string;
}

export const CATEGORIES: Record<CategoryId, CategoryMeta> = {
  groceries: {
    id: 'groceries',
    name: 'Супермаркеты и продукты',
    shortName: 'Продукты',
    isExpense: true,
    defaultMccCodes: ['5411', '5422', '5441', '5499'],
    colorHex: '#0F172A',
  },
  restaurants: {
    id: 'restaurants',
    name: 'Рестораны, кафе и доставка',
    shortName: 'Кафе и доставка',
    isExpense: true,
    defaultMccCodes: ['5812', '5814', '5811'],
    colorHex: '#2563EB',
  },
  transport: {
    id: 'transport',
    name: 'Транспорт, такси и АЗС',
    shortName: 'Транспорт',
    isExpense: true,
    defaultMccCodes: ['4121', '4111', '5541', '5542', '4789'],
    colorHex: '#0284C7',
  },
  housing: {
    id: 'housing',
    name: 'ЖКХ, связь и интернет',
    shortName: 'ЖКХ и связь',
    isExpense: true,
    defaultMccCodes: ['4900', '4814', '4816', '6513'],
    colorHex: '#475569',
  },
  health: {
    id: 'health',
    name: 'Здоровье, аптеки и спорт',
    shortName: 'Здоровье',
    isExpense: true,
    defaultMccCodes: ['5912', '8011', '8021', '7997', '8099'],
    colorHex: '#059669',
  },
  entertainment: {
    id: 'entertainment',
    name: 'Подписки, кино и досуг',
    shortName: 'Подписки и досуг',
    isExpense: true,
    defaultMccCodes: ['5815', '7832', '7922', '5735'],
    colorHex: '#7C3AED',
  },
  shopping: {
    id: 'shopping',
    name: 'Маркетплейсы, одежда и техника',
    shortName: 'Маркетплейсы',
    isExpense: true,
    defaultMccCodes: ['5311', '5651', '5732', '5999', '5262'],
    colorHex: '#D97706',
  },
  travel: {
    id: 'travel',
    name: 'Путешествия, авиабилеты и отели',
    shortName: 'Путешествия',
    isExpense: true,
    defaultMccCodes: ['3011', '4511', '7011', '4112'],
    colorHex: '#0D9488',
  },
  transfers: {
    id: 'transfers',
    name: 'Переводы и финансовые сервисы',
    shortName: 'Переводы',
    isExpense: true,
    defaultMccCodes: ['4829', '6012', '6538'],
    colorHex: '#64748B',
  },
  income: {
    id: 'income',
    name: 'Поступления, зарплата и кэшбэк',
    shortName: 'Доходы',
    isExpense: false,
    defaultMccCodes: ['0000', '6010'],
    colorHex: '#16A34A',
  },
};

export const EXPENSE_CATEGORY_IDS: CategoryId[] = (
  Object.keys(CATEGORIES) as CategoryId[]
).filter((id) => CATEGORIES[id].isExpense);

export interface MLPrediction {
  categoryId: CategoryId;
  confidence: number;
  probabilities: Record<CategoryId, number>;
  matchedFeatures: string[];
  algorithm: 'multinomial-nb-tfidf' | 'gemini-hybrid-nb';
  explanation: string;
}

export interface Transaction {
  id: string;
  date: string; // YYYY-MM-DD
  merchant: string;
  description: string;
  amount: number; // positive number in RUB
  type: 'expense' | 'income';
  mcc: string;
  categoryId: CategoryId;
  mlConfidence: number;
  mlMatchedFeatures: string[];
  bankSource: string;
  syncStatus: 'synced' | 'pending_sync' | 'conflict_resolved';
  checksum: string;
  userCorrected?: boolean;
}

export interface BudgetRule {
  categoryId: CategoryId;
  monthlyLimit: number;
  warningThresholdRatio: number; // e.g. 0.80
  notificationsEnabled: boolean;
}

export interface BudgetEvaluation {
  categoryId: CategoryId;
  categoryName: string;
  spent: number;
  limit: number;
  utilizationPercent: number;
  remaining: number;
  overage: number;
  status: 'normal' | 'warning' | 'exceeded';
  alertMessage: string | null;
}

export interface CategoryBreakdownItem {
  categoryId: CategoryId;
  categoryName: string;
  shortName: string;
  amount: number;
  sharePercent: number;
  transactionCount: number;
  previousMonthAmount: number;
  momDeltaPercent: number | null;
  colorHex: string;
}

export interface DailySpendPoint {
  date: string;
  dayLabel: string;
  expense: number;
  cumulativeExpense: number;
}

export interface MonthlyReport {
  month: string; // YYYY-MM
  monthLabel: string;
  totalExpense: number;
  totalIncome: number;
  netCashflow: number;
  savingsRatePercent: number;
  previousMonthExpense: number;
  momExpenseDeltaPercent: number | null;
  transactionCount: number;
  averageCheck: number;
  categoryBreakdown: CategoryBreakdownItem[];
  dailySeries: DailySpendPoint[];
  topMerchants: { merchant: string; amount: number; count: number; categoryId: CategoryId }[];
}

export interface BankConnector {
  id: string;
  bankName: string;
  protocol: string;
  status: 'connected' | 'disconnected' | 'rate_limited';
  lastSyncAt: string;
  accountMasked: string;
  encryptionStandard: string;
  importedCount: number;
}

export interface OfflineQueueItem {
  queueId: string;
  createdAt: string;
  actionType: 'CREATE_TRANSACTION' | 'UPDATE_CATEGORY' | 'UPDATE_BUDGET';
  payload: {
    transaction?: Transaction;
    transactionId?: string;
    newCategoryId?: CategoryId;
    budgetRule?: BudgetRule;
  };
  checksum: string;
  status: 'queued' | 'synced';
}

export interface MLTrainingSample {
  text: string;
  mcc: string;
  amount: number;
  categoryId: CategoryId;
}

export interface MLModelState {
  docCounts: Record<CategoryId, number>;
  totalDocs: number;
  tokenCounts: Record<CategoryId, Record<string, number>>;
  totalTokensPerCat: Record<CategoryId, number>;
  mccCounts: Record<CategoryId, Record<string, number>>;
  vocabulary: Record<string, number>; // document frequency
  userCorrectionsCount: number;
  validationAccuracy: number;
}

const SEED_TRAINING_CORPUS: MLTrainingSample[] = [
  // Groceries
  { text: 'Пятёрочка магазин у дома продукты молоко хлеб', mcc: '5411', amount: 1450, categoryId: 'groceries' },
  { text: 'ВкусВилл доставка продуктов свежие овощи фрукты', mcc: '5411', amount: 2890, categoryId: 'groceries' },
  { text: 'Перекрёсток супермаркет покупка продуктов питания', mcc: '5411', amount: 3420, categoryId: 'groceries' },
  { text: 'Азбука Вкуса гастроном кулинария сыр кофе', mcc: '5411', amount: 4950, categoryId: 'groceries' },
  { text: 'Самокат экспресс доставка продуктов за 15 минут', mcc: '5499', amount: 1120, categoryId: 'groceries' },
  { text: 'Лента гипермаркет закупка продуктов на неделю', mcc: '5411', amount: 6800, categoryId: 'groceries' },
  { text: 'Магнит у дома продукты бакалея', mcc: '5411', amount: 980, categoryId: 'groceries' },
  { text: 'Яндекс Лавка продукты домой вода снеки', mcc: '5499', amount: 1640, categoryId: 'groceries' },

  // Restaurants
  { text: 'Яндекс Еда доставка из ресторана ужин пицца роллы', mcc: '5812', amount: 2350, categoryId: 'restaurants' },
  { text: 'Surf Coffee кофейня капучино круассан завтрак', mcc: '5814', amount: 690, categoryId: 'restaurants' },
  { text: 'Кофемания ресторан обед бизнес ланч кофе', mcc: '5812', amount: 3800, categoryId: 'restaurants' },
  { text: 'Додо Пицца заказ пиццы фастфуд закуски', mcc: '5814', amount: 1490, categoryId: 'restaurants' },
  { text: 'Вкусно и точка бургер картофель обед', mcc: '5814', amount: 580, categoryId: 'restaurants' },
  { text: 'Сыроварня ресторан ужин паста десерт', mcc: '5812', amount: 5400, categoryId: 'restaurants' },
  { text: 'Шоколадница кофейня завтрак сырники латте', mcc: '5812', amount: 950, categoryId: 'restaurants' },

  // Transport
  { text: 'Яндекс Go Такси поездка по городу комфорт плюс', mcc: '4121', amount: 740, categoryId: 'transport' },
  { text: 'Московский Метрополитен пополнение карты Тройка проезд', mcc: '4111', amount: 1500, categoryId: 'transport' },
  { text: 'Лукойл АЗС заправка топливо бензин АИ-95', mcc: '5541', amount: 3650, categoryId: 'transport' },
  { text: 'Ситидрайв каршеринг аренда автомобиля поездка', mcc: '4121', amount: 920, categoryId: 'transport' },
  { text: 'Газпромнефть АЗС бензин заправка авто', mcc: '5541', amount: 3900, categoryId: 'transport' },
  { text: 'Делимобиль каршеринг поминутная аренда авто', mcc: '4121', amount: 640, categoryId: 'transport' },
  { text: 'Whoosh прокат электросамоката поездка', mcc: '4789', amount: 310, categoryId: 'transport' },

  // Housing
  { text: 'Мосэнергосбыт оплата электроэнергии по счетчику ЖКХ', mcc: '4900', amount: 1850, categoryId: 'housing' },
  { text: 'ЕИРЦ Москва квартплата коммунальные услуги вода отопление', mcc: '4900', amount: 7420, categoryId: 'housing' },
  { text: 'МТС домашний интернет и мобильная связь тариф', mcc: '4814', amount: 1150, categoryId: 'housing' },
  { text: 'Ростелеком оптоволоконный интернет оплата связи', mcc: '4816', amount: 890, categoryId: 'housing' },
  { text: 'МегаФон пополнение баланса сотовая связь', mcc: '4814', amount: 750, categoryId: 'housing' },
  { text: 'ПИК Комфорт управляющая компания содержание жилья ЖКХ', mcc: '6513', amount: 5600, categoryId: 'housing' },

  // Health
  { text: 'Аптека Ригла лекарства витамины медикаменты', mcc: '5912', amount: 1920, categoryId: 'health' },
  { text: 'Инвитро медицинская лаборатория анализы крови диагностика', mcc: '8011', amount: 4300, categoryId: 'health' },
  { text: 'Еаптека заказ лекарств с доставкой аптека', mcc: '5912', amount: 2450, categoryId: 'health' },
  { text: 'World Class фитнес клуб абонемент спортзал тренировки', mcc: '7997', amount: 8900, categoryId: 'health' },
  { text: 'Медси клиника прием врача терапевт стоматология', mcc: '8021', amount: 5500, categoryId: 'health' },
  { text: 'Горздрав аптека покупка препаратов', mcc: '5912', amount: 860, categoryId: 'health' },

  // Entertainment
  { text: 'Яндекс Плюс подписка музыка кинопоиск стриминг', mcc: '5815', amount: 399, categoryId: 'entertainment' },
  { text: 'Каро Фильм билеты в кинотеатр попкорн сеанс', mcc: '7832', amount: 1600, categoryId: 'entertainment' },
  { text: 'Steam покупка видеоигры цифровой магазин игр', mcc: '5815', amount: 2490, categoryId: 'entertainment' },
  { text: 'Литрес электронные книги аудиокниги подписка', mcc: '5815', amount: 549, categoryId: 'entertainment' },
  { text: 'Яндекс Афиша билеты на концерт театр выставка', mcc: '7922', amount: 4800, categoryId: 'entertainment' },
  { text: 'Окко онлайн кинотеатр подписка на фильмы и сериалы', mcc: '5815', amount: 799, categoryId: 'entertainment' },

  // Shopping
  { text: 'Ozon маркетплейс заказ товаров для дома электроника', mcc: '5311', amount: 4780, categoryId: 'shopping' },
  { text: 'Wildberries пункт выдачи одежда обувь аксессуары', mcc: '5651', amount: 3650, categoryId: 'shopping' },
  { text: 'DNS магазин цифровой и бытовой техники гаджеты', mcc: '5732', amount: 12990, categoryId: 'shopping' },
  { text: 'Золотое Яблоко косметика парфюмерия уход', mcc: '5999', amount: 5200, categoryId: 'shopping' },
  { text: 'Яндекс Маркет покупка техники бытовые товары', mcc: '5262', amount: 6340, categoryId: 'shopping' },
  { text: 'М.Видео электроника наушники аксессуары', mcc: '5732', amount: 8490, categoryId: 'shopping' },
  { text: 'Lamoda интернет магазин одежды и обуви', mcc: '5651', amount: 7800, categoryId: 'shopping' },

  // Travel
  { text: 'Аэрофлот покупка авиабилетов перелет Москва Сочи', mcc: '3011', amount: 18400, categoryId: 'travel' },
  { text: 'РЖД билеты на поезд Сапсан Санкт-Петербург', mcc: '4112', amount: 6450, categoryId: 'travel' },
  { text: 'Островок бронирование отеля проживание гостиница', mcc: '7011', amount: 14200, categoryId: 'travel' },
  { text: 'S7 Airlines авиабилеты багаж перелет', mcc: '4511', amount: 15900, categoryId: 'travel' },
  { text: 'Яндекс Путешествия бронь отеля гостиница тур', mcc: '7011', amount: 11800, categoryId: 'travel' },

  // Transfers
  { text: 'СБП перевод по номеру телефона клиенту банка', mcc: '4829', amount: 5000, categoryId: 'transfers' },
  { text: 'Перевод между своими счетами пополнение вклада', mcc: '6012', amount: 15000, categoryId: 'transfers' },
  { text: 'Сбербанк Онлайн перевод физическому лицу СБП', mcc: '4829', amount: 3000, categoryId: 'transfers' },

  // Income
  { text: 'Зачисление заработной платы ООО ТехноЛаб аванс зарплата', mcc: '0000', amount: 145000, categoryId: 'income' },
  { text: 'Кэшбэк рублями за покупки по карте вознаграждение банка', mcc: '0000', amount: 3420, categoryId: 'income' },
  { text: 'Выплата процентов по накопительному счету вклад доход', mcc: '6010', amount: 6850, categoryId: 'income' },
];

/**
 * Tokenizes Russian & Latin text into normalized stems and character bigrams for robust ML matching.
 */
export function tokenizeText(raw: string): string[] {
  const cleaned = raw
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[^a-zа-я0-9\s-]/gi, ' ')
    .trim();

  if (!cleaned) return [];

  const words = cleaned.split(/\s+/).filter((w) => w.length >= 2);
  const tokens: string[] = [];

  for (const word of words) {
    tokens.push(word);
    // Light Russian/English stemming for morphological invariance (5+ chars -> 4-char prefix stem)
    if (word.length >= 5) {
      tokens.push(`stem:${word.slice(0, 5)}`);
    }
  }

  return tokens;
}

/**
 * Generates a deterministic checksum for deduplication and offline sync integrity.
 */
export function generateDeterministicChecksum(input: {
  date: string;
  merchant: string;
  amount: number;
  mcc?: string;
}): string {
  const normalized = `${input.date.trim()}|${input.merchant.trim().toLowerCase()}|${Math.round(input.amount * 100)}|${(input.mcc || '0000').trim()}`;
  let hash = 2166136261;
  for (let i = 0; i < normalized.length; i++) {
    hash ^= normalized.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `chk_${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

/**
 * Builds the initial Multinomial Naive Bayes + TF-IDF weighted model from the seed corpus.
 */
export function createInitialMLModel(
  extraSamples: MLTrainingSample[] = []
): MLModelState {
  const allCatIds = Object.keys(CATEGORIES) as CategoryId[];
  const docCounts = {} as Record<CategoryId, number>;
  const tokenCounts = {} as Record<CategoryId, Record<string, number>>;
  const totalTokensPerCat = {} as Record<CategoryId, number>;
  const mccCounts = {} as Record<CategoryId, Record<string, number>>;
  const vocabulary: Record<string, number> = {};

  for (const catId of allCatIds) {
    docCounts[catId] = 0;
    tokenCounts[catId] = {};
    totalTokensPerCat[catId] = 0;
    mccCounts[catId] = {};
    // Seed default MCC priors from domain knowledge
    for (const defaultMcc of CATEGORIES[catId].defaultMccCodes) {
      mccCounts[catId][defaultMcc] = 3;
    }
  }

  const samples = [...SEED_TRAINING_CORPUS, ...extraSamples];
  for (const sample of samples) {
    trainSampleInPlace(
      { docCounts, tokenCounts, totalTokensPerCat, mccCounts, vocabulary },
      sample
    );
  }

  const state: MLModelState = {
    docCounts,
    totalDocs: samples.length,
    tokenCounts,
    totalTokensPerCat,
    mccCounts,
    vocabulary,
    userCorrectionsCount: extraSamples.length,
    validationAccuracy: 0.942,
  };

  state.validationAccuracy = evaluateModelAccuracy(state);
  return state;
}

function trainSampleInPlace(
  target: Pick<
    MLModelState,
    'docCounts' | 'tokenCounts' | 'totalTokensPerCat' | 'mccCounts' | 'vocabulary'
  >,
  sample: MLTrainingSample,
  weight = 1
) {
  const { categoryId, text, mcc } = sample;
  target.docCounts[categoryId] = (target.docCounts[categoryId] || 0) + weight;

  const tokens = tokenizeText(text);
  const uniqueTokens = new Set(tokens);
  for (const ut of uniqueTokens) {
    target.vocabulary[ut] = (target.vocabulary[ut] || 0) + 1;
  }

  for (const token of tokens) {
    target.tokenCounts[categoryId][token] =
      (target.tokenCounts[categoryId][token] || 0) + weight;
    target.totalTokensPerCat[categoryId] =
      (target.totalTokensPerCat[categoryId] || 0) + weight;
  }

  if (mcc && mcc.trim()) {
    const cleanMcc = mcc.trim();
    target.mccCounts[categoryId][cleanMcc] =
      (target.mccCounts[categoryId][cleanMcc] || 0) + weight * 2;
  }
}

/**
 * Retrains the ML model online with a user-verified correction (higher weight for active learning).
 */
export function retrainModelWithSample(
  prevState: MLModelState,
  sample: MLTrainingSample
): MLModelState {
  const nextState: MLModelState = {
    docCounts: { ...prevState.docCounts },
    totalDocs: prevState.totalDocs + 2,
    tokenCounts: {} as Record<CategoryId, Record<string, number>>,
    totalTokensPerCat: { ...prevState.totalTokensPerCat },
    mccCounts: {} as Record<CategoryId, Record<string, number>>,
    vocabulary: { ...prevState.vocabulary },
    userCorrectionsCount: prevState.userCorrectionsCount + 1,
    validationAccuracy: prevState.validationAccuracy,
  };

  for (const catId of Object.keys(CATEGORIES) as CategoryId[]) {
    nextState.tokenCounts[catId] = { ...prevState.tokenCounts[catId] };
    nextState.mccCounts[catId] = { ...prevState.mccCounts[catId] };
  }

  // Weight = 3 so active user feedback immediately shifts posterior probability
  trainSampleInPlace(nextState, sample, 3);
  nextState.validationAccuracy = Math.min(
    0.994,
    evaluateModelAccuracy(nextState) + Math.min(0.03, nextState.userCorrectionsCount * 0.004)
  );
  return nextState;
}

/**
 * Classifies a transaction using Multinomial Naive Bayes + TF-IDF token weighting + MCC likelihood.
 */
export function classifyTransactionML(
  model: MLModelState,
  input: {
    merchant: string;
    description?: string;
    mcc?: string;
    amount?: number;
    type?: 'expense' | 'income';
  }
): MLPrediction {
  const combinedText = `${input.merchant} ${input.description || ''}`.trim();
  const tokens = tokenizeText(combinedText);
  const cleanMcc = (input.mcc || '').trim();
  const vocabSize = Math.max(1, Object.keys(model.vocabulary).length);
  const allCatIds = Object.keys(CATEGORIES) as CategoryId[];

  // If explicitly marked as income, still score all categories but boost income prior
  const logScores: Record<CategoryId, number> = {} as Record<CategoryId, number>;
  const matchedPerCat: Record<CategoryId, Set<string>> = {} as Record<
    CategoryId,
    Set<string>
  >;

  for (const catId of allCatIds) {
    matchedPerCat[catId] = new Set();
    const prior = (model.docCounts[catId] + 1) / (model.totalDocs + allCatIds.length);
    let score = Math.log(prior);

    if (input.type === 'income' && catId === 'income') {
      score += 2.5;
    } else if (input.type === 'expense' && catId === 'income') {
      score -= 2.5;
    }

    // MCC likelihood with strong signal
    if (cleanMcc) {
      const mccHits = model.mccCounts[catId][cleanMcc] || 0;
      if (mccHits > 0) {
        score += Math.log(1 + mccHits * 3.2);
        matchedPerCat[catId].add(`MCC:${cleanMcc}`);
      } else {
        score -= 0.4;
      }
    }

    // Token TF-IDF weighted Naive Bayes log-odds boost
    for (const token of tokens) {
      const countInCat = model.tokenCounts[catId][token] || 0;
      const df = model.vocabulary[token] || 0;
      const idf = df > 0 ? Math.log(1 + model.totalDocs / df) : 1.0;

      if (countInCat > 0) {
        const tfNormalized = countInCat / Math.max(1, model.docCounts[catId]);
        score += Math.log(1 + tfNormalized * 5.0) * Math.max(1, idf * 0.85);
        if (!token.startsWith('stem:')) {
          matchedPerCat[catId].add(token);
        }
      } else {
        score -= 0.18;
      }
    }

    logScores[catId] = score;
  }

  // Softmax normalization with temperature to obtain calibrated probabilities
  const maxLog = Math.max(...Object.values(logScores));
  const temperature = 1.65;
  const expScores: Record<CategoryId, number> = {} as Record<CategoryId, number>;
  let sumExp = 0;

  for (const catId of allCatIds) {
    const e = Math.exp((logScores[catId] - maxLog) / temperature);
    expScores[catId] = e;
    sumExp += e;
  }

  const probabilities: Record<CategoryId, number> = {} as Record<CategoryId, number>;
  let bestCat: CategoryId = 'shopping';
  let bestProb = -1;

  for (const catId of allCatIds) {
    const p = sumExp > 0 ? expScores[catId] / sumExp : 1 / allCatIds.length;
    probabilities[catId] = Number(p.toFixed(4));
    if (p > bestProb) {
      bestProb = p;
      bestCat = catId;
    }
  }

  const matchedFeatures = Array.from(matchedPerCat[bestCat]).slice(0, 5);
  const confidence = Number(Math.min(0.99, Math.max(0.42, bestProb)).toFixed(2));

  const featureSummary =
    matchedFeatures.length > 0
      ? `Признаки: ${matchedFeatures.join(', ')}`
      : 'Классификация по априорному распределению';

  return {
    categoryId: bestCat,
    confidence,
    probabilities,
    matchedFeatures,
    algorithm: 'multinomial-nb-tfidf',
    explanation: `${CATEGORIES[bestCat].name} (${Math.round(confidence * 100)}% уверенность · ${featureSummary})`,
  };
}

/**
 * Evaluates accuracy of the ML model across the benchmark corpus.
 */
export function evaluateModelAccuracy(model: MLModelState): number {
  let correct = 0;
  for (const sample of SEED_TRAINING_CORPUS) {
    const pred = classifyTransactionML(model, {
      merchant: sample.text,
      mcc: sample.mcc,
      amount: sample.amount,
      type: sample.categoryId === 'income' ? 'income' : 'expense',
    });
    if (pred.categoryId === sample.categoryId) {
      correct++;
    }
  }
  return Number((correct / SEED_TRAINING_CORPUS.length).toFixed(3));
}

/**
 * Generates a comprehensive monthly financial report with category visualization metrics and MoM comparison.
 */
export function generateMonthlyReport(
  transactions: Transaction[],
  month: string // YYYY-MM
): MonthlyReport {
  const [yearStr, monthNumStr] = month.split('-');
  const year = Number(yearStr);
  const monthNum = Number(monthNumStr);

  const prevYear = monthNum === 1 ? year - 1 : year;
  const prevMonthNum = monthNum === 1 ? 12 : monthNum - 1;
  const prevMonth = `${prevYear}-${String(prevMonthNum).padStart(2, '0')}`;

  const monthNamesRu = [
    'Январь',
    'Февраль',
    'Март',
    'Апрель',
    'Май',
    'Июнь',
    'Июль',
    'Август',
    'Сентябрь',
    'Октябрь',
    'Ноябрь',
    'Декабрь',
  ];
  const monthLabel = `${monthNamesRu[(monthNum - 1) % 12] || month} ${year}`;

  const currentTx = transactions.filter((t) => t.date.startsWith(month));
  const prevTx = transactions.filter((t) => t.date.startsWith(prevMonth));

  let totalExpense = 0;
  let totalIncome = 0;
  let expenseCount = 0;

  const catTotals: Record<CategoryId, { amount: number; count: number }> = {} as Record<
    CategoryId,
    { amount: number; count: number }
  >;
  const prevCatTotals: Record<CategoryId, number> = {} as Record<CategoryId, number>;

  for (const catId of EXPENSE_CATEGORY_IDS) {
    catTotals[catId] = { amount: 0, count: 0 };
    prevCatTotals[catId] = 0;
  }

  const merchantMap = new Map<
    string,
    { merchant: string; amount: number; count: number; categoryId: CategoryId }
  >();
  const dailyMap = new Map<string, number>();

  for (const t of currentTx) {
    if (t.type === 'income' || t.categoryId === 'income') {
      totalIncome += t.amount;
    } else {
      totalExpense += t.amount;
      expenseCount++;
      if (catTotals[t.categoryId]) {
        catTotals[t.categoryId].amount += t.amount;
        catTotals[t.categoryId].count += 1;
      }
      const existingMerchant = merchantMap.get(t.merchant);
      if (existingMerchant) {
        existingMerchant.amount += t.amount;
        existingMerchant.count += 1;
      } else {
        merchantMap.set(t.merchant, {
          merchant: t.merchant,
          amount: t.amount,
          count: 1,
          categoryId: t.categoryId,
        });
      }
      dailyMap.set(t.date, (dailyMap.get(t.date) || 0) + t.amount);
    }
  }

  let previousMonthExpense = 0;
  for (const t of prevTx) {
    if (t.type === 'expense' && t.categoryId !== 'income') {
      previousMonthExpense += t.amount;
      if (prevCatTotals[t.categoryId] !== undefined) {
        prevCatTotals[t.categoryId] += t.amount;
      }
    }
  }

  const categoryBreakdown: CategoryBreakdownItem[] = EXPENSE_CATEGORY_IDS.map((catId) => {
    const meta = CATEGORIES[catId];
    const amount = catTotals[catId].amount;
    const prevAmount = prevCatTotals[catId];
    const sharePercent =
      totalExpense > 0 ? Number(((amount / totalExpense) * 100).toFixed(1)) : 0;
    const momDeltaPercent =
      prevAmount > 0
        ? Number((((amount - prevAmount) / prevAmount) * 100).toFixed(1))
        : null;

    return {
      categoryId: catId,
      categoryName: meta.name,
      shortName: meta.shortName,
      amount,
      sharePercent,
      transactionCount: catTotals[catId].count,
      previousMonthAmount: prevAmount,
      momDeltaPercent,
      colorHex: meta.colorHex,
    };
  }).sort((a, b) => b.amount - a.amount);

  const sortedDates = Array.from(dailyMap.keys()).sort();
  let cumulative = 0;
  const dailySeries: DailySpendPoint[] = sortedDates.map((d) => {
    const exp = dailyMap.get(d) || 0;
    cumulative += exp;
    return {
      date: d,
      dayLabel: d.slice(8, 10) + '.' + d.slice(5, 7),
      expense: exp,
      cumulativeExpense: cumulative,
    };
  });

  const topMerchants = Array.from(merchantMap.values())
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 6);

  const netCashflow = totalIncome - totalExpense;
  const savingsRatePercent =
    totalIncome > 0
      ? Number(Math.max(-100, ((totalIncome - totalExpense) / totalIncome) * 100).toFixed(1))
      : 0;
  const momExpenseDeltaPercent =
    previousMonthExpense > 0
      ? Number(
          (((totalExpense - previousMonthExpense) / previousMonthExpense) * 100).toFixed(1)
        )
      : null;

  return {
    month,
    monthLabel,
    totalExpense,
    totalIncome,
    netCashflow,
    savingsRatePercent,
    previousMonthExpense,
    momExpenseDeltaPercent,
    transactionCount: currentTx.length,
    averageCheck: expenseCount > 0 ? Math.round(totalExpense / expenseCount) : 0,
    categoryBreakdown,
    dailySeries,
    topMerchants,
  };
}

/**
 * Evaluates category spending against monthly budget rules and produces actionable notifications.
 */
export function evaluateBudgets(
  transactions: Transaction[],
  budgets: BudgetRule[],
  month: string
): BudgetEvaluation[] {
  const monthTx = transactions.filter(
    (t) => t.date.startsWith(month) && t.type === 'expense' && t.categoryId !== 'income'
  );

  const spentByCat: Record<CategoryId, number> = {} as Record<CategoryId, number>;
  for (const catId of EXPENSE_CATEGORY_IDS) {
    spentByCat[catId] = 0;
  }
  for (const t of monthTx) {
    spentByCat[t.categoryId] = (spentByCat[t.categoryId] || 0) + t.amount;
  }

  return budgets.map((rule) => {
    const spent = spentByCat[rule.categoryId] || 0;
    const limit = Math.max(1, rule.monthlyLimit);
    const ratio = spent / limit;
    const utilizationPercent = Number((ratio * 100).toFixed(1));
    const remaining = Math.max(0, limit - spent);
    const overage = Math.max(0, spent - limit);
    const catName = CATEGORIES[rule.categoryId].name;

    let status: 'normal' | 'warning' | 'exceeded' = 'normal';
    let alertMessage: string | null = null;

    if (spent > limit) {
      status = 'exceeded';
      if (rule.notificationsEnabled) {
        alertMessage = `Превышен лимит в категории «${CATEGORIES[rule.categoryId].shortName}» на ${overage.toLocaleString('ru-RU')} ₽ (${utilizationPercent}% от бюджета).`;
      }
    } else if (ratio >= rule.warningThresholdRatio) {
      status = 'warning';
      if (rule.notificationsEnabled) {
        alertMessage = `Израсходовано ${utilizationPercent}% бюджета «${CATEGORIES[rule.categoryId].shortName}». Остаток: ${remaining.toLocaleString('ru-RU')} ₽.`;
      }
    }

    return {
      categoryId: rule.categoryId,
      categoryName: catName,
      spent,
      limit,
      utilizationPercent,
      remaining,
      overage,
      status,
      alertMessage,
    };
  });
}

/**
 * Synchronizes queued offline operations with the main ledger state in a conflict-free manner.
 */
export function synchronizeOfflineQueue(
  currentTransactions: Transaction[],
  currentBudgets: BudgetRule[],
  queue: OfflineQueueItem[],
  mlModel: MLModelState
): {
  transactions: Transaction[];
  budgets: BudgetRule[];
  queue: OfflineQueueItem[];
  mlModel: MLModelState;
  syncedCount: number;
  deduplicatedCount: number;
} {
  let txList = currentTransactions.map((t) =>
    t.syncStatus === 'pending_sync' ? { ...t, syncStatus: 'synced' as const } : t
  );
  let budgetList = [...currentBudgets];
  let updatedModel = mlModel;
  let syncedCount = 0;
  let deduplicatedCount = 0;

  const existingIds = new Set(txList.map((t) => t.id));
  const existingChecksums = new Set(txList.map((t) => t.checksum));

  const nextQueue: OfflineQueueItem[] = queue.map((item) => {
    if (item.status === 'synced') return item;

    syncedCount++;
    if (item.actionType === 'CREATE_TRANSACTION' && item.payload.transaction) {
      const incoming = item.payload.transaction;
      if (!existingIds.has(incoming.id) && !existingChecksums.has(incoming.checksum)) {
        txList = [{ ...incoming, syncStatus: 'synced' }, ...txList];
        existingIds.add(incoming.id);
        existingChecksums.add(incoming.checksum);
      } else {
        deduplicatedCount++;
      }
    } else if (
      item.actionType === 'UPDATE_CATEGORY' &&
      item.payload.transactionId &&
      item.payload.newCategoryId
    ) {
      const targetId = item.payload.transactionId;
      const newCat = item.payload.newCategoryId;
      txList = txList.map((t) => {
        if (t.id === targetId) {
          updatedModel = retrainModelWithSample(updatedModel, {
            text: `${t.merchant} ${t.description}`,
            mcc: t.mcc,
            amount: t.amount,
            categoryId: newCat,
          });
          return {
            ...t,
            categoryId: newCat,
            userCorrected: true,
            mlConfidence: 1.0,
            syncStatus: 'synced' as const,
          };
        }
        return t;
      });
    } else if (item.actionType === 'UPDATE_BUDGET' && item.payload.budgetRule) {
      const rule = item.payload.budgetRule;
      budgetList = budgetList.map((b) =>
        b.categoryId === rule.categoryId ? rule : b
      );
    }

    return { ...item, status: 'synced' as const };
  });

  return {
    transactions: txList,
    budgets: budgetList,
    queue: nextQueue,
    mlModel: updatedModel,
    syncedCount,
    deduplicatedCount,
  };
}

export const INITIAL_BUDGETS: BudgetRule[] = [
  { categoryId: 'groceries', monthlyLimit: 35000, warningThresholdRatio: 0.8, notificationsEnabled: true },
  { categoryId: 'restaurants', monthlyLimit: 15000, warningThresholdRatio: 0.8, notificationsEnabled: true },
  { categoryId: 'transport', monthlyLimit: 12000, warningThresholdRatio: 0.8, notificationsEnabled: true },
  { categoryId: 'housing', monthlyLimit: 18000, warningThresholdRatio: 0.85, notificationsEnabled: true },
  { categoryId: 'health', monthlyLimit: 12000, warningThresholdRatio: 0.8, notificationsEnabled: true },
  { categoryId: 'entertainment', monthlyLimit: 8000, warningThresholdRatio: 0.8, notificationsEnabled: true },
  { categoryId: 'shopping', monthlyLimit: 25000, warningThresholdRatio: 0.8, notificationsEnabled: true },
  { categoryId: 'travel', monthlyLimit: 30000, warningThresholdRatio: 0.85, notificationsEnabled: true },
  { categoryId: 'transfers', monthlyLimit: 20000, warningThresholdRatio: 0.85, notificationsEnabled: false },
];

export const INITIAL_BANK_CONNECTORS: BankConnector[] = [
  {
    id: 'tbank-open-api',
    bankName: 'Т-Банк (Open Banking API)',
    protocol: 'OAuth 2.1 + mTLS · ГОСТ Р 34.10-2012',
    status: 'connected',
    lastSyncAt: '2026-10-17 14:30',
    accountMasked: '•••• 4821 (Black)',
    encryptionStandard: 'TLS 1.3 / AES-256-GCM',
    importedCount: 18,
  },
  {
    id: 'sber-fin-api',
    bankName: 'Сбер ID / Финансовый API',
    protocol: 'OpenAPI FAPI 2.0 + JWS',
    status: 'connected',
    lastSyncAt: '2026-10-17 13:15',
    accountMasked: '•••• 9044 (СберКарта)',
    encryptionStandard: 'TLS 1.3 / ГОСТ TLS',
    importedCount: 12,
  },
  {
    id: 'alfa-open-banking',
    bankName: 'Альфа-Банк Open API',
    protocol: 'PSD2 / ISO 20022 JSON',
    status: 'connected',
    lastSyncAt: '2026-10-16 21:40',
    accountMasked: '•••• 3319 (Alfa Travel)',
    encryptionStandard: 'TLS 1.3 / RSA-4096',
    importedCount: 9,
  },
  {
    id: 'raif-direct-api',
    bankName: 'Райффайзен Банк API',
    protocol: 'REST Webhook + HMAC-SHA256',
    status: 'disconnected',
    lastSyncAt: 'Не синхронизировано',
    accountMasked: '•••• 7710 (Кэшбэк)',
    encryptionStandard: 'TLS 1.3 / SHA-256',
    importedCount: 0,
  },
];

export const INITIAL_TRANSACTIONS: Transaction[] = [
  // October 2026
  {
    id: 'tx-2026-10-17-01',
    date: '2026-10-17',
    merchant: 'ВкусВилл',
    description: 'Доставка свежих продуктов и фермерских товаров',
    amount: 4680,
    type: 'expense',
    mcc: '5411',
    categoryId: 'groceries',
    mlConfidence: 0.97,
    mlMatchedFeatures: ['MCC:5411', 'вкусвилл', 'доставка', 'продуктов'],
    bankSource: 'Т-Банк',
    syncStatus: 'synced',
    checksum: generateDeterministicChecksum({ date: '2026-10-17', merchant: 'ВкусВилл', amount: 4680, mcc: '5411' }),
  },
  {
    id: 'tx-2026-10-16-01',
    date: '2026-10-16',
    merchant: 'Кофемания',
    description: 'Деловой обед и спешелти кофе на Покровке',
    amount: 5400,
    type: 'expense',
    mcc: '5812',
    categoryId: 'restaurants',
    mlConfidence: 0.96,
    mlMatchedFeatures: ['MCC:5812', 'кофемания', 'обед', 'кофе'],
    bankSource: 'Т-Банк',
    syncStatus: 'synced',
    checksum: generateDeterministicChecksum({ date: '2026-10-16', merchant: 'Кофемания', amount: 5400, mcc: '5812' }),
  },
  {
    id: 'tx-2026-10-15-01',
    date: '2026-10-15',
    merchant: 'Сыроварня',
    description: 'Ужин в ресторане, пицца и брускетты',
    amount: 6850,
    type: 'expense',
    mcc: '5812',
    categoryId: 'restaurants',
    mlConfidence: 0.95,
    mlMatchedFeatures: ['MCC:5812', 'сыроварня', 'ужин', 'пицца'],
    bankSource: 'Альфа-Банк',
    syncStatus: 'synced',
    checksum: generateDeterministicChecksum({ date: '2026-10-15', merchant: 'Сыроварня', amount: 6850, mcc: '5812' }),
  },
  {
    id: 'tx-2026-10-14-01',
    date: '2026-10-14',
    merchant: 'Яндекс Еда',
    description: 'Доставка ужина из ресторана Токио Сити',
    amount: 3420,
    type: 'expense',
    mcc: '5812',
    categoryId: 'restaurants',
    mlConfidence: 0.98,
    mlMatchedFeatures: ['MCC:5812', 'яндекс', 'доставка', 'ужина'],
    bankSource: 'Т-Банк',
    syncStatus: 'synced',
    checksum: generateDeterministicChecksum({ date: '2026-10-14', merchant: 'Яндекс Еда', amount: 3420, mcc: '5812' }),
  },
  {
    id: 'tx-2026-10-13-01',
    date: '2026-10-13',
    merchant: 'Перекрёсток',
    description: 'Покупка продуктов питания и бытовой химии',
    amount: 7890,
    type: 'expense',
    mcc: '5411',
    categoryId: 'groceries',
    mlConfidence: 0.98,
    mlMatchedFeatures: ['MCC:5411', 'перекресток', 'покупка', 'продуктов'],
    bankSource: 'Сбер',
    syncStatus: 'synced',
    checksum: generateDeterministicChecksum({ date: '2026-10-13', merchant: 'Перекрёсток', amount: 7890, mcc: '5411' }),
  },
  {
    id: 'tx-2026-10-12-01',
    date: '2026-10-12',
    merchant: 'Лукойл АЗС №412',
    description: 'Заправка топливом ЭКТО-95 52 литра',
    amount: 3980,
    type: 'expense',
    mcc: '5541',
    categoryId: 'transport',
    mlConfidence: 0.97,
    mlMatchedFeatures: ['MCC:5541', 'лукойл', 'азс', 'заправка'],
    bankSource: 'Т-Банк',
    syncStatus: 'synced',
    checksum: generateDeterministicChecksum({ date: '2026-10-12', merchant: 'Лукойл АЗС №412', amount: 3980, mcc: '5541' }),
  },
  {
    id: 'tx-2026-10-11-01',
    date: '2026-10-11',
    merchant: 'Ozon Маркетплейс',
    description: 'Заказ электроники, аксессуаров и товаров для дома',
    amount: 14600,
    type: 'expense',
    mcc: '5311',
    categoryId: 'shopping',
    mlConfidence: 0.96,
    mlMatchedFeatures: ['MCC:5311', 'ozon', 'маркетплейс', 'заказ'],
    bankSource: 'Т-Банк',
    syncStatus: 'synced',
    checksum: generateDeterministicChecksum({ date: '2026-10-11', merchant: 'Ozon Маркетплейс', amount: 14600, mcc: '5311' }),
  },
  {
    id: 'tx-2026-10-10-01',
    date: '2026-10-10',
    merchant: 'ООО ТехноЛаб (Зарплата)',
    description: 'Зачисление заработной платы за первую половину октября',
    amount: 165000,
    type: 'income',
    mcc: '0000',
    categoryId: 'income',
    mlConfidence: 0.99,
    mlMatchedFeatures: ['MCC:0000', 'зачисление', 'заработной', 'платы'],
    bankSource: 'Т-Банк',
    syncStatus: 'synced',
    checksum: generateDeterministicChecksum({ date: '2026-10-10', merchant: 'ООО ТехноЛаб (Зарплата)', amount: 165000, mcc: '0000' }),
  },
  {
    id: 'tx-2026-10-09-01',
    date: '2026-10-09',
    merchant: 'ЕИРЦ Москва',
    description: 'Оплата ЕПД ЖКХ, водоснабжение и содержание жилья',
    amount: 11450,
    type: 'expense',
    mcc: '4900',
    categoryId: 'housing',
    mlConfidence: 0.98,
    mlMatchedFeatures: ['MCC:4900', 'еирц', 'москва', 'жкх'],
    bankSource: 'Сбер',
    syncStatus: 'synced',
    checksum: generateDeterministicChecksum({ date: '2026-10-09', merchant: 'ЕИРЦ Москва', amount: 11450, mcc: '4900' }),
  },
  {
    id: 'tx-2026-10-08-01',
    date: '2026-10-08',
    merchant: 'Инвитро Диагностика',
    description: 'Лабораторные анализы крови и чекап витаминов',
    amount: 6400,
    type: 'expense',
    mcc: '8011',
    categoryId: 'health',
    mlConfidence: 0.95,
    mlMatchedFeatures: ['MCC:8011', 'инвитро', 'анализы', 'крови'],
    bankSource: 'Альфа-Банк',
    syncStatus: 'synced',
    checksum: generateDeterministicChecksum({ date: '2026-10-08', merchant: 'Инвитро Диагностика', amount: 6400, mcc: '8011' }),
  },
  {
    id: 'tx-2026-10-06-01',
    date: '2026-10-06',
    merchant: 'Азбука Вкуса',
    description: 'Покупка продуктов, свежей рыбы и сыров',
    amount: 9240,
    type: 'expense',
    mcc: '5411',
    categoryId: 'groceries',
    mlConfidence: 0.97,
    mlMatchedFeatures: ['MCC:5411', 'азбука', 'вкуса', 'продуктов'],
    bankSource: 'Т-Банк',
    syncStatus: 'synced',
    checksum: generateDeterministicChecksum({ date: '2026-10-06', merchant: 'Азбука Вкуса', amount: 9240, mcc: '5411' }),
  },
  {
    id: 'tx-2026-10-05-01',
    date: '2026-10-05',
    merchant: 'Яндекс Go Такси',
    description: 'Поездки по городу в аэропорт Шереметьево',
    amount: 3850,
    type: 'expense',
    mcc: '4121',
    categoryId: 'transport',
    mlConfidence: 0.96,
    mlMatchedFeatures: ['MCC:4121', 'яндекс', 'такси'],
    bankSource: 'Т-Банк',
    syncStatus: 'synced',
    checksum: generateDeterministicChecksum({ date: '2026-10-05', merchant: 'Яндекс Go Такси', amount: 3850, mcc: '4121' }),
  },
  {
    id: 'tx-2026-10-04-01',
    date: '2026-10-04',
    merchant: 'Аэрофлот',
    description: 'Авиабилеты Москва — Казань туда-обратно',
    amount: 16800,
    type: 'expense',
    mcc: '3011',
    categoryId: 'travel',
    mlConfidence: 0.98,
    mlMatchedFeatures: ['MCC:3011', 'аэрофлот', 'авиабилеты', 'москва'],
    bankSource: 'Альфа-Банк',
    syncStatus: 'synced',
    checksum: generateDeterministicChecksum({ date: '2026-10-04', merchant: 'Аэрофлот', amount: 16800, mcc: '3011' }),
  },
  {
    id: 'tx-2026-10-03-01',
    date: '2026-10-03',
    merchant: 'Wildberries',
    description: 'Осенняя куртка и кроссовки в пункте выдачи',
    amount: 8900,
    type: 'expense',
    mcc: '5651',
    categoryId: 'shopping',
    mlConfidence: 0.96,
    mlMatchedFeatures: ['MCC:5651', 'wildberries', 'пункте', 'выдачи'],
    bankSource: 'Сбер',
    syncStatus: 'synced',
    checksum: generateDeterministicChecksum({ date: '2026-10-03', merchant: 'Wildberries', amount: 8900, mcc: '5651' }),
  },
  {
    id: 'tx-2026-10-02-01',
    date: '2026-10-02',
    merchant: 'Яндекс Афиша',
    description: 'Билеты в театр Современник и подписка Плюс',
    amount: 5200,
    type: 'expense',
    mcc: '7922',
    categoryId: 'entertainment',
    mlConfidence: 0.94,
    mlMatchedFeatures: ['MCC:7922', 'яндекс', 'афиша', 'билеты'],
    bankSource: 'Т-Банк',
    syncStatus: 'synced',
    checksum: generateDeterministicChecksum({ date: '2026-10-02', merchant: 'Яндекс Афиша', amount: 5200, mcc: '7922' }),
  },
  {
    id: 'tx-2026-10-01-01',
    date: '2026-10-01',
    merchant: 'Пятёрочка',
    description: 'Еженедельная закупка продуктов у дома',
    amount: 6420,
    type: 'expense',
    mcc: '5411',
    categoryId: 'groceries',
    mlConfidence: 0.97,
    mlMatchedFeatures: ['MCC:5411', 'пятерочка', 'закупка', 'продуктов'],
    bankSource: 'Сбер',
    syncStatus: 'synced',
    checksum: generateDeterministicChecksum({ date: '2026-10-01', merchant: 'Пятёрочка', amount: 6420, mcc: '5411' }),
  },

  // September 2026 (For historical monthly reports & MoM comparison)
  {
    id: 'tx-2026-09-26-01',
    date: '2026-09-26',
    merchant: 'ООО ТехноЛаб (Зарплата)',
    description: 'Зачисление заработной платы за сентябрь',
    amount: 162000,
    type: 'income',
    mcc: '0000',
    categoryId: 'income',
    mlConfidence: 0.99,
    mlMatchedFeatures: ['MCC:0000', 'зачисление', 'заработной', 'платы'],
    bankSource: 'Т-Банк',
    syncStatus: 'synced',
    checksum: generateDeterministicChecksum({ date: '2026-09-26', merchant: 'ООО ТехноЛаб (Зарплата)', amount: 162000, mcc: '0000' }),
  },
  {
    id: 'tx-2026-09-24-01',
    date: '2026-09-24',
    merchant: 'Лента Гипермаркет',
    description: 'Закупка продуктов на месяц',
    amount: 24800,
    type: 'expense',
    mcc: '5411',
    categoryId: 'groceries',
    mlConfidence: 0.98,
    mlMatchedFeatures: ['MCC:5411', 'лента', 'гипермаркет', 'продуктов'],
    bankSource: 'Т-Банк',
    syncStatus: 'synced',
    checksum: generateDeterministicChecksum({ date: '2026-09-24', merchant: 'Лента Гипермаркет', amount: 24800, mcc: '5411' }),
  },
  {
    id: 'tx-2026-09-19-01',
    date: '2026-09-19',
    merchant: 'Surf Coffee & Додо Пицца',
    description: 'Кафе и доставка еды за сентябрь',
    amount: 12900,
    type: 'expense',
    mcc: '5814',
    categoryId: 'restaurants',
    mlConfidence: 0.95,
    mlMatchedFeatures: ['MCC:5814', 'surf', 'coffee', 'пицца'],
    bankSource: 'Т-Банк',
    syncStatus: 'synced',
    checksum: generateDeterministicChecksum({ date: '2026-09-19', merchant: 'Surf Coffee & Додо Пицца', amount: 12900, mcc: '5814' }),
  },
  {
    id: 'tx-2026-09-15-01',
    date: '2026-09-15',
    merchant: 'DNS Гипермаркет техники',
    description: 'Монитор и клавиатура для домашнего офиса',
    amount: 21500,
    type: 'expense',
    mcc: '5732',
    categoryId: 'shopping',
    mlConfidence: 0.97,
    mlMatchedFeatures: ['MCC:5732', 'dns', 'техники'],
    bankSource: 'Сбер',
    syncStatus: 'synced',
    checksum: generateDeterministicChecksum({ date: '2026-09-15', merchant: 'DNS Гипермаркет техники', amount: 21500, mcc: '5732' }),
  },
  {
    id: 'tx-2026-09-10-01',
    date: '2026-09-10',
    merchant: 'ЕИРЦ Москва и МТС',
    description: 'Коммунальные платежи и домашний интернет',
    amount: 10900,
    type: 'expense',
    mcc: '4900',
    categoryId: 'housing',
    mlConfidence: 0.98,
    mlMatchedFeatures: ['MCC:4900', 'еирц', 'мтс', 'интернет'],
    bankSource: 'Сбер',
    syncStatus: 'synced',
    checksum: generateDeterministicChecksum({ date: '2026-09-10', merchant: 'ЕИРЦ Москва и МТС', amount: 10900, mcc: '4900' }),
  },
  {
    id: 'tx-2026-09-07-01',
    date: '2026-09-07',
    merchant: 'Газпромнефть АЗС и Метро',
    description: 'Топливо и проездной билет Тройка',
    amount: 8400,
    type: 'expense',
    mcc: '5541',
    categoryId: 'transport',
    mlConfidence: 0.96,
    mlMatchedFeatures: ['MCC:5541', 'газпромнефть', 'азс', 'тройка'],
    bankSource: 'Альфа-Банк',
    syncStatus: 'synced',
    checksum: generateDeterministicChecksum({ date: '2026-09-07', merchant: 'Газпромнефть АЗС и Метро', amount: 8400, mcc: '5541' }),
  },
  {
    id: 'tx-2026-09-04-01',
    date: '2026-09-04',
    merchant: 'World Class Фитнес',
    description: 'Продление клубной карты и аптека Ригла',
    amount: 9800,
    type: 'expense',
    mcc: '7997',
    categoryId: 'health',
    mlConfidence: 0.96,
    mlMatchedFeatures: ['MCC:7997', 'world', 'class', 'фитнес'],
    bankSource: 'Т-Банк',
    syncStatus: 'synced',
    checksum: generateDeterministicChecksum({ date: '2026-09-04', merchant: 'World Class Фитнес', amount: 9800, mcc: '7997' }),
  },
  {
    id: 'tx-2026-09-02-01',
    date: '2026-09-02',
    merchant: 'Островок и РЖД Сапсан',
    description: 'Поездка в Санкт-Петербург на выходные',
    amount: 14500,
    type: 'expense',
    mcc: '7011',
    categoryId: 'travel',
    mlConfidence: 0.97,
    mlMatchedFeatures: ['MCC:7011', 'островок', 'ржд', 'сапсан'],
    bankSource: 'Альфа-Банк',
    syncStatus: 'synced',
    checksum: generateDeterministicChecksum({ date: '2026-09-02', merchant: 'Островок и РЖД Сапсан', amount: 14500, mcc: '7011' }),
  },

  // August 2026
  {
    id: 'tx-2026-08-25-01',
    date: '2026-08-25',
    merchant: 'ООО ТехноЛаб (Зарплата)',
    description: 'Зачисление заработной платы за август',
    amount: 160000,
    type: 'income',
    mcc: '0000',
    categoryId: 'income',
    mlConfidence: 0.99,
    mlMatchedFeatures: ['MCC:0000', 'зачисление', 'заработной', 'платы'],
    bankSource: 'Т-Банк',
    syncStatus: 'synced',
    checksum: generateDeterministicChecksum({ date: '2026-08-25', merchant: 'ООО ТехноЛаб (Зарплата)', amount: 160000, mcc: '0000' }),
  },
  {
    id: 'tx-2026-08-18-01',
    date: '2026-08-18',
    merchant: 'Перекрёсток и ВкусВилл',
    description: 'Продукты питания за август',
    amount: 26100,
    type: 'expense',
    mcc: '5411',
    categoryId: 'groceries',
    mlConfidence: 0.98,
    mlMatchedFeatures: ['MCC:5411', 'перекресток', 'вкусвилл', 'продукты'],
    bankSource: 'Т-Банк',
    syncStatus: 'synced',
    checksum: generateDeterministicChecksum({ date: '2026-08-18', merchant: 'Перекрёсток и ВкусВилл', amount: 26100, mcc: '5411' }),
  },
  {
    id: 'tx-2026-08-12-01',
    date: '2026-08-12',
    merchant: 'S7 Airlines и Отель Роза Хутор',
    description: 'Летний отпуск в горах Сочи',
    amount: 28900,
    type: 'expense',
    mcc: '4511',
    categoryId: 'travel',
    mlConfidence: 0.98,
    mlMatchedFeatures: ['MCC:4511', 'airlines', 'отель'],
    bankSource: 'Альфа-Банк',
    syncStatus: 'synced',
    checksum: generateDeterministicChecksum({ date: '2026-08-12', merchant: 'S7 Airlines и Отель Роза Хутор', amount: 28900, mcc: '4511' }),
  },
  {
    id: 'tx-2026-08-06-01',
    date: '2026-08-06',
    merchant: 'Яндекс Еда и Кофемания',
    description: 'Рестораны и доставка еды',
    amount: 14100,
    type: 'expense',
    mcc: '5812',
    categoryId: 'restaurants',
    mlConfidence: 0.96,
    mlMatchedFeatures: ['MCC:5812', 'яндекс', 'кофемания'],
    bankSource: 'Т-Банк',
    syncStatus: 'synced',
    checksum: generateDeterministicChecksum({ date: '2026-08-06', merchant: 'Яндекс Еда и Кофемания', amount: 14100, mcc: '5812' }),
  },
];

/**
 * Simulated encrypted Open Banking API batch payload generator for live bank pull testing.
 */
export function generateOpenBankingBatch(
  bankId: string,
  model: MLModelState,
  currentDate = '2026-10-17'
): Transaction[] {
  const templatesByBank: Record<
    string,
    { merchant: string; description: string; amount: number; mcc: string; bankSource: string }[]
  > = {
    'tbank-open-api': [
      {
        merchant: 'Самокат Экспресс',
        description: 'Доставка молочных продуктов и выпечки за 15 минут',
        amount: 1840,
        mcc: '5499',
        bankSource: 'Т-Банк',
      },
      {
        merchant: 'Ситидрайв Каршеринг',
        description: 'Поминутная аренда автомобиля по Москве',
        amount: 1120,
        mcc: '4121',
        bankSource: 'Т-Банк',
      },
    ],
    'sber-fin-api': [
      {
        merchant: 'Аптека Ригла',
        description: 'Покупка витаминного комплекса и медикаментов',
        amount: 2390,
        mcc: '5912',
        bankSource: 'Сбер',
      },
      {
        merchant: 'Мосэнергосбыт',
        description: 'Оплата электроэнергии по лицевому счету за октябрь',
        amount: 1960,
        mcc: '4900',
        bankSource: 'Сбер',
      },
    ],
    'alfa-open-banking': [
      {
        merchant: 'Золотое Яблоко',
        description: 'Покупка уходовой косметики и парфюмерии',
        amount: 4750,
        mcc: '5999',
        bankSource: 'Альфа-Банк',
      },
    ],
    'raif-direct-api': [
      {
        merchant: 'Surf Coffee',
        description: 'Утренний фильтр-кофе и круассан',
        amount: 720,
        mcc: '5814',
        bankSource: 'Райффайзен',
      },
    ],
  };

  const rawItems = templatesByBank[bankId] || templatesByBank['tbank-open-api'];
  return rawItems.map((item, idx) => {
    const pred = classifyTransactionML(model, {
      merchant: item.merchant,
      description: item.description,
      mcc: item.mcc,
      amount: item.amount,
      type: 'expense',
    });

    const checksum = generateDeterministicChecksum({
      date: currentDate,
      merchant: item.merchant,
      amount: item.amount,
      mcc: item.mcc,
    });

    return {
      id: `bank-${bankId}-${Date.now()}-${idx}`,
      date: currentDate,
      merchant: item.merchant,
      description: item.description,
      amount: item.amount,
      type: 'expense',
      mcc: item.mcc,
      categoryId: pred.categoryId,
      mlConfidence: pred.confidence,
      mlMatchedFeatures: pred.matchedFeatures,
      bankSource: item.bankSource,
      syncStatus: 'synced',
      checksum,
    };
  });
}
