import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import MAP from '../data/map.json';
import { AIMAGS, REGIONS, UB_CENTER } from '../data/data.js';

const K = Math.cos((47 * Math.PI) / 180);
const proj = (lon, lat) => [(lon - 103.8) * K, lat - 46.8];

export function initMap(container, { onSelect, onHover, lowPower = false } = {}) {
  const canvas = container.querySelector('canvas');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, lowPower ? 1.5 : 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;

  const labelRenderer = new CSS2DRenderer();
  labelRenderer.domElement.className = 'map-labels';
  Object.assign(labelRenderer.domElement.style, { position: 'absolute', inset: '0', pointerEvents: 'none', zIndex: 3 });
  container.appendChild(labelRenderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 500);
  camera.position.set(0, -15, 19);
  camera.up.set(0, 0, 1);

  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance = 8;
  controls.maxDistance = 70;
  controls.maxPolarAngle = Math.PI * 0.46;
  controls.enablePan = false;
  controls.target.set(0, 0.5, 0);
  const coarse = matchMedia('(pointer: coarse)').matches;
  if (coarse) {
    // one finger scrolls the page; two fingers rotate/zoom the map
    controls.touches = { ONE: null, TWO: THREE.TOUCH.DOLLY_ROTATE };
    canvas.style.touchAction = 'pan-y';
  }

  scene.add(new THREE.HemisphereLight('#cfe0ff', '#1a2140', 1.4));
  const key = new THREE.DirectionalLight('#ffffff', 2.2);
  key.position.set(-8, -10, 18);
  scene.add(key);
  const rim = new THREE.DirectionalLight('#f2b33d', 0.9);
  rim.position.set(10, 12, 6);
  scene.add(rim);

  const regionOf = {};
  for (const r of REGIONS) for (const a of r.aimags) regionOf[a] = r;

  // Water-ish base plate with a soft glow
  const plate = new THREE.Mesh(
    new THREE.CircleGeometry(19, 64),
    new THREE.MeshBasicMaterial({ color: '#0d1b3d', transparent: true, opacity: 0.6 }),
  );
  plate.position.z = -0.05;
  scene.add(plate);
  const grid = new THREE.PolarGridHelper(18, 16, 8, 64, '#1f3366', '#16264d');
  grid.rotation.x = Math.PI / 2;
  grid.position.z = -0.04;
  scene.add(grid);

  const meshes = [];
  const group = new THREE.Group();
  scene.add(group);
  const depth = 0.32;

  for (const [id, polys] of Object.entries(MAP)) {
    const isUB = id === 'ub';
    const region = regionOf[id];
    const base = new THREE.Color(isUB ? '#f2b33d' : region?.color || '#888');
    const shapes = polys.map((rings) => {
      const shape = new THREE.Shape(rings[0].map(([x, y]) => new THREE.Vector2(x, y)));
      for (const h of rings.slice(1)) shape.holes.push(new THREE.Path(h.map(([x, y]) => new THREE.Vector2(x, y))));
      return shape;
    });
    const geo = new THREE.ExtrudeGeometry(shapes, { depth: isUB ? depth * 1.6 : depth, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.02, bevelSegments: 1, steps: 1 });
    const side = base.clone().multiplyScalar(0.55);
    const mat = [
      new THREE.MeshStandardMaterial({ color: base.clone().lerp(new THREE.Color('#ffffff'), 0.08), roughness: 0.55, metalness: 0.05, emissive: base, emissiveIntensity: 0.06 }),
      new THREE.MeshStandardMaterial({ color: side, roughness: 0.8 }),
    ];
    const mesh = new THREE.Mesh(geo, mat);
    mesh.userData = { id, baseColor: base.clone(), lift: 0, target: 0, region: region?.id };
    group.add(mesh);
    meshes.push(mesh);

    const edges = new THREE.LineSegments(
      new THREE.EdgesGeometry(geo, 30),
      new THREE.LineBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.35 }),
    );
    mesh.add(edges);
  }

  // Pins + labels
  const pinGeo = new THREE.SphereGeometry(0.12, 16, 12);
  const ubPos = proj(UB_CENTER.lon, UB_CENTER.lat);
  const ubPin = new THREE.Mesh(pinGeo, new THREE.MeshBasicMaterial({ color: '#ffffff' }));
  ubPin.position.set(ubPos[0], ubPos[1], depth * 1.6 + 0.2);
  scene.add(ubPin);
  const ubRing = new THREE.Mesh(new THREE.RingGeometry(0.18, 0.24, 32), new THREE.MeshBasicMaterial({ color: '#f2b33d', transparent: true, side: THREE.DoubleSide }));
  ubRing.position.copy(ubPin.position);
  scene.add(ubRing);
  const ubLabelEl = document.createElement('div');
  ubLabelEl.className = 'map-label ub';
  ubLabelEl.innerHTML = '<b>UB</b>';
  const ubLabel = new CSS2DObject(ubLabelEl);
  ubLabel.position.set(ubPos[0], ubPos[1], depth * 1.6 + 0.6);
  scene.add(ubLabel);

  const targetPin = new THREE.Mesh(pinGeo, new THREE.MeshBasicMaterial({ color: '#f2b33d' }));
  targetPin.visible = false;
  scene.add(targetPin);
  const targetLabelEl = document.createElement('div');
  targetLabelEl.className = 'map-label tgt';
  const targetLabel = new CSS2DObject(targetLabelEl);
  targetLabel.visible = false;
  scene.add(targetLabel);

  // Distance arc
  let arc = null, arcDot = null, arcCurve = null, arcT = 0;
  const arcMat = new THREE.MeshBasicMaterial({ color: '#f2b33d', transparent: true, opacity: 0.95 });
  const dotMat = new THREE.MeshBasicMaterial({ color: '#ffffff' });
  function drawArc(id) {
    if (arc) { scene.remove(arc); arc.geometry.dispose(); arc = null; }
    if (arcDot) { scene.remove(arcDot); arcDot = null; }
    const a = AIMAGS[id];
    if (!a) { targetPin.visible = false; return; }
    const p = proj(a.lon, a.lat);
    const from = new THREE.Vector3(ubPos[0], ubPos[1], depth * 1.6 + 0.2);
    const to = new THREE.Vector3(p[0], p[1], depth + 0.75 + 0.2);
    const dist = from.distanceTo(to);
    const mid = from.clone().lerp(to, 0.5);
    mid.z += Math.max(1.2, dist * 0.45);
    arcCurve = new THREE.QuadraticBezierCurve3(from, mid, to);
    arc = new THREE.Mesh(new THREE.TubeGeometry(arcCurve, 64, 0.035, 8, false), arcMat);
    arc.geometry.setDrawRange(0, 0);
    scene.add(arc);
    arcDot = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 10), dotMat);
    scene.add(arcDot);
    arcT = 0;
    targetPin.position.copy(to);
    targetPin.visible = dist > 0.05;
    targetLabel.position.set(to.x, to.y, to.z + 0.45);
  }

  // Interaction
  const ray = new THREE.Raycaster();
  const ptr = new THREE.Vector2();
  let hovered = null, selected = null, filterRegion = null;
  let downAt = null;

  function pick(e) {
    const r = canvas.getBoundingClientRect();
    ptr.x = ((e.clientX - r.left) / r.width) * 2 - 1;
    ptr.y = -((e.clientY - r.top) / r.height) * 2 + 1;
    ray.setFromCamera(ptr, camera);
    const hit = ray.intersectObjects(meshes, false)[0];
    return hit ? hit.object : null;
  }
  canvas.addEventListener('pointermove', (e) => {
    if (e.pointerType === 'touch') return;
    const m = pick(e);
    if (m !== hovered) {
      hovered = m;
      canvas.style.cursor = m ? 'pointer' : 'grab';
      onHover?.(m ? m.userData.id : null, e);
    } else if (m) onHover?.(m.userData.id, e);
  });
  canvas.addEventListener('pointerleave', () => { hovered = null; onHover?.(null); });
  canvas.addEventListener('pointerdown', (e) => { downAt = { x: e.clientX, y: e.clientY }; });
  canvas.addEventListener('pointerup', (e) => {
    if (!downAt || Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y) > 6) return;
    const m = pick(e);
    select(m ? m.userData.id : null, true);
  });

  function select(id, fromMap = false) {
    selected = id;
    drawArc(id === 'ub' ? null : id);
    if (id === 'ub' && arc) { scene.remove(arc); arc = null; }
    if (fromMap) onSelect?.(id, fromMap);
  }
  function setLabel(html) { targetLabelEl.innerHTML = html; targetLabel.visible = !!html; }
  function setFilter(regionId) { filterRegion = regionId; }

  function resize() {
    const w = container.clientWidth, h = container.clientHeight;
    renderer.setSize(w, h, false);
    labelRenderer.setSize(w, h);
    camera.aspect = w / h;
    // fit the country into view
    camera.position.setLength(w / h < 0.75 ? 52 : w / h < 1.1 ? 36 : 25);
    camera.updateProjectionMatrix();
  }
  resize();
  const ro = new ResizeObserver(resize);
  ro.observe(container);

  const clock = new THREE.Clock();
  let running = false, raf = 0, introT = 0;
  const tmpColor = new THREE.Color();
  function frame() {
    raf = requestAnimationFrame(frame);
    if (!running) return;
    const dt = Math.min(clock.getDelta(), 0.05);
    const t = clock.elapsedTime;
    introT = Math.min(1, introT + dt / 1.8);
    for (const m of meshes) {
      const u = m.userData;
      const dim = filterRegion && u.region !== filterRegion && u.id !== 'ub';
      u.target = u.id === selected ? 0.55 : u.id === hovered?.userData.id ? 0.28 : 0;
      u.lift += (u.target - u.lift) * 0.15;
      // intro: rise from below with a stagger
      const delay = (m.position.x + 10) * 0.02;
      const k = THREE.MathUtils.clamp((introT - delay) / 0.6, 0, 1);
      m.scale.z = 0.05 + 0.95 * (1 - Math.pow(1 - k, 3));
      m.position.z = u.lift;
      const top = m.material[0];
      tmpColor.copy(u.baseColor);
      if (dim) tmpColor.lerp(new THREE.Color('#33405f'), 0.75);
      top.color.lerp(tmpColor, 0.15);
      top.emissiveIntensity += (((u.id === selected || u.id === hovered?.userData.id) ? 0.45 : 0.06) - top.emissiveIntensity) * 0.15;
    }
    ubRing.scale.setScalar(1 + ((t * 0.8) % 1) * 2.4);
    ubRing.material.opacity = 1 - ((t * 0.8) % 1);
    ubRing.lookAt(camera.position);
    if (arc) {
      arcT = Math.min(1, arcT + dt / 1.1);
      const total = arc.geometry.index ? arc.geometry.index.count : arc.geometry.attributes.position.count;
      arc.geometry.setDrawRange(0, Math.floor(total * arcT));
      const pt = arcCurve.getPoint(arcT < 1 ? arcT : (t * 0.35) % 1);
      arcDot.position.copy(pt);
    }
    controls.update();
    renderer.render(scene, camera);
    labelRenderer.render(scene, camera);
  }
  frame();

  return {
    select, setLabel, setFilter,
    setRunning(v) { running = v; if (v) clock.getDelta(); },
    projectToScreen(id) {
      const a = AIMAGS[id];
      if (!a) return null;
      const p = proj(a.lon, a.lat);
      const v = new THREE.Vector3(p[0], p[1], 0.6).project(camera);
      const r = canvas.getBoundingClientRect();
      return { x: (v.x * 0.5 + 0.5) * r.width, y: (-v.y * 0.5 + 0.5) * r.height };
    },
    dispose() { cancelAnimationFrame(raf); ro.disconnect(); renderer.dispose(); },
  };
}
