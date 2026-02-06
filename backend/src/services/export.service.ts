import { ConversationWithMessages } from '../types.js';

export function exportToMarkdown(conversation: ConversationWithMessages): string {
  let markdown = `# ${conversation.title}\n\n`;
  markdown += `**Created:** ${conversation.createdAt.toLocaleString()}\n\n`;
  markdown += `**Status:** ${conversation.completed ? 'Completed' : 'In Progress'}\n\n`;
  markdown += `---\n\n`;

  // Group messages by question number
  const questions = new Map<number, { question: string; response: string }>();

  const getQuestionBucket = (questionNumber: number) => {
    if (questionNumber < 1 || questionNumber > 10) {
      return null;
    }

    const existing = questions.get(questionNumber);
    if (existing) {
      return existing;
    }

    const bucket = { question: '', response: '' };
    questions.set(questionNumber, bucket);
    return bucket;
  };

  for (const msg of conversation.messages) {
    if (msg.type === 'question' && msg.questionNumber) {
      const bucket = getQuestionBucket(msg.questionNumber);
      if (bucket) {
        bucket.question = msg.content;
      }
    } else if (msg.type === 'response' && msg.questionNumber) {
      const bucket = getQuestionBucket(msg.questionNumber);
      if (bucket) {
        bucket.response = msg.content;
      }
    }
  }

  // Output questions and responses
  for (let i = 1; i <= 10; i++) {
    const entry = questions.get(i);
    if (!entry) {
      continue;
    }
    markdown += `## Question ${i}\n\n`;
    markdown += `${entry.question}\n\n`;
    if (entry.response) {
      markdown += `### Response\n\n`;
      markdown += `${entry.response}\n\n`;
    }
    markdown += `---\n\n`;
  }

  // Add summary if available
  if (conversation.summary) {
    markdown += `## Summary\n\n`;
    markdown += `${conversation.summary}\n\n`;
  }

  return markdown;
}
