# Modern Context Engineering Patterns (2026)

> **A comprehensive guide to implementing context engineering with current AI agent systems**

---

## Table of Contents

1. [Overview](#overview)
2. [Core Principles](#core-principles)
3. [Setting Up Your Repository](#setting-up-your-repository)
4. [Tool System Design](#tool-system-design)
5. [Context Management](#context-management)
6. [Feedback & Validation](#feedback--validation)
7. [Agent Delegation](#agent-delegation)
8. [Complete Implementation Example](#complete-implementation-example)
9. [Migration from Legacy Patterns](#migration-from-legacy-patterns)

---

## Overview

Modern context engineering (2026) is fundamentally different from early approaches (2023). The shift is from **manual orchestration** to **autonomous reasoning**, from **synthetic metrics** to **real validation**, and from **sequential execution** to **intelligent parallelization**.

### What Changed?

| Pattern | 2023 Approach | 2026 Approach |
|---------|---------------|---------------|
| **Tools** | Implement `execute()` functions | Declarative interfaces with rich semantics |
| **Context** | Manual priority tagging | Semantic search + dynamic retrieval |
| **Validation** | Quality scores (0.0-1.0) | Real errors, test failures, actual bugs |
| **Execution** | Sequential tool calls | Parallel batching with dependency analysis |
| **Feedback** | Statistical analysis | Validation-driven progressive refinement |
| **Delegation** | Explicit handoff docs | Autonomous sub-agent spawning |

---

## Core Principles

### 1. Agents Reason, Don't Follow Scripts

**Old Way:**
```typescript
// Manual orchestration
builder.addSection("database", dbCode, "high");
builder.addSection("config", configCode, "medium");
const context = builder.build();
await model.generate(context);
```

**Modern Way:**
```typescript
// Agent-driven discovery
"Refactor the database connection layer to use connection pooling"

// Agent autonomously:
// 1. Semantic searches for "database connection"
// 2. Greps for Connection/Pool patterns
// 3. Reads relevant files in parallel
// 4. Analyzes implementation
// 5. Proposes refactoring
```

### 2. Validation Over Metrics

**Old Way:**
```typescript
return {
  success: true,
  outputQuality: 0.85, // Who decides this?
  confidence: "high"   // Subjective!
};
```

**Modern Way:**
```typescript
return {
  syntaxValid: (await get_errors()).length === 0,  // Objective!
  testsPass: await runTests(),                     // Objective!
  behaviorCorrect: await verifyExpectedOutput()    // Objective!
};
```

### 3. Progressive Refinement

**Old Way:**
```typescript
// One-shot attempt
const result = await generateCode(spec);
if (!result.success) {
  return "Failed";
}
return result;
```

**Modern Way:**
```typescript
// Iterative refinement
let attempt = 0;
while (attempt < maxAttempts) {
  await implementFeature(spec);
  const validation = await validate();
  
  if (validation.allPass) {
    return success();
  }
  
  // Read actual errors and fix
  const errors = await getErrorDetails();
  spec = adjustBasedOnErrors(spec, errors);
  attempt++;
}
```

### 4. Parallel Thinking

**Old Way:**
```typescript
// Sequential
const file1 = await read_file("a.ts");
const file2 = await read_file("b.ts");
const file3 = await read_file("c.ts");
// Takes 3x time
```

**Modern Way:**
```typescript
// Parallel batching
const [file1, file2, file3] = await Promise.all([
  read_file("a.ts"),
  read_file("b.ts"),
  read_file("c.ts")
]);
// Takes 1x time
```

---

## Setting Up Your Repository

### Directory Structure

```
your-project/
├── .cursorrules                    # Context for Cursor AI
├── .github/
│   ├── copilot-instructions.md    # Instructions for GitHub Copilot
│   └── workflows/
│       └── validate.yml           # CI validation
├── .vscode/
│   ├── settings.json              # Editor configuration
│   └── extensions.json            # Recommended extensions
├── docs/
│   ├── ARCHITECTURE.md            # System design for agents
│   ├── CONVENTIONS.md             # Code style rules
│   ├── PATTERNS.md                # Common patterns
│   └── SETUP.md                   # Environment setup
├── src/
│   └── (your code)
└── tests/
    └── (your tests)
```

### 1. Create Context Files

#### `.cursorrules` (for Cursor AI)

```markdown
# Project Context for AI Agents

## Architecture
This is a TypeScript/Node.js backend using:
- Express for API routing
- PostgreSQL with connection pooling
- Jest for testing
- ESLint + TypeScript for validation

## File Organization
- `/src/routes` - API endpoint handlers (thin layer)
- `/src/services` - Business logic (thick layer)
- `/src/models` - Database models and schemas
- `/src/middleware` - Express middleware
- `/src/utils` - Shared utilities

## Code Conventions

### Async/Await
Always use async/await, never callbacks:
```typescript
// ✅ Good
async function getUser(id: string) {
  return await db.query('SELECT * FROM users WHERE id = $1', [id]);
}

// ❌ Bad
function getUser(id: string, callback) {
  db.query('SELECT * FROM users WHERE id = $1', [id], callback);
}
```

### Error Handling
Use typed errors and centralized error middleware:
```typescript
// Custom error classes
class ValidationError extends Error {
  constructor(message: string, public field: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

// Always throw typed errors
if (!email.includes('@')) {
  throw new ValidationError('Invalid email format', 'email');
}

// Centralized error handler catches them
app.use((err, req, res, next) => {
  if (err instanceof ValidationError) {
    return res.status(400).json({ error: err.message, field: err.field });
  }
  // ...
});
```

### Database Queries
Always use parameterized queries:
```typescript
// ✅ Good - parameterized
await db.query('SELECT * FROM users WHERE email = $1', [email]);

// ❌ Bad - SQL injection risk
await db.query(`SELECT * FROM users WHERE email = '${email}'`);
```

## Adding New Features

### When adding a new API endpoint:
1. Create route handler in `/src/routes/<feature>Route.ts`
2. Implement business logic in `/src/services/<feature>Service.ts`
3. Add tests in `/__tests__/<feature>.test.ts`
4. Update OpenAPI spec in `/docs/api.yaml`
5. Run validation: `npm run validate`

### When modifying database schema:
1. Create migration in `/migrations/<timestamp>_<description>.sql`
2. Update models in `/src/models`
3. Update tests to reflect schema changes
4. Test locally before committing

## Testing Expectations
- All API endpoints must have tests
- Tests should cover: success case, error cases, edge cases
- Use supertest for API testing
- Mock external services
- Aim for >80% code coverage

## Common Patterns

### Service Layer Pattern
```typescript
// services/userService.ts
export class UserService {
  async createUser(data: CreateUserDto) {
    // 1. Validate input
    if (!data.email.includes('@')) {
      throw new ValidationError('Invalid email', 'email');
    }
    
    // 2. Check business rules
    const existing = await db.query('SELECT * FROM users WHERE email = $1', [data.email]);
    if (existing.rows.length > 0) {
      throw new ConflictError('User already exists');
    }
    
    // 3. Perform operation
    const result = await db.query(
      'INSERT INTO users (email, name) VALUES ($1, $2) RETURNING *',
      [data.email, data.name]
    );
    
    return result.rows[0];
  }
}
```

### Route Handler Pattern
```typescript
// routes/userRoute.ts
import { UserService } from '../services/userService';

const userService = new UserService();

router.post('/users', async (req, res, next) => {
  try {
    const user = await userService.createUser(req.body);
    res.status(201).json(user);
  } catch (error) {
    next(error); // Let error middleware handle it
  }
});
```
```

#### `.github/copilot-instructions.md`

```markdown
# GitHub Copilot Instructions

## Project Context
This is a TypeScript backend with Express, PostgreSQL, and Jest.

## Style Guide
- Use async/await (not callbacks)
- Use parameterized database queries
- Use typed errors (ValidationError, NotFoundError, etc.)
- Follow REST conventions for API endpoints

## When Suggesting Code
- Include error handling
- Add TypeScript types
- Include basic validation
- Add JSDoc comments for public functions

## Common Tasks
- New endpoint: Create route + service + tests
- Database query: Always parameterized
- Error handling: Throw typed errors
```

### 2. Configure Validation

#### `package.json`

```json
{
  "name": "your-project",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "test": "jest",
    "test:watch": "jest --watch",
    "lint": "eslint src/",
    "lint:fix": "eslint src/ --fix",
    "type-check": "tsc --noEmit",
    "validate": "npm run lint && npm run type-check && npm run test",
    "format": "prettier --write 'src/**/*.ts'"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "@typescript-eslint/eslint-plugin": "^6.0.0",
    "@typescript-eslint/parser": "^6.0.0",
    "eslint": "^8.0.0",
    "jest": "^29.0.0",
    "prettier": "^3.0.0",
    "typescript": "^5.0.0"
  }
}
```

#### `tsconfig.json` (Strict Type Checking)

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "node",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "outDir": "./dist"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

#### `.eslintrc.json`

```json
{
  "parser": "@typescript-eslint/parser",
  "extends": [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended"
  ],
  "rules": {
    "no-console": "warn",
    "no-unused-vars": "off",
    "@typescript-eslint/no-unused-vars": ["error", { 
      "argsIgnorePattern": "^_" 
    }],
    "@typescript-eslint/explicit-function-return-type": "warn",
    "@typescript-eslint/no-explicit-any": "error"
  }
}
```

### 3. Setup CI/CD Validation

#### `.github/workflows/validate.yml`

```yaml
name: Validate Code
on: [push, pull_request]

jobs:
  validate:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run linter
        run: npm run lint
      
      - name: Type check
        run: npm run type-check
      
      - name: Run tests
        run: npm run test
      
      - name: Check formatting
        run: npx prettier --check 'src/**/*.ts'
```

---

## Tool System Design

### Modern Tool Pattern (Declarative)

```typescript
// tools/modernTools.ts

export interface ModernTool {
  name: string;
  description: string; // Rich semantic description
  useCases: string[];  // When to use this tool
  parameters: Array<{
    name: string;
    type: string;
    description: string;
    required: boolean;
    examples?: string[];
    constraints?: {
      pattern?: string;
      enum?: string[];
    };
  }>;
  returns: {
    description: string;
    properties: Record<string, string>;
  };
  constraints: {
    canParallelize: boolean;
    requiresValidation: boolean;
    canRetry: boolean;
  };
}

// Example: File reading tool
export const readFileTool: ModernTool = {
  name: 'read_file',
  description: 'Read contents of a file from the filesystem. Use for understanding code, checking implementations, or gathering context.',
  
  useCases: [
    'Understanding how a feature is implemented',
    'Reading configuration files',
    'Checking function signatures before calling them',
    'Gathering context before making changes'
  ],
  
  parameters: [
    {
      name: 'filePath',
      type: 'string',
      description: 'Absolute path to the file to read',
      required: true,
      examples: [
        'c:/projects/myapp/src/index.ts',
        '/home/user/app/config.json'
      ]
    },
    {
      name: 'startLine',
      type: 'number',
      description: 'Line number to start reading from (1-indexed)',
      required: true
    },
    {
      name: 'endLine',
      type: 'number',
      description: 'Line number to stop reading at (1-indexed, inclusive)',
      required: true
    }
  ],
  
  returns: {
    description: 'File contents between specified lines',
    properties: {
      content: 'The actual file content',
      totalLines: 'Total number of lines in the file'
    }
  },
  
  constraints: {
    canParallelize: true,  // Can read multiple files at once
    requiresValidation: false,
    canRetry: true
  }
};
```

### Tool Context Generation

```typescript
// Generate context for agent system prompts
export function generateToolContext(tools: ModernTool[]): string {
  let context = '# Available Tools\n\n';
  
  for (const tool of tools) {
    context += `## ${tool.name}\n`;
    context += `${tool.description}\n\n`;
    
    context += '**When to use:**\n';
    tool.useCases.forEach(useCase => {
      context += `- ${useCase}\n`;
    });
    
    context += '\n**Parameters:**\n';
    tool.parameters.forEach(param => {
      const req = param.required ? 'required' : 'optional';
      context += `- \`${param.name}\` (${param.type}, ${req}): ${param.description}\n`;
      if (param.examples) {
        context += `  Examples: ${param.examples.join(', ')}\n`;
      }
    });
    
    context += '\n**Constraints:**\n';
    context += `- Can parallelize: ${tool.constraints.canParallelize ? '✅' : '❌'}\n`;
    context += `- Requires validation: ${tool.constraints.requiresValidation ? '✅' : '❌'}\n\n`;
    context += '---\n\n';
  }
  
  return context;
}
```

---

## Context Management

### Modern Semantic Discovery

```typescript
// Modern approach: Let agent discover context
export class ModernContextManager {
  async gatherContextFor(task: string): Promise<ContextData> {
    console.log(`🔍 Discovering context for: ${task}`);
    
    // Agent reasons about what it needs
    // Then batches independent queries
    const [
      relevantCode,
      fileStructure,
      relatedTests
    ] = await Promise.all([
      this.semanticSearch(task),
      this.exploreFileStructure(),
      this.findRelatedTests(task)
    ]);
    
    return {
      code: relevantCode,
      structure: fileStructure,
      tests: relatedTests,
      relevanceScore: this.calculateRelevance(relevantCode, task)
    };
  }
  
  private async semanticSearch(query: string): Promise<CodeSnippet[]> {
    // Use semantic_search tool provided by environment
    return await semantic_search(query);
  }
  
  private async exploreFileStructure(): Promise<FileTree> {
    // Parallel exploration
    const [srcTree, testTree, docsTree] = await Promise.all([
      list_dir('src/'),
      list_dir('tests/'),
      list_dir('docs/')
    ]);
    
    return { src: srcTree, tests: testTree, docs: docsTree };
  }
}
```

---

## Feedback & Validation

### Validation-Driven Loop

```typescript
export class ValidationFeedbackLoop {
  async executeWithValidation(
    task: () => Promise<void>,
    maxAttempts = 3
  ): Promise<ExecutionResult> {
    let attempt = 0;
    
    while (attempt < maxAttempts) {
      attempt++;
      console.log(`\n🔄 Attempt ${attempt}/${maxAttempts}`);
      
      // Execute the task
      await task();
      
      // Validate with real checks
      const validation = await this.validate();
      
      if (validation.allPass) {
        console.log(`✅ Success on attempt ${attempt}`);
        return { success: true, attempts: attempt };
      }
      
      // Failed - analyze actual errors
      console.log(`⚠️ Validation failed:`);
      for (const error of validation.errors) {
        console.log(`   ${error.file}:${error.line} - ${error.message}`);
      }
      
      if (attempt < maxAttempts) {
        // Fix based on actual errors
        await this.fixErrors(validation.errors);
      }
    }
    
    return { success: false, attempts: maxAttempts };
  }
  
  private async validate(): Promise<ValidationResult> {
    // Run multiple validation checks in parallel
    const [syntaxErrors, testResults, typeErrors] = await Promise.all([
      get_errors(),
      this.runTests(),
      this.typeCheck()
    ]);
    
    return {
      allPass: syntaxErrors.length === 0 && testResults.passed && typeErrors.length === 0,
      errors: [...syntaxErrors, ...testResults.failures, ...typeErrors]
    };
  }
  
  private async fixErrors(errors: Error[]): Promise<void> {
    // Read error context and fix
    for (const error of errors.slice(0, 3)) { // Fix top 3
      const context = await read_file(error.file, error.line - 5, error.line + 5);
      const fix = this.generateFix(error, context);
      await this.applyFix(error.file, fix);
    }
  }
}
```

---

## Agent Delegation

### Autonomous Sub-Agent Pattern

```typescript
export class AgentDelegator {
  async delegateComplexSearch(searchGoal: string): Promise<SearchReport> {
    console.log(`🚀 Spawning sub-agent for: ${searchGoal}`);
    
    // Launch autonomous sub-agent
    const report = await runSubagent({
      description: `Search: ${searchGoal}`,
      prompt: `
        Your mission: Find all occurrences of ${searchGoal} in this codebase.
        
        Work autonomously. Try multiple strategies:
        1. Semantic search with various phrasings
        2. Grep search with different patterns
        3. Check common file locations
        4. Read and analyze found files
        
        For each finding:
        - Note exact file path and line number
        - Extract relevant code snippet
        - Understand the context
        
        Return a comprehensive report with:
        - All findings organized by file
        - Summary of patterns found
        - Recommendations based on analysis
        
        Work independently. Try different approaches until you have
        complete coverage. Return only when you're confident you've
        found everything.
      `
    });
    
    // Process sub-agent's findings
    console.log(`✅ Sub-agent completed search`);
    return JSON.parse(report);
  }
}
```

---

## Complete Implementation Example

### Scenario: Add Authentication to Existing API

```typescript
import { ModernContextManager } from './contextManager';
import { ValidationFeedbackLoop } from './validationLoop';
import { AgentDelegator } from './agentDelegator';

export class AuthenticationImplementor {
  private contextManager = new ModernContextManager();
  private validator = new ValidationFeedbackLoop();
  private delegator = new AgentDelegator();
  
  async addAuthentication(): Promise<void> {
    console.log('🔐 Adding authentication to API');
    
    // Step 1: Research existing patterns (sub-agent)
    const existingPatterns = await this.delegator.delegateComplexSearch(
      'authentication and middleware patterns'
    );
    
    // Step 2: Gather context in parallel
    const [routes, middleware, config] = await Promise.all([
      this.contextManager.semanticSearch('API route handlers'),
      read_file('src/middleware/index.ts', 1, 999),
      read_file('src/config/index.ts', 1, 999)
    ]);
    
    // Step 3: Implement with validation loop
    await this.validator.executeWithValidation(async () => {
      // Create auth middleware
      await create_file('src/middleware/auth.ts', this.generateAuthMiddleware());
      
      // Create JWT utils
      await create_file('src/utils/jwt.ts', this.generateJWTUtils());
      
      // Update route handlers
      await this.addAuthToRoutes(routes);
      
      // Add auth tests
      await create_file('tests/auth.test.ts', this.generateAuthTests());
    });
    
    // Step 4: Verify everything works
    const finalValidation = await this.validator.validate();
    
    if (finalValidation.allPass) {
      console.log('✅ Authentication successfully added');
    } else {
      throw new Error('Authentication validation failed');
    }
  }
  
  private generateAuthMiddleware(): string {
    return `
import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt';

export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    res.status(401).json({ error: 'No token provided' });
    return;
  }
  
  try {
    const decoded = await verifyToken(token);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
}
`.trim();
  }
  
  private async addAuthToRoutes(routes: CodeSnippet[]): Promise<void> {
    const edits = routes.map(route => ({
      filePath: route.file,
      oldString: route.content,
      newString: this.addAuthMiddleware(route.content),
      explanation: 'Add authentication middleware'
    }));
    
    await multi_replace_string_in_file({ replacements: edits });
  }
}

// Usage
const implementor = new AuthenticationImplementor();
await implementor.addAuthentication();
```

---

## Migration from Legacy Patterns

### Checklist

- [ ] **Remove manual priority tagging** → Use semantic search
- [ ] **Replace quality scores** → Use real validation (errors, tests)
- [ ] **Eliminate execute() functions** → Use declarative tool definitions
- [ ] **Add parallel batching** → Identify independent operations
- [ ] **Implement validation loops** → Progressive refinement with retries
- [ ] **Setup error checking** → TypeScript strict mode, ESLint, tests
- [ ] **Add context files** → .cursorrules, copilot-instructions.md
- [ ] **Create CI validation** → GitHub Actions workflow

### Quick Wins

1. **Add validation to your workflow:**
   ```bash
   npm install --save-dev typescript eslint jest
   npm run validate  # After every change
   ```

2. **Use semantic search instead of manual context:**
   ```typescript
   // ❌ Old
   context.add("database code", dbCode, "high");
   
   // ✅ New
   const dbCode = await semantic_search("database connection");
   ```

3. **Batch your reads:**
   ```typescript
   // ❌ Old
   const a = await read("a.ts");
   const b = await read("b.ts");
   
   // ✅ New
   const [a, b] = await Promise.all([read("a.ts"), read("b.ts")]);
   ```

---

## Best Practices

1. **Let agents drive context discovery** - Don't pre-build context manually
2. **Use real validation** - Syntax errors, test failures, not quality scores
3. **Batch independent operations** - Parallel reads, sequential writes
4. **Validate immediately after changes** - Catch errors early
5. **Use progressive refinement** - Edit → Validate → Fix → Repeat
6. **Spawn sub-agents for complex research** - Let them work autonomously
7. **Keep context in files** - .cursorrules, not scattered comments
8. **Setup strict validation** - TypeScript, ESLint, tests in CI

---

## Additional Resources

- [WORKFLOWS.md](./WORKFLOWS.md) - Modern workflow examples
- [Tool Definitions](../../src/tools/toolDefinitions.ts) - Declarative tool patterns
- [Feedback Loop](../../src/feedback/feedbackLoop.ts) - Validation-driven feedback
- [Model Context Protocol](https://modelcontextprotocol.io/) - Standard for AI context
