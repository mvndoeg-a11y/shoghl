const http = require('node:http'), fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const { open } = require('./db');

const TYPES = ['full-time', 'part-time', 'contract', 'internship', 'freelance'];
const STATUSES = ['new', 'reviewed', 'shortlisted', 'rejected', 'hired'];
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8' };

function hash(pw, salt = crypto.randomBytes(16).toString('hex')) {
  return salt + ':' + crypto.scryptSync(pw, salt, 32).toString('hex');
}
function check(pw, stored) {
  const [salt, h] = stored.split(':');
  const a = Buffer.from(hash(pw, salt).split(':')[1], 'hex'), b = Buffer.from(h, 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
class HttpError extends Error { constructor(code, msg) { super(msg); this.code = code; } }
const str = (v, max = 2000) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const rows = (r) => r.map((x) => ({ ...x }));

function createApp(dbFile = path.join(__dirname, 'data.db')) {
  const db = open(dbFile);
  const q = (sql, ...p) => rows(db.prepare(sql).all(...p));
  const one = (sql, ...p) => { const r = db.prepare(sql).get(...p); return r ? { ...r } : null; };
  const run = (sql, ...p) => db.prepare(sql).run(...p);
  const pub = (u) => u && { id: u.id, email: u.email, name: u.name, role: u.role, company: u.company, headline: u.headline, bio: u.bio, skills: u.skills, city: u.city, phone: u.phone };

  const routes = [];
  const route = (method, pattern, handler, auth) => routes.push({ method, re: new RegExp('^' + pattern.replace(/:(\w+)/g, '(?<$1>[^/]+)') + '$'), handler, auth });
  const need = (u, role) => { if (!u) throw new HttpError(401, 'سجل دخول الأول'); if (role && u.role !== role) throw new HttpError(403, 'غير مسموح'); };

  route('POST', '/api/register', ({ body }) => {
    const email = str(body.email, 200).toLowerCase(), name = str(body.name, 100), role = body.role;
    if (!/^\S+@\S+\.\S+$/.test(email)) throw new HttpError(400, 'الإيميل غير صحيح');
    if (!name) throw new HttpError(400, 'الاسم مطلوب');
    if (!['seeker', 'hr'].includes(role)) throw new HttpError(400, 'نوع الحساب غير صحيح');
    if (str(body.password, 200).length < 6) throw new HttpError(400, 'كلمة السر لازم 6 حروف على الأقل');
    if (role === 'hr' && !str(body.company)) throw new HttpError(400, 'اسم الشركة مطلوب');
    if (one('SELECT id FROM users WHERE email=?', email)) throw new HttpError(409, 'الإيميل مستخدم قبل كده');
    const r = run('INSERT INTO users(email,name,role,pass,company,city) VALUES(?,?,?,?,?,?)', email, name, role, hash(body.password), str(body.company, 100) || null, str(body.city, 60) || null);
    return login(Number(r.lastInsertRowid));
  });
  function login(id) {
    const token = crypto.randomBytes(24).toString('hex');
    run('INSERT INTO sessions VALUES(?,?)', token, id);
    return { token, user: pub(one('SELECT * FROM users WHERE id=?', id)) };
  }
  route('POST', '/api/login', ({ body }) => {
    const u = one('SELECT * FROM users WHERE email=?', str(body.email, 200).toLowerCase());
    if (!u || !check(String(body.password || ''), u.pass)) throw new HttpError(401, 'الإيميل أو كلمة السر غلط');
    return login(u.id);
  });
  route('POST', '/api/logout', ({ token }) => { run('DELETE FROM sessions WHERE token=?', token || ''); return { ok: true }; });
  route('GET', '/api/me', ({ user }) => { need(user); return pub(user); });
  route('PUT', '/api/me', ({ user, body }) => {
    need(user);
    run('UPDATE users SET name=?,headline=?,bio=?,skills=?,city=?,phone=?,company=? WHERE id=?',
      str(body.name, 100) || user.name, str(body.headline, 150), str(body.bio, 2000), str(body.skills, 500), str(body.city, 60), str(body.phone, 30),
      user.role === 'hr' ? str(body.company, 100) || user.company : user.company, user.id);
    return pub(one('SELECT * FROM users WHERE id=?', user.id));
  });

  // Jobs
  route('GET', '/api/jobs', ({ query, user }) => {
    const where = ["j.status='open'"], p = [];
    if (query.q) { const t = '%' + query.q.toLowerCase() + '%'; where.push('(lower(j.title) LIKE ? OR lower(j.company) LIKE ? OR lower(j.description) LIKE ? OR lower(coalesce(j.category,\'\')) LIKE ?)'); p.push(t, t, t, t); }
    if (query.city) { where.push('j.city=?'); p.push(query.city); }
    if (query.type) { where.push('j.type=?'); p.push(query.type); }
    if (query.category) { where.push('j.category=?'); p.push(query.category); }
    if (query.remote === '1') where.push('j.remote=1');
    if (query.min_salary) { where.push('coalesce(j.salary_max,j.salary_min,0)>=?'); p.push(Number(query.min_salary) || 0); }
    const limit = Math.min(Number(query.limit) || 50, 100), offset = Math.max(Number(query.offset) || 0, 0);
    const total = one(`SELECT count(*) c FROM jobs j WHERE ${where.join(' AND ')}`, ...p).c;
    const list = q(`SELECT j.*, (SELECT count(*) FROM applications a WHERE a.job_id=j.id) applicants,
      ${user ? '(SELECT count(*) FROM applications a WHERE a.job_id=j.id AND a.seeker_id=' + Number(user.id) + ') applied,(SELECT count(*) FROM saved s WHERE s.job_id=j.id AND s.user_id=' + Number(user.id) + ') is_saved' : '0 applied, 0 is_saved'}
      FROM jobs j WHERE ${where.join(' AND ')} ORDER BY ${query.sort === 'salary' ? 'coalesce(j.salary_max,j.salary_min,0) DESC, j.id DESC' : 'j.id DESC'} LIMIT ? OFFSET ?`, ...p, limit, offset);
    return { total, jobs: list };
  });
  route('GET', '/api/jobs/mine', ({ user }) => {
    need(user, 'hr');
    return q('SELECT j.*, (SELECT count(*) FROM applications a WHERE a.job_id=j.id) applicants FROM jobs j WHERE hr_id=? ORDER BY id DESC', user.id);
  });
  route('GET', '/api/jobs/:id', ({ params, user }) => {
    const j = one('SELECT j.*, u.name hr_name FROM jobs j JOIN users u ON u.id=j.hr_id WHERE j.id=?', params.id);
    if (!j) throw new HttpError(404, 'الوظيفة مش موجودة');
    j.applied = user ? !!one('SELECT 1 x FROM applications WHERE job_id=? AND seeker_id=?', j.id, user.id) : false;
    j.is_saved = user ? !!one('SELECT 1 x FROM saved WHERE job_id=? AND user_id=?', j.id, user.id) : false;
    return j;
  });
  function jobFields(b) {
    const title = str(b.title, 150), city = str(b.city, 60), description = str(b.description, 8000), type = b.type;
    if (!title || !city || !description) throw new HttpError(400, 'العنوان والمدينة والوصف مطلوبين');
    if (!TYPES.includes(type)) throw new HttpError(400, 'نوع الوظيفة غير صحيح');
    const smin = b.salary_min === '' || b.salary_min == null ? null : Number(b.salary_min), smax = b.salary_max === '' || b.salary_max == null ? null : Number(b.salary_max);
    if ((smin != null && !(smin >= 0)) || (smax != null && !(smax >= 0)) || (smin != null && smax != null && smin > smax)) throw new HttpError(400, 'الراتب غير صحيح');
    return [title, city, type, b.remote ? 1 : 0, str(b.category, 60) || null, smin, smax, description, str(b.requirements, 4000)];
  }
  route('POST', '/api/jobs', ({ user, body }) => {
    need(user, 'hr');
    const f = jobFields(body);
    const r = run('INSERT INTO jobs(hr_id,company,title,city,type,remote,category,salary_min,salary_max,description,requirements) VALUES(?,?,?,?,?,?,?,?,?,?,?)', user.id, user.company, ...f);
    return one('SELECT * FROM jobs WHERE id=?', Number(r.lastInsertRowid));
  });
  const ownJob = (user, id) => { need(user, 'hr'); const j = one('SELECT * FROM jobs WHERE id=?', id); if (!j) throw new HttpError(404, 'الوظيفة مش موجودة'); if (j.hr_id !== user.id) throw new HttpError(403, 'دي مش وظيفتك'); return j; };
  route('PUT', '/api/jobs/:id', ({ user, params, body }) => {
    ownJob(user, params.id);
    const f = jobFields(body);
    run('UPDATE jobs SET title=?,city=?,type=?,remote=?,category=?,salary_min=?,salary_max=?,description=?,requirements=? WHERE id=?', ...f, params.id);
    return one('SELECT * FROM jobs WHERE id=?', params.id);
  });
  route('POST', '/api/jobs/:id/status', ({ user, params, body }) => {
    ownJob(user, params.id);
    if (!['open', 'closed'].includes(body.status)) throw new HttpError(400, 'حالة غير صحيحة');
    run('UPDATE jobs SET status=? WHERE id=?', body.status, params.id);
    return { ok: true, status: body.status };
  });
  route('DELETE', '/api/jobs/:id', ({ user, params }) => {
    ownJob(user, params.id);
    run('DELETE FROM applications WHERE job_id=?', params.id); run('DELETE FROM saved WHERE job_id=?', params.id); run('DELETE FROM jobs WHERE id=?', params.id);
    return { ok: true };
  });
  route('GET', '/api/jobs/:id/applications', ({ user, params }) => {
    ownJob(user, params.id);
    return q(`SELECT a.id,a.note,a.status,a.created_at,u.id seeker_id,u.name,u.email,u.phone,u.headline,u.skills,u.city,u.bio
      FROM applications a JOIN users u ON u.id=a.seeker_id WHERE a.job_id=? ORDER BY a.id DESC`, params.id);
  });
  route('POST', '/api/jobs/:id/apply', ({ user, params, body }) => {
    need(user, 'seeker');
    const j = one('SELECT * FROM jobs WHERE id=?', params.id);
    if (!j) throw new HttpError(404, 'الوظيفة مش موجودة');
    if (j.status !== 'open') throw new HttpError(400, 'الوظيفة دي اتقفلت');
    if (one('SELECT 1 x FROM applications WHERE job_id=? AND seeker_id=?', j.id, user.id)) throw new HttpError(409, 'قدمت على الوظيفة دي قبل كده');
    run('INSERT INTO applications(job_id,seeker_id,note) VALUES(?,?,?)', j.id, user.id, str(body.note, 3000));
    return { ok: true };
  });
  route('POST', '/api/applications/:id/status', ({ user, params, body }) => {
    need(user, 'hr');
    const a = one('SELECT a.id, j.hr_id FROM applications a JOIN jobs j ON j.id=a.job_id WHERE a.id=?', params.id);
    if (!a) throw new HttpError(404, 'الطلب مش موجود');
    if (a.hr_id !== user.id) throw new HttpError(403, 'غير مسموح');
    if (!STATUSES.includes(body.status)) throw new HttpError(400, 'حالة غير صحيحة');
    run('UPDATE applications SET status=? WHERE id=?', body.status, a.id);
    return { ok: true };
  });
  route('GET', '/api/applications/mine', ({ user }) => {
    need(user, 'seeker');
    return q('SELECT a.id,a.status,a.created_at,j.id job_id,j.title,j.company,j.city,j.status job_status FROM applications a JOIN jobs j ON j.id=a.job_id WHERE a.seeker_id=? ORDER BY a.id DESC', user.id);
  });
  route('POST', '/api/jobs/:id/save', ({ user, params }) => {
    need(user, 'seeker');
    if (!one('SELECT 1 x FROM jobs WHERE id=?', params.id)) throw new HttpError(404, 'الوظيفة مش موجودة');
    const had = one('SELECT 1 x FROM saved WHERE user_id=? AND job_id=?', user.id, params.id);
    if (had) run('DELETE FROM saved WHERE user_id=? AND job_id=?', user.id, params.id); else run('INSERT INTO saved VALUES(?,?)', user.id, params.id);
    return { saved: !had };
  });
  route('GET', '/api/saved', ({ user }) => { need(user, 'seeker'); return q('SELECT j.* FROM saved s JOIN jobs j ON j.id=s.job_id WHERE s.user_id=? ORDER BY j.id DESC', user.id); });

  // Candidate search for HR
  route('GET', '/api/candidates', ({ user, query }) => {
    need(user, 'hr');
    const where = ["role='seeker'"], p = [];
    if (query.q) { const t = '%' + query.q.toLowerCase() + '%'; where.push("(lower(name) LIKE ? OR lower(coalesce(headline,'')) LIKE ? OR lower(coalesce(skills,'')) LIKE ? OR lower(coalesce(bio,'')) LIKE ?)"); p.push(t, t, t, t); }
    if (query.city) { where.push('city=?'); p.push(query.city); }
    return q(`SELECT id,name,headline,skills,city,bio FROM users WHERE ${where.join(' AND ')} AND (headline IS NOT NULL AND headline!='') ORDER BY id DESC LIMIT 50`, ...p);
  });
  route('GET', '/api/stats', () => ({
    jobs: one("SELECT count(*) c FROM jobs WHERE status='open'").c,
    companies: one("SELECT count(DISTINCT company) c FROM jobs WHERE status='open'").c,
    seekers: one("SELECT count(*) c FROM users WHERE role='seeker'").c,
    applications: one('SELECT count(*) c FROM applications').c,
  }));
  route('GET', '/api/companies', () => q("SELECT company, count(*) jobs, min(city) city, max(coalesce(salary_max,salary_min,0)) top_salary FROM jobs WHERE status='open' GROUP BY company ORDER BY jobs DESC, top_salary DESC LIMIT 12"));
  route('GET', '/api/categories', () => q("SELECT category, count(*) n FROM jobs WHERE status='open' AND category IS NOT NULL GROUP BY category ORDER BY n DESC"));
  route('GET', '/api/hr/stats', ({ user }) => {
    need(user, 'hr');
    const by = {}; for (const r of q('SELECT a.status s, count(*) n FROM applications a JOIN jobs j ON j.id=a.job_id WHERE j.hr_id=? GROUP BY a.status', user.id)) by[r.s] = r.n;
    return {
      open: one("SELECT count(*) c FROM jobs WHERE hr_id=? AND status='open'", user.id).c,
      closed: one("SELECT count(*) c FROM jobs WHERE hr_id=? AND status='closed'", user.id).c,
      applicants: Object.values(by).reduce((a, b) => a + b, 0), by,
      recent: q('SELECT a.id,a.status,a.created_at,u.name,u.headline,j.title,j.id job_id FROM applications a JOIN jobs j ON j.id=a.job_id JOIN users u ON u.id=a.seeker_id WHERE j.hr_id=? ORDER BY a.id DESC LIMIT 5', user.id),
    };
  });
  route('GET', '/api/meta', () => ({
    types: TYPES, statuses: STATUSES,
    cities: ['القاهرة', 'الجيزة', 'الإسكندرية', 'المنصورة', 'طنطا', 'الإسماعيلية', 'بورسعيد', 'السويس', 'أسيوط', 'الأقصر', 'أسوان', 'العاصمة الإدارية', 'السادس من أكتوبر', 'الشيخ زايد', 'العاشر من رمضان'],
    categories: ['تكنولوجيا المعلومات', 'المبيعات', 'التسويق', 'المحاسبة والمالية', 'الموارد البشرية', 'خدمة العملاء', 'الهندسة', 'التصميم', 'الطب والصيدلة', 'التعليم', 'اللوجستيات', 'أخرى'],
  }));

  async function readBody(req) {
    let size = 0; const chunks = [];
    for await (const c of req) { size += c.length; if (size > 1e6) throw new HttpError(413, 'الطلب كبير'); chunks.push(c); }
    if (!chunks.length) return {};
    try { return JSON.parse(Buffer.concat(chunks).toString()); } catch { throw new HttpError(400, 'JSON غير صحيح'); }
  }
  const pubDir = path.join(__dirname, 'public');
  const server = http.createServer(async (req, res) => {
    const send = (code, obj) => { res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' }); res.end(JSON.stringify(obj)); };
    try {
      const url = new URL(req.url, 'http://x'), query = Object.fromEntries(url.searchParams);
      if (!url.pathname.startsWith('/api/')) {
        const f = path.join(pubDir, url.pathname === '/' ? 'index.html' : path.normalize(url.pathname).replace(/^(\.\.[/\\])+/, ''));
        if (!f.startsWith(pubDir) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end('Not found'); }
        res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' });
        return fs.createReadStream(f).pipe(res);
      }
      const token = (req.headers.authorization || '').replace(/^Bearer /, '');
      const s = token && one('SELECT user_id FROM sessions WHERE token=?', token);
      const user = s ? one('SELECT * FROM users WHERE id=?', s.user_id) : null;
      for (const r of routes) {
        if (r.method !== req.method) continue;
        const m = r.re.exec(url.pathname); if (!m) continue;
        const body = ['POST', 'PUT'].includes(req.method) ? await readBody(req) : {};
        return send(200, await r.handler({ params: m.groups || {}, query, body, user, token }));
      }
      throw new HttpError(404, 'مسار غير موجود');
    } catch (e) {
      if (e instanceof HttpError) return send(e.code, { error: e.message });
      console.error(e); send(500, { error: 'حصل خطأ في السيرفر' });
    }
  });
  return { server, db };
}
module.exports = { createApp };
if (require.main === module) {
  const port = process.env.PORT || 3000;
  const { server } = createApp(process.env.DB_FILE);
  server.listen(port, () => console.log('شغل شغال على http://localhost:' + port));
  }
