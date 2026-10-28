import './style.css';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import mn from './i18n/mn.js';
import { LANGS, UB_PLACES, REGIONS, AIMAGS, SEASONS, FESTIVALS, FOODS, UB_CLIMATE, PACKAGES, MNT_PER_USD, COMPANY } from './data/data.js';
import { IMAGES } from './data/images.js';
import { esc, photo, imgUrl, wireImages, commonsPage, fmtNum } from './util.js';
import { createCart } from './cart.js';
import { seasonForDate } from './three/season.js';

gsap.registerPlugin(ScrollTrigger);

const loaders = {
  en: () => import('./i18n/en.js'), ko: () => import('./i18n/ko.js'), ja: () => import('./i18n/ja.js'),
  zh: () => import('./i18n/zh.js'), tr: () => import('./i18n/tr.js'), ru: () => import('./i18n/ru.js'),
};
const dicts = { mn };
const CJK_FONTS = {
  ko: 'Noto+Sans+KR:wght@400;600;800',
  ja: 'Noto+Sans+JP:wght@400;600;800',
  zh: 'Noto+Sans+SC:wght@400;600;800',
};

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const coarse = matchMedia('(pointer: coarse)').matches;
const lowPower = coarse || (navigator.hardwareConcurrency || 8) <= 4;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

const state = { lang: 'mn', t: mn, season: seasonForDate(), filter: 'all', mapRegion: null, selectedAimag: null };
let fmt = fmtNum('mn');
const get = (path, obj = state.t) => path.split('.').reduce((o, k) => (o ? o[k] : undefined), obj);

if (reduced) document.documentElement.classList.add('reduced');
document.body.classList.add('is-loading');

/* ---------------- Language ---------------- */
function pickInitialLang() {
  try {
    const saved = localStorage.getItem('sorkhugtani-lang');
    if (saved && LANGS.some((l) => l.code === saved)) return saved;
  } catch { /* ignore */ }
  const q = new URLSearchParams(location.search).get('lang');
  if (q && LANGS.some((l) => l.code === q)) return q;
  const nav = (navigator.language || 'mn').slice(0, 2).toLowerCase();
  return LANGS.some((l) => l.code === nav) ? nav : 'mn';
}

async function setLang(code, { first = false } = {}) {
  if (!dicts[code]) dicts[code] = (await loaders[code]()).default;
  state.lang = code;
  state.t = dicts[code];
  fmt = fmtNum(code);
  document.documentElement.lang = code;
  document.title = state.t.meta.title;
  $('meta[name="description"]').setAttribute('content', state.t.meta.description);
  const cjk = $('#cjk-font');
  if (CJK_FONTS[code]) cjk.href = `https://fonts.googleapis.com/css2?family=${CJK_FONTS[code]}&display=swap`;
  try { localStorage.setItem('sorkhugtani-lang', code); } catch { /* ignore */ }
  $('.lang-cur').textContent = LANGS.find((l) => l.code === code).short;
  $$('.lang-menu button').forEach((b) => b.setAttribute('aria-selected', b.dataset.lang === code));
  renderAll();
  if (!first) {
    ScrollTrigger.refresh();
    cart.render();
  }
}

function buildLangMenu() {
  $('.lang-menu').innerHTML = LANGS.map((l) => `<li><button role="option" data-lang="${l.code}"><span>${l.label}</span><small>${l.short}</small></button></li>`).join('');
  const box = $('.lang');
  $('.lang-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    box.classList.toggle('open');
    $('.lang-btn').setAttribute('aria-expanded', box.classList.contains('open'));
  });
  $('.lang-menu').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-lang]');
    if (!b) return;
    box.classList.remove('open');
    setLang(b.dataset.lang);
  });
  document.addEventListener('click', () => box.classList.remove('open'));
}

/* ---------------- Render ---------------- */
const arrow = '<svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

function head(sec, extra = '') {
  return `<span class="kicker reveal">${esc(sec.kicker)}</span>
    <h2 class="title split">${esc(sec.title)}</h2>
    ${sec.lead ? `<p class="lead reveal">${esc(sec.lead)}</p>` : ''}${extra}`;
}

function renderStatic() {
  $$('[data-i18n]').forEach((el) => { const v = get(el.dataset.i18n); if (typeof v === 'string') el.textContent = v; });
  $('.mobile-menu').innerHTML = ['ub', 'map', 'seasons', 'festivals', 'food', 'guide', 'tours'].map((k) => `<a href="#${k}">${esc(state.t.nav[k])}</a>`).join('');
}

