import fs from 'node:fs';
import path from 'node:path';
import express, { type NextFunction, type Request, type Response } from 'express';
import helmet from 'helmet';
import { config } from './config';
import { initDatabase } from './db';
import { publicRouter } from './routes/public.routes';
import { adminRouter } from './routes/admin.routes';
import { ApiError, errorBody } from './utils/http';

async function start(): Promise<void> {
  await initDatabase();

  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:'],
          fontSrc: ["'self'", 'data:'],
          connectSrc: ["'self'"],
          objectSrc: ["'none'"],
          frameAncestors: ["'none'"],
          baseUri: ["'self'"],
          formAction: ["'self'"],
        },
      },
      crossOriginEmbedderPolicy: false,
    }),
  );
  app.use(express.json({ limit: '100kb' }));

  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      service: 'credvault',
      environment: config.nodeEnv,
      time: new Date().toISOString(),
    });
  });

  app.use('/api/admin', adminRouter);
  app.use('/api', publicRouter);

  app.use('/api', (_req, res) => {
    res.status(404).json(errorBody('API endpoint not found.'));
  });

  const indexHtml = path.join(config.clientDist, 'index.html');
  if (fs.existsSync(indexHtml)) {
    app.use(
      express.static(config.clientDist, {
        index: false,
        maxAge: '1h',
        setHeaders: (res, filePath) => {
          if (filePath.endsWith('index.html')) res.setHeader('Cache-Control', 'no-cache');
        },
      }),
    );
    // SPA fallback: any non-API GET renders the React application.
    app.use((req, res, next) => {
      if (req.method !== 'GET' && req.method !== 'HEAD') return next();
      if (req.path.startsWith('/api')) return next();
      res.setHeader('Cache-Control', 'no-cache');
      res.sendFile(indexHtml);
    });
  } else {
    app.use((_req, res) => {
      res
        .status(503)
        .type('text/plain')
        .send('CredVault frontend has not been built yet. Run "npm run build" and restart the server.');
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof ApiError) {
      res.status(err.status).json(errorBody(err.message, err.errors));
      return;
    }

    const maybeBodyError = err as { type?: string; status?: number };
    if (maybeBodyError?.type === 'entity.parse.failed') {
      res.status(400).json(errorBody('The request body is not valid JSON.'));
      return;
    }

    // eslint-disable-next-line no-console
    console.error('[credvault] Unhandled error:', err);
    res.status(500).json(errorBody('Something went wrong on the server. Please try again.'));
  });

  const server = app.listen(config.port, '0.0.0.0', () => {
    // eslint-disable-next-line no-console
    console.log(`[credvault] Server listening on http://0.0.0.0:${config.port} (${config.nodeEnv})`);
  });

  const shutdown = (signal: string) => {
    // eslint-disable-next-line no-console
    console.log(`[credvault] ${signal} received, shutting down.`);
    server.close(() => process.exit(0));
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

start().catch((error) => {
  // eslint-disable-next-line no-console
  console.error('[credvault] Failed to start server:', error);
  process.exit(1);
});
