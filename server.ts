import express from 'express';
import path from 'path';
import { spawn } from 'child_process';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import http from 'http';
import { apiRouter } from './src/server/backend';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const PYTHON_PORT = process.env.PYTHON_PORT || 8001;

let pythonProcess: ReturnType<typeof spawn> | null = null;
let pythonReady = false;

function startPythonBackend() {
  console.log('[EduMind Server] Starting Python FastAPI backend (backend_python)...');
  const pythonExecutable = process.platform === 'win32' ? 'python' : 'python3';
  pythonProcess = spawn(pythonExecutable, [
    '-m', 'uvicorn', 'src.backend_python.main:app',
    '--host', '127.0.0.1',
    '--port', String(PYTHON_PORT)
  ], {
    stdio: 'inherit',
    env: { ...process.env },
  });

  pythonProcess.on('error', (err) => {
    console.error('[EduMind Server] Error spawning Python backend:', err);
  });

  pythonProcess.on('exit', (code, signal) => {
    pythonReady = false;
    console.warn(`[EduMind Server] Python backend process exited with code ${code}, signal ${signal}`);
    // Auto-restart Python backend if it crashes unexpectedly (unless terminated by signal)
    if (code !== 0 && code !== null && signal !== 'SIGTERM' && signal !== 'SIGINT') {
      console.log('[EduMind Server] Auto-restarting Python backend in 5 seconds...');
      setTimeout(startPythonBackend, 5000);
    }
  });

  // Poll Python /health until it responds, then mark pythonReady = true
  waitForPythonBackend();
}

function waitForPythonBackend(maxAttempts = 60, intervalMs = 2000) {
  let attempts = 0;
  const check = () => {
    const req = http.get(`http://127.0.0.1:${PYTHON_PORT}/health`, (res) => {
      if (res.statusCode === 200) {
        pythonReady = true;
        console.log('[EduMind Server] ✅ Python FastAPI backend is ready and healthy!');
      } else {
        retry();
      }
    });
    req.on('error', retry);
    req.setTimeout(2000, () => { req.destroy(); retry(); });
  };

  const retry = () => {
    attempts++;
    if (attempts < maxAttempts) {
      if (attempts % 5 === 0) {
        console.log(`[EduMind Server] Waiting for Python backend... (attempt ${attempts}/${maxAttempts})`);
      }
      setTimeout(check, intervalMs);
    } else {
      console.error('[EduMind Server] ❌ Python backend did not become ready in time. Check logs.');
    }
  };

  setTimeout(check, 2000);
}

startPythonBackend();

// Graceful process shutdown handling to prevent orphan python processes and SIGTERM crash logs
const handleShutdown = (signal: string) => {
  console.log(`[EduMind Server] Received ${signal}. Shutting down services cleanly...`);
  if (pythonProcess) {
    pythonProcess.kill('SIGTERM');
    pythonProcess = null;
  }
  process.exit(0);
};

process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));

// Mount API routes FIRST so proxy gets unconsumed raw body streams
app.use('/api', apiRouter);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    pythonBackendReady: pythonReady,
    service: 'EduMind AI Express & Python FastAPI RAG Backend'
  });
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== 'true',
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`EduMind AI Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();

