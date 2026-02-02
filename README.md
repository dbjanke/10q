# 10Q - Guided Thinking Application

A web application that guides users through deep reflection using 10 AI-generated questions. Each conversation is a journey through thoughtful inquiry, helping users explore topics with clarity and insight.

## Features

- **10 Sequential Questions**: AI-generated questions that progressively deepen understanding
- **Intelligent Progression**: Each question builds on previous responses
- **Automatic Summarization**: Get a cohesive summary after completing all questions
- **Conversation Management**: Save, view, and manage multiple conversations
- **Markdown Export**: Export your conversations for future reference
- **Clean Interface**: Minimal, distraction-free design built with React and TailwindCSS

## Technology Stack

- **Frontend**: React, TypeScript, Vite, TailwindCSS, React Router
- **Backend**: Node.js, Express, TypeScript
- **Database**: SQLite (better-sqlite3)
- **AI**: OpenAI API (GPT-4o)

## Prerequisites

- Node.js 18 or higher
- OpenAI API key ([Get one here](https://platform.openai.com/api-keys))

## Installation

1. Clone or download this repository

2. Run the setup script:
```bash
npm run setup
```

This will:
- Install all dependencies
- Create the `.env` file from template
- Build the frontend and backend
- Set up the database directory

3. Edit `.env` and add your OpenAI API key:
```bash
OPENAI_API_KEY=sk-your-api-key-here
```

## Usage

### Production Mode

Start the application in production mode (frontend served by backend):

```bash
npm start
```

The application will be available at `http://localhost:3001`

### Development Mode

For development with hot-reload:

```bash
npm run dev
```

This runs:
- Frontend on `http://localhost:5173` (with proxy to backend)
- Backend on `http://localhost:3001`

## How It Works

### The 10-Question Journey

Each conversation follows a structured progression through 10 questions:

1. **Get topic and context** - Establish why you're exploring this topic
2. **Find core concern** - Identify what feels most important
3. **Sharpen focus** - Clarify your thinking on the core issue
4. **Interrogate assumptions** - Challenge underlying beliefs
5. **Uncover emotional stakes** - Explore what you're protecting or avoiding
6. **Expose inner friction** - Find where values or goals conflict
7. **Disrupt the frame** - Reframe from a different perspective
8. **Shift perspectives** - Consider other viewpoints or timeframes
9. **Consider 2nd-order effects** - Think about downstream consequences
10. **Extract universal insight** - Articulate the principle you've discovered

### Using the Application

1. **Start a Conversation**: Click "Start New Conversation" and enter a topic
2. **Answer Questions**: Read each AI-generated question and provide thoughtful responses
3. **Progress Through All 10**: The AI adapts each question based on your previous answers
4. **Receive Summary**: After the 10th question, get an automatic 2-3 paragraph summary
5. **Export or Review**: Export to Markdown or return to the dashboard

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
DATABASE_PATH=./backend/data/10q.db
```

### Question Commands

Questions are defined in `config/commands.json`. Each command guides the AI on what type of question to ask at each step.

### System Prompts

AI behavior is configured in `config/system-prompts.json`:
- `questionPrompt`: Instructions for generating questions
- `summaryPrompt`: Instructions for creating the final summary

## Project Structure

```
10q/
├── backend/               # Node.js + Express API
│   ├── src/
│   │   ├── config/       # Database, commands, prompts
│   │   ├── services/     # OpenAI, conversation, export
│   │   ├── routes.ts     # API endpoints
│   │   └── server.ts     # Main server
│   └── database/         # SQLite schema
├── frontend/             # React + TypeScript UI
│   ├── src/
│   │   ├── components/   # React components
│   │   ├── hooks/        # API integration
│   │   └── types.ts      # TypeScript types
│   └── index.html
├── config/               # Application configuration
│   ├── commands.json     # Question progression
│   └── system-prompts.json
└── scripts/              # Setup and start scripts
```

## API Endpoints

- `POST /api/conversations` - Create new conversation
- `GET /api/conversations` - List all conversations
- `GET /api/conversations/:id` - Get conversation with messages
- `DELETE /api/conversations/:id` - Delete conversation
- `POST /api/conversations/:id/response` - Submit response, get next question
- `GET /api/conversations/:id/export` - Export as Markdown

## Database Schema

**conversations**
- id, title, summary, created_at, completed, current_question_number

**messages**
- id, conversation_id, type (question/response/summary), content, question_number, created_at

## Development

### Build Commands

```bash
# Build everything
npm run build

# Build frontend only
npm run build:frontend

# Build backend only
npm run build:backend
```

### Development Mode

```bash
# Run both frontend and backend in dev mode
npm run dev

# Run backend dev server only
npm run dev:backend

# Run frontend dev server only
npm run dev:frontend
```

## Troubleshooting

### "OpenAI API key not set"
- Edit `.env` and add your API key: `OPENAI_API_KEY=sk-...`

### "Database initialization failed"
- Ensure `backend/data/` directory exists
- Check file permissions

### "Failed to generate question"
- Verify OpenAI API key is valid
- Check API key has sufficient credits
- Ensure internet connection is working

### Port already in use
- Change `PORT` in `.env` to a different port
- Kill the process using port 3001: `lsof -ti:3001 | xargs kill`

## Data Storage

All data is stored locally in SQLite:
- Database location: `backend/data/10q.db`
- No external data storage
- Complete privacy - your conversations never leave your machine (except OpenAI API calls)

## Security Notes

- OpenAI API key is stored in `.env` (never committed to git)
- Backend-only API access (frontend never sees the key)
- All data stored locally in SQLite
- No user authentication (designed for single-user local use)

## License

MIT

## Support

For issues or questions, please file an issue on the GitHub repository.

---

Built with thoughtfulness. Powered by OpenAI GPT-4o.
