// Downloadable PowerPoint projects for the Nourix Academy PowerPoint book.
// Structured decks: theme, named layouts with placeholders, sections. Arabic content (RTL), fictitious data.
const pptxgen = require('pptxgenjs');
const path = require('path');
const { applyTheme } = require('/root/.claude/skills/synced/71915369-dd07-4c56-b6dc-b58f22bc837a_19973b43-eeeb-4fa5-85f9-8afe53831a92/pptx/scripts/apply_theme.js');
const OUT = path.join(__dirname, '..', 'projets');
const R = { rtlMode: true, align: 'right' };

function makeTheme(name, c) {
  return { name, headFontFace: 'Arial', bodyFontFace: 'Arial', colors: Object.assign({ dk1: '1F1F1F', lt1: 'FFFFFF', hlink: c.accent1, folHlink: c.accent2 }, c) };
}

// Layouts shared by every deck. T.colors gives the hex values; slides use scheme colors.
function layouts(pres, T, footer) {
  const C = pres.SchemeColor;
  pres.defineSlideMaster({
    title: 'TITRE', background: { color: T.colors.dk2 },
    objects: [
      { placeholder: { options: { name: 'title', type: 'title', x: 0.6, y: 1.55, w: 8.8, h: 1.4, fontSize: 40, bold: true, color: C.background1, valign: 'bottom', ...R }, text: 'Titre' } },
      { placeholder: { options: { name: 'body', type: 'body', x: 0.6, y: 3.05, w: 8.8, h: 0.9, fontSize: 20, color: C.accent2, valign: 'top', ...R }, text: 'Sous-titre' } },
      { text: { text: footer, options: { x: 0.6, y: 5.05, w: 8.8, h: 0.3, fontSize: 10, color: C.background2, ...R } } },
    ],
  });
  pres.defineSlideMaster({
    title: 'SECTION', background: { color: T.colors.accent1 },
    objects: [
      { placeholder: { options: { name: 'title', type: 'title', x: 0.6, y: 2.0, w: 8.8, h: 1.2, fontSize: 36, bold: true, color: C.background1, ...R }, text: 'Section' } },
      { placeholder: { options: { name: 'body', type: 'body', x: 0.6, y: 3.15, w: 8.8, h: 0.6, fontSize: 18, color: C.background1, ...R }, text: '' } },
    ],
  });
  pres.defineSlideMaster({
    title: 'CONTENU', background: { color: T.colors.lt1 },
    margin: [0.4, 0.5, 0.5, 0.5],
    objects: [
      { placeholder: { options: { name: 'title', type: 'title', x: 0.5, y: 0.3, w: 9.0, h: 0.75, fontSize: 30, bold: true, color: C.text2, ...R }, text: 'Titre' } },
      { text: { text: footer, options: { x: 3.5, y: 5.2, w: 6.0, h: 0.3, fontSize: 10, color: '7F7F7F', ...R } } },
    ],
    slideNumber: { x: 0.5, y: 5.2, w: 0.6, h: 0.3, fontSize: 10, color: '7F7F7F' },
  });
}

const card = (s, C, x, y, w, h, title, text, o = {}) => {
  s.addShape('roundRect', { x, y, w, h, rectRadius: 0.12, fill: { color: o.fill || C.background2 }, line: { color: o.fill || C.background2 }, objectName: 'carte' });
  if (o.icon) s.addText(o.icon, { x: x + w - 0.75, y: y + 0.2, w: 0.55, h: 0.55, shape: 'ellipse', fill: { color: o.iconFill || C.accent1 }, color: C.background1, fontSize: 18, bold: true, align: 'center', valign: 'middle', isTextBox: true });
  s.addText(title, { x: x + 0.2, y: y + (o.icon ? 0.85 : 0.2), w: w - 0.4, h: 0.45, fontSize: 16, bold: true, color: o.titleColor || C.text2, isTextBox: true, ...R });
  if (text) s.addText(text, { x: x + 0.2, y: y + (o.icon ? 1.3 : 0.65), w: w - 0.4, h: h - (o.icon ? 1.4 : 0.75), fontSize: 14, color: o.textColor || C.text1, valign: 'top', isTextBox: true, ...R });
};
const stat = (s, C, x, y, w, big, label, color, size) => {
  s.addText(big, { x, y, w, h: 0.9, fontSize: size || 44, bold: true, color: color || C.accent1, isTextBox: true, ...R });
  s.addText(label, { x, y: y + 0.9, w, h: 0.6, fontSize: 14, color: C.text1, valign: 'top', isTextBox: true, ...R });
};
const rtlRows = rows => rows.map(r => r.slice().reverse());
const chartOpts = (C, T, o = {}) => Object.assign({
  showTitle: false, catAxisLabelColor: '595959', valAxisLabelColor: '595959', catAxisLabelFontFace: '+mn-lt', valAxisLabelFontFace: '+mn-lt', dataLabelFontFace: '+mn-lt',
  catAxisLabelFontSize: 11, valAxisLabelFontSize: 10, dataLabelFontSize: 10, valGridLine: { color: 'D9D9D9', size: 0.5 }, catGridLine: { style: 'none' },
  chartColors: [T.colors.accent1, T.colors.accent2, T.colors.accent3, T.colors.accent4, T.colors.accent5, T.colors.accent6], showLegend: false,
}, o);

