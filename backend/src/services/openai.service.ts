import OpenAI from 'openai';
import { Message } from '../types.js';
import { getCommand } from '../config/commands.js';
import { loadSystemPrompts } from '../config/system-prompt.js';

let openaiClient: OpenAI | null = null;

const OPENAI_TIMEOUT_MS = Number(process.env.OPENAI_TIMEOUT_MS || 15000);
const RESPONSE_TEMPERATURE = 0.7;
const QUESTION_MAX_TOKENS = 150;
const SUMMARY_MAX_TOKENS = 500;

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('OpenAI request timed out'));
    }, timeoutMs);

    promise
      .then((value) => {
        clearTimeout(timeout);
        resolve(value);
      })
      .catch((err) => {
        clearTimeout(timeout);
        reject(err);
      });
  });
}

function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY environment variable is not set');
    }
    openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return openaiClient;
}

function getModel(): string {
  return process.env.OPENAI_MODEL || 'gpt-4o';
}

export async function checkOpenAiHealth(): Promise<{
  ok: boolean;
  latencyMs: number;
  error?: string;
}> {
  const start = Date.now();

  if (!process.env.OPENAI_API_KEY) {
    return { ok: false, latencyMs: Date.now() - start, error: 'not_configured' };
  }

  try {
    const openai = getOpenAIClient();
    await withTimeout(openai.models.list(), OPENAI_TIMEOUT_MS);
    return { ok: true, latencyMs: Date.now() - start };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown_error';
    return { ok: false, latencyMs: Date.now() - start, error: message };
  }
}

export async function generateQuestion(
  conversationHistory: Message[],
  questionNumber: number
): Promise<string> {
  const command = getCommand(questionNumber);
  if (!command) {
    throw new Error(`No command found for question number ${questionNumber}`);
  }

  // Return static question if defined (avoids API call for Q1)
  if (command.staticQuestion) {
    return command.staticQuestion;
  }

  const systemPrompts = loadSystemPrompts();

  // Build conversation context
  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    {
      role: 'system',
      content: systemPrompts.questionPrompt,
    },
    {
      role: 'system',
      content: `Current command (Question ${questionNumber}/10): ${command.name}\n${command.prompt}`,
    },
  ];

  // Add conversation history
  for (const msg of conversationHistory) {
    if (msg.type === 'question') {
      messages.push({
        role: 'assistant',
        content: msg.content,
      });
    } else if (msg.type === 'response') {
      messages.push({
        role: 'user',
        content: msg.content,
      });
    }
  }

  // Add explicit instruction for the current question
  messages.push({
    role: 'user',
    content: `Generate question ${questionNumber} of 10 following the command guidance above.`,
  });

  const openai = getOpenAIClient();
  const completion = await withTimeout(openai.chat.completions.create({
    model: getModel(),
    messages,
    temperature: RESPONSE_TEMPERATURE,
    max_tokens: QUESTION_MAX_TOKENS,
  }), OPENAI_TIMEOUT_MS);

  const question = completion.choices[0]?.message?.content?.trim();
  if (!question) {
    throw new Error('Failed to generate question from OpenAI');
  }

  return question;
}

export async function generateSummary(conversationHistory: Message[]): Promise<string> {
  const systemPrompts = loadSystemPrompts();

  // Build the full conversation for summary
  let conversationText = '';
  for (const msg of conversationHistory) {
    if (msg.type === 'question') {
      conversationText += `Question ${msg.questionNumber}: ${msg.content}\n\n`;
    } else if (msg.type === 'response') {
      conversationText += `Response: ${msg.content}\n\n`;
    }
  }

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    {
      role: 'system',
      content: systemPrompts.summaryPrompt,
    },
    {
      role: 'user',
      content: `Here is the complete conversation:\n\n${conversationText}\n\nPlease provide a cohesive 2-3 paragraph summary.`,
    },
  ];

  const openai = getOpenAIClient();
  const completion = await withTimeout(openai.chat.completions.create({
    model: getModel(),
    messages,
    temperature: RESPONSE_TEMPERATURE,
    max_tokens: SUMMARY_MAX_TOKENS,
  }), OPENAI_TIMEOUT_MS);

  const summary = completion.choices[0]?.message?.content?.trim();
  if (!summary) {
    throw new Error('Failed to generate summary from OpenAI');
  }

  return summary;
}
