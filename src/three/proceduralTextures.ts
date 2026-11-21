import * as THREE from 'three';

const SANS_FONT = '"IBM Plex Sans", "Segoe UI", Arial, sans-serif';
const CONDENSED_FONT = '"IBM Plex Sans Condensed", "Segoe UI", Arial, sans-serif';
const MONO_FONT = '"IBM Plex Mono", "Courier New", monospace';
const SERIF_FONT = '"Source Serif 4", Georgia, serif';

function configureCrispTextTexture(canvas: HTMLCanvasElement): THREE.CanvasTexture {
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.anisotropy = 16;
  texture.needsUpdate = true;
  return texture;
}

function createSeededRandom(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/**
 * Creates high-fidelity realistic modern CNC workshop sealed concrete / epoxy floor texture:
 * - Multi-scale concrete trowel variation and fine mineral aggregate
 * - Chamfered concrete slab expansion joints with recessed shadow + micro highlight
 * - Bolted cast-iron floor drain grates
 * - Subtle maintenance scuff patina and faint workshop wear
 */
export function createRealisticFactoryFloorTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d')!;
  const rand = createSeededRandom(4219);

  // 1. Base modern CNC facility sealed light-slate epoxy concrete
  ctx.fillStyle = '#a4aebc';
  ctx.fillRect(0, 0, 1024, 1024);

  // 2. Subtle large-scale concrete trowel clouds & natural tonal variation
  for (let i = 0; i < 64; i++) {
    const cx = rand() * 1024;
    const cy = rand() * 1024;
    const r = 60 + rand() * 150;
    const isLight = rand() > 0.48;
    const grad = ctx.createRadialGradient(cx, cy, 4, cx, cy, r);
    grad.addColorStop(0, isLight ? 'rgba(226, 232, 240, 0.14)' : 'rgba(71, 85, 105, 0.13)');
    grad.addColorStop(1, 'rgba(148, 163, 184, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // 3. Fine mineral cement aggregate grain
  const imgData = ctx.getImageData(0, 0, 1024, 1024);
  const data = imgData.data;
  for (let i = 0; i < data.length; i += 4) {
    const noise = (rand() - 0.5) * 16;
    data[i] = Math.min(255, Math.max(0, data[i] + noise));
    data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + noise));
    data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + noise));
  }
  ctx.putImageData(imgData, 0, 0);

  // 4. Concrete slab expansion joints (chamfered groove: dark shadow + soft highlight lip)
  for (let pos = 256; pos < 1024; pos += 256) {
    ctx.strokeStyle = 'rgba(30, 41, 59, 0.52)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(pos, 0);
    ctx.lineTo(pos, 1024);
    ctx.moveTo(0, pos);
    ctx.lineTo(1024, pos);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(241, 245, 249, 0.28)';
    ctx.lineWidth = 1.25;
    ctx.beginPath();
    ctx.moveTo(pos + 2, 0);
    ctx.lineTo(pos + 2, 1024);
    ctx.moveTo(0, pos + 2);
    ctx.lineTo(1024, pos + 2);
    ctx.stroke();
  }

  // 5. Industrial recessed cast-iron floor drain grates
  const drainLocations = [
    { x: 128, y: 128 },
    { x: 896, y: 128 },
    { x: 128, y: 896 },
    { x: 896, y: 896 },
    { x: 512, y: 512 }
  ];

  drainLocations.forEach(d => {
    // Subtle recessed concrete collar shadow
    ctx.fillStyle = 'rgba(15, 23, 42, 0.22)';
    ctx.fillRect(d.x - 40, d.y - 40, 80, 80);

    // Outer cast-iron frame
    ctx.fillStyle = '#334155';
    ctx.fillRect(d.x - 36, d.y - 36, 72, 72);
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 2;
    ctx.strokeRect(d.x - 35, d.y - 35, 70, 70);

    ctx.fillStyle = '#1e293b';
    ctx.fillRect(d.x - 30, d.y - 30, 60, 60);

    // Drain slots
    ctx.fillStyle = '#0f172a';
    for (let s = -22; s <= 22; s += 8) {
      ctx.fillRect(d.x - 24, d.y + s, 48, 4);
    }
    // Corner hex bolts
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(d.x - 33, d.y - 33, 4, 4);
    ctx.fillRect(d.x + 29, d.y - 33, 4, 4);
    ctx.fillRect(d.x - 33, d.y + 29, 4, 4);
    ctx.fillRect(d.x + 29, d.y + 29, 4, 4);
  });

  // 6. Sparingly distributed subtle workshop micro-imperfections and forklift tire patina
  const wearSpots = [
    { x: 340, y: 420, r: 22, alpha: 0.11 },
    { x: 710, y: 310, r: 26, alpha: 0.12 },
    { x: 420, y: 780, r: 18, alpha: 0.09 },
    { x: 820, y: 640, r: 24, alpha: 0.11 },
  ];
  wearSpots.forEach(s => {
    const grad = ctx.createRadialGradient(s.x, s.y, 2, s.x, s.y, s.r);
    grad.addColorStop(0, `rgba(71, 85, 105, ${s.alpha})`);
    grad.addColorStop(0.65, `rgba(100, 116, 139, ${s.alpha * 0.45})`);
    grad.addColorStop(1, 'rgba(100, 116, 139, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fill();
  });

  // Faint rubber tire tracks
  ctx.strokeStyle = 'rgba(30, 41, 59, 0.10)';
  ctx.lineWidth = 12;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(210, 480);
  ctx.bezierCurveTo(280, 492, 360, 472, 440, 486);
  ctx.moveTo(600, 720);
  ctx.bezierCurveTo(670, 738, 760, 712, 825, 728);
  ctx.stroke();

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(4, 4);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.anisotropy = 16;
  return texture;
}

/**
 * Paired roughness map for realistic sealed industrial epoxy-concrete floor reflections:
 * Lower luminance = glossier sealed sheen; higher luminance = matte expansion joints & subtle wear
 */
export function createFactoryFloorRoughnessTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;
  const rand = createSeededRandom(8841);

  // Base satin-polished concrete epoxy (~0.45 roughness)
  ctx.fillStyle = '#747474';
  ctx.fillRect(0, 0, 512, 512);

  // Subtle glossy sheen patches & slightly worn matte areas
  for (let i = 0; i < 55; i++) {
    const cx = rand() * 512;
    const cy = rand() * 512;
    const r = 28 + rand() * 75;
    const glossy = rand() > 0.45;
    const grad = ctx.createRadialGradient(cx, cy, 2, cx, cy, r);
    grad.addColorStop(0, glossy ? 'rgba(62, 62, 62, 0.35)' : 'rgba(155, 155, 155, 0.28)');
    grad.addColorStop(1, 'rgba(116, 116, 116, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Matte expansion joints aligned with floor tile grid (512 / 4 = 128)
  ctx.strokeStyle = '#c8c8c8';
  ctx.lineWidth = 3;
  ctx.beginPath();
  for (let p = 128; p < 512; p += 128) {
    ctx.moveTo(p, 0);
    ctx.lineTo(p, 512);
    ctx.moveTo(0, p);
    ctx.lineTo(512, p);
  }
  ctx.stroke();

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(4, 4);
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.anisotropy = 16;
  return texture;
}

/**
 * Creates realistic industrial safety-green epoxy pedestrian walkway texture
 * with anti-slip micro-grain, subtle foot-traffic patina, and crisp painted lane borders
 */
export function createWalkwayTexture(orientation: 'vertical' | 'horizontal' = 'vertical'): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;
  const rand = createSeededRandom(orientation === 'vertical' ? 3107 : 6199);

  // Realistic satin ISO industrial walkway green
  ctx.fillStyle = '#1b6b41';
  ctx.fillRect(0, 0, 512, 512);

  // Subtle foot-traffic sheen variation along center of walkway
  const centerGrad = orientation === 'vertical'
    ? ctx.createLinearGradient(0, 0, 512, 0)
    : ctx.createLinearGradient(0, 0, 0, 512);
  centerGrad.addColorStop(0, 'rgba(15, 23, 42, 0.14)');
  centerGrad.addColorStop(0.18, 'rgba(255, 255, 255, 0.03)');
  centerGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.08)');
  centerGrad.addColorStop(0.82, 'rgba(255, 255, 255, 0.03)');
  centerGrad.addColorStop(1, 'rgba(15, 23, 42, 0.14)');
  ctx.fillStyle = centerGrad;
  ctx.fillRect(0, 0, 512, 512);

  // Fine anti-slip quartz aggregate grain
  const imgData = ctx.getImageData(0, 0, 512, 512);
  const data = imgData.data;
  for (let i = 0; i < data.length; i += 4) {
    const n = (rand() - 0.5) * 14;
    data[i] = Math.min(255, Math.max(0, data[i] + n));
    data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + n));
    data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + n));
  }
  ctx.putImageData(imgData, 0, 0);

  // Crisp painted safety-yellow outer edge borders
  const stripeW = 24;
  ctx.fillStyle = '#eab308';
  if (orientation === 'vertical') {
    ctx.fillRect(10, 0, stripeW, 512);
    ctx.fillRect(512 - 10 - stripeW, 0, stripeW, 512);
    // Crisp dark divider hairline
    ctx.fillStyle = 'rgba(15, 23, 42, 0.35)';
    ctx.fillRect(10 + stripeW, 0, 3, 512);
    ctx.fillRect(512 - 13 - stripeW, 0, 3, 512);
  } else {
    ctx.fillRect(0, 10, 512, stripeW);
    ctx.fillRect(0, 512 - 10 - stripeW, 512, stripeW);
    ctx.fillStyle = 'rgba(15, 23, 42, 0.35)';
    ctx.fillRect(0, 10 + stripeW, 512, 3);
    ctx.fillRect(0, 512 - 13 - stripeW, 512, 3);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(orientation === 'vertical' ? 1 : 10, orientation === 'vertical' ? 9 : 1);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.anisotropy = 16;
  return texture;
}

/**
 * Modern CNC work-cell bay pad texture (1024x720 matching exact 10.2m x 7.2m bay footprint):
 * - Dark slate anti-slip epoxy machine pad interior with subtle micro-grain
 * - Crisp painted diagonal OSHA yellow-black hazard border strictly around the perimeter frame
 */
export function createWorkCellPerimeterTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 720;
  const ctx = canvas.getContext('2d')!;
  const rand = createSeededRandom(7331);

  // 1. Outer perimeter yellow-black diagonal hazard stripe base
  ctx.fillStyle = '#eab308';
  ctx.fillRect(0, 0, 1024, 720);

  ctx.fillStyle = '#1e293b';
  const step = 44;
  for (let i = -720; i < 1744; i += step) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i + step * 0.5, 0);
    ctx.lineTo(i + step * 0.5 + 720, 720);
    ctx.lineTo(i + 720, 720);
    ctx.closePath();
    ctx.fill();
  }

  // Subtle dark outer trim frame
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 6;
  ctx.strokeRect(3, 3, 1018, 714);

  // 2. Clean dark slate epoxy CNC work-cell interior pad (leaves crisp 30px perimeter hazard band)
  const border = 30;
  ctx.fillStyle = '#606d7d';
  ctx.fillRect(border, border, 1024 - border * 2, 720 - border * 2);

  // Subtle radial darkening toward center for grounded depth
  const padGrad = ctx.createRadialGradient(512, 360, 80, 512, 360, 520);
  padGrad.addColorStop(0, 'rgba(30, 41, 59, 0.16)');
  padGrad.addColorStop(1, 'rgba(15, 23, 42, 0.02)');
  ctx.fillStyle = padGrad;
  ctx.fillRect(border, border, 1024 - border * 2, 720 - border * 2);

  // Fine anti-slip epoxy micro-grain inside the work cell pad
  const imgData = ctx.getImageData(border, border, 1024 - border * 2, 720 - border * 2);
  const data = imgData.data;
  for (let i = 0; i < data.length; i += 4) {
    const n = (rand() - 0.5) * 12;
    data[i] = Math.min(255, Math.max(0, data[i] + n));
    data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + n));
    data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + n));
  }
  ctx.putImageData(imgData, border, border);

  // Crisp inner perimeter line separating hazard band and bay epoxy
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 4;
  ctx.strokeRect(border, border, 1024 - border * 2, 720 - border * 2);

  // Subtle inner floor expansion seams inside the bay
  ctx.strokeStyle = 'rgba(15, 23, 42, 0.24)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(512, border);
  ctx.lineTo(512, 720 - border);
  ctx.moveTo(border, 360);
  ctx.lineTo(1024 - border, 360);
  ctx.stroke();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.anisotropy = 16;
  return texture;
}

/**
 * Creates perforated galvanized cable tray texture with ventilation slots
 */
export function createCableTrayTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#64748b'; // Galvanized zinc steel
  ctx.fillRect(0, 0, 256, 256);

  // Perforated slot pattern
  ctx.fillStyle = '#1e293b';
  for (let y = 16; y < 256; y += 32) {
    for (let x = 16; x < 256; x += 48) {
      ctx.beginPath();
      ctx.roundRect(x, y, 32, 12, 4);
      ctx.fill();
    }
  }

  // Edge flanges
  ctx.fillStyle = '#475569';
  ctx.fillRect(0, 0, 256, 6);
  ctx.fillRect(0, 250, 256, 6);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(6, 1);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.anisotropy = 16;
  return texture;
}

/**
 * Generates ultra-high-resolution (2048x572, exact 3.58:1 aspect match to 3.4x0.95 board) canvas texture
 * for formal 3D Machine Name Boards with 16x anisotropy so text stays razor sharp without stretching
 */
