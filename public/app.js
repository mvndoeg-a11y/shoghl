const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const TYPE_AR = { 'full-time': 'دوام كامل', 'part-time': 'دوام جزئي', contract: 'عقد', internship: 'تدريب', freelance: 'فريلانس' };
const ST_AR = { new: 'جديد', reviewed: 'تمت المراجعة', shortlisted: 'قائمة مختصرة', rejected: 'مرفوض', hired: 'تم التعيين' };
let me = null, meta = { types: [], cities: [], categories: [], statuses: [] };
const tok = () => localStorage.getItem('token');
async function api(path, method = 'GET', body) {
  const r = await fetch('/api' + path, { method, headers: { 'Content-Type': 'application/json', ...(tok() ? { Authorization: 'Bearer ' + tok() } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error || 'خطأ');
  return d;
}
function toast(m) { const t = $('#toast'); t.textContent = m; t.style.display = 'block'; setTimeout(() => (t.style.display = 'none'), 2500); }
const opts = (arr, sel, all) => (all ? `<option value="">${all}</option>` : '') + arr.map((x) => `<option value="${esc(x)}" ${x === sel ? 'selected' : ''}>${esc(TYPE_AR[x] || x)}</option>`).join('');
const salary = (j) => (j.salary_min || j.salary_max ? `${j.salary_min || ''}${j.salary_min && j.salary_max ? ' - ' : ''}${j.salary_max || ''} ج.م` : 'الراتب غير محدد');
const fmtDate = (s) => new Date(s.replace(' ', 'T') + 'Z').toLocaleDateString('ar-EG');

function nav() {
  $('#nav').innerHTML = !me ? '<a href="#/">الوظائف</a><a href="#/login">دخول</a><a href="#/register">حساب جديد</a>'
    : me.role === 'hr' ? `<a href="#/">الوظائف</a><a href="#/hr">لوحة HR</a><a href="#/post">انشر وظيفة</a><a href="#/candidates">ابحث عن مرشحين</a><a href="#/profile">${esc(me.name)}</a><button id="out">خروج</button>`
    : `<a href="#/">الوظائف</a><a href="#/applications">طلباتي</a><a href="#/saved">المحفوظة</a><a href="#/profile">${esc(me.name)}</a><button id="out">خروج</button>`;
  const o = $('#out'); if (o) o.onclick = async () => { await api('/logout', 'POST').catch(() => {}); localStorage.removeItem('token'); me = null; nav(); location.hash = '#/'; };
}
function jobCard(j) {
  return `<div class="card"><div class="row between"><div><a class="t" href="#/job/${j.id}">${esc(j.title)}</a><div class="muted">${esc(j.company)} · ${esc(j.city)}</div></div>
  <div>${me && me.role === 'seeker' ? `<button class="btn alt sm" data-save="${j.id}">${j.is_saved ? '★ محفوظة' : '☆ احفظ'}</button>` : ''}</div></div>
  <div style="margin-top:8px"><span class="tag">${TYPE_AR[j.type]}</span>${j.remote ? '<span class="tag">عن بعد</span>' : ''}${j.category ? `<span class="tag gray">${esc(j.category)}</span>` : ''}<span class="tag gray">${salary(j)}</span>${j.applied ? '<span class="tag">قدمت</span>' : ''}</div></div>`;
}
const need = (role) => { if (!me) { location.hash = '#/login'; return false; } if (role && me.role !== role) { $('#app').innerHTML = '<div class="card">غير مسموح</div>'; return false; } return true; };

const pages = {
  async home() {
    $('#app').innerHTML = `<div class="hero"><h1>لاقي شغلك في مصر</h1><div class="row"><input id="q" placeholder="المسمى الوظيفي أو الشركة"><select id="city">${opts(meta.cities, '', 'كل المدن')}</select><select id="type">${opts(meta.types, '', 'كل الأنواع')}</select>
    <select id="cat">${opts(meta.categories, '', 'كل المجالات')}</select><label style="margin:0;color:#fff"><input type="checkbox" id="remote" style="width:auto"> عن بعد</label><button class="btn" id="go" style="background:#4ade80;color:#012">بحث</button></div></div><div id="res"></div>`;
    const go = async () => {
      const p = new URLSearchParams(); for (const [k, id] of [['q', 'q'], ['city', 'city'], ['type', 'type'], ['category', 'cat']]) if ($('#' + id).value) p.set(k, $('#' + id).value);
      if ($('#remote').checked) p.set('remote', '1');
      const d = await api('/jobs?' + p);
      $('#res').innerHTML = `<p class="muted">${d.total} وظيفة</p>` + (d.jobs.map(jobCard).join('') || '<div class="card">مفيش نتايج</div>');
      document.querySelectorAll('[data-save]').forEach((b) => (b.onclick = async () => { await api(`/jobs/${b.dataset.save}/save`, 'POST'); go(); }));
    };
    $('#go').onclick = go; $('#q').onkeydown = (e) => e.key === 'Enter' && go(); go();
  },
  async job(id) {
    const j = await api('/jobs/' + id);
    $('#app').innerHTML = `<div class="card"><h2>${esc(j.title)}</h2><div class="muted">${esc(j.company)} · ${esc(j.city)} · نُشرت ${fmtDate(j.created_at)}</div>
    <p><span class="tag">${TYPE_AR[j.type]}</span>${j.remote ? '<span class="tag">عن بعد</span>' : ''}<span class="tag gray">${salary(j)}</span>${j.status !== 'open' ? '<span class="tag red">مقفولة</span>' : ''}</p>
    <h3>الوصف</h3><p style="white-space:pre-wrap">${esc(j.description)}</p>${j.requirements ? `<h3>المتطلبات</h3><p style="white-space:pre-wrap">${esc(j.requirements)}</p>` : ''}<div id="act"></div></div>`;
    const act = $('#act');
    if (!me) act.innerHTML = '<a class="btn" href="#/login">سجل دخول للتقديم</a>';
    else if (me.role === 'seeker') {
      if (j.applied) act.innerHTML = '<span class="tag">قدمت على الوظيفة دي</span>';
      else if (j.status !== 'open') act.innerHTML = '';
      else { act.innerHTML = '<label>رسالة للشركة (اختياري)</label><textarea id="note"></textarea><p><button class="btn" id="ap">قدّم الآن</button></p><div class="err" id="e"></div>';
        $('#ap').onclick = async () => { try { await api(`/jobs/${id}/apply`, 'POST', { note: $('#note').value }); toast('تم التقديم'); pages.job(id); } catch (e) { $('#e').textContent = e.message; } }; }
    } else if (j.hr_id === me.id) act.innerHTML = `<a class="btn alt" href="#/applicants/${id}">شوف المتقدمين</a>`;
  },
  login() {
    $('#app').innerHTML = `<div class="card" style="max-width:420px;margin:auto"><h2>دخول</h2><label>الإيميل</label><input id="email" type="email"><label>كلمة السر</label><input id="pw" type="password"><p><button class="btn" id="b">دخول</button></p><div class="err" id="e"></div></div>`;
    $('#b').onclick = async () => { try { const d = await api('/login', 'POST', { email: $('#email').value, password: $('#pw').value }); localStorage.setItem('token', d.token); me = d.user; nav(); location.hash = me.role === 'hr' ? '#/hr' : '#/'; } catch (e) { $('#e').textContent = e.message; } };
  },
  register() {
    $('#app').innerHTML = `<div class="card" style="max-width:420px;margin:auto"><h2>حساب جديد</h2><label>أنا</label><select id="role"><option value="seeker">باحث عن عمل</option><option value="hr">HR / صاحب عمل</option></select>
    <label>الاسم</label><input id="name"><div id="co" hidden><label>اسم الشركة</label><input id="company"></div><label>الإيميل</label><input id="email" type="email"><label>كلمة السر</label><input id="pw" type="password"><label>المدينة</label><select id="city">${opts(meta.cities, '', '—')}</select>
    <p><button class="btn" id="b">إنشاء الحساب</button></p><div class="err" id="e"></div></div>`;
    $('#role').onchange = () => ($('#co').hidden = $('#role').value !== 'hr');
    $('#b').onclick = async () => { try { const d = await api('/register', 'POST', { role: $('#role').value, name: $('#name').value, company: $('#company').value, email: $('#email').value, password: $('#pw').value, city: $('#city').value }); localStorage.setItem('token', d.token); me = d.user; nav(); location.hash = me.role === 'hr' ? '#/post' : '#/profile'; } catch (e) { $('#e').textContent = e.message; } };
  },
  async profile() {
    if (!need()) return; const hr = me.role === 'hr';
    $('#app').innerHTML = `<div class="card"><h2>الملف الشخصي</h2><label>الاسم</label><input id="name" value="${esc(me.name)}">${hr ? `<label>الشركة</label><input id="company" value="${esc(me.company)}">` : ''}
    <label>${hr ? 'نبذة' : 'المسمى الوظيفي'}</label><input id="headline" value="${esc(me.headline)}"><label>${hr ? 'عن الشركة' : 'نبذة عنك'}</label><textarea id="bio">${esc(me.bio)}</textarea>
    ${hr ? '' : `<label>المهارات (مفصولة بفاصلة)</label><input id="skills" value="${esc(me.skills)}">`}<label>المدينة</label><select id="city">${opts(meta.cities, me.city, '—')}</select><label>التليفون</label><input id="phone" value="${esc(me.phone)}">
    <p><button class="btn" id="b">حفظ</button></p></div>`;
    $('#b').onclick = async () => { const g = (i) => ($('#' + i) ? $('#' + i).value : ''); me = await api('/me', 'PUT', { name: g('name'), company: g('company'), headline: g('headline'), bio: g('bio'), skills: g('skills'), city: g('city'), phone: g('phone') }); nav(); toast('تم الحفظ'); };
  },
  async applications() {
    if (!need('seeker')) return; const l = await api('/applications/mine');
    $('#app').innerHTML = '<h2>طلباتي</h2>' + (l.map((a) => `<div class="card row between"><div><a class="t" href="#/job/${a.job_id}">${esc(a.title)}</a><div class="muted">${esc(a.company)} · ${esc(a.city)} · ${fmtDate(a.created_at)}</div></div><span class="tag ${a.status === 'rejected' ? 'red' : ''}">${ST_AR[a.status]}</span></div>`).join('') || '<div class="card">لسه ما قدمتش على حاجة</div>');
  },
  async saved() {
    if (!need('seeker')) return; const l = await api('/saved');
    $('#app').innerHTML = '<h2>الوظائف المحفوظة</h2>' + (l.map((j) => jobCard({ ...j, is_saved: 1 })).join('') || '<div class="card">مفيش وظائف محفوظة</div>');
    document.querySelectorAll('[data-save]').forEach((b) => (b.onclick = async () => { await api(`/jobs/${b.dataset.save}/save`, 'POST'); pages.saved(); }));
  },
  async hr() {
    if (!need('hr')) return; const l = await api('/jobs/mine');
    $('#app').innerHTML = '<div class="row between"><h2>وظائفي</h2><a class="btn" href="#/post">+ وظيفة جديدة</a></div>' + (l.map((j) => `<div class="card"><div class="row between"><div><a class="t" href="#/job/${j.id}">${esc(j.title)}</a> ${j.status === 'closed' ? '<span class="tag red">مقفولة</span>' : ''}<div class="muted">${esc(j.city)} · ${j.applicants} متقدم</div></div>
      <div><a class="btn sm" href="#/applicants/${j.id}">المتقدمين</a> <a class="btn alt sm" href="#/post/${j.id}">تعديل</a> <button class="btn alt sm" data-t="${j.id}" data-s="${j.status === 'open' ? 'closed' : 'open'}">${j.status === 'open' ? 'اقفل' : 'افتح'}</button> <button class="btn red sm" data-d="${j.id}">حذف</button></div></div></div>`).join('') || '<div class="card">لسه ما نشرتش وظائف</div>');
    document.querySelectorAll('[data-t]').forEach((b) => (b.onclick = async () => { await api(`/jobs/${b.dataset.t}/status`, 'POST', { status: b.dataset.s }); pages.hr(); }));
    document.querySelectorAll('[data-d]').forEach((b) => (b.onclick = async () => { if (confirm('متأكد من الحذف؟')) { await api('/jobs/' + b.dataset.d, 'DELETE'); pages.hr(); } }));
  },
  async post(id) {
    if (!need('hr')) return; const j = id ? await api('/jobs/' + id) : { type: 'full-time' };
    $('#app').innerHTML = `<div class="card"><h2>${id ? 'تعديل الوظيفة' : 'نشر وظيفة'}</h2><label>المسمى</label><input id="title" value="${esc(j.title)}"><div class="row"><div><label>المدينة</label><select id="city">${opts(meta.cities, j.city)}</select></div><div><label>النوع</label><select id="type">${opts(meta.types, j.type)}</select></div><div><label>المجال</label><select id="cat">${opts(meta.categories, j.category, '—')}</select></div></div>
    <div class="row"><div><label>أقل راتب</label><input id="smin" type="number" value="${j.salary_min ?? ''}"></div><div><label>أعلى راتب</label><input id="smax" type="number" value="${j.salary_max ?? ''}"></div></div>
    <label><input type="checkbox" id="remote" style="width:auto" ${j.remote ? 'checked' : ''}> متاح عن بعد</label><label>الوصف</label><textarea id="desc">${esc(j.description)}</textarea><label>المتطلبات</label><textarea id="req">${esc(j.requirements)}</textarea>
    <p><button class="btn" id="b">${id ? 'حفظ' : 'نشر'}</button></p><div class="err" id="e"></div></div>`;
    $('#b').onclick = async () => { try { const body = { title: $('#title').value, city: $('#city').value, type: $('#type').value, category: $('#cat').value, salary_min: $('#smin').value, salary_max: $('#smax').value, remote: $('#remote').checked, description: $('#desc').value, requirements: $('#req').value };
      await api(id ? '/jobs/' + id : '/jobs', id ? 'PUT' : 'POST', body); toast('تم'); location.hash = '#/hr'; } catch (e) { $('#e').textContent = e.message; } };
  },
  async applicants(id) {
    if (!need('hr')) return; const [j, l] = await Promise.all([api('/jobs/' + id), api(`/jobs/${id}/applications`)]);
    $('#app').innerHTML = `<h2>المتقدمين على: ${esc(j.title)}</h2>` + (l.map((a) => `<div class="card"><div class="row between"><div><b>${esc(a.name)}</b> <span class="muted">${esc(a.headline)} · ${esc(a.city)}</span><div class="muted">${esc(a.email)} ${esc(a.phone)}</div></div>
      <select data-a="${a.id}" style="width:auto">${meta.statuses.map((s) => `<option value="${s}" ${s === a.status ? 'selected' : ''}>${ST_AR[s]}</option>`).join('')}</select></div>
      ${a.skills ? `<p>${a.skills.split(',').map((s) => `<span class="tag gray">${esc(s.trim())}</span>`).join('')}</p>` : ''}${a.note ? `<p style="white-space:pre-wrap">${esc(a.note)}</p>` : ''}</div>`).join('') || '<div class="card">لسه مفيش متقدمين</div>');
    document.querySelectorAll('[data-a]').forEach((s) => (s.onchange = async () => { await api(`/applications/${s.dataset.a}/status`, 'POST', { status: s.value }); toast('تم التحديث'); }));
  },
  async candidates() {
    if (!need('hr')) return;
    $('#app').innerHTML = `<h2>ابحث عن مرشحين</h2><div class="row"><input id="q" placeholder="مهارة أو مسمى"><select id="city">${opts(meta.cities, '', 'كل المدن')}</select><button class="btn" id="go">بحث</button></div><div id="res" style="margin-top:12px"></div>`;
    const go = async () => { const l = await api('/candidates?' + new URLSearchParams({ q: $('#q').value, city: $('#city').value }));
      $('#res').innerHTML = l.map((c) => `<div class="card"><b>${esc(c.name)}</b> <span class="muted">${esc(c.headline)} · ${esc(c.city)}</span><p>${(c.skills || '').split(',').filter(Boolean).map((s) => `<span class="tag gray">${esc(s.trim())}</span>`).join('')}</p><div>${esc(c.bio)}</div></div>`).join('') || '<div class="card">مفيش نتايج</div>'; };
    $('#go').onclick = go; go();
  },
};
async function route() {
  const [, name, arg] = location.hash.replace('#', '').split('/');
  try { await (pages[name || 'home'] || pages.home)(arg); } catch (e) { $('#app').innerHTML = `<div class="card err">${esc(e.message)}</div>`; }
}
(async () => { meta = await api('/meta'); if (tok()) me = await api('/me').catch(() => (localStorage.removeItem('token'), null)); nav(); window.onhashchange = route; route(); })();
