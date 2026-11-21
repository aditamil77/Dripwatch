import * as THREE from 'three';

export type WorkerPose =
  | 'clipboard'
  | 'arms_crossed'
  | 'tablet'
  | 'observing'
  | 'side_clipboard';

export interface IndustrialWorkerSpec {
  id: string;
  position: { x: number; z: number };
  rotationY: number;
  heightScale: number;
  helmetColor: number;
  vestColor: number | null; // null = navy supervisor work jacket with reflective stripes
  shirtColor: number;
  pantsColor: number;
  skinColor: number;
  pose: WorkerPose;
  stanceShift: number; // Subtle left/right natural weight shift
  phaseOffset: number;
}

export interface AnimatedIndustrialWorker {
  group: THREE.Group;
  upperBodyGroup: THREE.Group;
  headGroup: THREE.Group;
  leftForearmGroup?: THREE.Group;
  rightForearmGroup?: THREE.Group;
  baseUpperY: number;
  baseHeadY: number;
  baseHeadRotY: number;
  phaseOffset: number;
}

/**
 * Five naturally distributed, asymmetric floor positions spanning all quadrants
 * of the industrial shop floor (near machines, open walking lanes, and between
 * machine sections). Every position sits outside all 4 machine work-cell borders,
 * drip trays, electrodes, node boxes, General Compartment Box, and close-up
 * camera sightlines.
 */
export const INDUSTRIAL_WORKER_SPECS: IndustrialWorkerSpec[] = [
  {
    id: 'worker-north-west-supervisor',
    position: { x: -1.6, z: -11.2 },
    rotationY: -0.45,      // Far north walkway facing diagonally toward M1 / floor
    heightScale: 1.03,
    helmetColor: 0xf1f5f9, // White plant supervisor hard hat
    vestColor: null,       // Navy industrial work jacket with reflective bands
    shirtColor: 0x1b3358,
    pantsColor: 0x3f3a34,  // Khaki-charcoal industrial trousers
    skinColor: 0xd8a47f,
    pose: 'arms_crossed',
    stanceShift: 0.02,
    phaseOffset: 0.4,
  },
  {
    id: 'worker-west-cross-aisle',
    position: { x: -4.9, z: 0.95 },
    rotationY: 0.72,       // Open west cross-aisle between M1 and M3
    heightScale: 0.99,
    helmetColor: 0xf5b700, // Classic industrial safety yellow hard hat
    vestColor: 0xc8e620,   // Hi-vis lime-yellow safety vest
    shirtColor: 0x26466d,  // Work blue uniform shirt
    pantsColor: 0x1e293b,  // Dark navy utility trousers
    skinColor: 0xb97d56,
    pose: 'clipboard',
    stanceShift: -0.02,
    phaseOffset: 1.7,
  },
  {
    id: 'worker-east-cross-aisle',
    position: { x: 6.1, z: 0.55 },
    rotationY: 2.68,       // East cross-aisle between M2 and M4 facing M2
    heightScale: 0.97,
    helmetColor: 0x2563eb, // Industrial blue technician hard hat
    vestColor: 0xf97316,   // Hi-vis safety orange vest
    shirtColor: 0x334155,  // Steel grey work shirt
    pantsColor: 0x1f2937,  // Charcoal work trousers
    skinColor: 0xe3b899,
    pose: 'tablet',
    stanceShift: 0.015,
    phaseOffset: 3.1,
  },
  {
    id: 'worker-north-east-m2',
    position: { x: 2.0, z: -5.2 },
    rotationY: 1.15,       // Near M2 left walkway perimeter observing CNC mill
    heightScale: 1.01,
    helmetColor: 0xf5b700, // Safety yellow hard hat
    vestColor: 0xc8e620,   // Hi-vis lime-yellow vest
    shirtColor: 0x1e3a5f,  // Industrial navy shirt
    pantsColor: 0x273449,  // Slate cargo trousers
    skinColor: 0x9c6644,
    pose: 'observing',
    stanceShift: -0.025,
    phaseOffset: 4.5,
  },
  {
    id: 'worker-south-aisle-m4',
    position: { x: 1.4, z: 7.5 },
    rotationY: -2.18,      // Lower south walkway between M3 & M4
    heightScale: 1.00,
    helmetColor: 0xea580c, // High-visibility safety orange hard hat
    vestColor: 0xc8e620,   // Hi-vis lime-yellow vest
    shirtColor: 0x475569,  // Light industrial slate shirt
    pantsColor: 0x1e293b,  // Dark navy work pants
    skinColor: 0xc88f68,
    pose: 'side_clipboard',
    stanceShift: 0.02,
    phaseOffset: 5.8,
  },
];

function createWorkerShadowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const grad = ctx.createRadialGradient(32, 32, 4, 32, 32, 30);
    grad.addColorStop(0, 'rgba(5, 12, 24, 0.55)');
    grad.addColorStop(0.55, 'rgba(5, 12, 24, 0.25)');
    grad.addColorStop(1, 'rgba(5, 12, 24, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 64);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function buildSingleWorker(
  spec: IndustrialWorkerSpec,
  shadowMat: THREE.MeshBasicMaterial,
  castShadow: boolean
): AnimatedIndustrialWorker {
  const root = new THREE.Group();
  root.name = spec.id;
  root.position.set(spec.position.x, 0, spec.position.z);
  root.rotation.y = spec.rotationY;
  root.scale.setScalar(spec.heightScale);

  // Materials with realistic PBR roughness/metalness contrast
  const bootMat = new THREE.MeshStandardMaterial({ color: 0x1c1917, roughness: 0.78, metalness: 0.08 });
  const soleMat = new THREE.MeshStandardMaterial({ color: 0x0f0e0d, roughness: 0.92, metalness: 0.02 });
  const pantsMat = new THREE.MeshStandardMaterial({ color: spec.pantsColor, roughness: 0.88, metalness: 0.02 });
  const beltMat = new THREE.MeshStandardMaterial({ color: 0x1f1916, roughness: 0.65, metalness: 0.05 });
  const buckleMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.28, metalness: 0.82 });
  const shirtMat = new THREE.MeshStandardMaterial({ color: spec.shirtColor, roughness: 0.84, metalness: 0.03 });
  const vestMat = spec.vestColor !== null
    ? new THREE.MeshStandardMaterial({ color: spec.vestColor, roughness: 0.76, metalness: 0.04 })
    : null;
  const reflectiveMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    emissive: 0x334155,
    emissiveIntensity: 0.18,
    roughness: 0.28,
    metalness: 0.45,
  });
  const skinMat = new THREE.MeshStandardMaterial({ color: spec.skinColor, roughness: 0.64, metalness: 0.02 });
  const hairMat = new THREE.MeshStandardMaterial({ color: 0x1e1b18, roughness: 0.85, metalness: 0.02 });
  const helmetMat = new THREE.MeshStandardMaterial({ color: spec.helmetColor, roughness: 0.24, metalness: 0.06 });
  const glassesMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.14,
    metalness: 0.35,
    transparent: true,
    opacity: 0.82,
  });

  const addMesh = (parent: THREE.Object3D, mesh: THREE.Mesh) => {
    mesh.castShadow = castShadow;
    mesh.receiveShadow = castShadow;
    parent.add(mesh);
    return mesh;
  };

  // 1. Soft floor contact shadow (grounds boots flush on y=0)
  const shadowPlane = new THREE.Mesh(new THREE.CircleGeometry(0.46, 20), shadowMat);
  shadowPlane.rotation.x = -Math.PI / 2;
  shadowPlane.position.y = 0.024;
  root.add(shadowPlane);

  // 2. Safety Boots & Industrial Work Trousers (Varied natural weight-shifted stances)
  const stanceWide = spec.pose === 'arms_crossed' ? 0.125 : 0.105;
  const strideZ = spec.pose === 'side_clipboard' ? 0.045 : spec.pose === 'observing' ? 0.035 : 0.015;
  const legOffsets = [
    { x: -stanceWide, z: strideZ, footYaw: 0.11 + spec.stanceShift * 2 },
    { x: stanceWide, z: -strideZ, footYaw: -0.09 + spec.stanceShift * 2 },
  ];

  legOffsets.forEach(({ x, z, footYaw }) => {
    const legGroup = new THREE.Group();
    legGroup.position.set(x, 0, z);
    legGroup.rotation.y = footYaw;

    // Thick rubber safety sole
    const sole = new THREE.Mesh(new THREE.BoxGeometry(0.115, 0.028, 0.255), soleMat);
    sole.position.set(0, 0.014, 0.035);
    addMesh(legGroup, sole);

    // Boot upper + rounded steel toe cap
    const bootUpper = new THREE.Mesh(new THREE.BoxGeometry(0.108, 0.075, 0.22), bootMat);
    bootUpper.position.set(0, 0.062, 0.028);
    addMesh(legGroup, bootUpper);

    const toeCap = new THREE.Mesh(new THREE.SphereGeometry(0.054, 12, 10), bootMat);
    toeCap.scale.set(1.0, 0.72, 1.15);
    toeCap.position.set(0, 0.056, 0.125);
    addMesh(legGroup, toeCap);

    // Ankle cuff
    const ankle = new THREE.Mesh(new THREE.CylinderGeometry(0.056, 0.058, 0.08, 12), bootMat);
    ankle.position.set(0, 0.11, -0.01);
    addMesh(legGroup, ankle);

    // Lower leg (shin/calf trouser)
    const shin = new THREE.Mesh(new THREE.CylinderGeometry(0.068, 0.058, 0.36, 12), pantsMat);
    shin.position.set(0, 0.31, -0.005);
    addMesh(legGroup, shin);

    // Knee joint
    const knee = new THREE.Mesh(new THREE.SphereGeometry(0.068, 12, 10), pantsMat);
    knee.position.set(0, 0.49, 0.0);
    addMesh(legGroup, knee);

    // Upper leg (thigh trouser)
    const thigh = new THREE.Mesh(new THREE.CylinderGeometry(0.082, 0.069, 0.37, 12), pantsMat);
    thigh.position.set(0, 0.675, -0.005);
    addMesh(legGroup, thigh);

    // Subtle reflective safety band on lower trouser cuff
    const legBand = new THREE.Mesh(new THREE.CylinderGeometry(0.064, 0.062, 0.028, 12), reflectiveMat);
    legBand.position.set(0, 0.24, -0.005);
    addMesh(legGroup, legBand);

    root.add(legGroup);
  });

  // Pelvis / Hips & Industrial Belt
  const pelvis = new THREE.Mesh(new THREE.CylinderGeometry(0.165, 0.17, 0.15, 14), pantsMat);
  pelvis.scale.set(1.12, 1, 0.74);
  pelvis.position.set(spec.stanceShift, 0.875, 0);
  addMesh(root, pelvis);

  const belt = new THREE.Mesh(new THREE.CylinderGeometry(0.172, 0.172, 0.042, 16), beltMat);
  belt.scale.set(1.12, 1, 0.75);
  belt.position.set(spec.stanceShift, 0.945, 0);
  addMesh(root, belt);

  const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.052, 0.046, 0.02), buckleMat);
  buckle.position.set(spec.stanceShift, 0.945, 0.13);
  addMesh(root, buckle);

  // 3. Upper Body Group (subtle breathing motion pivot & natural torso yaw variation)
  const upperBodyGroup = new THREE.Group();
  const baseUpperY = 0.96;
  upperBodyGroup.position.set(spec.stanceShift, baseUpperY, 0);
  upperBodyGroup.rotation.y = spec.stanceShift * 3.5;
  root.add(upperBodyGroup);

  // Base industrial uniform torso
  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.195, 0.16, 0.48, 16), shirtMat);
  torso.scale.set(1.16, 1, 0.72);
  torso.position.set(0, 0.24, 0);
  addMesh(upperBodyGroup, torso);

  // Rounded shoulders yoke
  const shoulderYoke = new THREE.Mesh(new THREE.CapsuleGeometry(0.088, 0.28, 6, 12), shirtMat);
  shoulderYoke.rotation.z = Math.PI / 2;
  shoulderYoke.position.set(0, 0.445, 0);
  addMesh(upperBodyGroup, shoulderYoke);

  // Shirt collar
  const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.072, 0.086, 0.055, 14), shirtMat);
  collar.position.set(0, 0.495, 0);
  addMesh(upperBodyGroup, collar);

  if (vestMat) {
    // Hi-Vis Industrial Safety Vest shell over torso
    const vestBody = new THREE.Mesh(new THREE.CylinderGeometry(0.203, 0.172, 0.42, 16), vestMat);
    vestBody.scale.set(1.15, 1, 0.75);
    vestBody.position.set(0, 0.225, 0);
    addMesh(upperBodyGroup, vestBody);

    // Front vest zipper seam
    const zipper = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.42, 0.012), beltMat);
    zipper.position.set(0, 0.225, 0.145);
    addMesh(upperBodyGroup, zipper);

    // Dual horizontal retro-reflective safety stripes around vest
    [0.12, 0.27].forEach((sy) => {
      const stripe = new THREE.Mesh(
        new THREE.CylinderGeometry(
          0.206 - (0.27 - sy) * 0.09,
          0.204 - (0.27 - sy) * 0.11,
          0.042,
          16
        ),
        reflectiveMat
      );
      stripe.scale.set(1.155, 1, 0.76);
      stripe.position.set(0, sy, 0);
      addMesh(upperBodyGroup, stripe);
    });

    // Vertical shoulder reflective straps on vest
    [-0.105, 0.105].forEach((sx) => {
      const vStrapFront = new THREE.Mesh(new THREE.BoxGeometry(0.036, 0.18, 0.015), reflectiveMat);
      vStrapFront.position.set(sx, 0.365, 0.132);
      vStrapFront.rotation.x = -0.14;
      addMesh(upperBodyGroup, vStrapFront);

      const vStrapBack = new THREE.Mesh(new THREE.BoxGeometry(0.036, 0.18, 0.015), reflectiveMat);
      vStrapBack.position.set(sx, 0.365, -0.132);
      vStrapBack.rotation.x = 0.14;
      addMesh(upperBodyGroup, vStrapBack);
    });
  } else {
    // Supervisor industrial work jacket: front placket + chest reflective band + ID badge
    const placket = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.45, 0.014), beltMat);
    placket.position.set(0, 0.23, 0.142);
    addMesh(upperBodyGroup, placket);

    const chestBand = new THREE.Mesh(new THREE.CylinderGeometry(0.201, 0.194, 0.036, 16), reflectiveMat);
    chestBand.scale.set(1.16, 1, 0.735);
    chestBand.position.set(0, 0.31, 0);
    addMesh(upperBodyGroup, chestBand);

    const idBadge = new THREE.Mesh(
      new THREE.BoxGeometry(0.055, 0.075, 0.01),
      new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.45, metalness: 0.05 })
    );
    idBadge.position.set(-0.095, 0.33, 0.142);
    addMesh(upperBodyGroup, idBadge);
  }

  // 4. Head, Neck, Safety Glasses & Industrial Hard Hat
  const headGroup = new THREE.Group();
  const baseHeadY = 0.51;
  headGroup.position.set(0, baseHeadY, 0);
  upperBodyGroup.add(headGroup);

  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.058, 0.09, 12), skinMat);
  neck.position.set(0, 0.035, 0);
  addMesh(headGroup, neck);

  // Proportional head
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.108, 16, 14), skinMat);
  head.scale.set(0.92, 1.08, 0.98);
  head.position.set(0, 0.155, 0.005);
  addMesh(headGroup, head);

  // Subtle nose bridge & ears for recognizable human profile
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.016, 0.038, 6), skinMat);
  nose.rotation.x = Math.PI / 2.2;
  nose.position.set(0, 0.15, 0.112);
  addMesh(headGroup, nose);

  [-0.098, 0.098].forEach((ex) => {
    const ear = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 8), skinMat);
    ear.scale.set(0.55, 1.15, 0.85);
    ear.position.set(ex, 0.155, -0.005);
    addMesh(headGroup, ear);
  });

  // Short hair / nape trim visible below rear of helmet
  const hairBack = new THREE.Mesh(
    new THREE.SphereGeometry(0.104, 14, 10, 0, Math.PI * 2, Math.PI * 0.42, Math.PI * 0.4),
    hairMat
  );
  hairBack.scale.set(0.94, 1.02, 0.98);
  hairBack.position.set(0, 0.155, -0.012);
  addMesh(headGroup, hairBack);

  // Wrap-around industrial safety glasses
  const visorFrame = new THREE.Mesh(new THREE.BoxGeometry(0.165, 0.038, 0.052), glassesMat);
  visorFrame.position.set(0, 0.172, 0.088);
  addMesh(headGroup, visorFrame);

  // Safety Helmet (Hard Hat): domed shell + center reinforcement rib + front brim
  const helmetShell = new THREE.Mesh(
    new THREE.SphereGeometry(0.124, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.56),
    helmetMat
  );
  helmetShell.scale.set(0.98, 0.96, 1.08);
  helmetShell.position.set(0, 0.20, 0.0);
  addMesh(headGroup, helmetShell);

  // Hard hat crown ridge rib
  const crownRib = new THREE.Mesh(new THREE.BoxGeometry(0.034, 0.028, 0.195), helmetMat);
  crownRib.position.set(0, 0.305, 0.005);
  addMesh(headGroup, crownRib);

  // Hard hat perimeter rim & projecting front sun visor
  const helmetRim = new THREE.Mesh(new THREE.CylinderGeometry(0.126, 0.132, 0.016, 18), helmetMat);
  helmetRim.scale.set(0.98, 1, 1.08);
  helmetRim.position.set(0, 0.198, 0.0);
  addMesh(headGroup, helmetRim);

  const frontBrim = new THREE.Mesh(
    new THREE.CylinderGeometry(0.112, 0.118, 0.012, 16, 1, false, -Math.PI * 0.36, Math.PI * 0.72),
    helmetMat
  );
  frontBrim.position.set(0, 0.194, 0.072);
  frontBrim.rotation.x = 0.08;
  addMesh(headGroup, frontBrim);

  // 5. Articulated Arms, Hands & Natural Pose Accessories
  const buildArm = (
    side: -1 | 1,
    shoulderRot: [number, number, number],
    elbowRot: [number, number, number],
    longSleeve: boolean = false
  ) => {
    const shoulder = new THREE.Group();
    shoulder.position.set(side * 0.235, 0.435, 0);
    shoulder.rotation.set(shoulderRot[0], shoulderRot[1], shoulderRot[2]);
    upperBodyGroup.add(shoulder);

    const upperArm = new THREE.Mesh(new THREE.CylinderGeometry(0.056, 0.048, 0.27, 10), shirtMat);
    upperArm.position.set(0, -0.135, 0);
    addMesh(shoulder, upperArm);

    const elbow = new THREE.Group();
    elbow.position.set(0, -0.27, 0);
    elbow.rotation.set(elbowRot[0], elbowRot[1], elbowRot[2]);
    shoulder.add(elbow);

    const elbowJoint = new THREE.Mesh(new THREE.SphereGeometry(0.048, 10, 8), shirtMat);
    addMesh(elbow, elbowJoint);

    if (longSleeve) {
      const sleeveForearm = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.040, 0.26, 10), shirtMat);
      sleeveForearm.position.set(0, -0.135, 0);
      addMesh(elbow, sleeveForearm);
    } else {
      const cuff = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.046, 0.075, 10), shirtMat);
      cuff.position.set(0, -0.04, 0);
      addMesh(elbow, cuff);

      const forearm = new THREE.Mesh(new THREE.CylinderGeometry(0.044, 0.036, 0.21, 10), skinMat);
      forearm.position.set(0, -0.165, 0);
      addMesh(elbow, forearm);
    }

    const hand = new THREE.Mesh(new THREE.BoxGeometry(0.046, 0.078, 0.068), skinMat);
    hand.position.set(0, -0.295, 0.008);
    addMesh(elbow, hand);

    return elbow;
  };

  let leftForearmGroup: THREE.Group | undefined;
  let rightForearmGroup: THREE.Group | undefined;
  let baseHeadRotY = 0;

  if (spec.pose === 'clipboard') {
    // Left arm holds industrial inspection clipboard; right arm rests naturally with slight bend
    leftForearmGroup = buildArm(-1, [-0.28, 0.12, -0.1], [-1.18, 0.28, 0]);
    rightForearmGroup = buildArm(1, [0.06, -0.08, 0.1], [-0.24, 0, 0]);

    const boardMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.55, metalness: 0.2 });
    const paperMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.9, metalness: 0.0 });
    const board = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.015, 0.29), boardMat);
    board.position.set(0.04, -0.30, 0.11);
    board.rotation.set(0.32, -0.15, 0.08);
    addMesh(leftForearmGroup, board);

    const paper = new THREE.Mesh(new THREE.BoxGeometry(0.185, 0.004, 0.245), paperMat);
    paper.position.set(0.04, -0.291, 0.11);
    paper.rotation.set(0.32, -0.15, 0.08);
    addMesh(leftForearmGroup, paper);

    headGroup.rotation.x = 0.14;
    baseHeadRotY = 0.08;
  } else if (spec.pose === 'arms_crossed') {
    // Calm supervisor posture: long-sleeve work jacket, left hand holding industrial radio, right arm relaxed
    leftForearmGroup = buildArm(-1, [-0.18, 0.10, -0.08], [-1.05, 0.15, 0], true);
    rightForearmGroup = buildArm(1, [0.06, -0.06, 0.08], [-0.20, 0, 0], true);

    const radioMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.45, metalness: 0.3 });
    const radioBody = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.125, 0.036), radioMat);
    radioBody.position.set(0.0, -0.30, 0.045);
    radioBody.rotation.x = 0.25;
    addMesh(leftForearmGroup, radioBody);

    const radioAnt = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.006, 0.11, 6), radioMat);
    radioAnt.position.set(0.015, -0.21, 0.06);
    radioAnt.rotation.x = 0.25;
    addMesh(leftForearmGroup, radioAnt);

    headGroup.rotation.x = 0.03;
    baseHeadRotY = 0.12;
  } else if (spec.pose === 'tablet') {
    // Both arms angled inward holding a ruggedized industrial diagnostic tablet
    leftForearmGroup = buildArm(-1, [-0.36, 0.18, -0.12], [-1.08, 0.42, 0]);
    rightForearmGroup = buildArm(1, [-0.36, -0.18, 0.12], [-1.08, -0.42, 0]);

    const tabletBodyMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.5, metalness: 0.3 });
    const tabletScreenMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      emissive: 0x1fa5a0,
      emissiveIntensity: 0.35,
      roughness: 0.2,
      metalness: 0.1,
    });
    const tablet = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.018, 0.17), tabletBodyMat);
    tablet.position.set(0, 0.18, 0.35);
    tablet.rotation.x = 0.55;
    addMesh(upperBodyGroup, tablet);

    const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.20, 0.135), tabletScreenMat);
    screen.position.set(0, 0.191, 0.354);
    screen.rotation.x = -Math.PI / 2 + 0.55;
    upperBodyGroup.add(screen);

    headGroup.rotation.x = 0.16;
    baseHeadRotY = 0.0;
  } else if (spec.pose === 'observing') {
    // Right hand resting near hip/belt, left arm relaxed observing machine operation
    leftForearmGroup = buildArm(-1, [0.05, 0.05, -0.09], [-0.18, 0, 0]);
    rightForearmGroup = buildArm(1, [0.16, -0.1, 0.28], [-0.72, -0.35, -0.32]);
    baseHeadRotY = -0.14;
  } else {
    // side_clipboard: relaxed stance holding inspection board down at right side
    leftForearmGroup = buildArm(-1, [0.08, 0.06, -0.10], [-0.28, 0.12, 0]);
    rightForearmGroup = buildArm(1, [-0.04, -0.06, 0.12], [-0.16, -0.05, 0]);

    const boardMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.55, metalness: 0.2 });
    const paperMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.9, metalness: 0.0 });
    const sideBoard = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.28, 0.21), boardMat);
    sideBoard.position.set(0.032, -0.32, 0.02);
    addMesh(rightForearmGroup, sideBoard);

    const sidePaper = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.23, 0.17), paperMat);
    sidePaper.position.set(0.041, -0.32, 0.02);
    addMesh(rightForearmGroup, sidePaper);

    baseHeadRotY = 0.10;
  }

  headGroup.rotation.y = baseHeadRotY;

  return {
    group: root,
    upperBodyGroup,
    headGroup,
    leftForearmGroup,
    rightForearmGroup,
    baseUpperY,
    baseHeadY,
    baseHeadRotY,
    phaseOffset: spec.phaseOffset,
  };
}

