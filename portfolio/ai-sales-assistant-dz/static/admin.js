// Admin dashboard. Every value from the server is rendered with textContent:
// customer names, product names and messages are never parsed as HTML.
const STATUSES = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'];
const state = {csrf: '', role: '', ordersPage: 1, productsPage: 1};

const $ = id => document.getElementById(id);
function el(tag, text, cls) {
  const node = document.createElement(tag);
  if (text !== undefined && text !== null) node.textContent = String(text);
  if (cls) node.className = cls;
  return node;
}
function say(text) { $('message').textContent = text || ''; }

async function api(path, options = {}) {
  const headers = {'Content-Type': 'application/json'};
  if (options.method && options.method !== 'GET') headers['X-CSRF-Token'] = state.csrf;
  const res = await fetch(path, {...options, headers, credentials: 'same-origin'});
  let data = {};
  try { data = await res.json(); } catch (e) { /* empty body */ }
  if (res.status === 401) { showLogin('انتهت الجلسة، يرجى الدخول من جديد.'); throw new Error('unauthenticated'); }
  if (!res.ok) throw new Error(data.error || 'حدث خطأ.');
  return data;
}

function table(headers, rows) {
  const t = el('table');
  const head = el('tr');
  headers.forEach(h => head.append(el('th', h)));
  t.append(head);
  rows.forEach(r => t.append(r));
  return t;
}

function pager(container, page, perPage, total, go) {
  container.replaceChildren();
  const pages = Math.max(1, Math.ceil(total / perPage));
  const prev = el('button', 'السابق', 'secondary'); prev.type = 'button'; prev.disabled = page <= 1;
  const next = el('button', 'التالي', 'secondary'); next.type = 'button'; next.disabled = page >= pages;
  prev.addEventListener('click', () => go(page - 1));
  next.addEventListener('click', () => go(page + 1));
  container.append(prev, el('span', `صفحة ${page} من ${pages} · ${total} عنصر`, 'muted'), next);
}

// ---- session ---------------------------------------------------------------------------------
function showLogin(text) {
  $('app-panel').hidden = true;
  $('login-panel').hidden = false;
  $('login-message').textContent = text || '';
}

function showApp(user, csrf) {
  state.csrf = csrf || '';
  state.role = user.role;
  $('who').textContent = `${user.username} (${user.role})`;
  document.querySelectorAll('[data-role="admin"]').forEach(b => { b.hidden = user.role !== 'admin'; });
  $('login-panel').hidden = true;
  $('app-panel').hidden = false;
  openTab('orders');
}

$('login-form').addEventListener('submit', async e => {
  e.preventDefault();
  const button = e.submitter; if (button) button.disabled = true;
  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST', headers: {'Content-Type': 'application/json'}, credentials: 'same-origin',
      body: JSON.stringify({username: $('username').value, password: $('password').value}),
    });
    const data = await res.json();
    $('password').value = '';
    if (!res.ok) { $('login-message').textContent = data.error || 'تعذّر الدخول.'; return; }
    showApp(data.user, data.csrf_token);
  } catch (err) {
    $('login-message').textContent = 'تعذّر الاتصال بالخادم.';
  } finally { if (button) button.disabled = false; }
});

$('logout').addEventListener('click', async () => {
  try { await api('/api/auth/logout', {method: 'POST'}); } catch (e) { /* already logged out */ }
  state.csrf = '';
  showLogin('تم الخروج.');
});

function openTab(name) {
  document.querySelectorAll('.tab-body').forEach(b => { b.hidden = b.id !== 'tab-' + name; });
  document.querySelectorAll('.tab').forEach(b => b.setAttribute('aria-current', String(b.dataset.tab === name)));
  say('');
  if (name === 'orders') loadOrders(1);
  if (name === 'products') loadProducts(1);
  if (name === 'users') loadUsers();
}
document.querySelectorAll('.tab').forEach(b => b.addEventListener('click', () => openTab(b.dataset.tab)));

// ---- orders ----------------------------------------------------------------------------------
STATUSES.forEach(s => { const o = el('option', s); o.value = s; $('order-status').append(o); });
$('order-filter').addEventListener('submit', e => { e.preventDefault(); loadOrders(1); });

async function loadOrders(page) {
  state.ordersPage = page;
  const params = new URLSearchParams({page, per_page: 20, q: $('order-q').value, status: $('order-status').value});
  try {
    const data = await api('/api/admin/orders?' + params);
    const rows = data.items.map(order => {
      const row = el('tr');
      const items = order.items.map(i => `${i.quantity} × ${i.name}`).join('، ');
      [order.id, order.customer, order.phone, order.wilaya, items, order.total + ' DA', order.created_at.slice(0, 16).replace('T', ' ')]
        .forEach(v => row.append(el('td', v)));
      const select = el('select');
      select.setAttribute('aria-label', 'حالة الطلب ' + order.id);
      STATUSES.forEach(s => { const o = el('option', s); o.value = s; o.selected = s === order.status; select.append(o); });
      select.addEventListener('change', async () => {
        try { await api(`/api/admin/orders/${order.id}/status`, {method: 'PATCH', body: JSON.stringify({status: select.value})}); say(`تم تحديث الطلب ${order.id}.`); }
        catch (err) { say(err.message); }
      });
      const cell = el('td'); cell.append(select); row.append(cell);
      return row;
    });
    $('orders').replaceChildren(table(['رقم', 'العميل', 'الهاتف', 'الولاية', 'المنتجات', 'المجموع', 'التاريخ', 'الحالة'], rows));
    pager($('orders-pager'), data.page, data.per_page, data.total, loadOrders);
    if (!data.total) say('لا توجد طلبات مطابقة.');
  } catch (err) { if (err.message !== 'unauthenticated') say(err.message); }
}

