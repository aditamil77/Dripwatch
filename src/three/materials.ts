import * as THREE from 'three';
import { 
  createRealisticFactoryFloorTexture, 
  createIndustrialWallTexture, 
  createWoodPalletTexture,
  createCableTrayTexture 
} from './proceduralTextures';

export interface MaterialLibrary {
  // Factory Environment & Realistic Shop Props
  factoryFloor: THREE.MeshPhysicalMaterial;
  factoryWall: THREE.MeshStandardMaterial;
  walkwayGreen: THREE.MeshStandardMaterial;
  safetyYellow: THREE.MeshStandardMaterial;
  controlRoomWall: THREE.MeshStandardMaterial;
  controlRoomGlass: THREE.MeshPhysicalMaterial;
  controlRoomDesk: THREE.MeshStandardMaterial;
  contactShadow: THREE.MeshBasicMaterial;
  workbenchWood: THREE.MeshStandardMaterial;
  toolMetal: THREE.MeshStandardMaterial;
  palletWood: THREE.MeshStandardMaterial;
  fireExtinguisher: THREE.MeshStandardMaterial;
  storageCabinet: THREE.MeshStandardMaterial;
  trussSteel: THREE.MeshStandardMaterial;
  craneBeam: THREE.MeshStandardMaterial;
  cableTray: THREE.MeshStandardMaterial;
  conduitElectric: THREE.MeshStandardMaterial;
  highBayLamp: THREE.MeshStandardMaterial;
  highBayGlow: THREE.MeshBasicMaterial;

  // Machine Chassis (4 distinct machines)
  machineM1: THREE.MeshPhysicalMaterial; // Heavy industrial blue press
  machineM1Bed: THREE.MeshStandardMaterial; // Dark graphite bed platen
  machineM2: THREE.MeshPhysicalMaterial; // Powder-coated CNC mill
  machineM2Trim: THREE.MeshStandardMaterial;
  machineM3: THREE.MeshPhysicalMaterial; // Industrial lathe green
  machineM3Bed: THREE.MeshStandardMaterial; // Ground steel way
  machineM4: THREE.MeshPhysicalMaterial; // Industrial hydraulic unit
  machineM4Tank: THREE.MeshStandardMaterial;
  machineChassisXray: THREE.MeshPhysicalMaterial;
  machineMetalTrim: THREE.MeshStandardMaterial;
  machineChrome: THREE.MeshStandardMaterial;
  rubberHose: THREE.MeshStandardMaterial;
  rubberFoot: THREE.MeshStandardMaterial;
  brassFitting: THREE.MeshStandardMaterial;
  boltHead: THREE.MeshStandardMaterial;

  // Distinct Machine Palettes (Requirement #3)
  m1Blue: THREE.MeshPhysicalMaterial;
  m1Graphite: THREE.MeshStandardMaterial;
  m2Steel: THREE.MeshStandardMaterial;
  m2MutedGreen: THREE.MeshPhysicalMaterial;
  m2Charcoal: THREE.MeshStandardMaterial;
  m3Navy: THREE.MeshPhysicalMaterial;
  m3BrushedAlum: THREE.MeshStandardMaterial;
  m3Graphite: THREE.MeshStandardMaterial;
  m4GraphiteBlack: THREE.MeshStandardMaterial;
  m4MetallicSilver: THREE.MeshStandardMaterial;
  m4YellowAccent: THREE.MeshStandardMaterial;
  probeMetallic: THREE.MeshStandardMaterial;
  probeWire: THREE.MeshStandardMaterial;

  // Internals for X-Ray
  internalHydraulicTank: THREE.MeshStandardMaterial;
  internalTankOil: THREE.MeshPhysicalMaterial;
  internalMotor: THREE.MeshStandardMaterial;
  internalPump: THREE.MeshStandardMaterial;
  internalHose: THREE.MeshStandardMaterial;

  // Drip Trays & Zones
  trayBase: THREE.MeshStandardMaterial;
  trayRim: THREE.MeshStandardMaterial;
  trayDivider: THREE.MeshStandardMaterial;

  // Sensors
  copperElectrode: THREE.MeshStandardMaterial;
  sensorMount: THREE.MeshStandardMaterial;
  irSensorBody: THREE.MeshStandardMaterial;
  irSensorLens: THREE.MeshPhysicalMaterial;
  spreadPad: THREE.MeshStandardMaterial;
  spreadPadGlow: THREE.MeshStandardMaterial;

