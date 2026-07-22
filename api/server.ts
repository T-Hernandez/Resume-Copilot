import * as path from 'path';
import express, { Request, Response } from 'express';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { handleAnalyzeRequest, InvalidRequestError } from './analyze-handler';
import { handleCompareRequest } from './compare-handler';

// 10mb accounts for base64-encoded PDF/DOCX bodies (base64 runs ~33% larger
// than the source bytes) - plain-text resume/job bodies are a tiny fraction
// of that.
const JSON_BODY_LIMIT = '10mb';

// /analyze and /compare both run a full scoring pipeline (and /analyze can
// call the paid Claude API when recommend:true) on a public, unauthenticated
// deployment - without a limit, one client can drive unbounded compute/API
// cost. 20 requests/minute/IP is generous for a human using the form,
// restrictive enough to blunt scripted abuse.
const analysisRateLimit = rateLimit({
  windowMs: 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false
});

// Both routes below need the exact same InvalidRequestError-to-400 mapping -
// factored out once here rather than copy-pasted a second time when
// /compare was added.
function handleRoute(handler: (body: unknown) => Promise<unknown>) {
  return async (req: Request, res: Response) => {
    try {
      const result = await handler(req.body);
      res.status(200).json(result);
    } catch (error) {
      if (error instanceof InvalidRequestError) {
        res.status(400).json({ error: error.message });
        return;
      }
      console.error(error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };
}

export function createServer() {
  const app = express();
  // CSP left at helmet's default (no inline <script>/<style> in public/*,
  // so nothing to relax); everything else is helmet's standard header set.
  app.use(helmet());
  app.use(compression());
  app.use(express.json({ limit: JSON_BODY_LIMIT }));

  // Health check only - not domain behavior. Kept separate from `/` (below)
  // since Render's healthCheckPath (render.yaml) polls this specifically
  // and shouldn't depend on the frontend's static files being present.
  app.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({ status: 'ok' });
  });

  app.post('/analyze', analysisRateLimit, handleRoute(handleAnalyzeRequest));
  app.post('/compare', analysisRateLimit, handleRoute(handleCompareRequest));

  // The frontend (public/index.html + styles.css + app.js) - a thin,
  // vanilla-JS presentation layer over the two routes above, serving GET /
  // by default (express.static's `index` behavior). Previously `/` returned
  // a bare JSON status blob, which is what a portfolio visitor saw when
  // opening the deployed URL in a browser - this replaces that with an
  // actual usable page. No build step, no new dependency: it's just static
  // files served from the same process that already answers /analyze and
  // /compare, so nothing about deployment (Docker, Render) needed to change.
  app.use(express.static(path.join(__dirname, '..', 'public')));

  return app;
}

// Only binds a port when run directly (`npm run api`) - importing
// createServer() from a test must not have a side effect of opening a port.
if (require.main === module) {
  const port = Number(process.env.PORT) || 3000;
  createServer().listen(port, () => {
    console.log(`Resume Copilot API listening on port ${port}`);
  });
}
