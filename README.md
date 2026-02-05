# 10Q - Guided Thinking Application

A web application that guides you through deep reflection using 10 AI-generated questions. Each conversation is a journey through thoughtful inquiry, helping you explore topics with clarity and insight.

## What Is This?

10Q asks you 10 progressively deeper questions about any topic you choose. Each question builds on your previous answers, guiding you from surface-level thoughts to deeper insights. After answering all 10 questions, you receive a cohesive summary of your exploration.

The questioning follows a structured approach: establishing context → identifying core concerns → challenging assumptions → exploring emotional stakes → reframing perspectives → extracting universal insights.

## Prerequisites

- Node.js 18 or higher
- OpenAI API key ([Get one here](https://platform.openai.com/api-keys))

## Installation

1. Clone or download this repository

2. Run the setup script:
```bash
npm run setup
```

This will install dependencies, create the `.env` file, and build the application.

3. Edit `.env` and add your OpenAI API key:
```bash
OPENAI_API_KEY=sk-your-api-key-here
```

## Running the Application

### Production Mode

```bash
npm start
```

The application will be available at `http://localhost:3001`

### Development Mode

For development with hot-reload:

```bash
npm run dev
```

This runs the frontend on `http://localhost:5173` and backend on `http://localhost:3001`

## How to Use

1. **Start a Conversation**: Click "Start New Conversation" and enter a topic
2. **Answer Questions**: Respond thoughtfully to each AI-generated question
3. **Progress Through All 10**: Each question adapts based on your previous answers
4. **Receive Summary**: Get an automatic summary after completing all questions
5. **Export or Review**: Export to Markdown or return to the dashboard to start another conversation

## Configuration

### Environment Variables

Edit `.env` to customize:

```bash
# Required
OPENAI_API_KEY=sk-your-key-here

# Optional (defaults shown)
OPENAI_MODEL=gpt-4o
PORT=3001
NODE_ENV=production
DATABASE_PATH=./data/10q.db
DATA_STORE=sqlite
SLOW_QUERY_MS=200
RESPONSE_RATE_LIMIT_WINDOW_MS=60000
RESPONSE_RATE_LIMIT_MAX=30
MAX_CONCURRENT_SUBMISSIONS=5
OPENAI_TIMEOUT_MS=15000
```

### Customizing Questions

The 10-question structure is defined in `config/commands.json`. Each command has a `prompt` that instructs the AI on what type of question to generate.

System prompts for question generation and summarization are in `config/system-prompts.json`.

### Data Store Boundary

Database access is routed through a store interface so the business logic stays stable if the storage engine changes. The current implementation is SQLite, but the boundary is defined in `backend/src/stores/conversation.store.ts` with the SQLite implementation in `backend/src/stores/sqlite/conversation.store.ts`.

## Development

Engineering principles and architectural preferences are documented in [AGENTS.md](AGENTS.md).

```bash
# Build everything
npm run build

# Build frontend or backend separately
npm run build:frontend
npm run build:backend

# Run in development mode with hot-reload
npm run dev
```

## Data & Privacy

- All conversations stored locally in SQLite (`backend/data/10q.db`)
- OpenAI API key stored in `.env` (never committed to git)
- No external data storage beyond OpenAI API calls
- Designed for single-user local use

## Troubleshooting

**"OpenAI API key not set"**  
Edit `.env` and add your API key: `OPENAI_API_KEY=sk-...`

**"Database initialization failed"**  
Ensure `backend/data/` directory exists and has write permissions

**"Failed to generate question"**  
- Verify OpenAI API key is valid
- Check API key has sufficient credits
- Ensure internet connection is working

**Port already in use**  
Change `PORT` in `.env` or kill the process: `lsof -ti:3001 | xargs kill`

## Built With

React, TypeScript, Vite, TailwindCSS, Express, SQLite, OpenAI GPT-4o

## License

MIT
