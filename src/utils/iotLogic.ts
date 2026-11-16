import { 
  MachineId, 
  ZoneId, 
  MachineZoneId, 
  FluidType, 
  LeakSpeed, 
  MachineConfig, 
  ZoneTelemetry, 
  MachineNodeState,
  IncidentRecord,
  SeverityRating
} from '../types/dripwatch';

export const MACHINES_CONFIG: Record<MachineId, MachineConfig> = {
  m1: {
    id: 'm1',
    name: 'M1 Hydraulic Press',
    type: 'Heavy Stamping Press (250 Ton)',
    allowedFluids: ['oil', 'coolant'],
    description: 'High-pressure hydraulic manifold and ram seal basin with dual conductive electrode detection.',
    color: '#1e3a8a',
    sensorTypes: ['electrodes', 'ir_reflector']
  },
  m2: {
    id: 'm2',
    name: 'M2 CNC Milling Machine',
    type: '5-Axis Vertical Machining Center',
    allowedFluids: ['coolant', 'oil'],
    description: 'High-speed spindle and flood coolant recirculation with dual conductive electrode detection.',
    color: '#ea580c',
    sensorTypes: ['electrodes', 'ir_reflector']
  },
  m3: {
    id: 'm3',
    name: 'M3 Lathe',
    type: 'Slant-Bed CNC Turning Center',
    allowedFluids: ['coolant', 'oil'],
    description: 'Dual-fluid chuck spindle and slideway lubing with dual conductive electrode detection.',
    color: '#059669',
    sensorTypes: ['electrodes', 'ir_reflector']
  },
  m4: {
    id: 'm4',
    name: 'M4 Hydraulic Power Unit',
    type: 'Auxiliary HPU Station (30 kW)',
    allowedFluids: ['oil', 'coolant'],
    description: 'Continuous pump skid and valve package with dual conductive electrode detection.',
    color: '#d97706',
    sensorTypes: ['electrodes', 'ir_reflector']
  }
};

export const MACHINE_COORDINATES: Record<MachineId, { x: number; z: number; name: string }> = {
  m1: { x: -7.5, z: -4.0, name: 'M1 Hydraulic Press' },
  m2: { x: 7.5, z: -4.0, name: 'M2 CNC Milling Machine' },
  m3: { x: -7.5, z: 5.5, name: 'M3 Lathe' },
  m4: { x: 7.5, z: 5.5, name: 'M4 Hydraulic Power Unit' }
};

export const GATEWAY_COORDINATES = { x: 0, y: 2.35, z: 0.75 };
export const CONTROL_ROOM_COORDINATES = { x: 0, y: 4.5, z: 14.5 };

export const ELECTRODE_CONTACT_RADIUS = 0.50;
export const PAD_DISTANCES = [ELECTRODE_CONTACT_RADIUS, 0.72, 0.92];

/**
 * Calculates physical puddle radius in 3D units based on fluid viscosity
 */
export function calculatePuddleRadius(fluidType: FluidType | 'none', puddleVolumeMl: number): number {
  if (puddleVolumeMl <= 0 || fluidType === 'none') return 0;
  if (fluidType === 'coolant') {
    return Math.min(Math.sqrt(puddleVolumeMl * 0.16) * 0.85 + 0.12, 1.45);
  }
  return Math.min(Math.sqrt(puddleVolumeMl * 0.12) * 0.78 + 0.09, 1.35);
}

/**
 * Calculates electrical conductivity in µS/cm (coolant vs oil/dry)
 */
export function calculateConductivity(fluidType: FluidType | 'none', puddleVolumeMl: number): number {
  if (fluidType !== 'coolant' || puddleVolumeMl <= 0) {
    return 1.6 + Math.sin(puddleVolumeMl * 0.1) * 0.3; // dry ambient
  }
  const base = 520;
  const scaled = Math.min(puddleVolumeMl * 28, 480);
  return Math.round(base + scaled);
}

/**
 * Calculates optical IR reflectance in % (100% = clear, < 35% = attenuated by oil film)
 */
export function calculateIrReflectance(fluidType: FluidType | 'none', puddleVolumeMl: number): number {
  if (fluidType !== 'oil' || puddleVolumeMl <= 0) {
    return 98.4;
  }
  const drop = Math.min(puddleVolumeMl * 4.8, 78);
  return Math.max(98.4 - drop, 16.5);
}

