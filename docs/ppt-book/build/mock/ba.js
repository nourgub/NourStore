// Before/after figures: two (or three) slides side by side, read from right to left.
const AR = "font-family:'Noto Naskh Arabic','Noto Sans',sans-serif";
const badge = (txt, good) => `<div style="display:inline-block;padding:6px 22px;border-radius:30px;font:800 24px 'Noto Naskh Arabic','Noto Sans',sans-serif;color:#fff;background:${good ? '#2E7D4F' : '#C43E1C'};margin-bottom:12px">${good ? '✓' : '✗'} ${txt}</div>`;
const panel = (label, good, inner, w, m) => `<div style="text-align:center;direction:rtl"${M(m, 'tr')}>${badge(label, good)}${slide(w, inner, { style: `outline:3px solid ${good ? '#2E7D4F' : '#C43E1C'}` })}</div>`;
const ba = (panels, w = 700) => `<div class="win" style="background:#F3F2F1;display:flex;flex-direction:row;align-items:center;justify-content:center;gap:56px;direction:rtl">${panels.map((p, i) => panel(p[0], p[1], p[2], w, i + 1)).join('')}</div>`;
const T = (t, sz = 5.2, c = '#1F2937') => `<div style="font-size:${sz}cqw;font-weight:800;color:${c};${AR};line-height:1.3;margin-bottom:3%">${t}</div>`;
const box_ = (st, inner) => `<div style="position:absolute;inset:0;direction:rtl;text-align:right;padding:5% 6%;${AR};${st}">${inner}</div>`;
const LONG = 'يستهلك الإنسان كميات كبيرة من الماء يوميا في الشرب والطبخ والتنظيف والاستحمام وسقي الحدائق، وجزء كبير من هذا الماء يضيع دون فائدة بسبب الحنفيات المفتوحة والتسربات وطول مدة الاستحمام، ولذلك يجب على كل فرد أن ينتبه إلى طريقة استعماله للماء وأن يغير بعض عاداته اليومية حتى نحافظ على هذه الثروة للأجيال القادمة.';

SHOTS.B03 = () => ba([
  ['قبل', 0, box_('background:#fff', T('الماء', 4.4) + `<div style="font-size:2.3cqw;line-height:1.5;color:#555;text-align:justify">${LONG}</div>`)],
  ['بعد', 1, box_('background:#fff', T('كيف نقتصد في الماء؟') + SL.bullets(['أغلق الحنفية أثناء تنظيف الأسنان', 'استحمام أقصر', 'أصلح التسربات بسرعة', 'اسق الحديقة مساء'], 4.4))],
]);

const mini = (bg, fg, font, title, logo) => `<div style="position:relative;width:31%;aspect-ratio:16/9;background:${bg};box-shadow:0 1px 3px #0004;overflow:hidden;direction:rtl">
<div style="position:absolute;${logo};width:14%;height:16%;border-radius:50%;background:#D4A84B"></div>
<div style="position:absolute;top:${font.top};right:8%;left:8%;font-size:2.6cqw;font-weight:800;color:${fg};font-family:${font.f};text-align:${font.a}">${title}</div>
<div style="position:absolute;top:58%;right:8%;width:60%;height:5%;background:${fg};opacity:.35"></div><div style="position:absolute;top:70%;right:8%;width:45%;height:5%;background:${fg};opacity:.35"></div></div>`;
const trio = (arr) => `<div style="position:absolute;inset:0;background:#E7E5E4;display:flex;flex-wrap:wrap;gap:3%;align-content:center;justify-content:center;padding:3%">${arr.join('')}</div>`;
const NS = "'Noto Naskh Arabic'";
SHOTS.B04 = () => ba([
  ['قبل', 0, trio([mini('#FFF3B0', '#7A1F1F', { top: '30%', f: "'Noto Sans'", a: 'center' }, 'المقدمة', 'left:6%;top:6%'),
    mini('#1B4D3E', '#ffffff', { top: '10%', f: NS, a: 'right' }, 'المشكلة', 'right:6%;bottom:6%'),
    mini('#ffffff', '#2B579A', { top: '42%', f: "'DejaVu Serif'", a: 'left' }, 'الحل', 'left:42%;top:4%'),
    mini('#F8D7E8', '#5B2C83', { top: '18%', f: NS, a: 'center' }, 'الأرقام', 'left:6%;bottom:6%'),
    mini('#222', '#FFD54F', { top: '35%', f: "'Noto Sans'", a: 'right' }, 'الخلاصة', 'right:40%;bottom:4%'),
    mini('#E3F2FD', '#C62828', { top: '8%', f: NS, a: 'left' }, 'شكرا', 'right:6%;top:6%')])],
  ['بعد', 1, trio(['المقدمة', 'المشكلة', 'الحل', 'الأرقام', 'الخلاصة', 'شكرا'].map(t => mini('#ffffff', '#5A1A0A', { top: '12%', f: NS, a: 'right' }, t, 'left:5%;top:7%').replace('background:#ffffff', 'background:#ffffff;border-top:6px solid #C43E1C')))],
]);