function renderHero() {
  const h = state.t.hero;
  const chars = h.title1.split(' ').map((w) => `<span class="w">${[...w].map((c) => `<span class="ch">${esc(c)}</span>`).join('')}</span>`).join(' ');
  $('.hero-inner').innerHTML = `
    <span class="kicker hero-kicker">${esc(h.kicker)}</span>
    <h1 class="hero-title" aria-label="${esc(h.title1)}">${chars}</h1>
    <p class="hero-sub">${esc(h.title2)}</p>
    <p class="hero-lead">${esc(h.lead)}</p>
    <div class="hero-ctas">
      <a href="#tours" class="btn btn-gold magnetic">${esc(h.cta1)} ${arrow}</a>
      <a href="#map" class="btn btn-ghost magnetic">${esc(h.cta2)}</a>
    </div>`;
  $('.season-switch').innerHTML = `<span class="lbl">${esc(h.season)}</span>` + SEASONS.map((s) =>
    `<button data-season="${s.id}" aria-pressed="${s.id === state.season}">${esc(state.t.seasons.list[s.id].name)}</button>`).join('');
}

function renderStats() {
  $('#stats').innerHTML = `<div class="wrap"><div class="stats-grid">${state.t.stats.map((s) =>
    `<div class="stat reveal"><b data-count="${s.value}" data-suffix="${esc(s.suffix)}">0${esc(s.suffix)}</b><span>${esc(s.label)}</span></div>`).join('')}</div></div>`;
  const words = state.t.marquee;
  const row = words.map((w) => `<span>${esc(w)}</span><i>✦</i>`).join('');
  $('.marquee-track').innerHTML = row + row;
}

function kmText(km) {
  return km < 1 ? `${fmt(km * 1000)} m` : `${km % 1 ? km.toLocaleString(state.lang) : fmt(km)} km`;
}

function renderUB() {
  const U = state.t.ub;
  $('#ub').innerHTML = `<div class="wrap ub-head"><div>${head(U)}</div>
      <div class="ub-drag reveal">${arrow} ${esc(U.drag)}</div></div>
    <div class="ub-track-wrap"><div class="ub-track">${UB_PLACES.map((p, i) => {
      const L = U.places[p.id];
      return `<article class="ub-card">
        ${photo(p.img, { w: 960, alt: L.name })}
        <span class="ub-num">${String(i + 1).padStart(2, '0')}</span>
        <span class="ub-km">${p.km === 0 ? '📍' : `<b>${kmText(p.km)}</b>`} · ${esc(p.km === 0 ? L.tag : U.from)}</span>
        <div class="ub-body"><span class="ub-tag">${esc(L.tag)}</span><h3>${esc(L.name)}</h3><p>${esc(L.desc)}</p></div>
      </article>`;
    }).join('')}</div></div>`;
}

function renderMapSection() {
  const M = state.t.map;
  const legend = REGIONS.map((r) => `<button data-region="${r.id}" class="${state.mapRegion === r.id ? 'on' : ''}"><i style="background:${r.color}"></i>${esc(state.t.regions[r.id].name)}</button>`).join('');
  $('#map').innerHTML = `<div class="wrap">${head(M)}
    <div class="map-stage reveal">
      <canvas id="map-canvas" aria-label="${esc(M.title)}"></canvas>
      <div class="map-legend"><button data-region="" class="${state.mapRegion ? '' : 'on'}"><i style="background:#fff"></i>${esc(M.all)}</button>${legend}</div>
      <div class="map-tip"></div>
      <aside class="map-panel" aria-live="polite"></aside>
      <div class="map-hint">${esc(M.hint)}</div>
    </div>
    <p class="map-note">${esc(M.note)}</p></div>`;
}

function aimagRegion(id) { return REGIONS.find((r) => r.aimags.includes(id)); }

function mapPanelHtml(id) {
  const M = state.t.map;
  const a = AIMAGS[id];
  const L = state.t.aimags[id];
  if (!a || !L) return '';
  const r = aimagRegion(id);
  const hours = Math.max(1, Math.round(a.km / 55));
  return `<button class="mp-close" aria-label="${esc(M.reset)}">✕</button>
    ${photo(a.img, { w: 960, alt: L.name })}
    <div class="map-panel-body">
      <span class="mp-region" style="color:${r.color}">${esc(state.t.regions[r.id].name)}</span>
      <h3>${esc(L.name)}</h3>
      <div class="mp-facts">
        <div class="big"><small>${esc(M.distance)} · ${esc(M.road)}</small><b>${fmt(a.km)} km</b></div>
        <div><small>${esc(M.center)}</small><b>${esc(L.center)}</b></div>
        <div><small>${esc(M.area)}</small><b>${fmt(a.area)} km²</b></div>
        <div style="grid-column:span 2"><small>${esc(M.drive)}</small><b>≈ ${hours} ${esc(M.hours)}</b></div>
      </div>
      <small style="color:var(--muted);font-weight:800;letter-spacing:.06em">${esc(M.sights)}</small>
      <ul class="mp-sights">${L.sights.map((s) => `<li>${esc(s)}</li>`).join('')}</ul>
    </div>`;
}

