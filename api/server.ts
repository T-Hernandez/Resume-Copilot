import express, { Request, Response } from 'express';
import { handleAnalyzeRequest, InvalidRequestError } from './analyze-handler';
import { handleCompareRequest } from './compare-handler';

// 10mb accounts for base64-encoded PDF/DOCX bodies (base64 runs ~33% larger
// than the source bytes) - plain-text resume/job bodies are a tiny fraction
// of that.
const JSON_BODY_LIMIT = '10mb';

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
  app.use(express.json({ limit: JSON_BODY_LIMIT }));

  app.post('/analyze', handleRoute(handleAnalyzeRequest));
  app.post('/compare', handleRoute(handleCompareRequest));

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