SHOTS.B05 = () => ba([['قبل', 0, SL.content('مراحل المشروع', circles(0))], ['بعد', 1, SL.content('مراحل المشروع', circles(1))]]);

const steps = ['التخطيط', 'التصميم', 'التدريب', 'العرض'];
SHOTS.B06 = () => ba([
  ['قبل', 0, box_('background:#fff', T('مراحل العرض') + `<ol style="font-size:3.6cqw;line-height:1.7;padding-right:6%;margin:0;color:#333">${steps.map(s => `<li>${s}</li>`).join('')}</ol>`)],
  ['بعد', 1, box_('background:#fff', T('مراحل العرض') + `<div style="display:flex;gap:1.5%;margin-top:9%;direction:rtl">${steps.map((s, i) => `<div style="flex:1;height:22cqw;background:${['#5A1A0A', '#8C2A12', '#C43E1C', '#D4A84B'][i]};color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;clip-path:polygon(100% 0,14% 0,0 50%,14% 100%,100% 100%,86% 50%);font-size:3.4cqw;font-weight:800"><span style="font-size:5cqw">${i + 1}</span>${s}</div>`).join('')}</div>`)],
]);

const dense = () => {
  const rows = [['المنتج', 'ث1', 'ث2', 'ث3', 'ث4', 'المجموع'], ['قهوة', '42', '51', '47', '66', '206'], ['شاي', '31', '35', '33', '44', '143'], ['عصير', '22', '28', '25', '41', '116'], ['ماء', '25', '36', '30', '39', '130'], ['المجموع', '120', '150', '135', '190', '595']];
  return `<table style="width:100%;border-collapse:collapse;font-size:2.4cqw;color:#444;direction:rtl">${rows.map((r, i) => `<tr>${r.map(c => `<td style="border:1px solid #bbb;padding:.6% 1%;text-align:center;${i === 0 ? 'background:#eee;font-weight:700' : ''}">${c}</td>`).join('')}</tr>`).join('')}</table>`;
};
const bars = (vals, labels, hi, maxv) => `<div style="position:absolute;left:8%;right:8%;top:30%;bottom:12%;display:flex;align-items:flex-end;gap:7%;border-bottom:2px solid #999;direction:rtl">${vals.map((v, i) => `<div style="flex:1;height:${v / maxv * 100}%;background:${i === hi ? '#C43E1C' : '#C9B8AE'};position:relative"><span style="position:absolute;top:-5cqw;left:0;right:0;text-align:center;font-size:3.6cqw;font-weight:800;color:${i === hi ? '#C43E1C' : '#555'}">${v}</span><span style="position:absolute;bottom:-5cqw;left:0;right:0;text-align:center;font-size:3cqw;color:#444">${labels[i]}</span></div>`).join('')}</div>`;
SHOTS.B07 = () => ba([
  ['قبل', 0, box_('background:#fff', T('بيانات المبيعات', 4.4) + dense())],
  ['بعد', 1, box_('background:#fff', T('المبيعات بلغت ذروتها في الثلاثي الرابع', 4.6))+bars([120, 150, 135, 190], ['ث1', 'ث2', 'ث3', 'ث4'], 3, 200)],
]);