async function build(file, T, footer, fill) {
  const pres = new pptxgen(); pres.layout = 'LAYOUT_16x9'; pres.rtlMode = true;
  pres.author = 'Nourix Academy'; pres.company = 'Nourix Academy'; pres.title = file.replace('.pptx', '');
  pres.theme = { headFontFace: T.headFontFace, bodyFontFace: T.bodyFontFace };
  layouts(pres, T, footer);
  fill(pres, pres.SchemeColor, T);
  const f = path.join(OUT, file);
  await pres.writeFile({ fileName: f }); await applyTheme(f, T);
  console.log('ok', file);
}
const S = (pres, master, section, title, body) => {
  const s = pres.addSlide({ masterName: master, sectionTitle: section });
  if (title !== undefined) s.addText(title, { placeholder: 'title' });
  if (body !== undefined) s.addText(body, { placeholder: 'body' });
  return s;
};

// ---------------------------------------------------------------- 1. Exposé scolaire
const p1 = () => build('Projet1-Expose-scolaire.pptx', makeTheme('Nourix Eau', { dk2: '0B3C5D', lt2: 'E8F4F8', accent1: '1B7F9E', accent2: '7FD1E8', accent3: 'F2A541', accent4: '2E5E4E', accent5: '9BC53D', accent6: 'C3423F' }),
  'Nourix Academy · المشروع 1: عرض مدرسي', (pres, C) => {
    pres.addSection({ title: 'مقدمة' });
    S(pres, 'TITRE', 'مقدمة', 'الماء ثروة يجب أن نحافظ عليها', 'عرض مدرسي · إعداد: سامي مثال').addNotes('رحّب بالحضور، وقدّم نفسك والموضوع في جملة واحدة.');
    let s = S(pres, 'CONTENU', 'مقدمة', 'خطة العرض');
    ['لماذا الماء ثمين؟', 'أين يذهب الماء في البيت؟', 'كيف نقتصد فيه؟', 'خلاصة'].forEach((t, i) => card(s, C, 7.05 - i * 2.2, 1.5, 2.0, 2.6, t, '', { icon: String(i + 1) }));
    s.addNotes('اعرض الأجزاء الأربعة بسرعة: هذا يساعد الجمهور على المتابعة.');
    pres.addSection({ title: 'الماء على الأرض' });
    s = S(pres, 'CONTENU', 'الماء على الأرض', 'لماذا الماء ثمين؟');
    stat(s, C, 5.3, 1.5, 4.2, 'حوالي 97 %', 'من ماء الأرض مالح، في البحار والمحيطات');
    stat(s, C, 0.5, 1.5, 4.2, 'أقل من 1 %', 'ماء عذب يسهل الوصول إليه للشرب والزراعة', C.accent3);
    s.addText('المصدر: أرقام تقريبية شائعة في كتب العلوم. تحقّق منها في كتابك المدرسي قبل العرض.', { x: 0.5, y: 4.4, w: 9, h: 0.4, fontSize: 11, italic: true, color: '7F7F7F', isTextBox: true, ...R });
    s = S(pres, 'CONTENU', 'الماء على الأرض', 'أين يذهب الماء في البيت؟');
    s.addChart(pres.charts.BAR, [{ name: 'الاستهلاك (%)', labels: ['الاستحمام', 'المرحاض', 'الغسيل', 'المطبخ', 'أخرى'], values: [35, 25, 15, 15, 10] }],
      chartOpts(C, { colors: { accent1: '1B7F9E' } }, { x: 0.5, y: 1.2, w: 5.6, h: 3.7, barDir: 'bar', showValue: true, dataLabelPosition: 'outEnd', dataLabelFormatCode: '0"%"', chartColors: ['1B7F9E'], valAxisHidden: true, valGridLine: { style: 'none' } }));
    s.addText([{ text: 'مثال توضيحي', options: { bold: true, breakLine: true } }, { text: 'استبدل هذه الأرقام بأرقام من مصدر موثوق أو من فاتورة الماء في بيتك.' }], { x: 6.4, y: 1.4, w: 3.1, h: 1.6, fontSize: 14, color: C.text1, fill: { color: C.background2 }, margin: 0.15, isTextBox: true, ...R });
    pres.addSection({ title: 'الحلول' });
    s = S(pres, 'CONTENU', 'الحلول', 'كيف نقتصد في الماء؟');
    [['أغلق الحنفية', 'أثناء تنظيف الأسنان والصابون.', '1'], ['استحمام أقصر', 'دقائق أقل تعني لترات أقل.', '2'], ['أصلح التسربات', 'حنفية تقطر تضيّع الكثير يومياً.', '3'], ['أعد الاستعمال', 'ماء غسل الخضر يصلح لسقي النباتات.', '4']]
      .forEach((t, i) => card(s, C, 5.05 - (i % 2) * 4.55, 1.3 + Math.floor(i / 2) * 1.85, 4.45, 1.7, t[0], t[1], { icon: t[2], iconFill: i % 2 ? C.accent3 : C.accent1 }));
    S(pres, 'SECTION', 'الحلول', 'خلاصة', 'كل قطرة نوفرها اليوم هي ماء للغد');
    s = S(pres, 'TITRE', 'الحلول', 'شكراً لانتباهكم', 'هل لديكم أسئلة؟');
  });