function renderAimagGrid() {
  const M = state.t.map;
  $('#aimags').innerHTML = `<div class="wrap">${REGIONS.map((r) => `
    <div class="region-block">
      <div class="region-head reveal"><h3><i style="background:${r.color}"></i>${esc(state.t.regions[r.id].name)}</h3><p>${esc(state.t.regions[r.id].desc)}</p></div>
      <div class="aimag-grid">${r.aimags.map((id) => {
        const a = AIMAGS[id], L = state.t.aimags[id];
        return `<button class="aimag-card reveal" data-aimag="${id}">
          ${photo(a.img, { w: 960, alt: L.name })}
          <span class="ac-km">${esc(M.distance)} <b>${fmt(a.km)} km</b></span>
          <div class="ac-body"><h4>${esc(L.name)}</h4><div class="ac-meta">${esc(M.center)}: ${esc(L.center)} · ${fmt(a.area)} km²</div>
          <ul>${L.sights.slice(0, 4).map((s) => `<li>${esc(s)}</li>`).join('')}</ul></div>
        </button>`;
      }).join('')}</div>
    </div>`).join('')}</div>`;
}

function renderSeasons() {
  const S = state.t.seasons;
  $('#seasons').innerHTML = `<div class="wrap">${head(S)}
    <div class="season-row">${SEASONS.map((s) => {
      const L = S.list[s.id];
      return `<div class="season-panel ${s.id === state.season ? 'active' : ''}" data-season="${s.id}" role="button" tabindex="0" aria-label="${esc(L.name)}">
        ${photo(s.img, { w: 1280, alt: L.name })}
        <span class="sp-label">${esc(L.name)}</span>
        <div class="sp-body"><h3>${esc(L.name)}</h3>
          <div class="sp-meta"><span>${s.months} ${esc(S.months)}</span><span>${esc(S.temp)}: ${s.temp}</span></div>
          <p>${esc(L.desc)}</p><ul class="sp-do">${L.do.map((d) => `<li>${esc(d)}</li>`).join('')}</ul></div>
      </div>`;
    }).join('')}</div></div>`;
}

function yearRingSvg() {
  const F = state.t.festivals;
  const cx = 200, cy = 200, R = 150;
  const months = state.t.guide.monthsShort;
  const seasonCol = { spring: '#9fd36b', summer: '#3fae6b', autumn: '#f2a23d', winter: '#8ec5ff' };
  const mSeason = (m) => (m >= 3 && m <= 5 ? 'spring' : m >= 6 && m <= 8 ? 'summer' : m >= 9 && m <= 11 ? 'autumn' : 'winter');
  let arcs = '';
  for (let m = 1; m <= 12; m++) {
    const a0 = ((m - 1) / 12) * Math.PI * 2 - Math.PI / 2, a1 = (m / 12) * Math.PI * 2 - Math.PI / 2 - 0.02;
    const p = (a, r) => `${cx + Math.cos(a) * r} ${cy + Math.sin(a) * r}`;
    arcs += `<path d="M ${p(a0, R)} A ${R} ${R} 0 0 1 ${p(a1, R)}" stroke="${seasonCol[mSeason(m)]}" stroke-width="10" fill="none" stroke-linecap="round" opacity=".85"/>`;
    const am = ((m - 0.5) / 12) * Math.PI * 2 - Math.PI / 2;
    arcs += `<text class="m-label" x="${cx + Math.cos(am) * (R + 28)}" y="${cy + Math.sin(am) * (R + 28) + 4}" text-anchor="middle">${esc(months[m - 1])}</text>`;
  }
  const perMonth = {};
  const dots = FESTIVALS.map((f) => {
    const k = (perMonth[f.month] = (perMonth[f.month] || 0) + 1) - 1;
    const am = ((f.month - 0.5 + k * 0.28 - 0.14) / 12) * Math.PI * 2 - Math.PI / 2;
    const r = R - 34 - k * 0;
    const x = cx + Math.cos(am) * r, y = cy + Math.sin(am) * r;
    return `<g class="dot" data-fest="${f.id}" tabindex="0" role="button" aria-label="${esc(F.list[f.id].name)}">
      <line x1="${cx + Math.cos(am) * (R - 6)}" y1="${cy + Math.sin(am) * (R - 6)}" x2="${x}" y2="${y}" stroke="rgba(255,255,255,.3)"/>
      <circle cx="${x}" cy="${y}" r="9" fill="#f2b33d" stroke="#0a1020" stroke-width="3"/></g>`;
  }).join('');
  return `<svg viewBox="0 0 400 400" role="img" aria-label="${esc(F.yearRing)}">
    <circle cx="${cx}" cy="${cy}" r="${R - 60}" fill="rgba(255,255,255,.03)" stroke="rgba(255,255,255,.08)"/>
    ${arcs}${dots}
    <text class="ring-center" x="${cx}" y="${cy - 2}" text-anchor="middle">${new Date().getFullYear() + (new Date().getMonth() > 9 ? 1 : 0)}</text>
    <text class="ring-sub" x="${cx}" y="${cy + 20}" text-anchor="middle">${esc(F.yearRing)}</text>
  </svg>`;
}

