import * as THREE from 'three';

const SANS_FONT = '"IBM Plex Sans", "Segoe UI", Arial, sans-serif';
const CONDENSED_FONT = '"IBM Plex Sans Condensed", "Segoe UI", Arial, sans-serif';
const MONO_FONT = '"IBM Plex Mono", "Courier New", monospace';
const SERIF_FONT = '"Source Serif 4", Georgia, serif';

/**
 * Creates high-fidelity realistic industrial concrete floor texture:
 * - Subtle cement aggregate noise
 * - Cast-iron drain grates
 * - Sparingly distributed maintenance scuff marks and faint oil stains
 * - Subtle expansion joints
 */
export function createRealisticFactoryFloorTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d')!;

  // 1. Base light industrial grey epoxy concrete
  ctx.fillStyle = '#cbd5e1';
  ctx.fillRect(0, 0, 1024, 1024);

  // 2. Micro noise grain (aggregate cement particles)
  const imgData = ctx.getImageData(0, 0, 1024, 1024);
  const data = imgData.data;
  for (let i = 0; i < data.length; i += 4) {
    const noise = (Math.random() - 0.5) * 18;
    data[i] = Math.min(255, Math.max(0, data[i] + noise));
    data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + noise));
    data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + noise));
  }
  ctx.putImageData(imgData, 0, 0);

  // 3. Concrete slab expansion joints (subtle dark hairline grid lines)
  ctx.strokeStyle = 'rgba(71, 85, 105, 0.45)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  for (let x = 256; x < 1024; x += 256) {
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 1024);
  }
  for (let y = 256; y < 1024; y += 256) {
    ctx.moveTo(0, y);
    ctx.lineTo(1024, y);
  }
  ctx.stroke();

  // 4. Industrial floor drain grates (cast iron slotted grates)
  const drainLocations = [
    { x: 128, y: 128 },
    { x: 896, y: 128 },
    { x: 128, y: 896 },
    { x: 896, y: 896 },
    { x: 512, y: 512 }
  ];

  drainLocations.forEach(d => {
    // Outer rim frame
    ctx.fillStyle = '#334155';
    ctx.fillRect(d.x - 36, d.y - 36, 72, 72);
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(d.x - 30, d.y - 30, 60, 60);

    // Drain slots
    ctx.fillStyle = '#0f172a';
    for (let s = -22; s <= 22; s += 8) {
      ctx.fillRect(d.x - 24, d.y + s, 48, 4);
    }
    // Screws
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(d.x - 33, d.y - 33, 4, 4);
    ctx.fillRect(d.x + 29, d.y - 33, 4, 4);
    ctx.fillRect(d.x - 33, d.y + 29, 4, 4);
    ctx.fillRect(d.x + 29, d.y + 29, 4, 4);
  });

  // 5. Sparingly added faint oil drips and forklift scuff marks
  // Faint amber oil spots
  const oilSpots = [
    { x: 340, y: 420, r: 18, alpha: 0.14 },
    { x: 710, y: 310, r: 24, alpha: 0.18 },
    { x: 420, y: 780, r: 15, alpha: 0.12 },
    { x: 820, y: 640, r: 20, alpha: 0.15 },
  ];
  oilSpots.forEach(s => {
    const grad = ctx.createRadialGradient(s.x, s.y, 2, s.x, s.y, s.r);
    grad.addColorStop(0, `rgba(180, 83, 9, ${s.alpha})`);
    grad.addColorStop(0.7, `rgba(217, 130, 0, ${s.alpha * 0.5})`);
    grad.addColorStop(1, 'rgba(217, 130, 0, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fill();
  });

  // Faint dark rubber tyre scuff streaks
  ctx.strokeStyle = 'rgba(30, 41, 59, 0.15)';
  ctx.lineWidth = 14;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(220, 480);
  ctx.bezierCurveTo(280, 490, 360, 470, 440, 485);
  ctx.moveTo(600, 720);
  ctx.bezierCurveTo(670, 740, 760, 710, 820, 730);
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
 * Generates high-resolution canvas texture for formal 3D Machine Name Boards (e.g. M1 Hydraulic Press)
 */
/**
 * Generates ultra-high-resolution (2048x640) canvas texture for formal 3D Machine Name Boards
 * Configured with LinearMipmapLinearFilter and 16x anisotropy so text remains perfectly sharp and never breaks when zooming
 */
export function createMachineNameBoardTexture(
  code: string,
  fullName: string,
  fluidInfo: string,
  isAlert: boolean = false
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 2048;
  canvas.height = 640;
  const ctx = canvas.getContext('2d')!;

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
  ctx.font = `bold 144px ${SANS_FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(code, 180, 145);

  // Machine Full Name (e.g. "HYDRAULIC PRESS")
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold 122px ${SANS_FONT}`;
  ctx.fillText(fullName.toUpperCase(), 350, 185);

  // Subtitle / Fluid specification bar
  ctx.fillStyle = isAlert ? '#fecaca' : '#38bdf8';
  ctx.font = `bold 64px ${MONO_FONT}`;
  ctx.fillText(fluidInfo.toUpperCase(), 50, 345);

  // Status indicator pill
  const statusW = 620;
  ctx.fillStyle = isAlert ? '#dc2626' : '#166534';
  ctx.beginPath();
  ctx.roundRect(50, 420, statusW, 110, 18);
  ctx.fill();
  ctx.strokeStyle = isAlert ? '#fca5a5' : '#4ade80';
  ctx.lineWidth = 6;
  ctx.stroke();

  // Status text inside pill
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold 54px ${MONO_FONT}`;
  ctx.fillText(isAlert ? 'STATUS: LEAK ALERT' : 'STATUS: NORMAL', 90, 495);

  // Dual-Zone System Hardware spec on right
  ctx.fillStyle = '#e2e8f0';
  ctx.font = `bold 48px ${MONO_FONT}`;
  ctx.textAlign = 'right';
  ctx.fillText('DRIPWATCH 2-ZONE SYSTEM', 1980, 495);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.anisotropy = 16;
  return texture;
}

/**
 * Generates ultra-high-resolution (1024x512) badge texture for individual ESP32 node boxes
 */
export function createNodeBoxLabelTexture(nodeName: string, isAlert: boolean = false): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = isAlert ? '#3b0a0a' : '#0B1F3A';
  ctx.fillRect(0, 0, 1024, 512);

  ctx.strokeStyle = isAlert ? '#ef4444' : '#1FA5A0';
  ctx.lineWidth = 20;
  ctx.strokeRect(10, 10, 1004, 492);

  // Header
  ctx.fillStyle = isAlert ? '#f87171' : '#38bdf8';
  ctx.font = `bold 56px ${MONO_FONT}`;
  ctx.fillText('DRIPWATCH IoT NODE', 48, 96);

  // Node Title
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold 112px ${SANS_FONT}`;
  ctx.fillText(nodeName.toUpperCase(), 48, 240);

  // Status text
  ctx.fillStyle = isAlert ? '#ef4444' : '#4ade80';
  ctx.font = `bold 60px ${MONO_FONT}`;
  ctx.fillText(isAlert ? 'STATUS: LEAK ALERT' : 'STATUS: NORMAL', 48, 350);

  // Enclosure spec
  ctx.fillStyle = '#cbd5e1';
  ctx.font = `bold 42px ${MONO_FONT}`;
  ctx.fillText('IP67 • DUAL-ZONE MCU • MQTT', 48, 435);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.anisotropy = 16;
  return texture;
}

/**
 * Generates ultra-high-resolution (1024x512) formal 3D Zone badges on drip tray (e.g. "M1-Z1")
 */
export function createZoneLabelTexture(zoneName: string, subText: string, alert: boolean): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = alert ? '#3b0a0a' : '#071324';
  ctx.beginPath();
  ctx.roundRect(16, 16, 992, 480, 28);
  ctx.fill();

  ctx.strokeStyle = alert ? '#ef4444' : '#1FA5A0';
  ctx.lineWidth = 20;
  ctx.beginPath();
  ctx.roundRect(16, 16, 992, 480, 28);
  ctx.stroke();

  // Status icon dot
  ctx.fillStyle = alert ? '#ef4444' : '#22c55e';
  ctx.beginPath();
  ctx.arc(110, 140, 42, 0, Math.PI * 2);
  ctx.fill();

  // Zone Name (e.g. "M1-Z1")
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold 136px ${SANS_FONT}`;
  ctx.fillText(zoneName, 185, 185);

  // SubText (Primary / Auxiliary Containment)
  ctx.fillStyle = alert ? '#fecaca' : '#38bdf8';
  ctx.font = `bold 64px ${MONO_FONT}`;
  ctx.fillText(subText.toUpperCase(), 48, 320);

  // DripWatch secondary containment label
  ctx.fillStyle = '#cbd5e1';
  ctx.font = `bold 44px ${MONO_FONT}`;
  ctx.fillText('SECONDARY CONTAINMENT BASIN', 48, 410);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.anisotropy = 16;
  return texture;
}

/**
 * Generates ultra-high-resolution (2048x600) floating 3D alert banner above the active leaking machine & zone
 */
export function createLeakAlertBannerTexture(zoneTag: string, fluidType: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 2048;
  canvas.height = 600;
  const ctx = canvas.getContext('2d')!;

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

  // Alert Badge Headline (Step 7 Requirement)
  const headline = isOil ? 'OIL LEAK DETECTED' : 'COOLANT LEAK DETECTED';
  ctx.fillStyle = '#dc2626';
  ctx.beginPath();
  ctx.roundRect(50, 45, 960, 110, 18);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.font = `bold 68px ${SANS_FONT}`;
  ctx.fillText(`⚠️ ${headline}`, 80, 122);

  // Zone Tag
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold 124px ${SANS_FONT}`;
  ctx.fillText(`${headline} – ${zoneTag}`, 50, 315);

  // Fluid Details & Latching
  ctx.fillStyle = accentColor;
  ctx.font = `bold 64px ${MONO_FONT}`;
  ctx.fillText(isOil ? 'HAZARD: HYDRAULIC OIL • ZONE LATCHED' : 'HAZARD: CONDUCTIVE COOLANT • ZONE LATCHED', 50, 450);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.anisotropy = 16;
  return texture;
}

