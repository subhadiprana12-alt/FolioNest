/* FolioNest Enterprise — application logic */
'use strict';

const $ = (s, r = document) => r.querySelector(s);
const DAY = 864e5, LOAN_DAYS = 14, GRACE = 1, RATE = 10;
const LIMITS = { Undergraduate: 3, Postgraduate: 5, Staff: 8 };
const KEY = 'folionest_enterprise_v1';

/* ---------- helpers ---------- */
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const iso = d => new Date(Date.now() + d * DAY).toISOString();
const fd = v => v ? new Date(v).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const uid = p => `${p}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
const mem = {};
const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return mem[k] ?? null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch { mem[k] = v; } }
};

/* ---------- data ---------- */
const seed = () => ({
  books: [
    ['BK-101', 'The Alchemist', 'Paulo Coelho', 'Fiction', 1988, '9780062315007', 4],
    ['BK-102', 'Atomic Habits', 'James Clear', 'Self-help', 2018, '9780735211292', 3],
    ['BK-103', 'The Midnight Library', 'Matt Haig', 'Fiction', 2020, '9780525559474', 2],
    ['BK-104', 'Wings of Fire', 'A. P. J. Abdul Kalam', 'Biography', 1999, '9788173711466', 5],
    ['BK-105', 'Clean Code', 'Robert C. Martin', 'Technology', 2008, '9780132350884', 2],
    ['BK-106', 'Sapiens', 'Yuval Noah Harari', 'History', 2011, '9780062316097', 1],
    ['BK-107', 'Deep Work', 'Cal Newport', 'Self-help', 2016, '9781455586691', 2],
    ['BK-108', 'The Pragmatic Programmer', 'Andrew Hunt', 'Technology', 1999, '9780201616224', 3]
  ].map((b, i) => ({ id: b[0], title: b[1], author: b[2], genre: b[3], year: b[4], isbn: b[5], total: b[6], added: iso(-40 + i * 3) })),
  members: [['STU-014', 'Aarav Sen', 'Undergraduate'], ['STU-021', 'Riya Das', 'Undergraduate'], ['STU-008', 'Ishaan Roy', 'Postgraduate'], ['STF-002', 'Meera Nair', 'Staff']]
    .map(m => ({ id: m[0], name: m[1], tier: m[2], joined: iso(-90) })),
  loans: [
    { id: 'L-1001', b: 'BK-102', m: 'STU-014', out: iso(-20), due: iso(-6), ret: null, ren: 0 },
    { id: 'L-1002', b: 'BK-104', m: 'STU-021', out: iso(-5), due: iso(9), ret: null, ren: 0 },
    { id: 'L-1003', b: 'BK-106', m: 'STU-008', out: iso(-9), due: iso(5), ret: null, ren: 0 },
    { id: 'L-1004', b: 'BK-101', m: 'STU-008', out: iso(-25), due: iso(-11), ret: iso(-12), ren: 0 },
    { id: 'L-1005', b: 'BK-105', m: 'STF-002', out: iso(-3), due: iso(11), ret: null, ren: 0 },
    { id: 'L-1006', b: 'BK-107', m: 'STU-021', out: iso(-2), due: iso(12), ret: null, ren: 0 },
    { id: 'L-1007', b: 'BK-103', m: 'STU-014', out: iso(-8), due: iso(6), ret: iso(-1), ren: 0 }
  ],
  holds: []
});

let S;
try { S = JSON.parse(store.get(KEY)); } catch { /* use seed */ }
if (!S || !Array.isArray(S.books) || !Array.isArray(S.loans)) S = seed();
const save = () => store.set(KEY, JSON.stringify(S));

const book = id => S.books.find(b => b.id === id);
const member = id => S.members.find(m => m.id === id);
const active = () => S.loans.filter(l => !l.ret);
const outCount = id => active().filter(l => l.b === id).length;
const avail = b => Math.max(0, b.total - outCount(b.id));
const isLate = l => !l.ret && new Date(l.due) < new Date();
const fineOf = l => {
  const end = l.ret ? new Date(l.ret) : new Date();
  const late = Math.floor((end - new Date(l.due)) / DAY) - GRACE;
  return late > 0 ? late * RATE : 0;
};
const totalFines = () => S.loans.reduce((s, l) => s + fineOf(l), 0);
const stateOf = l => l.ret ? ['Returned', 'n'] : isLate(l) ? ['Overdue', 'r'] : ['On loan', 'w'];

/* ---------- ui primitives ---------- */
function toast(msg, err) {
  const t = $('#toast');
  t.textContent = msg;
  t.className = 'on' + (err ? ' e' : '');
  clearTimeout(toast.t);
  toast.t = setTimeout(() => (t.className = ''), 3200);
}

function ask(title, fields, onOk, label = 'Save') {
  const d = $('#dg');
  d.innerHTML = `<h2>${title}</h2><form method="dialog">${fields.map(f => `
    <label>${f.l}${f.t === 'select'
      ? `<select name="${f.n}">${f.o.map(o => `<option value="${esc(o[0])}">${esc(o[1])}</option>`).join('')}</select>`
      : `<input name="${f.n}" type="${f.t || 'text'}" value="${esc(f.v ?? '')}" ${f.r ? 'required' : ''} ${f.min != null ? `min="${f.min}"` : ''} ${f.dis ? 'disabled' : ''}>`}
    </label>`).join('')}
    <div class="fa"><button type="button" class="btn q" id="no">Cancel</button><button class="btn">${label}</button></div></form>`;
  $('#no').onclick = () => d.close();
  $('form', d).onsubmit = e => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target));
    fields.filter(f => f.dis).forEach(f => (data[f.n] = f.v));
    if (onOk(data) !== false) d.close();
  };
  d.showModal();
}

function confirmBox(title, onOk, label) {
  const d = $('#dg');
  d.innerHTML = `<h2>${title}</h2><div class="fa"><button class="btn q" id="no">Cancel</button><button class="btn d" id="yes">${label}</button></div>`;
  $('#no').onclick = () => d.close();
  $('#yes').onclick = () => { d.close(); onOk(); };
  d.showModal();
}

const hue = s => [...s].reduce((a, c) => a + c.charCodeAt(0), 0) * 37 % 360;
const coverStyle = b => `background:linear-gradient(150deg,hsl(${hue(b.genre)} 62% 38%),hsl(${(hue(b.genre) + 40) % 360} 58% 24%))`;
const spark = (arr, color) => {
  const mx = Math.max(1, ...arr);
  const pts = arr.map((v, i) => `${(i / (arr.length - 1)) * 96},${30 - (v / mx) * 26}`).join(' ');
  return `<svg viewBox="0 0 96 32" aria-hidden="true"><polyline points="${pts}" fill="none" stroke="${color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
};
const series = (field, n = 7) => [...Array(n)].map((_, i) => {
  const day = new Date(Date.now() - (n - 1 - i) * DAY).toDateString();
  return S.loans.filter(l => l[field] && new Date(l[field]).toDateString() === day).length;
});