function renderFestivals() {
  const F = state.t.festivals;
  $('#festivals').innerHTML = `<div class="wrap">${head(F)}
    <div class="fest-layout">
      <div class="year-ring reveal">${yearRingSvg()}</div>
      <div><div class="fest-list">${FESTIVALS.map((f) => {
        const L = F.list[f.id];
        return `<article class="fest-card reveal" id="fest-${f.id}">${photo(f.img, { w: 960, alt: L.name })}
          <div class="fest-body"><div class="fest-when">${esc(L.when)}</div><h3>${esc(L.name)}</h3><p>${esc(L.desc)}</p></div></article>`;
      }).join('')}</div><p class="fest-tip">${esc(F.tip)}</p></div>
    </div></div>`;
}

const knotSvg = '<svg class="pattern" viewBox="0 0 100 100"><path d="M50 8 L71 29 L50 50 L29 29 Z M50 50 L71 71 L50 92 L29 71 Z M8 50 L29 29 L50 50 L29 71 Z M50 50 L71 29 L92 50 L71 71 Z" fill="none" stroke="#fff" stroke-width="3"/></svg>';

function renderFood() {
  const F = state.t.food;
  $('#food').innerHTML = `<div class="wrap">${head(F)}
    <div class="food-grid">${FOODS.map((f) => {
      const L = F.list[f.id];
      return `<button class="food-card reveal" aria-label="${esc(L.name)}"><div class="food-inner">
        <div class="food-face food-front">${photo(f.img, { w: 960, alt: L.name })}<h3>${esc(L.name)}</h3></div>
        <div class="food-face food-back">${knotSvg}<h3>${esc(L.name)}</h3><p>${esc(L.desc)}</p></div>
      </div></button>`;
    }).join('')}</div></div>`;
}

const ICONS = {
  language: '<path d="M4 5h9M8.5 3v2m3 0c-1 4-4 7-7 8m2-4c1.5 2 3.5 3.5 6 4M13 21l4-10 4 10m-6.8-3h5.6" />',
  weather: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  currency: '<path d="M8 5h6a3 3 0 010 6H8V5zm0 6h7a3 3 0 010 6H8m0-12v14M6 9h8M6 13h8"/>',
  visa: '<rect x="4" y="3" width="16" height="18" rx="2"/><circle cx="12" cy="10" r="3"/><path d="M8 17h8"/>',
  time: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  emergency: '<path d="M12 3l9 16H3L12 3z"/><path d="M12 10v4M12 17v.5"/>',
};
const GUIDE_IMG = { language: 'script', currency: 'tugrik', weather: 'winter' };

function climateSvg() {
  const W = 560, H = 220, pad = 26, bw = (W - pad * 2) / 12;
  const max = 25, min = -25;
  const y = (v) => pad + ((max - v) / (max - min)) * (H - pad * 2);
  const months = state.t.guide.monthsShort;
  const bars = UB_CLIMATE.map((v, i) => {
    const x = pad + i * bw + bw * 0.18, w = bw * 0.64;
    const y0 = y(0), y1 = y(v);
    return `<rect class="${v >= 0 ? 'bar-pos' : 'bar-neg'} cbar" x="${x}" y="${Math.min(y0, y1)}" width="${w}" height="${Math.abs(y1 - y0)}" rx="5"/>
      <text x="${x + w / 2}" y="${v >= 0 ? y1 - 6 : y1 + 14}" text-anchor="middle">${v > 0 ? '+' : ''}${v}°</text>
      <text x="${x + w / 2}" y="${H - 4}" text-anchor="middle">${esc(months[i])}</text>`;
  }).join('');
  return `<svg class="climate" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none"><line class="zero" x1="${pad}" x2="${W - pad}" y1="${y(0)}" y2="${y(0)}"/>${bars}</svg>`;
}

function renderGuide() {
  const G = state.t.guide;
  $('#guide').innerHTML = `<div class="wrap">${head({ kicker: G.kicker, title: G.title })}
    <div class="guide-cards">${Object.entries(G.cards).map(([k, c]) => `<div class="g-card reveal">
        ${GUIDE_IMG[k] ? photo(GUIDE_IMG[k], { w: 960, alt: c.title }) : ''}
        <div class="ic"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICONS[k]}</svg></div>
        <h3>${esc(c.title)}</h3><p>${esc(c.body)}</p></div>`).join('')}</div>
    <div class="guide-row">
      <div class="chart-card reveal"><h3>${esc(G.climateTitle)}</h3>${climateSvg()}</div>
      <div class="phrase-card reveal"><h3>${esc(G.phrasesTitle)}</h3><table>${G.phrases.map((p) => `<tr><td>${esc(p[0])}</td><td>${esc(p[1])}</td><td>${esc(p[2])}</td></tr>`).join('')}</table></div>
    </div>
    <div class="tips-card reveal"><h3>${esc(G.tipsTitle)}</h3><ol>${G.tips.map((t) => `<li>${esc(t)}</li>`).join('')}</ol></div>
  </div>`;
}

