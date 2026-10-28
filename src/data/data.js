// Language-independent data: numbers, coordinates, image keys, prices.
// All visible text lives in src/i18n/<lang>.js and is keyed by the ids below.

export const LANGS = [
  { code: 'mn', label: 'Монгол', short: 'MN' },
  { code: 'en', label: 'English', short: 'EN' },
  { code: 'ko', label: '한국어', short: 'KO' },
  { code: 'ja', label: '日本語', short: 'JA' },
  { code: 'zh', label: '中文', short: 'ZH' },
  { code: 'tr', label: 'Türkçe', short: 'TR' },
  { code: 'ru', label: 'Русский', short: 'RU' },
];

export const UB_CENTER = { lat: 47.9187, lon: 106.9177 };

// Ulaanbaatar highlights. km = distance from Sükhbaatar Square (approx.)
export const UB_PLACES = [
  { id: 'sukhbaatar_sq', img: 'sukhbaatar_sq', km: 0 },
  { id: 'bogd_palace', img: 'bogd_palace', km: 3 },
  { id: 'zaisan', img: 'zaisan', km: 5 },
  { id: 'gandan', img: 'gandan', km: 2 },
  { id: 'nat_park', img: 'nat_park', km: 1.5 },
  { id: 'nat_museum', img: 'nat_museum', km: 0.3 },
  { id: 'chinggis', img: 'chinggis', km: 54 },
];

export const REGIONS = [
  { id: 'khangai', color: '#3fae6b', aimags: ['arkhangai', 'uvurkhangai', 'khuvsgul', 'bulgan', 'bayankhongor'] },
  { id: 'west', color: '#4f8cff', aimags: ['bayanulgii', 'uvs', 'khovd', 'zavkhan', 'govialtai'] },
  { id: 'central', color: '#f2b33d', aimags: ['tuv', 'selenge', 'darkhan', 'orkhon'] },
  { id: 'gobi', color: '#e8743b', aimags: ['umnugovi', 'dornogovi', 'dundgovi', 'govisumber'] },
  { id: 'east', color: '#c94a8a', aimags: ['khentii', 'dornod', 'sukhbaatar'] },
];

// km: approximate road distance from Ulaanbaatar to the aimag centre.
// area: km². lat/lon: aimag centre.
export const AIMAGS = {
  arkhangai: { km: 468, area: 55313, lat: 47.475, lon: 101.454, img: 'arkhangai' },
  uvurkhangai: { km: 430, area: 62895, lat: 46.263, lon: 102.775, img: 'uvurkhangai', extra: ['orkhon_fall', 'tuvkhun', 'karakorum'] },
  khuvsgul: { km: 671, area: 100629, lat: 49.634, lon: 100.163, img: 'khuvsgul', extra: ['reindeer'] },
  bulgan: { km: 318, area: 48733, lat: 48.812, lon: 103.535, img: 'bulgan', extra: ['elsen'] },
  bayankhongor: { km: 630, area: 115978, lat: 46.194, lon: 100.718, img: 'bayankhongor' },
  bayanulgii: { km: 1636, area: 45705, lat: 48.968, lon: 89.962, img: 'bayanulgii', extra: ['eagle', 'eagle_hunter'] },
  uvs: { km: 1336, area: 69585, lat: 49.981, lon: 92.067, img: 'uvs' },
  khovd: { km: 1425, area: 76060, lat: 48.006, lon: 91.642, img: 'khovd' },
  zavkhan: { km: 984, area: 82456, lat: 47.742, lon: 96.844, img: 'zavkhan' },
  govialtai: { km: 1001, area: 141448, lat: 46.372, lon: 96.258, img: 'govialtai' },
  tuv: { km: 43, area: 74042, lat: 47.707, lon: 106.953, img: 'tuv', extra: ['chinggis', 'takhi', 'manzushir'] },
  selenge: { km: 311, area: 41153, lat: 50.232, lon: 106.208, img: 'selenge' },
  darkhan: { km: 219, area: 3275, lat: 49.487, lon: 105.923, img: 'darkhan' },
  orkhon: { km: 371, area: 844, lat: 49.028, lon: 104.044, img: 'orkhon' },
  umnugovi: { km: 553, area: 165380, lat: 43.570, lon: 104.425, img: 'umnugovi', extra: ['yolyn', 'bayanzag', 'camel'] },
  dornogovi: { km: 463, area: 109472, lat: 44.892, lon: 110.140, img: 'dornogovi' },
  dundgovi: { km: 260, area: 74690, lat: 45.763, lon: 106.271, img: 'dundgovi' },
  govisumber: { km: 230, area: 5542, lat: 46.361, lon: 108.361, img: 'govisumber' },
  khentii: { km: 331, area: 80325, lat: 47.317, lon: 110.656, img: 'khentii' },
  dornod: { km: 655, area: 123597, lat: 48.067, lon: 114.536, img: 'dornod' },
  sukhbaatar: { km: 560, area: 82287, lat: 46.681, lon: 113.280, img: 'sukhbaatar' },
};

