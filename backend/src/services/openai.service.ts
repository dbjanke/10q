import OpenAI from 'openai';
import CircuitBreaker from 'opossum';
import { Message } from '../types.js';
import { getCommand, getInsightsPrompt } from '../config/commands.js';
import { loadSystemPrompts } from '../config/system-prompt.js';
import { logger } from '../utils/logger.js';
import { updateCircuitBreakerMetric } from '../metrics.js';

let openaiClient: OpenAI | null = null;
let circuitBreaker: CircuitBreaker | null = null;

const OPENAI_TIMEOUT_MS = Number(process.env.OPENAI_TIMEOUT_MS || 15000);
const OPENAI_MAX_RETRIES = Number(process.env.OPENAI_MAX_RETRIES || 2);
const CIRCUIT_BREAKER_TIMEOUT = Number(process.env.OPENAI_CIRCUIT_TIMEOUT || 60000);
const CIRCUIT_BREAKER_ERROR_THRESHOLD = Number(process.env.OPENAI_CIRCUIT_ERROR_THRESHOLD || 50);
const CIRCUIT_BREAKER_VOLUME_THRESHOLD = Number(process.env.OPENAI_CIRCUIT_VOLUME_THRESHOLD || 10);

const RESPONSE_TEMPERATURE = 0.7;
const QUESTION_MAX_TOKENS = 150;
const SUMMARY_MAX_TOKENS = 500;
const KEY_INSIGHTS_MAX_TOKENS = 300;

function buildDiscussionText(conversationHistory: Message[]): string {
  let conversationText = '';
  for (const msg of conversationHistory) {
    if (msg.type === 'question') {
      conversationText += `Question ${msg.questionNumber}: ${msg.content}\n\n`;
    } else if (msg.type === 'response') {
      conversationText += `Response: ${msg.content}\n\n`;
    }
  }

  return conversationText.trim();
}

type ErrorType =
  | 'quota_exceeded'
  | 'rate_limit'
  | 'invalid_api_key'
  | 'server_error'
  | 'timeout'
  | 'network_error'
  | 'unknown';

function classifyError(error: unknown): ErrorType {
  if (!(error instanceof Error)) {
    return 'unknown';
  }

  const message = error.message.toLowerCase();

  // Check for quota/billing errors
  if (message.includes('insufficient_quota') ||
    message.includes('quota') ||
    message.includes('billing')) {
    return 'quota_exceeded';
  }

  // Check for rate limit
  if (message.includes('rate_limit') || message.includes('429')) {
    return 'rate_limit';
  }

  // Check for auth errors
  if (message.includes('invalid_api_key') ||
    message.includes('unauthorized') ||
    message.includes('401')) {
    return 'invalid_api_key';
  }

  // Check for timeout
  if (message.includes('timeout') || message.includes('timed out')) {
    return 'timeout';
  }

  // Check for server errors
  if (message.includes('500') ||
    message.includes('502') ||
    message.includes('503') ||
    message.includes('504')) {
    return 'server_error';
  }

  // Check for network errors
  if (message.includes('network') ||
    message.includes('econnrefused') ||
    message.includes('enotfound')) {
    return 'network_error';
  }

  return 'unknown';
}

function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY environment variable is not set');
    }
    openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      maxRetries: OPENAI_MAX_RETRIES,
      timeout: OPENAI_TIMEOUT_MS,
    });
  }
  return openaiClient;
}

function getCircuitBreaker(): CircuitBreaker {
  if (!circuitBreaker) {
    circuitBreaker = new CircuitBreaker(executeOpenAICall, {
      timeout: CIRCUIT_BREAKER_TIMEOUT,
      errorThresholdPercentage: CIRCUIT_BREAKER_ERROR_THRESHOLD,
      resetTimeout: CIRCUIT_BREAKER_TIMEOUT,
      volumeThreshold: CIRCUIT_BREAKER_VOLUME_THRESHOLD,
      name: 'openai',
    });

    // Log circuit state changes and update metrics
    circuitBreaker.on('open', () => {
      logger.error('OpenAI circuit breaker opened - requests will be rejected');
      updateCircuitBreakerMetric('open');
    });

    circuitBreaker.on('halfOpen', () => {
      logger.warn('OpenAI circuit breaker half-open - testing if service recovered');
      updateCircuitBreakerMetric('half_open');
    });

    circuitBreaker.on('close', () => {
      logger.info('OpenAI circuit breaker closed - service healthy');
      updateCircuitBreakerMetric('closed');
    });

    // Handle errors specially
    circuitBreaker.on('reject', () => {
      logger.warn('OpenAI request rejected - circuit breaker is open');
    });
  }
  return circuitBreaker;
}

export function getCircuitBreakerState(): 'open' | 'closed' | 'half_open' {
  const breaker = getCircuitBreaker();
  if (breaker.opened) return 'open';
  if (breaker.halfOpen) return 'half_open';
  return 'closed';
}

async function executeOpenAICall<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    const errorType = classifyError(error);

    // Log with classification
    logger.error(
      {
        err: error,
        errorType,
      },
      `OpenAI API error: ${errorType}`
    );

    // Special handling for quota errors - log as critical
    if (errorType === 'quota_exceeded') {
      logger.error(
        { err: error },
        'CRITICAL: OpenAI quota exceeded - check billing and usage limits'
      );
    }

    throw error;
  }
}

function getModel(): string {
  return process.env.OPENAI_MODEL || 'gpt-4o';
}