export function createMachineNameBoardTexture(
  code: string,
  fullName: string,
  fluidInfo: string,
  isAlert: boolean = false
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 2048;
  canvas.height = 572;
  const ctx = canvas.getContext('2d')!;
  ctx.scale(1, 572 / 640);

  // Solid deep-navy / alert-red background plate
  ctx.fillStyle = isAlert ? '#3a0808' : '#071324';
  ctx.beginPath();
  ctx.roundRect(16, 16, 2016, 608, 32);
  ctx.fill();

  // Vibrant thick outer border
  ctx.strokeStyle = isAlert ? '#ef4444' : '#1FA5A0';
  ctx.lineWidth = 18;
  ctx.beginPath();
  ctx.roundRect(16, 16, 2016, 608, 32);
  ctx.stroke();

  // Machine Code Badge (e.g. "M1", "M2", "M3", "M4")
  ctx.fillStyle = isAlert ? '#ef4444' : '#1FA5A0';
  ctx.beginPath();
  ctx.roundRect(50, 50, 260, 190, 22);
  ctx.fill();

  ctx.fillStyle = '#071324';
  ctx.font = `700 140px ${SANS_FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(code, 180, 148);

  // Machine Full Name (e.g. "HYDRAULIC PRESS")
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#ffffff';
  ctx.font = `700 120px ${SANS_FONT}`;
  ctx.fillText(fullName.toUpperCase(), 350, 185);

  // Subtitle / Fluid specification bar
  ctx.fillStyle = isAlert ? '#fecaca' : '#38bdf8';
  ctx.font = `700 62px ${MONO_FONT}`;
  ctx.fillText(fluidInfo.toUpperCase(), 50, 345);

  // Status indicator pill
  const statusW = 640;
  ctx.fillStyle = isAlert ? '#dc2626' : '#166534';
  ctx.beginPath();
  ctx.roundRect(50, 420, statusW, 110, 18);
  ctx.fill();
  ctx.strokeStyle = isAlert ? '#fca5a5' : '#4ade80';
  ctx.lineWidth = 6;
  ctx.stroke();

  // Status text inside pill
  ctx.fillStyle = '#ffffff';
  ctx.font = `700 52px ${MONO_FONT}`;
  ctx.fillText(isAlert ? 'STATUS: LEAK ALERT' : 'STATUS: NORMAL', 90, 495);

  // Dual-Zone System Hardware spec on right
  ctx.fillStyle = '#e2e8f0';
  ctx.font = `700 46px ${MONO_FONT}`;
  ctx.textAlign = 'right';
  ctx.fillText('DRIPWATCH 2-ZONE SYSTEM', 1980, 495);

  return configureCrispTextTexture(canvas);
}

/**
 * Generates ultra-high-resolution (2048x1296, exact 1.58:1 aspect match to 0.98x0.62 display)
 * live display texture for each machine's local Node/CPU Box
 */
export function createNodeBoxLabelTexture(
  nodeName: string,
  displayStatus: 'NORMAL' | 'PROCESSING' | 'LEAK DETECTED' | boolean = 'NORMAL',
  detectedFluid: 'oil' | 'coolant' | null = null
): THREE.CanvasTexture {
  const status: 'NORMAL' | 'PROCESSING' | 'LEAK DETECTED' =
    typeof displayStatus === 'boolean' ? (displayStatus ? 'LEAK DETECTED' : 'NORMAL') : displayStatus;

  const canvas = document.createElement('canvas');
  canvas.width = 2048;
  canvas.height = 1296;
  const ctx = canvas.getContext('2d')!;
  ctx.scale(2, 1296 / 640);

  const isAlert = status === 'LEAK DETECTED';
  const isProc = status === 'PROCESSING';

  ctx.fillStyle = isAlert ? '#3b0a0a' : isProc ? '#2d1c05' : '#0B1F3A';
  ctx.fillRect(0, 0, 1024, 640);

  ctx.strokeStyle = isAlert ? '#ef4444' : isProc ? '#f59e0b' : '#1FA5A0';
  ctx.lineWidth = 22;
  ctx.strokeRect(11, 11, 1002, 618);

  // Header
  ctx.fillStyle = isAlert ? '#fca5a5' : isProc ? '#fcd34d' : '#38bdf8';
  ctx.font = `700 50px ${MONO_FONT}`;
  ctx.fillText('LOCAL NODE / CPU BOX', 48, 92);

  // Machine Title
  ctx.fillStyle = '#ffffff';
  ctx.font = `700 112px ${SANS_FONT}`;
  ctx.fillText(nodeName.toUpperCase(), 48, 224);

  // Prominent Status Pill
  ctx.fillStyle = isAlert ? '#dc2626' : isProc ? '#d97706' : '#166534';
  ctx.beginPath();
  ctx.roundRect(48, 272, 928, 160, 22);
  ctx.fill();
  ctx.strokeStyle = isAlert ? '#fecaca' : isProc ? '#fde68a' : '#4ade80';
  ctx.lineWidth = 8;
  ctx.stroke();

  ctx.fillStyle = '#ffffff';
  ctx.font = `700 82px ${MONO_FONT}`;
  ctx.fillText(status, 86, 378);

  // Fluid / Channel readout line
  ctx.fillStyle = isAlert || isProc ? '#fef08a' : '#cbd5e1';
  ctx.font = `700 36px ${MONO_FONT}`;
  const detailText =
    isAlert && detectedFluid
      ? `TYPE: ${detectedFluid.toUpperCase()} LEAK • TX COMPARTMENT`
      : isProc && detectedFluid
        ? `ANALYZING ${detectedFluid.toUpperCase()} ELECTRODE SIGNAL...`
        : 'DUAL ELECTRODE INPUT • STANDBY';
  ctx.fillText(detailText, 48, 540);

  return configureCrispTextTexture(canvas);
}

/**
 * Generates ultra-high-resolution (2048x1232, exact 1.662:1 aspect match to 2.26x1.36 screen)
 * display texture for the central General Compartment Box
 */
export function createGeneralCompartmentTexture(
  alerts: Array<{ machineId: string; fluid: 'oil' | 'coolant' }>
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 2048;
  canvas.height = 1232;
  const ctx = canvas.getContext('2d')!;
  ctx.scale(2048 / 1280, 1232 / 768);

  const hasAlert = alerts.length > 0;

  // Outer panel background
  ctx.fillStyle = hasAlert ? '#2b0909' : '#071324';
  ctx.fillRect(0, 0, 1280, 768);

  ctx.strokeStyle = hasAlert ? '#ef4444' : '#1FA5A0';
  ctx.lineWidth = 20;
  ctx.strokeRect(10, 10, 1260, 748);

  // Header Bar
  ctx.fillStyle = hasAlert ? '#7f1d1d' : '#0B1F3A';
  ctx.fillRect(20, 20, 1240, 120);

  ctx.fillStyle = '#ffffff';
  ctx.font = `700 62px ${SANS_FONT}`;
  ctx.textAlign = 'left';
  ctx.fillText('GENERAL COMPARTMENT BOX', 50, 100);

  // Top Status Banner
  if (hasAlert) {
    const primary = alerts[0];
    const mNum = primary.machineId.toUpperCase().replace('M', 'MACHINE 0');
    const fluidLabel = primary.fluid.toUpperCase();
    ctx.fillStyle = '#dc2626';
    ctx.beginPath();
    ctx.roundRect(44, 168, 1192, 164, 18);
    ctx.fill();
    ctx.strokeStyle = '#fecaca';
    ctx.lineWidth = 6;
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = `700 54px ${SANS_FONT}`;
    ctx.fillText(`LEAK ALERT: ${mNum}`, 78, 240);

    ctx.fillStyle = primary.fluid === 'oil' ? '#fde68a' : '#a5f3fc';
    ctx.font = `700 46px ${MONO_FONT}`;
    ctx.fillText(`LEAKAGE TYPE: ${fluidLabel} DETECTED`, 78, 304);
  } else {
    ctx.fillStyle = '#14532d';
    ctx.beginPath();
    ctx.roundRect(44, 168, 1192, 140, 18);
    ctx.fill();
    ctx.strokeStyle = '#4ade80';
    ctx.lineWidth = 5;
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = `700 56px ${MONO_FONT}`;
    ctx.fillText('PLANT STATUS: NORMAL', 78, 258);
  }

  // 4 Machine Channel Cells (M1, M2, M3, M4)
  const slots: Array<{ id: string; x: number; y: number }> = [
    { id: 'm1', x: 44, y: 368 },
    { id: 'm2', x: 656, y: 368 },
    { id: 'm3', x: 44, y: 556 },
    { id: 'm4', x: 656, y: 556 },
  ];

  slots.forEach(s => {
    const match = alerts.find(a => a.machineId === s.id);
    const isRowAlert = Boolean(match);
    ctx.fillStyle = isRowAlert ? '#450a0a' : '#0B1F3A';
    ctx.beginPath();
    ctx.roundRect(s.x, s.y, 580, 164, 14);
    ctx.fill();

    ctx.strokeStyle = isRowAlert ? '#ef4444' : '#1E3557';
    ctx.lineWidth = 5;
    ctx.stroke();

    // Status LED circle
    ctx.fillStyle = isRowAlert ? '#ef4444' : '#22c55e';
    ctx.beginPath();
    ctx.arc(s.x + 52, s.y + 82, 22, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = `700 44px ${SANS_FONT}`;
    ctx.fillText(s.id.toUpperCase().replace('M', 'MACHINE 0'), s.x + 96, s.y + 72);

    ctx.fillStyle = isRowAlert
      ? match!.fluid === 'oil' ? '#fbbf24' : '#38bdf8'
      : '#4ade80';
    ctx.font = `700 36px ${MONO_FONT}`;
    ctx.fillText(isRowAlert ? `${match!.fluid.toUpperCase()} LEAK ALERT` : 'NORMAL', s.x + 96, s.y + 130);
  });

  return configureCrispTextTexture(canvas);
}

/**
 * Generates ultra-high-resolution (1920x594, exact 3.23:1 aspect match to 2.1x0.65 badge)
 * formal 3D Zone badges on drip tray with ZERO horizontal stretching
 */
export function createZoneLabelTexture(zoneName: string, subText: string, alert: boolean): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1920;
  canvas.height = 594;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = alert ? '#3b0a0a' : '#071324';
  ctx.beginPath();
  ctx.roundRect(18, 18, 1884, 558, 34);
  ctx.fill();

  ctx.strokeStyle = alert ? '#ef4444' : '#1FA5A0';
  ctx.lineWidth = 22;
  ctx.beginPath();
  ctx.roundRect(18, 18, 1884, 558, 34);
  ctx.stroke();

  // Status icon dot
  ctx.fillStyle = alert ? '#ef4444' : '#22c55e';
  ctx.beginPath();
  ctx.arc(130, 195, 52, 0, Math.PI * 2);
  ctx.fill();

  // Zone Name (e.g. "M1")
  ctx.fillStyle = '#ffffff';
  ctx.font = `700 176px ${SANS_FONT}`;
  ctx.textAlign = 'left';
  ctx.fillText(zoneName, 225, 250);

  // SubText (Collection Tray)
  ctx.fillStyle = alert ? '#fecaca' : '#38bdf8';
  ctx.font = `700 96px ${MONO_FONT}`;
  ctx.fillText(subText.toUpperCase(), 560, 235);

  // DripWatch secondary containment label
  ctx.fillStyle = '#e2e8f0';
  ctx.font = `700 68px ${MONO_FONT}`;
  ctx.fillText('SECONDARY CONTAINMENT BASIN', 86, 465);

  return configureCrispTextTexture(canvas);
}

/**
 * Generates ultra-high-resolution (2048x576, exact 3.556:1 aspect match to 4.8x1.35 banner)
 * floating 3D alert banner above the active leaking machine & zone
 */
export function createLeakAlertBannerTexture(zoneTag: string, fluidType: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 2048;
  canvas.height = 576;
  const ctx = canvas.getContext('2d')!;
  ctx.scale(1, 576 / 600);

  const isOil = fluidType.toLowerCase().includes('oil');
  const accentColor = isOil ? '#fbbf24' : '#38bdf8';

  ctx.fillStyle = '#3a0808';
  ctx.beginPath();
  ctx.roundRect(16, 16, 2016, 568, 32);
  ctx.fill();

  ctx.strokeStyle = '#ef4444';
  ctx.lineWidth = 22;
  ctx.beginPath();
  ctx.roundRect(16, 16, 2016, 568, 32);
  ctx.stroke();

  // Alert Badge Headline
  const headline = isOil ? 'OIL LEAK DETECTED' : 'COOLANT LEAK DETECTED';
  ctx.fillStyle = '#dc2626';
  ctx.beginPath();
  ctx.roundRect(50, 45, 980, 110, 18);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.font = `700 66px ${SANS_FONT}`;
  ctx.fillText(`⚠️ ${headline}`, 80, 122);

  // Zone Tag
  ctx.fillStyle = '#ffffff';
  ctx.font = `700 122px ${SANS_FONT}`;
  ctx.fillText(`${headline} – ${zoneTag}`, 50, 315);

  // Fluid Details & Latching
  ctx.fillStyle = accentColor;
  ctx.font = `700 62px ${MONO_FONT}`;
  ctx.fillText(isOil ? 'HAZARD: HYDRAULIC OIL • ZONE LATCHED' : 'HAZARD: CONDUCTIVE COOLANT • ZONE LATCHED', 50, 450);

  return configureCrispTextTexture(canvas);
}

/**
 * Generates high-resolution floating "WET" indicator badge above touched sensor
 */
export function createWetBadgeTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 768;
  canvas.height = 320;
  const ctx = canvas.getContext('2d')!;
  ctx.scale(2, 2);

  ctx.fillStyle = 'rgba(7, 19, 36, 0.96)';
  ctx.beginPath();
  ctx.roundRect(8, 8, 368, 144, 24);
  ctx.fill();

  ctx.strokeStyle = '#22d3ee';
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.roundRect(8, 8, 368, 144, 24);
  ctx.stroke();

  // Cyan dot
  ctx.fillStyle = '#06b6d4';
  ctx.beginPath();
  ctx.arc(64, 80, 24, 0, Math.PI * 2);
  ctx.fill();

  // WET Text
  ctx.fillStyle = '#ffffff';
  ctx.font = `700 72px ${SANS_FONT}`;
  ctx.fillText('WET', 110, 105);

  return configureCrispTextTexture(canvas);
}

/**
 * Creates ultra-crisp high-contrast engraved metallic nameplate texture (1280x356, exact 3.59:1 match to 0.86x0.24)
 * for detection electrodes: "OIL ELECTRODE" or "COOLANT ELECTRODE"
 */
export function createElectrodeTagTexture(type: 'oil' | 'coolant'): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1280;
  canvas.height = 356;
  const ctx = canvas.getContext('2d')!;
  ctx.scale(2, 356 / 176);

  // Brushed dark steel plate
  ctx.fillStyle = '#071324';
  ctx.beginPath();
  ctx.roundRect(6, 6, 628, 164, 16);
  ctx.fill();

  const isOil = type === 'oil';
  const accentColor = isOil ? '#f59e0b' : '#22d3ee';

  // Metallic border
  ctx.strokeStyle = accentColor;
  ctx.lineWidth = 9;
  ctx.beginPath();
  ctx.roundRect(6, 6, 628, 164, 16);
  ctx.stroke();

  // Fastener rivets in corners
  ctx.fillStyle = '#94a3b8';
  [[24, 24], [616, 24], [24, 152], [616, 152]].forEach(([rx, ry]) => {
    ctx.beginPath();
    ctx.arc(rx, ry, 6, 0, Math.PI * 2);
    ctx.fill();
  });

  // Electrode exact required label: OIL ELECTRODE / COOLANT ELECTRODE
  ctx.fillStyle = '#ffffff';
  ctx.font = `700 50px ${SANS_FONT}`;
  ctx.textAlign = 'center';
  ctx.fillText(isOil ? 'OIL ELECTRODE' : 'COOLANT ELECTRODE', 320, 82);

  ctx.fillStyle = accentColor;
  ctx.font = `700 30px ${MONO_FONT}`;
  ctx.fillText('CONDUCTIVE SENSOR ROD', 320, 134);

  return configureCrispTextTexture(canvas);
}

/**
 * Creates ultra-crisp floating active indicator badge (1200x400, exact 3.0:1 match to 0.84x0.28)
 * when liquid touches an electrode
 */
export function createElectrodeActiveBadgeTexture(type: 'oil' | 'coolant'): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1200;
  canvas.height = 400;
  const ctx = canvas.getContext('2d')!;
  ctx.scale(1200 / 512, 400 / 180);

  const isOil = type === 'oil';
  const accent = isOil ? '#fbbf24' : '#22d3ee';
  const bg = isOil ? 'rgba(40, 20, 5, 0.97)' : 'rgba(5, 25, 40, 0.97)';

  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.roundRect(8, 8, 496, 164, 20);
  ctx.fill();

  ctx.strokeStyle = accent;
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.roundRect(8, 8, 496, 164, 20);
  ctx.stroke();

  // Status Indicator Dot
  ctx.fillStyle = accent;
  ctx.beginPath();
  ctx.arc(54, 90, 22, 0, Math.PI * 2);
  ctx.fill();

  // Text
  ctx.fillStyle = '#ffffff';
  ctx.font = `700 35px ${SANS_FONT}`;
  ctx.textAlign = 'left';
  ctx.fillText(isOil ? 'OIL DETECTED' : 'COOLANT DETECTED', 92, 86);

  ctx.fillStyle = accent;
  ctx.font = `700 25px ${MONO_FONT}`;
  ctx.fillText('ELECTRODE CONTACT', 92, 132);

  return configureCrispTextTexture(canvas);
}

/**
 * Generates ultra-sharp detection chain banner (2048x576, exact 3.556:1 match to 4.8x1.35 plane)
 */
export function createDetectionChainLabelTexture(
  machineId: string,
  zoneId: string,
  fluid: string
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 2048;
  canvas.height = 576;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = 'rgba(58, 8, 8, 0.97)';
  ctx.beginPath();
  ctx.roundRect(18, 18, 2012, 540, 34);
  ctx.fill();

  ctx.strokeStyle = '#ef4444';
  ctx.lineWidth = 20;
  ctx.beginPath();
  ctx.roundRect(18, 18, 2012, 540, 34);
  ctx.stroke();

  // Red beacon dot
  ctx.fillStyle = '#dc2626';
  ctx.beginPath();
  ctx.arc(118, 288, 52, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#fecaca';
  ctx.lineWidth = 8;
  ctx.stroke();

  const zLabel = zoneId === 'z1' ? 'Zone 1' : 'Zone 2';
  const mLabel = machineId.toUpperCase();
  const isOil = fluid.toLowerCase().includes('oil');
  const alertTitle = isOil ? 'OIL LEAK DETECTED' : 'COOLANT LEAK DETECTED';

  ctx.fillStyle = '#ffffff';
  ctx.font = `700 94px ${SANS_FONT}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(`${alertTitle} – ${mLabel} ${zLabel.toUpperCase()}`, 212, 294);

  return configureCrispTextTexture(canvas);
}

