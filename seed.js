const { createApp } = require('./server');
const { server, db } = createApp(process.env.DB_FILE);
const crypto = require('node:crypto');
const hash = (pw) => { const s = crypto.randomBytes(16).toString('hex'); return s + ':' + crypto.scryptSync(pw, s, 32).toString('hex'); };
if (db.prepare('SELECT count(*) c FROM users').get().c) { console.log('البيانات موجودة بالفعل'); process.exit(0); }
const ins = (r, ...a) => Number(db.prepare(r).run(...a).lastInsertRowid);
const hr1 = ins('INSERT INTO users(email,name,role,pass,company,city) VALUES(?,?,?,?,?,?)', 'hr@nile-tech.example', 'منى عادل', 'hr', hash('123456'), 'النيل للتكنولوجيا', 'القاهرة');
const hr2 = ins('INSERT INTO users(email,name,role,pass,company,city) VALUES(?,?,?,?,?,?)', 'hr@delta-retail.example', 'كريم حسن', 'hr', hash('123456'), 'دلتا للتجزئة', 'المنصورة');
ins('INSERT INTO users(email,name,role,pass,headline,skills,city,bio) VALUES(?,?,?,?,?,?,?,?)', 'ahmed@example.com', 'أحمد سمير', 'seeker', hash('123456'), 'مطور ويب', 'JavaScript, React, Node.js', 'الجيزة', 'خبرة سنتين في تطوير الويب.');
const J = [
  [hr1, 'النيل للتكنولوجيا', 'مطور Node.js', 'القاهرة', 'full-time', 1, 'تكنولوجيا المعلومات', 15000, 25000, 'تطوير وصيانة خدمات الـ API للمنتجات.', 'خبرة سنتين Node.js وSQL'],
  [hr1, 'النيل للتكنولوجيا', 'مصمم UI/UX', 'الجيزة', 'full-time', 0, 'التصميم', 12000, 20000, 'تصميم واجهات تطبيقات الموبايل والويب.', 'Figma ومعرض أعمال'],
  [hr2, 'دلتا للتجزئة', 'مندوب مبيعات', 'المنصورة', 'full-time', 0, 'المبيعات', 6000, 9000, 'زيارة العملاء وتحقيق أهداف البيع.', 'رخصة قيادة أفضلية'],
  [hr2, 'دلتا للتجزئة', 'أخصائي خدمة عملاء', 'القاهرة', 'part-time', 1, 'خدمة العملاء', 4500, 6500, 'الرد على العملاء بالتليفون والواتساب.', 'لغة إنجليزية جيدة'],
  [hr1, 'النيل للتكنولوجيا', 'متدرب تسويق رقمي', 'العاصمة الإدارية', 'internship', 0, 'التسويق', 2500, 3500, 'مساعدة فريق التسويق في إدارة الحملات.', 'طالب أو حديث التخرج'],
];
for (const j of J) ins('INSERT INTO jobs(hr_id,company,title,city,type,remote,category,salary_min,salary_max,description,requirements) VALUES(?,?,?,?,?,?,?,?,?,?,?)', ...j);
console.log('تم. حسابات تجريبية (كلمة السر 123456): hr@nile-tech.example (HR) , ahmed@example.com (باحث عن عمل)');
process.exit(0);
