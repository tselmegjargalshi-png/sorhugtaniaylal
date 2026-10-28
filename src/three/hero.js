import * as THREE from 'three';
import { seasonForDate } from './season.js';
export { seasonForDate };
import { createNoise2D, fbm, ridged } from './noise.js';

// Season looks for the 3D steppe scene.
const LOOKS = {
  spring: {
    top: '#3f7fe0', horizon: '#dbe9ff', sun: '#fff1d6', fog: '#d4e3fb',
    grass: ['#9fb35f', '#b7c27a', '#8aa553'], rock: '#7b7264', snow: '#f4f6fa', bank: '#c9b98d',
    hemiSky: '#cfe2ff', hemiGround: '#6f7a4a', sunInt: 2.2, sunPos: [60, 50, -40],
    particles: { color: '#ffd9e8', size: 0.32, fall: 0.5, sway: 1.2, count: 900 },
  },
  summer: {
    top: '#2c68dc', horizon: '#bfe0ff', sun: '#fff6e0', fog: '#c6ddfa',
    grass: ['#4f9a38', '#6fb146', '#3f8a32'], rock: '#6d665a', snow: '#f4f6fa', bank: '#b8b07a',
    hemiSky: '#cde4ff', hemiGround: '#3e5a2a', sunInt: 2.5, sunPos: [50, 70, -30],
    particles: { color: '#fff2a8', size: 0.18, fall: -0.15, sway: 0.6, count: 600 },
  },
  autumn: {
    top: '#3459c4', horizon: '#ffd09a', sun: '#ffb45c', fog: '#f1c896',
    grass: ['#c99a3e', '#d9b25a', '#a97c34'], rock: '#6b5545', snow: '#f7f1e8', bank: '#b98e52',
    hemiSky: '#ffd9a8', hemiGround: '#5a4024', sunInt: 2.6, sunPos: [80, 18, -60],
    particles: { color: '#f2a23d', size: 0.36, fall: 0.8, sway: 1.8, count: 700 },
  },
  winter: {
    top: '#5a7fc8', horizon: '#e7eef9', sun: '#fff8ee', fog: '#e3eaf6',
    grass: ['#eef3fb', '#f7f9fd', '#dfe7f4'], rock: '#8a93a6', snow: '#ffffff', bank: '#cfd9ea',
    hemiSky: '#e8f0ff', hemiGround: '#9aa6bd', sunInt: 1.9, sunPos: [70, 30, -50],
    particles: { color: '#ffffff', size: 0.28, fall: 2.2, sway: 0.8, count: 1600 },
  },
};