function renderTours() {
  const T = state.t.tours;
  const f = T.filters;
  $('#tours').innerHTML = `<div class="wrap">${head(T)}
    <div class="tour-filters">${Object.keys(f).map((k) => `<button data-filter="${k}" class="${state.filter === k ? 'on' : ''}">${esc(f[k])}</button>`).join('')}</div>
    <div class="tour-grid">${PACKAGES.map((p) => {
      const L = T.list[p.id];
      const hidden = state.filter !== 'all' && p.tag !== state.filter;
      return `<article class="tour-card" data-tag="${p.tag}" ${hidden ? 'hidden' : ''}>
        ${photo(p.img, { w: 960, alt: L.name })}
        ${p.unit === 'person' ? `<span class="tc-days">${p.days} ${esc(p.days > 1 ? T.days : T.day)}</span>` : ''}
        <div class="tc-body"><h3>${esc(L.name)}</h3><p>${esc(L.desc)}</p>
          <ul class="tc-inc">${L.inc.map((i) => `<li>✓ ${esc(i)}</li>`).join('')}</ul>
          <div class="tc-foot"><div class="tc-price"><b>$${fmt(p.price)}</b><small>${esc(p.unit === 'day' ? T.perDay : T.perPerson)}</small><em>≈ ${fmt(p.price * MNT_PER_USD)}₮</em></div>
          <button class="add-btn" data-add="${p.id}">+ ${esc(T.add)}</button></div>
        </div></article>`;
    }).join('')}</div></div>`;
}

function renderCta() {
  const C = state.t.cta;
  $('#contact').innerHTML = `<div class="wrap"><div class="cta-box reveal">${photo('horses', { w: 1920 })}
    <h2>${esc(C.title)}</h2><p>${esc(C.lead)}</p>
    <a class="cta-phone" href="tel:${COMPANY.phoneHref}">${COMPANY.phone}</a>
    <div class="cta-btns"><a class="btn btn-gold magnetic" href="tel:${COMPANY.phoneHref}">${esc(C.call)} ${arrow}</a>
    <a class="btn btn-ghost magnetic" href="mailto:${COMPANY.email}">${esc(C.write)} · ${COMPANY.email}</a></div>
  </div></div>`;
}

function renderFooter() {
  const F = state.t.footer;
  const N = state.t.nav;
  const credits = Object.entries(IMAGES).map(([k, I]) =>
    `<li><a href="${commonsPage(k)}" target="_blank" rel="noopener">${esc(I.f)}</a> — ${esc(I.a)}, ${esc(I.l)}</li>`).join('');
  $('#footer').innerHTML = `<div class="wrap">
    <div class="foot-grid">
      <div><h4>${esc(F.company)}</h4><p>${esc(F.tagline)}</p><p>${esc(F.address)}</p>
        <a href="tel:${COMPANY.phoneHref}">☎ ${COMPANY.phone}</a><a href="mailto:${COMPANY.email}">✉ ${COMPANY.email}</a></div>
      <div><h4>${esc(N.menu)}</h4>${['ub', 'map', 'seasons', 'festivals', 'food', 'guide', 'tours'].map((k) => `<a href="#${k}">${esc(N[k])}</a>`).join('')}</div>
      <div><h4>${esc(state.t.nav.tours)}</h4>${PACKAGES.slice(0, 7).map((p) => `<a href="#tours">${esc(state.t.tours.list[p.id].name)}</a>`).join('')}</div>
    </div>
    <p class="disclaimer">${esc(F.disclaimer)}</p>
    <details class="credits"><summary>${esc(F.credits)} (${Object.keys(IMAGES).length})</summary>
      <p>${esc(F.creditsLead)} Map boundaries: <a href="https://www.geoboundaries.org" target="_blank" rel="noopener">geoBoundaries</a> (CC BY 4.0). Fonts: Google Fonts (OFL).</p>
      <ol>${credits}</ol></details>
    <div class="foot-bottom"><span>${esc(F.rights)}</span><button class="to-top">↑ ${esc(F.top)}</button></div>
  </div>`;
}

function renderAll() {
  renderStatic();
  renderHero();
  renderStats();
  renderUB();
  renderMapSection();
  renderAimagGrid();
  renderSeasons();
  renderFestivals();
  renderFood();
  renderGuide();
  renderTours();
  renderCta();
  renderFooter();
  wireImages();
  if (state.selectedAimag) showAimag(state.selectedAimag, false);
  setupMotion();
  mountMap();
}

