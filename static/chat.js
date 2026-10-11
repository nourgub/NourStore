// Customer chat. All text is inserted with textContent: replies, product names and
// order details are never parsed as HTML.
const $ = id => document.getElementById(id);
const box = $('messages');
const history = [];
let busy = false;
const wilayas = new Map();

const STATUS_LABELS = {pending: 'قيد المراجعة', confirmed: 'مؤكَّد', shipped: 'تم الشحن', delivered: 'تم التسليم', cancelled: 'ملغى'};

function el(tag, text, cls) {
  const node = document.createElement(tag);
  if (text !== undefined && text !== null) node.textContent = String(text);
  if (cls) node.className = cls;
  return node;
}
function scrollDown() { box.scrollTop = box.scrollHeight; }
function add(text, kind) { const b = el('div', text, 'bubble ' + kind); box.appendChild(b); scrollDown(); return b; }
function dzd(value) { return Number(value).toLocaleString('fr-DZ') + ' DA'; }

async function postJson(path, body) {
  const res = await fetch(path, {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(body)});
  let data = {};
  try { data = await res.json(); } catch (e) { /* non-JSON error page */ }
  return {res, data};
}

function errorText(res, data) {
  if (res.status === 429) return data.reply || data.error || 'طلبات كثيرة، انتظر بضع دقائق ثم حاول. · Trop de demandes, patientez un peu.';
  return data.error || 'حدث خطأ غير متوقع. · Erreur inattendue.';
}

// ---- order summary with a two-step confirmation ---------------------------------------
function showProposal(p) {
  const card = el('div', null, 'order-card');
  card.append(el('strong', 'ملخص الطلب — راجعه قبل التأكيد'));
  const list = el('ul');
  p.items.forEach(item => list.append(el('li', `${item.quantity} × ${item.name} — ${dzd(item.unit_price * item.quantity)}`)));
  card.append(list);
  card.append(el('p', `التوصيل إلى ${p.wilaya_ar || p.wilaya}: ${p.delivery_fee === 0 ? 'مجاني' : dzd(p.delivery_fee)}`));
  card.append(el('p', `المجموع: ${dzd(p.total)} — الدفع عند الاستلام`, 'total'));
  card.append(el('p', `${p.customer} · ${p.phone}`, 'muted'));

  const actions = el('div', null, 'actions');
  const confirmButton = el('button', 'تأكيد الطلب'); confirmButton.type = 'button';
  const yes = el('button', 'نعم، سجّل الطلب'); yes.type = 'button'; yes.hidden = true;
  const back = el('button', 'رجوع', 'secondary'); back.type = 'button'; back.hidden = true;
  const status = el('p', '', 'muted'); status.setAttribute('role', 'status');
  actions.append(confirmButton, yes, back);
  card.append(actions, status);

  confirmButton.addEventListener('click', () => {
    confirmButton.hidden = true; yes.hidden = false; back.hidden = false;
    status.textContent = `سيُسجَّل طلب بقيمة ${dzd(p.total)}. هل أنت متأكد؟`;
    yes.focus();
  });
  back.addEventListener('click', () => {
    confirmButton.hidden = false; yes.hidden = true; back.hidden = true; status.textContent = '';
  });
  yes.addEventListener('click', async () => {
    yes.disabled = true; back.disabled = true;
    status.textContent = 'جارٍ التأكيد…';
    try {
      const {res, data} = await postJson('/api/orders/confirm', {proposal_id: p.proposal_id});
      if (res.ok) {
        card.classList.add('confirmed');
        yes.hidden = true; back.hidden = true;
        status.textContent = `تم تسجيل طلبك رقم ${data.order_id}. احتفظ بهذا الرقم ورقم هاتفك لمتابعة الطلب.`;
        history.push({role: 'assistant', content: `Order ${data.order_id} was confirmed by the customer.`});
      } else {
        status.textContent = errorText(res, data);
        if (data.code === 'already_confirmed' || data.code === 'proposal_expired' || data.code === 'stock_changed') {
          yes.hidden = true; back.hidden = true;  // this summary can no longer be confirmed
        } else { yes.disabled = false; back.disabled = false; }
      }
    } catch (e) {
      status.textContent = 'تعذّر الاتصال. حاول مرة أخرى.';
      yes.disabled = false; back.disabled = false;
    }
  });
  box.appendChild(card);
  scrollDown();
}

// ---- chat ----------------------------------------------------------------------------------
async function send(text) {
  if (busy || !text) return;
  busy = true;
  $('send').disabled = true;
  $('message').value = '';
  add(text, 'user');
  const typing = add('…', 'bot typing');
  typing.setAttribute('aria-label', 'المساعد يكتب');
  box.setAttribute('aria-busy', 'true');
  try {
    const {res, data} = await postJson('/api/chat', {message: text, history});
    typing.remove();
    if (!res.ok) { add(errorText(res, data), 'bot error'); return; }
    add(data.reply, 'bot');
    history.push({role: 'user', content: text}, {role: 'assistant', content: data.reply});
    if (data.proposal) showProposal(data.proposal);
  } catch (err) {
    typing.remove();
    add('تعذّر الاتصال بالمساعد. حاول مرة أخرى.', 'bot error');
  } finally {
    busy = false;
    box.removeAttribute('aria-busy');
    $('send').disabled = false;
    $('message').focus();
  }
}

$('chat-form').addEventListener('submit', e => { e.preventDefault(); send($('message').value.trim()); });

// ---- wilaya picker and delivery fee -------------------------------------------------------
(async () => {
  try {
    const res = await fetch('/api/wilayas');
    const rows = await res.json();
    rows.forEach(w => {
      wilayas.set(String(w.code), w);
      const option = el('option', `${String(w.code).padStart(2, '0')} - ${w.name_ar} · ${w.name_fr}`);
      option.value = String(w.code);
      $('wilaya').append(option);
    });
  } catch (e) { $('fee').textContent = 'تعذّر تحميل قائمة الولايات.'; }
})();

$('wilaya').addEventListener('change', () => {
  const w = wilayas.get($('wilaya').value);
  $('use-wilaya').disabled = !w;
  $('fee').textContent = w ? `التوصيل إلى ${w.name_ar}: ${dzd(w.delivery_fee)} (مجاني للطلبات من 100 000 DA)` : '';
});

$('use-wilaya').addEventListener('click', () => {
  const w = wilayas.get($('wilaya').value);
  if (w) send(`الولاية: ${w.name_ar} (${w.code})`);
});

// ---- order status lookup ------------------------------------------------------------------
$('status-form').addEventListener('submit', async e => {
  e.preventDefault();
  const button = e.submitter; if (button) button.disabled = true;
  const result = $('status-result');
  result.textContent = 'جارٍ البحث…';
  try {
    const {res, data} = await postJson('/api/orders/status', {order_id: $('order-id').value.trim(), phone: $('order-phone').value});
    if (!res.ok) { result.textContent = errorText(res, data); return; }
    const items = data.items.map(i => `${i.quantity} × ${i.name}`).join('، ');
    result.textContent = `الطلب ${data.order_id}: ${STATUS_LABELS[data.status] || data.status} — ${items} — ${dzd(data.total)}`;
  } catch (err) {
    result.textContent = 'تعذّر الاتصال. حاول مرة أخرى.';
  } finally { if (button) button.disabled = false; }
});
