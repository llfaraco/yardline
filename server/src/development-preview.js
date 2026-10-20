import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../yardline-app/', import.meta.url));
const bootId = crypto.randomUUID();

function revision() {
  const hash = crypto.createHash('sha256').update(bootId);
  function visit(directory) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const file = path.join(directory, entry.name);
      if (entry.isDirectory()) visit(file);
      else if (/\.(html|js|css)$/.test(entry.name)) hash.update(file).update(fs.readFileSync(file));
    }
  }
  visit(root);
  return hash.digest('hex');
}

const client = `(() => {
  let current = null;
  async function check() {
    try {
      const response = await fetch('/__dev/revision', { cache: 'no-store' });
      if (!response.ok) return;
      const { revision } = await response.json();
      if (current && current !== revision) { location.reload(); return; }
      current = revision;
    } catch {}
    finally { setTimeout(check, 1000); }
  }
  check();
})();`;

// Mounted only by the explicit development runner; production has no dev routes.
export function developmentPreview() {
  return (req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    if (req.method !== 'GET') return next();
    if (req.path === '/__dev/revision') return res.json({ revision: revision() });
    if (req.path === '/__dev/client.js') return res.type('application/javascript').send(client);
    if (req.path === '/' || req.path === '/index.html') {
      const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
      return res.type('html').send(html.replace('<head>', '<head><script>window.YL_API_BASE = "/api";</script>').replace('</body>', '<script src="/__dev/client.js"></script></body>'));
    }
    next();
  };
}