/**
 * Pure evaluation of a single zone's sensors for a machine.
 * Physical electrode contact occurs only when spreading fluid reaches ELECTRODE_CONTACT_RADIUS.
 */
export function evaluateZone(
  machineId: MachineId,
  zoneId: ZoneId,
  isThisZoneLeaking: boolean,
  fluidType: FluidType,
  puddleVolumeMl: number,
  leakStartTime?: number | null
): ZoneTelemetry {
  const fullZoneId: MachineZoneId = `${machineId}-${zoneId}`;
  const activeFluid = isThisZoneLeaking && puddleVolumeMl > 0 ? fluidType : 'none';

  const conductivity = calculateConductivity(activeFluid, puddleVolumeMl);
  const reflectance = calculateIrReflectance(activeFluid, puddleVolumeMl);
  const puddleRadius = calculatePuddleRadius(activeFluid, isThisZoneLeaking ? puddleVolumeMl : 0);

  const padsGlow: [boolean, boolean, boolean] = [
    isThisZoneLeaking && puddleRadius >= PAD_DISTANCES[0],
    isThisZoneLeaking && puddleRadius >= PAD_DISTANCES[1],
    isThisZoneLeaking && puddleRadius >= PAD_DISTANCES[2]
  ];

  // Physical fluid contact with the dedicated Oil or Coolant electrode rod inside collection tray
  const sensorReached = isThisZoneLeaking && puddleRadius >= ELECTRODE_CONTACT_RADIUS;
  const electrodesTriggered = activeFluid === 'coolant' && sensorReached;
  const irSensorTriggered = activeFluid === 'oil' && sensorReached;
  const hasAlert = electrodesTriggered || irSensorTriggered;

  const isElectrodes = fluidType === 'coolant';
  const sensorSignalType: 'electrodes' | 'ir_reflector' = isElectrodes ? 'electrodes' : 'ir_reflector';
  const sensorThreshold = isElectrodes ? 500 : 35;
  const signalUnit = isElectrodes ? 'µS/cm' : '%';
  const sensorSignal = isElectrodes ? conductivity : reflectance;

  // Calculate milestones
  let liquidReachedTime: number | null = null;
  let thresholdCrossedTime: number | null = null;
  let confirmedTime: number | null = null;
  let detectionTimeSeconds: number | null = null;

  if (isThisZoneLeaking && leakStartTime && hasAlert) {
    const elapsed = Math.max((Date.now() - leakStartTime) / 1000, 0.4);
    liquidReachedTime = Number((Math.min(elapsed * 0.72, 2.8)).toFixed(1));
    thresholdCrossedTime = Number((liquidReachedTime + 0.4).toFixed(1));
    confirmedTime = Number((thresholdCrossedTime + 0.8).toFixed(1));
    detectionTimeSeconds = confirmedTime;
  }

  // Generate illustrative signal curve for the live line chart
  const signalHistory: { time: number; value: number }[] = [];
  const maxT = liquidReachedTime ? Math.max(4.5, liquidReachedTime + 1.8) : 4.5;
  const steps = 14;
  for (let i = 0; i <= steps; i++) {
    const t = Number(((i / steps) * maxT).toFixed(1));
    if (isElectrodes) {
      if (!liquidReachedTime || t < liquidReachedTime) {
        signalHistory.push({ time: t, value: 2.2 + Math.sin(t * 3) * 0.8 });
      } else if (t < (thresholdCrossedTime || liquidReachedTime + 0.4)) {
        signalHistory.push({ time: t, value: 380 });
      } else {
        signalHistory.push({ time: t, value: 720 + Math.sin(t * 2) * 25 });
      }
    } else {
      if (!liquidReachedTime || t < liquidReachedTime) {
        signalHistory.push({ time: t, value: 98.2 - Math.sin(t * 2) * 0.6 });
      } else if (t < (thresholdCrossedTime || liquidReachedTime + 0.4)) {
        signalHistory.push({ time: t, value: 44 });
      } else {
        signalHistory.push({ time: t, value: 21.5 + Math.sin(t * 2) * 1.5 });
      }
    }
  }

  return {
    machineId,
    zoneId,
    fullZoneId,
    label: `${machineId.toUpperCase()}-${zoneId.toUpperCase()}`,
    status: hasAlert ? 'alert' : 'normal',
    coolantConductivity: Number(conductivity.toFixed(1)),
    oilReflectance: Number(reflectance.toFixed(1)),
    puddleVolumeMl: isThisZoneLeaking ? puddleVolumeMl : 0,
    puddleRadius,
    activeFluid,
    electrodesTriggered,
    irSensorTriggered,
    padsGlow,
    sensorSignal: Number(sensorSignal.toFixed(1)),
    sensorThreshold,
    signalUnit,
    sensorSignalType,
    liquidReachedTime,
    thresholdCrossedTime,
    confirmedTime,
    detectionTimeSeconds,
    signalHistory
  };
}