/* ---------------- 3D: hero ---------------- */
let hero = null;
function webglOk() {
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; }
}
async function mountHero() {
  const canvas = $('#hero-canvas');
  if (!webglOk()) {
    $('.hero').style.background = `center/cover url(${imgUrl('umnugovi', 1920)})`;
    return;
  }
  const { initHero } = await import('./three/hero.js');
  hero = initHero(canvas, { season: state.season, lowPower });
  const io = new IntersectionObserver(([e]) => hero.setRunning(e.isIntersecting), { threshold: 0 });
  io.observe($('.hero'));
}

function setSeason(id) {
  state.season = id;
  hero?.setSeason(id);
  $$('.season-switch button').forEach((b) => b.setAttribute('aria-pressed', b.dataset.season === id));
  $$('.season-panel').forEach((p) => p.classList.toggle('active', p.dataset.season === id));
}

/* ---------------- 3D: map ---------------- */
let map = null, mapMounted = false;
function mountMap() {
  const stage = $('.map-stage');
  if (!stage) return;
  if (map) { map.dispose(); map = null; }
  mapMounted = false;
  if (!webglOk()) { stage.insertAdjacentHTML('beforeend', `<div class="map-fallback">${esc(state.t.map.hint)} ↓</div>`); return; }
  const io = new IntersectionObserver(async ([e]) => {
    if (!e.isIntersecting) { map?.setRunning(false); return; }
    if (!mapMounted) {
      mapMounted = true;
      const { initMap } = await import('./three/map.js');
      if (!document.body.contains(stage)) return;
      map = initMap(stage, {
        lowPower,
        onSelect: (id) => showAimag(id, false),
        onHover: (id, ev) => {
          const tip = $('.map-tip');
          if (!tip) return;
          if (!id || !ev) { tip.style.opacity = 0; return; }
          const r = stage.getBoundingClientRect();
          const name = id === 'ub' ? state.t.ub.places.sukhbaatar_sq.name.split(' ')[0] && 'Улаанбаатар' : state.t.aimags[id]?.name;
          const km = AIMAGS[id]?.km;
          tip.innerHTML = id === 'ub' ? `<b>UB</b> · ${esc(state.t.nav.ub)}` : `${esc(name)} · <b>${fmt(km)} km</b>`;
          tip.style.left = `${ev.clientX - r.left}px`;
          tip.style.top = `${ev.clientY - r.top}px`;
          tip.style.opacity = 1;
        },
      });
      if (state.mapRegion) map.setFilter(state.mapRegion);
      if (state.selectedAimag) map.select(state.selectedAimag);
    }
    map?.setRunning(true);
  }, { rootMargin: '200px' });
  io.observe(stage);
}

function showAimag(id, fromList) {
  const panel = $('.map-panel');
  if (!panel) return;
  if (id === 'ub') {
    document.querySelector('#ub')?.scrollIntoView({ behavior: 'smooth' });
    return;
  }
  state.selectedAimag = id;
  panel.innerHTML = mapPanelHtml(id);
  panel.classList.add('open');
  wireImages(panel);
  const L = state.t.aimags[id];
  map?.setLabel?.(L ? `<b>${esc(L.name)}</b> ${fmt(AIMAGS[id].km)} km` : '');
  if (fromList) {
    map?.select(id);
    scrollToEl($('#map'));
  }
  $('.map-hint')?.style.setProperty('opacity', '0');
}

/* ---------------- Motion ---------------- */
let lenis = null;
let triggers = [];
function scrollToEl(el) {
  if (!el) return;
  if (lenis) lenis.scrollTo(el, { offset: -70, duration: 1.4 });
  else el.scrollIntoView({ behavior: 'smooth' });
}

function splitTitles() {
  $$('.title.split').forEach((el) => {
    if (el.dataset.done) return;
    el.dataset.done = '1';
    const text = el.textContent;
    const hasSpaces = /\s/.test(text.trim());
    const parts = hasSpaces ? text.split(/(\s+)/) : [...text];
    el.innerHTML = parts.map((w) => (/^\s+$/.test(w) ? w : `<span class="split-line" style="display:inline-block"><span>${esc(w)}</span></span>`)).join('');
  });
}

