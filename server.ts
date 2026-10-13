import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { handleApiRequest } from './src/server/apiRouter.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  // Parse JSON bodies up to 15MB
  app.use(express.json({ limit: '15mb' }));

  // CORS headers
  app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') {
      res.sendStatus(204);
      return;
    }
    next();
  });

  // Dedicated API router
  app.use('/api', async (req, res, next) => {
    try {
      const handled = await handleApiRequest(req, res);
      if (!handled) {
        next();
      }
    } catch (err) {
      next(err);
    }
  });

  const isProduction =
    process.env.NODE_ENV === 'production' ||
    process.argv.includes('--production') ||
    process.env.AIS_DEPLOYMENT === 'true';

  const distPath = path.resolve(__dirname, 'dist');

  if (!isProduction) {
    try {
      const { createServer: createViteServer } = await import('vite');
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'spa',
        root: __dirname,
      });

      // Mount Vite middleware for dev assets
      app.use(vite.middlewares);

      // Serve transformed index.html for SPA client navigation
      app.use('*', async (req, res, next) => {
        if (req.originalUrl.startsWith('/api')) {
          return next();
        }
        try {
          const indexPath = path.resolve(__dirname, 'index.html');
          let template = fs.readFileSync(indexPath, 'utf-8');
          template = await vite.transformIndexHtml(req.originalUrl, template);
          res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
        } catch (e: any) {
          vite.ssrFixStacktrace(e);
          next(e);
        }
      });

      console.log('[Abhyaas Server] Vite dev middleware & HTML transformer mounted');
    } catch (err) {
      console.warn('[Abhyaas Server] Vite dev mode fallback to dist:', err);
      app.use(express.static(distPath));
      app.get('*', (_req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    }
  } else {
    // Production mode: serve pre-built dist
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Abhyaas Connect server running on http://0.0.0.0:${PORT} (Production: ${isProduction})`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