// ---------------------------------------------------------------- 2. Pitch commercial
const p2 = () => build('Projet2-Pitch-commercial.pptx', makeTheme('Nourix Cafe', { dk2: '3B2416', lt2: 'F6EFE9', accent1: 'B5651D', accent2: 'E6B17E', accent3: '6B8F71', accent4: '8C3B2B', accent5: 'D9A441', accent6: '4A6670' }),
  'Nourix Academy · المشروع 2: عرض تجاري (بيانات خيالية)', (pres, C, T) => {
    pres.addSection({ title: 'البداية' });
    S(pres, 'TITRE', 'البداية', 'Café Atlas', 'قهوة محلية طازجة، تصلك إلى المكتب كل أسبوع');
    let s = S(pres, 'CONTENU', 'البداية', 'المشكلة');
    stat(s, C, 5.3, 1.4, 4.2, '3 من 5', 'موظفين يشترون قهوة جاهزة خارج المكتب كل يوم (استطلاع خيالي)');
    card(s, C, 0.5, 1.4, 4.4, 2.6, 'ما يزعج الزبائن', 'وقت ضائع في الطابور، سعر مرتفع، وجودة غير ثابتة.', { icon: '!' });
    pres.addSection({ title: 'الحل' });
    s = S(pres, 'CONTENU', 'الحل', 'الحل: اشتراك قهوة للمكاتب');
    [['طحن طازج', 'نحمّص ونطحن قبل التوصيل بيومين.'], ['توصيل أسبوعي', 'كل اثنين صباحاً، دون طلب جديد.'], ['آلة مجانية', 'مع كل اشتراك لأكثر من 10 موظفين.']].forEach((t, i) => card(s, C, 6.6 - i * 3.05, 1.3, 2.9, 3.0, t[0], t[1], { icon: String(i + 1) }));
    s = S(pres, 'CONTENU', 'الحل', 'المبيعات المتوقعة (بالاشتراكات)');
    s.addChart(pres.charts.BAR, [{ name: 'الاشتراكات', labels: ['الثلاثي 1', 'الثلاثي 2', 'الثلاثي 3', 'الثلاثي 4'], values: [40, 85, 140, 210] }],
      chartOpts(C, T, { x: 0.5, y: 1.2, w: 6.2, h: 3.8, barDir: 'col', showValue: true, dataLabelPosition: 'outEnd', chartColors: [T.colors.accent1] }));
    stat(s, C, 6.9, 1.6, 2.6, '×5', 'نمو متوقع خلال سنة', C.accent3);
    pres.addSection({ title: 'العرض' });
    s = S(pres, 'CONTENU', 'العرض', 'الأسعار');
    const H = { bold: true, color: 'FFFFFF', fill: { color: T.colors.dk2 }, align: 'center' };
    s.addTable(rtlRows([[{ text: 'الباقة', options: H }, { text: 'الموظفون', options: H }, { text: 'الكمية الأسبوعية', options: H }, { text: 'السعر الشهري', options: H }],
      ['صغيرة', 'حتى 10', '1 كغ', '6 000 دج'], ['متوسطة', '11 إلى 30', '3 كغ', '15 000 دج'], ['كبيرة', 'أكثر من 30', '6 كغ', '27 000 دج']]),
      { x: 0.5, y: 1.3, w: 9.0, colW: [2.25, 2.25, 2.25, 2.25], fontSize: 14, fontFace: 'Arial', align: 'center', border: { type: 'solid', color: 'D9D9D9', pt: 0.75 }, rowH: 0.55 });
    s.addText('الأسعار أمثلة للتمرين: ضع أسعارك وعملتك.', { x: 0.5, y: 4.0, w: 9, h: 0.4, fontSize: 11, italic: true, color: '7F7F7F', isTextBox: true, ...R });
    S(pres, 'TITRE', 'العرض', 'ابدأ تجربة مجانية لمدة أسبوعين', 'contact@cafe-atlas.example · 0000 00 00 00');
  });