function feltTexture(kind) {
  const c = document.createElement('canvas');
  c.width = 1024; c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#f2eee4';
  g.fillRect(0, 0, c.width, c.height);
  // subtle felt noise
  for (let i = 0; i < 4000; i++) {
    g.fillStyle = `rgba(120,100,70,${Math.random() * 0.05})`;
    g.fillRect(Math.random() * 1024, Math.random() * 256, 2, 2);
  }
  if (kind === 'wall') {
    // ornamental band (alkhan khee meander) near top
    g.fillStyle = '#1f4f9e';
    g.fillRect(0, 26, 1024, 34);
    g.strokeStyle = '#f2eee4'; g.lineWidth = 4;
    for (let x = 0; x < 1024; x += 32) {
      g.beginPath();
      g.moveTo(x + 4, 54); g.lineTo(x + 4, 32); g.lineTo(x + 24, 32); g.lineTo(x + 24, 46); g.lineTo(x + 14, 46); g.lineTo(x + 14, 40);
      g.stroke();
    }
    g.fillStyle = '#c0392b';
    g.fillRect(0, 62, 1024, 5);
    // ropes
    g.fillStyle = 'rgba(90,70,50,.55)';
    g.fillRect(0, 140, 1024, 4);
    g.fillRect(0, 210, 1024, 4);
  } else {
    // roof: radial poles hint + edge band
    g.fillStyle = 'rgba(150,120,90,.18)';
    for (let x = 0; x < 1024; x += 24) g.fillRect(x, 0, 2, 256);
    g.fillStyle = '#1f4f9e';
    g.fillRect(0, 226, 1024, 18);
    g.fillStyle = '#c0392b';
    g.fillRect(0, 222, 1024, 4);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = THREE.RepeatWrapping;
  t.anisotropy = 4;
  return t;
}

function doorTexture() {
  const c = document.createElement('canvas');
  c.width = 128; c.height = 192;
  const g = c.getContext('2d');
  g.fillStyle = '#c9461f'; g.fillRect(0, 0, 128, 192);
  g.strokeStyle = '#f2b33d'; g.lineWidth = 6; g.strokeRect(10, 10, 108, 172);
  g.lineWidth = 3;
  g.beginPath(); g.moveTo(64, 30); g.lineTo(64, 162); g.stroke();
  // simple ulzii knot diamond
  g.beginPath(); g.moveTo(64, 60); g.lineTo(90, 96); g.lineTo(64, 132); g.lineTo(38, 96); g.closePath(); g.stroke();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function makeGer(scale = 1, wallTex, roofTex, doorTex) {
  const grp = new THREE.Group();
  const felt = new THREE.MeshStandardMaterial({ map: wallTex, roughness: 0.95, side: THREE.DoubleSide });
  const roofMat = new THREE.MeshStandardMaterial({ map: roofTex, roughness: 0.95, side: THREE.DoubleSide });
  const wall = new THREE.Mesh(new THREE.CylinderGeometry(3, 3.05, 2, 48, 1, true), felt);
  wall.position.y = 1;
  const roof = new THREE.Mesh(new THREE.ConeGeometry(3.25, 1.5, 48, 1, true), roofMat);
  roof.position.y = 2.72;
  const roofFlip = roof.geometry; // UV v goes bottom->top; texture band sits near the eave
  roofFlip.rotateY(Math.PI / 48);
  const crown = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.09, 8, 24), new THREE.MeshStandardMaterial({ color: '#c9461f', roughness: 0.6 }));
  crown.rotation.x = Math.PI / 2;
  crown.position.y = 3.42;
  const cap = new THREE.Mesh(new THREE.CircleGeometry(0.42, 24), new THREE.MeshStandardMaterial({ color: '#2b2b2b', roughness: 1 }));
  cap.rotation.x = -Math.PI / 2; cap.position.y = 3.43;
  const door = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 1.45), new THREE.MeshStandardMaterial({ map: doorTex, roughness: 0.7 }));
  door.position.set(0, 0.74, 3.07);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 3.3, 0.12, 48), new THREE.MeshStandardMaterial({ color: '#8a7a64', roughness: 1 }));
  base.position.y = 0.04;
  const chimney = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.1, 8), new THREE.MeshStandardMaterial({ color: '#3a3a3a', metalness: 0.4, roughness: 0.5 }));
  chimney.position.set(0.15, 3.7, 0.1);
  [wall, roof, crown, door, base, chimney].forEach((m) => { m.castShadow = true; m.receiveShadow = true; grp.add(m); });
  grp.scale.setScalar(scale);
  grp.userData.chimneyTop = new THREE.Vector3(0.15, 4.3, 0.1).multiplyScalar(scale);
  return grp;
}

function makeOvoo() {
  const grp = new THREE.Group();
  const stones = new THREE.Mesh(new THREE.ConeGeometry(1.4, 1.6, 9, 3), new THREE.MeshStandardMaterial({ color: '#7d7a72', flatShading: true, roughness: 1 }));
  const pos = stones.geometry.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    if (y < 0.75) { pos.setX(i, pos.getX(i) * (0.9 + Math.random() * 0.25)); pos.setZ(i, pos.getZ(i) * (0.9 + Math.random() * 0.25)); }
  }
  stones.geometry.computeVertexNormals();
  stones.position.y = 0.7;
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 3.6, 6), new THREE.MeshStandardMaterial({ color: '#6b4a2b' }));
  pole.position.y = 2.2;
  const clothGeo = new THREE.PlaneGeometry(1.4, 0.32, 12, 1);
  clothGeo.translate(0.7, 0, 0);
  const cloth = new THREE.Mesh(clothGeo, new THREE.MeshStandardMaterial({ color: '#3a7bff', side: THREE.DoubleSide, roughness: 0.8 }));
  cloth.position.y = 3.6;
  grp.add(stones, pole, cloth);
  grp.userData.cloth = cloth;
  grp.traverse((m) => { if (m.isMesh) { m.castShadow = true; } });
  return grp;
}

