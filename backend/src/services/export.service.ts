import { ConversationWithMessages } from '../types.js';

export function exportToMarkdown(conversation: ConversationWithMessages): string {
  let markdown = `# ${conversation.title}\n\n`;
  markdown += `**Created:** ${conversation.createdAt.toLocaleString()}\n\n`;
  markdown += `**Status:** ${conversation.completed ? 'Completed' : 'In Progress'}\n\n`;
  markdown += `---\n\n`;

  // Group messages by question number
  const questions: { [key: number]: { question: string; response: string } } = {};

  for (const msg of conversation.messages) {
    if (msg.type === 'question' && msg.questionNumber) {
      if (!questions[msg.questionNumber]) {
        questions[msg.questionNumber] = { question: '', response: '' };
      }
      questions[msg.questionNumber].question = msg.content;
    } else if (msg.type === 'response' && msg.questionNumber) {
      if (!questions[msg.questionNumber]) {
        questions[msg.questionNumber] = { question: '', response: '' };
      }
      questions[msg.questionNumber].response = msg.content;
    }
  }

  // Output questions and responses
  for (let i = 1; i <= 10; i++) {
    if (questions[i]) {
      markdown += `## Question ${i}\n\n`;
      markdown += `${questions[i].question}\n\n`;
      if (questions[i].response) {
        markdown += `### Response\n\n`;
        markdown += `${questions[i].response}\n\n`;
      }
      markdown += `---\n\n`;
    }
  }

  // Add summary if available
  if (conversation.summary) {
    markdown += `## Summary\n\n`;
    markdown += `${conversation.summary}\n\n`;
  }

  return markdown;
}