export const PIPELINE_TIMINGS = {
  WIRE_DURATION_S: 1.0,
  PROCESSING_DURATION_S: 1.2,
  NODE_DETECTED_PAUSE_S: 0.3,
  COMPARTMENT_TX_DURATION_S: 1.4,
};

/**
 * Pure deterministic evaluation of the physical detection -> wire -> Node/CPU -> General Compartment pipeline
 */
export function evaluateNodePipeline(
  activeElectrode: 'oil' | 'coolant' | null,
  contactTime: number | null | undefined,
  nowMs: number = Date.now(),
  timingScale: number = 1
): Pick<
  MachineNodeState,
  | 'pipelineStage'
  | 'nodeDisplayStatus'
  | 'detectedFluid'
  | 'activeElectrode'
  | 'wireSignalProgress'
  | 'compartmentLinkProgress'
  | 'compartmentAlertActive'
> {
  if (!activeElectrode || contactTime === null) {
    return {
      pipelineStage: 'normal',
      nodeDisplayStatus: 'NORMAL',
      detectedFluid: null,
      activeElectrode: null,
      wireSignalProgress: 0,
      compartmentLinkProgress: 0,
      compartmentAlertActive: false,
    };
  }

  // If contactTime is explicitly omitted (legacy call), treat as fully settled alert
  if (contactTime === undefined) {
    return {
      pipelineStage: 'compartment_alert',
      nodeDisplayStatus: 'LEAK DETECTED',
      detectedFluid: activeElectrode,
      activeElectrode,
      wireSignalProgress: 1,
      compartmentLinkProgress: 1,
      compartmentAlertActive: true,
    };
  }

  const scale = Math.max(timingScale, 0.2);
  const elapsed = Math.max(0, (nowMs - contactTime) / 1000);
  const wireDur = PIPELINE_TIMINGS.WIRE_DURATION_S * scale;
  const procDur = PIPELINE_TIMINGS.PROCESSING_DURATION_S * scale;
  const detPause = PIPELINE_TIMINGS.NODE_DETECTED_PAUSE_S * scale;
  const txDur = PIPELINE_TIMINGS.COMPARTMENT_TX_DURATION_S * scale;

  const tWireEnd = wireDur;
  const tProcEnd = tWireEnd + procDur;
  const tNodeDetEnd = tProcEnd + detPause;
  const tTxEnd = tNodeDetEnd + txDur;

  if (elapsed < tWireEnd) {
    return {
      pipelineStage: 'wire_signal',
      nodeDisplayStatus: 'NORMAL',
      detectedFluid: null,
      activeElectrode,
      wireSignalProgress: Math.min(elapsed / wireDur, 1),
      compartmentLinkProgress: 0,
      compartmentAlertActive: false,
    };
  }

  if (elapsed < tProcEnd) {
    return {
      pipelineStage: 'processing',
      nodeDisplayStatus: 'PROCESSING',
      detectedFluid: activeElectrode,
      activeElectrode,
      wireSignalProgress: 1,
      compartmentLinkProgress: 0,
      compartmentAlertActive: false,
    };
  }

  if (elapsed < tNodeDetEnd) {
    return {
      pipelineStage: 'leak_detected',
      nodeDisplayStatus: 'LEAK DETECTED',
      detectedFluid: activeElectrode,
      activeElectrode,
      wireSignalProgress: 1,
      compartmentLinkProgress: 0,
      compartmentAlertActive: false,
    };
  }

  if (elapsed < tTxEnd) {
    return {
      pipelineStage: 'transmitting',
      nodeDisplayStatus: 'LEAK DETECTED',
      detectedFluid: activeElectrode,
      activeElectrode,
      wireSignalProgress: 1,
      compartmentLinkProgress: Math.min((elapsed - tNodeDetEnd) / txDur, 1),
      compartmentAlertActive: false,
    };
  }

  return {
    pipelineStage: 'compartment_alert',
    nodeDisplayStatus: 'LEAK DETECTED',
    detectedFluid: activeElectrode,
    activeElectrode,
    wireSignalProgress: 1,
    compartmentLinkProgress: 1,
    compartmentAlertActive: true,
  };
}

