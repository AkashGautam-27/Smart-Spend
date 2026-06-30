import { Router, Request, Response } from 'express';
import { GoogleGenAI } from '@google/genai';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Lazy load Google GenAI client to avoid crashes if API key is not present initially
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error('GEMINI_API_KEY environment variable is required');
    }
    aiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

async function generateContentWithRetry(ai: GoogleGenAI, params: any): Promise<any> {
  const modelsToTry = ['gemini-3.5-flash', 'gemini-flash-latest'];
  let lastError: any = null;

  for (const modelName of modelsToTry) {
    let delay = 1000;
    const maxRetries = 2; // up to 3 attempts total per model

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        console.log(`[AI-OCR] Scanning receipt with model: ${modelName} (attempt ${attempt + 1}/${maxRetries + 1})...`);
        const response = await ai.models.generateContent({
          ...params,
          model: modelName,
        });
        return response;
      } catch (error: any) {
        lastError = error;
        console.error(`[AI-OCR] Error with model ${modelName} on attempt ${attempt + 1}:`, error?.message || error);

        const errorMsg = String(error?.message || error || '').toLowerCase();
        const isTransient = 
          error?.status === 429 || 
          error?.status === 503 || 
          error?.statusCode === 429 || 
          error?.statusCode === 503 || 
          errorMsg.includes('503') || 
          errorMsg.includes('unavailable') || 
          errorMsg.includes('demand') || 
          errorMsg.includes('rate limit') ||
          errorMsg.includes('too many requests');

        if (!isTransient && attempt > 0) {
          break;
        }

        if (attempt < maxRetries) {
          console.log(`[AI-OCR] Waiting ${delay}ms before next retry...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
          delay *= 2;
        }
      }
    }
  }

  throw lastError || new Error('All OCR scanner attempts failed.');
}

router.post('/scan-receipt', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  const { base64Image, mimeType } = req.body;

  if (!base64Image) {
    res.status(400).json({ error: 'Base64 image is required.' });
    return;
  }

  try {
    const ai = getGeminiClient();
    const actualMimeType = mimeType || 'image/jpeg';

    const prompt = `Analyze this digital copy of a cash register receipt / bill.
Extract the transaction details and translate them into a structured JSON payload containing:
- The total parsed amount of money paid (amount, as a float number, or null if unreadable).
- The transaction date (date, in format 'YYYY-MM-DD'). Real local time is currently June 2026. Use date elements from the receipt, assuming the closest matching year.
- The merchant / vendor / business name (vendor, as string).
- Recommended category selection (category), which MUST map to one of: 'Food', 'Housing', 'Entertainment', 'Utilities', 'Transportation', 'Shopping', or null.
- Extracted confidence score (confidence, as a percentage integer from 0 to 100).
Provide only the correctly structure matching response.`;

    const cleanBase64 = base64Image.replace(/^data:image\/\w+;base64,/, "");

    const response = await generateContentWithRetry(ai, {
      contents: {
        parts: [
          {
            inlineData: {
              data: cleanBase64,
              mimeType: actualMimeType
            }
          },
          { text: prompt }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            amount: {
              type: "NUMBER"
            },
            date: {
              type: "STRING"
            },
            vendor: {
              type: "STRING"
            },
            category: {
              type: "STRING",
              nullable: true
            },
            confidence: {
              type: "INTEGER"
            }
          },
          required: ["amount", "date", "vendor", "category", "confidence"]
        }
      }
    });

    const parsedJson = JSON.parse(response.text || '{}');
    res.json({ data: parsedJson });
  } catch (error: any) {
    console.error('Error scanning receipt via Gemini:', error);
    const errMessage = error?.message || String(error);
    const is503 = errMessage.includes('503') || errMessage.toLowerCase().includes('unavailable') || errMessage.toLowerCase().includes('demand');
    const displayError = is503
      ? 'The Gemini service is currently experiencing very high demand. Please try again in a few seconds.'
      : `Error scanning receipt: ${errMessage}. Please verify your GEMINI_API_KEY and try again.`;
    res.status(500).json({ error: displayError });
  }
});

router.post('/parse-voice-command', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  const { query, transactions } = req.body;

  if (!query) {
    res.status(400).json({ error: 'Query transcript is required.' });
    return;
  }

  try {
    const ai = getGeminiClient();
    const prompt = `You are an intelligent voice assistant for SmartSpend (a personal finance tracker).
The user has spoken a voice command to find, analyze, or register financial ledger records.
Here is the raw speech transcript from the user: "${query}"

Here are the user's current transaction records (the current year is 2026):
${JSON.stringify(transactions || [], null, 2)}

Analyze the user's spoken command and choose ONE of these actions:
1. "filter": If the user wants to fetch, see, list, query, or summarize transactions (e.g. "show me my food expenses", "how much did I spend on Shopping?", "any transactions over $100?", "what did I buy at walmart?").
   In this case, find all transaction IDs in the provided transactions list that match the user's intent, and write a friendly summary answer.
2. "add": If the user wants to record/register/save a new transaction (e.g. "add $15.50 for lunch on Food", "record income of $500 for consulting").
   In this case, extract details for the "newTransaction" field.
3. "none": If the user spoken command is not finance-related or is unclear.

For category fields: map them ONLY to one of: 'Food', 'Housing', 'Entertainment', 'Utilities', 'Transportation', 'Shopping', or 'Other'.
For paymentMethod: map to 'UPI', 'Cash', or 'Card' (default to 'Cash' if not specified).

Respond with a JSON object matching this schema. Provide ONLY the JSON.`;

    const response = await generateContentWithRetry(ai, {
      contents: [
        { text: prompt }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            action: {
              type: "STRING",
              description: "Must be 'filter', 'add', or 'none'"
            },
            summary: {
              type: "STRING",
              description: "A friendly natural language summary answering or describing the voice action."
            },
            filters: {
              type: "OBJECT",
              properties: {
                category: { type: "STRING", nullable: true },
                matchingIds: {
                  type: "ARRAY",
                  items: { type: "STRING" },
                  nullable: true
                }
              },
              required: ["category", "matchingIds"]
            },
            newTransaction: {
              type: "OBJECT",
              nullable: true,
              properties: {
                description: { type: "STRING" },
                amount: { type: "NUMBER" },
                type: { type: "STRING", description: "Must be 'expense' or 'income'" },
                category: { type: "STRING" },
                paymentMethod: { type: "STRING" }
              },
              required: ["description", "amount", "type", "category", "paymentMethod"]
            }
          },
          required: ["action", "summary", "filters", "newTransaction"]
        }
      }
    });

    const parsedJson = JSON.parse(response.text || '{}');
    res.json({ data: parsedJson });
  } catch (error: any) {
    console.error('Error parsing voice command:', error);
    res.status(500).json({ error: error?.message || 'Failed to process voice command.' });
  }
});

router.post('/insights-advisor', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  const { transactions, budgets, budgetStatuses } = req.body;

  try {
    const ai = getGeminiClient();
    const prompt = `You are a professional AI Personal Finance Advisor & Wealth Coach for SmartSpend.
Analyze the user's spending habits, budgets, and standard categories to generate specific, high-value, personalized advice.
The current date is June 2026.

User's transaction history:
${JSON.stringify(transactions || [], null, 2)}

User's budget statuses:
${JSON.stringify(budgetStatuses || [], null, 2)}

User's defined monthly budgets limits:
${JSON.stringify(budgets || [], null, 2)}

Your response MUST be structured JSON with these exact properties:
1. "lowBudgets": An array of budget items that are close to or exceeding limits (e.g. >= 75% limit or exceeded) with details:
   - "category" (string)
   - "status" (string: 'danger' if exceeded, 'warning' if >= 75%, 'info' if safe)
   - "message" (string: concise, highly useful context-aware guidance with amount spent and limits)
2. "savingTips": An array of at least 3 custom, highly personalized actionable strategies showing where they can save money based on high spending items, UPI/Card channels, or category trends. No generic filler tips!
3. "weeklyAnalysis": An object:
   - "summary" (string: concise summary analyzing this week's expenses versus prior weeks or patterns)
   - "topExpenseCategory" (string)
   - "advice" (string: quick concrete rule-of-thumb advice)
4. "monthlyAnalysis": An object:
   - "summary" (string: progress check for the overall month, net flow, saving rate estimate)
   - "savingsForecast" (string: realistic savings projection for this month if current trends continue)

Ensure your advice is action-oriented, precise, uses real numbers from the data, and avoids vague or dry template text. Do not output anything except the JSON object.`;

    const response = await generateContentWithRetry(ai, {
      contents: [
        { text: prompt }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            lowBudgets: {
              type: "ARRAY",
              items: {
                type: "OBJECT",
                properties: {
                  category: { type: "STRING" },
                  status: { type: "STRING" },
                  message: { type: "STRING" }
                },
                required: ["category", "status", "message"]
              }
            },
            savingTips: {
              type: "ARRAY",
              items: { type: "STRING" }
            },
            weeklyAnalysis: {
              type: "OBJECT",
              properties: {
                summary: { type: "STRING" },
                topExpenseCategory: { type: "STRING" },
                advice: { type: "STRING" }
              },
              required: ["summary", "topExpenseCategory", "advice"]
            },
            monthlyAnalysis: {
              type: "OBJECT",
              properties: {
                summary: { type: "STRING" },
                savingsForecast: { type: "STRING" }
              },
              required: ["summary", "savingsForecast"]
            }
          },
          required: ["lowBudgets", "savingTips", "weeklyAnalysis", "monthlyAnalysis"]
        }
      }
    });

    const parsedJson = JSON.parse(response.text || '{}');
    res.json({ data: parsedJson });
  } catch (error: any) {
    console.error('Error generating insights:', error);
    res.status(500).json({ error: error?.message || 'Failed to generate financial advisor insights.' });
  }
});

export default router;