/**
 * Floor Safety Walkway Texture (clean yellow/charcoal warning hazard borders)
 */
export function createHazardStripesTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#d97706'; // Safety yellow-amber
  ctx.fillRect(0, 0, 256, 256);

  ctx.fillStyle = '#1e293b'; // Slate charcoal stripe
  ctx.lineWidth = 32;

  for (let i = -256; i < 512; i += 64) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i + 64, 256);
    ctx.lineTo(i + 32, 256);
    ctx.lineTo(i - 32, 0);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(10, 1);
  return texture;
}

/**
 * Generates an active 3D Control Room Dashboard Texture (1024x512 crisp)
 */
export function createControlRoomDashboardTexture(
  m1Status: string,
  m2Status: string,
  m3Status: string,
  m4Status: string
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;
  ctx.scale(2, 2);

  ctx.fillStyle = '#071324';
  ctx.fillRect(0, 0, 512, 256);

  ctx.fillStyle = '#0B1F3A';
  ctx.fillRect(0, 0, 512, 40);

  ctx.fillStyle = '#ffffff';
  ctx.font = `600 16px ${CONDENSED_FONT}`;
  ctx.fillText('DRIPWATCH PLANT SCADA - SECONDARY CONTAINMENT', 16, 26);

  // Machine status chips
  const chips = [
    { name: 'M1 Hydraulic Press', status: m1Status, x: 18, y: 56 },
    { name: 'M2 CNC Milling Unit', status: m2Status, x: 262, y: 56 },
    { name: 'M3 Industrial Lathe', status: m3Status, x: 18, y: 150 },
    { name: 'M4 Hydraulic Unit', status: m4Status, x: 262, y: 150 },
  ];

  chips.forEach((c) => {
    const isAlert = c.status === 'ALERT';
    ctx.fillStyle = isAlert ? '#3b1212' : '#0B1F3A';
    ctx.beginPath();
    ctx.roundRect(c.x, c.y, 232, 78, 6);
    ctx.fill();

    ctx.strokeStyle = isAlert ? '#C0392B' : '#1E3557';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(c.x, c.y, 232, 78, 6);
    ctx.stroke();

    ctx.fillStyle = '#f1f5f9';
    ctx.font = `600 16px ${CONDENSED_FONT}`;
    ctx.fillText(c.name, c.x + 12, c.y + 28);

    ctx.fillStyle = isAlert ? '#C0392B' : '#2E8540';
    ctx.beginPath();
    ctx.arc(c.x + 210, c.y + 22, 7, 0, Math.PI * 2);
    ctx.fill();

    ctx.font = `600 14px ${MONO_FONT}`;
    ctx.fillStyle = isAlert ? '#f87171' : '#4ade80';
    ctx.fillText(c.status, c.x + 12, c.y + 58);
  });

  return configureCrispTextTexture(canvas);
}

