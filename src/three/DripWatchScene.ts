import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { createMaterials, MaterialLibrary } from './materials';
import { 
  createMachineNameBoardTexture,
  createNodeBoxLabelTexture,
  createZoneLabelTexture,
  createLeakAlertBannerTexture,
  createRadialShadowTexture,
  createBlockLabelTexture,
  createMachineWarningLabelTexture,
  createSafetySignTexture,
  createVentGrilleTexture,
  createGaugeDialTexture,
  createCncScreenTexture,
  createLathePlacardTexture,
  createHpuTankPlateTexture,
  createPanelSeamsTexture,
  createMachineHazardDecalTexture,
  createMachineDecalNoticeTexture,
  createWetBadgeTexture,
  createDetectionChainLabelTexture,
  createElectrodeTagTexture,
  createElectrodeActiveBadgeTexture,
  createGeneralCompartmentTexture
} from './proceduralTextures';
import { 
  MachineId, 
  ZoneId, 
  FluidType, 
  LeakSpeed, 
  ZoneTelemetry, 
  MachineNodeState, 
  TechnicalViews,
  RenderQuality
} from '../types/dripwatch';
import { 
  MACHINES_CONFIG, 
  MACHINE_COORDINATES, 
  GATEWAY_COORDINATES, 
  PAD_DISTANCES
} from '../utils/iotLogic';
import {
  AnimatedIndustrialWorker,
  buildIndustrialWorkers,
  updateIndustrialWorkers
} from './industrialWorkers';

export const isSoftwareGl = (() => {
  if (typeof document === 'undefined') return true;
  const canvas = document.createElement('canvas');
  const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
  if (!gl) return true;
  const ext = gl.getExtension('WEBGL_debug_renderer_info');
  const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
  const gpu = String(gl.getParameter(param));
  gl.getExtension('WEBGL_lose_context')?.loseContext();
  return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
})();

interface SplashParticle {
  mesh: THREE.Mesh;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  maxLife: number;
}

interface ExpandingRipple {
  mesh: THREE.Mesh;
  scale: number;
  maxScale: number;
  opacity: number;
}

interface ActiveDroplet {
  mesh: THREE.Mesh;
  machineId: MachineId;
  zoneId: ZoneId;
  fluidType: FluidType;
  vy: number;
  targetY: number;
}

export interface ElectrodeAssembly {
  oilRod: THREE.Mesh;
  coolantRod: THREE.Mesh;
  oilTag: THREE.Mesh;
  coolantTag: THREE.Mesh;
  oilBadge: THREE.Mesh;
  coolantBadge: THREE.Mesh;
  oilLight: THREE.PointLight;
  coolantLight: THREE.PointLight;
  oilWire: THREE.Mesh;
  coolantWire: THREE.Mesh;
  pin1: THREE.Mesh;
  pin2: THREE.Mesh;
  sparkArc: THREE.Mesh;
}

interface Machine3DRef {
  group: THREE.Group;
  chassisMeshes: THREE.Mesh[];
  xrayMeshes: THREE.Object3D[];
  nameBoardMesh: THREE.Mesh;
  nodeBoxMesh: THREE.Mesh;
  nodeLabelMesh: THREE.Mesh;
  lastNodeDisplayKey: string;
  nodeLidMesh: THREE.Mesh;
  nodePcbGroup: THREE.Group;
  beaconLightMesh: THREE.Mesh;
  beaconPointLight: THREE.PointLight;
  ledZ1Mesh: THREE.Mesh;
  ledZ2Mesh: THREE.Mesh;
  zoneFills: Record<ZoneId, THREE.Mesh>;
  puddles: Record<ZoneId, THREE.Mesh>;
  meniscusRims: Record<ZoneId, THREE.Mesh>;
  puddleGeometries: Record<ZoneId, THREE.BufferGeometry>;
  spreadPads: Record<ZoneId, THREE.Mesh[]>;
  padPulses: Record<ZoneId, Array<{ mesh: THREE.Mesh; scale: number; opacity: number; active: boolean }>>;
  electrodes: Record<ZoneId, ElectrodeAssembly | null>;
  irSensors: Record<ZoneId, { body: THREE.Mesh; lens: THREE.Mesh; emitterLine: THREE.Line; reflectedLine: THREE.Line } | null>;
  wetBadges: Record<ZoneId, { mesh: THREE.Mesh; triggeredAt: number | null }>;
  swellingDroplets: Record<ZoneId, THREE.Mesh>;
  alertBanner: THREE.Mesh;
  dripTrail: THREE.Mesh;
  dripTrails: Record<ZoneId, THREE.Mesh>;
  fluidStream: THREE.Mesh;
  nozzles: Record<ZoneId, THREE.Vector3>;
  cableCurves: Record<ZoneId, THREE.CatmullRomCurve3>;
  signalPulses: Record<ZoneId, THREE.Mesh>;
  lastAlertState: boolean;
}

export class DripWatchScene {
  private container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private materials: MaterialLibrary;
  private isDestroyed: boolean = false;
  private frameId: number = 0;
  private lastFrameTime: number = performance.now();
  private elapsedTime: number = 0;

  // Quality & Performance
  private currentQuality: RenderQuality = 'high';
  private maxActiveDroplets: number = 90;
  private maxActiveSplashes: number = 70;
  private maxActiveRipples: number = 30;
  private keyLight!: THREE.DirectionalLight;
  private slowFrameCount: number = 0;

  // Interactivity
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private interactiveMeshes: THREE.Mesh[] = [];
  private originalMaterials: Map<THREE.Mesh, THREE.Material | THREE.Material[]> = new Map();
  private hoveredMesh: THREE.Mesh | null = null;
  private previousEmissiveHex: number = 0;

  // Technical views
  private technicalViews: TechnicalViews = {
    xrayMachine: false,
    openController: false,
    signalPaths: false,
    insideSensor: false,
  };

  // Camera tweening
  private targetCameraPos: THREE.Vector3 | null = null;
  private targetControlsTarget: THREE.Vector3 | null = null;
  private activeDemoStep: number | null = null;

  // 4 Machines 3D References
  private machines: Record<MachineId, Machine3DRef> = {} as any;

  // Fluid Simulation Objects
  private dropletGroup: THREE.Group = new THREE.Group();
  private activeDroplets: ActiveDroplet[] = [];
  private splashGroup: THREE.Group = new THREE.Group();
  private activeSplashes: SplashParticle[] = [];
  private rippleGroup: THREE.Group = new THREE.Group();
  private activeRipples: ExpandingRipple[] = [];

  // Shared reusable geometries to prevent GC allocation churn
  private static sharedDropCoolantGeo: THREE.SphereGeometry | null = null;
  private static sharedDropOilGeo: THREE.SphereGeometry | null = null;
  private static sharedSplashGeo: THREE.SphereGeometry | null = null;
  private static sharedRippleGeo: THREE.RingGeometry | null = null;

  private getDropGeometry(fluidType: FluidType): THREE.SphereGeometry {
    if (fluidType === 'oil') {
      if (!DripWatchScene.sharedDropOilGeo) {
        DripWatchScene.sharedDropOilGeo = new THREE.SphereGeometry(0.11, 16, 16);
      }
      return DripWatchScene.sharedDropOilGeo;
    } else {
      if (!DripWatchScene.sharedDropCoolantGeo) {
        DripWatchScene.sharedDropCoolantGeo = new THREE.SphereGeometry(0.098, 16, 16);
      }
      return DripWatchScene.sharedDropCoolantGeo;
    }
  }

  private getSplashGeometry(): THREE.SphereGeometry {
    if (!DripWatchScene.sharedSplashGeo) {
      DripWatchScene.sharedSplashGeo = new THREE.SphereGeometry(0.02, 6, 6);
    }
    return DripWatchScene.sharedSplashGeo;
  }

  private getRippleGeometry(): THREE.RingGeometry {
    if (!DripWatchScene.sharedRippleGeo) {
      const g = new THREE.RingGeometry(0.04, 0.08, 16);
      g.rotateX(-Math.PI / 2);
      DripWatchScene.sharedRippleGeo = g;
    }
    return DripWatchScene.sharedRippleGeo;
  }

  // Communication links & General Compartment Box
  private gatewayGroup: THREE.Group = new THREE.Group();
  private compartmentScreenMesh!: THREE.Mesh;
  private compartmentBeaconMesh!: THREE.Mesh;
  private compartmentBeaconLight!: THREE.PointLight;
  private lastCompartmentKey: string = '';
  private wirelessLinksGroup: THREE.Group = new THREE.Group();
  private wirelessPackets: Array<{
    machineId: MachineId;
    mesh: THREE.Mesh;
    line: THREE.Line;
    curve: THREE.QuadraticBezierCurve3;
  }> = [];
  private signalDotsGroup: THREE.Group = new THREE.Group();


  // Inside Sensor Cutaway Model
  private insideSensorGroup: THREE.Group = new THREE.Group();
  private arcBridgeMesh!: THREE.Mesh;
  private irBeamMesh!: THREE.Mesh;

  // Industrial Shop Floor Workers
  private workersGroup: THREE.Group = new THREE.Group();
  private workers: AnimatedIndustrialWorker[] = [];

  constructor(
    container: HTMLElement, 
    initialQuality: RenderQuality = 'high'
  ) {
    this.container = container;
    this.currentQuality = initialQuality;
    this.lastFrameTime = performance.now();
    this.elapsedTime = 0;
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    // 1. Scene & Environment: Modern CNC facility architectural atmosphere
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0f172a);
    this.scene.fog = new THREE.Fog(0x0f172a, 58, 150);

