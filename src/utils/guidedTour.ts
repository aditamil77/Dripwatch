import { FluidType, MachineId } from '../types/dripwatch';

export interface TourStep {
  stepIndex: number;
  stageName: string;
  title: string;
  durationSeconds: number;
  caption: string;
  cameraView:
    | 'view1_overview'
    | 'view2_leakage_generation'
    | 'view3_electrode_detection'
    | 'view4_node_processing'
    | 'view5_compartment_transmission'
    | 'view6_final_detection';
  action:
    | 'machine_overview'
    | 'leakage_generation'
    | 'electrode_detection'
    | 'node_processing'
    | 'compartment_transmission'
    | 'final_detection';
}

export const GUIDED_TOUR_STEPS: TourStep[] = [
  {
    stepIndex: 1,
    stageName: 'View 1 – Machine Overview',
    title: 'View 1/6: Machine Overview',
    durationSeconds: 5,
    caption: 'Complete view of the selected machine, unobstructed leakage outlet, collection tray, Oil & Coolant electrodes, local Node/CPU Box, and the General Compartment Box.',
    cameraView: 'view1_overview',
    action: 'machine_overview'
  },
  {
    stepIndex: 2,
    stageName: 'View 2 – Leakage Generation',
    title: 'View 2/6: Drop-by-Drop Leakage Generation',
    durationSeconds: 5,
    caption: 'Close-up of the exposed leakage outlet showing individual liquid droplets forming, swelling, detaching naturally, and falling into the collection tray.',
    cameraView: 'view2_leakage_generation',
    action: 'leakage_generation'
  },
  {
    stepIndex: 3,
    stageName: 'View 3 – Electrode Detection',
    title: 'View 3/6: Physical Electrode Contact',
    durationSeconds: 6,
    caption: 'View of the collection tray and both conductive rods (OIL ELECTRODE & COOLANT ELECTRODE). Spreading liquid physically reaches and activates ONLY the corresponding electrode.',
    cameraView: 'view3_electrode_detection',
    action: 'electrode_detection'
  },
  {
    stepIndex: 4,
    stageName: 'View 4 – Local Signal Processing',
    title: 'View 4/6: Node/CPU Box Local Processing',
    durationSeconds: 5,
    caption: 'Close-up of the dedicated connecting wire and local Node/CPU Box. Electrical signal arrives and the status indicator transitions from NORMAL to PROCESSING and then LEAK DETECTED.',
    cameraView: 'view4_node_processing',
    action: 'node_processing'
  },
  {
    stepIndex: 5,
    stageName: 'View 5 – General Compartment Transmission',
    title: 'View 5/6: Transmission to General Compartment Box',
    durationSeconds: 5,
    caption: 'Framing the Node/CPU Box and central General Compartment Box. The processed leak detection signal travels visibly along the communication link.',
    cameraView: 'view5_compartment_transmission',
    action: 'compartment_transmission'
  },
  {
    stepIndex: 6,
    stageName: 'View 6 – Final Detection',
    title: 'View 6/6: Final Leak Detection Alert',
    durationSeconds: 7,
    caption: 'The General Compartment Box receives the transmitted signal and displays the final leak alert with Machine Number and Leakage Type.',
    cameraView: 'view6_final_detection',
    action: 'final_detection'
  }
];

export function formatTourStepDisplay(
  step: TourStep,
  machineId: MachineId,
  fluidType: FluidType
): { title: string; caption: string } {
  const mNum = machineId.replace('m', 'Machine 0');
  const mCode = machineId.toUpperCase();
  const fluidLabel = fluidType === 'oil' ? 'Oil' : 'Coolant';
  const rodLabel = fluidType === 'oil' ? 'OIL ELECTRODE' : 'COOLANT ELECTRODE';

  switch (step.action) {
    case 'machine_overview':
      return {
        title: `View 1/6: ${mNum} Overview`,
        caption: `Overview of ${mNum} (${mCode}) showing its open collection tray, Oil & Coolant electrodes, local Node/CPU Box, and the central General Compartment Box.`
      };
    case 'leakage_generation':
      return {
        title: `View 2/6: ${mCode} ${fluidLabel} Leakage Generation`,
        caption: `Close-up on the ${mCode} leakage outlet: ${fluidLabel.toLowerCase()} droplets visibly form, swell, detach one-by-one, and fall into the collection tray.`
      };
    case 'electrode_detection':
      return {
        title: `View 3/6: ${mCode} Physical Electrode Detection`,
        caption: `Accumulating ${fluidLabel.toLowerCase()} spreads across the tray and physically contacts ONLY the ${rodLabel}, while the opposite rod remains inactive.`
      };
    case 'node_processing':
      return {
        title: `View 4/6: ${mCode} Node/CPU Local Processing`,
        caption: `Signal travels along the ${fluidLabel.toLowerCase()} electrode wire into ${mCode}'s Node/CPU Box, transitioning from NORMAL to PROCESSING to LEAK DETECTED.`
      };
    case 'compartment_transmission':
      return {
        title: `View 5/6: ${mCode} to General Compartment Link`,
        caption: `Processed ${fluidLabel.toLowerCase()} leak signal transmits along the communication link from Node/CPU Box ${mCode} to the central General Compartment Box.`
      };
    case 'final_detection':
    default:
      return {
        title: `View 6/6: Final Detection – ${mNum} ${fluidLabel.toUpperCase()}`,
        caption: `General Compartment Box receives the signal and raises the final plant alert: ${mNum} (${mCode}) – ${fluidLabel.toUpperCase()} LEAK DETECTED.`
      };
  }
}