/**
 * Text badge texture for open controller PCB blocks (1080x200, exact 5.4:1 match to 0.54x0.10 plane)
 */
export function createBlockLabelTexture(title: string, sub: string, accentHex: string = '#1FA5A0'): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1080;
  canvas.height = 200;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = 'rgba(11, 31, 58, 0.96)';
  ctx.beginPath();
  ctx.roundRect(8, 8, 1064, 184, 12);
  ctx.fill();

  ctx.strokeStyle = accentHex;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.roundRect(8, 8, 1064, 184, 12);
  ctx.stroke();

  ctx.fillStyle = accentHex;
  ctx.font = `700 66px ${CONDENSED_FONT}`;
  ctx.textAlign = 'left';
  ctx.fillText(title, 36, 92);

  ctx.fillStyle = '#cbd5e1';
  ctx.font = `600 44px ${MONO_FONT}`;
  ctx.fillText(sub, 36, 156);

  return configureCrispTextTexture(canvas);
}

/**
 * Generates realistic machine warning labels (e.g. ISO 7010 caution triangle) at 1024x512
 */
export function createMachineWarningLabelTexture(text: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;
  ctx.scale(2, 2);

  ctx.fillStyle = '#f59e0b'; // High-vis Safety yellow-amber
  ctx.fillRect(0, 0, 512, 256);

  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 12;
  ctx.strokeRect(6, 6, 500, 244);

  // Warning Triangle
  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.moveTo(64, 192);
  ctx.lineTo(120, 64);
  ctx.lineTo(176, 192);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#f59e0b';
  ctx.fillRect(115, 100, 10, 52);
  ctx.beginPath();
  ctx.arc(120, 172, 7, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#0f172a';
  ctx.font = `700 36px ${MONO_FONT}`;
  ctx.fillText(text, 204, 140);

  return configureCrispTextTexture(canvas);
}

/**
 * Generates high-fidelity circular Bourdon tube pressure gauge face (1024x1024)
 */
export function createGaugeDialTexture(title: string, valueStr: string, unit: string = 'BAR', isAlert: boolean = false): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d')!;
  ctx.scale(2, 2);

  // Bezel outer ring
  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.arc(256, 256, 250, 0, Math.PI * 2);
  ctx.fill();

  // Dial white/ivory face
  ctx.fillStyle = '#f8fafc';
  ctx.beginPath();
  ctx.arc(256, 256, 230, 0, Math.PI * 2);
  ctx.fill();

  // Green normal operating arc (from 135 deg to 315 deg)
  ctx.strokeStyle = '#22c55e';
  ctx.lineWidth = 14;
  ctx.beginPath();
  ctx.arc(256, 256, 205, Math.PI * 0.75, Math.PI * 1.65);
  ctx.stroke();

  // Red caution/overpressure arc
  ctx.strokeStyle = '#ef4444';
  ctx.lineWidth = 14;
  ctx.beginPath();
  ctx.arc(256, 256, 205, Math.PI * 1.65, Math.PI * 2.25);
  ctx.stroke();

  // Tick marks and graduations
  ctx.strokeStyle = '#1e293b';
  ctx.fillStyle = '#0f172a';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `700 24px ${MONO_FONT}`;

  for (let i = 0; i <= 10; i++) {
    const angle = Math.PI * 0.75 + (i / 10) * Math.PI * 1.5;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    
    // Major tick
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(256 + cos * 195, 256 + sin * 195);
    ctx.lineTo(256 + cos * 175, 256 + sin * 175);
    ctx.stroke();

    // Numbers
    const num = (i * 25).toString();
    ctx.fillText(num, 256 + cos * 150, 256 + sin * 150);
  }

  // Dial title & unit
  ctx.fillStyle = '#475569';
  ctx.font = `700 26px ${SANS_FONT}`;
  ctx.fillText(title.toUpperCase(), 256, 175);

  ctx.fillStyle = '#0f172a';
  ctx.font = `700 28px ${MONO_FONT}`;
  ctx.fillText(unit, 256, 310);

  // Big digital readout in center
  ctx.fillStyle = isAlert ? '#dc2626' : '#047857';
  ctx.font = `700 54px ${MONO_FONT}`;
  ctx.fillText(valueStr, 256, 360);

  // Red pointer needle
  ctx.strokeStyle = '#dc2626';
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.moveTo(256, 256);
  const needleAngle = isAlert ? Math.PI * 1.95 : Math.PI * 1.35;
  ctx.lineTo(256 + Math.cos(needleAngle) * 175, 256 + Math.sin(needleAngle) * 175);
  ctx.stroke();

  // Needle center cap
  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.arc(256, 256, 18, 0, Math.PI * 2);
  ctx.fill();

  return configureCrispTextTexture(canvas);
}

