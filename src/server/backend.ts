import express from 'express';
import proxy from 'express-http-proxy';

export const apiRouter = express.Router();

const PYTHON_BACKEND_URL = process.env.PYTHON_BACKEND_URL || 'http://127.0.0.1:8001';

// Proxy all /api routes directly to the Python FastAPI backend (backend_python)
apiRouter.use('/', proxy(PYTHON_BACKEND_URL, {
  proxyReqPathResolver: (req) => {
    return `/api${req.url}`;
  },
  proxyErrorHandler: (_err, res) => {
    res.status(503).json({
      error: 'EduMind AI Python RAG backend is initializing. Please try again in a moment.'
    });
  }
}));
