import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { createMaterials, MaterialLibrary } from './materials';
import { 
  createMachineNameBoardTexture,
  createNodeBoxLabelTexture,
  createZoneLabelTexture,
  createLeakAlertBannerTexture,
  createHazardStripesTexture,
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
  createElectrodeActiveBadgeTexture
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
        DripWatchScene.sharedDropOilGeo = new THREE.SphereGeometry(0.092, 14, 14);
      }
      return DripWatchScene.sharedDropOilGeo;
    } else {
      if (!DripWatchScene.sharedDropCoolantGeo) {
        DripWatchScene.sharedDropCoolantGeo = new THREE.SphereGeometry(0.082, 14, 14);
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

  // Wireless links & MQTT Gateway
  private gatewayGroup: THREE.Group = new THREE.Group();
  private wirelessLinksGroup: THREE.Group = new THREE.Group();
  private wirelessPackets: Array<{ mesh: THREE.Mesh; curve: THREE.QuadraticBezierCurve3; t: number; speed: number }> = [];
  private signalDotsGroup: THREE.Group = new THREE.Group();


  // Inside Sensor Cutaway Model
  private insideSensorGroup: THREE.Group = new THREE.Group();
  private arcBridgeMesh!: THREE.Mesh;
  private irBeamMesh!: THREE.Mesh;

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

    // 1. Scene & Environment: Crisp industrial atmosphere with extended visibility
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a192f); // Deep industrial navy-slate environment
    this.scene.fog = new THREE.Fog(0x0a192f, 50, 140);

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
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(width, height);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
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

    // 5. Studio Environment map for realistic reflections
    const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
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
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2.0));
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
      this.renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2.0));
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
    // 1. Crisp, balanced ambient shop floor lighting
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x22334a, 1.85);
    hemiLight.position.set(0, 32, 0);
    this.scene.add(hemiLight);

    // 2. High directional key light casting clean industrial shadows and highlighting machines
    this.keyLight = new THREE.DirectionalLight(0xfff8ee, 2.8);
    this.keyLight.position.set(14, 30, 18);
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
      this.keyLight.shadow.bias = -0.0003;
    }
    this.scene.add(this.keyLight);

    // 3. Clear cool fill light from north wall ensuring no dark machine faces
    const fillLight = new THREE.DirectionalLight(0xbae6fd, 1.6);
    fillLight.position.set(-18, 20, -18);
    this.scene.add(fillLight);

    // 4. Front soft light from camera side so words, labels, and machine fronts are vibrantly illuminated
    const frontLight = new THREE.DirectionalLight(0xffffff, 1.45);
    frontLight.position.set(0, 18, 24);
    this.scene.add(frontLight);
  }

  private registerPartMesh(mesh: THREE.Mesh, _partId?: string) {
    this.interactiveMeshes.push(mesh);
    this.originalMaterials.set(mesh, mesh.material);
  }

  private buildShopFloor() {
    // 1. Concrete factory floor plane with aggregate noise and drain grates
    const floorGeo = new THREE.PlaneGeometry(52, 44);
    const floorMesh = new THREE.Mesh(floorGeo, this.materials.factoryFloor);
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.position.y = 0;
    floorMesh.receiveShadow = !isSoftwareGl;
    this.scene.add(floorMesh);

    // 2. Main Central Pedestrian Walkway (Green safety aisle with yellow border)
    const aisleGeo = new THREE.PlaneGeometry(4.0, 42);
    const aisleMesh = new THREE.Mesh(aisleGeo, this.materials.walkwayGreen);
    aisleMesh.rotation.x = -Math.PI / 2;
    aisleMesh.position.set(0, 0.01, 0);
    aisleMesh.receiveShadow = !isSoftwareGl;
    this.scene.add(aisleMesh);

    // Cross Walkway connecting east & west cells
    const crossAisleGeo = new THREE.PlaneGeometry(48, 3.6);
    const crossAisleMesh = new THREE.Mesh(crossAisleGeo, this.materials.walkwayGreen);
    crossAisleMesh.rotation.x = -Math.PI / 2;
    crossAisleMesh.position.set(0, 0.015, 0.8);
    crossAisleMesh.receiveShadow = !isSoftwareGl;
    this.scene.add(crossAisleMesh);

    // Safety warning hazard stripes around work cell perimeters
    const stripeMat = new THREE.MeshBasicMaterial({
      map: createHazardStripesTexture(),
      transparent: true,
      opacity: 0.85
    });

    const cellPositions = [
      { x: -7.5, z: -4.0 },
      { x: 7.5, z: -4.0 },
      { x: -7.5, z: 5.5 },
      { x: 7.5, z: 5.5 },
    ];

    cellPositions.forEach(pos => {
      // Work cell safety border
      const borderGeo = new THREE.PlaneGeometry(10.2, 7.2);
      const borderMesh = new THREE.Mesh(borderGeo, stripeMat);
      borderMesh.rotation.x = -Math.PI / 2;
      borderMesh.position.set(pos.x, 0.018, pos.z);
      this.scene.add(borderMesh);

      // Contact shadow beneath machine
      const shadowGeo = new THREE.PlaneGeometry(9.4, 6.4);
      const shadowMat = new THREE.MeshBasicMaterial({
        map: createRadialShadowTexture(),
        transparent: true,
        opacity: 0.65,
        depthWrite: false
      });
      const shadow = new THREE.Mesh(shadowGeo, shadowMat);
      shadow.rotation.x = -Math.PI / 2;
      shadow.position.set(pos.x, 0.02, pos.z);
      this.scene.add(shadow);
    });
  }

  private buildShopEnvironment() {
    // =========================================================================
    // ULTRA-REALISTIC INDUSTRIAL MACHINING WORKSHOP ENVIRONMENT
    // North wall, West wall, East wall, high ceiling trusses, overhead high-bay
    // LED lamps, cable trays, conduits, and perimeter background equipment.
    // =========================================================================

    // 1. North Factory Back Wall (Clad industrial wall panels)
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

    // 4. Wall Dado Line (Dark painted baseboard along the bottom of all walls)
    const dadoMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.5 });
    const northDado = new THREE.Mesh(new THREE.BoxGeometry(52, 0.7, 0.65), dadoMat);
    northDado.position.set(0, 0.35, -17.48);
    this.scene.add(northDado);

    const westDado = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.7, 44), dadoMat);
    westDado.position.set(-25.98, 0.35, 0);
    this.scene.add(westDado);

    const eastDado = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.7, 44), dadoMat);
    eastDado.position.set(25.98, 0.35, 0);
    this.scene.add(eastDado);

    // 5. Structural Steel I-Beam Columns along the walls
    const columnGeo = new THREE.BoxGeometry(0.5, 12, 0.5);
    const colPositions = [
      { x: -20, z: -17.2 },
      { x: -10, z: -17.2 },
      { x: 0, z: -17.2 },
      { x: 10, z: -17.2 },
      { x: 20, z: -17.2 },
      { x: -25.7, z: -10 },
      { x: -25.7, z: 0 },
      { x: -25.7, z: 10 },
      { x: 25.7, z: -10 },
      { x: 25.7, z: 0 },
      { x: 25.7, z: 10 },
    ];
    colPositions.forEach(cp => {
      const col = new THREE.Mesh(columnGeo, this.materials.trussSteel);
      col.position.set(cp.x, 6.0, cp.z);
      this.scene.add(col);
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

    // 10. Galvanized Electrical EMT Conduit Lines
    const conduitGeo = new THREE.CylinderGeometry(0.045, 0.045, 48, 8);
    conduitGeo.rotateZ(Math.PI / 2);
    const conduit1 = new THREE.Mesh(conduitGeo, this.materials.conduitElectric);
    conduit1.position.set(0, 3.2, -17.15);
    this.scene.add(conduit1);

    const conduit2 = new THREE.Mesh(conduitGeo, this.materials.conduitElectric);
    conduit2.position.set(0, 3.4, -17.15);
    this.scene.add(conduit2);

    // 11. Wall Ventilation Louvers on North Wall
    const ventGeo = new THREE.PlaneGeometry(2.8, 2.8);
    const ventMat = new THREE.MeshStandardMaterial({
      map: createVentGrilleTexture(),
      roughness: 0.5,
      metalness: 0.6
    });
    [-18.0, 18.0].forEach(vx => {
      const vent = new THREE.Mesh(ventGeo, ventMat);
      vent.position.set(vx, 7.5, -17.18);
      this.scene.add(vent);
    });

    // 12. Safety Signs on North Wall
    const signGeo = new THREE.PlaneGeometry(1.8, 1.8);
    const eyeSign = new THREE.Mesh(signGeo, new THREE.MeshBasicMaterial({ map: createSafetySignTexture('eye_protection') }));
    eyeSign.position.set(-11, 4.4, -17.16);
    this.scene.add(eyeSign);

    const spillSign = new THREE.Mesh(signGeo, new THREE.MeshBasicMaterial({ map: createSafetySignTexture('spill_response') }));
    spillSign.position.set(0, 4.0, -17.16);
    this.scene.add(spillSign);

    const fireSign = new THREE.Mesh(signGeo, new THREE.MeshBasicMaterial({ map: createSafetySignTexture('fire_extinguisher') }));
    fireSign.position.set(12, 4.4, -17.16);
    this.scene.add(fireSign);

    // 13. Wall-Mounted Fire Extinguisher (under fire sign)
    const extGroup = new THREE.Group();
    extGroup.position.set(12, 2.0, -17.0);

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
    const gCoords = GATEWAY_COORDINATES;

    // Gateway main metal chassis
    const chassisGeo = new THREE.BoxGeometry(1.4, 0.9, 0.4);
    const chassisMesh = new THREE.Mesh(chassisGeo, this.materials.gatewayBody);
    chassisMesh.position.set(gCoords.x, gCoords.y, gCoords.z);
    this.gatewayGroup.add(chassisMesh);
    this.registerPartMesh(chassisMesh, 'mqtt-gateway');

    // Dual High-Gain Dipole Antennas
    const antGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.9, 12);
    const antL = new THREE.Mesh(antGeo, this.materials.gatewayAntenna);
    antL.position.set(gCoords.x - 0.45, gCoords.y + 0.7, gCoords.z);
    antL.rotation.z = 0.15;
    this.gatewayGroup.add(antL);
    this.registerPartMesh(antL, 'mqtt-gateway');

    const antR = new THREE.Mesh(antGeo, this.materials.gatewayAntenna);
    antR.position.set(gCoords.x + 0.45, gCoords.y + 0.7, gCoords.z);
    antR.rotation.z = -0.15;
    this.gatewayGroup.add(antR);
    this.registerPartMesh(antR, 'mqtt-gateway');

    // Status LED on Gateway (flashing cyan/blue)
    const ledGeo = new THREE.SphereGeometry(0.045, 12, 12);
    const ledMat = new THREE.MeshBasicMaterial({ color: 0x1FA5A0 });
    const ledMesh = new THREE.Mesh(ledGeo, ledMat);
    ledMesh.position.set(gCoords.x, gCoords.y, gCoords.z + 0.21);
    this.gatewayGroup.add(ledMesh);

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

    // --- Vibration Isolation Rubber Feet under Machine Frame ---
    const footGeo = new THREE.CylinderGeometry(0.2, 0.22, 0.1, 16);
    const boltGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.05, 8);
    const footPositions = [
      { x: -2.2, z: -1.3 },
      { x: 2.2, z: -1.3 },
      { x: -2.2, z: 1.3 },
      { x: 2.2, z: 1.3 },
    ];
    footPositions.forEach(fp => {
      const foot = new THREE.Mesh(footGeo, this.materials.rubberFoot);
      foot.position.set(fp.x, 0.05, fp.z);
      group.add(foot);

      const bolt = new THREE.Mesh(boltGeo, this.materials.boltHead);
      bolt.position.set(fp.x, 0.12, fp.z);
      group.add(bolt);
    });

    // --- Perimeter Safety Guard Rails around Machine Work Cell ---
    const railMat = this.materials.safetyYellow;
    const postGeo = new THREE.CylinderGeometry(0.04, 0.04, 1.0, 12);
    const barGeo = new THREE.CylinderGeometry(0.03, 0.03, 2.2, 12);
    barGeo.rotateZ(Math.PI / 2);
    
    [
      { x: -3.8, z: 2.6 },
      { x: -3.8, z: 0.4 },
      { x: 3.8, z: 2.6 },
      { x: 3.8, z: 0.4 }
    ].forEach(rp => {
      const post = new THREE.Mesh(postGeo, railMat);
      post.position.set(rp.x, 0.5, rp.z);
      group.add(post);
    });
    const railL = new THREE.Mesh(barGeo, railMat);
    railL.position.set(-3.8, 0.85, 1.5);
    railL.rotation.y = Math.PI / 2;
    group.add(railL);

    const railR = new THREE.Mesh(barGeo, railMat);
    railR.position.set(3.8, 0.85, 1.5);
    railR.rotation.y = Math.PI / 2;
    group.add(railR);

    // --- Stainless Steel Drip Tray (Split into 2 Zones: Z1 and Z2) ---
    const trayW = 5.8;
    const trayD = 3.6;
    const trayH = 0.22;
    const rimT = 0.12;

    const trayBaseGeo = new THREE.BoxGeometry(trayW, 0.06, trayD);
    const trayBase = new THREE.Mesh(trayBaseGeo, this.materials.trayBase);
    trayBase.position.set(0, 0.03, 0);
    trayBase.renderOrder = 0;
    group.add(trayBase);

    // Tray perimeter rims with rolled edges
    const fbGeo = new THREE.BoxGeometry(trayW, trayH, rimT);
    const frontRim = new THREE.Mesh(fbGeo, this.materials.trayRim);
    frontRim.position.set(0, trayH / 2, trayD / 2 - rimT / 2);
    group.add(frontRim);

    const backRim = new THREE.Mesh(fbGeo, this.materials.trayRim);
    backRim.position.set(0, trayH / 2, -trayD / 2 + rimT / 2);
    group.add(backRim);

    const lrGeo = new THREE.BoxGeometry(rimT, trayH, trayD);
    const leftRim = new THREE.Mesh(lrGeo, this.materials.trayRim);
    leftRim.position.set(-trayW / 2 + rimT / 2, trayH / 2, 0);
    group.add(leftRim);

    const rightRim = new THREE.Mesh(lrGeo, this.materials.trayRim);
    rightRim.position.set(trayW / 2 - rimT / 2, trayH / 2, 0);
    group.add(rightRim);

    // Center divider partition splitting tray into Zone 1 (left) and Zone 2 (right)
    const divGeo = new THREE.BoxGeometry(rimT, trayH * 0.95, trayD - rimT * 2);
    const divider = new THREE.Mesh(divGeo, this.materials.trayDivider);
    divider.position.set(0, trayH / 2, 0);
    group.add(divider);

    // Recessed drain slots in zone 1 and zone 2
    const drainGeo = new THREE.BoxGeometry(0.35, 0.03, 0.35);
    const drainZ1 = new THREE.Mesh(drainGeo, this.materials.trayDivider);
    drainZ1.position.set(-1.4, 0.062, -trayD / 2 + 0.35);
    drainZ1.renderOrder = 1;
    group.add(drainZ1);

    const drainZ2 = new THREE.Mesh(drainGeo, this.materials.trayDivider);
    drainZ2.position.set(1.4, 0.062, -trayD / 2 + 0.35);
    drainZ2.renderOrder = 1;
    group.add(drainZ2);

    // 3D Zone Badges on Front Rim (High-contrast, clearly legible from distance)
    const badgeGeo = new THREE.PlaneGeometry(2.4, 1.15);
    const matZ1 = new THREE.MeshBasicMaterial({
      map: createZoneLabelTexture(`${id.toUpperCase()}-Z1`, 'Primary Basin', false),
      transparent: true,
      depthTest: true,
      side: THREE.DoubleSide
    });
    const labelZ1 = new THREE.Mesh(badgeGeo, matZ1);
    labelZ1.position.set(-1.4, trayH + 0.48, trayD / 2 + 0.12);
    labelZ1.rotation.x = -0.38;
    labelZ1.renderOrder = 18;
    group.add(labelZ1);

    const matZ2 = new THREE.MeshBasicMaterial({
      map: createZoneLabelTexture(`${id.toUpperCase()}-Z2`, 'Auxiliary Basin', false),
      transparent: true,
      depthTest: true,
      side: THREE.DoubleSide
    });
    const labelZ2 = new THREE.Mesh(badgeGeo, matZ2);
    labelZ2.position.set(1.4, trayH + 0.48, trayD / 2 + 0.12);
    labelZ2.rotation.x = -0.38;
    labelZ2.renderOrder = 18;
    group.add(labelZ2);

    // Puddle meshes, meniscus rims, spread pads, and advanced sensor detectors
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

    const zoneOffsets: Record<ZoneId, number> = { z1: -1.4, z2: 1.4 };

    (['z1', 'z2'] as ZoneId[]).forEach(zId => {
      const zX = zoneOffsets[zId];

      // 1. Puddle geometry with height offset at y=0.075 (above tray floor y=0.060 to prevent z-fighting)
      // Centered at drip impact basin point (zX, 0.075, 0.45)
      const pGeo = new THREE.CylinderGeometry(1.0, 1.0, 0.016, 40);
      puddleGeometries[zId] = pGeo;
      const pMesh = new THREE.Mesh(pGeo, this.materials.coolantFluid);
      pMesh.position.set(zX, 0.075, 0.45);
      pMesh.renderOrder = 5;
      pMesh.scale.set(0.001, 1, 0.001);
      pMesh.visible = false;
      group.add(pMesh);
      puddles[zId] = pMesh;

      // Meniscus specular rim ring highlight at outer perimeter
      const rimGeo = new THREE.RingGeometry(0.96, 1.0, 40);
      rimGeo.rotateX(-Math.PI / 2);
      const rimMesh = new THREE.Mesh(rimGeo, this.materials.meniscusRim);
      rimMesh.position.set(zX, 0.076, 0.45);
      rimMesh.scale.set(0.001, 1, 0.001);
      rimMesh.renderOrder = 6;
      rimMesh.visible = false;
      group.add(rimMesh);
      meniscusRims[zId] = rimMesh;

      // Zone alert outline highlight
      const fillGeo = new THREE.PlaneGeometry(2.5, trayD - 0.4);
      const fillMesh = new THREE.Mesh(fillGeo, new THREE.MeshBasicMaterial({
        color: 0xC0392B,
        transparent: true,
        opacity: 0.0,
        depthWrite: false
      }));
      fillMesh.rotation.x = -Math.PI / 2;
      fillMesh.position.set(zX, 0.063, 0.45);
      fillMesh.renderOrder = 2;
      group.add(fillMesh);
      zoneFills[zId] = fillMesh;

      // =========================================================================
      // EXACTLY TWO SEPARATE CONDUCTIVE DETECTION ELECTRODES (Requirements 2 & 3)
      // Both installed inside this collection tray basin with visible 0.84m physical gap.
      // Full ~0.7m slender brushed-steel rods, terminal blocks, engraved nameplate tags,
      // and independent activation lighting upon physical fluid contact.
      // =========================================================================
      const sensorGroup = new THREE.Group();
      sensorGroup.position.set(zX, 0.06, 0.45);

      // --- ELECTRODE 1: OIL DETECTION ELECTRODE (Left side: offset x = -0.42) ---
      // Long slender conductive metallic rod (0.70m length, tip rests at y=0.08, right above tray floor y=0.06)
      const rodGeo = new THREE.CylinderGeometry(0.022, 0.022, 0.70, 16);
      const oilRod = new THREE.Mesh(rodGeo, this.materials.probeMetallic);
      oilRod.position.set(-0.42, 0.38, 0);
      sensorGroup.add(oilRod);
      this.registerPartMesh(oilRod, 'copper-electrodes');

      // Heavy industrial phenolic insulated mounting collar & chrome terminal head
      const mountBlockGeo = new THREE.BoxGeometry(0.12, 0.12, 0.12);
      const oilMount = new THREE.Mesh(mountBlockGeo, this.materials.sensorMount);
      oilMount.position.set(-0.42, 0.72, 0);
      sensorGroup.add(oilMount);

      const termNutGeo = new THREE.CylinderGeometry(0.032, 0.032, 0.06, 6);
      const oilNut = new THREE.Mesh(termNutGeo, this.materials.machineChrome);
      oilNut.position.set(-0.42, 0.80, 0);
      sensorGroup.add(oilNut);

      // Engraved metallic nameplate tag: OIL DETECTION ELECTRODE
      const tagGeo = new THREE.PlaneGeometry(0.68, 0.22);
      const oilTagMat = new THREE.MeshBasicMaterial({
        map: createElectrodeTagTexture('oil'),
        transparent: true,
        side: THREE.DoubleSide
      });
      const oilTag = new THREE.Mesh(tagGeo, oilTagMat);
      oilTag.position.set(-0.42, 0.98, 0.02);
      oilTag.renderOrder = 20;
      sensorGroup.add(oilTag);

      // Floating status badge: OIL DETECTED (appears when oil contacts rod)
      const badgeGeo = new THREE.PlaneGeometry(0.72, 0.26);
      const oilBadgeMat = new THREE.MeshBasicMaterial({
        map: createElectrodeActiveBadgeTexture('oil'),
        transparent: true,
        side: THREE.DoubleSide
      });
      const oilBadge = new THREE.Mesh(badgeGeo, oilBadgeMat);
      oilBadge.position.set(-0.42, 1.25, 0.04);
      oilBadge.renderOrder = 25;
      oilBadge.visible = false;
      sensorGroup.add(oilBadge);

      // Subtle warm amber contact point light at rod tip
      const oilLight = new THREE.PointLight(0xf59e0b, 0, 1.4);
      oilLight.position.set(-0.42, 0.08, 0);
      sensorGroup.add(oilLight);

      // Flexible conduit wiring leading from oil electrode mounting collar down to tray base
      const wireOilCurve = new THREE.QuadraticBezierCurve3(
        new THREE.Vector3(-0.42, 0.72, 0),
        new THREE.Vector3(-0.68, 0.32, 0.1),
        new THREE.Vector3(-0.95, 0.12, 0)
      );
      const oilWire = new THREE.Mesh(new THREE.TubeGeometry(wireOilCurve, 12, 0.016, 6, false), this.materials.probeWire);
      sensorGroup.add(oilWire);

      // --- ELECTRODE 2: COOLANT DETECTION ELECTRODE (Right side: offset x = +0.42) ---
      // Second separate long slender conductive metallic rod (0.70m length, tip rests at y=0.08)
      const coolantRod = new THREE.Mesh(rodGeo, this.materials.probeMetallic);
      coolantRod.position.set(0.42, 0.38, 0);
      sensorGroup.add(coolantRod);
      this.registerPartMesh(coolantRod, 'copper-electrodes');

      // Phenolic insulated mounting collar & chrome terminal head
      const coolantMount = new THREE.Mesh(mountBlockGeo, this.materials.sensorMount);
      coolantMount.position.set(0.42, 0.72, 0);
      sensorGroup.add(coolantMount);

      const coolantNut = new THREE.Mesh(termNutGeo, this.materials.machineChrome);
      coolantNut.position.set(0.42, 0.80, 0);
      sensorGroup.add(coolantNut);

      // Engraved metallic nameplate tag: COOLANT DETECTION ELECTRODE
      const coolantTagMat = new THREE.MeshBasicMaterial({
        map: createElectrodeTagTexture('coolant'),
        transparent: true,
        side: THREE.DoubleSide
      });
      const coolantTag = new THREE.Mesh(tagGeo, coolantTagMat);
      coolantTag.position.set(0.42, 0.98, 0.02);
      coolantTag.renderOrder = 20;
      sensorGroup.add(coolantTag);

      // Floating status badge: COOLANT DETECTED (appears when coolant contacts rod)
      const coolantBadgeMat = new THREE.MeshBasicMaterial({
        map: createElectrodeActiveBadgeTexture('coolant'),
        transparent: true,
        side: THREE.DoubleSide
      });
      const coolantBadge = new THREE.Mesh(badgeGeo, coolantBadgeMat);
      coolantBadge.position.set(0.42, 1.25, 0.04);
      coolantBadge.renderOrder = 25;
      coolantBadge.visible = false;
      sensorGroup.add(coolantBadge);

      // Subtle cyan contact point light at rod tip
      const coolantLight = new THREE.PointLight(0x06b6d4, 0, 1.4);
      coolantLight.position.set(0.42, 0.08, 0);
      sensorGroup.add(coolantLight);

      // Flexible conduit wiring leading from coolant electrode mounting collar down to tray base
      const wireCoolCurve = new THREE.QuadraticBezierCurve3(
        new THREE.Vector3(0.42, 0.72, 0),
        new THREE.Vector3(0.68, 0.32, 0.1),
        new THREE.Vector3(0.95, 0.12, 0)
      );
      const coolantWire = new THREE.Mesh(new THREE.TubeGeometry(wireCoolCurve, 12, 0.016, 6, false), this.materials.probeWire);
      sensorGroup.add(coolantWire);

      // Compatibility spark arc (kept hidden)
      const arcGeo = new THREE.CylinderGeometry(0.008, 0.008, 0.08, 6);
      arcGeo.rotateZ(Math.PI / 2);
      const sparkArc = new THREE.Mesh(arcGeo, this.materials.sparkArcLine);
      sparkArc.visible = false;
      sensorGroup.add(sparkArc);

      electrodes[zId] = {
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

      // Legacy wet badge for backward compatibility
      wetBadges[zId] = { mesh: coolantBadge, triggeredAt: null };

      group.add(sensorGroup);

      // =========================================================================
      // PROMINENT LEAKAGE OUTLET NOZZLE (Requirement #1)
      // Clearly positioned on machine body directly above drip basin at (zX, 1.62, 0.45)
      // =========================================================================
      const outletGroup = new THREE.Group();
      outletGroup.position.set(zX, 1.62, 0.45);

      // 1. Heavy industrial brass hex union & mounting flange
      const flangeGeo = new THREE.BoxGeometry(0.24, 0.16, 0.18);
      const flange = new THREE.Mesh(flangeGeo, this.materials.machineMetalTrim);
      flange.position.set(0, 0.08, -0.06);
      outletGroup.add(flange);

      const unionNutGeo = new THREE.CylinderGeometry(0.075, 0.075, 0.09, 6);
      const unionNut = new THREE.Mesh(unionNutGeo, this.materials.brassFitting);
      unionNut.position.set(0, 0.02, 0);
      outletGroup.add(unionNut);

      // 2. Downward tapered brass nozzle tube
      const nozzleGeo = new THREE.CylinderGeometry(0.048, 0.038, 0.22, 16);
      const nozzle = new THREE.Mesh(nozzleGeo, this.materials.brassFitting);
      nozzle.position.set(0, -0.09, 0);
      outletGroup.add(nozzle);

      // 3. Dark interior fluid aperture
      const aperGeo = new THREE.CylinderGeometry(0.026, 0.026, 0.02, 16);
      const aperture = new THREE.Mesh(aperGeo, this.materials.sensorMount);
      aperture.position.set(0, -0.19, 0);
      outletGroup.add(aperture);

      // 4. Heavy rubber supply hose entering machine chassis
      const hoseGeo = new THREE.CylinderGeometry(0.045, 0.045, 0.38, 12);
      const hose = new THREE.Mesh(hoseGeo, this.materials.rubberHose);
      hose.position.set(0, 0.26, -0.05);
      outletGroup.add(hose);

      group.add(outletGroup);

      // Swelling droplet emerging directly from nozzle aperture tip (y = 1.44, z = 0.45)
      const isDefaultOil = id === 'm1' || id === 'm4';
      const swellGeo = this.getDropGeometry(isDefaultOil ? 'oil' : 'coolant');
      const swellMat = isDefaultOil ? this.materials.oilDrop : this.materials.coolantDrop;
      const swellingDroplet = new THREE.Mesh(swellGeo, swellMat);
      swellingDroplet.position.set(zX, 1.44, 0.45);
      swellingDroplet.renderOrder = 4;
      swellingDroplet.visible = false;
      group.add(swellingDroplet);
      swellingDroplets[zId] = swellingDroplet;

      // Seep thin trail down fitting
      const trailGeo = new THREE.PlaneGeometry(0.05, 0.65);
      const zDripTrail = new THREE.Mesh(trailGeo, this.materials.dripTrail);
      zDripTrail.position.set(zX, 1.15, 0.47);
      zDripTrail.visible = false;
      group.add(zDripTrail);
      dripTrails[zId] = zDripTrail;
    });

    // --- MACHINE 3D BODY (Distinct Geometries for M1, M2, M3, M4) ---
    let nameBoardMesh!: THREE.Mesh;
    let nodeBoxMesh!: THREE.Mesh;
    let nodeLidMesh!: THREE.Mesh;
    let beaconLightMesh!: THREE.Mesh;
    let beaconPointLight!: THREE.PointLight;
    let ledZ1Mesh!: THREE.Mesh;
    let ledZ2Mesh!: THREE.Mesh;
    const nodePcbGroup = new THREE.Group();

    // =========================================================================
    // REDESIGNED UNIQUE INDUSTRIAL MACHINES (Requirement #3, #4, #5)
    // Four distinct industrial designs, silhouettes, palettes, and assemblies
    // =========================================================================
    if (id === 'm1') {
      // -----------------------------------------------------------------------
      // M1: 250-TON INDUSTRIAL HYDRAULIC STAMPING PRESS
      // Palette: Professional industrial blue (m1Blue) & graphite (m1Graphite)
      // Silhouette: 4-column stamping press with solid bed platen, twin chrome pillars,
      // upper drive crown, central hydraulic ram cylinder, moving slide, and bolster plate.
      // -----------------------------------------------------------------------
      // 1. Heavy Cast-Iron Bed Platen Foundation (Graphite)
      const bedGeo = new THREE.BoxGeometry(4.8, 0.45, 2.6);
      const bedMesh = new THREE.Mesh(bedGeo, this.materials.m1Graphite);
      bedMesh.position.set(0, 0.22, -0.4);
      group.add(bedMesh);
      chassisMeshes.push(bedMesh);
      this.registerPartMesh(bedMesh, 'm1-press');

      // 4 Cast Anchor Pads
      [-2.1, 2.1].forEach(bx => {
        [-1.0, 1.0].forEach(bz => {
          const pad = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.1, 0.32), this.materials.m1Graphite);
          pad.position.set(bx, 0.05, -0.4 + bz);
          group.add(pad);
          chassisMeshes.push(pad);
        });
      });

      // Ground Steel Die Bolster Plate
      const bolster = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.16, 1.8), this.materials.probeMetallic);
      bolster.position.set(0, 0.52, -0.4);
      group.add(bolster);
      chassisMeshes.push(bolster);

      // 2. Twin Heavy Chrome Guide Columns
      [-1.6, 1.6].forEach(cx => {
        const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 3.4, 20), this.materials.machineChrome);
        pillar.position.set(cx, 2.2, -0.4);
        group.add(pillar);
        chassisMeshes.push(pillar);
      });

      // 3. Stamping Press Slide Ram (Moving Platen)
      const ramSlide = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.38, 1.6), this.materials.m1Blue);
      ramSlide.position.set(0, 2.1, -0.4);
      group.add(ramSlide);
      chassisMeshes.push(ramSlide);
      this.registerPartMesh(ramSlide, 'm1-press');

      // Polished Chrome Piston Rod
      const ramPiston = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 1.6, 20), this.materials.machineChrome);
      ramPiston.position.set(0, 2.9, -0.4);
      group.add(ramPiston);
      chassisMeshes.push(ramPiston);

      // 4. Sturdy Upper Crown / Drive Enclosure (Industrial Blue)
      const crownGeo = new THREE.BoxGeometry(4.4, 1.4, 2.2);
      const crownMesh = new THREE.Mesh(crownGeo, this.materials.m1Blue);
      crownMesh.position.set(0, 3.8, -0.4);
      group.add(crownMesh);
      chassisMeshes.push(crownMesh);
      this.registerPartMesh(crownMesh, 'm1-press');

      // Crown graphite top rim
      const crownRim = new THREE.Mesh(new THREE.BoxGeometry(4.5, 0.12, 2.3), this.materials.m1Graphite);
      crownRim.position.set(0, 4.54, -0.4);
      group.add(crownRim);
      chassisMeshes.push(crownRim);

      // Central Hydraulic Cylinder Barrel
      const cylGeo = new THREE.CylinderGeometry(0.48, 0.48, 1.1, 24);
      const cylMesh = new THREE.Mesh(cylGeo, this.materials.m1Graphite);
      cylMesh.position.set(0, 4.85, -0.4);
      group.add(cylMesh);
      chassisMeshes.push(cylMesh);
      this.registerPartMesh(cylMesh, 'm1-press');

      // 5. Clean Hydraulic Manifold Block & High-Pressure Hose
      const maniMesh = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.65, 0.5), this.materials.m1Graphite);
      maniMesh.position.set(2.25, 1.8, -0.1);
      group.add(maniMesh);
      chassisMeshes.push(maniMesh);

      const m1HoseCurve = new THREE.QuadraticBezierCurve3(
        new THREE.Vector3(2.25, 2.1, -0.1),
        new THREE.Vector3(1.8, 3.4, 0.2),
        new THREE.Vector3(0.5, 4.4, -0.2)
      );
      const m1Hose = new THREE.Mesh(new THREE.TubeGeometry(m1HoseCurve, 16, 0.042, 8, false), this.materials.rubberHose);
      group.add(m1Hose);

      // Hazard warning decal
      const m1Hazard = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 0.16), new THREE.MeshBasicMaterial({ map: createMachineHazardDecalTexture(), transparent: true }));
      m1Hazard.position.set(0, 0.38, 0.92);
      group.add(m1Hazard);

      // X-Ray internals
      const tankGeo = new THREE.BoxGeometry(1.6, 1.0, 1.2);
      const tank = new THREE.Mesh(tankGeo, this.materials.internalHydraulicTank);
      tank.position.set(0, 3.8, -0.4);
      group.add(tank);
      xrayMeshes.push(tank);
      tank.visible = false;

    } else if (id === 'm2') {
      // -----------------------------------------------------------------------
      // M2: 5-AXIS VERTICAL CNC MACHINING CENTER (VMC)
      // Palette: Dark metallic steel (m2Steel), muted green (m2MutedGreen), charcoal (m2Charcoal)
      // Silhouette: Modern enclosed machining center cabin with dark-tinted safety viewing window,
      // internal tool spindle, top drive housing, automatic tool changer carousel, and swing-arm pendant.
      // -----------------------------------------------------------------------
      // 1. Heavy Machine Base Casting (Dark Metallic Steel)
      const baseGeo = new THREE.BoxGeometry(4.2, 0.65, 2.6);
      const baseMesh = new THREE.Mesh(baseGeo, this.materials.m2Steel);
      baseMesh.position.set(0, 0.32, -0.35);
      group.add(baseMesh);
      chassisMeshes.push(baseMesh);
      this.registerPartMesh(baseMesh, 'm2-milling');

      // 2. Clean Modern Protective Work Cabin Enclosure (Muted Green with Charcoal Frame)
      const cabinGeo = new THREE.BoxGeometry(3.6, 3.8, 2.2);
      const cabinMesh = new THREE.Mesh(cabinGeo, this.materials.m2Charcoal);
      cabinMesh.position.set(0, 2.55, -0.35);
      group.add(cabinMesh);
      chassisMeshes.push(cabinMesh);
      this.registerPartMesh(cabinMesh, 'm2-milling');

      // Muted Green Side & Front Trim Panels
      [-1.78, 1.78].forEach(sx => {
        const panel = new THREE.Mesh(new THREE.BoxGeometry(0.06, 3.2, 1.8), this.materials.m2MutedGreen);
        panel.position.set(sx, 2.55, -0.35);
        group.add(panel);
        chassisMeshes.push(panel);
      });

      // 3. Front Sliding Safety Door with Large Tinted Window
      const doorFrame = new THREE.Mesh(new THREE.BoxGeometry(2.3, 2.5, 0.08), this.materials.m2Charcoal);
      doorFrame.position.set(0, 2.55, 0.77);
      group.add(doorFrame);
      chassisMeshes.push(doorFrame);
      this.registerPartMesh(doorFrame, 'm2-milling');

      const winMesh = new THREE.Mesh(new THREE.BoxGeometry(2.0, 2.1, 0.04), this.materials.controlRoomGlass);
      winMesh.position.set(0, 2.55, 0.81);
      group.add(winMesh);
      chassisMeshes.push(winMesh);
      this.registerPartMesh(winMesh, 'm2-milling');

      // Clean Door Grab Rail
      const doorRail = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.5, 12), this.materials.machineChrome);
      doorRail.position.set(0.9, 2.55, 0.86);
      group.add(doorRail);
      chassisMeshes.push(doorRail);

      // 4. Vertical Tool Spindle Cartridge Inside Cabin
      const spindleGeo = new THREE.CylinderGeometry(0.22, 0.26, 0.85, 20);
      const spindleMesh = new THREE.Mesh(spindleGeo, this.materials.machineMetalTrim);
      spindleMesh.position.set(0, 2.4, 0.05);
      group.add(spindleMesh);
      chassisMeshes.push(spindleMesh);
      this.registerPartMesh(spindleMesh, 'm2-milling');

      const toolHolder = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 0.35, 16), this.materials.machineChrome);
      toolHolder.position.set(0, 1.85, 0.05);
      group.add(toolHolder);
      chassisMeshes.push(toolHolder);

      // 5. Upper Spindle Drive Motor Cover (Top extension)
      const topCover = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.95, 1.4), this.materials.m2Steel);
      topCover.position.set(0, 4.85, -0.35);
      group.add(topCover);
      chassisMeshes.push(topCover);
      this.registerPartMesh(topCover, 'm2-milling');

      // 6. Automatic Tool Changer (ATC) Carousel Housing on Left Flank
      const atcHousing = new THREE.Mesh(new THREE.CylinderGeometry(0.58, 0.58, 0.5, 20), this.materials.m2Charcoal);
      atcHousing.position.set(-2.0, 3.4, -0.2);
      group.add(atcHousing);
      chassisMeshes.push(atcHousing);

      // 7. Right-Side Articulated Swing-Arm CNC Operator Control Console
      const armCurve = new THREE.QuadraticBezierCurve3(
        new THREE.Vector3(1.8, 2.6, 0.2),
        new THREE.Vector3(2.3, 2.7, 0.6),
        new THREE.Vector3(2.2, 2.4, 0.9)
      );
      const armTube = new THREE.Mesh(new THREE.TubeGeometry(armCurve, 12, 0.04, 8, false), this.materials.m2Steel);
      group.add(armTube);

      const pendant = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.7, 0.1), this.materials.m2Charcoal);
      pendant.position.set(2.2, 2.4, 0.9);
      pendant.rotation.y = -0.3;
      group.add(pendant);
      chassisMeshes.push(pendant);

      const screenMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.44, 0.3), new THREE.MeshBasicMaterial({ map: createCncScreenTexture() }));
      screenMesh.position.set(2.2, 2.4, 0.96);
      screenMesh.rotation.y = -0.3;
      group.add(screenMesh);

      // Hazard decal
      const m2Hazard = new THREE.Mesh(new THREE.PlaneGeometry(3.8, 0.16), new THREE.MeshBasicMaterial({ map: createMachineHazardDecalTexture(), transparent: true }));
      m2Hazard.position.set(0, 0.48, 0.98);
      group.add(m2Hazard);

      xrayMeshes.push(spindleMesh);

    } else if (id === 'm3') {
      // -----------------------------------------------------------------------
      // M3: HORIZONTAL CNC SLANT-BED TURNING LATHE
      // Palette: Deep navy blue (m3Navy), brushed aluminium (m3BrushedAlum), dark graphite (m3Graphite)
      // Silhouette: Long horizontal casting with 30-degree slant guideways, spindle headstock,
      // 3-jaw hydraulic chuck, rigid tailstock with hydraulic quill, 8-station tool turret, and chip shield.
      // -----------------------------------------------------------------------
      // 1. Rigid Slant-Bed Cast Iron Foundation (Deep Navy Blue)
      const bedGeo = new THREE.BoxGeometry(5.4, 0.75, 2.4);
      const bedMesh = new THREE.Mesh(bedGeo, this.materials.m3Navy);
      bedMesh.position.set(0, 0.38, -0.35);
      group.add(bedMesh);
      chassisMeshes.push(bedMesh);
      this.registerPartMesh(bedMesh, 'm3-lathe');

      // 2. Precision 30-Degree Slant Way Cover in Brushed Aluminium
      const slantCover = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.15, 1.4), this.materials.m3BrushedAlum);
      slantCover.position.set(0, 0.92, -0.3);
      slantCover.rotation.x = 0.28;
      group.add(slantCover);
      chassisMeshes.push(slantCover);
      this.registerPartMesh(slantCover, 'm3-lathe');

      // 3. Spindle Headstock Gearbox Enclosure (Left Flank - Deep Navy Blue)
      const headGeo = new THREE.BoxGeometry(1.6, 1.9, 1.9);
      const headMesh = new THREE.Mesh(headGeo, this.materials.m3Navy);
      headMesh.position.set(-1.8, 1.55, -0.3);
      group.add(headMesh);
      chassisMeshes.push(headMesh);
      this.registerPartMesh(headMesh, 'm3-lathe');

      // Headstock brushed aluminium vent panel
      const headVent = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.32, 0.04), this.materials.m3BrushedAlum);
      headVent.position.set(-1.8, 1.85, 0.67);
      group.add(headVent);
      chassisMeshes.push(headVent);

      // Precision 3-Jaw Hydraulic Chuck in Brushed Steel
      const chuckGeo = new THREE.CylinderGeometry(0.55, 0.55, 0.35, 24);
      chuckGeo.rotateZ(Math.PI / 2);
      const chuckMesh = new THREE.Mesh(chuckGeo, this.materials.probeMetallic);
      chuckMesh.position.set(-0.75, 1.55, -0.3);
      group.add(chuckMesh);
      chassisMeshes.push(chuckMesh);
      this.registerPartMesh(chuckMesh, 'm3-lathe');

      // 3 Master Jaws
      [0, (2 * Math.PI) / 3, (4 * Math.PI) / 3].forEach(angle => {
        const jaw = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.22, 0.14), this.materials.machineChrome);
        jaw.position.set(-0.55, 1.55 + Math.sin(angle) * 0.35, -0.3 + Math.cos(angle) * 0.35);
        group.add(jaw);
        chassisMeshes.push(jaw);
      });

      // 4. Rigid Programmable Tailstock Casting (Right Flank)
      const tailGeo = new THREE.BoxGeometry(1.2, 1.35, 1.3);
      const tailMesh = new THREE.Mesh(tailGeo, this.materials.m3Navy);
      tailMesh.position.set(1.9, 1.35, -0.3);
      group.add(tailMesh);
      chassisMeshes.push(tailMesh);
      this.registerPartMesh(tailMesh, 'm3-lathe');

      // Hydraulic Quill Barrel extending toward chuck
      const quillGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.75, 16);
      quillGeo.rotateZ(Math.PI / 2);
      const quillMesh = new THREE.Mesh(quillGeo, this.materials.machineChrome);
      quillMesh.position.set(1.1, 1.55, -0.3);
      group.add(quillMesh);
      chassisMeshes.push(quillMesh);

      // 5. Indexing CNC Tool Turret Disc (Dark Graphite)
      const turretGeo = new THREE.CylinderGeometry(0.46, 0.46, 0.24, 8);
      turretGeo.rotateX(Math.PI / 2);
      const turretMesh = new THREE.Mesh(turretGeo, this.materials.m3Graphite);
      turretMesh.position.set(0.3, 1.65, 0.15);
      group.add(turretMesh);
      chassisMeshes.push(turretMesh);
      this.registerPartMesh(turretMesh, 'm3-lathe');

      // 4 Clean Tool Holders on Turret
      for (let ta = 0; ta < 4; ta++) {
        const rad = (ta * Math.PI) / 2;
        const toolBlock = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.16), this.materials.m3BrushedAlum);
        toolBlock.position.set(0.3 + Math.cos(rad) * 0.5, 1.65 + Math.sin(rad) * 0.5, 0.15);
        group.add(toolBlock);
        chassisMeshes.push(toolBlock);
      }

      // 6. Sliding Brushed Aluminium Front Chip Guard Shield
      const frontShield = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.95, 0.06), this.materials.m3BrushedAlum);
      frontShield.position.set(0.2, 1.7, 0.75);
      group.add(frontShield);
      chassisMeshes.push(frontShield);
      this.registerPartMesh(frontShield, 'm3-lathe');

      // Hazard warning decal
      const m3Hazard = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 0.16), new THREE.MeshBasicMaterial({ map: createMachineHazardDecalTexture(), transparent: true }));
      m3Hazard.position.set(0, 0.44, 0.88);
      group.add(m3Hazard);

    } else {
      // -----------------------------------------------------------------------
      // M4: COMPACT HYDRAULIC POWER UNIT & PUMPING SKID (HPU)
      // Palette: Graphite black (m4GraphiteBlack), metallic silver (m4MetallicSilver), yellow accents (m4YellowAccent)
      // Silhouette: Heavy C-channel skid base with welded 250L reservoir tank, TEFC electric motor,
      // manifold block with analog dial gauge, sight glass, high-pressure bypass hose, and breather cap.
      // -----------------------------------------------------------------------
      // 1. Heavy C-Channel Steel Skid Base (Graphite Black)
      const skidGeo = new THREE.BoxGeometry(4.4, 0.24, 2.3);
      const skidMesh = new THREE.Mesh(skidGeo, this.materials.m4GraphiteBlack);
      skidMesh.position.set(0, 0.12, -0.35);
      group.add(skidMesh);
      chassisMeshes.push(skidMesh);
      this.registerPartMesh(skidMesh, 'm4-hpu');

      // 4 Vibration Isolation Footing Pads
      [-1.9, 1.9].forEach(sx => {
        [-0.9, 0.9].forEach(sz => {
          const pad = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.06, 0.28), this.materials.rubberFoot);
          pad.position.set(sx, 0.03, -0.35 + sz);
          group.add(pad);
          chassisMeshes.push(pad);
        });
      });

      // 2. Welded 250L Hydraulic Reservoir Steel Tank (Graphite Black with Yellow Accent)
      const tankGeo = new THREE.BoxGeometry(3.4, 1.4, 1.8);
      const tankMesh = new THREE.Mesh(tankGeo, this.materials.m4GraphiteBlack);
      tankMesh.position.set(0, 0.95, -0.35);
      group.add(tankMesh);
      chassisMeshes.push(tankMesh);
      this.registerPartMesh(tankMesh, 'm4-hpu');

      // Subtle Yellow Accent Stripe along Upper Tank Perimeter
      const yStripe = new THREE.Mesh(new THREE.BoxGeometry(3.42, 0.06, 1.82), this.materials.m4YellowAccent);
      yStripe.position.set(0, 1.62, -0.35);
      group.add(yStripe);
      chassisMeshes.push(yStripe);

      // 3. TEFC Electric Induction Drive Motor (Metallic Silver)
      const motorGeo = new THREE.CylinderGeometry(0.38, 0.38, 1.15, 20);
      motorGeo.rotateZ(Math.PI / 2);
      const motorMesh = new THREE.Mesh(motorGeo, this.materials.m4MetallicSilver);
      motorMesh.position.set(-0.6, 2.15, -0.35);
      group.add(motorMesh);
      chassisMeshes.push(motorMesh);
      this.registerPartMesh(motorMesh, 'm4-hpu');

      // Motor Terminal Junction Box
      const tBox = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.18, 0.18), this.materials.m4GraphiteBlack);
      tBox.position.set(-0.6, 2.58, -0.35);
      group.add(tBox);
      chassisMeshes.push(tBox);

      // 4. Hydraulic Manifold Block & Pump (Metallic Silver)
      const maniMesh = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.65, 0.55), this.materials.m4MetallicSilver);
      maniMesh.position.set(0.6, 2.15, 0.1);
      group.add(maniMesh);
      chassisMeshes.push(maniMesh);

      // Round Glycerin-Damped Analog Pressure Gauge (Facing Forward)
      const gauge = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.05, 16), this.materials.machineChrome);
      gauge.rotateX(Math.PI / 2);
      gauge.position.set(0.6, 2.58, 0.38);
      group.add(gauge);
      chassisMeshes.push(gauge);

      // 5. Vertical Fluid Sight Level & Temperature Gauge on Front Tank Face
      const sight = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.7, 12), this.materials.controlRoomGlass);
      sight.position.set(-0.8, 1.0, 0.57);
      group.add(sight);

      const sightFrame = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.82, 0.04), this.materials.m4MetallicSilver);
      sightFrame.position.set(-0.8, 1.0, 0.56);
      group.add(sightFrame);
      chassisMeshes.push(sightFrame);

      // 6. Braided High-Pressure Bypass Loop Hose
      const m4LoopCurve = new THREE.QuadraticBezierCurve3(
        new THREE.Vector3(0.6, 2.15, 0.4),
        new THREE.Vector3(1.1, 2.4, 0.6),
        new THREE.Vector3(0.6, 1.7, 0.4)
      );
      const m4Hose = new THREE.Mesh(new THREE.TubeGeometry(m4LoopCurve, 12, 0.038, 8, false), this.materials.rubberHose);
      group.add(m4Hose);

      // Bolted Breather / Filler Cap on Tank Lid
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 0.16, 12), this.materials.m4MetallicSilver);
      cap.position.set(1.1, 1.74, -0.35);
      group.add(cap);
      chassisMeshes.push(cap);

      // Hazard warning decal
      const m4Hazard = new THREE.Mesh(new THREE.PlaneGeometry(3.8, 0.16), new THREE.MeshBasicMaterial({ map: createMachineHazardDecalTexture(), transparent: true }));
      m4Hazard.position.set(0, 0.22, 0.82);
      group.add(m4Hazard);
    }

    // --- 3D Name Board above each machine (Enlarged, crystal-clear typography) ---
    const boardGeo = new THREE.PlaneGeometry(4.8, 1.5);
    const cfg = MACHINES_CONFIG[id];
    const fluidStr = cfg.allowedFluids.map(f => f === 'oil' ? 'Hydraulic Oil (VG 46)' : 'Coolant Emulsion (8%)').join(' & ');
    const boardMat = new THREE.MeshBasicMaterial({
      map: createMachineNameBoardTexture(id.toUpperCase(), cfg.name.split(' ').slice(1).join(' '), fluidStr, false),
      transparent: true,
      depthTest: true,
      side: THREE.DoubleSide
    });
    nameBoardMesh = new THREE.Mesh(boardGeo, boardMat);
    nameBoardMesh.position.set(0, 5.2, 0.4);
    nameBoardMesh.renderOrder = 25;
    group.add(nameBoardMesh);
    const machinePartId = id === 'm1' ? 'm1-press' : id === 'm2' ? 'm2-milling' : id === 'm3' ? 'm3-lathe' : 'm4-hpu';
    this.registerPartMesh(nameBoardMesh, machinePartId);

    // --- ESP32 Node Box Mounted on Machine Frame ---
    const nodeGroup = new THREE.Group();
    nodeGroup.position.set(2.4, 1.6, 0.8);

    const nBoxGeo = new THREE.BoxGeometry(0.75, 0.95, 0.38);
    nodeBoxMesh = new THREE.Mesh(nBoxGeo, this.materials.nodeBox);
    nodeGroup.add(nodeBoxMesh);
    this.registerPartMesh(nodeBoxMesh, `node-${id}`);

    const nLidGeo = new THREE.BoxGeometry(0.76, 0.96, 0.05);
    nodeLidMesh = new THREE.Mesh(nLidGeo, this.materials.nodeLid);
    nodeLidMesh.position.set(0, 0, 0.2);
    nodeGroup.add(nodeLidMesh);

    // Node Name Tag on Lid (High-contrast, bold lettering)
    const nLabelGeo = new THREE.PlaneGeometry(0.72, 0.42);
    const nLabelMat = new THREE.MeshBasicMaterial({
      map: createNodeBoxLabelTexture(`Node ${id.toUpperCase()}`, false),
      transparent: true,
      depthTest: true,
      side: THREE.DoubleSide
    });
    const nLabelMesh = new THREE.Mesh(nLabelGeo, nLabelMat);
    nLabelMesh.position.set(0, 0.15, 0.23);
    nLabelMesh.renderOrder = 16;
    nodeGroup.add(nLabelMesh);

    // 2 Zone Status LEDs on Node Box Face
    const ledGeo = new THREE.SphereGeometry(0.035, 12, 12);
    const ledGreenMat = new THREE.MeshBasicMaterial({ color: 0x2E8540 });
    ledZ1Mesh = new THREE.Mesh(ledGeo, ledGreenMat);
    ledZ1Mesh.position.set(-0.15, -0.15, 0.21);
    nodeGroup.add(ledZ1Mesh);

    ledZ2Mesh = new THREE.Mesh(ledGeo, ledGreenMat.clone());
    ledZ2Mesh.position.set(0.15, -0.15, 0.21);
    nodeGroup.add(ledZ2Mesh);

    // Cable Glands entering node box bottom
    const glandGeo = new THREE.CylinderGeometry(0.035, 0.04, 0.12, 12);
    const gland1 = new THREE.Mesh(glandGeo, this.materials.cableGland);
    gland1.position.set(-0.15, -0.48, 0);
    nodeGroup.add(gland1);

    const gland2 = new THREE.Mesh(glandGeo, this.materials.cableGland);
    gland2.position.set(0.15, -0.48, 0);
    nodeGroup.add(gland2);

    // Node Buzzer Speaker Grill
    const bzGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.04, 16);
    bzGeo.rotateX(Math.PI / 2);
    const bzMesh = new THREE.Mesh(bzGeo, this.materials.buzzerBody);
    bzMesh.position.set(0, -0.28, 0.19);
    nodeGroup.add(bzMesh);

    // Internal PCB Functional Blocks for "Open Node" view
    const pcbGeo = new THREE.BoxGeometry(0.55, 0.72, 0.04);
    const pcb = new THREE.Mesh(pcbGeo, this.materials.nodePcb);
    pcb.position.set(0, 0, 0);
    nodePcbGroup.add(pcb);

    // ESP32 Metal RF shield can
    const shieldGeo = new THREE.BoxGeometry(0.24, 0.26, 0.02);
    const shield = new THREE.Mesh(shieldGeo, this.materials.esp32Shield);
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
      const bGeo = new THREE.PlaneGeometry(0.48, 0.09);
      const bMat = new THREE.MeshBasicMaterial({
        map: createBlockLabelTexture(b.name, b.sub, '#1FA5A0'),
        transparent: true
      });
      const bMesh = new THREE.Mesh(bGeo, bMat);
      bMesh.position.set(0, b.y, 0.03);
      nodePcbGroup.add(bMesh);
    });
    nodePcbGroup.visible = false;
    nodeGroup.add(nodePcbGroup);

    group.add(nodeGroup);

    // --- ALARM BEACON LIGHT ON TOP OF MACHINE (Green Normal, Flashing Red on Leak) ---
    const beaconGroup = new THREE.Group();
    beaconGroup.position.set(2.0, 4.6, -0.4);

    const bStemGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.5, 12);
    const bStem = new THREE.Mesh(bStemGeo, this.materials.machineMetalTrim);
    bStem.position.y = 0.25;
    beaconGroup.add(bStem);

    const bLampGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.35, 16);
    beaconLightMesh = new THREE.Mesh(bLampGeo, this.materials.beaconGreen);
    beaconLightMesh.position.y = 0.65;
    beaconGroup.add(beaconLightMesh);
    this.registerPartMesh(beaconLightMesh, `node-${id}`);

    beaconPointLight = new THREE.PointLight(0x2E8540, 1.2, 5.0);
    beaconPointLight.position.y = 0.65;
    beaconGroup.add(beaconPointLight);

    group.add(beaconGroup);

    // --- Floating 3D Alert Banner (Visible only during alert) ---
    const alertBannerGeo = new THREE.PlaneGeometry(5.2, 1.55);
    const alertBannerMat = new THREE.MeshBasicMaterial({
      map: createLeakAlertBannerTexture(`${id.toUpperCase()}-Z1`, 'Coolant'),
      transparent: true,
      side: THREE.DoubleSide
    });
    const alertBanner = new THREE.Mesh(alertBannerGeo, alertBannerMat);
    alertBanner.position.set(0, 6.6, 0);
    alertBanner.renderOrder = 30;
    alertBanner.visible = false;
    group.add(alertBanner);

    // --- Drip Trail and Stream Meshes for dynamic leak animation ---
    const trailGeo = new THREE.PlaneGeometry(0.08, 0.85);
    const dripTrail = new THREE.Mesh(trailGeo, this.materials.dripTrail);
    dripTrail.position.set(-1.4, 1.2, 0.45);
    dripTrail.visible = false;
    group.add(dripTrail);

    const streamGeo = new THREE.CylinderGeometry(0.03, 0.045, 1.4, 12);
    const fluidStream = new THREE.Mesh(streamGeo, this.materials.streamCoolant);
    fluidStream.position.set(-1.4, 0.75, 0.45);
    fluidStream.visible = false;
    group.add(fluidStream);

    // Cable Curves from electrode mounting bases directly into Node box
    const cableCurves: Record<ZoneId, THREE.CatmullRomCurve3> = {
      z1: new THREE.CatmullRomCurve3([
        new THREE.Vector3(-1.4, 0.20, 0.45),
        new THREE.Vector3(0, 0.22, 0.9),
        new THREE.Vector3(1.8, 0.6, 1.2),
        new THREE.Vector3(2.4, 1.2, 0.8)
      ]),
      z2: new THREE.CatmullRomCurve3([
        new THREE.Vector3(1.4, 0.20, 0.45),
        new THREE.Vector3(1.9, 0.4, 0.65),
        new THREE.Vector3(2.3, 0.9, 0.75),
        new THREE.Vector3(2.4, 1.2, 0.8)
      ])
    };

    // Build physical black cable tubes & signal pulses
    const signalPulses: Record<ZoneId, THREE.Mesh> = {
      z1: new THREE.Mesh(
        new THREE.SphereGeometry(0.065, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0x38BDF8 })
      ),
      z2: new THREE.Mesh(
        new THREE.SphereGeometry(0.065, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0x38BDF8 })
      )
    };
    signalPulses.z1.visible = false;
    signalPulses.z2.visible = false;
    group.add(signalPulses.z1);
    group.add(signalPulses.z2);

    (['z1', 'z2'] as ZoneId[]).forEach(zId => {
      const tubeGeo = new THREE.TubeGeometry(cableCurves[zId], 24, 0.025, 8, false);
      const tubeMesh = new THREE.Mesh(tubeGeo, this.materials.cableJacket);
      group.add(tubeMesh);
    });

    const nozzles: Record<ZoneId, THREE.Vector3> = {
      z1: new THREE.Vector3(coords.x - 1.4, 1.48, coords.z + 0.45),
      z2: new THREE.Vector3(coords.x + 1.4, 1.48, coords.z + 0.45)
    };

    this.scene.add(group);

    this.machines[id] = {
      group,
      chassisMeshes,
      xrayMeshes,
      nameBoardMesh,
      nodeBoxMesh,
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
    const gCoords = GATEWAY_COORDINATES;

    (['m1', 'm2', 'm3', 'm4'] as MachineId[]).forEach(id => {
      const mCoords = MACHINE_COORDINATES[id];
      const start = new THREE.Vector3(mCoords.x + 2.4, 2.0, mCoords.z + 0.8);
      const end = new THREE.Vector3(gCoords.x, gCoords.y, gCoords.z);
      const control = new THREE.Vector3((start.x + end.x) / 2, Math.max(start.y, end.y) + 3.5, (start.z + end.z) / 2);
      const curve = new THREE.QuadraticBezierCurve3(start, control, end);

      const pts = curve.getPoints(32);
      const lineGeo = new THREE.BufferGeometry().setFromPoints(pts);
      const line = new THREE.Line(lineGeo, this.materials.wirelessBeam);
      line.computeLineDistances();
      this.wirelessLinksGroup.add(line);

      // Wireless packet indicator
      const pktGeo = new THREE.SphereGeometry(0.065, 8, 8);
      const pkt = new THREE.Mesh(pktGeo, this.materials.wirelessPacket);
      this.wirelessLinksGroup.add(pkt);
      this.wirelessPackets.push({
        mesh: pkt,
        curve,
        t: Math.random(),
        speed: 0.18 + Math.random() * 0.08
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
      vy: 0,
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
      // Gravity acceleration: vy += 4.5 * delta (slowed so droplets are easily observable in 3D), position -= vy * delta
      d.vy += 4.5 * delta;
      d.mesh.position.y -= d.vy * delta;

      // Stretch along velocity vector into realistic teardrop
      const stretch = Math.min(d.vy * 0.18, d.fluidType === 'oil' ? 2.8 : 2.0);
      d.mesh.scale.set(
        Math.max(0.65, 0.9 - stretch * 0.1),
        1.0 + stretch,
        Math.max(0.65, 0.9 - stretch * 0.1)
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
    activeStreams: Record<MachineId, { isStreaming: boolean; zone: ZoneId; fluid: FluidType }>
  ) {
    const time = this.elapsedTime;

    (['m1', 'm2', 'm3', 'm4'] as MachineId[]).forEach(mId => {
      const mRef = this.machines[mId];
      if (!mRef) return;
      const mNode = nodeStates[mId];
      const mTel = telemetry[mId];

      const hasAlert = mNode.beaconStatus === 'red_flash';

      // 1. Alarm Beacon and point light (Active machine flashes red, others remain nominal green)
      if (hasAlert) {
        const flash = Math.sin(time * 12) > 0;
        mRef.beaconLightMesh.material = flash ? this.materials.beaconRed : this.materials.beaconGlass;
        mRef.beaconPointLight.color.setHex(0xC0392B);
        mRef.beaconPointLight.intensity = flash ? 3.0 : 0.4;
      } else {
        mRef.beaconLightMesh.material = this.materials.beaconGreen;
        mRef.beaconPointLight.color.setHex(0x2E8540);
        mRef.beaconPointLight.intensity = 1.0;
      }

      // 2. Node Status LEDs (Step 6 Requirement: indicator/status transitions from NORMAL to ALERT)
      if (mRef.ledZ1Mesh.material instanceof THREE.MeshBasicMaterial) {
        const isAlertZ1 = mNode.leds.z1 === 'red' || (this.activeDemoStep === 6 && mId === 'm2');
        const colorZ1 = isAlertZ1 
          ? (Math.floor(time * 5) % 2 === 0 ? 0xEF4444 : 0x7F1D1D) 
          : mNode.leds.z1 === 'amber' ? 0xD98200 : 0x2E8540;
        mRef.ledZ1Mesh.material.color.setHex(colorZ1);
      }
      if (mRef.ledZ2Mesh.material instanceof THREE.MeshBasicMaterial) {
        mRef.ledZ2Mesh.material.color.setHex(mNode.leds.z2 === 'red' ? 0xC0392B : mNode.leds.z2 === 'amber' ? 0xD98200 : 0x2E8540);
      }

      // 3. Floating 3D Alert Banner (Step 7 Requirement: COOLANT LEAK DETECTED or OIL LEAK DETECTED)
      const isStep7Alert = hasAlert || (this.activeDemoStep === 7 && mId === 'm2');
      if (isStep7Alert) {
        const alertZone: ZoneId = mTel.z1.status === 'alert' || this.activeDemoStep === 7 ? 'z1' : 'z2';
        const alertFluid = mTel[alertZone].activeFluid === 'none' 
          ? (mId === 'm1' || mId === 'm4' ? 'oil' : 'coolant') 
          : mTel[alertZone].activeFluid;

        if (!mRef.lastAlertState) {
          (mRef.alertBanner.material as THREE.MeshBasicMaterial).map = createDetectionChainLabelTexture(
            mId, 
            alertZone, 
            alertFluid
          );
          mRef.lastAlertState = true;
        }
        mRef.alertBanner.visible = true;
        mRef.alertBanner.position.y = 6.6 + Math.sin(time * 3) * 0.12;
      } else {
        mRef.alertBanner.visible = false;
        mRef.lastAlertState = false;
      }

      // 4. Continuous fluid stream for flood speed
      const streamInfo = activeStreams[mId];
      if (streamInfo && streamInfo.isStreaming) {
        mRef.fluidStream.visible = true;
        mRef.fluidStream.position.x = streamInfo.zone === 'z1' ? -1.4 : 1.4;
        mRef.fluidStream.material = streamInfo.fluid === 'oil' ? this.materials.streamOil : this.materials.streamCoolant;
      } else {
        mRef.fluidStream.visible = false;
      }

      // 5. Puddle mesh, Meniscus rim, and Sensor Reactions per Zone
      (['z1', 'z2'] as ZoneId[]).forEach(zId => {
        const tel = mTel[zId];
        const puddle = mRef.puddles[zId];
        const rim = mRef.meniscusRims[zId];
        const swellingDrop = mRef.swellingDroplets[zId];
        const trail = mRef.dripTrails[zId];

        // A. Puddle accumulation strictly clamped inside tray basin boundaries (radius <= 1.32)
        if (tel.puddleVolumeMl > 0) {
          puddle.visible = true;
          rim.visible = true;
          const radius = Math.min(Math.max(tel.puddleRadius, 0.05), 1.32);
          puddle.scale.set(radius, 1, radius);
          rim.scale.set(radius, 1, radius);
          puddle.material = tel.activeFluid === 'oil' ? this.materials.oilFluid : this.materials.coolantFluid;

          // Tray zone alert outline
          const fill = mRef.zoneFills[zId];
          if (fill.material instanceof THREE.MeshBasicMaterial) {
            fill.material.opacity = tel.status === 'alert' ? (0.2 + Math.sin(time * 6) * 0.15) : 0;
          }
        } else {
          puddle.visible = false;
          rim.visible = false;
          if (mRef.zoneFills[zId].material instanceof THREE.MeshBasicMaterial) {
            (mRef.zoneFills[zId].material as THREE.MeshBasicMaterial).opacity = 0;
          }
        }

        // B. Seep trail running down the fitting
        if (trail) {
          trail.visible = tel.activeFluid !== 'none' && tel.puddleVolumeMl > 0;
          trail.material = tel.activeFluid === 'oil' ? this.materials.streamOil : this.materials.dripTrail;
        }

        // C. Swelling droplet at nozzle fitting
        if (swellingDrop) {
          const isActivelyLeaking = tel.activeFluid !== 'none';
          swellingDrop.visible = isActivelyLeaking;
          if (isActivelyLeaking) {
            swellingDrop.material = tel.activeFluid === 'oil' ? this.materials.oilDrop : this.materials.coolantDrop;
            const cycleProgress = (time * 0.75) % 1.0;
            if (tel.activeFluid === 'oil') {
              // Oil: thick and slow, forms long stretched thread before detaching
              swellingDrop.scale.set(
                0.2 + cycleProgress * 0.45,
                (0.2 + cycleProgress * 0.45) * (1.0 + cycleProgress * 2.5),
                0.2 + cycleProgress * 0.45
              );
              swellingDrop.position.y = 1.44 - cycleProgress * 0.07;
            } else {
              // Coolant: thin and fast, smaller quicker drops, teardrop shape
              swellingDrop.scale.set(
                0.25 + cycleProgress * 0.65,
                (0.25 + cycleProgress * 0.65) * (1.0 + cycleProgress * 1.2),
                0.25 + cycleProgress * 0.65
              );
              swellingDrop.position.y = 1.44 - cycleProgress * 0.04;
            }
          }
        }

        // D. Dedicated Conductive Detection Electrodes: Independent physical contact activation
        const elec = mRef.electrodes[zId];
        if (elec) {
          const isOilContact = (tel.activeFluid === 'oil' && (tel.irSensorTriggered || tel.puddleRadius >= 0.38)) ||
                               (this.activeDemoStep === 4 && (mId === 'm1' || mId === 'm4'));
          const isCoolantContact = (tel.activeFluid === 'coolant' && (tel.electrodesTriggered || tel.puddleRadius >= 0.38)) ||
                                  (this.activeDemoStep === 4 && (mId === 'm2' || mId === 'm3'));

          if (isOilContact) {
            // Oil contacts Oil Detection Electrode: subtle amber activation effect
            elec.oilRod.material = this.materials.electrodeOilActive;
            elec.oilLight.intensity = 1.4;
            elec.oilBadge.visible = true;
            elec.oilBadge.position.y = 1.25 + Math.sin(time * 5) * 0.02;

            // Coolant electrode remains completely inactive
            elec.coolantRod.material = this.materials.probeMetallic;
            elec.coolantLight.intensity = 0;
            elec.coolantBadge.visible = false;
          } else if (isCoolantContact) {
            // Coolant contacts Coolant Detection Electrode: subtle cyan activation effect
            elec.coolantRod.material = this.materials.electrodeCoolantActive;
            elec.coolantLight.intensity = 1.4;
            elec.coolantBadge.visible = true;
            elec.coolantBadge.position.y = 1.25 + Math.sin(time * 5) * 0.02;

            // Oil electrode remains completely inactive
            elec.oilRod.material = this.materials.probeMetallic;
            elec.oilLight.intensity = 0;
            elec.oilBadge.visible = false;
          } else {
            // No fluid contact: both electrodes brushed metallic, lights off, badges hidden
            elec.oilRod.material = this.materials.probeMetallic;
            elec.oilLight.intensity = 0;
            elec.oilBadge.visible = false;

            elec.coolantRod.material = this.materials.probeMetallic;
            elec.coolantLight.intensity = 0;
            elec.coolantBadge.visible = false;
          }
        }

        // E. Signal transmission pulse along cable conduit into controller box (Step 5 Requirement)
        const pulse = mRef.signalPulses?.[zId];
        if (pulse) {
          const isOilActive = tel.activeFluid === 'oil' && (tel.irSensorTriggered || tel.puddleRadius >= 0.38);
          const isCoolantActive = tel.activeFluid === 'coolant' && (tel.electrodesTriggered || tel.puddleRadius >= 0.38);
          const isSignalActive = isOilActive || isCoolantActive || tel.status === 'alert' || (this.activeDemoStep === 5 && mId === 'm2' && zId === 'z1');
          if (isSignalActive) {
            pulse.visible = true;
            if (pulse.material instanceof THREE.MeshBasicMaterial) {
              pulse.material.color.setHex(tel.activeFluid === 'oil' ? 0xF59E0B : 0x06B6D4);
            }
            const pt = mRef.cableCurves[zId].getPoint((time * 0.75) % 1.0);
            pulse.position.copy(pt);
            const scale = 1.0 + Math.sin(time * 12) * 0.25;
            pulse.scale.set(scale, scale, scale);
          } else {
            pulse.visible = false;
          }
        }
      });
    });

    // Update inside sensor micro-arc or beam if active
    if (this.technicalViews.insideSensor) {
      this.arcBridgeMesh.visible = Math.sin(time * 24) > 0.2;
    }
  }

  public setTechnicalViews(views: TechnicalViews) {
    this.technicalViews = views;

    (['m1', 'm2', 'm3', 'm4'] as MachineId[]).forEach(mId => {
      const mRef = this.machines[mId];

      // X-Ray Machine
      mRef.chassisMeshes.forEach(mesh => {
        mesh.material = views.xrayMachine ? this.materials.machineChassisXray : (this.originalMaterials.get(mesh) || mesh.material);
      });
      mRef.xrayMeshes.forEach(obj => {
        obj.visible = views.xrayMachine;
      });

      // Open Node PCB
      mRef.nodeBoxMesh.material = views.openController ? this.materials.nodeBoxOpen : this.materials.nodeBox;
      mRef.nodeLidMesh.visible = !views.openController;
      mRef.nodePcbGroup.visible = views.openController;
    });

    // Inside Sensor Cutaway
    this.insideSensorGroup.visible = views.insideSensor;
  }

  // --- Camera Views & Flying Navigation ---
  public flyToFloorView() {
    this.activeDemoStep = null;
    this.targetCameraPos = new THREE.Vector3(0, 16.5, 20.0);
    this.targetControlsTarget = new THREE.Vector3(0, 1.2, 0);
  }

  public flyToMachine(machineId: MachineId) {
    this.activeDemoStep = null;
    const coords = MACHINE_COORDINATES[machineId] || MACHINE_COORDINATES['m1'];
    const tx = Number.isFinite(coords.x) ? coords.x : 0;
    const tz = Number.isFinite(coords.z) ? coords.z : 0;
    this.targetCameraPos = new THREE.Vector3(tx + 4.2, 4.8, tz + 5.5);
    this.targetControlsTarget = new THREE.Vector3(tx, 1.6, tz);
  }

  public flyToLeakSimulation(machineId: MachineId, zoneId: ZoneId = 'z1') {
    this.activeDemoStep = null;
    const coords = MACHINE_COORDINATES[machineId] || MACHINE_COORDINATES['m1'];
    const tx = Number.isFinite(coords.x) ? coords.x : 0;
    const tz = Number.isFinite(coords.z) ? coords.z : 0;
    const zOffset = zoneId === 'z1' ? -1.4 : 1.4;
    const focalX = tx + zOffset;
    // Smoothly frames the leakage outlet nozzle, falling droplets, both electrodes with nameplates, and expanding puddle
    this.targetCameraPos = new THREE.Vector3(focalX + 1.75, 1.55, tz + 0.45 + 2.2);
    this.targetControlsTarget = new THREE.Vector3(focalX, 0.65, tz + 0.45);
  }

  public flyToLeak(machineId: MachineId, zoneId: ZoneId = 'z1') {
    this.flyToLeakSimulation(machineId, zoneId);
  }

  /**
   * Requirement #3 & #4: Tailored, distinct camera viewpoint for every guided demo step
   * Smooth lerp damping at ~0.038 without sudden jumps or clipping through floor/walls
   */
  public flyToDemoStep(stepIndex: number, machineId: MachineId = 'm2') {
    this.activeDemoStep = stepIndex;
    const coords = MACHINE_COORDINATES[machineId] || MACHINE_COORDINATES['m2'];
    const tx = Number.isFinite(coords.x) ? coords.x : 7.5;
    const tz = Number.isFinite(coords.z) ? coords.z : -4.0;

    switch (stepIndex) {
      case 1:
        // Step 1 (Introduce Machine): Wide-angle view showing complete machine, collection tray, 2 electrodes, and controller box
        this.targetCameraPos = new THREE.Vector3(tx + 5.2, 4.4, tz + 6.0);
        this.targetControlsTarget = new THREE.Vector3(tx, 1.8, tz);
        break;

      case 2:
        // Step 2 (Leakage Point): Smooth close-up focusing on specific leakage outlet nozzle
        this.targetCameraPos = new THREE.Vector3(tx - 1.4 + 1.2, 1.85, tz + 0.45 + 1.6);
        this.targetControlsTarget = new THREE.Vector3(tx - 1.4, 1.55, tz + 0.45);
        break;

      case 3:
        // Step 3 (Liquid Dripping): Closer 3/4 or side angle clearly showing droplets falling into collection tray
        this.targetCameraPos = new THREE.Vector3(tx - 1.4 + 1.55, 1.55, tz + 0.45 + 1.8);
        this.targetControlsTarget = new THREE.Vector3(tx - 1.4, 0.85, tz + 0.45);
        break;

      case 4:
        // Step 4 (Electrode Contact): Close-up on tray basin and electrodes, showing fluid reaching rod and highlighting ONLY the touched electrode
        this.targetCameraPos = new THREE.Vector3(tx - 1.4 + 1.25, 1.35, tz + 0.45 + 1.6);
        this.targetControlsTarget = new THREE.Vector3(tx - 1.4, 0.45, tz + 0.45);
        break;

      case 5:
        // Step 5 (Signal Transmission): Camera framing activated probe and conduit wire, showing visible signal animation traveling along wire to controller
        this.targetCameraPos = new THREE.Vector3(tx + 3.4, 2.3, tz + 2.5);
        this.targetControlsTarget = new THREE.Vector3(tx + 0.6, 0.95, tz - 0.1);
        break;

      case 6:
        // Step 6 (Controller Activation): Zoomed directly on the controller node box, showing indicator/status changing from NORMAL to ALERT
        this.targetCameraPos = new THREE.Vector3(tx + 2.4 + 1.2, 1.75, tz + 0.8 + 1.6);
        this.targetControlsTarget = new THREE.Vector3(tx + 2.4, 1.6, tz + 0.8);
        break;

      case 7:
      default:
        // Step 7 (Final Detection Result): Wider 3/4 view displaying the exact zone-specific alert banner: COOLANT LEAK DETECTED (or OIL LEAK DETECTED)
        this.targetCameraPos = new THREE.Vector3(tx + 5.5, 4.8, tz + 6.0);
        this.targetControlsTarget = new THREE.Vector3(tx, 3.8, tz);
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
              mat.emissive.setHex(0x112838); // Subtle engineering teal hover highlight
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
      // Requirement: Clicking a machine does nothing (no popups, no drawers, no camera move)
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
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(width, height);
  };

  private startLoop() {
    const tick = () => {
      if (this.isDestroyed) return;

      const now = performance.now();
      const delta = Math.min((now - this.lastFrameTime) / 1000, 0.1);
      this.lastFrameTime = now;
      this.elapsedTime += delta;

      // Auto-quality watchdog: if frame delta consistently exceeds 45ms for > 35 frames, auto-downgrade quality
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

      this.updateDroplets(delta);
      this.updateSplashes(delta);
      this.updateRipples(delta);

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

      // Animate wireless packets flying along bezier curves to MQTT gateway
      this.wirelessPackets.forEach(p => {
        p.t = (p.t + delta * p.speed) % 1.0;
        p.mesh.position.copy(p.curve.getPoint(p.t));
      });

      // Billboarding: Ensure 3D name boards, alert banners, and wet badges always face the camera
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
          this.camera.position.lerp(this.targetCameraPos, 0.038);
          this.controls.target.lerp(this.targetControlsTarget, 0.038);
          this.camera.position.y = Math.max(this.camera.position.y, 1.5);

          if (this.camera.position.distanceTo(this.targetCameraPos) < 0.05) {
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

      // Frame pacing: smooth 60fps on GPU, stable 30fps on software WebGL
      if (isSoftwareGl) {
        this.frameId = window.setTimeout(tick, 33);
      } else {
        this.frameId = requestAnimationFrame(tick);
      }
    };

    tick();
  }

  public resetSimulation() {
    // Restore scene background, fog, and exposure
    this.scene.background = new THREE.Color(0x0a192f);
    this.scene.fog = new THREE.Fog(0x0a192f, 50, 140);
    this.renderer.toneMappingExposure = 1.15;
    this.flyToFloorView();
    // Clear droplets (without disposing shared geometries)
    for (const d of this.activeDroplets) {
      this.dropletGroup.remove(d.mesh);
    }
    this.activeDroplets = [];

    // Clear splashes (without disposing shared geometries)
    for (const s of this.activeSplashes) {
      this.splashGroup.remove(s.mesh);
    }
    this.activeSplashes = [];

    // Clear ripples (without disposing shared geometries)
    for (const r of this.activeRipples) {
      this.rippleGroup.remove(r.mesh);
    }
    this.activeRipples = [];

    // Reset machine puddles and alerts
    (['m1', 'm2', 'm3', 'm4'] as MachineId[]).forEach(id => {
      const m = this.machines[id];
      if (m) {
        m.alertBanner.visible = false;
        m.fluidStream.visible = false;
        m.dripTrail.visible = false;
        m.beaconLightMesh.material = this.materials.beaconGreen;
        m.beaconPointLight.color.setHex(0x2E8540);
        m.beaconPointLight.intensity = 1.0;

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
