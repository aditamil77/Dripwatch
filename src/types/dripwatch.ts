export type MachineId = 'm1' | 'm2' | 'm3' | 'm4';

export type ZoneId = 'z1' | 'z2';

export type MachineZoneId = `${MachineId}-${ZoneId}`;

export type FluidType = 'coolant' | 'oil';

export type LeakSpeed = 'drip' | 'seep' | 'flood';

export type RenderQuality = 'high' | 'medium' | 'low';

export type IncidentStatus = 'detected' | 'acknowledged' | 'assigned' | 'closed';

export type SeverityRating = 'Flood' | 'Seep' | 'Drip' | 'None';

export interface MachineConfig {
  id: MachineId;
  name: string;
  type: string;
  allowedFluids: FluidType[];
  description: string;
  color: string;
  sensorTypes: ('electrodes' | 'ir_reflector' | 'capacitive')[];
}

export interface ZoneTelemetry {
  machineId: MachineId;
  zoneId: ZoneId;
  fullZoneId: MachineZoneId;
  label: string;
  status: 'normal' | 'alert';
  coolantConductivity: number; // in µS/cm (0 = dry, > 500 = coolant contact)
  oilReflectance: number;     // in % (100% = clear, < 35% = oil film detected)
  puddleVolumeMl: number;
  puddleRadius: number;       // in 3D units
  activeFluid: FluidType | 'none';
  electrodesTriggered: boolean;
  irSensorTriggered: boolean;
  padsGlow: [boolean, boolean, boolean]; // Whether pad 1, 2, 3 in this zone has been reached by fluid
  sensorSignal: number;
  sensorThreshold: number;
  signalUnit: string;
  sensorSignalType: 'electrodes' | 'ir_reflector';
  liquidReachedTime: number | null;
  thresholdCrossedTime: number | null;
  confirmedTime: number | null;
  detectionTimeSeconds: number | null;
  signalHistory: { time: number; value: number }[];
}

export interface MachineNodeState {
  machineId: MachineId;
  wifiConnected: boolean;
  mqttConnected: boolean;
  buzzerActive: boolean;
  beaconStatus: 'green' | 'red_flash';
  leds: {
    z1: 'green' | 'red' | 'amber';
    z2: 'green' | 'red' | 'amber';
  };
}

export interface IncidentRecord {
  id: string;
  machineId: MachineId;
  zoneId: ZoneId;
  fullZoneId: MachineZoneId;
  fluid: FluidType;
  severity: SeverityRating;
  status: IncidentStatus;
  detectedAt: number;          // timestamp in ms
  acknowledgedAt: number | null;
  assignedAt: number | null;
  assignedTo: string | null;
  closedAt: number | null;
  responseTimeSeconds: number | null; // detectedAt to acknowledgedAt
  closureTimeSeconds: number | null;  // detectedAt to closedAt
  isEscalated: boolean;        // true if unacknowledged > 20 seconds
}

export interface MachineLeakState {
  machineId: MachineId;
  activeZone: ZoneId | 'none';
  fluidType: FluidType;
  leakSpeed: LeakSpeed;
  isLeaking: boolean;
  leakStartTime: number | null;
  pad1Time: number | null;
  pad3Time: number | null;
  puddles: {
    z1: number;
    z2: number;
  };
}


export interface TechnicalViews {
  xrayMachine: boolean;
  openController: boolean;
  signalPaths: boolean;
  insideSensor: boolean;
}

export type TimelineStepId = 'leak_start' | 'pad_wet' | 'esp32_confirmed' | 'mqtt_sent' | 'dashboard_alert';

export interface TimelineEvent {
  id: TimelineStepId;
  title: string;
  description: string;
  timeSeconds: number | null;
  isCompleted: boolean;
}
