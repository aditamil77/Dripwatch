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
    allowedFluids: ['oil'],
    description: 'High-pressure hydraulic manifold and ram seal basin with ISO VG 46 mineral oil.',
    color: '#1e3a8a',
    sensorTypes: ['ir_reflector', 'capacitive']
  },
  m2: {
    id: 'm2',
    name: 'M2 CNC Milling Machine',
    type: '5-Axis Vertical Machining Center',
    allowedFluids: ['coolant'],
    description: 'High-speed spindle and flood coolant recirculation with water-glycol emulsion.',
    color: '#ea580c',
    sensorTypes: ['electrodes']
  },
  m3: {
    id: 'm3',
    name: 'M3 Lathe',
    type: 'Slant-Bed CNC Turning Center',
    allowedFluids: ['coolant', 'oil'],
    description: 'Dual-fluid chuck spindle and slideway lubing: emulsion coolant and ISO VG 68 slideway oil.',
    color: '#059669',
    sensorTypes: ['electrodes', 'ir_reflector']
  },
  m4: {
    id: 'm4',
    name: 'M4 Hydraulic Power Unit',
    type: 'Auxiliary HPU Station (30 kW)',
    allowedFluids: ['oil'],
    description: 'Continuous pump skid, hydraulic reservoir and bladder accumulator valve package.',
    color: '#d97706',
    sensorTypes: ['ir_reflector', 'capacitive']
  }
};

export const MACHINE_COORDINATES: Record<MachineId, { x: number; z: number; name: string }> = {
  m1: { x: -7.5, z: -4.0, name: 'M1 Hydraulic Press' },
  m2: { x: 7.5, z: -4.0, name: 'M2 CNC Milling Machine' },
  m3: { x: -7.5, z: 5.5, name: 'M3 Lathe' },
  m4: { x: 7.5, z: 5.5, name: 'M4 Hydraulic Power Unit' }
};

export const GATEWAY_COORDINATES = { x: 0, y: 5.2, z: -13.8 };
export const CONTROL_ROOM_COORDINATES = { x: 0, y: 4.5, z: 14.5 };

export const PAD_DISTANCES = [0.45, 0.90, 1.35];

/**
 * Calculates physical puddle radius in 3D units based on fluid viscosity
 */
export function calculatePuddleRadius(fluidType: FluidType | 'none', puddleVolumeMl: number): number {
  if (puddleVolumeMl <= 0 || fluidType === 'none') return 0;
  if (fluidType === 'coolant') {
    return Math.min(Math.sqrt(puddleVolumeMl * 0.16) * 0.85 + 0.12, 1.45);
  }
  return Math.min(Math.sqrt(puddleVolumeMl * 0.085) * 0.75 + 0.08, 1.35);
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
 * Pure evaluation of a single zone's sensors for a machine
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

  // Sensor geometry location relative to zone center is ~0.56 units away
  const sensorReached = isThisZoneLeaking && puddleRadius >= 0.52;
  const electrodesTriggered = activeFluid === 'coolant' && (sensorReached || puddleVolumeMl >= 1.6);
  const irSensorTriggered = activeFluid === 'oil' && (sensorReached || puddleVolumeMl >= 1.4);
  const hasAlert = electrodesTriggered || irSensorTriggered || padsGlow[0];

  const machineCfg = MACHINES_CONFIG[machineId];
  const isElectrodes = machineCfg.sensorTypes.includes('electrodes') && activeFluid !== 'oil';
  const sensorSignalType: 'electrodes' | 'ir_reflector' = isElectrodes ? 'electrodes' : 'ir_reflector';
  const sensorThreshold = isElectrodes ? 500 : 35;
  const signalUnit = isElectrodes ? 'µS/cm' : '%';
  const sensorSignal = isElectrodes ? conductivity : reflectance;

  // Calculate milestones
  let liquidReachedTime: number | null = null;
  let thresholdCrossedTime: number | null = null;
  let confirmedTime: number | null = null;
  let detectionTimeSeconds: number | null = null;

  if (isThisZoneLeaking && leakStartTime) {
    const elapsed = Math.max((Date.now() - leakStartTime) / 1000, 0.1);
    if (sensorReached || hasAlert) {
      liquidReachedTime = Math.min(Number((elapsed * 0.65).toFixed(1)), 1.2);
      thresholdCrossedTime = Number((liquidReachedTime + 0.3).toFixed(1));
      confirmedTime = Number((thresholdCrossedTime + 0.3).toFixed(1));
      detectionTimeSeconds = confirmedTime;
    }
  }

  // Generate illustrative signal curve for the live line chart
  const signalHistory: { time: number; value: number }[] = [];
  const maxT = liquidReachedTime ? Math.max(3.5, liquidReachedTime + 1.5) : 3.5;
  const steps = 14;
  for (let i = 0; i <= steps; i++) {
    const t = Number(((i / steps) * maxT).toFixed(1));
    if (isElectrodes) {
      if (!liquidReachedTime || t < liquidReachedTime) {
        signalHistory.push({ time: t, value: 2.2 + Math.sin(t * 3) * 0.8 });
      } else if (t < (thresholdCrossedTime || liquidReachedTime + 0.3)) {
        signalHistory.push({ time: t, value: 360 + Math.random() * 40 });
      } else {
        signalHistory.push({ time: t, value: 720 + Math.sin(t * 2) * 25 });
      }
    } else {
      if (!liquidReachedTime || t < liquidReachedTime) {
        signalHistory.push({ time: t, value: 98.2 - Math.sin(t * 2) * 0.6 });
      } else if (t < (thresholdCrossedTime || liquidReachedTime + 0.3)) {
        signalHistory.push({ time: t, value: 48 - Math.random() * 6 });
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

/**
 * Derives independent ESP32 node state for a specific machine
 */
export function deriveMachineNodeState(
  machineId: MachineId,
  z1: ZoneTelemetry,
  z2: ZoneTelemetry
): MachineNodeState {
  const getLed = (tel: ZoneTelemetry): 'green' | 'red' | 'amber' => {
    if (tel.status === 'alert') {
      return tel.activeFluid === 'oil' ? 'amber' : 'red';
    }
    return 'green';
  };

  const hasAlert = z1.status === 'alert' || z2.status === 'alert';

  return {
    machineId,
    wifiConnected: true,
    mqttConnected: true,
    buzzerActive: hasAlert,
    beaconStatus: hasAlert ? 'red_flash' : 'green',
    leds: {
      z1: getLed(z1),
      z2: getLed(z2)
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
 * Leak speed configurations
 */
export function getLeakSpeedConfig(speed: LeakSpeed): { dropsPerSec: number; volIncrementPerSec: number; streamFlow: boolean } {
  switch (speed) {
    case 'flood':
      return { dropsPerSec: 14, volIncrementPerSec: 2.8, streamFlow: true };
    case 'seep':
      return { dropsPerSec: 3.2, volIncrementPerSec: 0.72, streamFlow: false };
    case 'drip':
    default:
      return { dropsPerSec: 1.5, volIncrementPerSec: 0.32, streamFlow: false };
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