// ---- products (admin) ------------------------------------------------------------------------
$('product-filter').addEventListener('submit', e => { e.preventDefault(); loadProducts(1); });
$('product-form').addEventListener('submit', async e => {
  e.preventDefault();
  try {
    await api('/api/admin/products', {method: 'POST', body: JSON.stringify({
      name: $('p-name').value, category: $('p-category').value,
      price: parseInt($('p-price').value, 10), stock: parseInt($('p-stock').value, 10), active: true})});
    e.target.reset();
    say('تمت إضافة المنتج.');
    loadProducts(1);
  } catch (err) { say(err.message); }
});

async function loadProducts(page) {
  state.productsPage = page;
  const params = new URLSearchParams({page, per_page: 20, q: $('product-q').value});
  try {
    const data = await api('/api/admin/products?' + params);
    const rows = data.items.map(p => {
      const row = el('tr');
      row.append(el('td', p.id), el('td', p.name), el('td', p.category));
      const price = el('input'); price.type = 'number'; price.min = '0'; price.step = '1'; price.value = p.price;
      price.setAttribute('aria-label', 'سعر ' + p.name);
      const priceCell = el('td'); priceCell.append(price); row.append(priceCell);
      row.append(el('td', p.stock));
      const delta = el('input'); delta.type = 'number'; delta.step = '1'; delta.placeholder = '+/-';
      delta.setAttribute('aria-label', 'تعديل مخزون ' + p.name);
      const stockCell = el('td'); stockCell.append(delta); row.append(stockCell);
      const active = el('input'); active.type = 'checkbox'; active.checked = !!p.active;
      active.setAttribute('aria-label', 'تفعيل ' + p.name);
      const activeCell = el('td'); activeCell.append(active); row.append(activeCell);
      const save = el('button', 'حفظ'); save.type = 'button';
      const archive = el('button', 'أرشفة', 'secondary'); archive.type = 'button';
      save.addEventListener('click', async () => {
        try {
          const changes = {};
          if (parseInt(price.value, 10) !== p.price) changes.price = parseInt(price.value, 10);
          if (active.checked !== !!p.active) changes.active = active.checked;
          if (Object.keys(changes).length) await api(`/api/admin/products/${p.id}`, {method: 'PATCH', body: JSON.stringify(changes)});
          if (delta.value) await api(`/api/admin/products/${p.id}/stock`, {method: 'POST', body: JSON.stringify({delta: parseInt(delta.value, 10)})});
          say(`تم حفظ ${p.name}.`);
          loadProducts(state.productsPage);
        } catch (err) { say(err.message); }
      });
      archive.addEventListener('click', async () => {
        if (archive.dataset.confirm !== 'yes') { archive.dataset.confirm = 'yes'; archive.textContent = 'تأكيد الأرشفة؟'; return; }
        try { await api(`/api/admin/products/${p.id}`, {method: 'DELETE'}); say(`تمت أرشفة ${p.name}.`); loadProducts(state.productsPage); }
        catch (err) { say(err.message); }
      });
      const actions = el('td'); actions.append(save, ' ', archive); row.append(actions);
      return row;
    });
    $('products').replaceChildren(table(['رقم', 'الاسم', 'الفئة', 'السعر', 'المخزون', 'تعديل المخزون', 'مفعّل', ''], rows));
    pager($('products-pager'), data.page, data.per_page, data.total, loadProducts);
  } catch (err) { if (err.message !== 'unauthenticated') say(err.message); }
}

// ---- users (admin) ---------------------------------------------------------------------------
$('user-form').addEventListener('submit', async e => {
  e.preventDefault();
  try {
    await api('/api/admin/users', {method: 'POST', body: JSON.stringify({
      username: $('u-name').value, password: $('u-password').value, role: $('u-role').value})});
    e.target.reset();
    say('تمت إضافة المستخدم.');
    loadUsers();
  } catch (err) { say(err.message); }
});

async function loadUsers() {
  try {
    const users = await api('/api/admin/users');
    const rows = users.map(u => {
      const row = el('tr');
      [u.username, u.role, u.active ? 'نشط' : 'معطّل', u.created_at.slice(0, 10)].forEach(v => row.append(el('td', v)));
      const toggle = el('button', u.active ? 'تعطيل' : 'تفعيل', 'secondary'); toggle.type = 'button';
      toggle.addEventListener('click', async () => {
        try { await api(`/api/admin/users/${u.id}`, {method: 'PATCH', body: JSON.stringify({active: !u.active})}); loadUsers(); }
        catch (err) { say(err.message); }
      });
      const cell = el('td'); cell.append(toggle); row.append(cell);
      return row;
    });
    $('users').replaceChildren(table(['المستخدم', 'الدور', 'الحالة', 'أُنشئ في', ''], rows));
  } catch (err) { if (err.message !== 'unauthenticated') say(err.message); }
}

// Resume an existing session after a page reload.
(async () => {
  try {
    const res = await fetch('/api/auth/me', {credentials: 'same-origin'});
    if (res.ok) { const data = await res.json(); showApp(data.user, data.csrf_token); }
  } catch (e) { /* stay on the login form */ }
})();