/* ---------- actions ---------- */
function saveBook(id) {
  const o = id && book(id);
  ask(o ? 'Edit book' : 'Add a book', [
    { n: 'id', l: 'Book ID', v: o?.id, r: 1, dis: !!o },
    { n: 'title', l: 'Title', v: o?.title, r: 1 },
    { n: 'author', l: 'Author', v: o?.author, r: 1 },
    { n: 'genre', l: 'Genre', v: o?.genre, r: 1 },
    { n: 'year', l: 'Publication year', t: 'number', v: o?.year, r: 1, min: 1000 },
    { n: 'isbn', l: 'ISBN (optional)', v: o?.isbn },
    { n: 'total', l: 'Total copies', t: 'number', v: o?.total, r: 1, min: 0 }
  ], f => {
    f.id = f.id.trim(); f.year = +f.year; f.total = +f.total;
    if (f.year > new Date().getFullYear()) return toast('The publication year is in the future.', 1), false;
    if (!o && S.books.some(b => b.id.toLowerCase() === f.id.toLowerCase())) return toast('That Book ID already exists.', 1), false;
    if (o && f.total < outCount(o.id)) return toast(`At least ${outCount(o.id)} copies are needed because that many are on loan.`, 1), false;
    if (o) Object.assign(o, f); else S.books.push({ ...f, added: iso(0) });
    save(); render(); toast(o ? 'Book updated.' : 'Book added.');
  }, o ? 'Save changes' : 'Add book');
}

function removeBook(id) {
  if (S.loans.some(l => l.b === id)) return toast('This book has loan history, so it can’t be deleted.', 1);
  confirmBox('Delete this book?', () => { S.books = S.books.filter(b => b.id !== id); save(); closeDrawer(); render(); toast('Book deleted.'); }, 'Delete book');
}

function saveMember() {
  ask('Add a member', [
    { n: 'id', l: 'Member ID', r: 1 },
    { n: 'name', l: 'Full name', r: 1 },
    { n: 'tier', l: 'Member type', t: 'select', o: Object.keys(LIMITS).map(k => [k, `${k} (up to ${LIMITS[k]} books)`]) }
  ], f => {
    f.id = f.id.trim();
    if (member(f.id)) return toast('That Member ID is already registered.', 1), false;
    S.members.push({ id: f.id, name: f.name.trim(), tier: f.tier, joined: iso(0) });
    save(); render(); toast('Member added.');
  }, 'Add member');
}

function issue(bid, mid) {
  const b = book(bid), m = member(mid);
  if (!b || !m) return toast('Choose a valid book and member.', 1);
  if (avail(b) < 1) return toast('No copies on the shelf. Place a hold instead.', 1);
  if (active().some(l => l.b === bid && l.m === mid)) return toast('This member already has this title.', 1);
  const mine = active().filter(l => l.m === mid);
  if (mine.length >= LIMITS[m.tier]) return toast(`${m.name} has reached the ${LIMITS[m.tier]}-book limit.`, 1);
  if (mine.some(isLate)) return toast(`${m.name} has overdue books. Return them first.`, 1);
  S.loans.push({ id: uid('L'), b: bid, m: mid, out: iso(0), due: iso(LOAN_DAYS), ret: null, ren: 0 });
  S.holds = S.holds.filter(h => !(h.b === bid && h.m === mid));
  save(); render(); toast(`Issued to ${m.name}. Due ${fd(iso(LOAN_DAYS))}.`);
}

