// All text is inserted with textContent: replies and order details are never parsed as HTML.
const form = document.getElementById('chat-form');
const input = document.getElementById('message');
const sendButton = document.getElementById('send');
const box = document.getElementById('messages');
const history = [];

function el(tag, text, cls) {
  const node = document.createElement(tag);
  if (text !== undefined && text !== null) node.textContent = String(text);
  if (cls) node.className = cls;
  return node;
}
function scrollDown() { box.scrollTop = box.scrollHeight; }
function add(text, kind) { box.appendChild(el('div', text, 'bubble ' + kind)); scrollDown(); }
function dzd(value) { return Number(value).toLocaleString('fr-DZ') + ' DA'; }

function showProposal(p) {
  const card = el('div', null, 'order-card');
  card.append(el('strong', 'ملخص الطلب — يرجى المراجعة والتأكيد'));
  const list = el('ul');
  p.items.forEach(item => list.append(el('li', `${item.quantity} × ${item.name} — ${dzd(item.unit_price * item.quantity)}`)));
  card.append(list);
  card.append(el('p', `التوصيل إلى ${p.wilaya}: ${p.delivery_fee === 0 ? 'مجاني' : dzd(p.delivery_fee)}`));
  card.append(el('p', `المجموع: ${dzd(p.total)} — الدفع عند الاستلام`, 'total'));
  card.append(el('p', `${p.customer} · ${p.phone}`, 'muted'));
  const confirmButton = el('button', 'تأكيد الطلب');
  confirmButton.type = 'button';
  const status = el('p', '', 'muted');
  confirmButton.addEventListener('click', async () => {
    confirmButton.disabled = true;
    status.textContent = 'جارٍ التأكيد…';
    try {
      const res = await fetch('/api/orders/confirm', {
        method: 'POST', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({proposal_id: p.proposal_id}),
      });
      const data = await res.json();
      if (res.ok) {
        status.textContent = `تم تسجيل طلبك رقم ${data.order_id}. احتفظ بهذا الرقم ورقم هاتفك لمتابعة الطلب.`;
        history.push({role: 'assistant', content: `Order ${data.order_id} was confirmed by the customer.`});
      } else {
        status.textContent = data.error || 'تعذّر تأكيد الطلب.';
        confirmButton.disabled = false;
      }
    } catch (e) {
      status.textContent = 'تعذّر الاتصال. حاول مرة أخرى.';
      confirmButton.disabled = false;
    }
  });
  card.append(confirmButton, status);
  box.appendChild(card);
  scrollDown();
}

form.addEventListener('submit', async e => {
  e.preventDefault();
  const text = input.value.trim();
  if (!text) return;
  add(text, 'user');
  input.value = '';
  sendButton.disabled = true;
  try {
    const res = await fetch('/api/chat', {
      method: 'POST', headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({message: text, history}),
    });
    const data = await res.json();
    const reply = data.reply || data.error || 'حدث خطأ غير متوقع';
    add(reply, 'bot');
    history.push({role: 'user', content: text});
    if (data.reply) history.push({role: 'assistant', content: data.reply});
    if (data.proposal) showProposal(data.proposal);
  } catch (err) {
    add('تعذّر الاتصال بالمساعد. حاول مرة أخرى.', 'bot');
  } finally {
    sendButton.disabled = false;
    input.focus();
  }
});
