// CareView 3D scenes: (1) the working prototype, (2) the exploded clip.
// Units: 1 = 10 mm.
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

const $ = (id) => document.getElementById(id);

// ---------- Shared helpers ----------
function makeRenderer(canvas) {
  const r = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
  r.setPixelRatio(Math.min(devicePixelRatio, 2));
  r.outputColorSpace = THREE.SRGBColorSpace;
  r.toneMapping = THREE.AgXToneMapping ?? THREE.ACESFilmicToneMapping;
  r.toneMappingExposure = 1.1;
  r.shadowMap.enabled = true;
  r.shadowMap.type = THREE.VSMShadowMap;
  return r;
}

// Product-photography lighting: a dim room with a big overhead softbox and two strip lights.
function studioEnv(renderer) {
  const s = new THREE.Scene();
  s.add(new THREE.Mesh(new THREE.SphereGeometry(30, 32, 16), new THREE.MeshBasicMaterial({ color: 0x5a5a5c, side: THREE.BackSide })));
  const panel = (w, h, pos, k) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 1, 1).multiplyScalar(k), side: THREE.DoubleSide }));
    m.position.set(...pos); m.lookAt(0, 0, 0); s.add(m);
  };
  panel(18, 18, [0, 22, 0], 3.2);    // overhead softbox
  panel(4, 20, [-18, 6, 8], 2.6);    // left strip
  panel(4, 20, [18, 6, -6], 1.8);    // right strip
  panel(24, 5, [0, 4, -20], 1.2);    // back fill
  const pm = new THREE.PMREMGenerator(renderer);
  const tex = pm.fromScene(s, .015).texture;
  pm.dispose();
  return tex;
}

function fit(renderer, camera, el) {
  const w = el.clientWidth, h = el.clientHeight, pr = renderer.getPixelRatio();
  if (renderer.domElement.width !== Math.floor(w * pr) || renderer.domElement.height !== Math.floor(h * pr)) {
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
  }
}
function canvasTex(w, h, draw, color = true) {
  const c = document.createElement("canvas"); c.width = w; c.height = h; draw(c.getContext("2d"), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = color ? THREE.SRGBColorSpace : THREE.NoColorSpace; t.anisotropy = 8; return t;
}
// Draws the same artwork three times (colour, roughness, metalness) so PCBs reflect light like the real thing.
function pbrSet(w, h, draw) {
  const pal = {
    color: (k) => ({ base: k.base, trace: k.trace, silk: "#eeeeee", gold: "#d4af5a", nickel: "#d9dcdf", hole: "#050505" }),
    rough: () => ({ base: "#707070", trace: "#5c5c5c", silk: "#d8d8d8", gold: "#3a3a3a", nickel: "#4a4a4a", hole: "#ffffff" }),
    metal: () => ({ base: "#000000", trace: "#000000", silk: "#000000", gold: "#ffffff", nickel: "#ffffff", hole: "#000000" }),
  };
  return (k) => ({
    map: canvasTex(w, h, (g) => draw(g, pal.color(k), mulberry(7))),
    roughnessMap: canvasTex(w, h, (g) => draw(g, pal.rough(k), mulberry(7)), false),
    metalnessMap: canvasTex(w, h, (g) => draw(g, pal.metal(k), mulberry(7)), false),
  });
}
function mulberry(a) { return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function traces(g, c, rnd, w, h, n, width) {
  g.strokeStyle = c.trace; g.lineWidth = width; g.lineJoin = g.lineCap = "round";
  for (let i = 0; i < n; i++) {
    let x = rnd() * w, y = rnd() * h; g.beginPath(); g.moveTo(x, y);
    for (let s = 0; s < 4; s++) { if (s % 2) x += (rnd() - .5) * w * .5; else y += (rnd() - .5) * h * .5; const d = (rnd() - .5) * 60; g.lineTo(x + d, y + (s % 2 ? 0 : d)); }
    g.stroke();
    g.fillStyle = c.gold; g.beginPath(); g.arc(x, y, width * .9, 0, 7); g.fill();
  }
}
const std = (o) => new THREE.MeshStandardMaterial(o);
const phys = (o) => new THREE.MeshPhysicalMaterial(o);
const addShadows = (obj) => obj.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
const visible = (el, cb) => new IntersectionObserver(([e]) => cb(e.isIntersecting), { rootMargin: "120px" }).observe(el);
function glowSprite(color, size) {
  const tex = canvasTex(128, 128, (g) => { const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(.25, "rgba(255,255,255,.55)"); gr.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); });
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, color, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
  sp.scale.set(size, size, 1); return sp;
}
function roundedRect(w, h, r) {
  const s = new THREE.Shape(), x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r); s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h); s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y); return s;
}
// Pillowy slab: extruded rounded rectangle with a deep, smooth bevel, lying flat and centred.
function pillow(w, d, h, r, bevel) {
  const g = new THREE.ExtrudeGeometry(roundedRect(w - bevel * 2, d - bevel * 2, Math.max(.01, r - bevel)), {
    depth: Math.max(.001, h - bevel * 2), bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 16, curveSegments: 40,
  });
  g.rotateX(-Math.PI / 2); g.computeBoundingBox();
  const bb = g.boundingBox; g.translate(-(bb.min.x + bb.max.x) / 2, -(bb.min.y + bb.max.y) / 2, -(bb.min.z + bb.max.z) / 2);
  g.computeVertexNormals(); return g;
}
// Surface-mount parts
const mats = {
  smdBlack: std({ color: 0x151515, roughness: .5 }),
  smdTan: std({ color: 0xb79a6a, roughness: .6 }),
  tin: std({ color: 0xd6d8da, metalness: 1, roughness: .3 }),
  gold: std({ color: 0xd4af5a, metalness: 1, roughness: .25 }),
  steel: phys({ color: 0xdfe2e5, metalness: 1, roughness: .16, clearcoat: .3 }),
};
function smd(parent, x, y, z, len = .2, wid = .1, body = mats.smdBlack, rot = 0) {
  const g = new THREE.Group();
  const b = new THREE.Mesh(new THREE.BoxGeometry(len * .6, .06, wid), body); b.position.y = .03; g.add(b);
  [-1, 1].forEach((s) => { const e = new THREE.Mesh(new THREE.BoxGeometry(len * .2, .065, wid * 1.02), mats.tin); e.position.set(s * len * .4, .032, 0); g.add(e); });
  g.position.set(x, y, z); g.rotation.y = rot; parent.add(g); return g;
}
function soic(parent, x, y, z, w = .5, d = .4) {
  const g = new THREE.Group();
  const b = new THREE.Mesh(new RoundedBoxGeometry(w, .14, d, 2, .02), std({ color: 0x141414, roughness: .35 })); b.position.y = .08; g.add(b);
  for (let i = 0; i < 4; i++) [-1, 1].forEach((s) => { const l = new THREE.Mesh(new THREE.BoxGeometry(.04, .03, .12), mats.tin); l.position.set(-w / 2 + .08 + i * (w - .16) / 3, .03, s * (d / 2 + .05)); g.add(l); });
  const dot = new THREE.Mesh(new THREE.CircleGeometry(.025, 16), std({ color: 0x2a2a2a })); dot.rotation.x = -Math.PI / 2; dot.position.set(-w / 2 + .08, .152, -d / 2 + .08); g.add(dot);
  g.position.set(x, y, z); parent.add(g); return g;
}

