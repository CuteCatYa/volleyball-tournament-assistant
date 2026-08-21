/**
 * 同步核心确定性引擎到各云函数目录。
 * 云函数部署单元互相隔离，不能 require 目录外的文件；部署前把根 /core（唯一事实来源）拷贝进需要的云函数。
 * 用法：node scripts/sync-core.mjs
 */
import { cpSync, mkdirSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const coreDir = join(root, 'core');
const cloudDir = join(root, 'cloudfunctions');

const targets = ['login', 'event', 'register', 'draw', 'schedule', 'score', 'document', 'notify', 'ai-gateway'];

if (!existsSync(coreDir)) {
  console.error('未找到 /core 目录');
  process.exit(1);
}

const files = readdirSync(coreDir).filter((f) => f.endsWith('.js') && !f.endsWith('.test.js'));

for (const fn of targets) {
  const dest = join(cloudDir, fn, 'core');
  mkdirSync(dest, { recursive: true });
  for (const f of files) cpSync(join(coreDir, f), join(dest, f));
}

console.log(`已同步 core（${files.join(', ')}）→ ${targets.join(', ')}`);