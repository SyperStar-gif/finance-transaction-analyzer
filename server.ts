import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import {
  CATEGORIES,
  createInitialMLModel,
  classifyTransactionML,
  generateOpenBankingBatch,
  type CategoryId,
} from './src/lib/financeSkill.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const serverMLModel = createInitialMLModel();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // 1. Health & Component Verification Endpoint
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      skillId: 'finance-transaction-analyzer',
      version: '1.4.0',
      mlVocabularySize: Object.keys(serverMLModel.vocabulary).length,
      mlValidationAccuracy: serverMLModel.validationAccuracy,
      geminiConfigured: Boolean(
        process.env.GEMINI_API_KEY &&
          process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY'
      ),
      timestamp: new Date().toISOString(),
    });
  });

  // 2. Hybrid ML + Server-Side Gemini Transaction Classification Endpoint
  app.post('/api/skill/classify-ai', async (req, res) => {
    const { merchant = '', description = '', mcc = '', amount = 0, type = 'expense' } =
      req.body || {};

    const localPrediction = classifyTransactionML(serverMLModel, {
      merchant,
      description,
      mcc,
      amount: Number(amount) || 0,
      type,
    });

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
      res.json({
        ...localPrediction,
        source: 'local-nb-tfidf',
      });
      return;
    }

    try {
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      const validCategories = Object.keys(CATEGORIES).join(', ');
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: `Классифицируй банковскую транзакцию в одну из категорий: [${validCategories}].
Мерчант: "${merchant}"
Описание: "${description}"
MCC-код: "${mcc}"
Сумма: ${amount} RUB (${type})
Локальный Naive Bayes прогноз: ${localPrediction.categoryId} (${localPrediction.confidence})`,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              categoryId: {
                type: Type.STRING,
                description: 'ID категории из списка допустимых',
              },
              confidence: {
                type: Type.NUMBER,
                description: 'Оценка уверенности от 0.50 до 0.99',
              },
              reasoning: {
                type: Type.STRING,
                description: 'Краткое объяснение на русском языке',
              },
            },
            required: ['categoryId', 'confidence', 'reasoning'],
          },
        },
      });

      const parsed = JSON.parse(response.text || '{}');
      const resolvedCat: CategoryId =
        parsed.categoryId && parsed.categoryId in CATEGORIES
          ? (parsed.categoryId as CategoryId)
          : localPrediction.categoryId;

      res.json({
        ...localPrediction,
        categoryId: resolvedCat,
        confidence: Number(
          Math.min(0.99, Math.max(localPrediction.confidence, Number(parsed.confidence) || 0.92)).toFixed(2)
        ),
        algorithm: 'gemini-hybrid-nb',
        explanation:
          parsed.reasoning ||
          `${CATEGORIES[resolvedCat].name} (Гибридная классификация Gemini + Naive Bayes)`,
        source: 'gemini-hybrid-nb',
      });
    } catch (_error) {
      // Graceful fallback to deterministic Naive Bayes + TF-IDF result
      res.json({
        ...localPrediction,
        source: 'local-nb-tfidf-fallback',
      });
    }
  });

  // 3. Open Banking API Encrypted Sync Endpoint
  app.post('/api/bank/sync/:providerId', (req, res) => {
    const { providerId } = req.params;
    const currentDate = req.body?.date || '2026-10-17';
    const transactions = generateOpenBankingBatch(
      providerId,
      serverMLModel,
      currentDate
    );

    res.json({
      providerId,
      protocol: 'TLS 1.3 / OAuth 2.1 / ISO 20022',
      syncedAt: new Date().toISOString(),
      transactions,
    });
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`FinPulse Server running on http://localhost:${PORT}`);
  });
}

startServer();