/**
 * Generates ultra-sharp Fanuc/Siemens CNC Operator Display texture (1024x680)
 */
export function createCncScreenTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 680;
  const ctx = canvas.getContext('2d')!;
  ctx.scale(2, 2);

  // CRT / LCD dark industrial blue-green background
  ctx.fillStyle = '#041d24';
  ctx.fillRect(0, 0, 512, 340);

  ctx.strokeStyle = '#0ea5e9';
  ctx.lineWidth = 6;
  ctx.strokeRect(4, 4, 504, 332);

  // Header Bar
  ctx.fillStyle = '#083344';
  ctx.fillRect(4, 4, 504, 46);

  ctx.fillStyle = '#38bdf8';
  ctx.font = `700 22px ${MONO_FONT}`;
  ctx.textAlign = 'left';
  ctx.fillText('M2 CNC VERTICAL MILL • FANUC 31i-B', 18, 34);

  // Machine coordinates readout
  ctx.fillStyle = '#22d3ee';
  ctx.font = `700 32px ${MONO_FONT}`;
  ctx.fillText('X: +0142.500 mm', 22, 95);
  ctx.fillText('Y: -0088.250 mm', 22, 138);
  ctx.fillText('Z: +0012.040 mm', 22, 181);

  // Spindle & Feed
  ctx.fillStyle = '#4ade80';
  ctx.font = `700 24px ${MONO_FONT}`;
  ctx.fillText('SPINDLE: 4,500 RPM (LOAD: 38%)', 22, 226);
  ctx.fillText('FEEDRATE: 1,200 mm/min', 22, 260);

  // Coolant status line
  ctx.fillStyle = '#fef08a';
  ctx.font = `700 22px ${MONO_FONT}`;
  ctx.fillText('COOLANT FLOOD: ACTIVE • ZONE 1', 22, 305);

  return configureCrispTextTexture(canvas);
}

/**
 * Metal Spec Data Plate for M3 Lathe (1024x512 crisp)
 */
export function createLathePlacardTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;
  ctx.scale(2, 2);

  ctx.fillStyle = '#1e293b';
  ctx.fillRect(0, 0, 512, 256);

  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 6;
  ctx.strokeRect(4, 4, 504, 248);

  ctx.fillStyle = '#ffffff';
  ctx.font = `700 34px ${SANS_FONT}`;
  ctx.fillText('M3 PRECISION LATHE', 24, 55);

  ctx.fillStyle = '#38bdf8';
  ctx.font = `700 24px ${MONO_FONT}`;
  ctx.fillText('SPINDLE: 3,200 RPM • 250mm 3-JAW CHUCK', 24, 105);
  ctx.fillText('CROSS-SLIDE: DUAL AXIS CNC', 24, 145);
  ctx.fillText('FLUID: COOLANT (WATER-GLYCOL)', 24, 185);

  ctx.fillStyle = '#cbd5e1';
  ctx.font = `700 20px ${MONO_FONT}`;
  ctx.fillText('SECONDARY CONTAINMENT: DRIPWATCH Z1/Z2', 24, 225);

  return configureCrispTextTexture(canvas);
}

/**
 * Metal Spec Plate for M4 Hydraulic Power Unit (1024x512 crisp)
 */
export function createHpuTankPlateTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;
  ctx.scale(2, 2);

  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, 512, 256);

  ctx.strokeStyle = '#f59e0b';
  ctx.lineWidth = 6;
  ctx.strokeRect(4, 4, 504, 248);

  ctx.fillStyle = '#ffffff';
  ctx.font = `700 34px ${SANS_FONT}`;
  ctx.fillText('M4 HYDRAULIC POWER UNIT', 24, 55);

  ctx.fillStyle = '#fbbf24';
  ctx.font = `700 24px ${MONO_FONT}`;
  ctx.fillText('RESERVOIR CAPACITY: 180 LITRES', 24, 105);
  ctx.fillText('PRESSURE: 210 BAR (MAX 250 BAR)', 24, 145);
  ctx.fillText('FLUID: ISO VG 46 HYDRAULIC OIL', 24, 185);

  ctx.fillStyle = '#e2e8f0';
  ctx.font = `700 20px ${MONO_FONT}`;
  ctx.fillText('OPTICAL IR REFLECTIVE SENSORS EQUIPPED', 24, 225);

  return configureCrispTextTexture(canvas);
}

