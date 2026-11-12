import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculatePuddleRadius,
  calculateConductivity,
  calculateIrReflectance,
  evaluateZone,
  deriveMachineNodeState,
  checkIncidentEscalation
} from './iotLogic';
import { IncidentRecord } from '../types/dripwatch';

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

test('evaluateZone triggers sensor alarms when fluid spreads', () => {
  const dryZone = evaluateZone('m2', 'z1', false, 'coolant', 0);
  assert.equal(dryZone.status, 'normal');
  assert.equal(dryZone.electrodesTriggered, false);

  const leakZone = evaluateZone('m2', 'z1', true, 'coolant', 6.0);
  assert.equal(leakZone.status, 'alert');
  assert.equal(leakZone.electrodesTriggered, true);
  assert.equal(leakZone.padsGlow[0], true);
});

test('deriveMachineNodeState sets beacon and leds correctly', () => {
  const dryZ1 = evaluateZone('m2', 'z1', false, 'coolant', 0);
  const dryZ2 = evaluateZone('m2', 'z2', false, 'coolant', 0);
  const normalNode = deriveMachineNodeState('m2', dryZ1, dryZ2);
  assert.equal(normalNode.beaconStatus, 'green');
  assert.equal(normalNode.buzzerActive, false);
  assert.equal(normalNode.leds.z1, 'green');

  const alertZ1 = evaluateZone('m2', 'z1', true, 'coolant', 6.0);
  const alertNode = deriveMachineNodeState('m2', alertZ1, dryZ2);
  assert.equal(alertNode.beaconStatus, 'red_flash');
  assert.equal(alertNode.buzzerActive, true);
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
    detectedAt: now - 5000, // 5s ago
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
    detectedAt: now - 22000 // 22s ago (> 20s)
  };
  assert.equal(checkIncidentEscalation(oldInc, now), true);
});