function setupMotion() {
  triggers.forEach((t) => t.kill());
  triggers = [];
  splitTitles();
  if (reduced) {
    $$('.reveal').forEach((el) => { el.style.opacity = 1; el.style.transform = 'none'; });
    $$('[data-count]').forEach((el) => { el.textContent = fmt(+el.dataset.count) + el.dataset.suffix; });
    return;
  }
  // generic reveals
  ScrollTrigger.batch('.reveal', {
    start: 'top 88%',
    onEnter: (els) => gsap.to(els, { opacity: 1, y: 0, duration: 1, ease: 'power3.out', stagger: 0.08, overwrite: true }),
  });
  $$('.title.split').forEach((el) => {
    const spans = $$('.split-line > span', el);
    gsap.set(spans, { yPercent: 110 });
    triggers.push(ScrollTrigger.create({
      trigger: el, start: 'top 90%', once: true,
      onEnter: () => gsap.to(spans, { yPercent: 0, duration: 1.1, ease: 'expo.out', stagger: 0.04 }),
    }));
  });
  // counters
  $$('[data-count]').forEach((el) => {
    const end = +el.dataset.count;
    const o = { v: 0 };
    triggers.push(ScrollTrigger.create({
      trigger: el, start: 'top 90%', once: true,
      onEnter: () => gsap.to(o, { v: end, duration: 2.2, ease: 'power2.out', onUpdate: () => { el.textContent = fmt(o.v) + el.dataset.suffix; } }),
    }));
  });
  // parallax photos in big panels
  $$('.season-panel .ph img, .cta-box .ph img, .fest-card .ph img').forEach((img) => {
    triggers.push(gsap.fromTo(img, { yPercent: -6, scale: 1.12 }, { yPercent: 6, ease: 'none', scrollTrigger: { trigger: img.closest('.ph'), scrub: true } }).scrollTrigger);
  });
  // UB horizontal pinned scroll (desktop)
  const track = $('.ub-track');
  if (track && innerWidth > 820) {
    const dist = () => Math.max(0, track.scrollWidth - innerWidth);
    const tw = gsap.to(track, {
      x: () => -dist(), ease: 'none',
      scrollTrigger: { trigger: '#ub', start: 'top top', end: () => `+=${dist()}`, pin: true, scrub: 0.8, invalidateOnRefresh: true, anticipatePin: 1 },
    });
    triggers.push(tw.scrollTrigger);
    $$('.ub-card').forEach((card) => {
      gsap.fromTo(card.querySelector('img'), { xPercent: -8 }, { xPercent: 8, ease: 'none', scrollTrigger: { trigger: card, containerAnimation: tw, start: 'left right', end: 'right left', scrub: true } });
    });
  }
  // hero title
  const chs = $$('.hero-title .ch');
  gsap.fromTo(chs, { yPercent: 120, rotate: 8, opacity: 0 }, { yPercent: 0, rotate: 0, opacity: 1, duration: 1.4, ease: 'expo.out', stagger: 0.05, delay: document.body.classList.contains('is-loading') ? 1.0 : 0.1 });
  gsap.fromTo('.hero-sub, .hero-lead, .hero-ctas, .hero-kicker', { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 1.2, ease: 'power3.out', stagger: 0.1, delay: document.body.classList.contains('is-loading') ? 1.4 : 0.3 });
  triggers.push(ScrollTrigger.create({
    trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true,
    onUpdate: (s) => {
      hero?.setProgress(s.progress);
      gsap.set('.hero-inner', { y: -s.progress * 120, opacity: 1 - s.progress * 1.4 });
    },
  }));
  // climate bars grow
  const bars = $$('.cbar');
  if (bars.length) {
    gsap.set(bars, { scaleY: 0, transformOrigin: '50% 50%' });
    triggers.push(ScrollTrigger.create({ trigger: '.climate', start: 'top 85%', once: true, onEnter: () => gsap.to(bars, { scaleY: 1, duration: 1, ease: 'back.out(1.6)', stagger: 0.05 }) }));
  }
  ScrollTrigger.refresh();
}