/**
 * Generates radial shadow texture for soft floor contact shadows
 */
export function createRadialShadowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  const gradient = ctx.createRadialGradient(128, 128, 10, 128, 128, 120);
  gradient.addColorStop(0, 'rgba(11, 31, 58, 0.65)');
  gradient.addColorStop(0.5, 'rgba(11, 31, 58, 0.3)');
  gradient.addColorStop(1, 'rgba(11, 31, 58, 0)');

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 256, 256);

  const texture = new THREE.CanvasTexture(canvas);
  return texture;
}

/**
 * Generates modern CNC manufacturing facility architectural wall texture:
 * - Upper insulated ribbed architectural metal wall cladding panels
 * - Clean horizontal safety-yellow architectural accent trim
 * - Lower precast concrete industrial wainscoting with subtle floor-contact ambient occlusion
 */
export function createIndustrialWallTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;
  const rand = createSeededRandom(5513);

  // 1. Upper modern insulated metal wall panels (architectural cool slate-grey)
  ctx.fillStyle = '#465466';
  ctx.fillRect(0, 0, 1024, 340);

  // Subtle vertical ribbed steel cladding corrugations on upper section
  for (let x = 0; x < 1024; x += 24) {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.045)';
    ctx.fillRect(x, 0, 10, 340);
    ctx.fillStyle = 'rgba(15, 23, 42, 0.14)';
    ctx.fillRect(x + 12, 0, 4, 340);
  }

  // Horizontal insulated panel joints + fasteners
  for (let y = 85; y < 340; y += 85) {
    ctx.strokeStyle = 'rgba(15, 23, 42, 0.55)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(1024, y);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, y + 2);
    ctx.lineTo(1024, y + 2);
    ctx.stroke();

    ctx.fillStyle = '#64748b';
    for (let x = 32; x < 1024; x += 64) {
      ctx.beginPath();
      ctx.arc(x, y - 7, 2.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // 2. Lower precast architectural concrete wainscoting (y = 340..512)
  ctx.fillStyle = '#334155';
  ctx.fillRect(0, 340, 1024, 172);

  // Vertical precast concrete slab expansion joints
  ctx.strokeStyle = 'rgba(15, 23, 42, 0.5)';
  ctx.lineWidth = 3;
  for (let x = 256; x < 1024; x += 256) {
    ctx.beginPath();
    ctx.moveTo(x, 340);
    ctx.lineTo(x, 512);
    ctx.stroke();
  }

  // Fine mineral grain across wall
  const imgData = ctx.getImageData(0, 0, 1024, 512);
  const data = imgData.data;
  for (let i = 0; i < data.length; i += 4) {
    const n = (rand() - 0.5) * 11;
    data[i] = Math.min(255, Math.max(0, data[i] + n));
    data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + n));
    data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + n));
  }
  ctx.putImageData(imgData, 0, 0);

  // Crisp architectural dado band separating upper cladding and lower concrete
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(0, 332, 1024, 16);
  ctx.fillStyle = '#d97706';
  ctx.fillRect(0, 336, 1024, 6);

  // Subtle ambient-occlusion darkening near ceiling & floor
  const topAo = ctx.createLinearGradient(0, 0, 0, 64);
  topAo.addColorStop(0, 'rgba(15, 23, 42, 0.42)');
  topAo.addColorStop(1, 'rgba(15, 23, 42, 0)');
  ctx.fillStyle = topAo;
  ctx.fillRect(0, 0, 1024, 64);

  const floorAo = ctx.createLinearGradient(0, 445, 0, 512);
  floorAo.addColorStop(0, 'rgba(15, 23, 42, 0)');
  floorAo.addColorStop(1, 'rgba(15, 23, 42, 0.45)');
  ctx.fillStyle = floorAo;
  ctx.fillRect(0, 445, 1024, 67);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.repeat.set(3, 1);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.anisotropy = 16;
  return texture;
}

/**
 * Generates ultra-crisp 1024x1024 ISO plant safety signs: Eye protection, Fire equipment, Spill response
 */