// ---------------------------------------------------------------- 3. Bilan mensuel (données du Projet Excel 5)
const p3 = () => build('Projet3-Bilan-des-ventes.pptx', makeTheme('Nourix Bilan', { dk2: '262626', lt2: 'F7EDE8', accent1: 'C43E1C', accent2: 'D4A84B', accent3: '7F7F7F', accent4: 'ED7D31', accent5: '5B9BD5', accent6: '70AD47' }),
  'Nourix Academy · المشروع 3: تقرير المبيعات (بيانات ملف Excel، المشروع 5)', (pres, C, T) => {
    pres.addSection({ title: 'الملخص' });
    S(pres, 'TITRE', 'الملخص', 'حصيلة المبيعات: يناير إلى سبتمبر 2026', 'تقرير لمجلس الإدارة');
    let s = S(pres, 'CONTENU', 'الملخص', 'الأرقام الرئيسية');
    [['20,7 م', 'رقم الأعمال (دج)'], ['150', 'عملية بيع'], ['1 201', 'قطعة مباعة'], ['Fatima', 'أفضل بائعة']].forEach((t, i) => stat(s, C, 7.4 - i * 2.3, 1.6, 2.1, t[0], t[1], i === 3 ? C.accent2 : C.accent1, i === 3 ? 32 : 44));
    s.addText('المصدر: ملف Excel «Projet5-Tableau-de-bord-ventes» من كتاب Excel العملي. رقم الأعمال بالدينار (دج)، والبيانات خيالية.', { x: 0.5, y: 3.9, w: 9, h: 0.5, fontSize: 12, italic: true, color: '7F7F7F', isTextBox: true, ...R });
    pres.addSection({ title: 'التحليل' });
    s = S(pres, 'CONTENU', 'التحليل', 'رقم الأعمال حسب الشهر (مليون دج)');
    s.addChart(pres.charts.LINE, [{ name: 'رقم الأعمال', labels: ['يناير', 'فبراير', 'مارس', 'أبريل', 'ماي', 'يونيو', 'يوليو', 'أوت', 'سبتمبر'], values: [1.67, 2.73, 2.18, 3.77, 1.56, 1.50, 1.84, 3.53, 1.96] }],
      chartOpts(C, T, { x: 0.5, y: 1.15, w: 9.0, h: 3.9, lineSize: 3, lineDataSymbol: 'circle', lineDataSymbolSize: 8, showValue: true, dataLabelPosition: 't', dataLabelFormatCode: '0.0', chartColors: [T.colors.accent1] }));
    s = S(pres, 'CONTENU', 'التحليل', 'المناطق والبائعون');
    s.addChart(pres.charts.BAR, [{ name: 'المنطقة', labels: ['الغرب', 'الشرق', 'الجنوب', 'الشمال'], values: [6.28, 5.36, 4.77, 4.32] }],
      chartOpts(C, T, { x: 5.0, y: 1.2, w: 4.5, h: 3.7, barDir: 'bar', showValue: true, dataLabelPosition: 'outEnd', dataLabelFormatCode: '0.0', chartColors: [T.colors.accent1], valAxisHidden: true, valGridLine: { style: 'none' } }));
    const H = { bold: true, color: 'FFFFFF', fill: { color: T.colors.dk2 }, align: 'center' };
    s.addTable(rtlRows([[{ text: 'البائع', options: H }, { text: 'رقم الأعمال (دج)', options: H }], ['Fatima', '5 199 100'], ['Ali', '4 551 500'], ['Hamza', '3 050 400'], ['Asma', '3 034 300'], ['Salma', '2 871 500'], ['Youssef', '2 037 500']]),
      { x: 0.5, y: 1.3, w: 4.2, colW: [2.4, 1.8], fontSize: 13, fontFace: 'Arial', align: 'center', border: { type: 'solid', color: 'D9D9D9', pt: 0.75 }, rowH: 0.45 });
    pres.addSection({ title: 'القرارات' });
    s = S(pres, 'CONTENU', 'القرارات', 'ما الذي نقترحه؟');
    [['دعم منطقة الشمال', 'أضعف المناطق: حملة ترويجية في الربع الأخير.'], ['التركيز على الحواسيب', 'أكثر من نصف رقم الأعمال يأتي منها.'], ['تكريم أفضل بائعة', 'ومشاركة طريقة عملها مع الفريق.']].forEach((t, i) => card(s, C, 6.6 - i * 3.05, 1.3, 2.9, 3.0, t[0], t[1], { icon: String(i + 1) }));
  });

// ---------------------------------------------------------------- 4. Soutenance de mémoire
const p4 = () => build('Projet4-Soutenance-memoire.pptx', makeTheme('Nourix Memoire', { dk2: '14213D', lt2: 'EEF1F7', accent1: '2B4C8C', accent2: 'D4A84B', accent3: '5C7AA8', accent4: '8C2B3B', accent5: '6B8F71', accent6: 'A0A0A0' }),
  'Nourix Academy · المشروع 4: قالب عرض مذكرة', (pres, C, T) => {
    pres.addSection({ title: 'التقديم' });
    S(pres, 'TITRE', 'التقديم', 'أثر التعلم الرقمي على تحصيل الطلبة', 'مذكرة تخرج لنيل شهادة الليسانس · إعداد: سامي مثال · إشراف: أ. مثال');
    let s = S(pres, 'CONTENU', 'التقديم', 'خطة العرض');
    ['الإشكالية', 'الفرضيات', 'المنهجية', 'النتائج', 'الخاتمة'].forEach((t, i) => card(s, C, 7.65 - i * 1.8, 1.6, 1.65, 2.3, t, '', { icon: String(i + 1) }));
    pres.addSection({ title: 'الإطار' });
    s = S(pres, 'CONTENU', 'الإطار', 'الإشكالية');
    s.addText('إلى أي مدى يؤثر استعمال منصات التعلم الرقمي على نتائج طلبة السنة الأولى؟', { x: 0.8, y: 1.6, w: 8.4, h: 1.6, fontSize: 24, bold: true, color: C.accent1, fill: { color: C.background2 }, align: 'center', valign: 'middle', rtlMode: true, isTextBox: true });
    s = S(pres, 'CONTENU', 'الإطار', 'الفرضيات');
    [['الفرضية 1', 'يتحسن معدل الطلبة الذين يستعملون المنصة أسبوعياً.'], ['الفرضية 2', 'التمارين التفاعلية أكثر أثراً من الفيديو وحده.']].forEach((t, i) => card(s, C, 5.05 - i * 4.55, 1.4, 4.45, 2.4, t[0], t[1], { icon: String(i + 1) }));
    s = S(pres, 'CONTENU', 'الإطار', 'المنهجية');
    ['استبيان (120 طالباً)', 'مقارنة النتائج', 'تحليل إحصائي', 'استنتاجات'].forEach((t, i) => {
      s.addText(t, { x: 7.3 - i * 2.25, y: 2.0, w: 2.0, h: 1.2, shape: 'roundRect', rectRadius: 0.1, fill: { color: i % 2 ? C.accent3 : C.accent1 }, color: C.background1, fontSize: 15, bold: true, align: 'center', valign: 'middle', rtlMode: true, isTextBox: true });
      if (i < 3) s.addShape('leftArrow', { x: 6.95 - i * 2.25, y: 2.45, w: 0.3, h: 0.3, fill: { color: C.accent2 }, line: { color: C.accent2 } });
    });
    pres.addSection({ title: 'النتائج' });
    s = S(pres, 'CONTENU', 'النتائج', 'النتائج: المعدل حسب الاستعمال');
    s.addChart(pres.charts.BAR, [{ name: 'المعدل /20', labels: ['لا يستعمل', 'شهرياً', 'أسبوعياً'], values: [10.2, 11.6, 13.1] }],
      chartOpts(C, T, { x: 0.5, y: 1.2, w: 5.8, h: 3.7, barDir: 'col', showValue: true, dataLabelPosition: 'outEnd', dataLabelFormatCode: '0.0', chartColors: [T.colors.accent1], valAxisMinVal: 0, valAxisMaxVal: 20 }));
    s.addText([{ text: 'بيانات مثال', options: { bold: true, breakLine: true } }, { text: 'ضع هنا نتائج بحثك الحقيقية، واذكر حجم العينة.' }], { x: 6.6, y: 1.4, w: 2.9, h: 1.6, fontSize: 14, color: C.text1, fill: { color: C.background2 }, margin: 0.15, isTextBox: true, ...R });
    S(pres, 'SECTION', 'النتائج', 'الخاتمة', 'الفرضية الأولى تأكدت، والثانية تأكدت جزئياً');
    S(pres, 'TITRE', 'النتائج', 'شكراً لحسن الإصغاء', 'أنتظر ملاحظات أعضاء اللجنة');
  });

