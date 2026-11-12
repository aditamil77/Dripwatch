export interface TourStep {
  stepIndex: number;
  stageName: string;
  title: string;
  durationSeconds: number;
  caption: string;
  focusMachine: 'm1' | 'm2' | 'm3' | 'm4' | 'all';
  cameraView: 'step1_machine' | 'step2_outlet' | 'step3_dripping' | 'step4_probe' | 'step5_signal' | 'step6_controller' | 'step7_final';
  action: 
    | 'introduce_machine' 
    | 'show_outlet' 
    | 'drip_liquid' 
    | 'probe_contact' 
    | 'signal_transmit' 
    | 'controller_active' 
    | 'alert_display';
}

export const GUIDED_TOUR_STEPS: TourStep[] = [
  {
    stepIndex: 1,
    stageName: 'Machine Identification',
    title: 'Step 1/7: Machine Identification',
    durationSeconds: 18,
    caption: 'Overview of the M2 CNC Vertical Machining Center. The work cell features an isolated perimeter containment tray, dual redundant sensor probes, and an autonomous ESP32 controller node.',
    focusMachine: 'm2',
    cameraView: 'step1_machine',
    action: 'introduce_machine'
  },
  {
    stepIndex: 2,
    stageName: 'Leakage Point',
    title: 'Step 2/7: Leakage Point Outlet',
    durationSeconds: 18,
    caption: 'Close-up of the coolant recirculation manifold fitting on M2 Zone 1. Simulated seal degradation initiates fluid release at the fitting collar.',
    focusMachine: 'm2',
    cameraView: 'step2_outlet',
    action: 'show_outlet'
  },
  {
    stepIndex: 3,
    stageName: 'Liquid Dripping',
    title: 'Step 3/7: Slow Liquid Dripping & Droplet Formation',
    durationSeconds: 22,
    caption: 'Coolant droplets swell at the nozzle fitting, stretch into realistic teardrops, detach, and accelerate downward under physical gravity into the tray basin.',
    focusMachine: 'm2',
    cameraView: 'step3_dripping',
    action: 'drip_liquid'
  },
  {
    stepIndex: 4,
    stageName: 'Probe Contact',
    title: 'Step 4/7: Physical Probe Contact & Impedance Drop',
    durationSeconds: 24,
    caption: 'The spreading coolant puddle reaches the dual copper electrode pins. AC excitation detects immediate electrical bridging, highlighting ONLY the touched coolant probe.',
    focusMachine: 'm2',
    cameraView: 'step4_probe',
    action: 'probe_contact'
  },
  {
    stepIndex: 5,
    stageName: 'Signal Transmission',
    title: 'Step 5/7: Electrical Signal Transmission via Conduit',
    durationSeconds: 20,
    caption: 'Electrical micro-current signals travel along the sealed conduit wire from the active probe directly into the machine controller node.',
    focusMachine: 'm2',
    cameraView: 'step5_signal',
    action: 'signal_transmit'
  },
  {
    stepIndex: 6,
    stageName: 'Controller Activation',
    title: 'Step 6/7: Controller Node Activation & Status Transition',
    durationSeconds: 20,
    caption: 'Controller Node M2 validates consecutive ADC samples to reject spurious vibration noise. The Zone 1 status indicator transitions immediately from NORMAL to ALERT.',
    focusMachine: 'm2',
    cameraView: 'step6_controller',
    action: 'controller_active'
  },
  {
    stepIndex: 7,
    stageName: 'Final Detection Result',
    title: 'Step 7/7: Final Detection Result & Plant Alert',
    durationSeconds: 24,
    caption: 'Andon beacon pulses red and wireless MQTT telemetry latches the incident with the zone-specific banner: COOLANT LEAK DETECTED. Adjacent machine cells remain fully nominal.',
    focusMachine: 'm2',
    cameraView: 'step7_final',
    action: 'alert_display'
  }
];
