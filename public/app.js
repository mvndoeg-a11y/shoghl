const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const TYPE_AR = { 'full-time': 'دوام كامل', 'part-time': 'دوام جزئي', contract: 'عقد', internship: 'تدريب', freelance: 'فريلانس' };
const ST_AR = { new: 'جديد', reviewed: 'تمت المراجعة', shortlisted: 'قائمة مختصرة', rejected: 'مرفوض', hired: 'تم التعيين' };
const ST_CLS = { new: 'blue', reviewed: 'gray', shortlisted: 'gold', rejected: 'red', hired: '' };
const CAT_ICON = { 'تكنولوجيا المعلومات': '💻', 'المبيعات': '📈', 'التسويق': '📣', 'المحاسبة والمالية': '🧾', 'الموارد البشرية': '🤝', 'خدمة العملاء': '🎧', 'الهندسة': '🛠️', 'التصميم': '🎨', 'الطب والصيدلة': '⚕️', 'التعليم': '📚', 'اللوجستيات': '🚚', 'أخرى': '✨' };
const GRADS = ['#0f9d6b,#0a6b49', '#3b6fd6,#2a4fa3', '#e8873a,#c4601a', '#8e5bd6,#6538a8', '#d6527a,#a8325a', '#14a3b8,#0d7686', '#c9962b,#9a6f12', '#4b5f57,#2c3b35'];
let me = null, meta = { types: [], cities: [], categories: [], statuses: [] };
const tok = () => localStorage.getItem('token');
async function api(path, method = 'GET', body) {
  const r = await fetch('/api' + path, { method, headers: { 'Content-Type': 'application/json', ...(tok() ? { Authorization: 'Bearer ' + tok() } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error || 'خطأ');
  return d;
}
let tt;
function toast(m) { const t = $('#toast'); t.textContent = m; t.classList.add('show'); clearTimeout(tt); tt = setTimeout(() => t.classList.remove('show'), 2400); }
const opts = (arr, sel, all) => (all ? `<option value="">${all}</option>` : '') + arr.map((x) => `<option value="${esc(x)}" ${x === sel ? 'selected' : ''}>${esc(TYPE_AR[x] || x)}</option>`).join('');
const num = (n) => Number(n).toLocaleString('ar-EG');
const salary = (j) => (j.salary_min || j.salary_max ? `${j.salary_min ? num(j.salary_min) : ''}${j.salary_min && j.salary_max ? ' - ' : ''}${j.salary_max ? num(j.salary_max) : ''} ج.م` : 'الراتب غير محدد');
const dt = (s) => new Date(String(s).replace(' ', 'T') + 'Z');
function ago(s) {
  const m = Math.max(1, Math.round((Date.now() - dt(s)) / 60000));
  if (m < 60) return m === 1 ? 'دلوقتي' : `من ${num(m)} دقيقة`;
  const h = Math.round(m / 60); if (h < 24) return h === 1 ? 'من ساعة' : h === 2 ? 'من ساعتين' : `من ${num(h)} ساعات`;
  const d = Math.round(h / 24); return d === 1 ? 'من يوم' : d === 2 ? 'من يومين' : `من ${num(d)} أيام`;
}
const isNew = (s) => Date.now() - dt(s) < 12 * 3600e3;
const avatar = (name, cls = '') => { let h = 0; for (const c of String(name)) h = (h * 31 + c.charCodeAt(0)) >>> 0; return `<div class="av ${cls}" style="background:linear-gradient(135deg,${GRADS[h % GRADS.length]})">${esc(String(name).trim().charAt(0) || '?')}</div>`; };
const home = () => (me ? (me.role === 'hr' ? '#/hr' : '#/') : '#/');

function nav() {
  const h = location.hash || '#/';
  const L = (href, label, ic) => ({ href, label, ic, on: h === href || (href !== '#/' && h.startsWith(href)) });
  let items;
  if (!me) items = [L('#/', 'الوظائف', '🔍'), L('#/companies', 'الشركات', '🏢'), L('#/login', 'دخول', '👤'), L('#/register', 'حساب جديد', '✨')];
  else if (me.role === 'hr') items = [L('#/hr', 'لوحتي', '📊'), L('#/post', 'انشر وظيفة', '➕'), L('#/candidates', 'مرشحين', '🔎'), L('#/profile', 'حسابي', '👤')];
  else items = [L('#/', 'الوظائف', '🔍'), L('#/applications', 'طلباتي', '📨'), L('#/saved', 'المحفوظة', '★'), L('#/profile', 'حسابي', '👤')];
  $('#nav').innerHTML = items.map((i, k) => `<a href="${i.href}" class="${i.on ? 'on' : ''} ${!me && k === 3 ? 'cta' : me && me.role === 'hr' && k === 1 ? 'cta' : ''}">${i.label}</a>`).join('') + (me ? '<button id="out">خروج</button>' : '');
  $('#tabs').innerHTML = items.map((i) => `<a href="${i.href}" class="${i.on ? 'on' : ''}"><span class="ic">${i.ic}</span>${i.label}</a>`).join('');
  const o = $('#out'); if (o) o.onclick = async () => { await api('/logout', 'POST').catch(() => {}); localStorage.removeItem('token'); me = null; nav(); location.hash = '#/'; };
}
const skel = (n = 3) => `<div class="jobs">${Array.from({ length: n }, () => '<div class="sk"></div>').join('')}</div>`;
const empty = (ic, t, a = '') => `<div class="card empty"><div class="big">${ic}</div><p>${t}</p>${a}</div>`;
const set = (h) => { $('#app').innerHTML = `<div class="fade">${h}</div>`; window.scrollTo(0, 0); };

function jobCard(j) {
  return `<article class="job">${isNew(j.created_at) ? '<span class="badge-new">جديد</span>' : ''}
  <div class="head">${avatar(j.company)}<div><h3><a href="#/job/${j.id}">${esc(j.title)}</a></h3><div class="co-name">${esc(j.company)} · ${esc(j.city)}</div></div>
  ${me && me.role === 'seeker' ? `<button class="save ${j.is_saved ? 'on' : ''}" data-save="${j.id}" aria-label="حفظ">${j.is_saved ? '★' : '☆'}</button>` : ''}</div>
  <div class="meta"><span class="tag">${TYPE_AR[j.type]}</span>${j.remote ? '<span class="tag blue">🏠 عن بعد</span>' : ''}${j.category ? `<span class="tag gray">${esc(j.category)}</span>` : ''}${j.applied ? '<span class="tag gold">✓ قدمت</span>' : ''}</div>
  <div class="jfoot"><span class="sal">${salary(j)}</span><span class="when">${ago(j.created_at)}</span></div></article>`;
}
function bindSave(after) {
  document.querySelectorAll('[data-save]').forEach((b) => (b.onclick = async (e) => { e.preventDefault(); const r = await api(`/jobs/${b.dataset.save}/save`, 'POST'); toast(r.saved ? 'اتحفظت ⭐' : 'اتشالت من المحفوظة'); if (after) after(); else { b.classList.toggle('on', r.saved); b.textContent = r.saved ? '★' : '☆'; } }));
}
const need = (role) => { if (!me) { location.hash = '#/login'; return false; } if (role && me.role !== role) { set(empty('🔒', 'الصفحة دي مش متاحة لحسابك')); return false; } return true; };

const pages = {
  async home() {
    set(`<section class="hero"><span class="pill">🇪🇬 أكبر فرص الشغل في مصر</span><h1>شغلك الجاي <em>بيبدأ من هنا</em></h1>
    <p class="sub">دوّر في مئات الوظايف من شركات موثوقة، وقدّم في ثواني من موبايلك.</p>
    <div class="search"><label class="f"><span>🔍</span><input id="q" placeholder="مسمى وظيفي أو شركة..."></label><label class="f"><span>📍</span><select id="city">${opts(meta.cities, '', 'كل المدن')}</select></label>
    <label class="f"><span>💼</span><select id="type">${opts(meta.types, '', 'كل الأنواع')}</select></label><button class="btn gold" id="go">ابحث</button></div>
    <div class="quick"><span>الأكثر بحثًا:</span><button data-k="مطور">مطور</button><button data-k="مبيعات">مبيعات</button><button data-k="تسويق">تسويق</button><button data-k="محاسب">محاسب</button></div></section>
    <div class="stats" id="stats"></div>
    <div class="sec"><div><h2>تصفح حسب المجال</h2><p>اختار مجالك وشوف الفرص</p></div></div><div class="scroll" id="cats"></div>
    <div class="sec"><div><h2>⭐ وظايف مميزة</h2><p>أعلى الرواتب دلوقتي</p></div></div><div class="jobs two" id="feat">${skel(2)}</div>
    <div class="sec"><div><h2>شركات بتوظف</h2><p>انضم لفريق بيقدّر الموهوبين</p></div><a href="#/companies">كل الشركات ›</a></div><div class="scroll" id="cos"></div>
    <div class="sec"><div><h2>أحدث الوظايف</h2></div><a href="#/jobs">شوف الكل ›</a></div><div class="jobs two" id="latest">${skel(4)}</div>
    <div class="sec"><div><h2>إزاي شغل بيشتغل؟</h2></div></div>
    <div class="steps"><div class="step"><i>١</i><b>اعمل حساب</b><span>ثواني وبتكمّل بروفايلك بخبراتك ومهاراتك.</span></div><div class="step"><i>٢</i><b>دوّر وقدّم</b><span>فلاتر ذكية للمدينة والمرتب ونوع الشغل.</span></div><div class="step"><i>٣</i><b>اتابع طلبك</b><span>تعرف حالة كل طلب: اتراجع، قائمة مختصرة، أو اتعيّنت.</span></div></div>
    ${me ? '' : `<div class="sec"><div><h2>انضم لشغل</h2></div></div><div class="duo"><div class="pitch a"><h3>باحث عن شغل؟</h3><ul><li>تقديم بضغطة واحدة</li><li>احفظ الوظايف اللي عجبتك</li><li>تابع حالة كل طلب</li></ul><a class="btn" href="#/register">ابدأ مجانًا</a></div>
    <div class="pitch b"><h3>صاحب شركة أو HR؟</h3><ul><li>انشر وظيفة في دقيقة</li><li>لوحة تحكم بالمتقدمين والإحصائيات</li><li>ابحث في قاعدة المرشحين</li></ul><a class="btn" href="#/register?hr">وظّف دلوقتي</a></div></div>`}`);
    const go = () => { const p = new URLSearchParams(); if ($('#q').value) p.set('q', $('#q').value); if ($('#city').value) p.set('city', $('#city').value); if ($('#type').value) p.set('type', $('#type').value); location.hash = '#/jobs' + (p.toString() ? '?' + p : ''); };
    $('#go').onclick = go; $('#q').onkeydown = (e) => e.key === 'Enter' && go();
    document.querySelectorAll('[data-k]').forEach((b) => (b.onclick = () => (location.hash = '#/jobs?q=' + encodeURIComponent(b.dataset.k))));
    const [st, cats, cos, feat, latest] = await Promise.all([api('/stats'), api('/categories'), api('/companies'), api('/jobs?sort=salary&limit=4'), api('/jobs?limit=6')]);
    $('#stats').innerHTML = [[st.jobs, 'وظيفة متاحة'], [st.companies, 'شركة بتوظف'], [st.seekers, 'باحث عن شغل'], [st.applications, 'طلب تقديم']].map(([n, l]) => `<div class="stat"><b>${num(n)}+</b><span>${l}</span></div>`).join('');
    $('#cats').innerHTML = cats.map((c) => `<a class="chip" href="#/jobs?category=${encodeURIComponent(c.category)}">${CAT_ICON[c.category] || '•'} ${esc(c.category)}<small>${num(c.n)}</small></a>`).join('');
    $('#cos').innerHTML = cos.map((c) => `<a class="co" href="#/jobs?q=${encodeURIComponent(c.company)}">${avatar(c.company)}<b>${esc(c.company)}</b><span>${num(c.jobs)} وظيفة · ${esc(c.city)}</span></a>`).join('');
    $('#feat').innerHTML = feat.jobs.map(jobCard).join(''); $('#latest').innerHTML = latest.jobs.map(jobCard).join('');
    bindSave(() => pages.home());
  },
  async companies() {
    set(`<div class="ph"><h1>الشركات</h1></div><div id="res" class="duo">${skel(2)}</div>`);
    const cos = await api('/companies');
    $('#res').innerHTML = cos.map((c) => `<a class="card person" style="text-decoration:none" href="#/jobs?q=${encodeURIComponent(c.company)}">${avatar(c.company, 'lg')}<div><h3>${esc(c.company)}</h3><div class="muted">${esc(c.city)} · ${num(c.jobs)} وظيفة مفتوحة</div><span class="tag">شوف الوظايف ›</span></div></a>`).join('');
  },
  async jobs() {
    const qs = new URLSearchParams(location.hash.split('?')[1] || '');
    set(`<div class="ph"><h1>الوظايف</h1></div><div class="filters"><input id="q" placeholder="🔍 ابحث..." value="${esc(qs.get('q') || '')}"><select id="city">${opts(meta.cities, qs.get('city'), 'كل المدن')}</select><select id="type">${opts(meta.types, qs.get('type'), 'كل الأنواع')}</select>
    <select id="cat">${opts(meta.categories, qs.get('category'), 'كل المجالات')}</select><select id="sort"><option value="">الأحدث</option><option value="salary" ${qs.get('sort') === 'salary' ? 'selected' : ''}>الأعلى راتبًا</option></select></div>
    <div class="chips" style="margin-bottom:14px"><label class="chip"><input type="checkbox" id="remote" ${qs.get('remote') ? 'checked' : ''}> 🏠 عن بعد فقط</label><label class="chip">💰 أقل راتب <input id="min" type="number" placeholder="0" value="${esc(qs.get('min_salary') || '')}" style="width:90px;padding:2px 8px;display:inline-block;border-radius:8px"></label></div>
    <p class="muted" id="cnt"></p><div class="jobs two" id="res">${skel(4)}</div>`);
    const go = async () => {
      const p = new URLSearchParams();
      for (const [k, id] of [['q', 'q'], ['city', 'city'], ['type', 'type'], ['category', 'cat'], ['sort', 'sort'], ['min_salary', 'min']]) if ($('#' + id).value) p.set(k, $('#' + id).value);
      if ($('#remote').checked) p.set('remote', '1');
      history.replaceState(null, '', '#/jobs' + (p.toString() ? '?' + p : ''));
      const d = await api('/jobs?' + p);
      $('#cnt').textContent = `${num(d.total)} وظيفة`;
      $('#res').innerHTML = d.jobs.map(jobCard).join('') || empty('🔎', 'مفيش نتايج بالشروط دي. جرّب تغيّر البحث.');
      bindSave();
    };
    document.querySelectorAll('.filters input,.filters select,#remote,#min').forEach((e) => (e.oninput = e.onchange = (() => { let t; return () => { clearTimeout(t); t = setTimeout(go, 250); }; })()));
    go();
  },
  async job(id) {
    set(skel(2)); const j = await api('/jobs/' + id);
    const sim = (await api('/jobs?category=' + encodeURIComponent(j.category || '') + '&limit=4')).jobs.filter((x) => x.id !== j.id).slice(0, 3);
    const share = `https://wa.me/?text=${encodeURIComponent(`${j.title} في ${j.company} - ${location.origin}/#/job/${j.id}`)}`;
    set(`<div class="layout"><div><div class="card"><div class="dh">${avatar(j.company, 'lg')}<div><h1>${esc(j.title)}</h1><div class="muted">${esc(j.company)} · ${esc(j.city)} · ${ago(j.created_at)}</div></div></div>
    <div class="facts"><div class="fact"><span>الراتب</span><b>${salary(j)}</b></div><div class="fact"><span>نوع الشغل</span><b>${TYPE_AR[j.type]}</b></div><div class="fact"><span>المكان</span><b>${esc(j.city)}${j.remote ? ' / عن بعد' : ''}</b></div><div class="fact"><span>المجال</span><b>${esc(j.category || '—')}</b></div></div>
    ${j.status !== 'open' ? '<span class="tag red">الوظيفة اتقفلت</span>' : ''}
    <h3>عن الوظيفة</h3><p class="prose">${esc(j.description)}</p>${j.requirements ? `<h3>المتطلبات</h3><ul class="req">${j.requirements.split('\n').filter(Boolean).map((r) => `<li>${esc(r)}</li>`).join('')}</ul>` : ''}</div>
    ${sim.length ? `<div class="sec"><div><h2>وظايف مشابهة</h2></div></div><div class="jobs">${sim.map(jobCard).join('')}</div>` : ''}</div>
    <aside class="sticky"><div class="card" id="act"></div><a class="btn alt block" target="_blank" rel="noopener" href="${share}">🟢 شارك على واتساب</a></aside></div>`);
    const act = $('#act');
    if (!me) act.innerHTML = '<h3>عايز تقدّم؟</h3><p class="muted">سجّل دخولك الأول وقدّم في ثواني.</p><a class="btn block" href="#/login">سجّل دخول</a><p style="text-align:center"><a href="#/register" class="muted">معندكش حساب؟ اعمل واحد</a></p>';
    else if (me.role === 'seeker') {
      if (j.applied) act.innerHTML = '<h3>✓ قدمت على الوظيفة دي</h3><p class="muted">تابع حالة طلبك من "طلباتي".</p><a class="btn alt block" href="#/applications">طلباتي</a>';
      else if (j.status !== 'open') act.innerHTML = '<p class="muted">التقديم مقفول.</p>';
      else { act.innerHTML = '<h3>قدّم دلوقتي</h3><label>رسالة للشركة (اختياري)</label><textarea id="note" placeholder="عرّفهم بنفسك في سطرين..."></textarea><p><button class="btn gold block" id="ap">قدّم الآن</button></p><div class="err" id="e"></div>';
        $('#ap').onclick = async () => { try { await api(`/jobs/${id}/apply`, 'POST', { note: $('#note').value }); toast('تم التقديم 🎉'); pages.job(id); } catch (e) { $('#e').textContent = e.message; } }; }
      act.insertAdjacentHTML('beforeend', `<button class="btn alt block" style="margin-top:8px" id="sv">${j.is_saved ? '★ محفوظة' : '☆ احفظ الوظيفة'}</button>`);
      $('#sv').onclick = async () => { await api(`/jobs/${id}/save`, 'POST'); pages.job(id); };
    } else if (j.hr_id === me.id) act.innerHTML = `<h3>وظيفتك</h3><a class="btn block" href="#/applicants/${id}">شوف المتقدمين</a><p><a class="btn alt block" href="#/post/${id}">تعديل</a></p>`;
    else act.innerHTML = '<p class="muted">حساب الشركة مش بيقدّم على وظايف.</p>';
  },
  login() {
    set(`<div class="card auth"><h2>أهلًا بيك تاني 👋</h2><p class="muted">سجّل دخولك وكمّل من حيث وقفت.</p><label>الإيميل</label><input id="email" type="email" autocomplete="email"><label>كلمة السر</label><input id="pw" type="password" autocomplete="current-password">
    <p><button class="btn block" id="b">دخول</button></p><div class="err" id="e"></div><div class="card" style="background:#f6f4ee;box-shadow:none;margin:14px 0 0"><b>حسابات تجريبية</b><div class="muted">كلمة السر 123456</div>
    <div class="chips" style="margin-top:8px"><button class="chip" data-d="ahmed@example.com">باحث عن شغل</button><button class="chip" data-d="hr@nile-tech.example">HR</button></div></div>
    <p style="text-align:center"><a href="#/register" class="muted">معندكش حساب؟ سجّل</a></p></div>`);
    document.querySelectorAll('[data-d]').forEach((b) => (b.onclick = () => { $('#email').value = b.dataset.d; $('#pw').value = '123456'; }));
    const go = async () => { try { const d = await api('/login', 'POST', { email: $('#email').value, password: $('#pw').value }); localStorage.setItem('token', d.token); me = d.user; nav(); location.hash = home(); toast('أهلًا ' + me.name); } catch (e) { $('#e').textContent = e.message; } };
    $('#b').onclick = go; $('#pw').onkeydown = (e) => e.key === 'Enter' && go();
  },
  register() {
    const hrFirst = location.hash.includes('?hr');
    set(`<div class="card auth"><h2>ابدأ مع شغل ✨</h2><div class="seg" id="seg"><button data-r="seeker" class="${hrFirst ? '' : 'on'}">أبحث عن شغل</button><button data-r="hr" class="${hrFirst ? 'on' : ''}">أنا HR / شركة</button></div>
    <label>الاسم</label><input id="name"><div id="co" ${hrFirst ? '' : 'hidden'}><label>اسم الشركة</label><input id="company"></div><label>الإيميل</label><input id="email" type="email"><label>كلمة السر (6 حروف على الأقل)</label><input id="pw" type="password"><label>المدينة</label><select id="city">${opts(meta.cities, '', '—')}</select>
    <p><button class="btn block" id="b">إنشاء الحساب</button></p><div class="err" id="e"></div></div>`);
    let role = hrFirst ? 'hr' : 'seeker';
    document.querySelectorAll('#seg button').forEach((b) => (b.onclick = () => { role = b.dataset.r; document.querySelectorAll('#seg button').forEach((x) => x.classList.toggle('on', x === b)); $('#co').hidden = role !== 'hr'; }));
    $('#b').onclick = async () => { try { const d = await api('/register', 'POST', { role, name: $('#name').value, company: $('#company').value, email: $('#email').value, password: $('#pw').value, city: $('#city').value }); localStorage.setItem('token', d.token); me = d.user; nav(); toast('أهلًا بيك في شغل 🎉'); location.hash = me.role === 'hr' ? '#/post' : '#/profile'; } catch (e) { $('#e').textContent = e.message; } };
  },
  async profile() {
    if (!need()) return; const hr = me.role === 'hr';
    const fields = hr ? [me.name, me.company, me.bio, me.city, me.phone] : [me.name, me.headline, me.bio, me.skills, me.city, me.phone];
    const pct = Math.round((fields.filter(Boolean).length / fields.length) * 100);
    set(`<div class="card"><div class="person">${avatar(me.name, 'lg')}<div><h2>${esc(me.name)}</h2><div class="muted">${esc(hr ? me.company : me.headline || 'أضف مسماك الوظيفي')}</div></div></div>
    <div class="progress"><i style="width:${pct}%"></i></div><div class="muted">اكتمال البروفايل ${num(pct)}% ${pct < 100 ? '· كل ما تكمّل أكتر فرصتك تزيد' : '· ممتاز! 🎉'}</div></div>
    <div class="card"><h3>بياناتك</h3><label>الاسم</label><input id="name" value="${esc(me.name)}">${hr ? `<label>الشركة</label><input id="company" value="${esc(me.company)}">` : ''}
    ${hr ? '' : `<label>المسمى الوظيفي</label><input id="headline" value="${esc(me.headline)}" placeholder="مثال: مطور ويب">`}<label>${hr ? 'عن الشركة' : 'نبذة عنك وخبراتك'}</label><textarea id="bio">${esc(me.bio)}</textarea>
    ${hr ? '' : `<label>المهارات (مفصولة بفاصلة)</label><input id="skills" value="${esc(me.skills)}" placeholder="JavaScript, Excel, ...">`}<div class="row"><div><label>المدينة</label><select id="city">${opts(meta.cities, me.city, '—')}</select></div><div><label>التليفون</label><input id="phone" value="${esc(me.phone)}"></div></div>
    <p><button class="btn" id="b">حفظ التغييرات</button></p></div>`);
    $('#b').onclick = async () => { const g = (i) => ($('#' + i) ? $('#' + i).value : ''); me = await api('/me', 'PUT', { name: g('name'), company: g('company'), headline: g('headline'), bio: g('bio'), skills: g('skills'), city: g('city'), phone: g('phone') }); nav(); toast('اتحفظت ✓'); pages.profile(); };
  },
  async applications() {
    if (!need('seeker')) return; set(`<div class="ph"><h1>طلباتي</h1></div>${skel(2)}`); const l = await api('/applications/mine');
    const steps = ['new', 'reviewed', 'shortlisted', 'hired'];
    set(`<div class="ph"><h1>طلباتي</h1><span class="tag">${num(l.length)} طلب</span></div><div class="jobs">` + (l.map((a) => `<div class="card" style="margin:0"><div class="person">${avatar(a.company)}<div style="flex:1"><a href="#/job/${a.job_id}" style="text-decoration:none"><b>${esc(a.title)}</b></a><div class="muted">${esc(a.company)} · ${esc(a.city)} · ${ago(a.created_at)}</div></div><span class="tag ${ST_CLS[a.status]}">${ST_AR[a.status]}</span></div>
      ${a.status !== 'rejected' ? `<div class="progress"><i style="width:${(Math.max(steps.indexOf(a.status), 0) + 1) * 25}%"></i></div>` : ''}</div>`).join('') || empty('📨', 'لسه ما قدمتش على حاجة', '<a class="btn" href="#/jobs">دوّر على شغل</a>') ) + '</div>');
  },
  async saved() {
    if (!need('seeker')) return; set(`<div class="ph"><h1>الوظايف المحفوظة</h1></div>${skel(2)}`); const l = await api('/saved');
    set(`<div class="ph"><h1>الوظايف المحفوظة</h1></div><div class="jobs two">` + (l.map((j) => jobCard({ ...j, is_saved: 1 })).join('') || empty('⭐', 'مفيش وظايف محفوظة', '<a class="btn" href="#/jobs">تصفح الوظايف</a>')) + '</div>');
    bindSave(() => pages.saved());
  },
  async hr() {
    if (!need('hr')) return; set(skel(3)); const [l, st] = await Promise.all([api('/jobs/mine'), api('/hr/stats')]);
    const max = Math.max(1, ...Object.values(st.by));
    set(`<div class="ph"><div><h1>أهلًا ${esc(me.name.split(' ')[0])} 👋</h1><div class="muted">${esc(me.company)}</div></div><a class="btn gold" href="#/post">➕ وظيفة جديدة</a></div>
    <div class="kpis"><div class="kpi k1"><b>${num(st.open)}</b><span>وظيفة مفتوحة</span></div><div class="kpi k2"><b>${num(st.applicants)}</b><span>إجمالي المتقدمين</span></div><div class="kpi k3"><b>${num(st.by.shortlisted || 0)}</b><span>قائمة مختصرة</span></div><div class="kpi k4"><b>${num(st.by.new || 0)}</b><span>طلبات جديدة</span></div></div>
    <div class="duo"><div class="card"><h3>مسار التوظيف</h3><div class="funnel">${meta.statuses.map((s) => `<div class="fr"><span>${ST_AR[s]}</span><div class="bar2"><i style="width:${((st.by[s] || 0) / max) * 100}%"></i></div><b>${num(st.by[s] || 0)}</b></div>`).join('')}</div></div>
    <div class="card"><h3>آخر المتقدمين</h3>${st.recent.map((r) => `<a class="person" style="text-decoration:none;margin:10px 0" href="#/applicants/${r.job_id}">${avatar(r.name)}<div style="flex:1"><b>${esc(r.name)}</b><div class="muted">${esc(r.title)} · ${ago(r.created_at)}</div></div><span class="tag ${ST_CLS[r.status]}">${ST_AR[r.status]}</span></a>`).join('') || '<p class="muted">لسه مفيش متقدمين</p>'}</div></div>
    <div class="sec"><div><h2>وظايفي</h2></div></div><div class="jobs">` + (l.map((j) => `<div class="card" style="margin:0"><div class="row between"><div class="person">${avatar(j.company)}<div><a href="#/job/${j.id}" style="text-decoration:none"><b>${esc(j.title)}</b></a> ${j.status === 'closed' ? '<span class="tag red">مقفولة</span>' : '<span class="tag">مفتوحة</span>'}<div class="muted">${esc(j.city)} · ${num(j.applicants)} متقدم</div></div></div>
      <div class="row" style="gap:6px"><a class="btn sm" href="#/applicants/${j.id}">المتقدمين</a><a class="btn alt sm" href="#/post/${j.id}">تعديل</a><button class="btn alt sm" data-t="${j.id}" data-s="${j.status === 'open' ? 'closed' : 'open'}">${j.status === 'open' ? 'اقفل' : 'افتح'}</button><button class="btn red sm" data-d="${j.id}">حذف</button></div></div></div>`).join('') || empty('📝', 'لسه ما نشرتش وظائف', '<a class="btn gold" href="#/post">انشر أول وظيفة</a>')) + '</div>');
    document.querySelectorAll('[data-t]').forEach((b) => (b.onclick = async () => { await api(`/jobs/${b.dataset.t}/status`, 'POST', { status: b.dataset.s }); pages.hr(); }));
    document.querySelectorAll('[data-d]').forEach((b) => (b.onclick = async () => { if (confirm('متأكد من الحذف؟')) { await api('/jobs/' + b.dataset.d, 'DELETE'); pages.hr(); } }));
  },
  async post(id) {
    if (!need('hr')) return; const j = id ? await api('/jobs/' + id) : { type: 'full-time' };
    set(`<div class="card"><h2>${id ? 'تعديل الوظيفة' : 'نشر وظيفة جديدة'}</h2><label>المسمى الوظيفي</label><input id="title" value="${esc(j.title)}" placeholder="مثال: مطور Node.js"><div class="row"><div><label>المدينة</label><select id="city">${opts(meta.cities, j.city)}</select></div><div><label>النوع</label><select id="type">${opts(meta.types, j.type)}</select></div><div><label>المجال</label><select id="cat">${opts(meta.categories, j.category, '—')}</select></div></div>
    <div class="row"><div><label>أقل راتب (ج.م)</label><input id="smin" type="number" value="${j.salary_min ?? ''}"></div><div><label>أعلى راتب (ج.م)</label><input id="smax" type="number" value="${j.salary_max ?? ''}"></div></div>
    <label><input type="checkbox" id="remote" ${j.remote ? 'checked' : ''}> متاح عن بعد</label><label>وصف الوظيفة</label><textarea id="desc">${esc(j.description)}</textarea><label>المتطلبات (كل سطر نقطة)</label><textarea id="req">${esc(j.requirements)}</textarea>
    <p><button class="btn gold" id="b">${id ? 'حفظ' : 'نشر الوظيفة'}</button></p><div class="err" id="e"></div></div>`);
    $('#b').onclick = async () => { try { const body = { title: $('#title').value, city: $('#city').value, type: $('#type').value, category: $('#cat').value, salary_min: $('#smin').value, salary_max: $('#smax').value, remote: $('#remote').checked, description: $('#desc').value, requirements: $('#req').value };
      await api(id ? '/jobs/' + id : '/jobs', id ? 'PUT' : 'POST', body); toast('تم ✓'); location.hash = '#/hr'; } catch (e) { $('#e').textContent = e.message; } };
  },
  async applicants(id) {
    if (!need('hr')) return; set(skel(2)); const [j, l] = await Promise.all([api('/jobs/' + id), api(`/jobs/${id}/applications`)]);
    let f = '';
    const draw = () => {
      const list = l.filter((a) => !f || a.status === f);
      $('#res').innerHTML = list.map((a) => `<div class="card"><div class="row between"><div class="person">${avatar(a.name)}<div><b>${esc(a.name)}</b><div class="muted">${esc(a.headline)} · ${esc(a.city)}</div><div class="muted">${esc(a.email)} ${esc(a.phone)}</div></div></div>
      <select data-a="${a.id}" style="width:auto">${meta.statuses.map((s) => `<option value="${s}" ${s === a.status ? 'selected' : ''}>${ST_AR[s]}</option>`).join('')}</select></div>
      ${a.skills ? `<p style="margin:10px 0 0">${a.skills.split(',').map((s) => `<span class="tag gray">${esc(s.trim())}</span> `).join('')}</p>` : ''}${a.note ? `<p class="prose" style="margin:8px 0 0">💬 ${esc(a.note)}</p>` : ''}</div>`).join('') || empty('🕓', 'مفيش متقدمين هنا');
      document.querySelectorAll('[data-a]').forEach((s) => (s.onchange = async () => { await api(`/applications/${s.dataset.a}/status`, 'POST', { status: s.value }); l.find((x) => x.id == s.dataset.a).status = s.value; toast('تم التحديث ✓'); }));
    };
    set(`<div class="ph"><div><a href="#/hr" class="muted">‹ رجوع</a><h1>المتقدمين: ${esc(j.title)}</h1></div><span class="tag">${num(l.length)}</span></div><div class="chips" id="fl" style="margin-bottom:14px"></div><div id="res"></div>`);
    $('#fl').innerHTML = ['', ...meta.statuses].map((s) => `<button class="chip ${s === f ? 'on' : ''}" data-f="${s}">${s ? ST_AR[s] : 'الكل'}<small>${num(s ? l.filter((a) => a.status === s).length : l.length)}</small></button>`).join('');
    document.querySelectorAll('[data-f]').forEach((b) => (b.onclick = () => { f = b.dataset.f; document.querySelectorAll('[data-f]').forEach((x) => x.classList.toggle('on', x === b)); draw(); }));
    draw();
  },
  async candidates() {
    if (!need('hr')) return;
    set(`<div class="ph"><h1>ابحث عن مرشحين</h1></div><div class="filters" style="grid-template-columns:2fr 1fr"><input id="q" placeholder="🔍 مهارة أو مسمى..."><select id="city">${opts(meta.cities, '', 'كل المدن')}</select></div><div id="res" class="duo"></div>`);
    const go = async () => { const l = await api('/candidates?' + new URLSearchParams({ q: $('#q').value, city: $('#city').value }));
      $('#res').innerHTML = l.map((c) => `<div class="card" style="margin:0"><div class="person">${avatar(c.name)}<div><b>${esc(c.name)}</b><div class="muted">${esc(c.headline)} · ${esc(c.city)}</div></div></div><p style="margin:10px 0 6px">${(c.skills || '').split(',').filter(Boolean).map((s) => `<span class="tag gray">${esc(s.trim())}</span> `).join('')}</p><div class="muted">${esc(c.bio)}</div></div>`).join('') || empty('🔎', 'مفيش مرشحين بالشروط دي'); };
    $('#q').oninput = (() => { let t; return () => { clearTimeout(t); t = setTimeout(go, 250); }; })(); $('#city').onchange = go; go();
  },
};
async function route() {
  nav();
  const [name, arg] = (location.hash.split('?')[0].replace('#', '').split('/').slice(1));
  try { await (pages[name || 'home'] || pages.home)(arg); } catch (e) { set(`<div class="card err">${esc(e.message)}</div>`); }
}
(async () => { meta = await api('/meta'); if (tok()) me = await api('/me').catch(() => (localStorage.removeItem('token'), null)); window.onhashchange = route; route(); })();