/* =====================================================================
   1) MY PROTOTYPE
   ===================================================================== */
{
  const host = $("sim"), canvas = $("simCanvas");
  const renderer = makeRenderer(canvas);
  const scene = new THREE.Scene();
  scene.environment = studioEnv(renderer);
  const camera = new THREE.PerspectiveCamera(22, 1, .1, 200);
  camera.position.set(1, 16, 26);
  const controls = new OrbitControls(camera, canvas);
  controls.target.set(-.2, 0, -.4);
  controls.enableDamping = true; controls.enablePan = false;
  controls.minPolarAngle = .25; controls.maxPolarAngle = 1.2; controls.minDistance = 12; controls.maxDistance = 40;
  controls.autoRotate = true; controls.autoRotateSpeed = .3;
  canvas.addEventListener("pointerdown", () => (controls.autoRotate = false));

  const key = new THREE.DirectionalLight(0xffffff, 1.6);
  key.position.set(-7, 16, 9); key.castShadow = true; key.shadow.mapSize.set(2048, 2048);
  Object.assign(key.shadow.camera, { left: -12, right: 12, top: 12, bottom: -12, near: 1, far: 50 });
  key.shadow.radius = 9; key.shadow.blurSamples = 20; key.shadow.bias = -.0006;
  scene.add(key);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), new THREE.ShadowMaterial({ opacity: .22 }));
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);

  // ---- Knit fabric: stitch height field -> normal map + colour ----
  const KN = 256;
  const heightCanvas = document.createElement("canvas"); heightCanvas.width = heightCanvas.height = KN;
  { const g = heightCanvas.getContext("2d"); g.fillStyle = "#000"; g.fillRect(0, 0, KN, KN);
    for (let y = -16; y < KN + 16; y += 16) for (let x = 0; x < KN; x += 16) [-1, 1].forEach((s) => {
      const gr = g.createRadialGradient(x + 8 + s * 3.5, y + 8, 0, x + 8 + s * 3.5, y + 8, 7); gr.addColorStop(0, "#fff"); gr.addColorStop(1, "rgba(255,255,255,0)");
      g.save(); g.translate(x + 8 + s * 3.5, y + 8); g.rotate(s * .55); g.scale(.55, 1.25); g.translate(-(x + 8 + s * 3.5), -(y + 8));
      g.fillStyle = gr; g.beginPath(); g.arc(x + 8 + s * 3.5, y + 8, 7, 0, 7); g.fill(); g.restore();
    }); }
  const hd = heightCanvas.getContext("2d").getImageData(0, 0, KN, KN).data;
  const H = (x, y) => hd[(((y + KN) % KN) * KN + ((x + KN) % KN)) * 4] / 255;
  const knitNormal = canvasTex(KN, KN, (g) => {
    const img = g.createImageData(KN, KN);
    for (let y = 0; y < KN; y++) for (let x = 0; x < KN; x++) {
      const dx = (H(x - 1, y) - H(x + 1, y)) * 2.2, dy = (H(x, y - 1) - H(x, y + 1)) * 2.2, l = Math.hypot(dx, dy, 1), i = (y * KN + x) * 4;
      img.data[i] = (dx / l * .5 + .5) * 255; img.data[i + 1] = (dy / l * .5 + .5) * 255; img.data[i + 2] = (1 / l * .5 + .5) * 255; img.data[i + 3] = 255;
    }
    g.putImageData(img, 0, 0);
  }, false);
  const knitColor = canvasTex(KN, KN, (g) => {
    g.fillStyle = "#2c2c2f"; g.fillRect(0, 0, KN, KN);
    const img = g.getImageData(0, 0, KN, KN);
    for (let i = 0; i < KN * KN; i++) { const v = hd[i * 4] / 255, n = (Math.random() - .5) * 10; img.data[i * 4] += v * 26 + n; img.data[i * 4 + 1] += v * 26 + n; img.data[i * 4 + 2] += v * 28 + n; }
    g.putImageData(img, 0, 0);
  });
  [knitNormal, knitColor].forEach((t) => { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(7, 5.3); });
  const FAB = { x: 3.4, z: 1.4, w: 9.5, d: 7.2, top: .045 };
  const fabGeo = new THREE.PlaneGeometry(FAB.w, FAB.d, 140, 110); fabGeo.rotateX(-Math.PI / 2);
  { const p = fabGeo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), z = p.getZ(i), edge = Math.min(FAB.w / 2 - Math.abs(x), FAB.d / 2 - Math.abs(z));
      const f = Math.max(0, 1 - edge / 1.1) ** 2;
      p.setY(i, .03 + f * (.05 + .07 * Math.sin(x * 1.7 + z * .9) + .05 * Math.cos(z * 2.3 - x)));
    }
    fabGeo.computeVertexNormals(); }
  const fabric = new THREE.Mesh(fabGeo, phys({ map: knitColor, normalMap: knitNormal, normalScale: new THREE.Vector2(1.2, 1.2), roughness: .95, sheen: .45, sheenRoughness: .6, sheenColor: 0x4a4a50, side: THREE.DoubleSide }));
  fabric.position.set(FAB.x, 0, FAB.z); fabric.castShadow = true; fabric.receiveShadow = true; scene.add(fabric);

  // ---- Genesis Mini: black solder mask, traces, silkscreen, gold pads ----
  const genesis = new THREE.Group();
  const gTex = pbrSet(1024, 1024, (g, c, rnd) => {
    g.clearRect(0, 0, 1024, 1024);
    g.fillStyle = c.base; g.beginPath(); g.roundRect(0, 0, 1024, 1024, 22); g.fill();
    traces(g, c, rnd, 1024, 1024, 46, 5);
    g.strokeStyle = c.silk; g.lineWidth = 5; g.fillStyle = c.silk; g.textAlign = "center";
    [[150, 110, "4"], [560, 110, "3"], [150, 520, "1"], [560, 520, "2"]].forEach(([x, y, n]) => {
      g.beginPath(); g.roundRect(x, y, 330, 330, 26); g.stroke();
      g.font = "600 70px Arial"; g.fillText(n, x + 165, n === "1" || n === "2" ? y + 400 : y - 26);
      g.font = "600 21px Arial"; ["G", "3V3", "SCK", "SDA", "SCL"].forEach((t, i) => { g.fillText(t, x + 38, y + 72 + i * 52); g.fillText(["MOSI", "MISO", "0", "1", "2"][i], x + 292, y + 72 + i * 52); });
      g.font = "700 20px Arial"; g.fillText("AX22", x + 165, n === "1" || n === "2" ? y - 12 : y + 352);
    });
    g.save(); g.translate(70, 512); g.rotate(-Math.PI / 2); g.font = "700 30px Arial"; g.fillText("✕  AXIOMETA", 0, 10); g.restore();
    g.font = "600 22px Arial"; g.fillText("RESET", 900, 300); g.fillText("BOOT", 900, 790);
    [[52, 52], [972, 52], [52, 972], [972, 972]].forEach(([x, y]) => { g.fillStyle = c.gold; g.beginPath(); g.arc(x, y, 38, 0, 7); g.fill(); g.fillStyle = c.hole; g.beginPath(); g.arc(x, y, 22, 0, 7); g.fill(); });
  })({ base: "#0e0e0f", trace: "#19191b" });
  genesis.add(new THREE.Mesh(new RoundedBoxGeometry(5.5, .16, 5.5, 3, .05), std({ color: 0x0c0c0d, roughness: .5 })));
  const gTop = new THREE.Mesh(new THREE.PlaneGeometry(5.5, 5.5), std({ ...gTex, metalness: 1, roughness: 1, transparent: true }));
  gTop.rotation.x = -Math.PI / 2; gTop.position.y = .0805; genesis.add(gTop);
  const holeTex = canvasTex(64, 256, (g, w, h) => { g.fillStyle = "#151515"; g.fillRect(0, 0, w, h); for (let i = 0; i < 5; i++) { g.fillStyle = "#000"; g.fillRect(19, 13 + i * 49, 26, 26); g.fillStyle = "#6b5a2c"; g.fillRect(27, 21 + i * 49, 10, 10); } });
  const hdrSide = std({ color: 0x141414, roughness: .55 }), hdrTop = std({ map: holeTex, roughness: .55 });
  const portCenters = { 4: [-1.04, -1.33], 3: [.97, -1.33], 1: [-1.04, .68], 2: [.97, .68] };
  Object.values(portCenters).forEach(([x, z]) => [-.35, .35].forEach((dx) => {
    const h = new THREE.Mesh(new THREE.BoxGeometry(.26, .85, 1.27), [hdrSide, hdrSide, hdrTop, hdrSide, hdrSide, hdrSide]); h.position.set(x + dx, .505, z); genesis.add(h);
  }));
  const rnd = mulberry(3);
  for (let i = 0; i < 26; i++) smd(genesis, -2.2 + rnd() * 4.2, .08, (rnd() < .5 ? -2.35 : 2.25) + (rnd() - .5) * .25, .2, .1, rnd() < .5 ? mats.smdBlack : mats.smdTan, rnd() < .5 ? 0 : Math.PI / 2);
  for (let i = 0; i < 8; i++) smd(genesis, 1.95 + (rnd() - .5) * .3, .08, -1 + rnd() * 2, .2, .1, mats.smdTan, Math.PI / 2);
  const usb = new THREE.Mesh(new RoundedBoxGeometry(.75, .32, .9, 3, .14), mats.steel); usb.position.set(2.5, .24, .2); genesis.add(usb);
  const usbHole = new THREE.Mesh(new RoundedBoxGeometry(.05, .16, .7, 2, .06), std({ color: 0x050505 })); usbHole.position.set(2.88, .24, .2); genesis.add(usbHole);
  [[2.3, -1.25], [2.3, 1.55]].forEach(([x, z]) => {
    const b = new THREE.Mesh(new RoundedBoxGeometry(.48, .2, .48, 2, .03), mats.steel); b.position.set(x, .18, z); genesis.add(b);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(.13, .13, .12, 24), std({ color: 0x1c1c1c, roughness: .4 })); cap.position.set(x, .33, z); genesis.add(cap);
  });
  const brass = std({ color: 0xc9a44a, metalness: 1, roughness: .3 });
  [[-2.43, -2.43], [2.43, -2.43], [-2.43, 2.43], [2.43, 2.43]].forEach(([x, z]) => { const s = new THREE.Mesh(new THREE.CylinderGeometry(.2, .2, .4, 6), brass); s.position.set(x, -.28, z); genesis.add(s); });
  const ledMat = new THREE.MeshBasicMaterial({ color: 0x3fbf7f });
  const led = new THREE.Mesh(new THREE.BoxGeometry(.5, .1, .5), ledMat); led.position.set(1.2, -.12, .7); genesis.add(led);
  const ledLight = new THREE.PointLight(0x3fbf7f, 7, 7, 1.6); ledLight.position.set(1.2, -.35, .7); genesis.add(ledLight);
  const ledGlow = glowSprite(0x3fbf7f, 3.2); ledGlow.position.set(1.2, -.3, .7); genesis.add(ledGlow);
  genesis.position.set(-4.4, .56, -.6); genesis.rotation.y = .12;
  addShadows(genesis); ledGlow.castShadow = false; scene.add(genesis);

  // ---- Comparator board ----
  const comp = new THREE.Group();
  const cTex = pbrSet(512, 240, (g, c, r) => {
    g.fillStyle = c.base; g.fillRect(0, 0, 512, 240); traces(g, c, r, 512, 240, 14, 4);
    g.fillStyle = c.silk; g.font = "600 17px Arial"; g.textAlign = "center";
    ["VCC", "GND", "DO", "AO"].forEach((t, i) => g.fillText(t, 62, 52 + i * 46));
    g.fillText("PWR", 430, 50); g.fillText("DO", 430, 210);
    [[110, 120]].forEach(([x]) => { for (let i = 0; i < 4; i++) { g.fillStyle = c.gold; g.beginPath(); g.arc(x - 70, 46 + i * 46, 12, 0, 7); g.fill(); } });
    for (let i = 0; i < 2; i++) { g.fillStyle = c.gold; g.beginPath(); g.arc(478, 98 + i * 46, 12, 0, 7); g.fill(); }
  })({ base: "#1c4c97", trace: "#2257a8" });
  comp.add(new THREE.Mesh(new RoundedBoxGeometry(3.0, .14, 1.4, 2, .03), std({ color: 0x1c4c97, roughness: .45 })));
  const cTop = new THREE.Mesh(new THREE.PlaneGeometry(3.0, 1.4), std({ ...cTex, metalness: 1, roughness: 1 })); cTop.rotation.x = -Math.PI / 2; cTop.position.y = .071; comp.add(cTop);
  const pot = new THREE.Mesh(new RoundedBoxGeometry(.7, .6, .7, 2, .05), std({ color: 0x2d62c8, roughness: .35 })); pot.position.set(-.3, .37, 0); comp.add(pot);
  const screw = new THREE.Mesh(new THREE.CylinderGeometry(.22, .22, .06, 32), std({ color: 0xc9a44a, metalness: 1, roughness: .28 })); screw.position.set(-.3, .7, 0); comp.add(screw);
  [0, Math.PI / 2].forEach((r) => { const slot = new THREE.Mesh(new THREE.BoxGeometry(.32, .03, .05), std({ color: 0x2a220e })); slot.position.set(-.3, .735, 0); slot.rotation.y = r; comp.add(slot); });
  soic(comp, .55, .07, 0);
  [[.95, -.45], [.95, .45], [.2, .5], [.2, -.5], [1.15, 0]].forEach(([x, z], i) => smd(comp, x, .07, z, .2, .1, i < 2 ? mats.smdBlack : mats.smdTan));
  const pwrLed = new THREE.Mesh(new THREE.BoxGeometry(.16, .08, .1), new THREE.MeshBasicMaterial({ color: 0xff3b30 })); pwrLed.position.set(1.0, .11, -.62); comp.add(pwrLed);
  const pwrGlow = glowSprite(0xff3b30, .6); pwrGlow.position.set(1.0, .16, -.62); comp.add(pwrGlow);
  const doLedMat = new THREE.MeshBasicMaterial({ color: 0x173117 }); const doLed = new THREE.Mesh(new THREE.BoxGeometry(.16, .08, .1), doLedMat); doLed.position.set(1.0, .11, .62); comp.add(doLed);
  const doGlow = glowSprite(0x22ff55, .7); doGlow.position.set(1.0, .16, .62); doGlow.visible = false; comp.add(doGlow);
  function maleHeader(n, pitch = .254) {
    const g = new THREE.Group();
    const base = new THREE.Mesh(new RoundedBoxGeometry(.25, .25, n * pitch, 2, .02), std({ color: 0x111111, roughness: .5 })); base.position.y = .125; g.add(base);
    for (let i = 0; i < n; i++) { const p = new THREE.Mesh(new THREE.BoxGeometry(.064, .7, .064), mats.gold); p.position.set(0, .45, (i - (n - 1) / 2) * pitch); g.add(p); }
    return g;
  }
  const h4 = maleHeader(4); h4.position.set(-1.32, .07, 0); comp.add(h4);
  const h2 = maleHeader(2); h2.position.set(1.32, .07, 0); comp.add(h2);
  comp.position.set(-.2, .07, -3.6); comp.rotation.y = -.08;
  addShadows(comp); scene.add(comp);

  // ---- Probe: blue FR4 with nickel-plated prongs and silkscreen ----
  const fork = new THREE.Group();
  const s = new THREE.Shape();
  s.moveTo(-1, 0); s.lineTo(1, 0); s.lineTo(1, 5.6); s.lineTo(.78, 6.1); s.lineTo(.55, 5.6); s.lineTo(.55, 1.5);
  s.lineTo(-.55, 1.5); s.lineTo(-.55, 5.6); s.lineTo(-.78, 6.1); s.lineTo(-1, 5.6); s.closePath();
  const hole = new THREE.Path(); hole.absarc(0, .75, .14, 0, Math.PI * 2, true); s.holes.push(hole);
  const fGeo = new THREE.ExtrudeGeometry(s, { depth: .16, bevelEnabled: true, bevelThickness: .015, bevelSize: .015, bevelSegments: 2, curveSegments: 24 });
  const fTex = pbrSet(256, 780, (g, c) => {
    // canvas covers x [-1, 1], y [0, 6.1] (y up)
    const X = (x) => (x + 1) * 128, Y = (y) => 780 - y * (780 / 6.1);
    g.fillStyle = c.base; g.fillRect(0, 0, 256, 780);
    g.fillStyle = c.nickel;
    [[-1, -.55], [.55, 1]].forEach(([a, b]) => { g.beginPath(); g.moveTo(X(a + .05), Y(1.6)); g.lineTo(X(b - .05), Y(1.6)); g.lineTo(X(b - .05), Y(5.55)); g.lineTo(X((a + b) / 2), Y(6.0)); g.lineTo(X(a + .05), Y(5.55)); g.closePath(); g.fill(); });
    g.fillRect(X(-.85), Y(1.6), X(-.2) - X(-.85), Y(.25) - Y(1.6)); g.fillRect(X(.2), Y(1.6), X(.85) - X(.2), Y(.25) - Y(1.6));
    g.fillStyle = c.silk; g.font = "700 30px Arial"; g.textAlign = "center"; g.save(); g.translate(X(0), Y(1.15)); g.fillText("YL-69", 0, 0); g.restore();
  })({ base: "#1c4c97", trace: "#2257a8" });
  [fTex.map, fTex.roughnessMap, fTex.metalnessMap].forEach((t) => { t.repeat.set(.5, 1 / 6.1); t.offset.set(.5, 0); });
  const fMesh = new THREE.Mesh(fGeo, [std({ ...fTex, metalness: 1, roughness: 1 }), std({ color: 0x1c4c97, roughness: .5 })]);
  fMesh.rotation.x = Math.PI / 2; fMesh.position.y = .18; fork.add(fMesh);
  const fh = maleHeader(2); fh.rotation.x = -Math.PI / 2; fh.position.set(0, .3, -.05); fork.add(fh);
  fork.position.set(3.6, FAB.top, -.9); fork.rotation.y = -.12;
  addShadows(fork); scene.add(fork);

  // ---- Jumper wires: dupont housings, PVC wire that droops onto the table ----
  scene.updateMatrixWorld(true);
  const wp = (obj, x, y, z) => obj.localToWorld(new THREE.Vector3(x, y, z));
  const housingGeo = new RoundedBoxGeometry(.25, .62, .25, 2, .03), housingMat = std({ color: 0x131313, roughness: .45 });
  function wire(a, b, color, sag = 0) {
    const L = (t, y) => { const p = a.clone().lerp(b, t); p.y = y; return p; };
    const pts = [a, a.clone().add(new THREE.Vector3(0, .7, 0)), L(.22, a.y + .9), L(.42, .09 + sag), L(.62, .09 + sag), L(.8, b.y + .9), b.clone().add(new THREE.Vector3(0, .7, 0)), b];
    const curve = new THREE.CatmullRomCurve3(pts, false, "centripetal");
    const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 140, .052, 12), phys({ color, roughness: .32, clearcoat: .4, clearcoatRoughness: .3 }));
    tube.castShadow = true; tube.receiveShadow = true; scene.add(tube);
    [a, b].forEach((p) => { const h = new THREE.Mesh(housingGeo, housingMat); h.position.copy(p).add(new THREE.Vector3(0, .12, 0)); h.castShadow = true; scene.add(h); });
  }
  const [p1x, p1z] = portCenters[1];
  const port1 = (i) => wp(genesis, p1x - .35, 1.12, p1z - .5 + i * .254);
  const compPin = (i) => wp(comp, -1.32, 1.06, (i - 1.5) * .254);
  wire(port1(1), compPin(0), 0xd2302b, 0);
  wire(port1(0), compPin(1), 0x262626, .1);
  wire(port1(3), compPin(3), 0xf0be2a, .2);
  const forkPin = (i) => wp(fork, (i - .5) * .254, .3, -.78);
  const compOut = (i) => wp(comp, 1.32, 1.06, (i - .5) * .254);
  wire(compOut(0), forkPin(0), 0x2a9d63, 0);
  wire(compOut(1), forkPin(1), 0xe9e9e9, .1);

  // ---- Wet patch + droplets ----
  const prongCenter = wp(fork, 0, 0, 3.6); prongCenter.y = FAB.top + .05;
  const wetAlpha = canvasTex(256, 256, (g) => {
    const gr = g.createRadialGradient(128, 128, 10, 128, 128, 128); gr.addColorStop(0, "#fff"); gr.addColorStop(.6, "#d0d0d0"); gr.addColorStop(1, "#000");
    g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 40; i++) { g.fillStyle = "rgba(0,0,0,.5)"; const a = Math.random() * 7; g.beginPath(); g.arc(128 + Math.cos(a) * 118, 128 + Math.sin(a) * 118, 6 + Math.random() * 10, 0, 7); g.fill(); }
  }, false);
  const wetMat = phys({ color: 0x050506, roughness: .06, clearcoat: 1, clearcoatRoughness: .05, transparent: true, opacity: 0, depthWrite: false, alphaMap: wetAlpha, normalMap: knitNormal, normalScale: new THREE.Vector2(.5, .5), polygonOffset: true, polygonOffsetFactor: -2 });
  const wet = new THREE.Mesh(new THREE.CircleGeometry(1, 64), wetMat);
  wet.rotation.x = -Math.PI / 2; wet.position.copy(prongCenter); wet.position.y = .05; wet.scale.set(.001, .001, 1); scene.add(wet);
  const tagDefs = [["Genesis Mini", genesis, new THREE.Vector3(0, 1.5, 0)], ["Sensor board", comp, new THREE.Vector3(0, 1.3, 0)], ["Probe on fabric", fork, new THREE.Vector3(0, .9, 3)]];
  const tagEls = tagDefs.map(([t]) => { const e = document.createElement("div"); e.className = "tag3d"; e.textContent = t; $("tags").append(e); return e; });

  // ---- Same rules as caregiver_sms.ino ----
  const CFG = { wetBelow: 2500, dryAbove: 2700, alertAfterMs: 10000 };
  const statusChip = $("stText").parentElement;
  const COLORS = { dry: 0x3fbf7f, timing: 0xffb020, alerted: 0xff4d3a };
  let wetness = 0, state = "dry", timingSince = 0, live = false, liveRaw = null;
  function setState(st) {
    state = st; if (st === "timing") timingSince = performance.now();
    [ledMat.color, ledLight.color, ledGlow.material.color].forEach((c) => c.setHex(COLORS[st]));
    $("stDot").style.background = "#" + COLORS[st].toString(16).padStart(6, "0");
  }
  function notify(text) {
    const n = document.createElement("div"); n.className = "notif";
    n.innerHTML = `<span class="ic"><svg width="15" height="15" viewBox="0 0 40 40"><path d="M20 8.5c-7.5 0-13.5 4.9-13.5 11 0 3.5 2 6.6 5.1 8.6-.3 1.7-1.3 3.3-2.7 4.4 2.7-.1 5.1-1.1 6.8-2.7 1.4.4 2.8.7 4.3.7 7.5 0 13.5-4.9 13.5-11s-6-11-13.5-11Z" fill="#fff"/></svg></span><div style="flex:1"><b>CareView <span>now</span></b><span class="m"></span></div>`;
    n.querySelector(".m").textContent = text.replace(/^CareView:?\s*/, "");
    $("notifs").prepend(n);
    while ($("notifs").children.length > 3) $("notifs").lastChild.remove();
  }
  const tickClock = () => { const d = new Date(); $("pClock").textContent = d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }).replace(/\s?[AP]M/i, ""); $("pDate").textContent = d.toLocaleDateString([], { weekday: "long", day: "numeric", month: "long" }); };
  tickClock(); setInterval(tickClock, 15000);


  // ---- Web Serial: the real board drives the model ----
  let port = null, reader = null, pipeDone = null;
  $("btnLive").onclick = async () => {
    if (port) return disconnect();
    if (!("serial" in navigator)) return alert("Connecting the board needs Chrome or Edge.");
    try { port = await navigator.serial.requestPort(); await port.open({ baudRate: 115200 }); } catch { port = null; return; }
    live = true; liveRaw = null;
    $("btnLive").classList.add("live"); $("liveLbl").textContent = "Disconnect"; $("connectCard").hidden = true;
    setState("dry");
    const dec = new TextDecoderStream(); pipeDone = port.readable.pipeTo(dec.writable).catch(() => {}); reader = dec.readable.getReader();
    let buf = "";
    try { for (;;) { const { value, done } = await reader.read(); if (done) break; buf += value; const ls = buf.split("\n"); buf = ls.pop(); ls.forEach(onLine); } } catch {}
    if (port) disconnect();
  };
  async function disconnect() {
    const p = port; port = null; live = false;
    try { await reader?.cancel(); } catch {} await pipeDone;
    try { await p?.close(); } catch {}
    liveRaw = null; wetness = 0;
    $("btnLive").classList.remove("live"); $("liveLbl").textContent = "Connect my board"; $("connectCard").hidden = false; setState("dry");
  }
  function onLine(line) {
    line = line.trim(); let m;
    if ((m = line.match(/^MOISTURE_RAW:(\d+)/))) liveRaw = +m[1];
    else if (line.startsWith("WET_STATE:TIMING")) setState("timing");
    else if (line.startsWith("WET_STATE:DRY")) setState("dry");
    else if (line.startsWith("CAREGIVER_ALERT")) setState("alerted");
    else if ((m = line.match(/^SMS_(?:SIMULATED|SENT):(.*)$/))) notify(m[1]);
  }

  // ---- Loop ----
  let running = false, last = performance.now();
  visible(host, (v) => { const was = running; running = v; if (v && !was) { last = performance.now(); requestAnimationFrame(loop); } });
  function loop(now) {
    if (!running) return;
    const dt = Math.min(.05, (now - last) / 1000); last = now;
    fit(renderer, camera, host);
    const hw = host.clientWidth, hh = host.clientHeight;
    if (hw > 1000) camera.setViewOffset(hw, hh, hw * .1, 0, hw, hh); else camera.clearViewOffset();

    // Only real readings from the board move the model.
    const raw = liveRaw;
    const target = raw == null ? 0 : Math.max(0, (4095 - raw) / 1500);
    wetness += (target - wetness) * Math.min(1, dt * 4);

    const r = Math.sqrt(Math.min(wetness, 2.2)) * 1.75;
    wet.scale.set(Math.max(.001, r), Math.max(.001, r * 1.25), 1);
    wetMat.opacity = Math.min(.95, wetness * 1.1);
    const wetOn = raw != null && raw < CFG.wetBelow; doLedMat.color.setHex(wetOn ? 0x22ff55 : 0x173117); doGlow.visible = wetOn;
    ledMat.visible = ledGlow.visible = live; ledLight.visible = live;
    statusChip.style.visibility = live ? "visible" : "hidden";
    const pulse = Math.sin(now / (state === "alerted" ? 120 : 600));
    ledLight.intensity = 6 + pulse * (state === "dry" ? 1 : 3);
    ledGlow.material.opacity = .75 + pulse * .2;

    $("simRaw").textContent = raw ?? "—";
    $("meterFill").style.width = `${((raw ?? 0) / 4095) * 100}%`;
    $("stText").textContent = !live ? "Offline" : raw == null ? "Waiting…" : state === "alerted" ? "Carer alerted" : state === "timing" ? `Wet · ${Math.ceil(Math.max(0, CFG.alertAfterMs - (now - timingSince)) / 1000)}s` : raw < 3900 ? "Damp" : "Dry";

    controls.update();
    renderer.render(scene, camera);
    tagDefs.forEach(([, obj, off], i) => {
      const p = obj.localToWorld(off.clone()).project(camera);
      tagEls[i].style.left = `${(p.x * .5 + .5) * hw}px`; tagEls[i].style.top = `${(-p.y * .5 + .5) * hh}px`;
    });
    requestAnimationFrame(loop);
  }
  setState("dry");
}

