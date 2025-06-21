// connect-token-server.ts
import express, { Request, Response } from 'express';
import { createBackendClient } from '@pipedream/sdk/server';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const port = 3001;

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

app.listen(port, () => {
  console.log(`🚀 Connect Token Server: http://localhost:${port}`);
});