    // 2. Camera: crisp perspective overlooking all machines cleanly
    this.camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 150);
    this.camera.position.set(0, 16.5, 20.0);

    // 3. Renderer with high performance & WebGL support
    this.renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: true,
      alpha: false
    });
    this.renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(width, height);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;
    this.renderer.shadowMap.enabled = !isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.appendChild(this.renderer.domElement);

    // 4. OrbitControls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = !isSoftwareGl;
    this.controls.dampingFactor = 0.08;
    this.controls.maxPolarAngle = Math.PI / 2 - 0.08;
    this.controls.minDistance = 4.0;
    this.controls.maxDistance = 44.0;
    this.controls.target.set(0, 1.2, 0);
    this.controls.update();

    // 5. Studio Environment map for realistic reflections on steel, chrome & epoxy concrete
    const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environmentIntensity = 0.85;
    pmremGenerator.dispose();

    // 6. Materials
    this.materials = createMaterials();

    // 7. Build Shop Floor Scene
    this.setupLighting();
    this.buildShopFloor();
    this.buildShopEnvironment();
    this.buildMqttGateway();
    this.buildAllFourMachines();
    this.buildWirelessLinks();
    this.buildInsideSensorCutaway();
    const builtWorkers = buildIndustrialWorkers(!isSoftwareGl);
    this.workersGroup = builtWorkers.group;
    this.workers = builtWorkers.workers;

    this.scene.add(this.workersGroup);
    this.scene.add(this.dropletGroup);
    this.scene.add(this.splashGroup);
    this.scene.add(this.rippleGroup);
    this.scene.add(this.signalDotsGroup);
    this.scene.add(this.wirelessLinksGroup);
    this.scene.add(this.insideSensorGroup);

    // Apply quality preset
    this.setQuality(this.currentQuality);

    // 8. Event listeners & Raycasting
    this.setupInteractivity();
    window.addEventListener('resize', this.onResize);

    // 9. Start Render Loop
    this.startLoop();
  }

  public setQuality(quality: RenderQuality) {
    this.currentQuality = quality;
    const dpr = isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2.0);
    if (quality === 'low') {
      this.renderer.setPixelRatio(1);
      this.renderer.shadowMap.enabled = false;
      if (this.keyLight) {
        this.keyLight.castShadow = false;
      }
      this.maxActiveDroplets = 25;
      this.maxActiveSplashes = 20;
      this.maxActiveRipples = 10;
    } else if (quality === 'medium') {
      this.renderer.setPixelRatio(dpr);
      this.renderer.shadowMap.enabled = !isSoftwareGl;
      if (this.keyLight) {
        this.keyLight.castShadow = !isSoftwareGl;
        if (this.keyLight.shadow) {
          this.keyLight.shadow.mapSize.width = 1024;
          this.keyLight.shadow.mapSize.height = 1024;
        }
      }
      this.maxActiveDroplets = 50;
      this.maxActiveSplashes = 45;
      this.maxActiveRipples = 20;
    } else { // high
      this.renderer.setPixelRatio(dpr);
      this.renderer.shadowMap.enabled = !isSoftwareGl;
      if (this.keyLight) {
        this.keyLight.castShadow = !isSoftwareGl;
        if (this.keyLight.shadow) {
          this.keyLight.shadow.mapSize.width = 2048;
          this.keyLight.shadow.mapSize.height = 2048;
        }
      }
      this.maxActiveDroplets = 90;
      this.maxActiveSplashes = 70;
      this.maxActiveRipples = 30;
    }
  }

  private setupLighting() {
    // 1. Natural modern CNC facility ambient skylight + cool-slate floor bounce
    const hemiLight = new THREE.HemisphereLight(0xeef6ff, 0x243447, 1.25);
    hemiLight.position.set(0, 32, 0);
    this.scene.add(hemiLight);

    // 2. Primary directional key light casting crisp, natural industrial shadows
    this.keyLight = new THREE.DirectionalLight(0xfff7ed, 2.35);
    this.keyLight.position.set(14, 28, 16);
    this.keyLight.castShadow = !isSoftwareGl;
    if (this.keyLight.castShadow) {
      this.keyLight.shadow.mapSize.width = 2048;
      this.keyLight.shadow.mapSize.height = 2048;
      this.keyLight.shadow.camera.near = 2;
      this.keyLight.shadow.camera.far = 70;
      this.keyLight.shadow.camera.left = -26;
      this.keyLight.shadow.camera.right = 26;
      this.keyLight.shadow.camera.top = 26;
      this.keyLight.shadow.camera.bottom = -26;
      this.keyLight.shadow.bias = -0.00035;
      this.keyLight.shadow.normalBias = 0.025;
      this.keyLight.shadow.radius = 2.5;
    }
    this.scene.add(this.keyLight);

    // 3. Cool architectural clerestory fill from north-west for realistic metallic depth
    const fillLight = new THREE.DirectionalLight(0xa5d8ff, 0.95);
    fillLight.position.set(-18, 18, -14);
    this.scene.add(fillLight);

    // 4. Gentle front workshop bounce light keeping machine faces and trays clearly visible
    const frontLight = new THREE.DirectionalLight(0xf8fafc, 0.85);
    frontLight.position.set(0, 15, 22);
    this.scene.add(frontLight);
  }

  private registerPartMesh(mesh: THREE.Mesh, _partId?: string) {
    this.interactiveMeshes.push(mesh);
    this.originalMaterials.set(mesh, mesh.material);
  }

  private buildShopFloor() {
    // 1. Sealed industrial concrete floor plane with roughness variation & drain grates
    const floorGeo = new THREE.PlaneGeometry(52, 44);
    const floorMesh = new THREE.Mesh(floorGeo, this.materials.factoryFloor);
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.position.y = 0;
    floorMesh.receiveShadow = !isSoftwareGl;
    this.scene.add(floorMesh);

    // 2. Main Central Pedestrian Walkway (Textured safety-green epoxy aisle with painted yellow edge stripes)
    const aisleGeo = new THREE.PlaneGeometry(4.0, 42);
    const aisleMesh = new THREE.Mesh(aisleGeo, this.materials.walkwayGreen);
    aisleMesh.rotation.x = -Math.PI / 2;
    aisleMesh.position.set(0, 0.01, 0);
    aisleMesh.receiveShadow = !isSoftwareGl;
    this.scene.add(aisleMesh);

    // Cross Walkway connecting east & west cells
    const crossAisleGeo = new THREE.PlaneGeometry(48, 3.6);
    const crossAisleMesh = new THREE.Mesh(crossAisleGeo, this.materials.walkwayGreenCross);
    crossAisleMesh.rotation.x = -Math.PI / 2;
    crossAisleMesh.position.set(0, 0.014, 0.8);
    crossAisleMesh.receiveShadow = !isSoftwareGl;
    this.scene.add(crossAisleMesh);

    // 3. Realistic dark slate CNC work-cell epoxy pads with crisp OSHA perimeter hazard border
    const cellPositions = [
      { x: -7.5, z: -4.0 },
      { x: 7.5, z: -4.0 },
      { x: -7.5, z: 5.5 },
      { x: 7.5, z: 5.5 },
    ];

    const sharedRadialShadowMat = new THREE.MeshBasicMaterial({
      map: createRadialShadowTexture(),
      transparent: true,
      opacity: 0.58,
      depthWrite: false
    });

    cellPositions.forEach(pos => {
      // Work cell anti-slip epoxy pad with crisp perimeter hazard stripes
      const borderGeo = new THREE.PlaneGeometry(10.2, 7.2);
      const borderMesh = new THREE.Mesh(borderGeo, this.materials.workCellPad);
      borderMesh.rotation.x = -Math.PI / 2;
      borderMesh.position.set(pos.x, 0.018, pos.z);
      borderMesh.receiveShadow = !isSoftwareGl;
      this.scene.add(borderMesh);

      // Soft contact shadow beneath machine footprint
      const shadowGeo = new THREE.PlaneGeometry(9.2, 6.2);
      const shadow = new THREE.Mesh(shadowGeo, sharedRadialShadowMat);
      shadow.rotation.x = -Math.PI / 2;
      shadow.position.set(pos.x, 0.022, pos.z);
      this.scene.add(shadow);
    });
  }

  private buildShopEnvironment() {
    // =========================================================================
    // MODERN CNC MANUFACTURING WORKSHOP ARCHITECTURE (PERIMETER & STRUCTURE)
    // Precast wainscoting & ribbed metal walls, structural H-beam columns with
    // baseplates, clerestory daylight windows, high steel roof trusses & crane
    // runway rails (no hanging ceiling lamps), utility headers, and shop props.
    // =========================================================================

    // 1. North Factory Back Wall (Modern precast concrete + ribbed architectural steel cladding)
    const northWallGeo = new THREE.BoxGeometry(52, 12, 0.6);
    const northWallMesh = new THREE.Mesh(northWallGeo, this.materials.factoryWall);
    northWallMesh.position.set(0, 6.0, -17.5);
    northWallMesh.receiveShadow = !isSoftwareGl;
    this.scene.add(northWallMesh);

    // 2. West Industrial Wall
    const westWallGeo = new THREE.BoxGeometry(0.6, 12, 44);
    const westWallMesh = new THREE.Mesh(westWallGeo, this.materials.factoryWall);
    westWallMesh.position.set(-26.0, 6.0, 0);
    westWallMesh.receiveShadow = !isSoftwareGl;
    this.scene.add(westWallMesh);

    // 3. East Industrial Wall
    const eastWallGeo = new THREE.BoxGeometry(0.6, 12, 44);
    const eastWallMesh = new THREE.Mesh(eastWallGeo, this.materials.factoryWall);
    eastWallMesh.position.set(26.0, 6.0, 0);
    eastWallMesh.receiveShadow = !isSoftwareGl;
    this.scene.add(eastWallMesh);

    // 4. Wall Dado Plinth (Concrete floor curb along the base of all perimeter walls)
    const dadoMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.62, metalness: 0.18 });
    const northDado = new THREE.Mesh(new THREE.BoxGeometry(52, 0.55, 0.72), dadoMat);
    northDado.position.set(0, 0.275, -17.44);
    northDado.receiveShadow = !isSoftwareGl;
    this.scene.add(northDado);

    const westDado = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.55, 44), dadoMat);
    westDado.position.set(-25.94, 0.275, 0);
    westDado.receiveShadow = !isSoftwareGl;
    this.scene.add(westDado);

    const eastDado = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.55, 44), dadoMat);
    eastDado.position.set(25.94, 0.275, 0);
    eastDado.receiveShadow = !isSoftwareGl;
    this.scene.add(eastDado);

    // 5. Structural Steel H-Beam Columns with Bolted Baseplates & Safety Lower Collars
    const colPositions: Array<{ x: number; z: number; rotateY: number }> = [
      { x: -20, z: -17.05, rotateY: 0 },
      { x: -10, z: -17.05, rotateY: 0 },
      { x: 0, z: -17.05, rotateY: 0 },
      { x: 10, z: -17.05, rotateY: 0 },
      { x: 20, z: -17.05, rotateY: 0 },
      { x: -25.55, z: -10, rotateY: Math.PI / 2 },
      { x: -25.55, z: 0, rotateY: Math.PI / 2 },
      { x: -25.55, z: 10, rotateY: Math.PI / 2 },
      { x: 25.55, z: -10, rotateY: Math.PI / 2 },
      { x: 25.55, z: 0, rotateY: Math.PI / 2 },
      { x: 25.55, z: 10, rotateY: Math.PI / 2 },
    ];
    const flangeGeo = new THREE.BoxGeometry(0.54, 12.0, 0.08);
    const webGeo = new THREE.BoxGeometry(0.10, 12.0, 0.42);
    const basePlateGeo = new THREE.BoxGeometry(0.84, 0.08, 0.78);
    const bumperGeo = new THREE.BoxGeometry(0.62, 0.92, 0.60);

    colPositions.forEach(cp => {
      const colGroup = new THREE.Group();
      colGroup.position.set(cp.x, 0, cp.z);
      colGroup.rotation.y = cp.rotateY;

      const frontFlange = new THREE.Mesh(flangeGeo, this.materials.trussSteel);
      frontFlange.position.set(0, 6.0, 0.21);
      frontFlange.castShadow = !isSoftwareGl;
      colGroup.add(frontFlange);

      const backFlange = new THREE.Mesh(flangeGeo, this.materials.trussSteel);
      backFlange.position.set(0, 6.0, -0.21);
      colGroup.add(backFlange);

      const web = new THREE.Mesh(webGeo, this.materials.trussSteel);
      web.position.set(0, 6.0, 0);
      colGroup.add(web);

      const basePlate = new THREE.Mesh(basePlateGeo, this.materials.m1Graphite);
      basePlate.position.set(0, 0.04, 0);
      basePlate.receiveShadow = !isSoftwareGl;
      colGroup.add(basePlate);

      // Protective safety-yellow lower column guard collar
      const bumper = new THREE.Mesh(bumperGeo, this.materials.safetyYellow);
      bumper.position.set(0, 0.50, 0);
      colGroup.add(bumper);

      this.scene.add(colGroup);
    });

    // 5b. High Architectural Clerestory Daylight Windows along Upper Perimeter Walls (y = 9.6m)
    const mullionMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.45, metalness: 0.65 });
    const northWindowXs = [-15, -5, 5, 15];
    northWindowXs.forEach(wx => {
      const frame = new THREE.Mesh(new THREE.BoxGeometry(7.2, 1.75, 0.14), mullionMat);
      frame.position.set(wx, 9.75, -17.18);
      this.scene.add(frame);

      const glass = new THREE.Mesh(new THREE.PlaneGeometry(6.85, 1.45), this.materials.clerestoryGlass);
      glass.position.set(wx, 9.75, -17.10);
      this.scene.add(glass);

      // Vertical aluminum mullions
      [-2.25, 0, 2.25].forEach(mx => {
        const bar = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.55, 0.16), mullionMat);
        bar.position.set(wx + mx, 9.75, -17.12);
        this.scene.add(bar);
      });
    });

    // Side-wall clerestory windows on West and East upper walls
    [-12, -3, 6].forEach(wz => {
      [-1, 1].forEach(side => {
        const frame = new THREE.Mesh(new THREE.BoxGeometry(0.14, 1.75, 6.4), mullionMat);
        frame.position.set(side * 25.68, 9.75, wz);
        this.scene.add(frame);

        const glass = new THREE.Mesh(new THREE.PlaneGeometry(6.05, 1.45), this.materials.clerestoryGlass);
        glass.rotation.y = side === -1 ? Math.PI / 2 : -Math.PI / 2;
        glass.position.set(side * 25.60, 9.75, wz);
        this.scene.add(glass);
      });
    });

    // 5c. Overhead Structural Steel Perimeter Girders, Roof Trusses & Crane Runway Rails (NO hanging lamps)
    const northGirder = new THREE.Mesh(new THREE.BoxGeometry(52, 0.45, 0.42), this.materials.trussSteel);
    northGirder.position.set(0, 11.75, -17.1);
    this.scene.add(northGirder);

    [-25.55, 25.55].forEach(sx => {
      const sideGirder = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.45, 44), this.materials.trussSteel);
      sideGirder.position.set(sx, 11.75, 0);
      this.scene.add(sideGirder);

      // Industrial yellow overhead bridge-crane runway rail along East & West walls
      const runwayRail = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.55, 40), this.materials.craneBeam);
      runwayRail.position.set(sx + (sx < 0 ? 0.48 : -0.48), 8.2, 0);
      this.scene.add(runwayRail);
    });

    // High architectural steel roof trusses (structural framing only, cleanly above scene)
    [-14.5, -5.0, 4.5].forEach(tz => {
      const topChord = new THREE.Mesh(new THREE.BoxGeometry(51.4, 0.24, 0.24), this.materials.trussSteel);
      topChord.position.set(0, 11.88, tz);
      this.scene.add(topChord);

      const bottomChord = new THREE.Mesh(new THREE.BoxGeometry(51.4, 0.18, 0.18), this.materials.trussSteel);
      bottomChord.position.set(0, 11.15, tz);
      this.scene.add(bottomChord);

      for (let x = -22; x <= 22; x += 4.4) {
        const strut = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.72, 0.10), this.materials.trussSteel);
        strut.position.set(x, 11.52, tz);
        this.scene.add(strut);
      }
    });

    // 6. Perforated Galvanized Cable Trays along walls
    const trayGeoNorth = new THREE.BoxGeometry(50, 0.12, 0.45);
    const cableTrayNorth = new THREE.Mesh(trayGeoNorth, this.materials.cableTray);
    cableTrayNorth.position.set(0, 4.4, -17.15);
    this.scene.add(cableTrayNorth);

    const trayGeoSides = new THREE.BoxGeometry(0.45, 0.12, 40);
    const cableTrayWest = new THREE.Mesh(trayGeoSides, this.materials.cableTray);
    cableTrayWest.position.set(-25.65, 4.4, 0);
    this.scene.add(cableTrayWest);

    const cableTrayEast = new THREE.Mesh(trayGeoSides, this.materials.cableTray);
    cableTrayEast.position.set(25.65, 4.4, 0);
    this.scene.add(cableTrayEast);

    // 10. Galvanized Electrical EMT Conduit Lines & ISO Blue Compressed-Air Distribution Header
    const conduitGeo = new THREE.CylinderGeometry(0.045, 0.045, 48, 8);
    conduitGeo.rotateZ(Math.PI / 2);
    const conduit1 = new THREE.Mesh(conduitGeo, this.materials.conduitElectric);
    conduit1.position.set(0, 3.2, -17.15);
    this.scene.add(conduit1);

    const conduit2 = new THREE.Mesh(conduitGeo, this.materials.conduitElectric);
    conduit2.position.set(0, 3.4, -17.15);
    this.scene.add(conduit2);

    const airHeaderGeo = new THREE.CylinderGeometry(0.055, 0.055, 48, 10);
    airHeaderGeo.rotateZ(Math.PI / 2);
    const airHeader = new THREE.Mesh(airHeaderGeo, this.materials.compressedAirPipe);
    airHeader.position.set(0, 3.72, -17.14);
    this.scene.add(airHeader);

    // Perimeter CNC Main Electrical Disconnect Panel along North Wall (-5.8, 0, -17.0)
    const panelBody = new THREE.Mesh(new THREE.BoxGeometry(1.45, 2.1, 0.42), this.materials.storageCabinet);
    panelBody.position.set(-5.8, 1.45, -17.0);
    panelBody.castShadow = !isSoftwareGl;
    this.scene.add(panelBody);

    const panelHandle = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.32, 0.08), this.materials.fireExtinguisher);
    panelHandle.position.set(-5.24, 1.65, -16.76);
    this.scene.add(panelHandle);

    // Subtle safety bollards framing the northern walkway entrance at North Wall
    const bollardGeo = new THREE.CylinderGeometry(0.08, 0.08, 1.0, 12);
    [-2.2, 2.2].forEach(bx => {
      const bollard = new THREE.Mesh(bollardGeo, this.materials.safetyYellow);
      bollard.position.set(bx, 0.5, -16.4);
      bollard.castShadow = !isSoftwareGl;
      this.scene.add(bollard);

      const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.082, 0.082, 0.12, 12), this.materials.m1Graphite);
      cap.position.set(bx, 0.96, -16.4);
      this.scene.add(cap);
    });

    // 11. Wall Ventilation Louvers on North Wall
    const ventGeo = new THREE.PlaneGeometry(2.8, 2.8);
    const ventMat = new THREE.MeshStandardMaterial({
      map: createVentGrilleTexture(),
      roughness: 0.5,
      metalness: 0.6
    });
    [-18.0, 18.0].forEach(vx => {
      const vent = new THREE.Mesh(ventGeo, ventMat);
      vent.position.set(vx, 7.2, -17.18);
      this.scene.add(vent);
    });

    // 12. Safety Signs on North Wall (ultra-crisp, non-tone-mapped, polygonOffset prevents shimmer)
    const signGeo = new THREE.PlaneGeometry(1.8, 1.8);
    const makeSignMat = (type: 'eye_protection' | 'fire_extinguisher' | 'spill_response') =>
      new THREE.MeshBasicMaterial({
        map: createSafetySignTexture(type),
        toneMapped: false,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -1
      });
    const eyeSign = new THREE.Mesh(signGeo, makeSignMat('eye_protection'));
    eyeSign.position.set(-13.5, 4.4, -17.16);
    this.scene.add(eyeSign);

    const spillSign = new THREE.Mesh(signGeo, makeSignMat('spill_response'));
    spillSign.position.set(4.5, 4.4, -17.16);
    this.scene.add(spillSign);

    const fireSign = new THREE.Mesh(signGeo, makeSignMat('fire_extinguisher'));
    fireSign.position.set(13.5, 4.4, -17.16);
    this.scene.add(fireSign);

    // 13. Wall-Mounted Fire Extinguisher (under fire sign)
    const extGroup = new THREE.Group();
    extGroup.position.set(13.5, 2.0, -17.0);

    const tankGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.9, 16);
    const tankMesh = new THREE.Mesh(tankGeo, this.materials.fireExtinguisher);
    tankMesh.position.y = 0.45;
    tankMesh.castShadow = !isSoftwareGl;
    extGroup.add(tankMesh);

    const capGeo = new THREE.SphereGeometry(0.18, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2);
    const capMesh = new THREE.Mesh(capGeo, this.materials.fireExtinguisher);
    capMesh.position.y = 0.9;
    extGroup.add(capMesh);

    const valveGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.14, 8);
    const valveMesh = new THREE.Mesh(valveGeo, this.materials.brassFitting);
    valveMesh.position.y = 1.0;
    extGroup.add(valveMesh);

    const hoseGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.65, 8);
    const hoseMesh = new THREE.Mesh(hoseGeo, this.materials.rubberHose);
    hoseMesh.position.set(0.18, 0.6, 0.05);
    extGroup.add(hoseMesh);

    this.scene.add(extGroup);

    // 14. Heavy Industrial Steel Workbench along North Wall (-14.0, 0, -16.5)
    const benchGroup = new THREE.Group();
    benchGroup.position.set(-14.0, 0, -16.2);

    const bTop = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.14, 1.2), this.materials.workbenchWood);
    bTop.position.set(0, 0.92, 0);
    benchGroup.add(bTop);

    const bLegGeo = new THREE.BoxGeometry(0.12, 0.85, 0.12);
    [
      { x: -1.65, z: -0.45 },
      { x: 1.65, z: -0.45 },
      { x: -1.65, z: 0.45 },
      { x: 1.65, z: 0.45 },
    ].forEach(lp => {
      const leg = new THREE.Mesh(bLegGeo, this.materials.storageCabinet);
      leg.position.set(lp.x, 0.42, lp.z);
      benchGroup.add(leg);
    });

    // Cast-iron bench vise on corner of workbench
    const viseGeo = new THREE.BoxGeometry(0.35, 0.25, 0.3);
    const vise = new THREE.Mesh(viseGeo, this.materials.toolMetal);
    vise.position.set(1.4, 1.1, 0.3);
    benchGroup.add(vise);

    this.scene.add(benchGroup);

    // 15. Heavy-Duty Mobile Industrial Tool Chest along East Wall (24.0, 0, 0.5)
    const toolChestGroup = new THREE.Group();
    toolChestGroup.position.set(24.2, 0, 0.5);
    toolChestGroup.rotation.y = -Math.PI / 2;

    const chestBody = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.4, 1.0), this.materials.fireExtinguisher);
    chestBody.position.set(0, 0.78, 0);
    toolChestGroup.add(chestBody);

    // Chrome drawer handles
    for (let dy = 0.35; dy <= 1.35; dy += 0.22) {
      const handle = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.03, 0.04), this.materials.machineChrome);
      handle.position.set(0, dy, 0.52);
      toolChestGroup.add(handle);
    }
    this.scene.add(toolChestGroup);

    // 16. 55-Gallon Drum Secondary Containment Rack along West Wall (-24.2, 0, 0.5)
    const drumRackGroup = new THREE.Group();
    drumRackGroup.position.set(-24.2, 0, 0.5);
    drumRackGroup.rotation.y = Math.PI / 2;

    // Yellow spill pallet base
    const spillPallet = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.3, 1.4), this.materials.safetyYellow);
    spillPallet.position.set(0, 0.15, 0);
    drumRackGroup.add(spillPallet);

    // 2 Oil Drums (55 Gallon barrels in industrial blue and dark green)
    const drumGeo = new THREE.CylinderGeometry(0.42, 0.42, 1.15, 16);
    const drum1 = new THREE.Mesh(drumGeo, this.materials.machineM1);
    drum1.position.set(-0.75, 0.88, 0);
    drumRackGroup.add(drum1);

    const drum2 = new THREE.Mesh(drumGeo, this.materials.machineM3);
    drum2.position.set(0.75, 0.88, 0);
    drumRackGroup.add(drum2);

    this.scene.add(drumRackGroup);

    // 17. Wood Pallet with Machined Steel Billet Stock along North Wall (14.0, 0, -16.2)
    const billetGroup = new THREE.Group();
    billetGroup.position.set(14.0, 0, -16.2);

    const pallet = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.22, 2.0), this.materials.palletWood);
    pallet.position.set(0, 0.11, 0);
    billetGroup.add(pallet);

    // Stacked cylindrical steel billet stock
    const billetGeo = new THREE.CylinderGeometry(0.18, 0.18, 1.6, 12);
    billetGeo.rotateZ(Math.PI / 2);
    [-0.5, 0.0, 0.5].forEach(bz => {
      const billet = new THREE.Mesh(billetGeo, this.materials.toolMetal);
      billet.position.set(0, 0.4, bz);
      billetGroup.add(billet);
    });
    this.scene.add(billetGroup);
  }

  private buildMqttGateway() {
    this.gatewayGroup = new THREE.Group();
    const gCoords = GATEWAY_COORDINATES; // { x: 0, y: 2.35, z: 0.75 }

    // Steel Floor Pedestal Base for General Compartment Box
    const basePlinth = new THREE.Mesh(
      new THREE.BoxGeometry(2.7, 0.9, 1.0),
      this.materials.m1Graphite
    );
    basePlinth.position.set(gCoords.x, 0.45, gCoords.z);
    this.gatewayGroup.add(basePlinth);

    // Main Industrial General Compartment Cabinet Enclosure
    const chassisGeo = new THREE.BoxGeometry(2.5, 2.1, 0.85);
    const chassisMesh = new THREE.Mesh(chassisGeo, this.materials.gatewayBody);
    chassisMesh.position.set(gCoords.x, 1.95, gCoords.z);
    this.gatewayGroup.add(chassisMesh);
    this.registerPartMesh(chassisMesh, 'general-compartment-box');

    // Steel Upper Rim Bezel
    const topCap = new THREE.Mesh(
      new THREE.BoxGeometry(2.6, 0.12, 0.92),
      this.materials.machineMetalTrim
    );
    topCap.position.set(gCoords.x, 3.04, gCoords.z);
    this.gatewayGroup.add(topCap);

    // Large Front High-Contrast Display Screen: GENERAL COMPARTMENT BOX
    const screenGeo = new THREE.PlaneGeometry(2.26, 1.36);
    const screenMat = new THREE.MeshBasicMaterial({
      map: createGeneralCompartmentTexture([]),
      side: THREE.DoubleSide,
      toneMapped: false,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1
    });
    this.compartmentScreenMesh = new THREE.Mesh(screenGeo, screenMat);
    this.compartmentScreenMesh.position.set(gCoords.x, 2.05, gCoords.z + 0.44);
    this.compartmentScreenMesh.renderOrder = 18;
    this.gatewayGroup.add(this.compartmentScreenMesh);
    this.lastCompartmentKey = 'NORMAL';

    // Dual Telemetry Antennas on Cabinet Top
    const antGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.85, 12);
    const antL = new THREE.Mesh(antGeo, this.materials.gatewayAntenna);
    antL.position.set(gCoords.x - 0.95, 3.5, gCoords.z);
    this.gatewayGroup.add(antL);

    const antR = new THREE.Mesh(antGeo, this.materials.gatewayAntenna);
    antR.position.set(gCoords.x + 0.95, 3.5, gCoords.z);
    this.gatewayGroup.add(antR);

    // Central Plant Alert Beacon Tower on General Compartment Box
    const bStem = new THREE.Mesh(
      new THREE.CylinderGeometry(0.045, 0.045, 0.35, 12),
      this.materials.machineMetalTrim
    );
    bStem.position.set(gCoords.x, 3.25, gCoords.z);
    this.gatewayGroup.add(bStem);

    this.compartmentBeaconMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.14, 0.14, 0.38, 16),
      this.materials.beaconGreen
    );
    this.compartmentBeaconMesh.position.set(gCoords.x, 3.58, gCoords.z);
    this.gatewayGroup.add(this.compartmentBeaconMesh);

    this.compartmentBeaconLight = new THREE.PointLight(0x2E8540, 1.2, 7.0);
    this.compartmentBeaconLight.position.set(gCoords.x, 3.6, gCoords.z + 0.4);
    this.gatewayGroup.add(this.compartmentBeaconLight);

    this.scene.add(this.gatewayGroup);
  }

  private buildAllFourMachines() {
    (['m1', 'm2', 'm3', 'm4'] as MachineId[]).forEach(id => {
      this.buildIndividualMachine(id);
    });
  }

  private buildIndividualMachine(id: MachineId) {
    const coords = MACHINE_COORDINATES[id];
    const group = new THREE.Group();
    group.position.set(coords.x, 0, coords.z);

    const chassisMeshes: THREE.Mesh[] = [];
    const xrayMeshes: THREE.Object3D[] = [];

    // --- Vibration Isolation Rubber Feet under Rear Machine Frame ---
    const footGeo = new THREE.CylinderGeometry(0.18, 0.20, 0.08, 16);
    const boltGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.05, 8);
    const footPositions = [
      { x: -1.9, z: -2.1 },
      { x: 1.9, z: -2.1 },
      { x: -1.9, z: -0.45 },
      { x: 1.9, z: -0.45 },
    ];
    footPositions.forEach(fp => {
      const foot = new THREE.Mesh(footGeo, this.materials.rubberFoot);
      foot.position.set(fp.x, 0.04, fp.z);
      group.add(foot);

      const bolt = new THREE.Mesh(boltGeo, this.materials.boltHead);
      bolt.position.set(fp.x, 0.10, fp.z);
      group.add(bolt);
    });

    // --- Open Front Stainless Steel Drip Tray (Zero Chassis Overlap: centered at z = +1.15) ---
    const TRAY_Z = 1.15;
    const trayW = 3.2;
    const trayD = 2.0;
    const trayH = 0.16;
    const rimT = 0.09;

    const trayBaseGeo = new THREE.BoxGeometry(trayW, 0.06, trayD);
    const trayBase = new THREE.Mesh(trayBaseGeo, this.materials.trayBase);
    trayBase.position.set(0, 0.03, TRAY_Z);
    trayBase.renderOrder = 0;
    group.add(trayBase);

    // Tray perimeter rims
    const fbGeo = new THREE.BoxGeometry(trayW, trayH, rimT);
    const frontRim = new THREE.Mesh(fbGeo, this.materials.trayRim);
    frontRim.position.set(0, trayH / 2, TRAY_Z + trayD / 2 - rimT / 2);
    group.add(frontRim);

    const backRim = new THREE.Mesh(fbGeo, this.materials.trayRim);
    backRim.position.set(0, trayH / 2, TRAY_Z - trayD / 2 + rimT / 2);
    group.add(backRim);

    const lrGeo = new THREE.BoxGeometry(rimT, trayH, trayD);
    const leftRim = new THREE.Mesh(lrGeo, this.materials.trayRim);
    leftRim.position.set(-trayW / 2 + rimT / 2, trayH / 2, TRAY_Z);
    group.add(leftRim);

    const rightRim = new THREE.Mesh(lrGeo, this.materials.trayRim);
    rightRim.position.set(trayW / 2 - rimT / 2, trayH / 2, TRAY_Z);
    group.add(rightRim);

    // 3D Basin Label on Front Floor Edge of Tray
    const badgeGeo = new THREE.PlaneGeometry(2.1, 0.65);
    const matBasin = new THREE.MeshBasicMaterial({
      map: createZoneLabelTexture(`${id.toUpperCase()}`, 'Collection Tray', false),
      transparent: true,
      depthTest: true,
      side: THREE.DoubleSide,
      toneMapped: false
    });
    const labelBasin = new THREE.Mesh(badgeGeo, matBasin);
    labelBasin.position.set(0, 0.09, TRAY_Z + trayD / 2 + 0.36);
    labelBasin.rotation.x = -Math.PI / 2.6;
    labelBasin.renderOrder = 18;
    group.add(labelBasin);

    // Puddle meshes, meniscus rims, and the two dedicated conductive detection electrodes
    const puddles: Record<ZoneId, THREE.Mesh> = {} as any;
    const meniscusRims: Record<ZoneId, THREE.Mesh> = {} as any;
    const puddleGeometries: Record<ZoneId, THREE.BufferGeometry> = {} as any;
    const spreadPads: Record<ZoneId, THREE.Mesh[]> = { z1: [], z2: [] };
    const padPulses: Record<ZoneId, Array<{ mesh: THREE.Mesh; scale: number; opacity: number; active: boolean }>> = { z1: [], z2: [] };
    const zoneFills: Record<ZoneId, THREE.Mesh> = {} as any;
    const electrodes: Record<ZoneId, ElectrodeAssembly | null> = { z1: null, z2: null };
    const irSensors: Record<ZoneId, { body: THREE.Mesh; lens: THREE.Mesh; emitterLine: THREE.Line; reflectedLine: THREE.Line } | null> = { z1: null, z2: null };
    const wetBadges: Record<ZoneId, { mesh: THREE.Mesh; triggeredAt: number | null }> = {} as any;
    const swellingDroplets: Record<ZoneId, THREE.Mesh> = {} as any;
    const dripTrails: Record<ZoneId, THREE.Mesh> = {} as any;

    // 1. Single Central Puddle mesh & meniscus rim (Centered directly beneath central nozzle at z = TRAY_Z)
    const pGeo = new THREE.CylinderGeometry(1.0, 1.0, 0.016, 40);
    const pMesh = new THREE.Mesh(pGeo, this.materials.coolantFluid);
    pMesh.position.set(0, 0.072, TRAY_Z);
    pMesh.renderOrder = 5;
    pMesh.scale.set(0.001, 1, 0.001);
    pMesh.visible = false;
    group.add(pMesh);

    const rimGeo = new THREE.RingGeometry(0.96, 1.0, 40);
    rimGeo.rotateX(-Math.PI / 2);
    const rimMesh = new THREE.Mesh(rimGeo, this.materials.meniscusRim);
    rimMesh.position.set(0, 0.074, TRAY_Z);
    rimMesh.scale.set(0.001, 1, 0.001);
    rimMesh.renderOrder = 6;
    rimMesh.visible = false;
    group.add(rimMesh);

    // Tray alert outline highlight plane
    const fillGeo = new THREE.PlaneGeometry(trayW - 0.25, trayD - 0.25);
    const fillMesh = new THREE.Mesh(fillGeo, new THREE.MeshBasicMaterial({
      color: 0xC0392B,
      transparent: true,
      opacity: 0.0,
      depthWrite: false
    }));
    fillMesh.rotation.x = -Math.PI / 2;
    fillMesh.position.set(0, 0.064, TRAY_Z);
    fillMesh.renderOrder = 2;
    group.add(fillMesh);

    puddles.z1 = pMesh;
    puddles.z2 = pMesh;
    meniscusRims.z1 = rimMesh;
    meniscusRims.z2 = rimMesh;
    puddleGeometries.z1 = pGeo;
    puddleGeometries.z2 = pGeo;
    zoneFills.z1 = fillMesh;
    zoneFills.z2 = fillMesh;

    // =========================================================================
    // TWO LARGE SEPARATE CONDUCTIVE DETECTION ELECTRODES (Requirements #3 & #4)
    // Placed clearly inside the open front collection tray at z = TRAY_Z
    // - OIL ELECTRODE: Left side (x = -0.58)
    // - COOLANT ELECTRODE: Right side (x = +0.58)
    // Thick, tall solid brushed stainless steel rods (0.10m dia, 0.88m tall)
    // =========================================================================
    const sensorGroup = new THREE.Group();
    sensorGroup.position.set(0, 0.06, TRAY_Z);

    const electrodeRodGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.88, 20);
    const mountBlockGeo = new THREE.BoxGeometry(0.16, 0.14, 0.16);
    const termNutGeo = new THREE.CylinderGeometry(0.052, 0.052, 0.07, 6);
    const tagGeo = new THREE.PlaneGeometry(0.86, 0.24);
    const badgeAlertGeo = new THREE.PlaneGeometry(0.84, 0.28);

    // --- ELECTRODE 1: OIL ELECTRODE (Left: x = -0.58) ---
    const oilRod = new THREE.Mesh(electrodeRodGeo, this.materials.probeMetallic);
    oilRod.position.set(-0.58, 0.44, 0);
    sensorGroup.add(oilRod);
    this.registerPartMesh(oilRod, 'oil-electrode');

    const oilMount = new THREE.Mesh(mountBlockGeo, this.materials.sensorMount);
    oilMount.position.set(-0.58, 0.86, 0);
    sensorGroup.add(oilMount);

    const oilNut = new THREE.Mesh(termNutGeo, this.materials.machineChrome);
    oilNut.position.set(-0.58, 0.96, 0);
    sensorGroup.add(oilNut);

    const oilTag = new THREE.Mesh(tagGeo, new THREE.MeshBasicMaterial({
      map: createElectrodeTagTexture('oil'),
      transparent: true,
      side: THREE.DoubleSide,
      toneMapped: false
    }));
    oilTag.position.set(-0.62, 1.14, 0.05);
    oilTag.renderOrder = 20;
    sensorGroup.add(oilTag);

    const oilBadge = new THREE.Mesh(badgeAlertGeo, new THREE.MeshBasicMaterial({
      map: createElectrodeActiveBadgeTexture('oil'),
      transparent: true,
      side: THREE.DoubleSide,
      toneMapped: false
    }));
    oilBadge.position.set(-0.62, 1.44, 0.06);
    oilBadge.renderOrder = 25;
    oilBadge.visible = false;
    sensorGroup.add(oilBadge);

    const oilLight = new THREE.PointLight(0xf59e0b, 0, 1.8);
    oilLight.position.set(-0.58, 0.12, 0);
    sensorGroup.add(oilLight);

    const wireOilLocalCurve = new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(-0.58, 0.90, 0),
      new THREE.Vector3(-0.82, 0.50, 0.28),
      new THREE.Vector3(-0.98, 0.16, 0.45)
    );
    const oilWire = new THREE.Mesh(new THREE.TubeGeometry(wireOilLocalCurve, 12, 0.022, 6, false), this.materials.probeWire);
    sensorGroup.add(oilWire);

    // --- ELECTRODE 2: COOLANT ELECTRODE (Right: x = +0.58) ---
    const coolantRod = new THREE.Mesh(electrodeRodGeo, this.materials.probeMetallic);
    coolantRod.position.set(0.58, 0.44, 0);
    sensorGroup.add(coolantRod);
    this.registerPartMesh(coolantRod, 'coolant-electrode');

    const coolantMount = new THREE.Mesh(mountBlockGeo, this.materials.sensorMount);
    coolantMount.position.set(0.58, 0.86, 0);
    sensorGroup.add(coolantMount);

    const coolantNut = new THREE.Mesh(termNutGeo, this.materials.machineChrome);
    coolantNut.position.set(0.58, 0.96, 0);
    sensorGroup.add(coolantNut);

    const coolantTag = new THREE.Mesh(tagGeo, new THREE.MeshBasicMaterial({
      map: createElectrodeTagTexture('coolant'),
      transparent: true,
      side: THREE.DoubleSide,
      toneMapped: false
    }));
    coolantTag.position.set(0.62, 1.14, 0.05);
    coolantTag.renderOrder = 20;
    sensorGroup.add(coolantTag);

    const coolantBadge = new THREE.Mesh(badgeAlertGeo, new THREE.MeshBasicMaterial({
      map: createElectrodeActiveBadgeTexture('coolant'),
      transparent: true,
      side: THREE.DoubleSide,
      toneMapped: false
    }));
    coolantBadge.position.set(0.62, 1.44, 0.06);
    coolantBadge.renderOrder = 25;
    coolantBadge.visible = false;
    sensorGroup.add(coolantBadge);

    const coolantLight = new THREE.PointLight(0x06b6d4, 0, 1.8);
    coolantLight.position.set(0.58, 0.12, 0);
    sensorGroup.add(coolantLight);

    const wireCoolLocalCurve = new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(0.58, 0.90, 0),
      new THREE.Vector3(0.82, 0.50, 0.28),
      new THREE.Vector3(0.98, 0.16, 0.45)
    );
    const coolantWire = new THREE.Mesh(new THREE.TubeGeometry(wireCoolLocalCurve, 12, 0.022, 6, false), this.materials.probeWire);
    sensorGroup.add(coolantWire);

    const arcGeo = new THREE.CylinderGeometry(0.008, 0.008, 0.08, 6);
    arcGeo.rotateZ(Math.PI / 2);
    const sparkArc = new THREE.Mesh(arcGeo, this.materials.sparkArcLine);
    sparkArc.visible = false;
    sensorGroup.add(sparkArc);

    const electrodeAssembly: ElectrodeAssembly = {
      oilRod,
      coolantRod,
      oilTag,
      coolantTag,
      oilBadge,
      coolantBadge,
      oilLight,
      coolantLight,
      oilWire,
      coolantWire,
      pin1: oilRod,
      pin2: coolantRod,
      sparkArc
    };

    electrodes.z1 = electrodeAssembly;
    electrodes.z2 = electrodeAssembly;
    wetBadges.z1 = { mesh: coolantBadge, triggeredAt: null };
    wetBadges.z2 = { mesh: coolantBadge, triggeredAt: null };

    group.add(sensorGroup);

    // =========================================================================
    // EXPOSED FORWARD LEAKAGE OUTLET NOZZLE (Requirements #1 & #2)
    // Positioned in clear open air at (0, 1.56, TRAY_Z) directly above collection tray
    // Fed by a visible machined supply pipe projecting forward from the machine body.
    // =========================================================================
    const outletGroup = new THREE.Group();
    outletGroup.position.set(0, 1.56, TRAY_Z);

    // Rigid supply pipe extending forward from rear machine manifold (z = -0.25 -> TRAY_Z)
    const pipeLen = TRAY_Z + 0.25;
    const supplyPipe = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.05, pipeLen, 14),
      this.materials.machineMetalTrim
    );
    supplyPipe.rotation.x = Math.PI / 2;
    supplyPipe.position.set(0, 0.14, -pipeLen / 2);
    outletGroup.add(supplyPipe);

    // Support collar / elbow bracket at nozzle head
    const flangeGeo = new THREE.BoxGeometry(0.26, 0.18, 0.22);
    const flange = new THREE.Mesh(flangeGeo, this.materials.machineMetalTrim);
    flange.position.set(0, 0.10, -0.02);
    outletGroup.add(flange);

    const unionNutGeo = new THREE.CylinderGeometry(0.085, 0.085, 0.09, 6);
    const unionNut = new THREE.Mesh(unionNutGeo, this.materials.brassFitting);
    unionNut.position.set(0, 0.01, 0);
    outletGroup.add(unionNut);

    // Downward tapered brass nozzle
    const nozzleGeo = new THREE.CylinderGeometry(0.054, 0.040, 0.22, 16);
    const nozzle = new THREE.Mesh(nozzleGeo, this.materials.brassFitting);
    nozzle.position.set(0, -0.11, 0);
    outletGroup.add(nozzle);

    // Dark interior fluid aperture
    const aperGeo = new THREE.CylinderGeometry(0.028, 0.028, 0.02, 16);
    const aperture = new THREE.Mesh(aperGeo, this.materials.sensorMount);
    aperture.position.set(0, -0.21, 0);
    outletGroup.add(aperture);

    group.add(outletGroup);

    // Swelling droplet emerging directly from nozzle tip (y = 1.36, z = TRAY_Z)
    const isDefaultOil = id === 'm1' || id === 'm4';
    const swellGeo = this.getDropGeometry(isDefaultOil ? 'oil' : 'coolant');
    const swellMat = isDefaultOil ? this.materials.oilDrop : this.materials.coolantDrop;
    const swellingDroplet = new THREE.Mesh(swellGeo, swellMat);
    swellingDroplet.position.set(0, 1.36, TRAY_Z);
    swellingDroplet.renderOrder = 4;
    swellingDroplet.visible = false;
    group.add(swellingDroplet);
    swellingDroplets.z1 = swellingDroplet;
    swellingDroplets.z2 = swellingDroplet;

    const trailGeo = new THREE.PlaneGeometry(0.04, 0.55);
    const zDripTrail = new THREE.Mesh(trailGeo, this.materials.dripTrail);
    zDripTrail.position.set(0, 1.12, TRAY_Z + 0.02);
    zDripTrail.visible = false;
    group.add(zDripTrail);
    dripTrails.z1 = zDripTrail;
    dripTrails.z2 = zDripTrail;

    // --- MACHINE 3D BODY (Distinct Geometries, positioned cleanly at z <= -0.20) ---
    let nameBoardMesh!: THREE.Mesh;
    let nodeBoxMesh!: THREE.Mesh;
    let nodeLidMesh!: THREE.Mesh;
    let beaconLightMesh!: THREE.Mesh;
    let beaconPointLight!: THREE.PointLight;
    let ledZ1Mesh!: THREE.Mesh;
    let ledZ2Mesh!: THREE.Mesh;
    const nodePcbGroup = new THREE.Group();

    const BODY_Z = -1.25;

    if (id === 'm1') {
      // M1: 250-TON HYDRAULIC STAMPING PRESS (Blue & Graphite, Rear z = -1.25)
      const bedMesh = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.45, 2.0), this.materials.m1Graphite);
      bedMesh.position.set(0, 0.22, BODY_Z);
      group.add(bedMesh);
      chassisMeshes.push(bedMesh);
      this.registerPartMesh(bedMesh, 'm1-press');

      const bolster = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.16, 1.5), this.materials.probeMetallic);
      bolster.position.set(0, 0.52, BODY_Z);
      group.add(bolster);
      chassisMeshes.push(bolster);

      [-1.55, 1.55].forEach(cx => {
        const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.19, 3.4, 20), this.materials.machineChrome);
        pillar.position.set(cx, 2.2, BODY_Z);
        group.add(pillar);
        chassisMeshes.push(pillar);
      });

      const ramSlide = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.38, 1.4), this.materials.m1Blue);
      ramSlide.position.set(0, 2.1, BODY_Z);
      group.add(ramSlide);
      chassisMeshes.push(ramSlide);
      this.registerPartMesh(ramSlide, 'm1-press');

      const ramPiston = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 1.6, 20), this.materials.machineChrome);
      ramPiston.position.set(0, 2.9, BODY_Z);
      group.add(ramPiston);
      chassisMeshes.push(ramPiston);

      const crownMesh = new THREE.Mesh(new THREE.BoxGeometry(4.2, 1.35, 1.9), this.materials.m1Blue);
      crownMesh.position.set(0, 3.8, BODY_Z);
      group.add(crownMesh);
      chassisMeshes.push(crownMesh);
      this.registerPartMesh(crownMesh, 'm1-press');

      const crownRim = new THREE.Mesh(new THREE.BoxGeometry(4.3, 0.12, 2.0), this.materials.m1Graphite);
      crownRim.position.set(0, 4.52, BODY_Z);
      group.add(crownRim);
      chassisMeshes.push(crownRim);

      const cylMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 1.0, 24), this.materials.m1Graphite);
      cylMesh.position.set(0, 4.82, BODY_Z);
      group.add(cylMesh);
      chassisMeshes.push(cylMesh);
      this.registerPartMesh(cylMesh, 'm1-press');

      const maniMesh = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.55, 0.45), this.materials.m1Graphite);
      maniMesh.position.set(0, 1.75, -0.35);
      group.add(maniMesh);
      chassisMeshes.push(maniMesh);

      const m1HoseCurve = new THREE.QuadraticBezierCurve3(
        new THREE.Vector3(0, 2.0, -0.35),
        new THREE.Vector3(1.1, 3.2, -0.55),
        new THREE.Vector3(0.4, 4.2, BODY_Z)
      );
      group.add(new THREE.Mesh(new THREE.TubeGeometry(m1HoseCurve, 14, 0.04, 8, false), this.materials.rubberHose));

      const m1Hazard = new THREE.Mesh(new THREE.PlaneGeometry(4.0, 0.15), new THREE.MeshBasicMaterial({ map: createMachineHazardDecalTexture(), transparent: true }));
      m1Hazard.position.set(0, 0.36, BODY_Z + 1.01);
      group.add(m1Hazard);

      const tank = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.9, 1.0), this.materials.internalHydraulicTank);
      tank.position.set(0, 3.8, BODY_Z);
      group.add(tank);
      xrayMeshes.push(tank);
      tank.visible = false;

    } else if (id === 'm2') {
      // M2: 5-AXIS VERTICAL CNC MILLING CENTER (Muted Green, Dark Steel & Charcoal, Rear z = -1.25)
      const baseMesh = new THREE.Mesh(new THREE.BoxGeometry(4.0, 0.62, 2.1), this.materials.m2Steel);
      baseMesh.position.set(0, 0.31, BODY_Z);
      group.add(baseMesh);
      chassisMeshes.push(baseMesh);
      this.registerPartMesh(baseMesh, 'm2-milling');

      const cabinMesh = new THREE.Mesh(new THREE.BoxGeometry(3.5, 3.6, 1.9), this.materials.m2Charcoal);
      cabinMesh.position.set(0, 2.42, BODY_Z);
      group.add(cabinMesh);
      chassisMeshes.push(cabinMesh);
      this.registerPartMesh(cabinMesh, 'm2-milling');

      [-1.74, 1.74].forEach(sx => {
        const panel = new THREE.Mesh(new THREE.BoxGeometry(0.06, 3.0, 1.6), this.materials.m2MutedGreen);
        panel.position.set(sx, 2.42, BODY_Z);
        group.add(panel);
        chassisMeshes.push(panel);
      });

      const doorFrame = new THREE.Mesh(new THREE.BoxGeometry(2.2, 2.3, 0.08), this.materials.m2Charcoal);
      doorFrame.position.set(0, 2.42, BODY_Z + 0.96);
      group.add(doorFrame);
      chassisMeshes.push(doorFrame);

      const winMesh = new THREE.Mesh(new THREE.BoxGeometry(1.9, 1.9, 0.04), this.materials.controlRoomGlass);
      winMesh.position.set(0, 2.42, BODY_Z + 1.0);
      group.add(winMesh);
      chassisMeshes.push(winMesh);

      const spindleMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.25, 0.8, 20), this.materials.machineMetalTrim);
      spindleMesh.position.set(0, 2.45, BODY_Z + 0.35);
      group.add(spindleMesh);
      chassisMeshes.push(spindleMesh);
      xrayMeshes.push(spindleMesh);

      const topCover = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.85, 1.2), this.materials.m2Steel);
      topCover.position.set(0, 4.65, BODY_Z);
      group.add(topCover);
      chassisMeshes.push(topCover);

      const atcHousing = new THREE.Mesh(new THREE.CylinderGeometry(0.54, 0.54, 0.45, 20), this.materials.m2Charcoal);
      atcHousing.position.set(-1.95, 3.25, BODY_Z);
      group.add(atcHousing);
      chassisMeshes.push(atcHousing);

      const pendant = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.66, 0.1), this.materials.m2Charcoal);
      pendant.position.set(2.05, 2.4, BODY_Z + 0.85);
      pendant.rotation.y = -0.25;
      group.add(pendant);
      chassisMeshes.push(pendant);

      const screenMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(0.42, 0.28),
        new THREE.MeshBasicMaterial({
          map: createCncScreenTexture(),
          toneMapped: false,
          polygonOffset: true,
          polygonOffsetFactor: -1,
          polygonOffsetUnits: -1
        })
      );
      screenMesh.position.set(2.05, 2.4, BODY_Z + 0.91);
      screenMesh.rotation.y = -0.25;
      group.add(screenMesh);

      const m2Hazard = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 0.15), new THREE.MeshBasicMaterial({ map: createMachineHazardDecalTexture(), transparent: true }));
      m2Hazard.position.set(0, 0.48, BODY_Z + 1.06);
      group.add(m2Hazard);

    } else if (id === 'm3') {
      // M3: HORIZONTAL CNC SLANT-BED TURNING LATHE (Navy, Brushed Alum & Graphite, Rear z = -1.25)
      const bedMesh = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.72, 1.95), this.materials.m3Navy);
      bedMesh.position.set(0, 0.36, BODY_Z);
      group.add(bedMesh);
      chassisMeshes.push(bedMesh);
      this.registerPartMesh(bedMesh, 'm3-lathe');

      const slantCover = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.14, 1.2), this.materials.m3BrushedAlum);
      slantCover.position.set(0, 0.90, BODY_Z);
      slantCover.rotation.x = 0.26;
      group.add(slantCover);
      chassisMeshes.push(slantCover);

      const headMesh = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.85, 1.65), this.materials.m3Navy);
      headMesh.position.set(-1.6, 1.55, BODY_Z);
      group.add(headMesh);
      chassisMeshes.push(headMesh);
      this.registerPartMesh(headMesh, 'm3-lathe');

      const chuckGeo = new THREE.CylinderGeometry(0.52, 0.52, 0.32, 24);
      chuckGeo.rotateZ(Math.PI / 2);
      const chuckMesh = new THREE.Mesh(chuckGeo, this.materials.probeMetallic);
      chuckMesh.position.set(-0.62, 1.55, BODY_Z);
      group.add(chuckMesh);
      chassisMeshes.push(chuckMesh);

      const tailMesh = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.3, 1.2), this.materials.m3Navy);
      tailMesh.position.set(1.75, 1.32, BODY_Z);
      group.add(tailMesh);
      chassisMeshes.push(tailMesh);

      const quillGeo = new THREE.CylinderGeometry(0.11, 0.11, 0.7, 16);
      quillGeo.rotateZ(Math.PI / 2);
      const quillMesh = new THREE.Mesh(quillGeo, this.materials.machineChrome);
      quillMesh.position.set(1.0, 1.55, BODY_Z);
      group.add(quillMesh);
      chassisMeshes.push(quillMesh);

      const turretGeo = new THREE.CylinderGeometry(0.44, 0.44, 0.22, 8);
      turretGeo.rotateX(Math.PI / 2);
      const turretMesh = new THREE.Mesh(turretGeo, this.materials.m3Graphite);
      turretMesh.position.set(0.25, 1.62, BODY_Z + 0.35);
      group.add(turretMesh);
      chassisMeshes.push(turretMesh);

      const frontShield = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.85, 0.06), this.materials.m3BrushedAlum);
      frontShield.position.set(0.2, 1.75, BODY_Z + 0.92);
      group.add(frontShield);
      chassisMeshes.push(frontShield);

      const m3Hazard = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 0.15), new THREE.MeshBasicMaterial({ map: createMachineHazardDecalTexture(), transparent: true }));
      m3Hazard.position.set(0, 0.42, BODY_Z + 0.99);
      group.add(m3Hazard);

    } else {
      // M4: COMPACT HYDRAULIC POWER UNIT (Graphite Black, Silver & Yellow Accent, Rear z = -1.25)
      const skidMesh = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.24, 2.0), this.materials.m4GraphiteBlack);
      skidMesh.position.set(0, 0.12, BODY_Z);
      group.add(skidMesh);
      chassisMeshes.push(skidMesh);
      this.registerPartMesh(skidMesh, 'm4-hpu');

      const tankMesh = new THREE.Mesh(new THREE.BoxGeometry(3.4, 1.4, 1.65), this.materials.m4GraphiteBlack);
      tankMesh.position.set(0, 0.95, BODY_Z);
      group.add(tankMesh);
      chassisMeshes.push(tankMesh);
      this.registerPartMesh(tankMesh, 'm4-hpu');

      const yStripe = new THREE.Mesh(new THREE.BoxGeometry(3.44, 0.07, 1.68), this.materials.m4YellowAccent);
      yStripe.position.set(0, 1.62, BODY_Z);
      group.add(yStripe);
      chassisMeshes.push(yStripe);

      const motorGeo = new THREE.CylinderGeometry(0.36, 0.36, 1.1, 20);
      motorGeo.rotateZ(Math.PI / 2);
      const motorMesh = new THREE.Mesh(motorGeo, this.materials.m4MetallicSilver);
      motorMesh.position.set(-0.6, 2.12, BODY_Z);
      group.add(motorMesh);
      chassisMeshes.push(motorMesh);
      this.registerPartMesh(motorMesh, 'm4-hpu');

      const maniMesh = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.65, 0.55), this.materials.m4MetallicSilver);
      maniMesh.position.set(0.6, 2.12, BODY_Z + 0.35);
      group.add(maniMesh);
      chassisMeshes.push(maniMesh);

      const gauge = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.05, 16), this.materials.machineChrome);
      gauge.rotateX(Math.PI / 2);
      gauge.position.set(0.6, 2.55, BODY_Z + 0.65);
      group.add(gauge);
      chassisMeshes.push(gauge);

      const sight = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.7, 12), this.materials.controlRoomGlass);
      sight.position.set(-0.8, 1.0, BODY_Z + 0.85);
      group.add(sight);

      const sightFrame = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.82, 0.04), this.materials.m4MetallicSilver);
      sightFrame.position.set(-0.8, 1.0, BODY_Z + 0.84);
      group.add(sightFrame);
      chassisMeshes.push(sightFrame);

      const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 0.16, 12), this.materials.m4MetallicSilver);
      cap.position.set(1.1, 1.74, BODY_Z);
      group.add(cap);
      chassisMeshes.push(cap);

      const m4Hazard = new THREE.Mesh(new THREE.PlaneGeometry(3.8, 0.15), new THREE.MeshBasicMaterial({ map: createMachineHazardDecalTexture(), transparent: true }));
      m4Hazard.position.set(0, 0.22, BODY_Z + 1.01);
      group.add(m4Hazard);
    }

    // --- 3D Name Board cleanly anchored directly above each machine ---
    const boardGeo = new THREE.PlaneGeometry(3.4, 0.95);
    const cfg = MACHINES_CONFIG[id];
    const fluidStr = cfg.allowedFluids.map(f => f === 'oil' ? 'Hydraulic Oil' : 'Coolant Emulsion').join(' & ');
    const boardMat = new THREE.MeshBasicMaterial({
      map: createMachineNameBoardTexture(id.toUpperCase(), cfg.name.split(' ').slice(1).join(' '), fluidStr, false),
      transparent: true,
      depthTest: true,
      side: THREE.DoubleSide,
      toneMapped: false
    });
    const boardHeight = id === 'm1' ? 5.85 : id === 'm2' ? 4.95 : 3.85;
    nameBoardMesh = new THREE.Mesh(boardGeo, boardMat);
    nameBoardMesh.position.set(0, boardHeight, BODY_Z + 0.3);
    nameBoardMesh.renderOrder = 25;
    group.add(nameBoardMesh);
    const machinePartId = id === 'm1' ? 'm1-press' : id === 'm2' ? 'm2-milling' : id === 'm3' ? 'm3-lathe' : 'm4-hpu';
    this.registerPartMesh(nameBoardMesh, machinePartId);

    // =========================================================================
    // PROMINENT LOCAL NODE / CPU BOX ON STEEL PEDESTAL (Right of front tray)
    // Mounted at (x = +2.45, y = 1.35, z = TRAY_Z) facing +Z clearly
    // Displays live state: NORMAL -> PROCESSING -> LEAK DETECTED
    // =========================================================================
    const NODE_X = 2.45;
    const NODE_Y = 1.35;
    const nodeGroup = new THREE.Group();
    nodeGroup.position.set(NODE_X, NODE_Y, TRAY_Z);

    // Steel Mounting Stand down to floor
    const standPost = new THREE.Mesh(
      new THREE.BoxGeometry(0.16, NODE_Y - 0.35, 0.16),
      this.materials.m1Graphite
    );
    standPost.position.set(0, -(NODE_Y / 2) - 0.15, 0);
    nodeGroup.add(standPost);

    const standFoot = new THREE.Mesh(
      new THREE.BoxGeometry(0.55, 0.08, 0.55),
      this.materials.m1Graphite
    );
    standFoot.position.set(0, -NODE_Y + 0.04, 0);
    nodeGroup.add(standFoot);

    const nBoxGeo = new THREE.BoxGeometry(1.05, 1.05, 0.42);
    nodeBoxMesh = new THREE.Mesh(nBoxGeo, this.materials.nodeBox);
    nodeGroup.add(nodeBoxMesh);
    this.registerPartMesh(nodeBoxMesh, `node-${id}`);

    const nLidGeo = new THREE.BoxGeometry(1.06, 1.06, 0.05);
    nodeLidMesh = new THREE.Mesh(nLidGeo, this.materials.nodeLid);
    nodeLidMesh.position.set(0, 0, 0.22);
    nodeGroup.add(nodeLidMesh);

    // Large High-Contrast Live Status Screen on Front of Node/CPU Box
    const nLabelGeo = new THREE.PlaneGeometry(0.98, 0.62);
    const nLabelMat = new THREE.MeshBasicMaterial({
      map: createNodeBoxLabelTexture(`Node ${id.toUpperCase()}`, 'NORMAL', null),
      side: THREE.DoubleSide,
      toneMapped: false,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1
    });
    const nodeLabelMesh = new THREE.Mesh(nLabelGeo, nLabelMat);
    nodeLabelMesh.position.set(0, 0.14, 0.255);
    nodeLabelMesh.renderOrder = 16;
    nodeGroup.add(nodeLabelMesh);

    // 2 Zone Status LEDs on Node Box Face below screen
    const ledGeo = new THREE.SphereGeometry(0.045, 12, 12);
    const ledGreenMat = new THREE.MeshBasicMaterial({ color: 0x2E8540 });
    ledZ1Mesh = new THREE.Mesh(ledGeo, ledGreenMat);
    ledZ1Mesh.position.set(-0.20, -0.30, 0.24);
    nodeGroup.add(ledZ1Mesh);

    ledZ2Mesh = new THREE.Mesh(ledGeo, ledGreenMat.clone());
    ledZ2Mesh.position.set(0.20, -0.30, 0.24);
    nodeGroup.add(ledZ2Mesh);

    // Cable Glands entering node box bottom
    const glandGeo = new THREE.CylinderGeometry(0.038, 0.045, 0.14, 12);
    const gland1 = new THREE.Mesh(glandGeo, this.materials.cableGland);
    gland1.position.set(-0.22, -0.54, 0);
    nodeGroup.add(gland1);

    const gland2 = new THREE.Mesh(glandGeo, this.materials.cableGland);
    gland2.position.set(0.22, -0.54, 0);
    nodeGroup.add(gland2);

    // Node Buzzer Speaker Grill
    const bzGeo = new THREE.CylinderGeometry(0.065, 0.065, 0.04, 16);
    bzGeo.rotateX(Math.PI / 2);
    const bzMesh = new THREE.Mesh(bzGeo, this.materials.buzzerBody);
    bzMesh.position.set(0, -0.32, 0.22);
    nodeGroup.add(bzMesh);

    // Node Top Alarm Beacon (Green Normal, Red Flashing on Leak Detected)
    const bStem = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.28, 12), this.materials.machineMetalTrim);
    bStem.position.set(0, 0.65, 0);
    nodeGroup.add(bStem);

    beaconLightMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.28, 16), this.materials.beaconGreen);
    beaconLightMesh.position.set(0, 0.88, 0);
    nodeGroup.add(beaconLightMesh);
    this.registerPartMesh(beaconLightMesh, `node-${id}`);

    beaconPointLight = new THREE.PointLight(0x2E8540, 1.0, 4.5);
    beaconPointLight.position.set(0, 0.90, 0.15);
    nodeGroup.add(beaconPointLight);

    // Internal PCB Functional Blocks for "Open Node" view
    const pcb = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.78, 0.04), this.materials.nodePcb);
    nodePcbGroup.add(pcb);

    const shield = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.28, 0.02), this.materials.esp32Shield);
    shield.position.set(0, 0.2, 0.025);
    nodePcbGroup.add(shield);

    const blockLabels = [
      { name: 'ESP32 MCU', sub: 'SoC + Wi-Fi', y: 0.2 },
      { name: 'Analog Mux', sub: 'CD74HC4067', y: 0.08 },
      { name: 'Front-End', sub: 'AC Excitation', y: -0.04 },
      { name: 'MOSFET Driver', sub: 'Alarm Switch', y: -0.16 },
      { name: '24V -> 3.3V', sub: 'Buck Supply', y: -0.26 }
    ];
    blockLabels.forEach(b => {
      const bMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(0.54, 0.10),
        new THREE.MeshBasicMaterial({ map: createBlockLabelTexture(b.name, b.sub, '#1FA5A0'), transparent: true, toneMapped: false })
      );
      bMesh.position.set(0, b.y, 0.03);
      nodePcbGroup.add(bMesh);
    });
    nodePcbGroup.visible = false;
    nodeGroup.add(nodePcbGroup);

    group.add(nodeGroup);

    // --- Floating 3D Alert Banner (Visible only after General Compartment confirmation) ---
    const alertBannerGeo = new THREE.PlaneGeometry(4.8, 1.35);
    const alertBannerMat = new THREE.MeshBasicMaterial({
      map: createLeakAlertBannerTexture(`${id.toUpperCase()}-Z1`, 'Coolant'),
      transparent: true,
      side: THREE.DoubleSide,
      toneMapped: false
    });
    const alertBanner = new THREE.Mesh(alertBannerGeo, alertBannerMat);
    alertBanner.position.set(0, 6.5, BODY_Z + 0.3);
    alertBanner.renderOrder = 30;
    alertBanner.visible = false;
    group.add(alertBanner);

    // --- Drip Trail and Stream Meshes ---
    const dripTrail = new THREE.Mesh(new THREE.PlaneGeometry(0.06, 0.7), this.materials.dripTrail);
    dripTrail.position.set(0, 1.05, TRAY_Z);
    dripTrail.visible = false;
    group.add(dripTrail);

    const fluidStream = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 1.2, 12), this.materials.streamCoolant);
    fluidStream.position.set(0, 0.72, TRAY_Z);
    fluidStream.visible = false;
    group.add(fluidStream);

    // Visible Dedicated Connecting Wires from Oil Electrode (-0.58) & Coolant Electrode (+0.58) to Node/CPU Box (+2.45)
    const cableCurves: Record<ZoneId, THREE.CatmullRomCurve3> = {
      // z1 curve = OIL ELECTRODE dedicated wire
      z1: new THREE.CatmullRomCurve3([
        new THREE.Vector3(-0.58, 0.98, TRAY_Z),
        new THREE.Vector3(-0.98, 0.24, TRAY_Z + 0.45),
        new THREE.Vector3(0.45, 0.22, TRAY_Z + 0.58),
        new THREE.Vector3(1.85, 0.38, TRAY_Z + 0.35),
        new THREE.Vector3(NODE_X - 0.22, NODE_Y - 0.54, TRAY_Z)
      ]),
      // z2 curve = COOLANT ELECTRODE dedicated wire
      z2: new THREE.CatmullRomCurve3([
        new THREE.Vector3(0.58, 0.98, TRAY_Z),
        new THREE.Vector3(0.98, 0.24, TRAY_Z + 0.45),
        new THREE.Vector3(1.65, 0.32, TRAY_Z + 0.40),
        new THREE.Vector3(2.15, 0.52, TRAY_Z + 0.18),
        new THREE.Vector3(NODE_X + 0.22, NODE_Y - 0.54, TRAY_Z)
      ])
    };

    const signalPulses: Record<ZoneId, THREE.Mesh> = {
      z1: new THREE.Mesh(
        new THREE.SphereGeometry(0.08, 12, 12),
        new THREE.MeshBasicMaterial({ color: 0xF59E0B }) // Amber pulse for Oil Electrode wire
      ),
      z2: new THREE.Mesh(
        new THREE.SphereGeometry(0.08, 12, 12),
        new THREE.MeshBasicMaterial({ color: 0x06B6D4 }) // Cyan pulse for Coolant Electrode wire
      )
    };
    signalPulses.z1.visible = false;
    signalPulses.z2.visible = false;
    group.add(signalPulses.z1);
    group.add(signalPulses.z2);

    (['z1', 'z2'] as ZoneId[]).forEach(zId => {
      const tubeGeo = new THREE.TubeGeometry(cableCurves[zId], 30, 0.026, 8, false);
      const tubeMesh = new THREE.Mesh(tubeGeo, this.materials.cableJacket);
      group.add(tubeMesh);
    });

    const nozzles: Record<ZoneId, THREE.Vector3> = {
      z1: new THREE.Vector3(coords.x, 1.38, coords.z + TRAY_Z),
      z2: new THREE.Vector3(coords.x, 1.38, coords.z + TRAY_Z)
    };

    this.scene.add(group);

    this.machines[id] = {
      group,
      chassisMeshes,
      xrayMeshes,
      nameBoardMesh,
      nodeBoxMesh,
      nodeLabelMesh,
      lastNodeDisplayKey: `Node ${id.toUpperCase()}-NORMAL-null`,
      nodeLidMesh,
      nodePcbGroup,
      beaconLightMesh,
      beaconPointLight,
      ledZ1Mesh,
      ledZ2Mesh,
      zoneFills,
      puddles,
      meniscusRims,
      puddleGeometries,
      spreadPads,
      padPulses,
      electrodes,
      irSensors,
      wetBadges,
      swellingDroplets,
      alertBanner,
      dripTrail,
      dripTrails,
      fluidStream,
      nozzles,
      cableCurves,
      signalPulses,
      lastAlertState: false
    };
  }

  private buildWirelessLinks() {
    const gCoords = GATEWAY_COORDINATES; // { x: 0, y: 2.35, z: 0.75 }

    (['m1', 'm2', 'm3', 'm4'] as MachineId[]).forEach(id => {
      const mCoords = MACHINE_COORDINATES[id];
      const start = new THREE.Vector3(mCoords.x + 2.45, 2.0, mCoords.z + 1.15);
      const end = new THREE.Vector3(gCoords.x, 2.95, gCoords.z);
      const control = new THREE.Vector3(
        (start.x + end.x) / 2,
        Math.max(start.y, end.y) + 2.4,
        (start.z + end.z) / 2
      );
      const curve = new THREE.QuadraticBezierCurve3(start, control, end);

      const pts = curve.getPoints(36);
      const lineGeo = new THREE.BufferGeometry().setFromPoints(pts);
      const lineMat = this.materials.wirelessBeam.clone();
      const line = new THREE.Line(lineGeo, lineMat);
      line.computeLineDistances();
      this.wirelessLinksGroup.add(line);

      // Signal packet indicator (strictly hidden unless Node/CPU Box is transmitting a leak signal)
      const pktGeo = new THREE.SphereGeometry(0.14, 14, 14);
      const pktMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b });
      const pkt = new THREE.Mesh(pktGeo, pktMat);
      pkt.visible = false;
      this.wirelessLinksGroup.add(pkt);
      this.wirelessPackets.push({
        machineId: id,
        mesh: pkt,
        line,
        curve
      });
    });
  }

  private buildInsideSensorCutaway() {
    this.insideSensorGroup.position.set(0, 3.2, 0);
    this.insideSensorGroup.visible = false;

    // Cutaway pedestal box
    const baseGeo = new THREE.BoxGeometry(4.2, 2.4, 2.2);
    const baseMesh = new THREE.Mesh(baseGeo, this.materials.sensorMount);
    this.insideSensorGroup.add(baseMesh);

    // Left: Coolant Dual AC Electrodes (showing micro-arc bridging)
    const pinGeo = new THREE.CylinderGeometry(0.08, 0.08, 1.6, 16);
    const p1 = new THREE.Mesh(pinGeo, this.materials.copperElectrode);
    p1.position.set(-1.2, 0.8, 0.4);
    this.insideSensorGroup.add(p1);

    const p2 = new THREE.Mesh(pinGeo, this.materials.copperElectrode);
    p2.position.set(-0.8, 0.8, 0.4);
    this.insideSensorGroup.add(p2);

    // Electric bridging arc
    const arcGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.4, 8);
    arcGeo.rotateZ(Math.PI / 2);
    this.arcBridgeMesh = new THREE.Mesh(arcGeo, this.materials.arcBridge);
    this.arcBridgeMesh.position.set(-1.0, 0.8, 0.4);
    this.insideSensorGroup.add(this.arcBridgeMesh);

    // Right: Optical IR Prism (showing IR beam refraction and attenuation)
    const prismGeo = new THREE.ConeGeometry(0.5, 0.8, 4);
    prismGeo.rotateX(Math.PI);
    const prism = new THREE.Mesh(prismGeo, this.materials.irSensorLens);
    prism.position.set(1.0, 0.8, 0.4);
    this.insideSensorGroup.add(prism);

    const beamGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.8, 8);
    beamGeo.rotateZ(Math.PI / 4);
    this.irBeamMesh = new THREE.Mesh(beamGeo, this.materials.sensorBeam);
    this.irBeamMesh.position.set(1.0, 0.8, 0.4);
    this.insideSensorGroup.add(this.irBeamMesh);
  }

  // --- Particle & Fluid Physics Updates ---
  public spawnDroplet(machineId: MachineId, zoneId: ZoneId, fluidType: FluidType) {
    if (this.activeDroplets.length >= this.maxActiveDroplets) return;

    const nozzlePos = this.machines[machineId].nozzles[zoneId];
    const dropGeo = this.getDropGeometry(fluidType);
    const dropMat = fluidType === 'oil' ? this.materials.oilDrop : this.materials.coolantDrop;
    const drop = new THREE.Mesh(dropGeo, dropMat);
    drop.renderOrder = 4;
    drop.position.copy(nozzlePos);
    this.dropletGroup.add(drop);

    this.activeDroplets.push({
      mesh: drop,
      machineId,
      zoneId,
      fluidType,
      vy: 1.0,
      targetY: 0.1
    });
  }

  public spawnSplash(pos: THREE.Vector3, fluidType: FluidType) {
    if (this.activeSplashes.length >= this.maxActiveSplashes) return;

    const isOil = fluidType === 'oil';
    // Crown splash with 8 to 10 tiny droplets that fall back down with gravity
    const count = isOil ? 8 : 10;
    const mat = isOil ? this.materials.splashOil : this.materials.splashCoolant;
    const geo = this.getSplashGeometry();

    for (let i = 0; i < count; i++) {
      const mesh = new THREE.Mesh(geo, mat);
      mesh.renderOrder = 4;
      mesh.position.set(pos.x, 0.076, pos.z);
      this.splashGroup.add(mesh);

      const angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.3;
      const speed = (isOil ? 0.65 : 1.15) * (0.7 + Math.random() * 0.6);

      this.activeSplashes.push({
        mesh,
        vx: Math.cos(angle) * speed,
        vy: 0.9 + Math.random() * 0.5, // Initial upward burst
        vz: Math.sin(angle) * speed,
        life: 0,
        maxLife: isOil ? 0.55 : 0.42
      });
    }

    // Spawn expanding ripple ring
    if (this.activeRipples.length < this.maxActiveRipples) {
      const ripGeo = this.getRippleGeometry();
      const ripMesh = new THREE.Mesh(ripGeo, isOil ? this.materials.splashOil : this.materials.rippleRing);
      ripMesh.renderOrder = 6;
      ripMesh.position.set(pos.x, 0.077, pos.z);
      this.rippleGroup.add(ripMesh);
      this.activeRipples.push({
        mesh: ripMesh,
        scale: 0.8,
        maxScale: isOil ? 2.8 : 4.2,
        opacity: 0.85
      });
    }
  }

  private updateDroplets(delta: number) {
    for (let i = this.activeDroplets.length - 1; i >= 0; i--) {
      const d = this.activeDroplets[i];
      // Crisp natural gravity acceleration: single droplet traverses 1.25m in ~0.41s so Light Flow has 1 distinct drop at a time and Heavy Flow shows spaced individual droplets
      d.vy += 9.5 * delta;
      d.mesh.position.y -= d.vy * delta;

      // Subtle natural teardrop elongation so even Heavy Flow droplets stay visually distinct and never look like a continuous stream
      const stretch = Math.min(d.vy * 0.08, d.fluidType === 'oil' ? 0.75 : 0.60);
      d.mesh.scale.set(
        Math.max(0.72, 0.92 - stretch * 0.08),
        1.0 + stretch,
        Math.max(0.72, 0.92 - stretch * 0.08)
      );

      if (d.mesh.position.y <= d.targetY) {
        this.spawnSplash(d.mesh.position, d.fluidType);
        this.dropletGroup.remove(d.mesh);
        this.activeDroplets.splice(i, 1);
      }
    }
  }

  private updateSplashes(delta: number) {
    for (let i = this.activeSplashes.length - 1; i >= 0; i--) {
      const s = this.activeSplashes[i];
      s.life += delta;
      // Softened gravity pulling splash droplets back down to the tray
      s.vy -= 4.8 * delta;
      s.mesh.position.x += s.vx * delta;
      s.mesh.position.y += s.vy * delta;
      s.mesh.position.z += s.vz * delta;

      if (s.life >= s.maxLife || s.mesh.position.y <= 0.074) {
        this.splashGroup.remove(s.mesh);
        this.activeSplashes.splice(i, 1);
      }
    }
  }

  private updateRipples(delta: number) {
    for (let i = this.activeRipples.length - 1; i >= 0; i--) {
      const r = this.activeRipples[i];
      r.scale += delta * 3.2;
      r.opacity -= delta * 0.9;
      r.mesh.scale.set(r.scale, r.scale, 1);

      if (r.mesh.material instanceof THREE.MeshBasicMaterial) {
        r.mesh.material.opacity = Math.max(r.opacity, 0);
      }

      if (r.opacity <= 0 || r.scale >= r.maxScale) {
        this.rippleGroup.remove(r.mesh);
        this.activeRipples.splice(i, 1);
      }
    }
  }

  // --- Real-Time State Synchronizer from React App ---
  public updateSimulation(
    telemetry: Record<MachineId, Record<ZoneId, ZoneTelemetry>>,
    nodeStates: Record<MachineId, MachineNodeState>,
    activeStreams: Record<MachineId, { isStreaming: boolean; zone: ZoneId; fluid: FluidType; speed?: LeakSpeed }>
  ) {
    const time = this.elapsedTime;
    const compartmentAlerts: Array<{ machineId: string; fluid: 'oil' | 'coolant' }> = [];

    (['m1', 'm2', 'm3', 'm4'] as MachineId[]).forEach(mId => {
      const mRef = this.machines[mId];
      if (!mRef) return;
      const mNode = nodeStates[mId];
      const mTel = telemetry[mId];

      if (mNode.compartmentAlertActive && mNode.detectedFluid) {
        compartmentAlerts.push({ machineId: mId, fluid: mNode.detectedFluid });
      }

      const isDetectedOrHigher =
        mNode.pipelineStage === 'leak_detected' ||
        mNode.pipelineStage === 'transmitting' ||
        mNode.pipelineStage === 'compartment_alert';
      const isProcessing = mNode.pipelineStage === 'processing';

      // 1. Node/CPU Top Beacon (Green Normal, Flashing Amber during Processing, Flashing Red when Leak Detected)
      if (isDetectedOrHigher) {
        const flash = Math.sin(time * 12) > 0;
        mRef.beaconLightMesh.material = flash ? this.materials.beaconRed : this.materials.beaconGlass;
        mRef.beaconPointLight.color.setHex(0xC0392B);
        mRef.beaconPointLight.intensity = flash ? 2.6 : 0.4;
      } else if (isProcessing) {
        mRef.beaconLightMesh.material = this.materials.electrodeOilActive;
        mRef.beaconPointLight.color.setHex(0xD98200);
        mRef.beaconPointLight.intensity = 1.6;
      } else {
        mRef.beaconLightMesh.material = this.materials.beaconGreen;
        mRef.beaconPointLight.color.setHex(0x2E8540);
        mRef.beaconPointLight.intensity = 0.9;
      }

      // 2. Node/CPU Box Live Screen Texture (NORMAL -> PROCESSING -> LEAK DETECTED)
      const displayKey = `Node ${mId.toUpperCase()}-${mNode.nodeDisplayStatus}-${mNode.detectedFluid}`;
      if (mRef.lastNodeDisplayKey !== displayKey) {
        const mat = mRef.nodeLabelMesh.material as THREE.MeshBasicMaterial;
        const oldMap = mat.map;
        mat.map = createNodeBoxLabelTexture(
          `Node ${mId.toUpperCase()}`,
          mNode.nodeDisplayStatus,
          mNode.detectedFluid
        );
        mat.needsUpdate = true;
        if (oldMap) oldMap.dispose();
        mRef.lastNodeDisplayKey = displayKey;
      }

      // 3. Node Status LEDs
      if (mRef.ledZ1Mesh.material instanceof THREE.MeshBasicMaterial) {
        const isAlertZ1 = mNode.leds.z1 === 'red';
        const colorZ1 = isAlertZ1
          ? (Math.floor(time * 5) % 2 === 0 ? 0xEF4444 : 0x7F1D1D)
          : mNode.leds.z1 === 'amber' ? 0xD98200 : 0x2E8540;
        mRef.ledZ1Mesh.material.color.setHex(colorZ1);
      }
      if (mRef.ledZ2Mesh.material instanceof THREE.MeshBasicMaterial) {
        const isAlertZ2 = mNode.leds.z2 === 'red';
        const colorZ2 = isAlertZ2
          ? (Math.floor(time * 5) % 2 === 0 ? 0xEF4444 : 0x7F1D1D)
          : mNode.leds.z2 === 'amber' ? 0xD98200 : 0x2E8540;
        mRef.ledZ2Mesh.material.color.setHex(colorZ2);
      }

      // 4. Floating 3D Alert Banner above machine (visible ONLY after General Compartment alert arrives)
      if (mNode.compartmentAlertActive && mNode.detectedFluid) {
        const alertZone: ZoneId = mTel.z1.status === 'alert' ? 'z1' : 'z2';
        if (!mRef.lastAlertState) {
          const mat = mRef.alertBanner.material as THREE.MeshBasicMaterial;
          const oldMap = mat.map;
          mat.map = createDetectionChainLabelTexture(mId, alertZone, mNode.detectedFluid);
          mat.needsUpdate = true;
          if (oldMap) oldMap.dispose();
          mRef.lastAlertState = true;
        }
        mRef.alertBanner.visible = true;
        mRef.alertBanner.position.y = 6.5 + Math.sin(time * 3) * 0.1;
      } else {
        mRef.alertBanner.visible = false;
        mRef.lastAlertState = false;
      }

      mRef.fluidStream.visible = false;

      // 5. Puddle Accumulation, Swelling Droplets, Dedicated Electrodes & Wires
      const activeTel = mTel.z1.activeFluid !== 'none' ? mTel.z1 : mTel.z2;
      const puddle = mRef.puddles.z1;
      const rim = mRef.meniscusRims.z1;
      const swellingDrop = mRef.swellingDroplets.z1;
      const trail = mRef.dripTrails.z1;

      if (activeTel.puddleVolumeMl > 0) {
        puddle.visible = true;
        rim.visible = true;
        // Clamp visual puddle inside 3.2m x 2.0m tray (x=±0.58 electrodes safely immersed at >=0.50)
        const radius = Math.min(Math.max(activeTel.puddleRadius, 0.06), 0.90);
        puddle.scale.set(radius, 1, radius);
        rim.scale.set(radius, 1, radius);
        puddle.material = activeTel.activeFluid === 'oil' ? this.materials.oilFluid : this.materials.coolantFluid;

        const fill = mRef.zoneFills.z1;
        if (fill.material instanceof THREE.MeshBasicMaterial) {
          fill.material.opacity = isDetectedOrHigher ? (0.16 + Math.sin(time * 6) * 0.08) : 0;
        }
      } else {
        puddle.visible = false;
        rim.visible = false;
        if (mRef.zoneFills.z1.material instanceof THREE.MeshBasicMaterial) {
          mRef.zoneFills.z1.material.opacity = 0;
        }
      }

      if (trail) {
        // Keep vertical streak hidden so Light Flow and Heavy Flow strictly display individual separated 3D droplets
        trail.visible = false;
      }

      if (swellingDrop) {
        const isActivelyLeaking = activeTel.activeFluid !== 'none';
        swellingDrop.visible = isActivelyLeaking;
        if (isActivelyLeaking) {
          const isHeavy = activeStreams?.[mId]?.speed === 'heavy_flow';
          const cycleHz = isHeavy ? 2.4 : 1.0;
          swellingDrop.material = activeTel.activeFluid === 'oil' ? this.materials.oilDrop : this.materials.coolantDrop;
          const cycleProgress = (time * cycleHz) % 1.0;
          if (activeTel.activeFluid === 'oil') {
            swellingDrop.scale.set(
              0.18 + cycleProgress * 0.22,
              (0.18 + cycleProgress * 0.22) * (1.0 + cycleProgress * 0.75),
              0.18 + cycleProgress * 0.22
            );
            swellingDrop.position.y = 1.38 - cycleProgress * 0.03;
          } else {
            swellingDrop.scale.set(
              0.18 + cycleProgress * 0.24,
              (0.18 + cycleProgress * 0.24) * (1.0 + cycleProgress * 0.65),
              0.18 + cycleProgress * 0.24
            );
            swellingDrop.position.y = 1.38 - cycleProgress * 0.025;
          }
        }
      }

      // Dedicated Conductive Electrodes: strictly activated by actual physical puddle contact
      const elec = mRef.electrodes.z1;
      if (elec) {
        const isOilContact = activeTel.irSensorTriggered;
        const isCoolantContact = activeTel.electrodesTriggered;

        if (isOilContact) {
          elec.oilRod.material = this.materials.electrodeOilActive;
          elec.oilLight.intensity = 1.6;
          elec.oilBadge.visible = true;
          elec.oilBadge.position.y = 1.44 + Math.sin(time * 5) * 0.02;

          elec.coolantRod.material = this.materials.probeMetallic;
          elec.coolantLight.intensity = 0;
          elec.coolantBadge.visible = false;
        } else if (isCoolantContact) {
          elec.coolantRod.material = this.materials.electrodeCoolantActive;
          elec.coolantLight.intensity = 1.6;
          elec.coolantBadge.visible = true;
          elec.coolantBadge.position.y = 1.44 + Math.sin(time * 5) * 0.02;

          elec.oilRod.material = this.materials.probeMetallic;
          elec.oilLight.intensity = 0;
          elec.oilBadge.visible = false;
        } else {
          elec.oilRod.material = this.materials.probeMetallic;
          elec.oilLight.intensity = 0;
          elec.oilBadge.visible = false;

          elec.coolantRod.material = this.materials.probeMetallic;
          elec.coolantLight.intensity = 0;
          elec.coolantBadge.visible = false;
        }
      }

      // Dedicated Connecting Wire Pulses (z1 = Oil Electrode wire, z2 = Coolant Electrode wire)
      const oilPulse = mRef.signalPulses.z1;
      const coolantPulse = mRef.signalPulses.z2;
      const wireActive =
        mNode.pipelineStage === 'wire_signal' || mNode.pipelineStage === 'processing';
      const wireT =
        mNode.pipelineStage === 'wire_signal'
          ? Math.min(Math.max(mNode.wireSignalProgress, 0), 1)
          : (time * 0.9) % 1.0;

      if (wireActive && mNode.activeElectrode === 'oil') {
        oilPulse.visible = true;
        oilPulse.position.copy(mRef.cableCurves.z1.getPoint(wireT));
        const sc = 1.0 + Math.sin(time * 10) * 0.2;
        oilPulse.scale.set(sc, sc, sc);
        coolantPulse.visible = false;
      } else if (wireActive && mNode.activeElectrode === 'coolant') {
        coolantPulse.visible = true;
        coolantPulse.position.copy(mRef.cableCurves.z2.getPoint(wireT));
        const sc = 1.0 + Math.sin(time * 10) * 0.2;
        coolantPulse.scale.set(sc, sc, sc);
        oilPulse.visible = false;
      } else {
        oilPulse.visible = false;
        coolantPulse.visible = false;
      }

      // Communication Link Packet from Machine Node/CPU Box -> Central General Compartment Box
      const linkInfo = this.wirelessPackets.find(p => p.machineId === mId);
      if (linkInfo) {
        const lineMat = linkInfo.line.material as THREE.LineDashedMaterial;
        const pktMat = linkInfo.mesh.material as THREE.MeshBasicMaterial;

        if (mNode.pipelineStage === 'transmitting') {
          linkInfo.mesh.visible = true;
          const pt = linkInfo.curve.getPoint(Math.min(Math.max(mNode.compartmentLinkProgress, 0), 1));
          linkInfo.mesh.position.copy(pt);
          const colorHex = mNode.detectedFluid === 'oil' ? 0xf59e0b : 0x06b6d4;
          pktMat.color.setHex(colorHex);
          lineMat.color.setHex(colorHex);
          lineMat.opacity = 1.0;
        } else if (mNode.compartmentAlertActive) {
          linkInfo.mesh.visible = false;
          lineMat.color.setHex(0xef4444);
          lineMat.opacity = 0.95;
        } else {
          linkInfo.mesh.visible = false;
          lineMat.color.setHex(0x1FA5A0);
          lineMat.opacity = 0.35;
        }
      }
    });

    // Update Central General Compartment Box Screen & Beacon ONLY from arrived signals
    const compKey = compartmentAlerts.length === 0
      ? 'NORMAL'
      : compartmentAlerts.map(a => `${a.machineId}:${a.fluid}`).join('|');

    if (this.compartmentScreenMesh && this.lastCompartmentKey !== compKey) {
      const mat = this.compartmentScreenMesh.material as THREE.MeshBasicMaterial;
      const oldMap = mat.map;
      mat.map = createGeneralCompartmentTexture(compartmentAlerts);
      mat.needsUpdate = true;
      if (oldMap) oldMap.dispose();
      this.lastCompartmentKey = compKey;
    }

    if (this.compartmentBeaconMesh && this.compartmentBeaconLight) {
      if (compartmentAlerts.length > 0) {
        const flash = Math.sin(time * 10) > 0;
        this.compartmentBeaconMesh.material = flash ? this.materials.beaconRed : this.materials.beaconGlass;
        this.compartmentBeaconLight.color.setHex(0xC0392B);
        this.compartmentBeaconLight.intensity = flash ? 3.2 : 0.5;
      } else {
        this.compartmentBeaconMesh.material = this.materials.beaconGreen;
        this.compartmentBeaconLight.color.setHex(0x2E8540);
        this.compartmentBeaconLight.intensity = 1.2;
      }
    }

    if (this.technicalViews.insideSensor) {
      this.arcBridgeMesh.visible = Math.sin(time * 24) > 0.2;
    }
  }

  public setTechnicalViews(views: TechnicalViews) {
    this.technicalViews = views;

    (['m1', 'm2', 'm3', 'm4'] as MachineId[]).forEach(mId => {
      const mRef = this.machines[mId];

      mRef.chassisMeshes.forEach(mesh => {
        mesh.material = views.xrayMachine ? this.materials.machineChassisXray : (this.originalMaterials.get(mesh) || mesh.material);
      });
      mRef.xrayMeshes.forEach(obj => {
        obj.visible = views.xrayMachine;
      });

      mRef.nodeBoxMesh.material = views.openController ? this.materials.nodeBoxOpen : this.materials.nodeBox;
      mRef.nodeLidMesh.visible = !views.openController;
      mRef.nodePcbGroup.visible = views.openController;
    });

    this.insideSensorGroup.visible = views.insideSensor;
  }

  // --- Camera Views & Flying Navigation ---
  public flyToFloorView() {
    this.activeDemoStep = null;
    this.targetCameraPos = new THREE.Vector3(0, 18.2, 24.0);
    this.targetControlsTarget = new THREE.Vector3(0, 1.3, 0.5);
  }

  public flyToMachine(machineId: MachineId) {
    this.flyToLeakSimulation(machineId, 'z1');
  }

  public flyToLeakSimulation(machineId: MachineId, _zoneId: ZoneId = 'z1') {
    this.activeDemoStep = null;
    const coords = MACHINE_COORDINATES[machineId] || MACHINE_COORDINATES['m1'];
    const tx = Number.isFinite(coords.x) ? coords.x : 0;
    const tz = Number.isFinite(coords.z) ? coords.z : 0;
    // Frames nozzle (y=1.45), open collection tray, both electrodes (-0.58 & +0.58), and full local Node/CPU Box (+2.45) cleanly
    this.targetCameraPos = new THREE.Vector3(tx + 1.05, 2.15, tz + 6.05);
    this.targetControlsTarget = new THREE.Vector3(tx + 0.95, 0.92, tz + 1.15);
  }

  public flyToLeak(machineId: MachineId, zoneId: ZoneId = 'z1') {
    this.flyToLeakSimulation(machineId, zoneId);
  }

  /**
   * 6-Stage Dynamic Guided Demo Camera Views working seamlessly for ANY Machine (M1, M2, M3, M4)
   */
  public flyToDemoStep(stepIndex: number, machineId: MachineId = 'm2') {
    this.activeDemoStep = stepIndex;
    const coords = MACHINE_COORDINATES[machineId] || MACHINE_COORDINATES['m2'];
    const tx = Number.isFinite(coords.x) ? coords.x : 7.5;
    const tz = Number.isFinite(coords.z) ? coords.z : -4.0;
    const trayZ = tz + 1.15;

    switch (stepIndex) {
      case 1:
        // View 1 – Machine Overview: Complete view of machine, outlet, tray, 2 electrodes, Node/CPU Box, and General Compartment Box
        if (tz < 0) {
          this.targetCameraPos = new THREE.Vector3(tx * 0.42, 4.8, 7.6);
          this.targetControlsTarget = new THREE.Vector3(tx * 0.52, 1.7, -1.2);
        } else {
          this.targetCameraPos = new THREE.Vector3(tx * 0.45, 5.2, 14.5);
          this.targetControlsTarget = new THREE.Vector3(tx * 0.52, 1.8, 3.0);
        }
        break;

      case 2:
        // View 2 – Leakage Generation: Zoomed onto exposed leakage outlet nozzle showing droplets forming and falling
        this.targetCameraPos = new THREE.Vector3(tx + 0.72, 1.65, trayZ + 1.65);
        this.targetControlsTarget = new THREE.Vector3(tx, 1.25, trayZ);
        break;

      case 3:
        // View 3 – Electrode Detection: Open collection tray + both rods (OIL ELECTRODE & COOLANT ELECTRODE)
        this.targetCameraPos = new THREE.Vector3(tx, 1.45, trayZ + 2.35);
        this.targetControlsTarget = new THREE.Vector3(tx, 0.55, trayZ);
        break;

      case 4:
        // View 4 – Local Signal Processing: Wires entering Node/CPU Box + screen changing NORMAL -> PROCESSING -> LEAK DETECTED
        this.targetCameraPos = new THREE.Vector3(tx + 1.85, 1.55, trayZ + 2.05);
        this.targetControlsTarget = new THREE.Vector3(tx + 2.05, 1.25, trayZ);
        break;

      case 5:
        // View 5 – General Compartment Transmission: Frames BOTH Machine's Node/CPU Box AND central General Compartment Box
        if (tz < 0) {
          this.targetCameraPos = new THREE.Vector3(tx * 0.48, 4.4, 7.8);
          this.targetControlsTarget = new THREE.Vector3((tx + 2.45) * 0.48, 2.05, -0.8);
        } else {
          this.targetCameraPos = new THREE.Vector3(tx * 0.48, 4.8, 13.8);
          this.targetControlsTarget = new THREE.Vector3((tx + 2.45) * 0.48, 2.1, 3.3);
        }
        break;

      case 6:
      default:
        // View 6 – Final Detection: Crisp front view of central General Compartment Box showing final Machine & Fluid Alert
        this.targetCameraPos = new THREE.Vector3(0, 2.35, 5.15);
        this.targetControlsTarget = new THREE.Vector3(0, 2.15, 0.75);
        break;
    }
  }

  private setupInteractivity() {
    const onPointerMove = (e: MouseEvent) => {
      const rect = this.container.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      this.raycaster.setFromCamera(this.mouse, this.camera);
      const intersects = this.raycaster.intersectObjects(this.interactiveMeshes, false);

      if (intersects.length > 0) {
        const hit = intersects[0].object as THREE.Mesh;
        if (this.hoveredMesh !== hit) {
          if (this.hoveredMesh && this.hoveredMesh.material) {
            const prevMat = this.hoveredMesh.material as any;
            if (prevMat.emissive) {
              prevMat.emissive.setHex(this.previousEmissiveHex);
            }
          }
          this.hoveredMesh = hit;
          if (hit.material) {
            const mat = hit.material as any;
            if (mat.emissive) {
              this.previousEmissiveHex = mat.emissive.getHex();
              mat.emissive.setHex(0x112838);
            }
          }
          this.container.style.cursor = 'pointer';
        }
      } else {
        if (this.hoveredMesh) {
          if (this.hoveredMesh.material) {
            const mat = this.hoveredMesh.material as any;
            if (mat.emissive) {
              mat.emissive.setHex(this.previousEmissiveHex);
            }
          }
          this.hoveredMesh = null;
          this.container.style.cursor = 'default';
        }
      }
    };

    const onPointerLeave = () => {
      if (this.hoveredMesh) {
        if (this.hoveredMesh.material) {
          const mat = this.hoveredMesh.material as any;
          if (mat.emissive) {
            mat.emissive.setHex(this.previousEmissiveHex);
          }
        }
        this.hoveredMesh = null;
        this.container.style.cursor = 'default';
      }
    };

    const onClick = () => {
      // Clicking a machine does not open popups or override controls
    };

    this.container.addEventListener('mousemove', onPointerMove);
    this.container.addEventListener('mouseleave', onPointerLeave);
    this.container.addEventListener('click', onClick);
  }

  public onResize = () => {
    if (!this.container || this.isDestroyed) return;
    const width = Math.max(this.container.clientWidth || 320, 320);
    const height = Math.max(this.container.clientHeight || 240, 240);
    if (width <= 0 || height <= 0) return;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(width, height);
  };

  private afterDraw(cb: () => void) {
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    if (!gl || typeof gl.fenceSync !== 'function') {
      this.frameId = window.setTimeout(cb, 80);
      return;
    }
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    if (!sync) {
      this.frameId = window.setTimeout(cb, 80);
      return;
    }
    gl.flush();
    const wait = () => {
      if (this.isDestroyed) {
        gl.deleteSync(sync);
        return;
      }
      const status = gl.clientWaitSync(sync, 0, 0);
      if (status === gl.CONDITION_SATISFIED || status === gl.ALREADY_SIGNALED) {
        gl.deleteSync(sync);
        this.frameId = window.setTimeout(cb, 80);
      } else {
        this.frameId = window.setTimeout(wait, 8);
      }
    };
    this.frameId = window.setTimeout(wait, 8);
  }

  private startLoop() {
    const tick = () => {
      if (this.isDestroyed) return;

      const now = performance.now();
      const delta = Math.min((now - this.lastFrameTime) / 1000, 0.35);
      this.lastFrameTime = now;
      this.elapsedTime += delta;

      // Auto-quality watchdog
      if (!isSoftwareGl) {
        if (delta > 0.045) {
          this.slowFrameCount++;
          if (this.slowFrameCount > 35) {
            this.slowFrameCount = 0;
            if (this.currentQuality === 'high') {
              this.setQuality('medium');
            } else if (this.currentQuality === 'medium') {
              this.setQuality('low');
            }
          }
        } else if (this.slowFrameCount > 0) {
          this.slowFrameCount--;
        }
      }

      this.updateDroplets(delta);
      this.updateSplashes(delta);
      this.updateRipples(delta);
      updateIndustrialWorkers(this.workers, this.elapsedTime);

      // Animate pad pulses
      (['m1', 'm2', 'm3', 'm4'] as MachineId[]).forEach(id => {
        const m = this.machines[id];
        if (m) {
          (['z1', 'z2'] as ZoneId[]).forEach(zId => {
            const pulses = m.padPulses?.[zId];
            if (pulses) {
              pulses.forEach(p => {
                if (p.active) {
                  p.scale += delta * 4.0;
                  p.opacity -= delta * 1.8;
                  p.mesh.scale.set(p.scale, p.scale, 1);
                  if (p.mesh.material instanceof THREE.MeshBasicMaterial) {
                    p.mesh.material.opacity = Math.max(0, p.opacity);
                  }
                  if (p.opacity <= 0 || p.scale >= 3.2) {
                    p.active = false;
                    p.mesh.visible = false;
                  }
                }
              });
            }
          });
        }
      });

      // Billboarding: Ensure 3D name boards and alert banners face camera cleanly
      (['m1', 'm2', 'm3', 'm4'] as MachineId[]).forEach(id => {
        const m = this.machines[id];
        if (m) {
          if (m.nameBoardMesh) {
            m.nameBoardMesh.quaternion.copy(this.camera.quaternion);
          }
          if (m.alertBanner && m.alertBanner.visible) {
            m.alertBanner.quaternion.copy(this.camera.quaternion);
          }
          (['z1', 'z2'] as ZoneId[]).forEach(zId => {
            const wb = m.wetBadges?.[zId];
            if (wb && wb.mesh && wb.mesh.visible) {
              wb.mesh.quaternion.copy(this.camera.quaternion);
            }
          });
        }
      });

      // Camera tween damping with strict finite number validation & floor height clamp
      if (this.targetCameraPos && this.targetControlsTarget) {
        if (
          Number.isFinite(this.targetCameraPos.x) &&
          Number.isFinite(this.targetCameraPos.y) &&
          Number.isFinite(this.targetCameraPos.z) &&
          Number.isFinite(this.targetControlsTarget.x) &&
          Number.isFinite(this.targetControlsTarget.y) &&
          Number.isFinite(this.targetControlsTarget.z)
        ) {
          const camDamping = this.activeDemoStep !== null ? 2.4 : 10.5;
          const camAlpha = 1 - Math.exp(-delta * camDamping);
          this.camera.position.lerp(this.targetCameraPos, camAlpha);
          this.controls.target.lerp(this.targetControlsTarget, camAlpha);
          this.camera.position.y = Math.max(this.camera.position.y, 1.35);

          if (this.camera.position.distanceTo(this.targetCameraPos) < 0.05) {
            this.camera.position.copy(this.targetCameraPos);
            this.controls.target.copy(this.targetControlsTarget);
            this.targetCameraPos = null;
            this.targetControlsTarget = null;
          }
        } else {
          this.targetCameraPos = null;
          this.targetControlsTarget = null;
        }
      }

      this.controls.update();
      this.renderer.render(this.scene, this.camera);

      if (isSoftwareGl) {
        this.afterDraw(tick);
      } else {
        this.frameId = requestAnimationFrame(tick);
      }
    };

    tick();
  }

  public resetSimulation() {
    this.scene.background = new THREE.Color(0x0a192f);
    this.scene.fog = new THREE.Fog(0x0a192f, 50, 140);
    this.renderer.toneMappingExposure = 1.15;
    this.flyToFloorView();

    for (const d of this.activeDroplets) {
      this.dropletGroup.remove(d.mesh);
    }
    this.activeDroplets = [];

    for (const s of this.activeSplashes) {
      this.splashGroup.remove(s.mesh);
    }
    this.activeSplashes = [];

    for (const r of this.activeRipples) {
      this.rippleGroup.remove(r.mesh);
    }
    this.activeRipples = [];

    (['m1', 'm2', 'm3', 'm4'] as MachineId[]).forEach(id => {
      const m = this.machines[id];
      if (m) {
        m.alertBanner.visible = false;
        m.lastAlertState = false;
        m.fluidStream.visible = false;
        m.dripTrail.visible = false;
        m.beaconLightMesh.material = this.materials.beaconGreen;
        m.beaconPointLight.color.setHex(0x2E8540);
        m.beaconPointLight.intensity = 0.9;
        m.signalPulses.z1.visible = false;
        m.signalPulses.z2.visible = false;

        const key = `Node ${id.toUpperCase()}-NORMAL-null`;
        if (m.lastNodeDisplayKey !== key) {
          const mat = m.nodeLabelMesh.material as THREE.MeshBasicMaterial;
          const oldMap = mat.map;
          mat.map = createNodeBoxLabelTexture(`Node ${id.toUpperCase()}`, 'NORMAL', null);
          mat.needsUpdate = true;
          if (oldMap) oldMap.dispose();
          m.lastNodeDisplayKey = key;
        }

        const elec = m.electrodes.z1;
        if (elec) {
          elec.oilRod.material = this.materials.probeMetallic;
          elec.coolantRod.material = this.materials.probeMetallic;
          elec.oilLight.intensity = 0;
          elec.coolantLight.intensity = 0;
          elec.oilBadge.visible = false;
          elec.coolantBadge.visible = false;
        }

        (['z1', 'z2'] as ZoneId[]).forEach(zId => {
          m.puddles[zId].visible = false;
          m.puddles[zId].scale.set(0.001, 1, 0.001);
          if (m.zoneFills[zId].material instanceof THREE.MeshBasicMaterial) {
            (m.zoneFills[zId].material as THREE.MeshBasicMaterial).opacity = 0;
          }
          m.spreadPads[zId].forEach(pad => {
            pad.material = this.materials.spreadPad;
          });
        });
      }
    });

    this.wirelessPackets.forEach(p => {
      p.mesh.visible = false;
      const lineMat = p.line.material as THREE.LineDashedMaterial;
      lineMat.color.setHex(0x1FA5A0);
      lineMat.opacity = 0.35;
    });

    if (this.compartmentScreenMesh && this.lastCompartmentKey !== 'NORMAL') {
      const mat = this.compartmentScreenMesh.material as THREE.MeshBasicMaterial;
      const oldMap = mat.map;
      mat.map = createGeneralCompartmentTexture([]);
      mat.needsUpdate = true;
      if (oldMap) oldMap.dispose();
      this.lastCompartmentKey = 'NORMAL';
    }

    if (this.compartmentBeaconMesh && this.compartmentBeaconLight) {
      this.compartmentBeaconMesh.material = this.materials.beaconGreen;
      this.compartmentBeaconLight.color.setHex(0x2E8540);
      this.compartmentBeaconLight.intensity = 1.2;
    }
  }

  public destroy() {
    this.isDestroyed = true;
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.frameId);
    window.removeEventListener('resize', this.onResize);

    this.resetSimulation();

    this.controls.dispose();
    this.renderer.dispose();
    if (this.container.contains(this.renderer.domElement)) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