function makeBird() {
  const geo = new THREE.BufferGeometry();
  const v = new Float32Array([
    0, 0, 0.35, 0, 0, -0.35, -1.6, 0, 0.1,
    0, 0, 0.35, 1.6, 0, 0.1, 0, 0, -0.35,
  ]);
  geo.setAttribute('position', new THREE.BufferAttribute(v, 3));
  geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: '#2a1e14', side: THREE.DoubleSide }));
  return m;
}

function softSprite(color = '#ffffff', size = 64, hard = 0.0) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grd.addColorStop(0, color);
  grd.addColorStop(hard, color);
  grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, size, size);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function cloudTexture() {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 128;
  const g = c.getContext('2d');
  for (let i = 0; i < 14; i++) {
    const x = 72 + Math.random() * 112, y = 56 + Math.random() * 18, r = 18 + Math.random() * 24;
    const grd = g.createRadialGradient(x, y, 0, x, y, r);
    grd.addColorStop(0, 'rgba(255,255,255,0.85)');
    grd.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grd;
    g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function initHero(canvas, { season = seasonForDate(), lowPower = false } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !lowPower, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, lowPower ? 1.25 : 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = !lowPower;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 1200);
  const look = LOOKS[season];

  scene.fog = new THREE.Fog(look.fog, 60, 330);

  // --- Sky dome
  const skyU = {
    top: { value: new THREE.Color(look.top) },
    horizon: { value: new THREE.Color(look.horizon) },
    sunColor: { value: new THREE.Color(look.sun) },
    sunDir: { value: new THREE.Vector3(...look.sunPos).normalize() },
  };
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(600, 32, 16),
    new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, fog: false, uniforms: skyU,
      vertexShader: `varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: `uniform vec3 top; uniform vec3 horizon; uniform vec3 sunColor; uniform vec3 sunDir; varying vec3 vP;
        void main(){ float h = max(vP.y, 0.0); vec3 col = mix(horizon, top, pow(h, 0.55));
          float s = max(dot(normalize(vP), normalize(sunDir)), 0.0);
          col += sunColor * (pow(s, 600.0) * 2.0 + pow(s, 12.0) * 0.35);
          col = mix(col, horizon, smoothstep(0.0, -0.2, vP.y));
          gl_FragColor = vec4(col, 1.0); }`,
    }),
  );
  scene.add(sky);

  // --- Lights
  const hemi = new THREE.HemisphereLight(look.hemiSky, look.hemiGround, 1.1);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(look.sun, look.sunInt);
  sun.position.set(...look.sunPos);
  sun.castShadow = !lowPower;
  sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -30, right: 30, top: 30, bottom: -30, near: 1, far: 260 });
  sun.shadow.bias = -0.0008;
  sun.target.position.set(0, 0, 10);
  scene.add(sun, sun.target);

  // --- Terrain
  const noise = createNoise2D(7);
  const size = 520, seg = lowPower ? 140 : 230;
  const geo = new THREE.PlaneGeometry(size, size, seg, seg);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  const riverX = (z) => 14 * Math.sin(z * 0.028) + 6 * Math.sin(z * 0.071 + 1.3) - 4;
  const heightAt = (x, z) => {
    let h = fbm(noise, x * 0.012, z * 0.012, 4) * 2.4 + 2.8;
    h += fbm(noise, x * 0.05, z * 0.05, 3) * 0.5;
    const far = THREE.MathUtils.smoothstep(-z, 25, 170);
    const side = THREE.MathUtils.smoothstep(Math.abs(x), 60, 200);
    const mt = Math.max(far, side * 0.8);
    h += (ridged(noise, x * 0.007 + 3.1, z * 0.007 - 1.7, 3) * 48 + (fbm(noise, x * 0.006 - 4, z * 0.006 + 2, 3) + 1) * 14) * mt;
    // flatten area around gers
    const dGer = Math.hypot(x + 4, z - 134);
    h = THREE.MathUtils.lerp(h, 2.6, 1 - THREE.MathUtils.smoothstep(dGer, 8, 24));
    // river channel
    if (z < 175) {
      const d = Math.abs(x - riverX(z));
      if (d < 7) h -= Math.pow(1 - d / 7, 2) * 3.2;
    }
    return h;
  };
  const heights = new Float32Array(pos.count);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    const h = heightAt(x, z);
    heights[i] = h;
    pos.setY(i, h);
  }
  geo.computeVertexNormals();
  const normals = geo.attributes.normal;
  const colorSets = {};
  const tmp = new THREE.Color(), cA = new THREE.Color(), cB = new THREE.Color(), cC = new THREE.Color(), cR = new THREE.Color(), cS = new THREE.Color(), cBank = new THREE.Color();
  for (const [name, L] of Object.entries(LOOKS)) {
    const arr = new Float32Array(pos.count * 3);
    cA.set(L.grass[0]); cB.set(L.grass[1]); cC.set(L.grass[2]); cR.set(L.rock); cS.set(L.snow); cBank.set(L.bank);
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i), h = heights[i];
      const slope = 1 - normals.getY(i);
      const n = noise(x * 0.04, z * 0.04) * 0.5 + 0.5;
      tmp.copy(cA).lerp(cB, n).lerp(cC, Math.max(0, noise(x * 0.11 + 9, z * 0.11) * 0.6));
      tmp.lerp(cR, THREE.MathUtils.smoothstep(slope, 0.18, 0.42));
      const snowLine = name === 'winter' ? 3 : name === 'summer' ? 48 : 34;
      tmp.lerp(cS, THREE.MathUtils.smoothstep(h, snowLine, snowLine + 12) * (1 - THREE.MathUtils.smoothstep(slope, 0.5, 0.75) * 0.5));
      if (z < 175) {
        const d = Math.abs(x - riverX(z));
        tmp.lerp(cBank, (1 - THREE.MathUtils.smoothstep(d, 4, 8.5)) * 0.65);
      }
      arr[i * 3] = tmp.r; arr[i * 3 + 1] = tmp.g; arr[i * 3 + 2] = tmp.b;
    }
    colorSets[name] = arr;
  }
  const colors = new Float32Array(colorSets[season]);
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const terrain = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.96, metalness: 0 }));
  terrain.receiveShadow = true;
  terrain.position.z = -120;
  scene.add(terrain);
  const groundY = (x, z) => heightAt(x, z + 120);

  // --- River water
  const waterGeo = new THREE.PlaneGeometry(520, 520, 1, 1);
  waterGeo.rotateX(-Math.PI / 2);
  const waterMat = new THREE.MeshStandardMaterial({ color: season === 'winter' ? '#dfe9f7' : '#3d74c9', roughness: season === 'winter' ? 0.4 : 0.08, metalness: 0.2, transparent: true, opacity: 0.92 });
  const water = new THREE.Mesh(waterGeo, waterMat);
  water.position.set(0, 0.45, -120);
  scene.add(water);

  // --- Gers & ovoo
  const wallTex = feltTexture('wall'), roofTex = feltTexture('roof'), doorTex = doorTexture();
  const ger1 = makeGer(1, wallTex, roofTex, doorTex);
  ger1.position.set(-8, groundY(-8, 18) - 0.05, 18);
  ger1.rotation.y = 0.35;
  const ger2 = makeGer(0.82, wallTex, roofTex, doorTex);
  ger2.position.set(0.5, groundY(0.5, 9) - 0.05, 9);
  ger2.rotation.y = -0.2;
  const ovoo = makeOvoo();
  ovoo.position.set(12, groundY(12, 4), 4);
  scene.add(ger1, ger2, ovoo);

  // --- Smoke
  const smokeCount = 40;
  const smokeGeo = new THREE.BufferGeometry();
  const smokePos = new Float32Array(smokeCount * 3);
  const smokeLife = new Float32Array(smokeCount);
  for (let i = 0; i < smokeCount; i++) smokeLife[i] = Math.random();
  smokeGeo.setAttribute('position', new THREE.BufferAttribute(smokePos, 3));
  const smoke = new THREE.Points(smokeGeo, new THREE.PointsMaterial({ map: softSprite('rgba(240,240,240,0.6)'), size: 2.2, transparent: true, depthWrite: false, opacity: 0.55 }));
  scene.add(smoke);
  const chimneyWorld = new THREE.Vector3();

  // --- Birds (eagles circling)
  const birds = [];
  for (let i = 0; i < 3; i++) {
    const b = makeBird();
    b.userData = { r: 22 + i * 9, h: 26 + i * 5, sp: 0.12 + i * 0.03, ph: i * 2.1 };
    birds.push(b); scene.add(b);
  }

  // --- Clouds
  const cTex = cloudTexture();
  const clouds = [];
  for (let i = 0; i < 12; i++) {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: cTex, transparent: true, depthWrite: false, opacity: 0.85, fog: false }));
    const s = 40 + Math.random() * 50;
    sp.scale.set(s, s * 0.5, 1);
    sp.position.set(-200 + Math.random() * 400, 55 + Math.random() * 40, -120 - Math.random() * 260);
    sp.userData.v = 0.6 + Math.random() * 0.8;
    clouds.push(sp); scene.add(sp);
  }

  // --- Seasonal particles
  const PMAX = 1600;
  const pGeo = new THREE.BufferGeometry();
  const pPos = new Float32Array(PMAX * 3);
  const pSeed = new Float32Array(PMAX);
  for (let i = 0; i < PMAX; i++) {
    pPos[i * 3] = (Math.random() - 0.5) * 90;
    pPos[i * 3 + 1] = Math.random() * 30;
    pPos[i * 3 + 2] = 45 - Math.random() * 80;
    pSeed[i] = Math.random() * 100;
  }
  pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
  const pMat = new THREE.PointsMaterial({ map: softSprite('#ffffff', 64, 0.35), color: look.particles.color, size: look.particles.size, transparent: true, depthWrite: false, opacity: 0.95 });
  const particles = new THREE.Points(pGeo, pMat);
  pGeo.setDrawRange(0, look.particles.count);
  scene.add(particles);
  let pCfg = { ...look.particles };

  // --- Camera rig
  const camBase = new THREE.Vector3(0, 7.5, 44);
  const camTarget = new THREE.Vector3(-2, 6, -40);
  camera.position.set(0, 34, 110);
  const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
  let scrollP = 0;
  let intro = 0;

  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.fov = w / h < 0.8 ? 62 : 48;
    camera.updateProjectionMatrix();
  }
  resize();
  const ro = new ResizeObserver(resize);
  ro.observe(canvas);

  const onMove = (e) => {
    mouse.tx = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.ty = (e.clientY / window.innerHeight) * 2 - 1;
  };
  window.addEventListener('pointermove', onMove, { passive: true });

  // --- Season transitions
  let current = season;
  const anim = { t: 1, from: colorSets[season], to: colorSets[season] };
  const lookFrom = {}, lookTo = {};
  const cols = ['top', 'horizon', 'sun', 'fog', 'hemiSky', 'hemiGround'];
  function captureLook() {
    return {
      top: skyU.top.value.clone(), horizon: skyU.horizon.value.clone(), sun: skyU.sunColor.value.clone(),
      fog: scene.fog.color.clone(), hemiSky: hemi.color.clone(), hemiGround: hemi.groundColor.clone(),
      sunDir: skyU.sunDir.value.clone(), sunInt: sun.intensity,
    };
  }
  function setSeason(name) {
    if (!LOOKS[name] || name === current) return;
    const L = LOOKS[name];
    Object.assign(lookFrom, captureLook());
    Object.assign(lookTo, {
      top: new THREE.Color(L.top), horizon: new THREE.Color(L.horizon), sun: new THREE.Color(L.sun), fog: new THREE.Color(L.fog),
      hemiSky: new THREE.Color(L.hemiSky), hemiGround: new THREE.Color(L.hemiGround), sunDir: new THREE.Vector3(...L.sunPos).normalize(), sunInt: L.sunInt,
    });
    anim.from = new Float32Array(colors);
    anim.to = colorSets[name];
    anim.t = 0;
    current = name;
    pCfg = { ...L.particles };
    pMat.color.set(L.particles.color);
    pMat.size = L.particles.size;
    pGeo.setDrawRange(0, L.particles.count);
    waterMat.color.set(name === 'winter' ? '#dfe9f7' : '#3d74c9');
    waterMat.roughness = name === 'winter' ? 0.4 : 0.08;
  }

  const clock = new THREE.Clock();
  let running = true, raf = 0;
  const v3 = new THREE.Vector3();

  function frame() {
    raf = requestAnimationFrame(frame);
    if (!running) return;
    const dt = Math.min(clock.getDelta(), 0.05);
    const t = clock.elapsedTime;

    // season blend
    if (anim.t < 1) {
      anim.t = Math.min(1, anim.t + dt / 1.6);
      const k = anim.t * anim.t * (3 - 2 * anim.t);
      const a = anim.from, b = anim.to;
      for (let i = 0; i < colors.length; i++) colors[i] = a[i] + (b[i] - a[i]) * k;
      geo.attributes.color.needsUpdate = true;
      skyU.top.value.copy(lookFrom.top).lerp(lookTo.top, k);
      skyU.horizon.value.copy(lookFrom.horizon).lerp(lookTo.horizon, k);
      skyU.sunColor.value.copy(lookFrom.sun).lerp(lookTo.sun, k);
      scene.fog.color.copy(lookFrom.fog).lerp(lookTo.fog, k);
      hemi.color.copy(lookFrom.hemiSky).lerp(lookTo.hemiSky, k);
      hemi.groundColor.copy(lookFrom.hemiGround).lerp(lookTo.hemiGround, k);
      skyU.sunDir.value.copy(lookFrom.sunDir).lerp(lookTo.sunDir, k).normalize();
      sun.position.copy(skyU.sunDir.value).multiplyScalar(90);
      sun.color.copy(skyU.sunColor.value);
      sun.intensity = lookFrom.sunInt + (lookTo.sunInt - lookFrom.sunInt) * k;
    }

    // camera
    intro = Math.min(1, intro + dt / 3.2);
    const ei = 1 - Math.pow(1 - intro, 3);
    mouse.x += (mouse.tx - mouse.x) * 0.04;
    mouse.y += (mouse.ty - mouse.y) * 0.04;
    v3.set(mouse.x * 3, -mouse.y * 1.4 + scrollP * 10, -scrollP * 26).add(camBase);
    camera.position.lerpVectors(new THREE.Vector3(0, 34, 110), v3, ei);
    camera.lookAt(camTarget.x + mouse.x * 2, camTarget.y - scrollP * 6, camTarget.z);

    // ovoo cloth
    const cloth = ovoo.userData.cloth;
    const cp = cloth.geometry.attributes.position;
    for (let i = 0; i < cp.count; i++) {
      const x = cp.getX(i);
      cp.setZ(i, Math.sin(x * 3 - t * 6) * 0.12 * x);
    }
    cp.needsUpdate = true;

    // smoke from ger1 chimney
    chimneyWorld.copy(ger1.userData.chimneyTop).applyMatrix4(ger1.matrixWorld);
    for (let i = 0; i < smokeCount; i++) {
      smokeLife[i] += dt * 0.18;
      if (smokeLife[i] > 1) smokeLife[i] = 0;
      const l = smokeLife[i];
      smokePos[i * 3] = chimneyWorld.x + Math.sin(i * 12.9 + t * 0.6) * l * 1.6 + l * 3.5;
      smokePos[i * 3 + 1] = chimneyWorld.y + l * 9;
      smokePos[i * 3 + 2] = chimneyWorld.z + Math.cos(i * 7.1 + t * 0.5) * l * 1.2;
    }
    smokeGeo.attributes.position.needsUpdate = true;

    // birds
    for (const b of birds) {
      const u = b.userData;
      const a = t * u.sp + u.ph;
      b.position.set(Math.cos(a) * u.r - 4, u.h + Math.sin(t * 0.7 + u.ph) * 1.5, Math.sin(a) * u.r - 20);
      b.rotation.set(0, -a, Math.sin(a) * 0.3);
      const flap = Math.sin(t * 6 + u.ph) * 0.35;
      const p = b.geometry.attributes.position;
      p.setY(2, flap); p.setY(4, flap);
      p.needsUpdate = true;
    }

    // clouds
    for (const c of clouds) {
      c.position.x += c.userData.v * dt;
      if (c.position.x > 240) c.position.x = -240;
    }

    // particles
    const n = pGeo.drawRange.count;
    for (let i = 0; i < n; i++) {
      const s = pSeed[i];
      pPos[i * 3 + 1] -= pCfg.fall * dt * (0.6 + (s % 1));
      pPos[i * 3] += Math.sin(t * 0.8 + s) * pCfg.sway * dt;
      pPos[i * 3 + 2] += Math.cos(t * 0.6 + s) * pCfg.sway * 0.5 * dt;
      if (pPos[i * 3 + 1] < 0) pPos[i * 3 + 1] = 30;
      if (pPos[i * 3 + 1] > 30) pPos[i * 3 + 1] = 0;
    }
    pGeo.attributes.position.needsUpdate = true;

    renderer.render(scene, camera);
  }
  frame();

  return {
    setSeason,
    get season() { return current; },
    setProgress(p) { scrollP = p; },
    setRunning(v) { running = v; if (v) clock.getDelta(); },
    dispose() {
      cancelAnimationFrame(raf); ro.disconnect(); window.removeEventListener('pointermove', onMove); renderer.dispose();
    },
  };
}