/**
 * Generates floating "WET" indicator badge above touched sensor
 */
export function createWetBadgeTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 384;
  canvas.height = 160;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = 'rgba(7, 19, 36, 0.95)';
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
  ctx.font = `bold 72px ${SANS_FONT}`;
  ctx.fillText('WET', 110, 105);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  return texture;
}

/**
 * Creates high-contrast engraved metallic nameplate texture for detection electrodes:
 * "OIL DETECTION ELECTRODE" or "COOLANT DETECTION ELECTRODE"
 */
export function createElectrodeTagTexture(type: 'oil' | 'coolant'): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 160;
  const ctx = canvas.getContext('2d')!;

  // Brushed steel background plate
  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.roundRect(6, 6, 500, 148, 16);
  ctx.fill();

  const isOil = type === 'oil';
  const accentColor = isOil ? '#f59e0b' : '#38bdf8';

  // Metallic border
  ctx.strokeStyle = accentColor;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.roundRect(6, 6, 500, 148, 16);
  ctx.stroke();

  // Fastener rivets in corners
  ctx.fillStyle = '#64748b';
  [[24, 24], [488, 24], [24, 136], [488, 136]].forEach(([rx, ry]) => {
    ctx.beginPath();
    ctx.arc(rx, ry, 6, 0, Math.PI * 2);
    ctx.fill();
  });

  // Electrode Type Title
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold 40px ${SANS_FONT}`;
  ctx.textAlign = 'center';
  ctx.fillText(isOil ? 'OIL DETECTION' : 'COOLANT DETECTION', 256, 68);

  ctx.fillStyle = accentColor;
  ctx.font = `bold 30px ${MONO_FONT}`;
  ctx.fillText('CONDUCTIVE ELECTRODE', 256, 114);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  return texture;
}

/**
 * Creates floating active indicator badge when liquid touches an electrode
 */
export function createElectrodeActiveBadgeTexture(type: 'oil' | 'coolant'): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 180;
  const ctx = canvas.getContext('2d')!;

  const isOil = type === 'oil';
  const accent = isOil ? '#f59e0b' : '#06b6d4';
  const bg = isOil ? 'rgba(40, 20, 5, 0.95)' : 'rgba(5, 25, 40, 0.95)';

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
  ctx.arc(72, 90, 28, 0, Math.PI * 2);
  ctx.fill();

  // Text
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold 46px ${SANS_FONT}`;
  ctx.textAlign = 'left';
  ctx.fillText(isOil ? 'OIL DETECTED' : 'COOLANT DETECTED', 124, 88);

  ctx.fillStyle = accent;
  ctx.font = `bold 30px ${MONO_FONT}`;
  ctx.fillText('ELECTRODE CONTACT', 124, 132);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  return texture;
}

