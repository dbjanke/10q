import OpenAI from 'openai';
import { Message } from '../types.js';
import { getCommand } from '../config/commands.js';
import { loadSystemPrompts } from '../config/system-prompt.js';

let openaiClient: OpenAI | null = null;

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

export async function generateQuestion(
  conversationHistory: Message[],
  questionNumber: number
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
  const completion = await openai.chat.completions.create({
    model: getModel(),
    messages,
    temperature: 0.7,
    max_tokens: 150,
  });

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
  const completion = await openai.chat.completions.create({
    model: getModel(),
    messages,
    temperature: 0.7,
    max_tokens: 500,
  });

  const summary = completion.choices[0]?.message?.content?.trim();
  if (!summary) {
    throw new Error('Failed to generate summary from OpenAI');
  }

  return summary;
}
