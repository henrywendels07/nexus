import { Router } from 'express';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const router = Router();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOAD_DIR = path.join(__dirname, '../../uploads');
fs.mkdir(UPLOAD_DIR, { recursive: true }).catch(() => {});

export function setupFileRoutes() {
  router.get('/list', async (req, res) => {
    try {
      const dirPath = req.query.path as string || process.env.HOME || '/workspace';
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      const files = await Promise.all(entries.map(async (entry) => {
        try {
          const fullPath = path.join(dirPath, entry.name);
          const stats = await fs.stat(fullPath);
          return { name: entry.name, path: fullPath, type: entry.isDirectory() ? 'directory' : 'file', size: stats.size, modified: stats.mtime.toISOString(), isDirectory: entry.isDirectory() };
        } catch { return null; }
      }));
      res.json({ path: dirPath, files: files.filter(Boolean) });
    } catch { res.status(500).json({ error: 'Failed to list directory' }); }
  });

  router.get('/read', async (req, res) => {
    try {
      const filePath = req.query.path as string;
      if (!filePath) return res.status(400).json({ error: 'File path required' });
      const stats = await fs.stat(filePath);
      if (stats.isDirectory()) return res.status(400).json({ error: 'Cannot read directory' });
      if (stats.size > 5 * 1024 * 1024) return res.json({ path: filePath, content: '[File too large]', size: stats.size });
      const content = await fs.readFile(filePath, 'utf8');
      res.json({ path: filePath, content, size: stats.size, extension: path.extname(filePath).toLowerCase() });
    } catch { res.status(500).json({ error: 'Failed to read file' }); }
  });

  router.post('/write', async (req, res) => {
    try {
      const { path: filePath, content } = req.body;
      if (!filePath || content === undefined) return res.status(400).json({ error: 'Path and content required' });
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, content, 'utf8');
      res.json({ success: true, path: filePath });
    } catch { res.status(500).json({ error: 'Failed to write file' }); }
  });


  router.post('/mkdir', async (req, res) => {
    try {
      const { path: dirPath } = req.body;
      if (!dirPath) return res.status(400).json({ error: 'Directory path required' });
      await fs.mkdir(dirPath, { recursive: true });
      res.json({ success: true, path: dirPath });
    } catch { res.status(500).json({ error: 'Failed to create directory' }); }
  });

  router.delete('/delete', async (req, res) => {
    try {
      const { path: targetPath, recursive = false } = req.body;
      if (!targetPath) return res.status(400).json({ error: 'Path required' });
      const stats = await fs.stat(targetPath);
      if (stats.isDirectory()) await fs.rm(targetPath, { recursive: true, force: true });
      else await fs.unlink(targetPath);
      res.json({ success: true });
    } catch { res.status(500).json({ error: 'Failed to delete' }); }
  });

  return router;
}