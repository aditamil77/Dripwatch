import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculatePuddleRadius,
  calculateConductivity,
  calculateIrReflectance,
  evaluateZone,
  evaluateNodePipeline,
  deriveMachineNodeState,
  checkIncidentEscalation,
  ELECTRODE_CONTACT_RADIUS,
  PIPELINE_TIMINGS
} from './iotLogic';
import { IncidentRecord, MachineId } from '../types/dripwatch';

test('calculatePuddleRadius calculates realistic puddle spread', () => {
  assert.equal(calculatePuddleRadius('none', 0), 0);
  assert.equal(calculatePuddleRadius('coolant', 0), 0);
  const coolantRadius = calculatePuddleRadius('coolant', 2.0);
  const oilRadius = calculatePuddleRadius('oil', 2.0);
  assert.ok(coolantRadius > 0.5, 'Coolant spreads fast');
  assert.ok(coolantRadius > oilRadius, 'Coolant spread is wider than oil');
  assert.ok(coolantRadius <= 1.45, 'Coolant radius strictly clamped inside tray');
});

test('calculateConductivity differentiates coolant and dry states', () => {
  const dryCond = calculateConductivity('coolant', 0);
  const wetCond = calculateConductivity('coolant', 5.0);
  assert.ok(dryCond < 10, 'Dry conductivity is low');
  assert.ok(wetCond > 500, 'Wet coolant conductivity > 500 µS/cm');
});

test('calculateIrReflectance drops when oil film forms', () => {
  const clearReflect = calculateIrReflectance('oil', 0);
  const oilReflect = calculateIrReflectance('oil', 10.0);
  assert.ok(clearReflect > 90, 'Clear surface reflection is high');
  assert.ok(oilReflect < 60, 'Oil film significantly reduces IR reflection');
});

test('All 4 machines independently distinguish Oil vs Coolant electrodes only after physical contact', () => {
  (['m1', 'm2', 'm3', 'm4'] as MachineId[]).forEach(mId => {
    // Before contact (tiny puddle < ELECTRODE_CONTACT_RADIUS): neither electrode activates
    const preOil = evaluateZone(mId, 'z1', true, 'oil', 0.2);
    assert.ok(preOil.puddleRadius < ELECTRODE_CONTACT_RADIUS);
    assert.equal(preOil.irSensorTriggered, false, `${mId} oil pre-contact should not trigger`);
    assert.equal(preOil.electrodesTriggered, false, `${mId} coolant electrode stays off for oil`);
    assert.equal(preOil.status, 'normal');

    // After Oil reaches contact radius: ONLY Oil electrode activates
    const oilContact = evaluateZone(mId, 'z1', true, 'oil', 4.0);
    assert.ok(oilContact.puddleRadius >= ELECTRODE_CONTACT_RADIUS);
    assert.equal(oilContact.irSensorTriggered, true, `${mId} oil electrode activates on oil contact`);
    assert.equal(oilContact.electrodesTriggered, false, `${mId} coolant electrode stays inactive during oil leak`);
    assert.equal(oilContact.status, 'alert');

    // After Coolant reaches contact radius: ONLY Coolant electrode activates
    const coolantContact = evaluateZone(mId, 'z1', true, 'coolant', 3.0);
    assert.ok(coolantContact.puddleRadius >= ELECTRODE_CONTACT_RADIUS);
    assert.equal(coolantContact.electrodesTriggered, true, `${mId} coolant electrode activates on coolant contact`);
    assert.equal(coolantContact.irSensorTriggered, false, `${mId} oil electrode stays inactive during coolant leak`);
    assert.equal(coolantContact.status, 'alert');
  });
});

