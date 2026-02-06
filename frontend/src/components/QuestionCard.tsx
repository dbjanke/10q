import { Message } from '../types';

interface QuestionCardProps {
  question: Message;
  isLatest?: boolean;
}

export default function QuestionCard({ question, isLatest }: QuestionCardProps) {
  return (
    <div className={`card question-card ${isLatest ? 'card-hover' : ''}`}>
      <div className="row" style={{ marginBottom: 10 }}>
        <span className="question-title">Question {question.questionNumber} of 10</span>
        {isLatest && <span className="pill">Current</span>}
      </div>
      <p className="question-content">{question.content}</p>
    </div>
  );
}