function giveBack(id) {
  const l = S.loans.find(x => x.id === id);
  if (!l || l.ret) return;
  l.ret = iso(0);
  const f = fineOf(l), h = S.holds.find(x => x.b === l.b);
  save(); render();
  toast(f ? `Returned. Fine due: ₹${f}.` : 'Returned on time.');
  if (h) setTimeout(() => toast(`${member(h.m)?.name} is waiting for this title.`), 3300);
}

function renew(id) {
  const l = S.loans.find(x => x.id === id);
  if (l.ren >= 1) return toast('This loan was already renewed once.', 1);
  if (isLate(l)) return toast('Overdue loans can’t be renewed.', 1);
  if (S.holds.some(h => h.b === l.b)) return toast('Another member has a hold on this title.', 1);
  l.due = new Date(+new Date(l.due) + 7 * DAY).toISOString(); l.ren++;
  save(); render(); toast('Renewed for 7 days.');
}

function placeHold(bid) {
  ask('Place a hold', [{ n: 'm', l: 'Member', t: 'select', o: S.members.map(m => [m.id, `${m.name} (${m.id})`]) }], f => {
    if (S.holds.some(h => h.b === bid && h.m === f.m)) return toast('That hold already exists.', 1), false;
    S.holds.push({ id: uid('H'), b: bid, m: f.m, date: iso(0) });
    save(); render(); toast('Hold placed.');
  }, 'Place hold');
}

/* ---------- drawer ---------- */
function openDrawer(html) { $('#dr').innerHTML = `<button class="x" data-a="closeDr" aria-label="Close">×</button>${html}`; $('#dr').classList.add('on'); $('#scrim').classList.add('on'); }
function closeDrawer() { $('#dr').classList.remove('on'); $('#scrim').classList.remove('on'); }

function bookDrawer(id) {
  const b = book(id); if (!b) return;
  const hist = S.loans.filter(l => l.b === id).sort((a, c) => new Date(c.out) - new Date(a.out));
  const holds = S.holds.filter(h => h.b === id);
  openDrawer(`
    <div class="cv" style="${coverStyle(b)}"><b>${esc(b.title)}</b><small>${esc(b.author)}</small></div>
    <h2>${esc(b.title)}</h2><p style="color:var(--mu)">${esc(b.author)} · ${esc(b.genre)} · ${b.year}</p>
    <div class="meta"><div><small>On shelf</small><b>${avail(b)} of ${b.total}</b></div><div><small>Times borrowed</small><b>${hist.length}</b></div><div><small>Book ID</small><b>${esc(b.id)}</b></div><div><small>ISBN</small><b>${esc(b.isbn || '—')}</b></div></div>
    <div class="fa" style="justify-content:flex-start;margin:0 0 18px">
      ${avail(b) ? `<button class="btn" data-a="issueFor" data-id="${b.id}">Issue this book</button>` : `<button class="btn" data-a="hold" data-id="${b.id}">Place a hold</button>`}
      <button class="btn q" data-a="edit" data-id="${b.id}">Edit</button><button class="btn q" data-a="del" data-id="${b.id}">Delete</button></div>
    <h2 style="margin-bottom:8px">Borrowing history</h2>
    ${hist.map(l => `<div class="row"><span>${esc(member(l.m)?.name || l.m)}<small>${fd(l.out)} → ${l.ret ? fd(l.ret) : 'not returned'}</small></span><span class="pill ${stateOf(l)[1]}">${stateOf(l)[0]}</span></div>`).join('') || '<p class="empty">Never borrowed.</p>'}
    ${holds.length ? `<h2 style="margin:18px 0 8px">Waiting list</h2>${holds.map(h => `<div class="row"><span>${esc(member(h.m)?.name)}<small>Since ${fd(h.date)}</small></span><button class="btn q s" data-a="unhold" data-id="${h.id}">Cancel</button></div>`).join('')}` : ''}`);
}

function memberDrawer(id) {
  const m = member(id); if (!m) return;
  const mine = S.loans.filter(l => l.m === id), now = mine.filter(l => !l.ret);
  openDrawer(`
    <h2 style="margin-top:16px">${esc(m.name)}</h2><p style="color:var(--mu)">${esc(m.id)} · ${m.tier} · joined ${fd(m.joined)}</p>
    <div class="meta"><div><small>Borrowing now</small><b>${now.length} of ${LIMITS[m.tier]}</b></div><div><small>Lifetime loans</small><b>${mine.length}</b></div><div><small>Fines</small><b>₹${mine.reduce((s, l) => s + fineOf(l), 0)}</b></div><div><small>Overdue</small><b>${now.filter(isLate).length}</b></div></div>
    <h2 style="margin-bottom:8px">Loan history</h2>
    ${mine.sort((a, c) => new Date(c.out) - new Date(a.out)).map(l => `<div class="row"><span>${esc(book(l.b)?.title || 'Deleted')}<small>Due ${fd(l.due)}</small></span><span class="pill ${stateOf(l)[1]}">${stateOf(l)[0]}</span></div>`).join('') || '<p class="empty">No loans yet.</p>'}`);
}