test('evaluateNodePipeline progresses NORMAL -> PROCESSING -> LEAK DETECTED -> General Compartment alert strictly from contactTime', () => {
  const contactTime = 10_000;

  // 1. Before contact
  const idle = evaluateNodePipeline(null, null, contactTime);
  assert.equal(idle.pipelineStage, 'normal');
  assert.equal(idle.nodeDisplayStatus, 'NORMAL');
  assert.equal(idle.compartmentAlertActive, false);

  // 2. Wire signal phase (0.5s after contact)
  const wirePhase = evaluateNodePipeline('oil', contactTime, contactTime + 500);
  assert.equal(wirePhase.pipelineStage, 'wire_signal');
  assert.equal(wirePhase.nodeDisplayStatus, 'NORMAL');
  assert.ok(wirePhase.wireSignalProgress > 0 && wirePhase.wireSignalProgress < 1);
  assert.equal(wirePhase.compartmentLinkProgress, 0);
  assert.equal(wirePhase.compartmentAlertActive, false);

  // 3. Node/CPU PROCESSING phase (after wire arrives)
  const procTime = contactTime + (PIPELINE_TIMINGS.WIRE_DURATION_S + 0.4) * 1000;
  const procPhase = evaluateNodePipeline('oil', contactTime, procTime);
  assert.equal(procPhase.pipelineStage, 'processing');
  assert.equal(procPhase.nodeDisplayStatus, 'PROCESSING');
  assert.equal(procPhase.detectedFluid, 'oil');
  assert.equal(procPhase.compartmentLinkProgress, 0);
  assert.equal(procPhase.compartmentAlertActive, false);

  // 4. Transmitting to General Compartment Box (Node shows LEAK DETECTED, link moving, Compartment alert NOT active yet!)
  const txTime =
    contactTime +
    (PIPELINE_TIMINGS.WIRE_DURATION_S +
      PIPELINE_TIMINGS.PROCESSING_DURATION_S +
      PIPELINE_TIMINGS.NODE_DETECTED_PAUSE_S +
      0.6) *
      1000;
  const txPhase = evaluateNodePipeline('coolant', contactTime, txTime);
  assert.equal(txPhase.pipelineStage, 'transmitting');
  assert.equal(txPhase.nodeDisplayStatus, 'LEAK DETECTED');
  assert.equal(txPhase.detectedFluid, 'coolant');
  assert.ok(txPhase.compartmentLinkProgress > 0 && txPhase.compartmentLinkProgress < 1);
  assert.equal(txPhase.compartmentAlertActive, false, 'General Compartment Box must NOT show alert until link signal arrives');

  // 5. Signal arrived at General Compartment Box
  const arrivedTime = contactTime + 5000;
  const finalPhase = evaluateNodePipeline('coolant', contactTime, arrivedTime);
  assert.equal(finalPhase.pipelineStage, 'compartment_alert');
  assert.equal(finalPhase.nodeDisplayStatus, 'LEAK DETECTED');
  assert.equal(finalPhase.compartmentLinkProgress, 1);
  assert.equal(finalPhase.compartmentAlertActive, true);

  // 6. Scaled timing (Guided Demo 3.8x) delays processing & compartment alert cleanly
  const scaledWire = evaluateNodePipeline('oil', contactTime, contactTime + 2000, 3.8);
  assert.equal(scaledWire.pipelineStage, 'wire_signal');
  assert.equal(scaledWire.nodeDisplayStatus, 'NORMAL');

  const scaledProc = evaluateNodePipeline('oil', contactTime, contactTime + 5000, 3.8);
  assert.equal(scaledProc.pipelineStage, 'processing');
  assert.equal(scaledProc.nodeDisplayStatus, 'PROCESSING');
});

test('deriveMachineNodeState sets beacon, display status, and leds correctly', () => {
  const dryZ1 = evaluateZone('m3', 'z1', false, 'coolant', 0);
  const dryZ2 = evaluateZone('m3', 'z2', false, 'coolant', 0);
  const normalNode = deriveMachineNodeState('m3', dryZ1, dryZ2, null);
  assert.equal(normalNode.beaconStatus, 'green');
  assert.equal(normalNode.buzzerActive, false);
  assert.equal(normalNode.nodeDisplayStatus, 'NORMAL');
  assert.equal(normalNode.leds.z1, 'green');

  const alertZ1 = evaluateZone('m3', 'z1', true, 'coolant', 6.0);
  const alertNode = deriveMachineNodeState('m3', alertZ1, dryZ2, 1000, 6000);
  assert.equal(alertNode.beaconStatus, 'red_flash');
  assert.equal(alertNode.buzzerActive, true);
  assert.equal(alertNode.nodeDisplayStatus, 'LEAK DETECTED');
  assert.equal(alertNode.compartmentAlertActive, true);
  assert.equal(alertNode.leds.z1, 'red');
});

test('checkIncidentEscalation detects SLA breach after 20 seconds', () => {
  const now = Date.now();
  const freshInc: IncidentRecord = {
    id: 'inc-1',
    machineId: 'm2',
    zoneId: 'z1',
    fullZoneId: 'm2-z1',
    fluid: 'coolant',
    severity: 'Seep',
    status: 'detected',
    detectedAt: now - 5000,
    acknowledgedAt: null,
    assignedAt: null,
    assignedTo: null,
    closedAt: null,
    responseTimeSeconds: null,
    closureTimeSeconds: null,
    isEscalated: false
  };
  assert.equal(checkIncidentEscalation(freshInc, now), false);

  const oldInc: IncidentRecord = {
    ...freshInc,
    detectedAt: now - 22000
  };
  assert.equal(checkIncidentEscalation(oldInc, now), true);
});