function setupGlobalMotion() {
  if (!reduced) {
    lenis = new Lenis({ duration: 1.15, smoothWheel: true });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((time) => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);
  }
  // header
  let lastY = 0;
  const header = $('.site-header');
  const onScroll = () => {
    const y = window.scrollY;
    header.classList.toggle('scrolled', y > 40);
    header.classList.toggle('hide', y > lastY && y > 500 && !$('.mobile-menu').classList.contains('open'));
    lastY = y;
    const ids = ['ub', 'map', 'seasons', 'festivals', 'food', 'guide', 'tours'];
    let cur = '';
    for (const id of ids) { const el = document.getElementById(id); if (el && el.getBoundingClientRect().top < innerHeight * 0.4) cur = id; }
    $$('.main-nav a').forEach((a) => a.classList.toggle('active', a.getAttribute('href') === `#${cur}`));
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // cursor
  if (!coarse && !reduced) {
    const cur = $('.cursor');
    let x = innerWidth / 2, y = innerHeight / 2, cx = x, cy = y;
    window.addEventListener('pointermove', (e) => { x = e.clientX; y = e.clientY; cur.classList.add('on'); }, { passive: true });
    gsap.ticker.add(() => { cx += (x - cx) * 0.2; cy += (y - cy) * 0.2; cur.style.transform = `translate(${cx}px, ${cy}px)`; });
    document.addEventListener('pointerover', (e) => cur.classList.toggle('big', !!e.target.closest('a, button, .season-panel, .food-card, [role="button"]')));
  }
  // magnetic buttons
  document.addEventListener('pointermove', (e) => {
    if (coarse || reduced) return;
    const b = e.target.closest('.magnetic');
    $$('.magnetic').forEach((m) => { if (m !== b) m.style.transform = ''; });
    if (!b) return;
    const r = b.getBoundingClientRect();
    b.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * 0.18}px, ${(e.clientY - r.top - r.height / 2) * 0.25}px)`;
  });
}

/* ---------------- Events ---------------- */
let cart;
function flyToCart(fromEl) {
  const img = fromEl.closest('.tour-card')?.querySelector('img');
  const target = $('.cart-btn').getBoundingClientRect();
  if (!img || reduced) return;
  const r = img.getBoundingClientRect();
  const f = document.createElement('img');
  f.src = img.currentSrc || img.src;
  f.className = 'fly-img';
  document.body.appendChild(f);
  gsap.fromTo(f, { left: r.left + r.width / 2 - 35, top: r.top + r.height / 2 - 35, scale: 1.4, opacity: 1 },
    { left: target.left + target.width / 2 - 35, top: target.top + target.height / 2 - 35, scale: 0.2, opacity: 0.6, duration: 0.9, ease: 'power2.in', onComplete: () => f.remove() });
}

function bindEvents() {
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (a) {
      const id = a.getAttribute('href').slice(1);
      const el = id === 'top' ? document.body : document.getElementById(id);
      if (el) { e.preventDefault(); closeMenu(); id === 'top' ? (lenis ? lenis.scrollTo(0) : scrollTo({ top: 0, behavior: 'smooth' })) : scrollToEl(el); }
      return;
    }
    const s = e.target.closest('[data-season]');
    if (s) { setSeason(s.dataset.season); return; }
    const reg = e.target.closest('.map-legend button');
    if (reg) {
      state.mapRegion = reg.dataset.region || null;
      $$('.map-legend button').forEach((b) => b.classList.toggle('on', b === reg));
      map?.setFilter(state.mapRegion);
      return;
    }
    if (e.target.closest('.mp-close')) { $('.map-panel').classList.remove('open'); state.selectedAimag = null; map?.select(null); map?.setLabel(''); return; }
    const card = e.target.closest('[data-aimag]');
    if (card) { showAimag(card.dataset.aimag, true); return; }
    const dot = e.target.closest('[data-fest]');
    if (dot) {
      const c = document.getElementById(`fest-${dot.dataset.fest}`);
      $$('.fest-card').forEach((x) => x.classList.toggle('hl', x === c));
      scrollToEl(c);
      return;
    }
    const food = e.target.closest('.food-card');
    if (food && coarse) { food.classList.toggle('flipped'); return; }
    const filt = e.target.closest('[data-filter]');
    if (filt) {
      state.filter = filt.dataset.filter;
      $$('[data-filter]').forEach((b) => b.classList.toggle('on', b === filt));
      $$('.tour-card').forEach((c) => { c.hidden = state.filter !== 'all' && c.dataset.tag !== state.filter; });
      ScrollTrigger.refresh();
      return;
    }
    const add = e.target.closest('[data-add]');
    if (add) {
      cart.add(add.dataset.add);
      flyToCart(add);
      add.classList.add('done');
      const old = add.innerHTML;
      add.textContent = `✓ ${state.t.tours.added}`;
      setTimeout(() => { add.classList.remove('done'); add.innerHTML = old; }, 1400);
      return;
    }
    if (e.target.closest('.cart-btn')) { cart.open(); return; }
    if (e.target.closest('.to-top')) { lenis ? lenis.scrollTo(0) : scrollTo({ top: 0, behavior: 'smooth' }); }
  });
  document.addEventListener('keydown', (e) => {
    if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('[role="button"]')) { e.preventDefault(); e.target.click(); }
  });
  const mb = $('.menu-btn');
  mb.addEventListener('click', () => {
    const open = !$('.mobile-menu').classList.contains('open');
    $('.mobile-menu').classList.toggle('open', open);
    $('.mobile-menu').setAttribute('aria-hidden', !open);
    mb.setAttribute('aria-expanded', open);
  });
  let rt;
  window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => ScrollTrigger.refresh(), 250); });
}
function closeMenu() {
  $('.mobile-menu').classList.remove('open');
  $('.menu-btn').setAttribute('aria-expanded', 'false');
}

/* ---------------- Boot ---------------- */
async function boot() {
  buildLangMenu();
  cart = createCart({ drawer: $('.cart-drawer'), countEl: $('.cart-count'), getT: () => state.t, fmt: (n) => fmt(n) });
  bindEvents();
  setupGlobalMotion();
  const bar = $('.loader-bar span');
  bar.style.width = '35%';
  await setLang(pickInitialLang(), { first: true });
  bar.style.width = '70%';
  await mountHero();
  bar.style.width = '100%';
  setTimeout(() => {
    $('#loader').classList.add('done');
    document.body.classList.remove('is-loading');
    ScrollTrigger.refresh();
  }, 500);
}
boot();
