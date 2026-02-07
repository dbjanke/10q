# 10Q - Guided Thinking Application

10Q is a guided‑thinking web app that asks 10 AI‑generated questions about a topic you choose. Each question builds on your prior answers to move from surface context to deeper insight, and the session concludes with a cohesive summary you can review or export.

## Prerequisites

- Node.js 18 or higher
- OpenAI API key ([Get one here](https://platform.openai.com/api-keys))
- Google OAuth credentials (Client ID/Secret)

## Install & Run

- Install dependencies and build: `npm run setup`
- Development (Vite + API): `npm run dev`
- Production: `npm start`

## How to Use

1. **Start a Conversation**: Click "Start New Conversation" and enter a topic
2. **Answer Questions**: Respond thoughtfully to each AI-generated question
3. **Progress Through All 10**: Each question adapts based on your previous answers
4. **Receive Summary**: Get an automatic summary after completing all questions
5. **Export or Review**: Export to Markdown or return to the dashboard to start another conversation

## Configuration

### Environment Variables

Use [.env.example](.env.example) as the source of truth. The server fails fast if required values are missing. You’ll need OpenAI credentials plus Google OAuth (Client ID/Secret and callback URL). Set `FRONTEND_URL` to the deployed frontend origin and ensure the Google OAuth callback URL is registered with your Google Cloud client.

### Customizing Questions

The 10-question structure is defined in `config/commands.json`. Each command has a `prompt` that instructs the AI on what type of question to generate.

System prompts for question generation and summarization are in `config/system-prompts.json`.

### Data Store Boundary

Database access is routed through a store interface so the business logic stays stable if the storage engine changes. The current implementation is SQLite, but the boundary is defined in `backend/src/stores/conversation.store.ts` with the SQLite implementation in `backend/src/stores/sqlite/conversation.store.ts`.

## Development

Engineering principles and architectural preferences are documented in [AGENTS.md](AGENTS.md).

## Data & Privacy

- All conversations stored locally in SQLite (`backend/data/10q.db`), scoped per user
- OpenAI and Google OAuth credentials stored in `.env` (never committed to git)
- No external data storage beyond OpenAI API calls
- Access is restricted to allowlisted Google accounts; admins manage the allowlist

## Troubleshooting

**"OpenAI API key not set"**  
Edit `.env` and add your API key: `OPENAI_API_KEY=sk-...`

**"Missing required environment variable"**  
Set the required value in `.env` (see Configuration). The server fails fast when required values are missing.

**"Google OAuth is not configured"**  
Ensure `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `GOOGLE_CALLBACK_URL` are set, and add the callback URL in your Google Cloud OAuth client.

**"Database initialization failed"**  
Ensure `backend/data/` directory exists and has write permissions

**"Failed to generate question"**  
- Verify OpenAI API key is valid
- Check API key has sufficient credits
- Ensure internet connection is working

**Port already in use**  
Change `PORT` in `.env` or kill the process: `lsof -ti:3001 | xargs kill`

## Built With

React, TypeScript, Vite, TailwindCSS, Express, SQLite, OpenAI GPT-4o, Google OAuth

## License

See [LICENSE](LICENSE).