// ---------------------------------------------------------------- 5. Portfolio / CV visuel
const p5 = () => build('Projet5-Portfolio-CV.pptx', makeTheme('Nourix Portfolio', { dk2: '1C1C1C', lt2: 'F3F3F3', accent1: 'D4A84B', accent2: 'F0D58C', accent3: '3A3A3A', accent4: 'C43E1C', accent5: '70AD47', accent6: '5B9BD5' }),
  'Nourix Academy · المشروع 5: سيرة ذاتية مرئية (بيانات خيالية)', (pres, C, T) => {
    pres.addSection({ title: 'التعريف' });
    S(pres, 'TITRE', 'التعريف', 'Sami Example', 'مصمم عروض تقديمية ومحتوى رقمي');
    let s = S(pres, 'CONTENU', 'التعريف', 'من أنا؟');
    s.addText('SE', { x: 7.2, y: 1.4, w: 2.2, h: 2.2, shape: 'ellipse', fill: { color: C.accent1 }, color: C.background1, fontSize: 48, bold: true, align: 'center', valign: 'middle', isTextBox: true });
    s.addText('أصمم عروضاً واضحة للشركات والمدارس منذ 4 سنوات. أحب تحويل الأرقام المعقدة إلى رسائل بسيطة.', { x: 0.5, y: 1.5, w: 6.4, h: 1.6, fontSize: 18, color: C.text1, isTextBox: true, ...R });
    stat(s, C, 3.9, 3.3, 3.0, '+120', 'عرضاً منجزاً');
    stat(s, C, 0.5, 3.3, 3.0, '35', 'زبوناً');
    pres.addSection({ title: 'المهارات' });
    s = S(pres, 'CONTENU', 'المهارات', 'المهارات');
    [['PowerPoint', 95], ['Excel', 80], ['Word', 85], ['Canva', 70], ['التصوير', 60]].forEach((t, i) => {
      const y = 1.35 + i * 0.72;
      s.addText(t[0], { x: 7.5, y, w: 2.0, h: 0.5, fontSize: 16, bold: true, color: C.text1, valign: 'middle', isTextBox: true, ...R });
      s.addShape('roundRect', { x: 0.5, y: y + 0.12, w: 6.8, h: 0.26, rectRadius: 0.13, fill: { color: C.background2 }, line: { color: C.background2 } });
      s.addShape('roundRect', { x: 0.5 + 6.8 * (1 - t[1] / 100), y: y + 0.12, w: 6.8 * t[1] / 100, h: 0.26, rectRadius: 0.13, fill: { color: C.accent1 }, line: { color: C.accent1 } });
    });
    s = S(pres, 'CONTENU', 'المهارات', 'المسار');
    s.addShape('line', { x: 0.8, y: 2.6, w: 8.4, h: 0, line: { color: C.accent1, width: 3 } });
    [['2020', 'ليسانس في التسويق'], ['2022', 'مصمم في وكالة'], ['2024', 'مستقل'], ['2026', 'مدرّب في Nourix Academy']].forEach((t, i) => {
      const x = 8.0 - i * 2.4;
      s.addShape('ellipse', { x: x + 0.45, y: 2.45, w: 0.3, h: 0.3, fill: { color: C.accent1 }, line: { color: C.background1, width: 2 } });
      s.addText(t[0], { x, y: 1.7, w: 1.2, h: 0.6, fontSize: 20, bold: true, color: C.accent1, align: 'center', isTextBox: true });
      s.addText(t[1], { x: x - 0.4, y: 2.95, w: 2.0, h: 0.9, fontSize: 14, color: C.text1, align: 'center', valign: 'top', rtlMode: true, isTextBox: true });
    });
    pres.addSection({ title: 'التواصل' });
    S(pres, 'TITRE', 'التواصل', 'لنعمل معاً', 'sami@example.com · 0000 00 00 00');
  });