/**
 * Generates exact chain label: "Leak detected: M2, Zone 1, coolant"
 */
export function createDetectionChainLabelTexture(
  machineId: string,
  zoneId: string,
  fluid: string
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1600;
  canvas.height = 360;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = 'rgba(58, 8, 8, 0.96)';
  ctx.beginPath();
  ctx.roundRect(12, 12, 1576, 336, 24);
  ctx.fill();

  ctx.strokeStyle = '#ef4444';
  ctx.lineWidth = 14;
  ctx.beginPath();
  ctx.roundRect(12, 12, 1576, 336, 24);
  ctx.stroke();

  // Red beacon dot
  ctx.fillStyle = '#dc2626';
  ctx.beginPath();
  ctx.arc(80, 180, 36, 0, Math.PI * 2);
  ctx.fill();

  const zLabel = zoneId === 'z1' ? 'Zone 1' : 'Zone 2';
  const mLabel = machineId.toUpperCase();
  const isOil = fluid.toLowerCase().includes('oil');
  const alertTitle = isOil ? 'OIL LEAK DETECTED' : 'COOLANT LEAK DETECTED';

  ctx.fillStyle = '#ffffff';
  ctx.font = `bold 68px ${SANS_FONT}`;
  ctx.fillText(`${alertTitle} – ${mLabel} ${zLabel.toUpperCase()}`, 150, 205);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  return texture;
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
 * Generates an active 3D Control Room Dashboard Texture
 */
export function createControlRoomDashboardTexture(
  m1Status: string,
  m2Status: string,
  m3Status: string,
  m4Status: string
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

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

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * Text badge texture for open controller PCB blocks
 */
export function createBlockLabelTexture(title: string, sub: string, accentHex: string = '#1FA5A0'): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 100;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = 'rgba(11, 31, 58, 0.94)';
  ctx.beginPath();
  ctx.roundRect(4, 4, 248, 92, 4);
  ctx.fill();

  ctx.strokeStyle = accentHex;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.roundRect(4, 4, 248, 92, 4);
  ctx.stroke();

  ctx.fillStyle = accentHex;
  ctx.font = `600 19px ${CONDENSED_FONT}`;
  ctx.fillText(title, 14, 36);

  ctx.fillStyle = '#94a3b8';
  ctx.font = `500 13px ${MONO_FONT}`;
  ctx.fillText(sub, 14, 68);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * Generates realistic machine warning labels (e.g. ISO 7010 caution triangle)
 * High-resolution with bold readable text
 */
export function createMachineWarningLabelTexture(text: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

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
  ctx.font = `bold 36px ${MONO_FONT}`;
  ctx.fillText(text, 204, 140);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * Generates high-fidelity circular Bourdon tube pressure gauge face with readable numbers
 */
export function createGaugeDialTexture(title: string, valueStr: string, unit: string = 'BAR', isAlert: boolean = false): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

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
  ctx.font = `bold 24px ${MONO_FONT}`;

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
  ctx.font = `bold 26px ${SANS_FONT}`;
  ctx.fillText(title.toUpperCase(), 256, 175);

  ctx.fillStyle = '#0f172a';
  ctx.font = `bold 28px ${MONO_FONT}`;
  ctx.fillText(unit, 256, 310);

  // Big digital readout in center
  ctx.fillStyle = isAlert ? '#dc2626' : '#047857';
  ctx.font = `bold 54px ${MONO_FONT}`;
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

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * Generates high-resolution Fanuc/Siemens CNC Operator Display texture
 */
export function createCncScreenTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 340;
  const ctx = canvas.getContext('2d')!;

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
  ctx.font = `bold 22px ${MONO_FONT}`;
  ctx.textAlign = 'left';
  ctx.fillText('M2 CNC VERTICAL MILL • FANUC 31i-B', 18, 34);

  // Machine coordinates readout
  ctx.fillStyle = '#22d3ee';
  ctx.font = `bold 32px ${MONO_FONT}`;
  ctx.fillText('X: +0142.500 mm', 22, 95);
  ctx.fillText('Y: -0088.250 mm', 22, 138);
  ctx.fillText('Z: +0012.040 mm', 22, 181);

  // Spindle & Feed
  ctx.fillStyle = '#4ade80';
  ctx.font = `bold 24px ${MONO_FONT}`;
  ctx.fillText('SPINDLE: 4,500 RPM (LOAD: 38%)', 22, 226);
  ctx.fillText('FEEDRATE: 1,200 mm/min', 22, 260);

  // Coolant status line
  ctx.fillStyle = '#fef08a';
  ctx.font = `bold 22px ${MONO_FONT}`;
  ctx.fillText('COOLANT FLOOD: ACTIVE • ZONE 1', 22, 305);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * Metal Spec Data Plate for M3 Lathe
 */
export function createLathePlacardTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#1e293b';
  ctx.fillRect(0, 0, 512, 256);

  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 6;
  ctx.strokeRect(4, 4, 504, 248);

  ctx.fillStyle = '#ffffff';
  ctx.font = `bold 34px ${SANS_FONT}`;
  ctx.fillText('M3 PRECISION LATHE', 24, 55);

  ctx.fillStyle = '#38bdf8';
  ctx.font = `bold 24px ${MONO_FONT}`;
  ctx.fillText('SPINDLE: 3,200 RPM • 250mm 3-JAW CHUCK', 24, 105);
  ctx.fillText('CROSS-SLIDE: DUAL AXIS CNC', 24, 145);
  ctx.fillText('FLUID: COOLANT (WATER-GLYCOL)', 24, 185);

  ctx.fillStyle = '#cbd5e1';
  ctx.font = `bold 20px ${MONO_FONT}`;
  ctx.fillText('SECONDARY CONTAINMENT: DRIPWATCH Z1/Z2', 24, 225);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * Metal Spec Plate for M4 Hydraulic Power Unit
 */
export function createHpuTankPlateTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, 512, 256);

  ctx.strokeStyle = '#f59e0b';
  ctx.lineWidth = 6;
  ctx.strokeRect(4, 4, 504, 248);

  ctx.fillStyle = '#ffffff';
  ctx.font = `bold 34px ${SANS_FONT}`;
  ctx.fillText('M4 HYDRAULIC POWER UNIT', 24, 55);

  ctx.fillStyle = '#fbbf24';
  ctx.font = `bold 24px ${MONO_FONT}`;
  ctx.fillText('RESERVOIR CAPACITY: 180 LITRES', 24, 105);
  ctx.fillText('PRESSURE: 210 BAR (MAX 250 BAR)', 24, 145);
  ctx.fillText('FLUID: ISO VG 46 HYDRAULIC OIL', 24, 185);

  ctx.fillStyle = '#e2e8f0';
  ctx.font = `bold 20px ${MONO_FONT}`;
  ctx.fillText('OPTICAL IR REFLECTIVE SENSORS EQUIPPED', 24, 225);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
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
 * Generates realistic industrial metal cladding / concrete back wall texture
 */
export function createIndustrialWallTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Dark industrial concrete slate base
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(0, 0, 1024, 512);

  // Subtle noise
  const imgData = ctx.getImageData(0, 0, 1024, 512);
  const data = imgData.data;
  for (let i = 0; i < data.length; i += 4) {
    const n = (Math.random() - 0.5) * 14;
    data[i] = Math.min(255, Math.max(0, data[i] + n));
    data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + n));
    data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + n));
  }
  ctx.putImageData(imgData, 0, 0);

  // Horizontal cladding panels and shadow seams
  for (let y = 64; y < 512; y += 64) {
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(1024, y);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, y + 2);
    ctx.lineTo(1024, y + 2);
    ctx.stroke();

    // Rivet / fastener points
    ctx.fillStyle = '#475569';
    for (let x = 32; x < 1024; x += 64) {
      ctx.beginPath();
      ctx.arc(x, y - 6, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Yellow lower hazard kicker line
  ctx.fillStyle = 'rgba(217, 130, 0, 0.35)';
  ctx.fillRect(0, 480, 1024, 32);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.repeat.set(2, 1);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * Generates ISO plant safety signs: Eye protection, Fire equipment, Spill response
 */
export function createSafetySignTexture(type: 'eye_protection' | 'fire_extinguisher' | 'spill_response'): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

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

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
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
 * Small machine warning / caution decals (e.g. ISO high voltage, pinch point, 250 BAR)
 */
export function createMachineDecalNoticeTexture(
  type: 'pinch' | 'high_pressure' | 'voltage'
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

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
    ctx.font = 'bold 20px "IBM Plex Sans", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('WARNING', 128, 30);

    ctx.font = 'bold 13px "IBM Plex Mono", monospace';
    ctx.fillText('PINCH POINT HAZARD', 128, 68);
    ctx.font = '11px "IBM Plex Mono", monospace';
    ctx.fillStyle = '#475569';
    ctx.fillText('KEEP HANDS CLEAR', 128, 92);
    ctx.fillText('DURING OPERATION', 128, 110);
  } else if (type === 'high_pressure') {
    ctx.fillStyle = '#dc2626';
    ctx.fillRect(5, 5, 246, 36);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px "IBM Plex Sans", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('HIGH PRESSURE', 128, 30);

    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 14px "IBM Plex Mono", monospace';
    ctx.fillText('210 - 250 BAR MAX', 128, 70);
    ctx.font = '11px "IBM Plex Mono", monospace';
    ctx.fillStyle = '#475569';
    ctx.fillText('RELIEVE CIRCUIT BEFORE', 128, 92);
    ctx.fillText('SERVICING FITTINGS', 128, 110);
  } else {
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(5, 5, 246, 36);

    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 20px "IBM Plex Sans", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('400V 3-PHASE', 128, 30);

    ctx.font = 'bold 13px "IBM Plex Mono", monospace';
    ctx.fillText('ELECTRICAL HAZARD', 128, 68);
    ctx.font = '11px "IBM Plex Mono", monospace';
    ctx.fillStyle = '#475569';
    ctx.fillText('ISOLATE SUPPLY BEFORE', 128, 92);
    ctx.fillText('OPENING ENCLOSURE', 128, 110);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

