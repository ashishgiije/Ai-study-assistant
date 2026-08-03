import express from 'express';
import proxy from 'express-http-proxy';

export const apiRouter = express.Router();

const PYTHON_BACKEND_URL = process.env.PYTHON_BACKEND_URL || 'http://127.0.0.1:8001';

// Proxy all /api routes directly to the Python FastAPI backend (backend_python)
apiRouter.use('/', proxy(PYTHON_BACKEND_URL, {
  timeout: 300000, // 5 minutes timeout for file uploads and vector embeddings
  parseReqBody: false, // Don't parse body in express proxy, pass stream directly to FastAPI
  proxyReqPathResolver: (req) => {
    return `/api${req.url}`;
  },
  proxyErrorHandler: (err, res) => {
    console.error('[EduMind Proxy Error]:', err);
    res.status(503).json({
      error: 'EduMind AI Python RAG backend is initializing or busy. Please try again in a moment.'
    });
  }
}));

