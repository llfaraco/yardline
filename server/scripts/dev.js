import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const dataDirectory = new URL('../data/local-development/', import.meta.url);
fs.mkdirSync(dataDirectory, { recursive: true });
process.env.PORT ||= '3000';
if (!/^\d+$/.test(process.env.PORT) || Number(process.env.PORT) < 1 || Number(process.env.PORT) > 65535) throw new Error('PORT inválida.');
process.env.DATABASE_PATH ||= fileURLToPath(new URL(`yardline-${process.env.PORT}.db`, dataDirectory));
process.env.YARDLINE_DEV_PREVIEW = '1';
const { app } = await import('../src/server.js');
const server = app.listen(Number(process.env.PORT), '127.0.0.1');
server.on('listening', () => {
  console.log(`Yardline desenvolvimento: http://127.0.0.1:${process.env.PORT}`);
  console.log('Alterações salvas recarregam a página automaticamente.');
});
server.on('error', error => { console.error(error.message); process.exitCode = 1; });
