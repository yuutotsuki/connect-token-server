// connect-token-server.ts
import express, { Request, Response } from 'express';
import { createBackendClient } from '@pipedream/sdk/server';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// ESモジュール用の __dirname 定義
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 環境変数 DOTENV_FILE でenvファイル名を切り替え（デフォルトは.env）
const envFile = process.env.DOTENV_FILE || '.env';
dotenv.config({ path: path.resolve(__dirname, envFile) });

const app = express();
const port = process.env.PORT || 3001;

const pd = createBackendClient({
  environment: process.env.PIPEDREAM_ENVIRONMENT as 'development' | 'production',
  credentials: {
    clientId: process.env.PIPEDREAM_CLIENT_ID!,
    clientSecret: process.env.PIPEDREAM_CLIENT_SECRET!,
  },
  projectId: process.env.PIPEDREAM_PROJECT_ID!,
});

app.get('/connect-token', async (req: Request, res: Response) => {
  try {
    const tokenRes = await pd.createConnectToken({
      external_user_id: process.env.PIPEDREAM_EXTERNAL_USER_ID!,
      allowed_origins: (process.env.ALLOWED_ORIGINS || "http://localhost:3000").split(","),
    });
    res.json(tokenRes); // { token, expires_at, connect_link_url }
  } catch (err) {
    console.error('Token発行エラー:', err);
    res.status(500).json({ error: 'Token発行に失敗しました💦' });
  }
});

// ================================
// Google Access Token (read-only)
// - Logical separation: different route, different API key, scope allowlist, simple rate limit
// - Response: { access_token, expires_in }
// ================================

type Bucket = { count: number; resetAt: number };
const rateBuckets = new Map<string, Bucket>();
const RATE_WINDOW_MS = 60_000; // 1 minute
const RATE_MAX = Number(process.env.GMAIL_TOKEN_RATE_MAX || '60');

function rateLimit(req: Request, res: Response, next: Function) {
  try {
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || (req as any).ip || 'ip:unknown';
    const now = Date.now();
    const b = rateBuckets.get(ip);
    if (!b || now >= b.resetAt) {
      rateBuckets.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
      return next();
    }
    if (b.count >= RATE_MAX) {
      res.setHeader('Retry-After', Math.max(1, Math.floor((b.resetAt - now) / 1000)).toString());
      return res.status(429).json({ error: 'rate_limited' });
    }
    b.count += 1;
    return next();
  } catch {
    return next();
  }
}

type Cache = { token: string; exp: number };
const tokenCache = new Map<string, Cache>(); // keyed by scope
let lock: Promise<void> | null = null;
async function withLock<T>(fn: () => Promise<T>): Promise<T> {
  while (lock) await lock;
  let release!: () => void;
  lock = new Promise<void>((r) => (release = r));
  try { return await fn(); } finally { release(); lock = null; }
}

app.get('/google/access-token', rateLimit as any, async (req: Request, res: Response) => {
  try {
    const AUTH_HEADER = process.env.GMAIL_TOKEN_AUTH_HEADER || 'Authorization';
    const API_KEY = process.env.GMAIL_TOKEN_API_KEY || '';
    const TIMEOUT_MS = Number(process.env.GMAIL_TOKEN_TIMEOUT_MS || '6000');
    const ALLOWED_SCOPES = (process.env.GMAIL_ALLOWED_SCOPES || 'https://www.googleapis.com/auth/gmail.readonly')
      .split(',').map((s) => s.trim()).filter(Boolean);

    // Authn
    const auth = req.header(AUTH_HEADER);
    if (!API_KEY || !auth || auth !== `Bearer ${API_KEY}`) {
      return res.status(401).json({ error: 'unauthorized' });
    }

    // Scope check
    const scope = String((req.query.scope as string) || 'https://www.googleapis.com/auth/gmail.readonly');
    if (!ALLOWED_SCOPES.includes(scope)) {
      return res.status(403).json({ error: 'forbidden_scope' });
    }

    const now = Date.now();
    const cached = tokenCache.get(scope);
    if (cached && cached.exp - 30_000 > now) {
      const ttl = Math.max(1, Math.floor((cached.exp - now) / 1000));
      res.setHeader('Cache-Control', 'no-store');
      return res.json({ access_token: cached.token, expires_in: ttl });
    }

    const result = await withLock(async () => {
      const again = tokenCache.get(scope);
      if (again && again.exp - 30_000 > Date.now()) {
        const ttl = Math.max(1, Math.floor((again.exp - Date.now()) / 1000));
        return { access_token: again.token, expires_in: ttl };
      }

      const clientId = process.env.GOOGLE_CLIENT_ID;
      const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
      const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;
      if (!clientId || !clientSecret || !refreshToken) return null;

      // Use built-in fetch with AbortController for timeout
      const params = new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
        scope,
      });
      const ctrl = new AbortController();
      const to = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
      try {
        const r = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: params.toString(),
          signal: ctrl.signal,
        } as RequestInit);
        if (!r.ok) return null;
        const d: any = await r.json();
        if (typeof d.access_token !== 'string') return null;
        const exp = Date.now() + (typeof d.expires_in === 'number' ? d.expires_in : 1800) * 1000;
        tokenCache.set(scope, { token: d.access_token, exp });
        return { access_token: d.access_token, expires_in: d.expires_in || 1800 };
      } finally {
        clearTimeout(to);
      }
    });

    if (!result) return res.status(500).json({ error: 'token_error' });
    res.setHeader('Cache-Control', 'no-store');
    return res.json(result);
  } catch (e: any) {
    console.error('[google/access-token] error', { message: e?.message });
    return res.status(500).json({ error: 'token_error' });
  }
});

app.listen(port, () => {
  console.log(`🚀 Connect Token Server: http://localhost:${port}`);
});