SHOTS.B09A = () => ba([
  ['ضعيف', 0, box_('background:#fff', `<div style="font-size:4.4cqw;font-weight:700;color:#C8C8C8">نتائج الاستبيان</div><div style="font-size:2.6cqw;color:#BDBDBD;margin-top:4%;line-height:1.6">72 % من المشاركين راضون عن الخدمة، و18 % محايدون.</div>`)],
  ['جيد', 1, box_('background:#FAF7F2', `<div style="font-size:6.4cqw;font-weight:800;color:#1F2937">نتائج الاستبيان</div><div style="font-size:4.8cqw;color:#1F2937;margin-top:5%;line-height:1.5">72 % راضون عن الخدمة</div>`)],
  ['جيد', 1, box_('background:#0F2747', `<div style="font-size:6.4cqw;font-weight:800;color:#ffffff">نتائج الاستبيان</div><div style="font-size:4.8cqw;color:#F0D58C;margin-top:5%;line-height:1.5">72 % راضون عن الخدمة</div>`)],
], 470);

const PIE = [18, 15, 14, 13, 12, 10, 10, 8], PL = ['الدار البيضاء', 'الرباط', 'فاس', 'مراكش', 'طنجة', 'أكادير', 'وجدة', 'مكناس'];
const PC = ['#C43E1C', '#D4A84B', '#2B579A', '#217346', '#8C2A12', '#7E57C2', '#00897B', '#9E9E9E'];
const pie = () => { let a = 0; const st = PIE.map((v, i) => { const s = `${PC[i]} ${a}% ${a + v}%`; a += v; return s; }).join(','); return `<div style="position:absolute;right:6%;top:24%;width:30cqw;height:30cqw;border-radius:50%;background:conic-gradient(${st})"></div><div style="position:absolute;left:6%;top:24%;font-size:2.6cqw;line-height:1.55">${PL.map((l, i) => `<div><span style="display:inline-block;width:2.2cqw;height:2.2cqw;background:${PC[i]};margin-left:1cqw"></span>${l}</div>`).join('')}</div>`; };
const hbars = () => `<div style="position:absolute;right:6%;left:6%;top:24%;bottom:6%;display:flex;flex-direction:column;justify-content:space-between">${PIE.map((v, i) => `<div style="display:flex;align-items:center;gap:2%;font-size:2.7cqw"><span style="width:24%;text-align:right">${PL[i]}</span><div style="height:2.8cqw;width:${v * 3.6}%;background:${i === 0 ? '#C43E1C' : '#C9B8AE'}"></div><b style="color:${i === 0 ? '#C43E1C' : '#555'}">${v} %</b></div>`).join('')}</div>`;
SHOTS.B09B = () => ba([
  ['ضعيف', 0, box_('background:#fff', T('المبيعات حسب المدينة', 4.6)) + pie()],
  ['أفضل', 1, box_('background:#fff', T('الدار البيضاء في المقدمة بـ 18 %', 4.6)) + hbars()],
]);

SHOTS.B09C = () => ba([
  ['قبل', 0, box_('background:#fff', `<div style="font-size:4.6cqw;font-weight:800;color:#2B579A;font-family:'DejaVu Serif'">المبيعات</div><div style="font-size:2.3cqw;color:#888;line-height:1.5;margin-top:2%;width:62%">عرفت المبيعات هذا العام تحسنا ملحوظا مقارنة بالعام الماضي حيث ارتفعت بنسبة خمسة وعشرين في المائة وذلك بفضل الحملة الإعلانية الجديدة وتوسيع شبكة التوزيع وإطلاق منتجات جديدة لاقت إقبالا كبيرا من الزبناء في مختلف المدن.</div>
<div style="position:absolute;left:5%;top:20%;width:18%;height:20%;background:#7E57C2;border-radius:50%"></div><div style="position:absolute;left:24%;top:52%;width:15%;height:16%;background:#00C853"></div><div style="position:absolute;left:9%;top:62%;width:12%;height:24%;background:#FFB300;transform:rotate(12deg)"></div><div style="position:absolute;right:40%;bottom:6%;font-size:2cqw;color:#E91E63">+25%</div>`)],
  ['بعد', 1, box_('background:#fff;border-top:1.2cqw solid #C43E1C', T('المبيعات ارتفعت 25 % هذا العام', 5, '#5A1A0A') + `<div style="font-size:10cqw;font-weight:800;color:#C43E1C;direction:ltr;text-align:right;line-height:1.1">+25 %</div><div style="display:flex;gap:3%;margin-top:4%">${['حملة إعلانية جديدة', 'توزيع أوسع', 'منتجات جديدة'].map(t => `<div style="flex:1;background:#FBEFEA;border-top:.8cqw solid #D4A84B;padding:3% 2%;text-align:center;font-size:3cqw;font-weight:700;color:#2A1A14">${t}</div>`).join('')}</div>`)],
]);