async function callOpenAI(
  messages: OpenAI.Chat.ChatCompletionMessageParam[],
  maxTokens: number
): Promise<string> {
  const breaker = getCircuitBreaker();
  const openai = getOpenAIClient();

  const completion = await breaker.fire(async () =>
    openai.chat.completions.create(
      { model: getModel(), messages, temperature: RESPONSE_TEMPERATURE, max_tokens: maxTokens },
    )
  ) as OpenAI.Chat.ChatCompletion;

  const content = completion.choices[0]?.message?.content?.trim();
  if (!content) {
    throw new Error('Empty response from OpenAI');
  }
  return content;
}

export async function checkOpenAiHealth(): Promise<{
  ok: boolean;
  latencyMs: number;
  error?: string;
  circuitOpen?: boolean;
}> {
  const start = Date.now();

  if (!process.env.OPENAI_API_KEY) {
    return {
      ok: false,
      latencyMs: Date.now() - start,
      error: 'not_configured',
      circuitOpen: false,
    };
  }

  const circuitState = getCircuitBreakerState();
  if (circuitState === 'open') {
    return {
      ok: false,
      latencyMs: Date.now() - start,
      error: 'circuit_breaker_open',
      circuitOpen: true,
    };
  }

  try {
    const openai = getOpenAIClient();
    await openai.models.list();
    return {
      ok: true,
      latencyMs: Date.now() - start,
      circuitOpen: false,
    };
  } catch (error) {
    const errorType = classifyError(error);
    const message = error instanceof Error ? error.message : 'unknown_error';
    return {
      ok: false,
      latencyMs: Date.now() - start,
      error: `${errorType}: ${message}`,
      circuitOpen: false,
    };
  }
}

async function generateSingleQuestion(
  conversationHistory: Message[],
  questionNumber: number,
  insights?: string
): Promise<string> {
  const command = getCommand(questionNumber);
  if (!command) {
    throw new Error(`No command found for question number ${questionNumber}`);
  }

  const systemPrompts = loadSystemPrompts();

  // Build conversation context
  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    {
      role: 'system',
      content: systemPrompts.questionPrompt,
    },
    {
      role: 'assistant',
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
    } else if (msg.type === 'conversation_context') {
      messages.push({
        role: 'assistant',
        content: msg.content,
      });
    }
  }

  if (insights) {
    messages.push({
      role: 'assistant',
      content: `# Key Insights:\n${insights}`,
    });
  }

  // Add explicit instruction for the current question
  messages.push({
    role: 'user',
    content: `Generate question ${questionNumber} of 10 following the command guidance above.`,
  });

  logger.debug({ questionNumber }, 'Generating question via OpenAI');
  return callOpenAI(messages, QUESTION_MAX_TOKENS);
}

export async function generateQuestion(
  conversationHistory: Message[],
  questionNumber: number,
  insights?: string,
  count: number = 1
): Promise<string[]> {
  const command = getCommand(questionNumber);
  if (!command) {
    throw new Error(`No command found for question number ${questionNumber}`);
  }

  if (command.staticQuestion) {
    return [command.staticQuestion];
  }

  const promises = Array.from({ length: count }, () =>
    generateSingleQuestion(conversationHistory, questionNumber, insights)
  );

  return Promise.all(promises);
}

export async function generateInsights(conversationHistory: Message[]): Promise<string> {
  const systemPrompts = loadSystemPrompts();
  const insightsCommandPrompt = getInsightsPrompt();
  const conversationText = buildDiscussionText(conversationHistory);

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    {
      role: 'system',
      content: systemPrompts.insightsPrompt,
    },
    {
      role: 'user',
      content: `Here is the discussion so far:\n\n${conversationText}`,
    },
    {
      role: 'assistant',
      content: `Current command:\n${insightsCommandPrompt}`,
    },
  ];

  logger.debug('Generating insights via OpenAI');
  return callOpenAI(messages, KEY_INSIGHTS_MAX_TOKENS);
}

export async function generateArticleKeyInsights(text: string): Promise<string> {
  const systemPrompts = loadSystemPrompts();

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: 'system', content: systemPrompts.insightsPrompt },
    { role: 'user', content: `CONTEXT:\n\n${text}` },
  ];

  logger.debug('Generating article key insights via OpenAI');
  return callOpenAI(messages, KEY_INSIGHTS_MAX_TOKENS);
}

export async function generateArticleSummary(text: string, keyInsights: string): Promise<string> {
  const systemPrompts = loadSystemPrompts();

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: 'system', content: systemPrompts.summaryPrompt },
    { role: 'assistant', content: `# Key Insights:\n${keyInsights}` },
    { role: 'user', content: `Please provide a cohesive 2-3 paragraph summary.\n\n# CONTEXT\n\n${text}` },
  ];

  logger.debug('Generating article summary via OpenAI');
  return callOpenAI(messages, SUMMARY_MAX_TOKENS);
}

export async function generateSummary(conversationHistory: Message[], insights?: string): Promise<string> {
  const systemPrompts = loadSystemPrompts();
  const conversationText = buildDiscussionText(conversationHistory);

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    {
      role: 'system',
      content: systemPrompts.summaryPrompt,
    },
    {
      role: 'user',
      content: `Here is the complete conversation:\n\n${conversationText}`,
    },
  ];

  if (insights) {
    messages.push({
      role: 'assistant',
      content: `# Key Insights:\n${insights}`,
    });
  }

  messages.push({
    role: 'user',
    content: 'Please provide a cohesive 2-3 paragraph summary.',
  });

  logger.debug('Generating summary via OpenAI');
  return callOpenAI(messages, SUMMARY_MAX_TOKENS);
}
