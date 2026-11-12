import test from 'node:test';
import assert from 'node:assert/strict';
import { GUIDED_TOUR_STEPS } from './guidedTour';
import { getLeakSpeedConfig, calculatePuddleRadius } from './iotLogic';

test('GUIDED_TOUR_STEPS contains exactly 7 sequential stages', () => {
  assert.equal(GUIDED_TOUR_STEPS.length, 7);
  const expectedStages = [
    'Machine Identification',
    'Leakage Point',
    'Liquid Dripping',
    'Probe Contact',
    'Signal Transmission',
    'Controller Activation',
    'Final Detection Result'
  ];

  GUIDED_TOUR_STEPS.forEach((step, idx) => {
    assert.equal(step.stepIndex, idx + 1);
    assert.equal(step.stageName, expectedStages[idx]);
    assert.ok(step.durationSeconds >= 18, `Stage ${idx + 1} duration should be at least 18s`);
  });
});

test('Total demo duration is between 142.5s and 190s', () => {
  const totalDuration = GUIDED_TOUR_STEPS.reduce((sum, s) => sum + s.durationSeconds, 0);
  assert.ok(totalDuration >= 142.5 && totalDuration <= 190, `Total duration ${totalDuration}s is between 1.5x and 2x slower`);
});

test('getLeakSpeedConfig provides slowed down realistic rates', () => {
  const drip = getLeakSpeedConfig('drip');
  assert.equal(drip.dropsPerSec, 1.5);
  assert.equal(drip.volIncrementPerSec, 0.32);

  const seep = getLeakSpeedConfig('seep');
  assert.equal(seep.dropsPerSec, 3.2);
  assert.equal(seep.volIncrementPerSec, 0.72);
});

test('calculatePuddleRadius smoothly grows with fluid volume without artificial threshold jumps', () => {
  const r0 = calculatePuddleRadius('coolant', 0);
  const r1 = calculatePuddleRadius('coolant', 1.0);
  const r2 = calculatePuddleRadius('coolant', 2.5);

  assert.equal(r0, 0);
  assert.ok(r1 > 0.4 && r1 < 0.6);
  assert.ok(r2 > r1);
});
