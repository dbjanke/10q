import OpenAI from 'openai';
import CircuitBreaker from 'opossum';
import { Message } from '../types.js';
import { getCommand } from '../config/commands.js';
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

  const breaker = getCircuitBreaker();
  const openai = getOpenAIClient();

  const completion = await breaker.fire(async () => {
    logger.debug({ questionNumber }, 'Generating question via OpenAI');
    return openai.chat.completions.create({
      model: getModel(),
      messages,
      temperature: RESPONSE_TEMPERATURE,
      max_tokens: QUESTION_MAX_TOKENS,
    });
  }) as OpenAI.Chat.ChatCompletion;

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

  const breaker = getCircuitBreaker();
  const openai = getOpenAIClient();

  const completion = await breaker.fire(async () => {
    logger.debug('Generating summary via OpenAI');
    return openai.chat.completions.create({
      model: getModel(),
      messages,
      temperature: RESPONSE_TEMPERATURE,
      max_tokens: SUMMARY_MAX_TOKENS,
    });
  }) as OpenAI.Chat.ChatCompletion;

  const summary = completion.choices[0]?.message?.content?.trim();
  if (!summary) {
    throw new Error('Failed to generate summary from OpenAI');
  }

  return summary;
}