// ---------------------------------------------------------------- 6. Formation interactive (quiz avec liens)
const p6 = () => build('Projet6-Quiz-interactif.pptx', makeTheme('Nourix Quiz', { dk2: '0E3B24', lt2: 'EAF5EE', accent1: '217346', accent2: 'D4A84B', accent3: 'C43E1C', accent4: '2B579A', accent5: '70AD47', accent6: '7F7F7F' }),
  'Nourix Academy · المشروع 6: اختبار تفاعلي (اعرضه بـ F5)', (pres, C) => {
    // slide numbers: 1 title, 2 menu, 3/5/7 questions, 4/6/8 feedback "خطأ", 9 "صحيح"
    // Button = visible rounded box with text, then a transparent shape on top that carries the slide link
    // (a link on the shape itself, so the label is not underlined and the whole button is clickable).
    const btn = (s, text, x, y, w, slide, fill) => {
      s.addText(text, { x, y, w, h: 0.7, shape: 'roundRect', rectRadius: 0.12, fill: { color: fill || C.accent1 }, color: C.background1, fontSize: 18, bold: true, align: 'center', valign: 'middle', rtlMode: true, isTextBox: true, objectName: 'bouton ' + text });
      s.addShape('rect', { x, y, w, h: 0.7, fill: { color: 'FFFFFF', transparency: 100 }, line: { type: 'none' }, hyperlink: { slide: String(slide), tooltip: text }, objectName: 'lien ' + text });
    };
    pres.addSection({ title: 'البداية' });
    let s = S(pres, 'TITRE', 'البداية', 'اختبر معلوماتك في PowerPoint', 'اعرض الملف بـ F5 ثم انقر على الأزرار');
    btn(s, 'ابدأ', 3.75, 4.1, 2.5, 2, C.accent2);
    s = S(pres, 'CONTENU', 'البداية', 'اختر سؤالاً');
    btn(s, 'السؤال 1', 6.6, 1.8, 2.9, 3); btn(s, 'السؤال 2', 3.55, 1.8, 2.9, 5); btn(s, 'السؤال 3', 0.5, 1.8, 2.9, 7);
    s.addText('كل زر رابط إلى شريحة (Insertion ثم Lien ثم Emplacement dans ce document).', { x: 0.5, y: 3.4, w: 9, h: 0.6, fontSize: 14, color: '595959', isTextBox: true, ...R });
    const Q = [['أي مفتاح يبدأ العرض من الشريحة الأولى؟', ['F5', 'F7', 'Ctrl+P'], 0], ['أي انتقال يحرّك العناصر بسلاسة بين شريحتين؟', ['Fondu', 'Morphose', 'Balayer'], 1], ['أين تكتب ملاحظات المقدّم؟', ['في الشريحة', 'في جزء الملاحظات', 'في الرأس'], 1]];
    pres.addSection({ title: 'الأسئلة' });
    Q.forEach((q, i) => {
      s = S(pres, 'CONTENU', 'الأسئلة', `السؤال ${i + 1}`);
      s.addText(q[0], { x: 0.5, y: 1.3, w: 9, h: 0.9, fontSize: 22, bold: true, color: C.text1, isTextBox: true, ...R });
      q[1].forEach((a, j) => btn(s, a, 6.6 - j * 3.05, 2.6, 2.9, j === q[2] ? 9 : 4 + 2 * i, C.accent1));
      s = S(pres, 'CONTENU', 'الأسئلة', 'ليس هذا الجواب');
      s.addText('✗', { x: 4.25, y: 1.3, w: 1.5, h: 1.5, shape: 'ellipse', fill: { color: C.accent3 }, color: C.background1, fontSize: 48, bold: true, align: 'center', valign: 'middle', isTextBox: true });
      btn(s, 'حاول مرة أخرى', 5.2, 3.3, 3.0, 3 + 2 * i, C.accent3); btn(s, 'القائمة', 1.8, 3.3, 3.0, 2, C.accent1);
    });
    s = S(pres, 'CONTENU', 'الأسئلة', 'أحسنت! جواب صحيح');
    s.addText('✓', { x: 4.25, y: 1.3, w: 1.5, h: 1.5, shape: 'ellipse', fill: { color: C.accent1 }, color: C.background1, fontSize: 48, bold: true, align: 'center', valign: 'middle', isTextBox: true });
    btn(s, 'عودة إلى القائمة', 3.5, 3.3, 3.0, 2, C.accent2);
  });


