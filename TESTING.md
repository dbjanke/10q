# Testing Guide

## Overview

This project uses **Vitest** for testing both frontend and backend code. We prioritize testing the frontend/backend API contract and core business logic while avoiding external API calls and database state.

## Running Tests

```bash
# Run all tests (backend + frontend)
npm test

# Run backend tests only
npm run test:backend

# Run frontend tests only
npm run test:frontend

# Watch mode for development
npm run test:watch

# Run tests with UI
npm run test:ui  # from backend/ or frontend/

# Run with coverage
npm run test:coverage  # from backend/ or frontend/
```

## Test Structure

### Backend Tests

**Location**: `backend/src/__tests__/`

**Fixtures**: 
- `fixtures/testDatabase.ts` - In-memory SQLite database setup
- `fixtures/mockData.ts` - Mock OpenAI responses and test data

**Current Tests**:
- `services/conversation.service.test.ts` - Database CRUD operations (15 tests)

**Key Patterns**:
- Uses in-memory SQLite (`:memory:`) for fast, isolated tests
- Mocks the database module to inject test database
- No real OpenAI API calls - all responses are mocked
- Each test gets a fresh database instance

### Frontend Tests

**Location**: `frontend/src/__tests__/`

**Fixtures**:
- `setup.ts` - Global test setup (matchMedia mock, jest-dom)
- `fixtures/mockData.ts` - Mock API responses and helper functions

**Current Tests**:
- `hooks/useApi.test.ts` - API integration layer (15 tests)

**Key Patterns**:
- Uses `happy-dom` for DOM simulation (lighter than jsdom)
- Mocks global `fetch` to avoid real HTTP calls
- Tests request/response contracts
- Validates error handling and edge cases

## Writing New Tests

### Backend Service Tests

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createTestDatabase, closeTestDatabase } from '../fixtures/testDatabase.js';

// Mock database module
let mockDb;
vi.mock('../../config/database.js', () => ({
  getDatabase: () => mockDb,
}));

const yourService = await import('../../services/your.service.js');

describe('yourService', () => {
  beforeEach(() => {
    mockDb = createTestDatabase();
  });

  it('should do something', () => {
    // Test implementation
  });
});
```

### Frontend API Tests

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as api from '../../hooks/useApi';
import { mockFetchSuccess, mockFetchError } from '../fixtures/mockData';

describe('api function', () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  it('should call the correct endpoint', async () => {
    (global.fetch as any).mockResolvedValueOnce(
      mockFetchSuccess({ data: 'value' })
    );

    const result = await api.yourFunction();

    expect(global.fetch).toHaveBeenCalledWith('/api/endpoint', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input: 'value' }),
    });

    expect(result).toEqual({ data: 'value' });
  });
});
```

## Next Steps for Testing

### High-Priority Tests to Add

1. **Backend API Routes** (`routes.test.ts`)
   - Use `supertest` to test Express endpoints
   - Mock OpenAI service
   - Test the full request/response cycle

2. **OpenAI Service** (`services/openai.service.test.ts`)
   - Mock OpenAI client
   - Test conversation history formatting
   - Test command prompt injection

3. **Frontend Components** 
   - `ConversationView.test.tsx` - State management and progression
   - `ResponseInput.test.tsx` - Form validation and submission
   - `Dashboard.test.tsx` - Conversation list rendering

### Critical Test Scenarios

- ✅ Database CRUD operations
- ✅ API request/response contracts
- ⏳ Question progression (1→10)
- ⏳ Summary generation after Q10
- ⏳ Error handling (API failures, network errors)
- ⏳ Conversation deletion (cascade to messages)

## Configuration

### Backend: `vitest.config.ts`
- Environment: `node`
- Globals enabled for cleaner test syntax
- Coverage provider: v8

### Frontend: `vitest.config.ts`
- Environment: `happy-dom` (Node 18 compatible)
- React plugin for JSX support
- Includes `@testing-library/jest-dom` matchers

## Troubleshooting

**Issue**: Tests fail with "Database not initialized"  
**Solution**: Ensure mock database is created in `beforeEach` and database module is properly mocked

**Issue**: "Cannot find module" errors  
**Solution**: Use `.js` extensions in imports for ES modules (e.g., `import { x } from './file.js'`)

**Issue**: Fetch is not defined  
**Solution**: Mock `global.fetch` in `beforeEach` block

**Issue**: jsdom errors on Node 18  
**Solution**: Use `happy-dom` instead (already configured)

## CI/CD Integration

Add this to your CI pipeline:

```yaml
- name: Run tests
  run: npm test

- name: Run with coverage
  run: |
    cd backend && npm run test:coverage
    cd ../frontend && npm run test:coverage
```