  // ESP32 Node & Beacons
  nodeBox: THREE.MeshStandardMaterial;
  nodeBoxOpen: THREE.MeshPhysicalMaterial;
  nodeLid: THREE.MeshPhysicalMaterial;
  nodePcb: THREE.MeshStandardMaterial;
  pcbChip: THREE.MeshStandardMaterial;
  esp32Shield: THREE.MeshStandardMaterial;
  cableGland: THREE.MeshStandardMaterial;
  buzzerBody: THREE.MeshStandardMaterial;
  beaconGreen: THREE.MeshStandardMaterial;
  beaconRed: THREE.MeshStandardMaterial;
  beaconGlass: THREE.MeshPhysicalMaterial;

  // Gateway & Wireless
  gatewayBody: THREE.MeshStandardMaterial;
  gatewayAntenna: THREE.MeshStandardMaterial;
  wirelessBeam: THREE.LineDashedMaterial;
  wirelessPacket: THREE.MeshBasicMaterial;

  // Cables & Signals
  cableJacket: THREE.MeshStandardMaterial;
  signalDotNormal: THREE.MeshBasicMaterial;
  signalDotAlert: THREE.MeshBasicMaterial;

  // Fluids
  coolantFluid: THREE.MeshPhysicalMaterial;
  oilFluid: THREE.MeshPhysicalMaterial;
  coolantDrop: THREE.MeshPhysicalMaterial;
  oilDrop: THREE.MeshPhysicalMaterial;
  splashCoolant: THREE.MeshBasicMaterial;
  splashOil: THREE.MeshBasicMaterial;
  rippleRing: THREE.MeshBasicMaterial;
  dripTrail: THREE.MeshPhysicalMaterial;
  streamCoolant: THREE.MeshPhysicalMaterial;
  streamOil: THREE.MeshPhysicalMaterial;

  // Alerts & Highlights
  zoneOutlineAlert: THREE.LineBasicMaterial;
  highlightOverlay: THREE.MeshStandardMaterial;

  // Inside Sensor Cutaway & Detection Reactions
  arcBridge: THREE.MeshBasicMaterial;
  sensorBeam: THREE.MeshBasicMaterial;
  sensorBeamAttenuated: THREE.MeshBasicMaterial;
  sparkArcLine: THREE.MeshBasicMaterial;
  irLaserBeam: THREE.LineBasicMaterial;
  copperElectrodeTeal: THREE.MeshStandardMaterial;
  electrodeOilActive: THREE.MeshStandardMaterial;
  electrodeCoolantActive: THREE.MeshStandardMaterial;
  irSensorGlowAmber: THREE.MeshStandardMaterial;
  pulseRingRed: THREE.MeshBasicMaterial;
  meniscusRim: THREE.MeshBasicMaterial;
}

