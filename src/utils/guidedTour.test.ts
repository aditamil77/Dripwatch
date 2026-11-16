import test from 'node:test';
import assert from 'node:assert/strict';
import { GUIDED_TOUR_STEPS, formatTourStepDisplay } from './guidedTour';
import { getLeakSpeedConfig, calculatePuddleRadius } from './iotLogic';
import { MachineId } from '../types/dripwatch';

test('GUIDED_TOUR_STEPS contains exactly 6 sequential camera views matching specification', () => {
  assert.equal(GUIDED_TOUR_STEPS.length, 6);
  const expectedStages = [
    'View 1 – Machine Overview',
    'View 2 – Leakage Generation',
    'View 3 – Electrode Detection',
    'View 4 – Local Signal Processing',
    'View 5 – General Compartment Transmission',
    'View 6 – Final Detection'
  ];

  GUIDED_TOUR_STEPS.forEach((step, idx) => {
    assert.equal(step.stepIndex, idx + 1);
    assert.equal(step.stageName, expectedStages[idx]);
    assert.ok(step.durationSeconds >= 5, `View ${idx + 1} duration should allow clear observation`);
  });
});

test('formatTourStepDisplay adapts titles and captions dynamically for any selected machine and fluid', () => {
  (['m1', 'm2', 'm3', 'm4'] as MachineId[]).forEach(mId => {
    const step1 = formatTourStepDisplay(GUIDED_TOUR_STEPS[0], mId, 'oil');
    assert.ok(step1.title.includes(mId.replace('m', 'Machine 0')));

    const step3Oil = formatTourStepDisplay(GUIDED_TOUR_STEPS[2], mId, 'oil');
    assert.ok(step3Oil.caption.includes('OIL ELECTRODE'));

    const step6Cool = formatTourStepDisplay(GUIDED_TOUR_STEPS[5], mId, 'coolant');
    assert.ok(step6Cool.title.includes('COOLANT'));
    assert.ok(step6Cool.caption.includes(mId.toUpperCase()));
  });
});

test('getLeakSpeedConfig provides Light Flow (~1 drop/sec) and Heavy Flow droplet rates without solid stream', () => {
  const light = getLeakSpeedConfig('light_flow');
  assert.equal(light.dropsPerSec, 1.0);
  assert.equal(light.volIncrementPerSec, 0.30);
  assert.equal(light.streamFlow, false);

  const heavy = getLeakSpeedConfig('heavy_flow');
  assert.ok(heavy.dropsPerSec >= 4.0, 'Heavy Flow generates closely spaced droplets');
  assert.ok(heavy.volIncrementPerSec > light.volIncrementPerSec * 3, 'Heavy Flow fills tray significantly faster');
  assert.equal(heavy.streamFlow, false, 'Heavy Flow remains individual droplets, never a solid stream');
});

test('calculatePuddleRadius smoothly grows with fluid volume without artificial threshold jumps', () => {
  const r0 = calculatePuddleRadius('coolant', 0);
  const r1 = calculatePuddleRadius('coolant', 1.0);
  const r2 = calculatePuddleRadius('coolant', 2.5);

  assert.equal(r0, 0);
  assert.ok(r1 > 0.4 && r1 < 0.6);
  assert.ok(r2 > r1);
});