/* =====================================================================
   2) THE CLIP: sleek soft-touch shell, exploded on scroll
   ===================================================================== */
{
  const section = $("clip"), canvas = $("clipCanvas"), host = canvas.parentElement;
  const renderer = makeRenderer(canvas);
  renderer.toneMappingExposure = 1.15;
  const scene = new THREE.Scene();
  scene.environment = studioEnv(renderer);
  const camera = new THREE.PerspectiveCamera(22, 1, .1, 100);
  const key = new THREE.DirectionalLight(0xffffff, 1.4); key.position.set(-4, 12, 6); key.castShadow = true; key.shadow.mapSize.set(2048, 2048);
  Object.assign(key.shadow.camera, { left: -6, right: 6, top: 6, bottom: -6, near: 1, far: 40 }); key.shadow.radius = 12; key.shadow.blurSamples = 24; key.shadow.bias = -.0005;
  scene.add(key);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.ShadowMaterial({ opacity: .16 }));
  ground.rotation.x = -Math.PI / 2; ground.position.y = -1.75; ground.receiveShadow = true; scene.add(ground);

  const softTouch = phys({ color: 0x0f1012, roughness: .48, metalness: 0, sheen: .6, sheenRoughness: .4, sheenColor: 0x2c2e33, clearcoat: .35, clearcoatRoughness: .38 });
  const clip = new THREE.Group(); scene.add(clip);
  const W = 4.0, D = 2.8, parts = [];
  function part(obj, c, e, label, price) { addShadows(obj); clip.add(obj); parts.push({ obj, c, e, label, price }); }

  // Bottom shell + polished snap sockets
  const bottom = new THREE.Group();
  bottom.add(new THREE.Mesh(pillow(W, D, .44, 1.0, .2), softTouch));
  [-.78, .78].forEach((x) => {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(.24, .07, 20, 48), mats.steel); ring.rotation.x = Math.PI / 2; ring.position.set(x, -.24, 0); bottom.add(ring);
    const cup = new THREE.Mesh(new THREE.CylinderGeometry(.2, .24, .1, 40), mats.steel); cup.position.set(x, -.22, 0); bottom.add(cup);
    const inner = new THREE.Mesh(new THREE.CircleGeometry(.12, 32), std({ color: 0x2a2c2f, metalness: 1, roughness: .4 })); inner.rotation.x = Math.PI / 2; inner.position.set(x, -.275, 0); bottom.add(inner);
  });
  part(bottom, -.235, -1.45, "Stainless snaps to the garment", .10);

  // LiPo pouch with label and tabs
  const batt = new THREE.Group();
  const pouch = new THREE.Mesh(new RoundedBoxGeometry(2.8, .28, 1.85, 6, .12), phys({ color: 0xc9ccd0, metalness: .85, roughness: .32, clearcoat: .5 }));
  pouch.scale.y = 1; batt.add(pouch);
  const label = canvasTex(512, 340, (g) => { g.fillStyle = "#1b3d8f"; g.fillRect(0, 0, 512, 340); g.fillStyle = "#fff"; g.font = "700 46px Arial"; g.fillText("Li-Po", 30, 80); g.font = "500 34px Arial"; g.fillText("3.7V  120mAh", 30, 140); g.fillText("0.44Wh", 30, 190); g.font = "400 22px Arial"; g.fillText("Rechargeable · Do not puncture", 30, 300); });
  const lab = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.46), std({ map: label, roughness: .5 })); lab.rotation.x = -Math.PI / 2; lab.position.y = .142; batt.add(lab);
  [-.25, .25].forEach((z) => { const tab = new THREE.Mesh(new THREE.BoxGeometry(.4, .02, .18), mats.tin); tab.position.set(1.55, .0, z); batt.add(tab); });
  part(batt, .02, -.38, "Rechargeable cell + charging", 1.60);

  // Board: black PCB, shielded ESP32-C3 module, parts, LED, pogo pads
  const pcb = new THREE.Group();
  const pTex = pbrSet(700, 460, (g, c, r) => {
    g.fillStyle = c.base; g.beginPath(); g.roundRect(0, 0, 700, 460, 40); g.fill(); traces(g, c, r, 700, 460, 22, 4);
    g.fillStyle = c.gold; [[620, 90], [620, 370]].forEach(([x, y]) => { g.beginPath(); g.arc(x, y, 26, 0, 7); g.fill(); });
    g.fillStyle = c.silk; g.font = "600 18px Arial"; g.fillText("CAREVIEW CLIP r1", 400, 440);
  })({ base: "#0e0e0f", trace: "#19191b" });
  pcb.add(new THREE.Mesh(new RoundedBoxGeometry(3.5, .07, 2.3, 2, .02), std({ color: 0x0c0c0d, roughness: .5 })));
  const pTop = new THREE.Mesh(new THREE.PlaneGeometry(3.5, 2.3), std({ ...pTex, metalness: 1, roughness: 1, transparent: true })); pTop.rotation.x = -Math.PI / 2; pTop.position.y = .0355; pcb.add(pTop);
  const shieldTex = canvasTex(256, 256, (g) => { g.fillStyle = "#c9ccd0"; g.fillRect(0, 0, 256, 256); g.fillStyle = "#6c7076"; g.font = "700 30px Arial"; g.fillText("ESPRESSIF", 26, 70); g.font = "600 24px Arial"; g.fillText("ESP32-C3-MINI-1", 26, 112); g.font = "400 18px Arial"; g.fillText("WiFi · BLE 5", 26, 148); });
  const can = new THREE.Mesh(new RoundedBoxGeometry(1.3, .2, 1.25, 2, .02), [mats.steel, mats.steel, std({ map: shieldTex, metalness: 1, roughness: .3 }), mats.steel, mats.steel, mats.steel]);
  can.position.set(-.75, .135, 0); pcb.add(can);
  const ant = new THREE.Mesh(new THREE.BoxGeometry(.45, .04, 1.25), std({ color: 0x070707, roughness: .4 })); ant.position.set(-1.6, .055, 0); pcb.add(ant);
  soic(pcb, .55, .035, .3, .45, .35);
  const rnd2 = mulberry(11);
  for (let i = 0; i < 12; i++) smd(pcb, .1 + rnd2() * 1.1, .035, -.9 + rnd2() * .5, .16, .08, rnd2() < .5 ? mats.smdBlack : mats.smdTan, rnd2() < .5 ? 0 : Math.PI / 2);
  const ledB = new THREE.Mesh(new THREE.BoxGeometry(.16, .07, .12), new THREE.MeshBasicMaterial({ color: 0x3fbf7f })); ledB.position.set(1.45, .07, .85); pcb.add(ledB);
  part(pcb, .2, .78, "Wi-Fi + Bluetooth board", 2.0 * .78 + .20 + .30 + .12);

  // NFC tag: copper spiral on white PET
  const nfcTex = canvasTex(512, 512, (g) => {
    g.fillStyle = "rgba(0,0,0,0)"; g.clearRect(0, 0, 512, 512);
    g.fillStyle = "#f3f2ef"; g.beginPath(); g.roundRect(6, 6, 500, 500, 70); g.fill();
    g.strokeStyle = "#c27c3a"; g.lineWidth = 7;
    for (let i = 0; i < 7; i++) { const m = 40 + i * 17; g.beginPath(); g.roundRect(m, m, 512 - m * 2, 512 - m * 2, 60 - i * 6); g.stroke(); }
    g.fillStyle = "#2a2a2a"; g.fillRect(232, 232, 48, 48);
  });
  const nfc = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.5), std({ map: nfcTex, transparent: true, roughness: .45, metalness: .2, side: THREE.DoubleSide }));
  nfc.rotation.x = -Math.PI / 2;
  part(nfc, .335, 1.78, "NFC personal ID tag", .20);

  // Top shell: soft-touch, parting line, LED pinhole, etched wordmark
  const topShell = new THREE.Group();
  topShell.add(new THREE.Mesh(pillow(W, D, .58, 1.0, .26), softTouch));
  const word = canvasTex(1024, 256, (g) => { g.fillStyle = "rgba(255,255,255,.22)"; g.font = "500 120px Inter Tight, Arial"; g.textAlign = "center"; g.fillText("careview.", 512, 170); });
  const wordPlane = new THREE.Mesh(new THREE.PlaneGeometry(1.7, .42), new THREE.MeshBasicMaterial({ map: word, transparent: true, depthWrite: false }));
  wordPlane.rotation.x = -Math.PI / 2; wordPlane.position.set(-.35, .2905, .25); topShell.add(wordPlane);
  const pin = new THREE.Mesh(new THREE.CircleGeometry(.055, 24), new THREE.MeshBasicMaterial({ color: 0x5dff9e })); pin.rotation.x = -Math.PI / 2; pin.position.set(1.35, .291, -.8); topShell.add(pin);
  const pinGlow = glowSprite(0x2fd27a, .24); pinGlow.material.blending = THREE.NormalBlending; pinGlow.position.set(1.35, .33, -.8); topShell.add(pinGlow);
  part(topShell, .53, 2.9, "Sealed soft-touch shell", .90);

  const plabels = parts.map((p) => { const e = document.createElement("div"); e.className = "plabel"; e.innerHTML = `<span>${p.label}</span><em>£${p.price.toFixed(2)}</em>`; e.style.opacity = 0; $("plabels").append(e); return e; });
  const total = window.CLIP_COST || 5.98;
  const ease = (x) => x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;

  let running = false;
  visible(section, (v) => { const was = running; running = v; if (v && !was) requestAnimationFrame(loop); });
  function loop(now) {
    if (!running) return;
    fit(renderer, camera, host);
    const r = section.getBoundingClientRect();
    const prog = Math.min(1, Math.max(0, -r.top / (r.height - innerHeight)));
    const t = ease(Math.min(1, Math.max(0, (prog - .12) / .55)));
    parts.forEach((p) => (p.obj.position.y = p.c + (p.e - p.c) * t));
    clip.rotation.set(-.12 + t * .08, -.6 + prog * .9 + Math.sin(now / 3000) * .05, 0);
    pinGlow.material.opacity = .7 + Math.sin(now / 500) * .3;
    const portrait = host.clientWidth < host.clientHeight;
    camera.position.set(0, 7 + t * 1.5, portrait ? 24 : 15 + t * 5);
    camera.lookAt(0, .45 + t * .55, 0);
    renderer.render(scene, camera);
    const show = t > .85 ? (t - .85) / .15 : 0, w = host.clientWidth, h = host.clientHeight;
    parts.forEach((p, i) => {
      const v = p.obj.localToWorld(new THREE.Vector3(W / 2 + .2, 0, 0)).project(camera);
      plabels[i].style.left = `${(v.x * .5 + .5) * w}px`; plabels[i].style.top = `${(-v.y * .5 + .5) * h}px`;
      plabels[i].style.opacity = portrait ? 0 : show;
    });
    $("clipPrice").textContent = "£" + (total * Math.min(1, prog * 1.6)).toFixed(2);
    requestAnimationFrame(loop);
  }
}