export function buildIndustrialWorkers(
  castShadow: boolean
): { group: THREE.Group; workers: AnimatedIndustrialWorker[] } {
  const container = new THREE.Group();
  container.name = 'industrial-workers';

  const shadowMat = new THREE.MeshBasicMaterial({
    map: createWorkerShadowTexture(),
    transparent: true,
    depthWrite: false,
    opacity: 0.72,
  });

  const workers = INDUSTRIAL_WORKER_SPECS.map((spec) => {
    const w = buildSingleWorker(spec, shadowMat, castShadow);
    container.add(w.group);
    return w;
  });

  return { group: container, workers };
}

/**
 * Minimal, calm natural idle motion: gentle breathing rise and slow occasional head glance.
 */
export function updateIndustrialWorkers(
  workers: AnimatedIndustrialWorker[],
  elapsedTime: number
) {
  for (let i = 0; i < workers.length; i++) {
    const w = workers[i];
    const t = elapsedTime + w.phaseOffset;

    // Gentle natural chest breathing (~0.26 Hz, 5mm rise)
    const breath = Math.sin(t * 1.65);
    w.upperBodyGroup.position.y = w.baseUpperY + breath * 0.005;

    // Slow, calm attentive glance left/right without jitter
    const glance = Math.sin(t * 0.34) * 0.11 + Math.sin(t * 0.17) * 0.05;
    w.headGroup.rotation.y = w.baseHeadRotY + glance;
  }
}