export function createSafetySignTexture(type: 'eye_protection' | 'fire_extinguisher' | 'spill_response'): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d')!;
  ctx.scale(4, 4);

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, 256, 256);
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 4;
  ctx.strokeRect(4, 4, 248, 248);

  if (type === 'eye_protection') {
    // Blue ISO Mandatory circle
    ctx.fillStyle = '#0284c7';
    ctx.beginPath();
    ctx.arc(128, 105, 75, 0, Math.PI * 2);
    ctx.fill();

    // Goggles icon
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.roundRect(80, 85, 42, 35, 8);
    ctx.roundRect(134, 85, 42, 35, 8);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(122, 102);
    ctx.lineTo(134, 102);
    ctx.stroke();

    // Text
    ctx.fillStyle = '#0f172a';
    ctx.font = `700 13px ${MONO_FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText('EYE PROTECTION', 128, 208);
    ctx.fillText('REQUIRED IN AREA', 128, 226);
  } else if (type === 'fire_extinguisher') {
    // Red ISO Fire sign
    ctx.fillStyle = '#C0392B';
    ctx.fillRect(8, 8, 240, 170);

    // White extinguisher pictogram
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.roundRect(110, 50, 36, 95, 6);
    ctx.fill();
    ctx.fillRect(116, 32, 24, 18);
    ctx.fillRect(100, 26, 40, 8);

    // Text
    ctx.fillStyle = '#0f172a';
    ctx.font = `700 14px ${MONO_FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText('FIRE EXTINGUISHER', 128, 214);
    ctx.font = `600 11px ${MONO_FONT}`;
    ctx.fillText('INSPECTION CURRENT', 128, 234);
  } else {
    // Spill response station
    ctx.fillStyle = '#1FA5A0';
    ctx.fillRect(8, 8, 240, 170);

    ctx.fillStyle = '#ffffff';
    ctx.font = `700 36px ${SANS_FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText('SPILL KIT', 128, 105);

    ctx.fillStyle = '#0f172a';
    ctx.font = `700 13px ${MONO_FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText('SECONDARY CONTAINMENT', 128, 210);
    ctx.fillText('ABSORBENT PADS & BOOMS', 128, 228);
  }

  return configureCrispTextTexture(canvas);
}

/**
 * Generates natural pine wood pallet texture
 */
export function createWoodPalletTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Pine wood tone
  ctx.fillStyle = '#b48a56';
  ctx.fillRect(0, 0, 512, 512);

  // Planks
  const plankH = 512 / 6;
  for (let i = 0; i < 6; i++) {
    const y = i * plankH;
    // Wood grain lines
    ctx.strokeStyle = 'rgba(120, 75, 30, 0.35)';
    ctx.lineWidth = 1.5;
    for (let g = 0; g < 5; g++) {
      ctx.beginPath();
      ctx.moveTo(0, y + 10 + g * 12);
      ctx.bezierCurveTo(150, y + 14 + g * 10, 350, y + 8 + g * 14, 512, y + 12 + g * 12);
      ctx.stroke();
    }

    // Plank gap
    ctx.strokeStyle = '#3a200a';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(512, y);
    ctx.stroke();

    // Fastener nails
    ctx.fillStyle = '#4a5568';
    [40, 256, 472].forEach(nx => {
      ctx.beginPath();
      ctx.arc(nx, y + 14, 3, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * Generates louvered ventilation grille texture
 */
export function createVentGrilleTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#334155';
  ctx.fillRect(0, 0, 256, 256);
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 8;
  ctx.strokeRect(4, 4, 248, 248);

  // Louver slats
  for (let y = 24; y < 240; y += 14) {
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(16, y, 224, 7);
    ctx.fillStyle = '#64748b';
    ctx.fillRect(16, y + 7, 224, 3);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * Generates realistic machine panel seams with subtle recessed lines, corner hex bolts, and fine scratches
 */
export function createPanelSeamsTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Neutral industrial base with micro grain
  ctx.fillStyle = '#e2e8f0';
  ctx.fillRect(0, 0, 512, 512);

  // Micro surface noise
  const imgData = ctx.getImageData(0, 0, 512, 512);
  const data = imgData.data;
  for (let i = 0; i < data.length; i += 4) {
    const n = (Math.random() - 0.5) * 14;
    data[i] = Math.min(255, Math.max(0, data[i] + n));
    data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + n));
    data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + n));
  }
  ctx.putImageData(imgData, 0, 0);

  // Recessed panel seam lines (hairline dark groove with highlight edge)
  const drawSeam = (x1: number, y1: number, x2: number, y2: number) => {
    // Shadow line
    ctx.strokeStyle = 'rgba(15, 23, 42, 0.45)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();

    // Subtle highlight bevel
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x1 + 1.5, y1 + 1.5);
    ctx.lineTo(x2 + 1.5, y2 + 1.5);
    ctx.stroke();
  };

  // Outer border seam
  drawSeam(24, 24, 488, 24);
  drawSeam(488, 24, 488, 488);
  drawSeam(488, 488, 24, 488);
  drawSeam(24, 488, 24, 24);

  // Center vertical panel divider
  drawSeam(256, 24, 256, 488);

  // Corner hex bolts / rivets with shadows
  const boltPositions = [
    { x: 38, y: 38 },
    { x: 242, y: 38 },
    { x: 270, y: 38 },
    { x: 474, y: 38 },
    { x: 38, y: 256 },
    { x: 242, y: 256 },
    { x: 270, y: 256 },
    { x: 474, y: 256 },
    { x: 38, y: 474 },
    { x: 242, y: 474 },
    { x: 270, y: 474 },
    { x: 474, y: 474 },
  ];

  boltPositions.forEach(bp => {
    // Drop shadow
    ctx.fillStyle = 'rgba(15, 23, 42, 0.5)';
    ctx.beginPath();
    ctx.arc(bp.x + 1.5, bp.y + 1.5, 6, 0, Math.PI * 2);
    ctx.fill();

    // Zinc bolt head
    ctx.fillStyle = '#94a3b8';
    ctx.beginPath();
    ctx.arc(bp.x, bp.y, 5.5, 0, Math.PI * 2);
    ctx.fill();

    // Hex inner slot / recess
    ctx.fillStyle = '#475569';
    ctx.beginPath();
    ctx.arc(bp.x, bp.y, 2.5, 0, Math.PI * 2);
    ctx.fill();

    // Bolt specular highlight
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.beginPath();
    ctx.arc(bp.x - 1.5, bp.y - 1.5, 1.5, 0, Math.PI * 2);
    ctx.fill();
  });

  // Subtle industrial scratches
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
  ctx.lineWidth = 1;
  const scratches = [
    { x1: 90, y1: 140, x2: 130, y2: 155 },
    { x1: 340, y1: 320, x2: 375, y2: 310 },
    { x1: 180, y1: 390, x2: 215, y2: 410 },
  ];
  scratches.forEach(s => {
    ctx.beginPath();
    ctx.moveTo(s.x1, s.y1);
    ctx.lineTo(s.x2, s.y2);
    ctx.stroke();
  });

  // Faint oil smudge in corner
  const oilGrad = ctx.createRadialGradient(420, 440, 2, 420, 440, 36);
  oilGrad.addColorStop(0, 'rgba(120, 53, 15, 0.22)');
  oilGrad.addColorStop(0.7, 'rgba(180, 83, 9, 0.08)');
  oilGrad.addColorStop(1, 'rgba(180, 83, 9, 0)');
  ctx.fillStyle = oilGrad;
  ctx.beginPath();
  ctx.arc(420, 440, 36, 0, Math.PI * 2);
  ctx.fill();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

/**
 * Compact machine hazard decal strip (diagonal black/safety-yellow caution band)
 */
export function createMachineHazardDecalTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#f59e0b'; // OSHA Safety Amber
  ctx.fillRect(0, 0, 512, 64);

  ctx.fillStyle = '#0f172a'; // Black hazard stripes
  for (let x = -64; x < 576; x += 32) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + 24, 0);
    ctx.lineTo(x + 8, 64);
    ctx.lineTo(x - 16, 64);
    ctx.closePath();
    ctx.fill();
  }

  // Thin outer border
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 3;
  ctx.strokeRect(1, 1, 510, 62);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

/**
 * Small machine warning / caution decals (e.g. ISO high voltage, pinch point, 250 BAR) at 512x256 crisp
 */
export function createMachineDecalNoticeTexture(
  type: 'pinch' | 'high_pressure' | 'voltage'
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  ctx.scale(2, 2);

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, 256, 128);

  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 4;
  ctx.strokeRect(3, 3, 250, 122);

  if (type === 'pinch') {
    // Yellow warning banner
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(5, 5, 246, 36);

    ctx.fillStyle = '#0f172a';
    ctx.font = `700 20px ${SANS_FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText('WARNING', 128, 30);

    ctx.font = `700 13px ${MONO_FONT}`;
    ctx.fillText('PINCH POINT HAZARD', 128, 68);
    ctx.font = `600 11px ${MONO_FONT}`;
    ctx.fillStyle = '#475569';
    ctx.fillText('KEEP HANDS CLEAR', 128, 92);
    ctx.fillText('DURING OPERATION', 128, 110);
  } else if (type === 'high_pressure') {
    ctx.fillStyle = '#dc2626';
    ctx.fillRect(5, 5, 246, 36);

    ctx.fillStyle = '#ffffff';
    ctx.font = `700 20px ${SANS_FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText('HIGH PRESSURE', 128, 30);

    ctx.fillStyle = '#0f172a';
    ctx.font = `700 14px ${MONO_FONT}`;
    ctx.fillText('210 - 250 BAR MAX', 128, 70);
    ctx.font = `600 11px ${MONO_FONT}`;
    ctx.fillStyle = '#475569';
    ctx.fillText('RELIEVE CIRCUIT BEFORE', 128, 92);
    ctx.fillText('SERVICING FITTINGS', 128, 110);
  } else {
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(5, 5, 246, 36);

    ctx.fillStyle = '#0f172a';
    ctx.font = `700 20px ${SANS_FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText('400V 3-PHASE', 128, 30);

    ctx.font = `700 13px ${MONO_FONT}`;
    ctx.fillText('ELECTRICAL HAZARD', 128, 68);
    ctx.font = `600 11px ${MONO_FONT}`;
    ctx.fillStyle = '#475569';
    ctx.fillText('ISOLATE SUPPLY BEFORE', 128, 92);
    ctx.fillText('OPENING ENCLOSURE', 128, 110);
  }

  return configureCrispTextTexture(canvas);
}