// ---------------------------------------------------------------- Exercices + corrigé
const exo = (cor) => build(cor ? 'Exercices-CORRIGE.pptx' : 'Exercices-PowerPoint.pptx', makeTheme('Nourix Exercices', { dk2: '5A1A0A', lt2: 'FBEFEA', accent1: 'C43E1C', accent2: 'D4A84B', accent3: '2B579A', accent4: '217346', accent5: '7F7F7F', accent6: 'ED7D31' }),
  cor ? 'Nourix Academy · تمارين PowerPoint: الحلول' : 'Nourix Academy · تمارين PowerPoint', (pres, C, T) => {
    const brief = (s, t) => s.addText(t, { x: 0.5, y: 4.45, w: 9, h: 0.65, fontSize: 12, italic: true, color: '595959', isTextBox: true, ...R });
    pres.addSection({ title: 'التمارين' });
    S(pres, 'TITRE', 'التمارين', cor ? 'تمارين PowerPoint: الحلول' : 'تمارين PowerPoint', 'تمرين لكل فصل تطبيقي من الفصول 3 إلى 11');
    // ch3: paragraph -> bullets
    let s = S(pres, 'CONTENU', 'التمارين', 'تمرين الفصل 3: من فقرة إلى نقاط');
    if (!cor) s.addText('لكي يكون العرض ناجحاً يجب أن تحدد هدفك أولاً ثم أن تكتب فكرة واحدة في كل شريحة وأن تستعمل صوراً واضحة وأن تتدرب على العرض قبل يوم التقديم.', { x: 0.5, y: 1.3, w: 9, h: 2.5, fontSize: 16, color: C.text1, isTextBox: true, ...R });
    else s.addText([{ text: 'حدّد هدفك أولاً', options: { bullet: true, breakLine: true } }, { text: 'فكرة واحدة في كل شريحة', options: { bullet: true, breakLine: true } }, { text: 'صور واضحة', options: { bullet: true, breakLine: true } }, { text: 'تدرّب قبل يوم التقديم', options: { bullet: true } }], { x: 0.5, y: 1.3, w: 9, h: 2.8, fontSize: 24, color: C.text1, paraSpaceAfter: 10, isTextBox: true, ...R });
    brief(s, 'المطلوب: حوّل الفقرة إلى 4 نقاط قصيرة بحجم 24 على الأقل (Accueil ثم Puces).');
    // ch5: align, distribute, group
    s = S(pres, 'CONTENU', 'التمارين', 'تمرين الفصل 5: محاذاة الأشكال وتجميعها');
    const pos = cor ? [[0.8, 1.6], [3.1, 1.6], [5.4, 1.6], [7.7, 1.6]] : [[0.7, 1.3], [3.3, 2.3], [5.1, 1.5], [7.9, 2.6]];
    pos.forEach((p, i) => s.addText(String(i + 1), { x: p[0], y: p[1], w: 1.5, h: 1.5, shape: 'ellipse', fill: { color: [C.accent1, C.accent2, C.accent3, C.accent4][i] }, color: C.background1, fontSize: 28, bold: true, align: 'center', valign: 'middle', isTextBox: true }));
    brief(s, 'المطلوب: حدّد الدوائر الأربع، ثم Format de la forme ثم Aligner ثم Aligner en haut، ثم Distribuer horizontalement، ثم Grouper.');
    // ch6: list -> SmartArt
    s = S(pres, 'CONTENU', 'التمارين', 'تمرين الفصل 6: من قائمة إلى مخطط');
    const steps = ['التخطيط', 'التصميم', 'التدريب', 'العرض'];
    if (!cor) s.addText(steps.map((t, i) => ({ text: t, options: { bullet: { type: 'number' }, breakLine: i < 3 } })), { x: 0.5, y: 1.3, w: 9, h: 2.5, fontSize: 20, color: C.text1, isTextBox: true, ...R });
    else steps.forEach((t, i) => s.addText(t, { x: 7.4 - i * 2.3, y: 1.9, w: 2.0, h: 1.2, shape: 'roundRect', rectRadius: 0.1, fill: { color: [C.accent1, C.accent2, C.accent3, C.accent4][i] }, color: C.background1, fontSize: 18, bold: true, align: 'center', valign: 'middle', rtlMode: true, isTextBox: true }));
    brief(s, cor ? 'الحل: حدّد النص ثم Accueil ثم Convertir en graphique SmartArt ثم Processus de base. النتيجة تشبه هذه المربعات الأربعة بالترتيب من اليمين.' : 'المطلوب: حدّد القائمة ثم Accueil ثم Convertir en graphique SmartArt ثم اختر مخططاً من فئة Processus.');
    // ch7: table -> chart
    s = S(pres, 'CONTENU', 'التمارين', 'تمرين الفصل 7: من جدول إلى رسم بياني');
    const H = { bold: true, color: 'FFFFFF', fill: { color: T.colors.dk2 }, align: 'center' };
    const rows = [['الثلاثي', 'المبيعات'], ['الثلاثي 1', '120'], ['الثلاثي 2', '150'], ['الثلاثي 3', '135'], ['الثلاثي 4', '190']];
    if (!cor) s.addTable(rtlRows(rows.map((r, i) => i ? r : r.map(t => ({ text: t, options: H })))), { x: 5.0, y: 1.3, w: 4.5, colW: [2.25, 2.25], fontSize: 14, fontFace: 'Arial', align: 'center', border: { type: 'solid', color: 'D9D9D9', pt: 0.75 }, rowH: 0.5 });
    else s.addChart(pres.charts.BAR, [{ name: 'المبيعات', labels: ['الثلاثي 1', 'الثلاثي 2', 'الثلاثي 3', 'الثلاثي 4'], values: [120, 150, 135, 190] }], chartOpts(C, T, { x: 0.5, y: 1.2, w: 9, h: 3.2, barDir: 'col', showValue: true, dataLabelPosition: 'outEnd', chartColors: [T.colors.accent1] }));
    brief(s, 'المطلوب: Insertion ثم Graphique ثم Histogramme groupé، وانسخ الأرقام في نافذة Excel، ثم أضف Étiquettes de données. أعلى عمود: الثلاثي 4 (190).');
    // ch9: design principles (weak slide -> improved slide)
    s = S(pres, 'CONTENU', 'التمارين', cor ? 'المبيعات ارتفعت 25 % هذا العام' : 'النتائج');
    if (!cor) {
      s.addText('خلال هذه السنة حققت الشركة نتائج جيدة جدا حيث ارتفعت المبيعات بنسبة 25 بالمائة مقارنة بالسنة الماضية كما تحسن رضا الزبائن وتم فتح فرعين جديدين في مدينتين مختلفتين وانضم إلى الفريق موظفون جدد في قسم المبيعات والتسويق.', { x: 0.5, y: 1.2, w: 5.6, h: 2.0, fontSize: 12, color: '8C8C8C', isTextBox: true, ...R });
      s.addShape('rect', { x: 6.4, y: 1.3, w: 1.4, h: 1.0, fill: { color: '7030A0' }, line: { color: '7030A0' } });
      s.addShape('ellipse', { x: 8.1, y: 2.1, w: 1.2, h: 1.2, fill: { color: '00B050' }, line: { color: '00B050' } });
      s.addShape('rect', { x: 6.9, y: 3.0, w: 0.9, h: 0.9, fill: { color: 'FFC000' }, line: { color: 'FFC000' } });
      s.addText('+25 %', { x: 1.0, y: 3.3, w: 1.6, h: 0.6, fontSize: 14, color: 'FF0000', isTextBox: true });
    } else {
      s.addText('+25 %', { x: 5.0, y: 1.15, w: 4.5, h: 1.0, fontSize: 54, bold: true, color: C.accent1, align: 'right', isTextBox: true });
      s.addText('نمو المبيعات مقارنة بالسنة الماضية', { x: 0.5, y: 1.4, w: 4.4, h: 0.6, fontSize: 20, color: C.text1, valign: 'middle', isTextBox: true, ...R });
      [['رضا أعلى', 'لدى الزبائن'], ['فرعان جديدان', 'في مدينتين'], ['فريق أكبر', 'في المبيعات']].forEach((t, i) => {
        const x = 6.6 - i * 3.05;
        s.addShape('roundRect', { x, y: 2.45, w: 2.9, h: 1.75, rectRadius: 0.12, fill: { color: C.background2 }, line: { color: C.background2 } });
        s.addText(String(i + 1), { x: x + 2.25, y: 2.6, w: 0.5, h: 0.5, shape: 'ellipse', fill: { color: C.accent1 }, color: C.background1, fontSize: 16, bold: true, align: 'center', valign: 'middle', isTextBox: true });
        s.addText(t[0], { x: x + 0.15, y: 3.1, w: 2.6, h: 0.5, fontSize: 20, bold: true, color: C.text2, isTextBox: true, ...R });
        s.addText(t[1], { x: x + 0.15, y: 3.6, w: 2.6, h: 0.45, fontSize: 18, color: C.text1, isTextBox: true, ...R });
      });
    }
    brief(s, cor ? 'الحل: عنوان يقول الرسالة، ورقم كبير، وثلاث بطاقات محاذية بلونين من السمة، ولا نص أصغر من 18.' : 'المطلوب: حسن هذه الشريحة بقواعد الفصل 9: عنوان يقول الرسالة، ورقم كبير، وثلاث بطاقات محاذية، ولا نص أصغر من 18.');
    // ch10-11: transition + animation order
    s = S(pres, 'CONTENU', 'التمارين', 'تمرين الفصلين 10 و11: الانتقال والحركة');
    ['أولاً', 'ثانياً', 'ثالثاً'].forEach((t, i) => card(s, C, 6.6 - i * 3.05, 1.3, 2.9, 2.6, t, cor ? ['Apparaître · Au clic', 'Apparaître · Après la précédente · 0,5 s', 'Apparaître · Après la précédente · 0,5 s'][i] : '', { icon: String(i + 1) }));
    brief(s, cor ? 'الحل: انتقال Fondu للشريحة، ثم Apparaître لكل بطاقة: الأولى Au clic، والباقي Après la précédente بتأخير 0,5 ثانية (التفاصيل في الملاحظات).' : 'المطلوب: أضف انتقالاً للشريحة، ثم اجعل البطاقات تظهر واحدة بعد الأخرى بالترتيب 1 ثم 2 ثم 3 (Volet Animation).');
    if (cor) s.addNotes('البطاقة 1: Apparaître، Démarrer: Au clic. البطاقة 2 و3: Apparaître، Démarrer: Après la précédente، Délai: 00,50. الانتقال: Fondu، Durée: 00,70.');
  });

(async () => { for (const f of [p1, p2, p3, p4, p5, p6]) await f(); await exo(false); await exo(true); })();