export const SEASONS = [
  { id: 'spring', img: 'spring', months: '3–5', temp: '−5…+15°C', palette: ['#c9d48a', '#8fae5a', '#e9c9d6'] },
  { id: 'summer', img: 'summer', months: '6–8', temp: '+15…+30°C', palette: ['#4caf50', '#2e7d32', '#9fd3ff'] },
  { id: 'autumn', img: 'autumn', months: '9–11', temp: '−10…+15°C', palette: ['#e0a338', '#b5651d', '#f4d58d'] },
  { id: 'winter', img: 'winter', months: '12–2', temp: '−35…−10°C', palette: ['#e8f1ff', '#a9c4e8', '#ffffff'] },
];

// month: 1–12 used to place festivals on the year ring
export const FESTIVALS = [
  { id: 'tsagaan_sar', img: 'tsagaan_sar', month: 2 },
  { id: 'ice', img: 'ice', month: 3 },
  { id: 'camel', img: 'camel', month: 3 },
  { id: 'nauryz', img: 'eagle_hunter', month: 3 },
  { id: 'naadam', img: 'naadam', month: 7 },
  { id: 'danshig', img: 'gandan2', month: 8 },
  { id: 'eagle', img: 'eagle', month: 10 },
];

export const FOODS = [
  { id: 'buuz', img: 'buuz' },
  { id: 'khuushuur', img: 'khuushuur' },
  { id: 'khorkhog', img: 'khorkhog' },
  { id: 'tsuivan', img: 'tsuivan' },
  { id: 'bansh', img: 'bansh' },
  { id: 'suutei', img: 'suutei' },
  { id: 'airag', img: 'airag' },
  { id: 'aaruul', img: 'aaruul' },
];

// Approximate monthly mean temperature in Ulaanbaatar, °C
export const UB_CLIMATE = [-21, -16, -7, 2, 10, 16, 18, 16, 9, 0, -11, -19];

// Packages. price in USD per person (or per day where unit = 'day').
export const PACKAGES = [
  { id: 'city', img: 'ub_sky', price: 79, days: 1, unit: 'person', tag: 'ub' },
  { id: 'terelj', img: 'tuv', price: 129, days: 1, unit: 'person', tag: 'ub' },
  { id: 'car', img: 'horses', price: 160, days: 1, unit: 'day', tag: 'service' },
  { id: 'interpreter', img: 'morinkhuur', price: 80, days: 1, unit: 'day', tag: 'service' },
  { id: 'central', img: 'uvurkhangai', price: 890, days: 5, unit: 'person', tag: 'tour' },
  { id: 'gobi', img: 'umnugovi', price: 1190, days: 6, unit: 'person', tag: 'tour' },
  { id: 'khuvsgul', img: 'khuvsgul', price: 1290, days: 7, unit: 'person', tag: 'tour' },
  { id: 'naadam', img: 'naadam_open', price: 790, days: 4, unit: 'person', tag: 'festival' },
  { id: 'eagle', img: 'eagle', price: 1590, days: 7, unit: 'person', tag: 'festival' },
  { id: 'winter', img: 'ice', price: 1390, days: 6, unit: 'person', tag: 'festival' },
  { id: 'altai', img: 'bayanulgii', price: 2490, days: 12, unit: 'person', tag: 'tour' },
  { id: 'grand', img: 'gobi', price: 3290, days: 16, unit: 'person', tag: 'tour' },
];

export const MNT_PER_USD = 3500; // approximate, for display only

export const COMPANY = {
  phone: '+976 7000-1206',
  phoneHref: '+97670001206',
  email: 'hello@sorkhugtani-travel.mn',
};