/* ---------- views ---------- */
const PAGES = { dashboard: 'Overview', books: 'Catalogue', circulation: 'Circulation', loans: 'Loans & fines', members: 'Members', reports: 'Reports & data' };
const ICON = { dashboard: '◫', books: '▤', circulation: '⇄', loans: '▣', members: '♙', reports: '▥' };
const GROUPS = [['Workspace', ['dashboard', 'books', 'circulation']], ['Records', ['loans', 'members']], ['Insights', ['reports']]];
const Q = { books: { s: '', f: 'all', g: 'All', o: 'recent', v: 'grid' }, loans: { s: '', f: 'all' }, members: { s: '' } };
let cur = 'dashboard', pre;

const head = (t, p, btn = '') => `<div class="hd"><div><h1>${t}</h1><p>${p}</p></div>${btn}</div>`;
const table = (cols, rows, empty) => `<div class="card tw"><table><thead><tr>${cols.map(c => `<th>${c}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table>${rows ? '' : `<div class="empty">${empty}</div>`}</div>`;

const VIEWS = {
  dashboard() {
    const a = active(), late = a.filter(isLate), copies = S.books.reduce((s, b) => s + b.total, 0);
    const shelf = copies - a.length, onTime = a.length - late.length;
    const C = 2 * Math.PI * 40, seg = n => (copies ? n / copies * C : 0);
    const events = S.loans.flatMap(l => [{ t: l.out, k: 'out', l }, ...(l.ret ? [{ t: l.ret, k: 'ret', l }] : [])]).sort((x, y) => new Date(y.t) - new Date(x.t)).slice(0, 6);
    const genres = Object.entries(S.books.reduce((o, b) => (o[b.genre] = (o[b.genre] || 0) + 1, o), {}));
    const top = Object.entries(S.loans.reduce((o, l) => (o[l.b] = (o[l.b] || 0) + 1, o), {})).sort((x, y) => y[1] - x[1]).slice(0, 4);
    const days = [...Array(14)].map((_, i) => { const d = new Date(Date.now() - (13 - i) * DAY); return { d, n: S.loans.filter(l => new Date(l.out).toDateString() === d.toDateString()).length, r: S.loans.filter(l => l.ret && new Date(l.ret).toDateString() === d.toDateString()).length }; });
    const mx = Math.max(1, ...days.map(x => Math.max(x.n, x.r)));
    return head('Library overview', `${late.length ? `${late.length} overdue loan${late.length > 1 ? 's need' : ' needs'} attention.` : 'Everything is on schedule.'} Last updated just now.`, '<button class="btn" data-a="addBook">Add a book</button>') + `
    <div class="grid k4">
      <div class="card kpi pri"><span>Titles in catalogue</span><b>${S.books.length}</b><small>${copies} physical copies</small>${spark(series('out'), '#fff')}</div>
      <div class="card kpi"><span>Issued this week</span><b>${series('out').reduce((s, n) => s + n, 0)}</b><small class="up">${series('ret').reduce((s, n) => s + n, 0)} returned</small>${spark(series('out'), 'var(--ac)')}</div>
      <div class="card kpi"><span>Active loans</span><b>${a.length}</b><small>${copies ? Math.round(a.length / copies * 100) : 0}% utilisation</small>${spark(series('ret'), 'var(--ok)')}</div>
      <div class="card kpi"><span>Overdue</span><b style="color:var(--er)">${late.length}</b><small class="down">₹${totalFines()} in fines</small></div>
    </div>
    <div class="grid c21">
      <div class="card"><header><h2>Circulation trend</h2><small>Issued vs returned · 14 days</small></header>
        <svg viewBox="0 0 560 150" style="width:100%" role="img" aria-label="Loans issued and returned per day">${days.map((x, i) => `<rect x="${i * 40 + 4}" y="${130 - x.n / mx * 110}" width="14" height="${x.n / mx * 110 || 2}" rx="4" fill="var(--ac)"><title>${x.d.toDateString()}: ${x.n} issued</title></rect><rect x="${i * 40 + 20}" y="${130 - x.r / mx * 110}" width="14" height="${x.r / mx * 110 || 2}" rx="4" fill="var(--ok)"><title>${x.d.toDateString()}: ${x.r} returned</title></rect><text x="${i * 40 + 19}" y="147" font-size="10" text-anchor="middle" fill="var(--mu)">${x.d.getDate()}</text>`).join('')}</svg></div>
      <div class="card"><header><h2>Stock position</h2><small>${copies} copies</small></header><div class="donut">
        <svg viewBox="0 0 100 100" role="img" aria-label="Copies on shelf, on loan and overdue"><g transform="rotate(-90 50 50)" fill="none" stroke-width="14"><circle cx="50" cy="50" r="40" stroke="var(--sf)"/><circle cx="50" cy="50" r="40" stroke="var(--ok)" stroke-dasharray="${seg(shelf)} ${C}"/><circle cx="50" cy="50" r="40" stroke="var(--ac)" stroke-dasharray="${seg(onTime)} ${C}" stroke-dashoffset="${-seg(shelf)}"/><circle cx="50" cy="50" r="40" stroke="var(--er)" stroke-dasharray="${seg(late.length)} ${C}" stroke-dashoffset="${-seg(shelf + onTime)}"/></g></svg>
        <div class="leg" style="flex:1"><div><i style="background:var(--ok)"></i>On shelf<b>${shelf}</b></div><div><i style="background:var(--ac)"></i>On loan<b>${onTime}</b></div><div><i style="background:var(--er)"></i>Overdue<b>${late.length}</b></div></div></div></div>
    </div>
    <div class="grid c3">
      <div class="card"><header><h2>Recent activity</h2></header><div class="tl">${events.map(e => `<div class="${e.k}"><b>${e.k === 'out' ? 'Issued' : 'Returned'} · ${esc(book(e.l.b)?.title)}</b><small>${esc(member(e.l.m)?.name)} · ${fd(e.t)}</small></div>`).join('')}</div></div>
      <div class="card"><header><h2>Most borrowed</h2></header>${top.map(([id, n]) => `<div class="row"><button class="lnk" data-a="bookInfo" data-id="${id}">${esc(book(id)?.title)}</button><div style="width:90px"><div class="bar2"><i style="width:${n / top[0][1] * 100}%"></i></div></div><b>${n}</b></div>`).join('') || '<p class="empty">No loans yet.</p>'}
        <header style="margin-top:18px"><h2>Collection mix</h2></header>${genres.map(([g, n]) => `<div class="row"><span>${esc(g)}</span><b>${n}</b></div>`).join('')}</div>
      <div class="card"><header><h2>Needs attention</h2><small>${late.length} overdue</small></header>${late.map(l => `<div class="row"><span><b>${esc(book(l.b)?.title)}</b><small>${esc(member(l.m)?.name)} · ₹${fineOf(l)} fine</small></span><button class="btn s" data-a="ret" data-id="${l.id}">Return</button></div>`).join('') || '<p class="empty">Nothing overdue.</p>'}
        ${S.holds.length ? `<header style="margin-top:18px"><h2>Holds</h2></header>${S.holds.map(h => `<div class="row"><span>${esc(book(h.b)?.title)}<small>${esc(member(h.m)?.name)}</small></span><button class="btn q s" data-a="unhold" data-id="${h.id}">Cancel</button></div>`).join('')}` : ''}</div>
    </div>`;
  },

  books() {
    const c = Q.books, t = c.s.toLowerCase(), genres = ['All', ...new Set(S.books.map(b => b.genre))];
    const L = S.books.filter(b => [b.id, b.title, b.author, b.genre, b.isbn].join(' ').toLowerCase().includes(t)
      && (c.g === 'All' || b.genre === c.g) && (c.f === 'all' || (c.f === 'in' ? avail(b) > 0 : avail(b) === 0)))
      .sort((a, b) => c.o === 'title' ? a.title.localeCompare(b.title) : c.o === 'author' ? a.author.localeCompare(b.author) : c.o === 'year' ? b.year - a.year : new Date(b.added) - new Date(a.added));
    const body = c.v === 'grid'
      ? `<div class="books">${L.map(b => `<div class="card bk" data-a="bookInfo" data-id="${b.id}"><div class="cv" style="${coverStyle(b)}"><b>${esc(b.title)}</b><small>${esc(b.author)}</small></div><div class="in"><span><b>${avail(b)}</b> / ${b.total}<small style="display:block;color:var(--mu)">${esc(b.genre)}</small></span><span class="pill ${avail(b) ? '' : 'r'}">${avail(b) ? 'In stock' : 'Out'}</span></div></div>`).join('')}</div>${L.length ? '' : '<div class="card empty">No books match these filters.</div>'}`
      : table(['Book', 'ID', 'Genre', 'Year', 'Shelf', 'Status', ''], L.map(b => `<tr><td><div style="display:flex;gap:12px;align-items:center"><div class="mini" style="${coverStyle(b)}"></div><span><button class="lnk" data-a="bookInfo" data-id="${b.id}">${esc(b.title)}</button><small>${esc(b.author)}</small></span></div></td><td>${esc(b.id)}</td><td>${esc(b.genre)}</td><td>${b.year}</td><td><b>${avail(b)}</b> / ${b.total}</td><td><span class="pill ${avail(b) ? '' : 'r'}">${avail(b) ? 'In stock' : 'Out of stock'}</span></td><td><div class="ra"><button class="btn q s" data-a="edit" data-id="${b.id}">Edit</button><button class="btn q s" data-a="del" data-id="${b.id}">Delete</button></div></td></tr>`).join(''), 'No books match these filters.');
    return head('Catalogue', `${L.length} of ${S.books.length} titles`, '<button class="btn" data-a="addBook">Add a book</button>') + `
    <div class="tb"><input id="s" type="search" placeholder="Title, author, genre, ISBN or ID" value="${esc(c.s)}">
      <select id="f"><option value="all">All stock</option><option value="in" ${c.f === 'in' ? 'selected' : ''}>In stock</option><option value="out" ${c.f === 'out' ? 'selected' : ''}>Out of stock</option></select>
      <select id="o"><option value="recent">Newest added</option><option value="title" ${c.o === 'title' ? 'selected' : ''}>Title A–Z</option><option value="author" ${c.o === 'author' ? 'selected' : ''}>Author A–Z</option><option value="year" ${c.o === 'year' ? 'selected' : ''}>Year, newest</option></select>
      <div class="seg"><button data-a="view" data-id="grid" class="${c.v === 'grid' ? 'on' : ''}">Grid</button><button data-a="view" data-id="table" class="${c.v === 'table' ? 'on' : ''}">Table</button></div></div>
    <div class="chips">${genres.map(g => `<button class="chip ${c.g === g ? 'on' : ''}" data-a="genre" data-id="${esc(g)}">${esc(g)}</button>`).join('')}</div>` + body;
  },

  circulation() {
    return head('Circulation desk', 'Issue a book or take one back in.') + `
    <div class="grid c3">
      <form class="card" id="fi"><header><h2>Issue a book</h2></header><div class="fld">
        <select name="b" id="ib" required><option value="">Choose a book</option>${S.books.map(b => `<option value="${b.id}" ${b.id === pre ? 'selected' : ''} ${avail(b) ? '' : 'disabled'}>${esc(b.title)} — ${avail(b)} left</option>`).join('')}</select>
        <select name="m" id="im" required><option value="">Choose a member</option>${S.members.map(m => `<option value="${m.id}">${esc(m.name)} (${m.id}) — ${active().filter(l => l.m === m.id).length}/${LIMITS[m.tier]}</option>`).join('')}</select>
        <div class="card" id="ip" style="box-shadow:none;background:var(--sf);color:var(--mu)">Select a book and a member to preview the due date.</div>
        <button class="btn">Confirm issue</button></div></form>
      <form class="card" id="fr"><header><h2>Return a book</h2></header><div class="fld">
        <select name="l" id="rl" required><option value="">Choose an active loan</option>${active().map(l => `<option value="${l.id}">${esc(book(l.b)?.title)} — ${esc(member(l.m)?.name)}${isLate(l) ? ' (overdue)' : ''}</option>`).join('')}</select>
        <div class="card" id="rp" style="box-shadow:none;background:var(--sf);color:var(--mu)">Select a loan to check for fines.</div>
        <button class="btn">Confirm return</button></div></form>
      <div class="card"><header><h2>Lending rules</h2></header><ul class="rules" style="padding-left:18px;margin:0"><li><b>Loan period:</b> ${LOAN_DAYS} days.</li><li><b>Limits:</b> 3 undergraduate, 5 postgraduate, 8 staff.</li><li><b>Renewals:</b> once for 7 days, unless a hold exists.</li><li><b>Fines:</b> ₹${RATE} a day after ${GRACE} day of grace.</li><li><b>Overdue members</b> can’t borrow until they return.</li></ul></div>
    </div>`;
  },

  loans() {
    const c = Q.loans, t = c.s.toLowerCase();
    const L = S.loans.filter(l => [l.id, l.b, book(l.b)?.title, l.m, member(l.m)?.name].join(' ').toLowerCase().includes(t) && (c.f === 'all' || stateOf(l)[0].toLowerCase().replace(' ', '') === c.f)).sort((a, b) => new Date(b.out) - new Date(a.out));
    return head('Loans & fines', `${active().length} active · ₹${totalFines()} in fines`) + `
    <div class="tb"><input id="s" type="search" placeholder="Book, member or loan ID" value="${esc(c.s)}"><select id="f"><option value="all">All loans</option><option value="onloan" ${c.f === 'onloan' ? 'selected' : ''}>On loan</option><option value="overdue" ${c.f === 'overdue' ? 'selected' : ''}>Overdue</option><option value="returned" ${c.f === 'returned' ? 'selected' : ''}>Returned</option></select></div>` +
    table(['Book', 'Member', 'Issued', 'Due', 'Status', 'Fine', ''], L.map(l => { const s = stateOf(l), f = fineOf(l); return `<tr><td><button class="lnk" data-a="bookInfo" data-id="${l.b}">${esc(book(l.b)?.title || 'Deleted book')}</button><small>${l.id}</small></td><td><button class="lnk" data-a="memberInfo" data-id="${l.m}">${esc(member(l.m)?.name || l.m)}</button><small>${l.m}</small></td><td>${fd(l.out)}</td><td>${fd(l.due)}${l.ren ? '<small>Renewed</small>' : ''}</td><td><span class="pill ${s[1]}">${s[0]}</span></td><td>${f ? '₹' + f : '—'}</td><td><div class="ra">${l.ret ? '' : `<button class="btn q s" data-a="renew" data-id="${l.id}">Renew</button><button class="btn s" data-a="ret" data-id="${l.id}">Return</button>`}</div></td></tr>`; }).join(''), 'No loans match.');
  },

  members() {
    const t = Q.members.s.toLowerCase(), L = S.members.filter(m => (m.id + m.name).toLowerCase().includes(t));
    return head('Members', `${L.length} registered`, '<button class="btn" data-a="addMember">Add a member</button>') + `<div class="tb"><input id="s" type="search" placeholder="Name or member ID" value="${esc(Q.members.s)}"></div>` +
    table(['Member', 'Type', 'Borrowing', 'Holding', 'Fines'], L.map(m => { const a = active().filter(l => l.m === m.id), f = S.loans.filter(l => l.m === m.id).reduce((s, l) => s + fineOf(l), 0); return `<tr><td><button class="lnk" data-a="memberInfo" data-id="${m.id}">${esc(m.name)}</button><small>${m.id}</small></td><td>${m.tier}</td><td style="min-width:120px"><div class="bar2"><i style="width:${a.length / LIMITS[m.tier] * 100}%"></i></div><small>${a.length} of ${LIMITS[m.tier]}</small></td><td>${a.map(l => esc(book(l.b)?.title)).join(', ') || '—'}</td><td>${f ? `<span class="pill r">₹${f}</span>` : '—'}</td></tr>`; }).join(''), 'No members found.');
  },

  reports() {
    const copies = S.books.reduce((s, b) => s + b.total, 0), g = S.books.reduce((o, b) => (o[b.genre] = (o[b.genre] || 0) + b.total, o), {});
    const byMember = S.members.map(m => [m.name, S.loans.filter(l => l.m === m.id).length]).sort((a, b) => b[1] - a[1]);
    return head('Reports & data', 'Understand the collection and keep a backup.') + `
    <div class="grid c2">
      <div class="card"><header><h2>Copies by genre</h2></header>${Object.entries(g).map(([k, n]) => `<div class="row" style="display:grid;grid-template-columns:110px 1fr 32px;gap:12px"><span>${esc(k)}</span><div class="bar2"><i style="width:${n / copies * 100}%"></i></div><b>${n}</b></div>`).join('')}</div>
      <div class="card"><header><h2>Circulation summary</h2></header>${[['Total copies', copies], ['On loan', active().length], ['Lifetime loans', S.loans.length], ['Fines accrued', '₹' + totalFines()], ['Open holds', S.holds.length]].map(([a, b]) => `<div class="row"><span>${a}</span><b>${b}</b></div>`).join('')}
      <header style="margin-top:18px"><h2>Most active members</h2></header>${byMember.slice(0, 3).map(([n, c]) => `<div class="row"><span>${esc(n)}</span><b>${c}</b></div>`).join('')}</div>
    </div>
    <div class="card"><header><h2>Your data</h2></header><p style="color:var(--mu);margin-bottom:14px">Everything is stored in this browser. Export a backup before importing or resetting.</p>
      <div class="tb"><button class="btn" id="ej">Export JSON backup</button><button class="btn q" id="ec">Export loans CSV</button><label class="btn q">Import backup<input type="file" id="imp" accept=".json" hidden></label><button class="btn d" id="rs">Reset to sample data</button></div></div>`;
  }
};

/* ---------- render and routing ---------- */
function download(name, content, type) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([content], { type }));
  a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

function bind() {
  const c = Q[cur];
  if (c) {
    const s = $('#s');
    if (s) s.oninput = e => { c.s = e.target.value; const p = e.target.selectionStart; render(); const n = $('#s'); n.focus(); n.setSelectionRange(p, p); };
    ['f', 'o'].forEach(k => { const el = $('#' + k); if (el) el.onchange = () => { c[k] = el.value; render(); }; });
  }
  if ($('#fi')) {
    const prevIssue = () => {
      const b = book($('#ib').value), m = member($('#im').value);
      $('#ip').innerHTML = b && m ? `<b style="color:var(--ink)">${esc(b.title)}</b> to <b style="color:var(--ink)">${esc(m.name)}</b><br>Due ${fd(iso(LOAN_DAYS))} · ${active().filter(l => l.m === m.id).length}/${LIMITS[m.tier]} books held` : 'Select a book and a member to preview the due date.';
    };
    $('#ib').onchange = prevIssue; $('#im').onchange = prevIssue; prevIssue();
    $('#fi').onsubmit = e => { e.preventDefault(); const f = new FormData(e.target); issue(f.get('b'), f.get('m')); };
    $('#rl').onchange = () => {
      const l = S.loans.find(x => x.id === $('#rl').value);
      $('#rp').innerHTML = l ? `Due ${fd(l.due)} · ${fineOf(l) ? `<b style="color:var(--er)">fine ₹${fineOf(l)}</b>` : 'no fine'}` : 'Select a loan to check for fines.';
    };
    $('#fr').onsubmit = e => { e.preventDefault(); giveBack(new FormData(e.target).get('l')); };
  }
  if ($('#ej')) {
    $('#ej').onclick = () => download('folionest-backup.json', JSON.stringify(S, null, 2), 'application/json');
    $('#ec').onclick = () => download('loans.csv', 'Loan,Book,Member,Issued,Due,Returned,Fine\n' + S.loans.map(l => [l.id, book(l.b)?.title, member(l.m)?.name, l.out, l.due, l.ret || '', fineOf(l)].map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n'), 'text/csv');
    $('#imp').onchange = async e => {
      try {
        const d = JSON.parse(await e.target.files[0].text());
        if (![d.books, d.members, d.loans].every(Array.isArray)) throw new Error('bad');
        confirmBox('Replace all current data?', () => { S = { holds: [], ...d }; save(); render(); toast('Backup restored.'); }, 'Restore backup');
      } catch { toast('That file isn’t a valid FolioNest backup.', 1); }
    };
    $('#rs').onclick = () => confirmBox('Reset to sample data?', () => { S = seed(); save(); render(); toast('Sample data restored.'); }, 'Reset data');
  }
}

function chrome() {
  const lateCount = active().filter(isLate).length, copies = S.books.reduce((s, b) => s + b.total, 0), used = copies ? Math.round(active().length / copies * 100) : 0;
  $('#rail').innerHTML = `<a class="brand" href="#dashboard"><i>f</i>FolioNest</a>` + GROUPS.map(([g, ks]) => `<div class="grp">${g}</div>` + ks.map(k => `<a href="#${k}" class="${k === cur ? 'on' : ''}"><span>${ICON[k]}</span>${PAGES[k]}${k === 'books' ? `<em>${S.books.length}</em>` : k === 'loans' && lateCount ? `<em class="hot">${lateCount}</em>` : ''}</a>`).join('')).join('') +
    `<div class="quota"><b>Shelf utilisation</b>${active().length} of ${copies} copies on loan<div class="meter"><i style="width:${used}%"></i></div>Fines ₹${totalFines()}</div>`;
  $('#crumb').innerHTML = `Workspace / <b>${PAGES[cur]}</b>`;
  const late = active().filter(isLate);
  $('#dot').style.display = late.length ? 'block' : 'none';
  $('#np').innerHTML = late.length ? late.map(l => `<div><span><b>${esc(book(l.b)?.title)}</b><br><small style="color:var(--mu)">${esc(member(l.m)?.name)} · due ${fd(l.due)}</small></span><span class="pill r">₹${fineOf(l)}</span></div>`).join('') : '<p>No notifications. All loans are on time.</p>';
}

function render() { chrome(); $('#view').innerHTML = VIEWS[cur](); bind(); $('#rail').classList.remove('open'); }
function go(page) { if (location.hash === '#' + page) render(); else location.hash = page; }
function route() { const p = location.hash.slice(1); cur = PAGES[p] ? p : 'dashboard'; render(); pre = undefined; scrollTo(0, 0); }

/* ---------- events ---------- */
const ACTIONS = {
  addBook: () => saveBook(),
  edit: id => { closeDrawer(); saveBook(id); },
  del: removeBook,
  addMember: saveMember,
  ret: giveBack,
  renew,
  hold: id => { closeDrawer(); placeHold(id); },
  unhold: id => { S.holds = S.holds.filter(h => h.id !== id); save(); closeDrawer(); render(); toast('Hold cancelled.'); },
  bookInfo: bookDrawer,
  memberInfo: memberDrawer,
  closeDr: closeDrawer,
  issueFor: id => { pre = id; closeDrawer(); go('circulation'); },
  view: id => { Q.books.v = id; render(); },
  genre: id => { Q.books.g = id; render(); },
  menu: () => $('#rail').classList.toggle('open'),
  notif: () => $('#np').classList.toggle('open'),
  theme: () => {
    const r = document.documentElement, dark = r.dataset.theme === 'dark';
    r.dataset.theme = dark ? 'light' : 'dark'; store.set('fn_theme', r.dataset.theme);
  }
};

document.addEventListener('click', e => {
  const t = e.target.closest('[data-a]');
  if (t) ACTIONS[t.dataset.a]?.(t.dataset.id);
  if (!e.target.closest('.np-wrap')) $('#np').classList.remove('open');
});
document.addEventListener('keydown', e => { if (e.key === 'Escape') { closeDrawer(); $('#np').classList.remove('open'); } });
$('#gs').addEventListener('keydown', e => { if (e.key === 'Enter') { Q.books.s = e.target.value; e.target.value = ''; go('books'); } });
addEventListener('hashchange', route);

const savedTheme = store.get('fn_theme');
if (savedTheme) document.documentElement.dataset.theme = savedTheme;
else if (matchMedia('(prefers-color-scheme:dark)').matches) document.documentElement.dataset.theme = 'dark';
route();