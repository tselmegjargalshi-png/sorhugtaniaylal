import { PACKAGES, MNT_PER_USD } from './data/data.js';
import { imgUrl, esc } from './util.js';

const KEY = 'sorkhugtani-cart-v1';

function load() {
  try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch { return []; }
}
function save(items) {
  try { localStorage.setItem(KEY, JSON.stringify(items)); } catch { /* storage unavailable */ }
}

const pkg = (id) => PACKAGES.find((p) => p.id === id);

export function lineTotal(it) {
  const p = pkg(it.id);
  if (!p) return 0;
  return p.unit === 'day' ? p.price * it.days * Math.max(1, Math.ceil(it.people / (p.id === 'car' ? 6 : 99))) : p.price * it.people;
}

export function createCart({ drawer, countEl, getT, fmt }) {
  let items = load().filter((i) => pkg(i.id));
  let view = 'list'; // list | form | thanks
  const panel = drawer.querySelector('.cart-panel');

  function count() { return items.reduce((s, i) => s + 1, 0); }
  function total() { return items.reduce((s, i) => s + lineTotal(i), 0); }

  function updateCount(bump = false) {
    countEl.textContent = count();
    if (bump) {
      countEl.classList.remove('bump');
      void countEl.offsetWidth;
      countEl.classList.add('bump');
    }
  }

  function add(id) {
    const p = pkg(id);
    if (!p) return;
    const ex = items.find((i) => i.id === id);
    if (ex) ex.people += 1;
    else items.push({ id, people: p.unit === 'day' ? 1 : 2, days: p.unit === 'day' ? 3 : p.days, date: '' });
    save(items);
    updateCount(true);
    if (drawer.classList.contains('open')) render();
  }

  function open() {
    view = items.length ? view === 'thanks' ? 'list' : view : 'list';
    render();
    drawer.classList.add('open');
    drawer.setAttribute('aria-hidden', 'false');
    document.documentElement.style.overflow = 'hidden';
    panel.querySelector('.cart-x')?.focus();
  }
  function close() {
    drawer.classList.remove('open');
    drawer.setAttribute('aria-hidden', 'true');
    document.documentElement.style.overflow = '';
    if (view === 'thanks') view = 'list';
  }

  function render() {
    const t = getT();
    const T = t.cart;
    const head = `<div class="cart-head"><h3>${esc(T.title)}</h3><button class="cart-x" aria-label="${esc(t.nav.close)}">✕</button></div>`;
    if (view === 'thanks') {
      panel.innerHTML = `${head}<div class="cart-items"><div class="thanks">
        <div class="ok"><svg width="34" height="34" viewBox="0 0 24 24"><path d="M5 12.5l4.2 4.2L19 7" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
        <h4>${esc(T.thanks)}</h4><p>${esc(T.thanksSub)}</p>
        <button class="btn btn-gold cart-continue">${esc(T.continue)}</button></div></div>`;
      return;
    }
    if (!items.length) {
      panel.innerHTML = `${head}<div class="cart-items"><div class="cart-empty">
        <svg width="64" height="64" viewBox="0 0 24 24"><path d="M3 4h2l2.4 11.2a2 2 0 002 1.6h8.2a2 2 0 002-1.5L21 8H6.2" fill="none" stroke="currentColor" stroke-width="1.4"/></svg>
        <p>${esc(T.empty)}</p><a href="#tours" class="btn btn-ghost cart-goto">${esc(t.nav.tours)}</a></div></div>`;
      return;
    }
    const tt = total();
    const list = items.map((it, idx) => {
      const p = pkg(it.id);
      const L = t.tours.list[it.id];
      const perDay = p.unit === 'day';
      return `<div class="ci" data-idx="${idx}">
        <div class="ph"><img class="loaded" src="${imgUrl(p.img, 330)}" alt="" loading="lazy" /></div>
        <div>
          <h4>${esc(L.name)}</h4>
          <div class="ci-row">
            <span>${esc(T.people)}</span>
            <span class="stepper"><button data-act="pm" aria-label="-">−</button><span>${it.people}</span><button data-act="pp" aria-label="+">+</button></span>
            ${perDay ? `<span>${esc(T.daysLabel)}</span><span class="stepper"><button data-act="dm" aria-label="-">−</button><span>${it.days}</span><button data-act="dp" aria-label="+">+</button></span>` : ''}
          </div>
          <div class="ci-row" style="margin-top:6px"><label>${esc(T.date)} <input type="date" data-act="date" value="${esc(it.date)}" /></label></div>
          <div class="ci-foot"><b>$${fmt(lineTotal(it))}</b><button class="ci-rm" data-act="rm">${esc(T.remove)}</button></div>
        </div>
      </div>`;
    }).join('');
    const foot = view === 'form'
      ? `<form class="checkout-form">
          <label>${esc(T.name)}<input name="name" required autocomplete="name" /></label>
          <label>${esc(T.email)}<input name="email" type="email" required autocomplete="email" /></label>
          <label>${esc(T.phone)}<input name="phone" type="tel" autocomplete="tel" /></label>
          <label>${esc(T.note)}<textarea name="note"></textarea></label>
          <button class="btn btn-gold" type="submit">${esc(T.submit)} · $${fmt(tt)}</button>
        </form>`
      : `<button class="btn btn-gold cart-checkout">${esc(T.checkout)}</button>`;
    panel.innerHTML = `${head}<div class="cart-items">${list}</div>
      <div class="cart-foot">
        <div class="cart-total"><span>${esc(T.subtotal)} · ${count()} ${esc(T.items)}</span><div><b>$${fmt(tt)}</b><small>${T.approx} ${fmt(tt * MNT_PER_USD)}₮</small></div></div>
        ${foot}
      </div>`;
  }

  panel.addEventListener('click', (e) => {
    const b = e.target.closest('button, a');
    if (!b) return;
    if (b.classList.contains('cart-x') || b.classList.contains('cart-continue')) { close(); return; }
    if (b.classList.contains('cart-goto')) { close(); return; }
    if (b.classList.contains('cart-checkout')) { view = 'form'; render(); panel.querySelector('input')?.focus(); return; }
    const row = b.closest('.ci');
    if (!row) return;
    const it = items[+row.dataset.idx];
    const act = b.dataset.act;
    if (act === 'pp') it.people = Math.min(30, it.people + 1);
    if (act === 'pm') it.people = Math.max(1, it.people - 1);
    if (act === 'dp') it.days = Math.min(60, it.days + 1);
    if (act === 'dm') it.days = Math.max(1, it.days - 1);
    if (act === 'rm') items.splice(+row.dataset.idx, 1);
    save(items); updateCount(); render();
  });
  panel.addEventListener('change', (e) => {
    const inp = e.target.closest('input[data-act="date"]');
    if (!inp) return;
    const it = items[+inp.closest('.ci').dataset.idx];
    it.date = inp.value; save(items);
  });
  panel.addEventListener('submit', (e) => {
    e.preventDefault();
    items = []; save(items); updateCount();
    view = 'thanks'; render();
  });
  drawer.querySelector('.cart-backdrop').addEventListener('click', close);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && drawer.classList.contains('open')) close(); });

  updateCount();
  return { add, open, close, render, get count() { return count(); } };
}