/**
 * Derives independent Node/CPU Box and signal pipeline state for a specific machine
 */
export function deriveMachineNodeState(
  machineId: MachineId,
  z1: ZoneTelemetry,
  z2: ZoneTelemetry,
  contactTime?: number | null,
  nowMs: number = Date.now(),
  timingScale: number = 1
): MachineNodeState {
  const getLed = (tel: ZoneTelemetry): 'green' | 'red' | 'amber' => {
    if (tel.status === 'alert') {
      return tel.activeFluid === 'oil' ? 'amber' : 'red';
    }
    return 'green';
  };

  const activeZoneTel = z1.status === 'alert' ? z1 : z2.status === 'alert' ? z2 : null;
  const activeElectrode: 'oil' | 'coolant' | null =
    activeZoneTel?.irSensorTriggered
      ? 'oil'
      : activeZoneTel?.electrodesTriggered
        ? 'coolant'
        : null;

  const pipeline = evaluateNodePipeline(activeElectrode, contactTime, nowMs, timingScale);
  const nodeDetectedOrHigher =
    pipeline.pipelineStage === 'leak_detected' ||
    pipeline.pipelineStage === 'transmitting' ||
    pipeline.pipelineStage === 'compartment_alert';

  return {
    machineId,
    wifiConnected: true,
    mqttConnected: true,
    buzzerActive: pipeline.compartmentAlertActive,
    beaconStatus: nodeDetectedOrHigher ? 'red_flash' : 'green',
    ...pipeline,
    leds: {
      z1: nodeDetectedOrHigher ? getLed(z1) : pipeline.pipelineStage === 'processing' && z1.status === 'alert' ? 'amber' : 'green',
      z2: nodeDetectedOrHigher ? getLed(z2) : pipeline.pipelineStage === 'processing' && z2.status === 'alert' ? 'amber' : 'green',
    }
  };
}

/**
 * Validates whether a fluid is supported by a machine
 */
export function isFluidAllowedForMachine(machineId: MachineId, fluid: FluidType): boolean {
  return MACHINES_CONFIG[machineId].allowedFluids.includes(fluid);
}

/**
 * Gets default fluid for machine
 */
export function getDefaultFluidForMachine(machineId: MachineId): FluidType {
  return MACHINES_CONFIG[machineId].allowedFluids[0];
}

/**
 * Leak speed configurations:
 * - light_flow: ~1 individual droplet per second with gradual tray accumulation
 * - heavy_flow: continuous closely-spaced individual droplets (never a solid stream) with faster accumulation
 */
export function getLeakSpeedConfig(speed: LeakSpeed): { dropsPerSec: number; volIncrementPerSec: number; streamFlow: boolean } {
  switch (speed) {
    case 'heavy_flow':
      return { dropsPerSec: 4.2, volIncrementPerSec: 1.35, streamFlow: false };
    case 'light_flow':
    default:
      return { dropsPerSec: 1.0, volIncrementPerSec: 0.30, streamFlow: false };
  }
}

/**
 * Evaluates escalation status for incidents: unacknowledged > 20s
 */
export function checkIncidentEscalation(incident: IncidentRecord, currentTimeMs: number): boolean {
  if (incident.status === 'detected') {
    const elapsedSeconds = (currentTimeMs - incident.detectedAt) / 1000;
    return elapsedSeconds >= 20;
  }
  return false;
}
