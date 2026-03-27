const http = require('node:http');
const path = require('node:path');
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const crypto = require('node:crypto');
const { URL } = require('node:url');
const { DatabaseSync } = require('node:sqlite');

const HOST = process.env.HOST || '127.0.0.1';
const PORT = Number(process.env.PORT || 4173);
const PUBLIC_DIR = process.cwd();
const DB_PATH = process.env.DB_PATH || path.join(PUBLIC_DIR, 'app.db');
const SESSION_TTL_MS = 1000 * 60 * 60 * 24; // 24h
const RESET_TTL_MS = 1000 * 60 * 30; // 30min
const WRITE_ALLOWED_EMAILS = new Set([
  'diego.dsn.erp@alterdata.com.br',
  'diegotere@yahoo.com.br'
]);

fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
const db = new DatabaseSync(DB_PATH);
db.exec('PRAGMA foreign_keys = ON;');
db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  token_hash TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  used_at INTEGER,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS sprints (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  team TEXT NOT NULL DEFAULT '',
  semester TEXT NOT NULL DEFAULT '',
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  manual_planned_points INTEGER NOT NULL DEFAULT 0,
  total_collaborators REAL NOT NULL DEFAULT 0,
  working_days INTEGER NOT NULL DEFAULT 0,
  sprint_observation TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  sprint_id TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT '',
  points INTEGER NOT NULL DEFAULT 0,
  observation TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'Planejada',
  is_completed INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (sprint_id) REFERENCES sprints(id) ON DELETE CASCADE
);
`);

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

function sendJson(res, statusCode, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(body);
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
      if (raw.length > 1_000_000) {
        reject(new Error('Payload muito grande.'));
        req.destroy();
      }
    });
    req.on('end', () => {
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new Error('JSON inválido.'));
      }
    });
    req.on('error', reject);
  });
}

function parseCookies(req) {
  const cookieHeader = req.headers.cookie || '';
  return cookieHeader.split(';').reduce((acc, part) => {
    const [k, ...v] = part.trim().split('=');
    if (!k) return acc;
    acc[k] = decodeURIComponent(v.join('='));
    return acc;
  }, {});
}

function setSessionCookie(res, sessionId) {
  const isProd = process.env.NODE_ENV === 'production';
  const cookie = `sid=${encodeURIComponent(sessionId)}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${SESSION_TTL_MS / 1000}${isProd ? '; Secure' : ''}`;
  res.setHeader('Set-Cookie', cookie);
}

function clearSessionCookie(res) {
  res.setHeader('Set-Cookie', 'sid=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0');
}

function randomId(size = 16) {
  return crypto.randomBytes(size).toString('hex');
}

function hashPassword(password, salt = randomId(16)) {
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return { hash, salt };
}

function isValidPassword(password) {
  return typeof password === 'string' && password.length >= 6;
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim());
}

function getAuthenticatedUser(req) {
  const sid = parseCookies(req).sid;
  if (!sid) return null;
  const now = Date.now();
  const session = db.prepare('SELECT id, user_id, expires_at FROM sessions WHERE id = ?').get(sid);
  if (!session || session.expires_at < now) {
    db.prepare('DELETE FROM sessions WHERE id = ?').run(sid);
    return null;
  }
  const user = db.prepare('SELECT id, name, email FROM users WHERE id = ?').get(session.user_id);
  if (!user) return null;
  return user;
}

function requireAuth(req, res) {
  const user = getAuthenticatedUser(req);
  if (!user) {
    sendJson(res, 401, { message: 'Não autenticado.' });
    return null;
  }
  return user;
}

function canWriteSprints(user) {
  return WRITE_ALLOWED_EMAILS.has(String(user?.email || '').trim().toLowerCase());
}

function toSprintObject(row, tasksBySprintId) {
  return {
    id: row.id,
    name: row.name,
    team: row.team,
    semester: row.semester,
    startDate: row.start_date,
    endDate: row.end_date,
    manualPlannedPoints: row.manual_planned_points,
    totalCollaborators: row.total_collaborators,
    workingDays: row.working_days,
    sprintObservation: row.sprint_observation,
    tasks: tasksBySprintId.get(row.id) || []
  };
}

function getAllSprints() {
  const sprintRows = db.prepare(`
    SELECT id, name, team, semester, start_date, end_date, manual_planned_points, total_collaborators, working_days, sprint_observation
    FROM sprints
    ORDER BY start_date ASC, created_at ASC
  `).all();

  const taskRows = db.prepare(`
    SELECT id, sprint_id, name, type, points, observation, status, is_completed
    FROM tasks
    ORDER BY rowid ASC
  `).all();

  const tasksBySprintId = new Map();
  taskRows.forEach((task) => {
    const list = tasksBySprintId.get(task.sprint_id) || [];
    list.push({
      id: task.id,
      name: task.name,
      type: task.type,
      points: Number(task.points) || 0,
      observation: task.observation,
      status: task.status,
      isCompleted: Boolean(task.is_completed)
    });
    tasksBySprintId.set(task.sprint_id, list);
  });

  return sprintRows.map((row) => toSprintObject(row, tasksBySprintId));
}

function replaceAllSprints(writerUserId, payloadSprints) {
  const input = Array.isArray(payloadSprints) ? payloadSprints : [];
  const now = Date.now();
  try {
    db.exec('BEGIN');
    db.exec('DELETE FROM sprints');
    const insertSprint = db.prepare(`
      INSERT INTO sprints (
        id, user_id, name, team, semester, start_date, end_date, manual_planned_points,
        total_collaborators, working_days, sprint_observation, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const insertTask = db.prepare(`
      INSERT INTO tasks (id, sprint_id, name, type, points, observation, status, is_completed)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    input.forEach((sprint) => {
      const sprintId = String(sprint?.id || randomId());
      insertSprint.run(
        sprintId,
        writerUserId,
        String(sprint?.name || ''),
        String(sprint?.team || ''),
        String(sprint?.semester || ''),
        String(sprint?.startDate || ''),
        String(sprint?.endDate || ''),
        Number.parseInt(sprint?.manualPlannedPoints, 10) || 0,
        Number(sprint?.totalCollaborators) || 0,
        Number.parseInt(sprint?.workingDays, 10) || 0,
        String(sprint?.sprintObservation || ''),
        now,
        now
      );

      const tasks = Array.isArray(sprint?.tasks) ? sprint.tasks : [];
      tasks.forEach((task) => {
        insertTask.run(
          String(task?.id || randomId()),
          sprintId,
          String(task?.name || ''),
          String(task?.type || ''),
          Number.parseInt(task?.points, 10) || 0,
          String(task?.observation || ''),
          String(task?.status || 'Planejada'),
          task?.isCompleted ? 1 : 0
        );
      });
    });
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

async function serveStaticFile(req, res, pathname) {
  const normalizedPath = pathname === '/' ? '/login.html' : pathname;
  const target = path.join(PUBLIC_DIR, normalizedPath);
  const resolved = path.resolve(target);
  if (!resolved.startsWith(path.resolve(PUBLIC_DIR))) {
    res.writeHead(403);
    return res.end('Acesso negado.');
  }

  try {
    const stat = await fsp.stat(resolved);
    if (stat.isDirectory()) {
      res.writeHead(403);
      return res.end('Diretório não permitido.');
    }
    const ext = path.extname(resolved).toLowerCase();
    const mime = mimeTypes[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': mime });
    fs.createReadStream(resolved).pipe(res);
  } catch {
    res.writeHead(404);
    res.end('Arquivo não encontrado.');
  }
}

const server = http.createServer(async (req, res) => {
  const reqUrl = new URL(req.url, `http://${req.headers.host || `${HOST}:${PORT}`}`);
  const { pathname } = reqUrl;

  try {
    if (pathname === '/api/auth/register' && req.method === 'POST') {
      const { name, email, password } = await readJsonBody(req);
      const normalizedName = String(name || '').trim();
      const normalizedEmail = String(email || '').trim().toLowerCase();
      if (!normalizedName || !isValidEmail(normalizedEmail) || !isValidPassword(password)) {
        return sendJson(res, 400, { message: 'Informe nome, e-mail válido e senha com ao menos 6 caracteres.' });
      }
      const exists = db.prepare('SELECT id FROM users WHERE email = ?').get(normalizedEmail);
      if (exists) return sendJson(res, 409, { message: 'Já existe usuário com esse e-mail.' });

      const userId = randomId();
      const { hash, salt } = hashPassword(password);
      db.prepare('INSERT INTO users (id, name, email, password_hash, password_salt, created_at) VALUES (?, ?, ?, ?, ?, ?)')
        .run(userId, normalizedName, normalizedEmail, hash, salt, Date.now());
      return sendJson(res, 201, { message: 'Cadastro realizado com sucesso.' });
    }

    if (pathname === '/api/auth/login' && req.method === 'POST') {
      const { email, password } = await readJsonBody(req);
      const normalizedEmail = String(email || '').trim().toLowerCase();
      const user = db.prepare('SELECT id, name, email, password_hash, password_salt FROM users WHERE email = ?').get(normalizedEmail);
      if (!user) return sendJson(res, 401, { message: 'Credenciais inválidas.' });
      const { hash } = hashPassword(String(password || ''), user.password_salt);
      if (hash !== user.password_hash) return sendJson(res, 401, { message: 'Credenciais inválidas.' });

      const sessionId = randomId(24);
      db.prepare('INSERT INTO sessions (id, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)')
        .run(sessionId, user.id, Date.now() + SESSION_TTL_MS, Date.now());
      setSessionCookie(res, sessionId);
      return sendJson(res, 200, { user: { id: user.id, name: user.name, email: user.email } });
    }

    if (pathname === '/api/auth/logout' && req.method === 'POST') {
      const sid = parseCookies(req).sid;
      if (sid) db.prepare('DELETE FROM sessions WHERE id = ?').run(sid);
      clearSessionCookie(res);
      return sendJson(res, 200, { message: 'Logout realizado.' });
    }

    if (pathname === '/api/auth/session' && req.method === 'GET') {
      const user = getAuthenticatedUser(req);
      if (!user) return sendJson(res, 401, { message: 'Não autenticado.' });
      return sendJson(res, 200, { user });
    }

    if (pathname === '/api/auth/forgot-password' && req.method === 'POST') {
      const { email } = await readJsonBody(req);
      const normalizedEmail = String(email || '').trim().toLowerCase();
      const user = db.prepare('SELECT id FROM users WHERE email = ?').get(normalizedEmail);
      if (!user) return sendJson(res, 200, { message: 'Se o e-mail existir, um token de recuperação foi gerado.' });

      const rawToken = randomId(8);
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
      db.prepare('INSERT INTO password_reset_tokens (id, user_id, token_hash, expires_at, used_at, created_at) VALUES (?, ?, ?, ?, NULL, ?)')
        .run(randomId(), user.id, tokenHash, Date.now() + RESET_TTL_MS, Date.now());
      return sendJson(res, 200, {
        message: 'Token de recuperação gerado. Use-o no formulário de redefinição.',
        resetToken: rawToken
      });
    }

    if (pathname === '/api/auth/reset-password' && req.method === 'POST') {
      const { email, token, newPassword } = await readJsonBody(req);
      const normalizedEmail = String(email || '').trim().toLowerCase();
      if (!isValidPassword(newPassword)) {
        return sendJson(res, 400, { message: 'A nova senha deve ter ao menos 6 caracteres.' });
      }
      const user = db.prepare('SELECT id FROM users WHERE email = ?').get(normalizedEmail);
      if (!user) return sendJson(res, 400, { message: 'Dados de recuperação inválidos.' });

      const tokenHash = crypto.createHash('sha256').update(String(token || '')).digest('hex');
      const tokenRow = db.prepare(`
        SELECT id, expires_at, used_at
        FROM password_reset_tokens
        WHERE user_id = ? AND token_hash = ?
        ORDER BY created_at DESC
        LIMIT 1
      `).get(user.id, tokenHash);
      if (!tokenRow || tokenRow.used_at || tokenRow.expires_at < Date.now()) {
        return sendJson(res, 400, { message: 'Token inválido ou expirado.' });
      }

      const { hash, salt } = hashPassword(newPassword);
      db.prepare('UPDATE users SET password_hash = ?, password_salt = ? WHERE id = ?').run(hash, salt, user.id);
      db.prepare('UPDATE password_reset_tokens SET used_at = ? WHERE id = ?').run(Date.now(), tokenRow.id);
      db.prepare('DELETE FROM sessions WHERE user_id = ?').run(user.id);
      clearSessionCookie(res);
      return sendJson(res, 200, { message: 'Senha redefinida com sucesso.' });
    }

    if (pathname === '/api/sprints' && req.method === 'GET') {
      const user = requireAuth(req, res);
      if (!user) return;
      return sendJson(res, 200, { sprints: getAllSprints() });
    }

    if (pathname === '/api/sprints/bulk' && req.method === 'PUT') {
      const user = requireAuth(req, res);
      if (!user) return;
      if (!canWriteSprints(user)) return sendJson(res, 403, { message: 'Sem permissão para alterar dados de sprints.' });
      const payload = await readJsonBody(req);
      replaceAllSprints(user.id, payload?.sprints);
      return sendJson(res, 200, { message: 'Sprints salvas com sucesso.' });
    }

    if (pathname.startsWith('/api/')) {
      return sendJson(res, 404, { message: 'Endpoint não encontrado.' });
    }

    return serveStaticFile(req, res, pathname);
  } catch (error) {
    return sendJson(res, 500, { message: `Erro interno: ${error.message}` });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`Servidor iniciado em http://${HOST}:${PORT}`);
  console.log(`SQLite em: ${DB_PATH}`);
});
