import { IMAGES } from './data/images.js';

const UPLOAD = 'https://upload.wikimedia.org/wikipedia/commons';
const THUMB = 'https://thumb.wikimedia.org/wikipedia/commons/thumb';

export function esc(s = '') {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// Wikimedia serves thumbnails at standard widths; never request one wider than the original.
export function imgUrl(key, w = 960) {
  const I = IMAGES[key];
  if (!I) return '';
  if (I.w <= w) return `${UPLOAD}/${I.p}`;
  const name = I.p.split('/').pop();
  return `${THUMB}/${I.p}/${w}px-${name}`;
}

export function commonsPage(key) {
  const I = IMAGES[key];
  if (!I) return '#';
  return `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(I.f.replace(/ /g, '_'))}`;
}

export function creditHtml(key) {
  const I = IMAGES[key];
  if (!I) return '';
  return `<a class="credit" href="${commonsPage(key)}" target="_blank" rel="noopener" title="${esc(I.f)}">© ${esc(I.a)} · ${esc(I.l)} · Wikimedia Commons</a>`;
}

// <div class="ph"> with lazy image + credit overlay
export function photo(key, { w = 960, alt = '', eager = false, cls = '' } = {}) {
  if (!IMAGES[key]) return `<div class="ph ${cls}"></div>`;
  return `<div class="ph ${cls}"><img src="${imgUrl(key, w)}" alt="${esc(alt)}" ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async" data-key="${key}" />${creditHtml(key)}</div>`;
}

// Fade images in once loaded; fall back to the upload host if the thumb host fails.
export function wireImages(root = document) {
  root.querySelectorAll('.ph img:not([data-wired])').forEach((img) => {
    img.dataset.wired = '1';
    const done = () => img.classList.add('loaded');
    if (img.complete && img.naturalWidth) done();
    img.addEventListener('load', done);
    img.addEventListener('error', () => {
      if (img.src.startsWith(THUMB) && !img.dataset.retry) {
        img.dataset.retry = '1';
        img.src = img.src.replace('https://thumb.wikimedia.org', 'https://upload.wikimedia.org');
      }
    });
  });
}

export const fmtNum = (lang) => (n) => new Intl.NumberFormat(lang === 'mn' ? 'mn-MN' : lang).format(Math.round(n));
