import express from 'express';
import path from 'path';
import { spawn } from 'child_process';
import { createServer as createViteServer } from 'vite';
import { apiRouter } from './src/server/backend';

const app = express();
const PORT = 3000;
const PYTHON_PORT = 8001;

let pythonProcess: ReturnType<typeof spawn> | null = null;

function startPythonBackend() {
  console.log('[EduMind Server] Starting Python FastAPI backend (backend_python)...');
  pythonProcess = spawn('python3', [
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
    console.warn(`[EduMind Server] Python backend process exited with code ${code}, signal ${signal}`);
  });
}

startPythonBackend();

// Mount API routes FIRST so proxy gets unconsumed raw body streams
app.use('/api', apiRouter);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'EduMind AI Express & Python FastAPI RAG Backend' });
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

