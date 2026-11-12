import { SeverityRating, TimelineEvent, TimelineStepId } from '../types/dripwatch';

/**
 * Rates severity based on elapsed time between capillary pad 1 and pad 3 contact:
 * Under 1.0 second: Flood
 * Under 3.0 seconds: Seep
 * Otherwise: Drip
 */
export function calculateSeverityRating(
  pad1TimeSeconds: number | null,
  pad3TimeSeconds: number | null,
  isLeaking: boolean
): SeverityRating {
  if (!isLeaking && pad1TimeSeconds === null) {
    return 'None';
  }

  if (pad1TimeSeconds !== null && pad3TimeSeconds !== null) {
    const delta = pad3TimeSeconds - pad1TimeSeconds;
    if (delta < 1.0) {
      return 'Flood';
    } else if (delta < 3.0) {
      return 'Seep';
    } else {
      return 'Drip';
    }
  }

  return isLeaking ? 'Drip' : 'None';
}

/**
 * Initializes clean timeline events for a machine detection set
 */
export function createInitialTimeline(): TimelineEvent[] {
  return [
    {
      id: 'leak_start',
      title: 'Leak starts',
      description: 'Hose fitting discharges fluid above tray zone.',
      timeSeconds: null,
      isCompleted: false,
    },
    {
      id: 'pad_wet',
      title: 'Sensor pad wet',
      description: 'Fluid spreads and makes contact with capillary spread pad.',
      timeSeconds: null,
      isCompleted: false,
    },
    {
      id: 'esp32_confirmed',
      title: 'ESP32 confirms 3 samples & tags zone',
      description: 'Node ADC confirms 3 successive threshold samples & isolates zone.',
      timeSeconds: null,
      isCompleted: false,
    },
    {
      id: 'mqtt_sent',
      title: 'MQTT sent to Gateway',
      description: 'Encrypted telemetry packet transmitted wirelessly to plant gateway.',
      timeSeconds: null,
      isCompleted: false,
    },
    {
      id: 'dashboard_alert',
      title: 'Gateway alert latched',
      description: 'Plant gateway registers telemetry packet and latches zone incident.',
      timeSeconds: null,
      isCompleted: false,
    },
  ];
}

/**
 * Formats time in seconds as e.g. "+0.84s" or "--"
 */
export function formatElapsedSeconds(seconds: number | null): string {
  if (seconds === null) return '--';
  return `+${seconds.toFixed(2)}s`;
}
