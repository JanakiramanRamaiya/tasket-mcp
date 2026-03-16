import express from 'express';
import { randomUUID } from 'crypto';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { createVerifier } from './auth.js';
import { TasketApiClient } from './api-client.js';
import { registerAllTools } from './tools.js';

// ── Config ──────────────────────────────────────────────────────────────────
const PORT = Number(process.env.PORT ?? 3002);
const TASKET_API_URL = process.env.TASKET_API_URL ?? 'http://localhost:3001';
const AUTH_JWKS_URL = process.env.AUTH_JWKS_URL ?? 'http://localhost:3000/.well-known/jwks.json';
const AUTH_ISSUER = process.env.AUTH_ISSUER ?? 'http://localhost:3000';
const AUTH_BASE_URL = process.env.AUTH_BASE_URL ?? 'http://localhost:3000';
const TASKET_MCP_URL = process.env.TASKET_MCP_URL ?? `http://localhost:${PORT}`;

// ── Singletons ──────────────────────────────────────────────────────────────
const verifyToken = createVerifier(AUTH_JWKS_URL, AUTH_ISSUER);
const apiClient = new TasketApiClient(TASKET_API_URL);

interface Session {
  transport: StreamableHTTPServerTransport;
  server: McpServer;
}
const sessions = new Map<string, Session>();

// ── Express app ─────────────────────────────────────────────────────────────
const app = express();
app.use(express.json());

app.use((req, _res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// Bearer auth middleware
async function requireAuth(req: any, res: any, next: any) {
  const authHeader = req.headers.authorization as string | undefined;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401)
      .setHeader('WWW-Authenticate',
        `Bearer resource_metadata="${AUTH_BASE_URL}/.well-known/oauth-protected-resource/mcp"`)
      .json({ error: 'unauthorized', error_description: 'Bearer token required' });
    return;
  }
  try {
    const token = authHeader.slice(7);
    const auth = await verifyToken(token);
    req.auth = auth;
    req.bearerToken = token;
    next();
  } catch (err: any) {
    res.status(401).json({ error: 'invalid_token', error_description: err.message ?? 'Token invalid or expired' });
  }
}

// ── Protected resource metadata ──────────────────────────────────────────────
app.get('/.well-known/oauth-protected-resource/mcp', (_req, res) => {
  res.json({
    resource: `${TASKET_MCP_URL}/mcp`,
    authorization_servers: [AUTH_BASE_URL],
    scopes_supported: ['read', 'write'],
    bearer_methods_supported: ['header'],
  });
});

// ── Health check ─────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', sessions: sessions.size });
});

// ── MCP routes ───────────────────────────────────────────────────────────────
app.post('/mcp', requireAuth, async (req: any, res) => {
  const sessionId = req.headers['mcp-session-id'] as string | undefined;

  // Resume existing session
  if (sessionId && sessions.has(sessionId)) {
    const session = sessions.get(sessionId)!;
    await session.transport.handleRequest(req, res, req.body);
    return;
  }

  // New session
  const token = req.bearerToken as string;
  let newSessionId: string;

  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: () => {
      newSessionId = randomUUID();
      return newSessionId;
    },
    onsessioninitialized: (id) => {
      sessions.set(id, { transport, server });
    },
  });

  transport.onclose = () => {
    const id = [...sessions.entries()].find(([, v]) => v.transport === transport)?.[0];
    if (id) sessions.delete(id);
  };

  const server = new McpServer(
    { name: 'tasket', version: '1.0.0' },
    { capabilities: { tools: {}, resources: {} } },
  );
  registerAllTools(server, apiClient, token);

  await server.connect(transport);
  await transport.handleRequest(req, res, req.body);
});

app.get('/mcp', requireAuth, async (req: any, res) => {
  const session = sessions.get(req.headers['mcp-session-id'] as string);
  if (!session) return res.status(400).json({ error: 'No active session' });
  await session.transport.handleRequest(req, res);
});

app.delete('/mcp', requireAuth, async (req: any, res) => {
  const sessionId = req.headers['mcp-session-id'] as string;
  const session = sessions.get(sessionId);
  if (!session) return res.status(404).json({ error: 'Session not found' });
  await session.transport.handleRequest(req, res);
  sessions.delete(sessionId);
});

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`tasket-mcp listening on port ${PORT}`);
  console.log(`  MCP endpoint : ${TASKET_MCP_URL}/mcp`);
  console.log(`  Auth server  : ${AUTH_BASE_URL}`);
  console.log(`  API backend  : ${TASKET_API_URL}`);
});
