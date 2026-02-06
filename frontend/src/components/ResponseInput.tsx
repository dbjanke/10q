import { useState } from 'react';
import { MAX_RESPONSE_LENGTH } from '../config/validation';

interface ResponseInputProps {
  onSubmit: (response: string) => void;
  disabled?: boolean;
}

export default function ResponseInput({ onSubmit, disabled }: ResponseInputProps) {
  const [response, setResponse] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (response.trim() && !disabled) {
      onSubmit(response.trim());
      setResponse('');
    }
  }

  const charsRemaining = MAX_RESPONSE_LENGTH - response.length;
  const isNearLimit = charsRemaining < 50;

  return (
    <form onSubmit={handleSubmit} className="card" style={{ padding: 22 }}>
      <label className="muted" style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, display: 'block' }}>
        Your Response
      </label>
      <textarea
        value={response}
        onChange={(e) => setResponse(e.target.value)}
        placeholder="Take your time to reflect and respond..."
        className="textarea"
        rows={6}
        maxLength={MAX_RESPONSE_LENGTH}
        disabled={disabled}
      />
      <div className="row" style={{ marginTop: 14 }}>
        <span
          className="muted-small"
          style={{ color: isNearLimit ? '#c2410c' : undefined, fontWeight: isNearLimit ? 600 : undefined }}
        >
          {response.length} / {MAX_RESPONSE_LENGTH} characters
        </span>
        <button
          type="submit"
          disabled={!response.trim() || disabled}
          className="btn btn-primary"
        >
          {disabled ? 'Submitting...' : 'Submit Response'}
        </button>
      </div>
    </form>
  );
}