export function createMaterials(): MaterialLibrary {
  // Realistic Concrete Floor with procedural noise, wear, and drain grates
  const floorMap = createRealisticFactoryFloorTexture();
  const factoryFloor = new THREE.MeshPhysicalMaterial({
    map: floorMap,
    roughness: 0.34,
    metalness: 0.10,
    clearcoat: 0.35,
    clearcoatRoughness: 0.22,
  });

  const wallMap = createIndustrialWallTexture();
  const factoryWall = new THREE.MeshStandardMaterial({
    map: wallMap,
    roughness: 0.65,
    metalness: 0.35,
  });

  const walkwayGreen = new THREE.MeshStandardMaterial({
    color: 0x15803d, // ISO 3864 safety green
    roughness: 0.45,
    metalness: 0.08,
  });

  const safetyYellow = new THREE.MeshStandardMaterial({
    color: 0xd97706, // Formal safety warning amber-yellow
    roughness: 0.38,
    metalness: 0.15,
  });

  const workbenchWood = new THREE.MeshStandardMaterial({
    color: 0xb48a56, // Beech hardwood workbench surface
    roughness: 0.55,
    metalness: 0.05,
  });

  const toolMetal = new THREE.MeshStandardMaterial({
    color: 0x94a3b8, // Brushed steel hand tools and vice
    roughness: 0.28,
    metalness: 0.85,
  });

  const palletWood = new THREE.MeshStandardMaterial({
    map: createWoodPalletTexture(),
    roughness: 0.78,
    metalness: 0.02,
  });

  const fireExtinguisher = new THREE.MeshStandardMaterial({
    color: 0xC0392B, // Safety red gloss enamel
    roughness: 0.22,
    metalness: 0.45,
  });

  const storageCabinet = new THREE.MeshStandardMaterial({
    color: 0x1e3a5f, // Industrial blue powder-coated sheet steel
    roughness: 0.42,
    metalness: 0.4,
  });

  const trussSteel = new THREE.MeshStandardMaterial({
    color: 0x334155, // Structural steel overhead truss
    roughness: 0.55,
    metalness: 0.72,
  });

  const craneBeam = new THREE.MeshStandardMaterial({
    color: 0xd97706, // Industrial safety amber overhead crane runway beam
    roughness: 0.38,
    metalness: 0.65,
  });

  const cableTray = new THREE.MeshStandardMaterial({
    map: createCableTrayTexture(),
    roughness: 0.35,
    metalness: 0.82,
  });

  const conduitElectric = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0, // Galvanized EMT electrical conduit
    roughness: 0.28,
    metalness: 0.88,
  });

  const highBayLamp = new THREE.MeshStandardMaterial({
    color: 0x0f172a, // Black anodised aluminium bay reflector
    roughness: 0.35,
    metalness: 0.7,
  });

  const highBayGlow = new THREE.MeshBasicMaterial({
    color: 0xffedd5, // Warm daylight 4500K LED bulb face
  });

  const controlRoomWall = new THREE.MeshStandardMaterial({
    color: 0x0B1F3A, // Deep navy architectural wall
    roughness: 0.6,
    metalness: 0.3,
  });

  const controlRoomGlass = new THREE.MeshPhysicalMaterial({
    color: 0xbae6fd,
    transparent: true,
    opacity: 0.3,
    transmission: 0.9,
    roughness: 0.04,
    metalness: 0.05,
    ior: 1.52,
    depthWrite: false,
  });

  const controlRoomDesk = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    roughness: 0.45,
    metalness: 0.35,
  });

  const contactShadow = new THREE.MeshBasicMaterial({
    color: 0x071324,
    transparent: true,
    opacity: 0.6,
    depthWrite: false,
  });

  // Machine Chassis PBR Materials with Physically-Based Properties & Clearcoat
  // M1: Hydraulic Press - deep industrial blue body with grey steel parts
  const machineM1 = new THREE.MeshPhysicalMaterial({
    color: 0x102a4e, // Deep industrial blue body
    roughness: 0.32,
    metalness: 0.35,
    clearcoat: 0.55,
    clearcoatRoughness: 0.18,
  });

  const machineM1Bed = new THREE.MeshStandardMaterial({
    color: 0x1e293b, // Dark graphite cast iron bed platen
    roughness: 0.45,
    metalness: 0.55,
  });

  // M2: CNC Milling Machine - off-white and charcoal panels with a dark window
  const machineM2 = new THREE.MeshPhysicalMaterial({
    color: 0xe5e9f0, // Off-white powder-coated enclosure panels
    roughness: 0.28,
    metalness: 0.18,
    clearcoat: 0.58,
    clearcoatRoughness: 0.16,
  });

  const machineM2Trim = new THREE.MeshStandardMaterial({
    color: 0x1e293b, // Charcoal industrial accent panels
    roughness: 0.42,
    metalness: 0.45,
  });

  // M3: Lathe / Industrial Unit - dark green body with ground precision steel ways
  const machineM3 = new THREE.MeshPhysicalMaterial({
    color: 0x144a2c, // Dark green body
    roughness: 0.38,
    metalness: 0.28,
    clearcoat: 0.48,
    clearcoatRoughness: 0.2,
  });

  const machineM3Bed = new THREE.MeshStandardMaterial({
    color: 0x94a3b8, // Ground precision steel bed
    roughness: 0.20,
    metalness: 0.88,
  });

  // M4: Hydraulic Power Unit - dark green body with a steel tank
  const machineM4 = new THREE.MeshPhysicalMaterial({
    color: 0x144a2c, // Dark green body
    roughness: 0.38,
    metalness: 0.28,
    clearcoat: 0.48,
    clearcoatRoughness: 0.2,
  });

  const machineM4Tank = new THREE.MeshStandardMaterial({
    color: 0x64748b, // Industrial welded steel tank
    roughness: 0.26,
    metalness: 0.84,
  });

  const machineChassisXray = new THREE.MeshPhysicalMaterial({
    color: 0x38bdf8,
    transparent: true,
    opacity: 0.18,
    roughness: 0.1,
    transmission: 0.85,
    depthWrite: false,
  });

  // Machine 1: Professional Industrial Blue & Graphite
  const m1Blue = new THREE.MeshPhysicalMaterial({
    color: 0x1d4ed8, // Vibrant deep industrial blue
    roughness: 0.28,
    metalness: 0.35,
    clearcoat: 0.60,
    clearcoatRoughness: 0.18,
  });
  const m1Graphite = new THREE.MeshStandardMaterial({
    color: 0x272b33, // Industrial graphite panels
    roughness: 0.42,
    metalness: 0.58,
  });

  // Machine 2: Dark Metallic Steel, Muted Green, Charcoal
  const m2Steel = new THREE.MeshStandardMaterial({
    color: 0x3e4c5e, // Dark metallic structural steel
    roughness: 0.24,
    metalness: 0.88,
  });
  const m2MutedGreen = new THREE.MeshPhysicalMaterial({
    color: 0x2e4f3e, // Muted sage/olive industrial green
    roughness: 0.35,
    metalness: 0.30,
    clearcoat: 0.52,
    clearcoatRoughness: 0.20,
  });
  const m2Charcoal = new THREE.MeshStandardMaterial({
    color: 0x1e232a, // Charcoal enclosure panels
    roughness: 0.45,
    metalness: 0.40,
  });

  // Machine 3: Deep Navy Blue, Brushed Aluminium, Dark Graphite
  const m3Navy = new THREE.MeshPhysicalMaterial({
    color: 0x0a1931, // Deep navy blue casting
    roughness: 0.32,
    metalness: 0.40,
    clearcoat: 0.58,
    clearcoatRoughness: 0.18,
  });
  const m3BrushedAlum = new THREE.MeshStandardMaterial({
    color: 0xcbd5e1, // Precision brushed aluminium
    roughness: 0.20,
    metalness: 0.90,
  });
  const m3Graphite = new THREE.MeshStandardMaterial({
    color: 0x181e26, // Dark graphite casing
    roughness: 0.40,
    metalness: 0.50,
  });

  // Machine 4: Graphite Black, Metallic Silver, Subtle Industrial Yellow
  const m4GraphiteBlack = new THREE.MeshStandardMaterial({
    color: 0x121720, // Deep graphite black body
    roughness: 0.38,
    metalness: 0.45,
  });
  const m4MetallicSilver = new THREE.MeshStandardMaterial({
    color: 0x94a3b8, // Metallic silver pump and manifold assemblies
    roughness: 0.22,
    metalness: 0.88,
  });
  const m4YellowAccent = new THREE.MeshStandardMaterial({
    color: 0xeab308, // Subtle industrial safety yellow highlights
    roughness: 0.35,
    metalness: 0.15,
  });

  // Dedicated Long Metallic Probes & Flexible Connection Wires
  const probeMetallic = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0, // Precision stainless steel probe shaft
    roughness: 0.18,
    metalness: 0.92,
  });
  const probeWire = new THREE.MeshStandardMaterial({
    color: 0x0f172a, // Matte black PVC wire conduit
    roughness: 0.65,
    metalness: 0.10,
  });

  // Brushed steel trims, shafts, and grey steel structural parts
  const machineMetalTrim = new THREE.MeshStandardMaterial({
    color: 0x64748b, // Grey steel parts
    roughness: 0.24,
    metalness: 0.86,
  });

  // Polished chrome ram cylinder and fittings
  const machineChrome = new THREE.MeshPhysicalMaterial({
    color: 0xf8fafc,
    roughness: 0.05,
    metalness: 0.98,
    clearcoat: 1.0,
    clearcoatRoughness: 0.04,
  });

  // Rubber hoses and vibration damping feet
  const rubberHose = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    roughness: 0.82,
    metalness: 0.05,
  });

  const rubberFoot = new THREE.MeshStandardMaterial({
    color: 0x090d16,
    roughness: 0.9,
    metalness: 0.02,
  });

  const brassFitting = new THREE.MeshStandardMaterial({
    color: 0xd4af37, // Machined brass hose fittings & glands
    roughness: 0.22,
    metalness: 0.92,
  });

  const boltHead = new THREE.MeshStandardMaterial({
    color: 0x64748b, // Zinc-plated structural bolts
    roughness: 0.28,
    metalness: 0.85,
  });

  // Internals for X-Ray
  const internalHydraulicTank = new THREE.MeshStandardMaterial({
    color: 0x334155,
    roughness: 0.35,
    metalness: 0.72,
  });

  const internalTankOil = new THREE.MeshPhysicalMaterial({
    color: 0x8a4500,
    roughness: 0.05,
    metalness: 0.15,
    transparent: true,
    opacity: 0.75,
  });

  const internalMotor = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.42,
    metalness: 0.8,
  });

  const internalPump = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    roughness: 0.32,
    metalness: 0.85,
  });

  const internalHose = new THREE.MeshStandardMaterial({
    color: 0x020617,
    roughness: 0.75,
    metalness: 0.1,
  });

  // Drip Trays: Stainless Steel with rolled edges
  const trayBase = new THREE.MeshStandardMaterial({
    color: 0xd8e0e8, // 304 Brushed stainless steel
    roughness: 0.22,
    metalness: 0.88,
  });

  const trayRim = new THREE.MeshStandardMaterial({
    color: 0xa8b4c2, // Rolled perimeter bead
    roughness: 0.25,
    metalness: 0.86,
  });

  const trayDivider = new THREE.MeshStandardMaterial({
    color: 0x64748b,
    roughness: 0.28,
    metalness: 0.84,
  });

  // Sensors
  // Coolant AC dual electrodes: solid copper
  const copperElectrode = new THREE.MeshStandardMaterial({
    color: 0xb87333,
    roughness: 0.18,
    metalness: 0.95,
  });

  const sensorMount = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.55,
    metalness: 0.4,
  });

  // IR sensor: Black anodised aluminium body with optical glass lens
  const irSensorBody = new THREE.MeshStandardMaterial({
    color: 0x111827,
    roughness: 0.32,
    metalness: 0.85,
  });

  const irSensorLens = new THREE.MeshPhysicalMaterial({
    color: 0x38bdf8,
    roughness: 0.04,
    metalness: 0.05,
    transparent: true,
    opacity: 0.88,
    ior: 1.5,
  });

  const spreadPad = new THREE.MeshStandardMaterial({
    color: 0xf1f5f9, // Porous ceramic capillary pad
    roughness: 0.88,
    metalness: 0.02,
  });

  const spreadPadGlow = new THREE.MeshStandardMaterial({
    color: 0xC0392B,
    emissive: 0xC0392B,
    emissiveIntensity: 0.95,
    roughness: 0.35,
    metalness: 0.15,
  });

  // ESP32 Node & Beacons
  const nodeBox = new THREE.MeshStandardMaterial({
    color: 0x0B1F3A, // IP67 polycarbonate enclosure
    roughness: 0.42,
    metalness: 0.25,
  });

  const nodeBoxOpen = new THREE.MeshPhysicalMaterial({
    color: 0x1FA5A0,
    transparent: true,
    opacity: 0.2,
    roughness: 0.08,
    transmission: 0.88,
    depthWrite: false,
  });

  const nodeLid = new THREE.MeshPhysicalMaterial({
    color: 0x64748b,
    transparent: true,
    opacity: 0.32,
    roughness: 0.15,
  });

  // Green PCB with SMD solder pads
  const nodePcb = new THREE.MeshStandardMaterial({
    color: 0x0d5c3a, // Industrial solder-mask green
    roughness: 0.38,
    metalness: 0.18,
  });

  const pcbChip = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    roughness: 0.22,
    metalness: 0.65,
  });

  const esp32Shield = new THREE.MeshStandardMaterial({
    color: 0xd8e0e8, // Silver nickel-plated RF shield can
    roughness: 0.18,
    metalness: 0.92,
  });

  const cableGland = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.35,
    metalness: 0.6,
  });

  const buzzerBody = new THREE.MeshStandardMaterial({
    color: 0x020617,
    roughness: 0.55,
    metalness: 0.25,
  });

  const beaconGreen = new THREE.MeshStandardMaterial({
    color: 0x2E8540,
    emissive: 0x2E8540,
    emissiveIntensity: 0.85,
    roughness: 0.2,
  });

  const beaconRed = new THREE.MeshStandardMaterial({
    color: 0xC0392B,
    emissive: 0xC0392B,
    emissiveIntensity: 1.3,
    roughness: 0.18,
  });

  const beaconGlass = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.35,
    roughness: 0.08,
  });

  // Gateway & Wireless
  const gatewayBody = new THREE.MeshStandardMaterial({
    color: 0x0B1F3A,
    roughness: 0.32,
    metalness: 0.65,
  });

  const gatewayAntenna = new THREE.MeshStandardMaterial({
    color: 0x334155,
    roughness: 0.25,
    metalness: 0.78,
  });

  const wirelessBeam = new THREE.LineDashedMaterial({
    color: 0x1FA5A0,
    dashSize: 0.4,
    gapSize: 0.2,
    linewidth: 2,
    transparent: true,
    opacity: 0.7,
  });

  const wirelessPacket = new THREE.MeshBasicMaterial({
    color: 0x1FA5A0,
  });

  // Cables & Signals
  const cableJacket = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    roughness: 0.78,
    metalness: 0.08,
  });

  const signalDotNormal = new THREE.MeshBasicMaterial({
    color: 0x1FA5A0,
  });

  const signalDotAlert = new THREE.MeshBasicMaterial({
    color: 0xC0392B,
  });

  // Realistic Fluid Materials
  // Coolant: thin, light translucent blue-green / cyan, visible reflections
  const coolantFluid = new THREE.MeshPhysicalMaterial({
    color: 0x06b6d4, // Vibrant light cyan / blue-green
    transparent: true,
    opacity: 0.88,
    transmission: 0.25,
    roughness: 0.06,
    metalness: 0.05,
    clearcoat: 0.95,
    clearcoatRoughness: 0.06,
    ior: 1.35,
    depthWrite: false,
  });

  // Oil: thick, dark amber / golden-brown, glossy with clear specular highlights
  const oilFluid = new THREE.MeshPhysicalMaterial({
    color: 0x78350f, // Rich dark amber / golden-brown
    transparent: true,
    opacity: 0.98,
    transmission: 0.08,
    roughness: 0.03,
    metalness: 0.16,
    clearcoat: 1.0,
    clearcoatRoughness: 0.02,
    ior: 1.50,
    depthWrite: false,
  });

  const coolantDrop = new THREE.MeshPhysicalMaterial({
    color: 0x0891b2,
    transparent: true,
    opacity: 0.90,
    transmission: 0.22,
    roughness: 0.06,
    metalness: 0.05,
    clearcoat: 0.95,
    depthWrite: false,
  });

  const oilDrop = new THREE.MeshPhysicalMaterial({
    color: 0x92400e,
    transparent: true,
    opacity: 0.98,
    transmission: 0.06,
    roughness: 0.03,
    metalness: 0.18,
    clearcoat: 1.0,
    depthWrite: false,
  });

  // Dedicated conductive electrode active materials (illuminates when corresponding fluid makes physical contact)
  const electrodeOilActive = new THREE.MeshStandardMaterial({
    color: 0xfbbf24,
    emissive: 0xd97706,
    emissiveIntensity: 0.85,
    metalness: 0.85,
    roughness: 0.2,
  });

  const electrodeCoolantActive = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: 0x0284c7,
    emissiveIntensity: 0.85,
    metalness: 0.85,
    roughness: 0.2,
  });

  const splashCoolant = new THREE.MeshBasicMaterial({
    color: 0x38bdf8,
    transparent: true,
    opacity: 0.85,
    depthWrite: false,
  });

  const splashOil = new THREE.MeshBasicMaterial({
    color: 0xd97706,
    transparent: true,
    opacity: 0.9,
    depthWrite: false,
  });

  const rippleRing = new THREE.MeshBasicMaterial({
    color: 0x38bdf8,
    transparent: true,
    opacity: 0.75,
    side: THREE.DoubleSide,
    depthWrite: false,
  });

  const dripTrail = new THREE.MeshPhysicalMaterial({
    color: 0x22d3ee,
    transparent: true,
    opacity: 0.7,
    roughness: 0.05,
    clearcoat: 0.9,
    depthWrite: false,
  });

  const streamCoolant = new THREE.MeshPhysicalMaterial({
    color: 0x22d3ee,
    transparent: true,
    opacity: 0.78,
    transmission: 0.65,
    roughness: 0.08,
    clearcoat: 0.85,
    depthWrite: false,
  });

  const streamOil = new THREE.MeshPhysicalMaterial({
    color: 0x8a4500,
    transparent: true,
    opacity: 0.95,
    transmission: 0.2,
    roughness: 0.03,
    clearcoat: 1.0,
    depthWrite: false,
  });

  // Alerts & Highlights
  const zoneOutlineAlert = new THREE.LineBasicMaterial({
    color: 0xC0392B,
    linewidth: 3,
  });

  const highlightOverlay = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: 0x0284c7,
    emissiveIntensity: 0.6,
    roughness: 0.3,
  });

  // Inside Sensor Cutaway
  const arcBridge = new THREE.MeshBasicMaterial({
    color: 0x67e8f9,
  });

  const sensorBeam = new THREE.MeshBasicMaterial({
    color: 0xef4444,
    transparent: true,
    opacity: 0.85,
  });

  const sensorBeamAttenuated = new THREE.MeshBasicMaterial({
    color: 0x7f1d1d,
    transparent: true,
    opacity: 0.2,
  });

  const sparkArcLine = new THREE.MeshBasicMaterial({
    color: 0x38bdf8,
    transparent: true,
    opacity: 0.95,
  });

  const irLaserBeam = new THREE.LineBasicMaterial({
    color: 0xef4444,
    transparent: true,
    opacity: 0.85,
  });

  const copperElectrodeTeal = new THREE.MeshStandardMaterial({
    color: 0x22d3ee,
    metalness: 0.65,
    roughness: 0.2,
    emissive: 0x0891b2,
    emissiveIntensity: 0.55,
  });

  const irSensorGlowAmber = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    emissive: 0xd97706,
    emissiveIntensity: 1.8,
    roughness: 0.3,
  });

  const pulseRingRed = new THREE.MeshBasicMaterial({
    color: 0xef4444,
    transparent: true,
    opacity: 0.85,
    side: THREE.DoubleSide,
    depthWrite: false,
  });

  const meniscusRim = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.65,
    side: THREE.DoubleSide,
    depthWrite: false,
  });

  return {
    factoryFloor,
    factoryWall,
    walkwayGreen,
    safetyYellow,
    controlRoomWall,
    controlRoomGlass,
    controlRoomDesk,
    contactShadow,
    workbenchWood,
    toolMetal,
    palletWood,
    fireExtinguisher,
    storageCabinet,
    trussSteel,
    craneBeam,
    cableTray,
    conduitElectric,
    highBayLamp,
    highBayGlow,
    machineM1,
    machineM1Bed,
    machineM2,
    machineM2Trim,
    machineM3,
    machineM3Bed,
    machineM4,
    machineM4Tank,
    machineChassisXray,
    machineMetalTrim,
    machineChrome,
    rubberHose,
    rubberFoot,
    brassFitting,
    boltHead,
    m1Blue,
    m1Graphite,
    m2Steel,
    m2MutedGreen,
    m2Charcoal,
    m3Navy,
    m3BrushedAlum,
    m3Graphite,
    m4GraphiteBlack,
    m4MetallicSilver,
    m4YellowAccent,
    probeMetallic,
    probeWire,
    internalHydraulicTank,
    internalTankOil,
    internalMotor,
    internalPump,
    internalHose,
    trayBase,
    trayRim,
    trayDivider,
    copperElectrode,
    sensorMount,
    irSensorBody,
    irSensorLens,
    spreadPad,
    spreadPadGlow,
    nodeBox,
    nodeBoxOpen,
    nodeLid,
    nodePcb,
    pcbChip,
    esp32Shield,
    cableGland,
    buzzerBody,
    beaconGreen,
    beaconRed,
    beaconGlass,
    gatewayBody,
    gatewayAntenna,
    wirelessBeam,
    wirelessPacket,
    cableJacket,
    signalDotNormal,
    signalDotAlert,
    coolantFluid,
    oilFluid,
    coolantDrop,
    oilDrop,
    electrodeOilActive,
    electrodeCoolantActive,
    splashCoolant,
    splashOil,
    rippleRing,
    dripTrail,
    streamCoolant,
    streamOil,
    zoneOutlineAlert,
    highlightOverlay,
    arcBridge,
    sensorBeam,
    sensorBeamAttenuated,
    sparkArcLine,
    irLaserBeam,
    copperElectrodeTeal,
    irSensorGlowAmber,
    pulseRingRed,
    meniscusRim,
  };
}
