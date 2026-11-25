const { createApp } = require('./server');
const { server, db } = createApp(process.env.DB_FILE);
const crypto = require('node:crypto');
const hash = (pw) => { const s = crypto.randomBytes(16).toString('hex'); return s + ':' + crypto.scryptSync(pw, s, 32).toString('hex'); };
if (db.prepare('SELECT count(*) c FROM users').get().c) { console.log('البيانات موجودة بالفعل'); process.exit(0); }
const ins = (r, ...a) => Number(db.prepare(r).run(...a).lastInsertRowid);
const PW = hash('123456');
const hr = (email, name, company, city) => ins('INSERT INTO users(email,name,role,pass,company,city,bio) VALUES(?,?,?,?,?,?,?)', email, name, 'hr', PW, company, city, 'نبحث دايمًا عن ناس شغوفة تكبر معانا.');
const hr1 = hr('hr@nile-tech.example', 'منى عادل', 'النيل للتكنولوجيا', 'القاهرة');
const hr2 = hr('hr@delta-retail.example', 'كريم حسن', 'دلتا للتجزئة', 'المنصورة');
const hr3 = hr('hr@sky-logistics.example', 'هبة محمود', 'سكاي لوجيستكس', 'الإسكندرية');
const hr4 = hr('hr@shifa.example', 'د. طارق سعيد', 'صيدليات الشفاء', 'الجيزة');
const hr5 = hr('hr@zaka.example', 'سارة يوسف', 'ذكاء للتسويق الرقمي', 'العاصمة الإدارية');
const hr6 = hr('hr@bayt-elkhebra.example', 'ياسر فؤاد', 'بيت الخبرة للتدريب', 'القاهرة');
const seeker = (email, name, headline, skills, city, bio) => ins('INSERT INTO users(email,name,role,pass,headline,skills,city,bio,phone) VALUES(?,?,?,?,?,?,?,?,?)', email, name, 'seeker', PW, headline, skills, city, bio, '0100000' + Math.floor(1000 + Math.random() * 8999));
const s1 = seeker('ahmed@example.com', 'أحمد سمير', 'مطور ويب', 'JavaScript, React, Node.js, SQL', 'الجيزة', 'خبرة سنتين في تطوير الويب وبحب أبني منتجات بسيطة وسريعة.');
const s2 = seeker('nour@example.com', 'نور هاني', 'مصممة UI/UX', 'Figma, Photoshop, Design Systems', 'القاهرة', 'مصممة واجهات بخبرة 3 سنين في تطبيقات الموبايل.');
const s3 = seeker('omar@example.com', 'عمر خالد', 'أخصائي تسويق رقمي', 'Facebook Ads, SEO, Google Analytics', 'الإسكندرية', 'أدير حملات إعلانية بميزانيات متوسطة وكبيرة.');
const s4 = seeker('mariam@example.com', 'مريم أشرف', 'محاسبة', 'Excel, ERP, ضرائب', 'طنطا', 'محاسبة بخبرة 4 سنين في الحسابات العامة والضرائب.');
const s5 = seeker('youssef@example.com', 'يوسف إبراهيم', 'مندوب مبيعات', 'تفاوض, بيع ميداني, CRM', 'المنصورة', 'خبرة 5 سنين في المبيعات الميدانية.');
const H = (n) => `-${n} hours`;
const J = [
  [hr1, 'النيل للتكنولوجيا', 'مطور Node.js', 'القاهرة', 'full-time', 1, 'تكنولوجيا المعلومات', 15000, 25000, 'تطوير وصيانة خدمات الـ API للمنتجات، مع فريق بيشتغل بأحدث الأدوات.', 'خبرة سنتين Node.js وSQL\nمعرفة بـ Git', H(2)],
  [hr1, 'النيل للتكنولوجيا', 'مصمم UI/UX', 'الجيزة', 'full-time', 0, 'التصميم', 12000, 20000, 'تصميم واجهات تطبيقات الموبايل والويب بشكل عصري وسهل الاستخدام.', 'Figma ومعرض أعمال', H(5)],
  [hr1, 'النيل للتكنولوجيا', 'متدرب تسويق رقمي', 'العاصمة الإدارية', 'internship', 0, 'التسويق', 2500, 3500, 'مساعدة فريق التسويق في إدارة الحملات وتحليل النتائج.', 'طالب أو حديث التخرج', H(30)],
  [hr1, 'النيل للتكنولوجيا', 'مهندس DevOps', 'القاهرة', 'full-time', 1, 'تكنولوجيا المعلومات', 28000, 42000, 'إدارة البنية السحابية وخطوط النشر الآلي.', 'خبرة في Docker وCI/CD وAWS', H(9)],
  [hr2, 'دلتا للتجزئة', 'مندوب مبيعات', 'المنصورة', 'full-time', 0, 'المبيعات', 6000, 9000, 'زيارة العملاء وتحقيق أهداف البيع مع عمولات مجزية.', 'رخصة قيادة أفضلية', H(7)],
  [hr2, 'دلتا للتجزئة', 'أخصائي خدمة عملاء', 'القاهرة', 'part-time', 1, 'خدمة العملاء', 4500, 6500, 'الرد على العملاء بالتليفون والواتساب.', 'لغة إنجليزية جيدة', H(20)],
  [hr2, 'دلتا للتجزئة', 'مدير فرع', 'طنطا', 'full-time', 0, 'المبيعات', 14000, 18000, 'إدارة فريق الفرع والمخزون والمبيعات اليومية.', 'خبرة 3 سنين في التجزئة', H(50)],
  [hr3, 'سكاي لوجيستكس', 'منسق شحن', 'الإسكندرية', 'full-time', 0, 'اللوجستيات', 8000, 12000, 'تنسيق حركة الشحنات والتواصل مع شركات النقل.', 'خبرة في اللوجستيات أفضلية', H(12)],
  [hr3, 'سكاي لوجيستكس', 'سائق توصيل', 'السادس من أكتوبر', 'contract', 0, 'اللوجستيات', 7000, 10000, 'توصيل الطلبات داخل المدينة بجدول مرن.', 'رخصة قيادة سارية', H(26)],
  [hr4, 'صيدليات الشفاء', 'صيدلي', 'الجيزة', 'full-time', 0, 'الطب والصيدلة', 10000, 15000, 'صرف الأدوية وتقديم الاستشارة للعملاء.', 'بكالوريوس صيدلة ونقابة', H(14)],
  [hr4, 'صيدليات الشفاء', 'محاسب', 'القاهرة', 'full-time', 0, 'المحاسبة والمالية', 9000, 13000, 'إعداد القيود اليومية ومطابقة الحسابات.', 'خبرة سنتين محاسبة وإكسل', H(40)],
  [hr5, 'ذكاء للتسويق الرقمي', 'مدير حملات إعلانية', 'العاصمة الإدارية', 'full-time', 1, 'التسويق', 16000, 24000, 'قيادة حملات سوشيال ميديا لعملاء كبار.', 'خبرة 3 سنين في الإعلانات المدفوعة', H(3)],
  [hr5, 'ذكاء للتسويق الرقمي', 'كاتب محتوى', 'القاهرة', 'freelance', 1, 'التسويق', 5000, 9000, 'كتابة محتوى عربي مبدع للسوشيال ميديا والمواقع.', 'لغة عربية قوية ونماذج أعمال', H(18)],
  [hr5, 'ذكاء للتسويق الرقمي', 'مصور ومونتير فيديو', 'الجيزة', 'contract', 0, 'التصميم', 8000, 14000, 'تصوير ومونتاج فيديوهات قصيرة للحملات.', 'معرض أعمال', H(60)],
  [hr6, 'بيت الخبرة للتدريب', 'مدرس لغة إنجليزية', 'القاهرة', 'part-time', 0, 'التعليم', 5000, 8000, 'تدريس كورسات محادثة وأعمال للكبار.', 'شهادة IELTS أو ما يعادلها', H(10)],
  [hr6, 'بيت الخبرة للتدريب', 'مسؤول موارد بشرية', 'القاهرة', 'full-time', 0, 'الموارد البشرية', 9000, 14000, 'التوظيف وشؤون العاملين وتنظيم التدريب.', 'خبرة سنة HR على الأقل', H(35)],
];
const jid = [];
for (const j of J) { const [a, b, c, d, e, f, g, h, i, k, l, ago] = j; jid.push(ins("INSERT INTO jobs(hr_id,company,title,city,type,remote,category,salary_min,salary_max,description,requirements,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,datetime('now',?))", a, b, c, d, e, f, g, h, i, k, l, ago)); }
const app = (j, s, st, note, ago) => ins("INSERT INTO applications(job_id,seeker_id,note,status,created_at) VALUES(?,?,?,?,datetime('now',?))", jid[j], s, note, st, ago);
app(0, s1, 'shortlisted', 'مهتم جدًا بالدور ومستعد أبدأ فورًا.', H(1));
app(1, s2, 'reviewed', 'مرفق معرض أعمالي على Behance.', H(4));
app(2, s3, 'new', 'حابب أتعلم وأكبر معاكم.', H(6));
app(3, s1, 'new', 'عندي خبرة أساسية في Docker.', H(8));
app(0, s5, 'new', '', H(10));
app(1, s3, 'rejected', '', H(24));
console.log('تم. حسابات تجريبية (كلمة السر 123456): hr@nile-tech.example (HR) , ahmed@example.com (باحث عن عمل)');
process.exit(0);
