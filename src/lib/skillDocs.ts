export const SKILL_CONFIG_JSON_TEXT = `{
  "$schema": "https://aistudio.google.com/schemas/agent-skill-v1.json",
  "skillId": "finance-transaction-analyzer",
  "name": "FinPulse Financial Transaction Analyzer & ML Classifier",
  "version": "1.4.0",
  "language": "ru-RU",
  "runtime": {
    "node": ">=22.0.0",
    "typescript": "^7.0.2",
    "framework": "React 19 + Express 4 + Vite 8",
    "port": 3000
  },
  "mlEngine": {
    "primaryClassifier": "multinomial-naive-bayes-tfidf",
    "hybridServerModel": "gemini-3.8-flash",
    "features": [
      "russian-morphological-stemming",
      "tfidf-token-weighting",
      "mcc-code-bayesian-priors",
      "laplace-smoothing",
      "online-active-retraining"
    ],
    "temperatureScaling": 1.65,
    "minConfidenceThreshold": 0.42
  },
  "budgetEngine": {
    "defaultWarningRatio": 0.8,
    "criticalExceededRatio": 1.0,
    "currency": "RUB",
    "supportedCategories": [
      "groceries", "restaurants", "transport", "housing",
      "health", "entertainment", "shopping", "travel", "transfers", "income"
    ]
  },
  "bankApiIntegrations": {
    "securityProtocols": [
      "OAuth 2.1 + PKCE",
      "mTLS (TLS 1.3 / AES-256-GCM)",
      "OpenAPI FAPI 2.0 + JWS",
      "ISO 20022 JSON Normalization"
    ],
    "providers": [
      { "id": "tbank-open-api", "name": "Т-Банк (Open Banking API)", "endpoint": "/api/bank/sync/tbank-open-api" },
      { "id": "sber-fin-api", "name": "Сбер ID / Финансовый API", "endpoint": "/api/bank/sync/sber-fin-api" },
      { "id": "alfa-open-banking", "name": "Альфа-Банк Open API", "endpoint": "/api/bank/sync/alfa-open-banking" },
      { "id": "raif-direct-api", "name": "Райффайзен Банк API", "endpoint": "/api/bank/sync/raif-direct-api" }
    ]
  },
  "offlineSync": {
    "storageDriver": "localStorage + IndexedQueue",
    "deduplicationHash": "FNV-1a-32bit-checksum",
    "conflictResolution": "client-timestamp-with-checksum-idempotency",
    "autoFlushOnReconnect": true
  },
  "dependenciesVerified": {
    "@google/genai": "^2.4.0",
    "express": "^4.21.2",
    "react": "^19.0.1",
    "react-dom": "^19.0.1",
    "lucide-react": "^0.546.0",
    "tailwindcss": "^4.3.3"
  }
}`;

export const SKILL_MD_TEXT = `---
name: finance-transaction-analyzer
description: >-
  Финансовый скилл ИИ-агента для автоматического анализа банковских транзакций,
  ML-классификации расходов по категориям (Naive Bayes + TF-IDF + MCC + Gemini API),
  генерации ежемесячных отчётов с визуализацией, контроля бюджетных лимитов с
  уведомлениями, безопасной интеграции с банковскими API и работы в офлайн-режиме
  с последующей идемпотентной синхронизацией.
---

# Скилл агента: Анализ финансов и ML-классификация транзакций

## Инструменты агента (Function Declarations)
1. classifyTransactionML(model, input) — байесовская классификация с TF-IDF и MCC-признаками.
2. retrainModelWithSample(model, sample) — онлайн-дообучение на исправлениях пользователя.
3. generateMonthlyReport(transactions, month) — агрегация отчёта за месяц с динамикой MoM.
4. evaluateBudgets(transactions, budgets, month) — проверка лимитов и генерация уведомлений.
5. synchronizeOfflineQueue(transactions, budgets, queue, mlModel) — идемпотентная синхронизация офлайн-очереди.`;

export const README_MD_TEXT = `# FinPulse — Финансовый скилл ИИ-агента (README.md)

Комплексный финансовый скилл (\`finance-transaction-analyzer\`) и рабочая среда для анализа транзакций, автоматической ML-классификации расходов, генерации ежемесячных отчётов, контроля бюджетных лимитов, интеграции с банковскими API и офлайн-синхронизации.

## Быстрый старт и проверка

\`\`\`bash
# 1. Запуск модульных тестов ML-классификатора, бюджетов и офлайн-очереди
node --test src/lib/financeSkill.test.ts

# 2. Проверка типов TypeScript и сборка продакшен-бандла
npm run lint
npm run build

# 3. Запуск полного стека (Express API + Vite Frontend на порту 3000)
npm run dev
\`\`\`

## Архитектурные модули
- \`src/lib/financeSkill.ts\` — Чистая логика Multinomial Naive Bayes + TF-IDF, агрегатор отчётов, движок бюджетных уведомлений и синхронизатор офлайн-очереди.
- \`src/lib/financeSkill.test.ts\` — Набор детерминированных unit-тестов (\`node:test\`).
- \`server.ts\` — Серверные маршруты \`/api/skill/classify-ai\` (Gemini 3.8 Flash), \`/api/bank/sync/:providerId\` (Open Banking API) и \`/api/health\`.
- \`skill.config.json\` — Итоговая конфигурация скилла, протоколов безопасности и проверенных зависимостей.`;
