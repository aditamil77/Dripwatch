import test from 'node:test';
import assert from 'node:assert/strict';
import { GUIDED_TOUR_STEPS, GUIDED_TOUR_MACHINE, GUIDED_TOUR_FLUID, formatTourStepDisplay } from './guidedTour';
import { getLeakSpeedConfig, calculatePuddleRadius, MACHINE_COORDINATES, GATEWAY_COORDINATES } from './iotLogic';
import { INDUSTRIAL_WORKER_SPECS } from '../three/industrialWorkers';
import { MachineId } from '../types/dripwatch';

test('GUIDED_TOUR_MACHINE is locked exclusively to M1 and GUIDED_TOUR_FLUID to oil', () => {
  assert.equal(GUIDED_TOUR_MACHINE, 'm1');
  assert.equal(GUIDED_TOUR_FLUID, 'oil');
});

test('GUIDED_TOUR_STEPS contains exactly 6 sequential camera views with slower observation durations', () => {
  assert.equal(GUIDED_TOUR_STEPS.length, 6);
  const expectedStages = [
    'View 1 – Machine Overview',
    'View 2 – Leakage Generation',
    'View 3 – Electrode Detection',
    'View 4 – Local Signal Processing',
    'View 5 – General Compartment Transmission',
    'View 6 – Final Detection'
  ];

  let totalDuration = 0;
  GUIDED_TOUR_STEPS.forEach((step, idx) => {
    assert.equal(step.stepIndex, idx + 1);
    assert.equal(step.stageName, expectedStages[idx]);
    assert.ok(step.durationSeconds >= 9, `View ${idx + 1} duration (${step.durationSeconds}s) should be slowed to >= 9s`);
    totalDuration += step.durationSeconds;
  });
  assert.ok(totalDuration >= 60, `Total guided simulation duration (${totalDuration}s) should allow calm observation`);
});

test('INDUSTRIAL_WORKER_SPECS distributes workers across distinct floor areas with unique poses and full equipment clearance', () => {
  assert.ok(INDUSTRIAL_WORKER_SPECS.length >= 4 && INDUSTRIAL_WORKER_SPECS.length <= 6);

  // Every worker has a distinct natural pose
  const poses = new Set(INDUSTRIAL_WORKER_SPECS.map((w) => w.pose));
  assert.equal(poses.size, INDUSTRIAL_WORKER_SPECS.length, 'Each worker should have a distinct natural pose');

  // Workers must be widely distributed across the factory floor (minimum 6m apart)
  for (let i = 0; i < INDUSTRIAL_WORKER_SPECS.length; i++) {
    for (let j = i + 1; j < INDUSTRIAL_WORKER_SPECS.length; j++) {
      const a = INDUSTRIAL_WORKER_SPECS[i];
      const b = INDUSTRIAL_WORKER_SPECS[j];
      const dist = Math.hypot(a.position.x - b.position.x, a.position.z - b.position.z);
      assert.ok(dist >= 6.0, `Workers ${a.id} and ${b.id} are too close (${dist.toFixed(1)}m)`);
    }
  }

  INDUSTRIAL_WORKER_SPECS.forEach((worker) => {
    // Must stay outside every machine's work cell safety perimeter (10.2m x 7.2m -> half 5.1m x 3.6m)
    Object.values(MACHINE_COORDINATES).forEach((m) => {
      const insideX = Math.abs(worker.position.x - m.x) < 5.1;
      const insideZ = Math.abs(worker.position.z - m.z) < 3.6;
      assert.equal(
        insideX && insideZ,
        false,
        `Worker ${worker.id} should not overlap machine cell ${m.name}`
      );
    });

    // Must stay clear of central General Compartment Box (2.7m x 1.0m footprint around (0, 0.75))
    const dxG = Math.abs(worker.position.x - GATEWAY_COORDINATES.x);
    const dzG = Math.abs(worker.position.z - GATEWAY_COORDINATES.z);
    assert.equal(
      dxG < 1.8 && dzG < 1.3,
      false,
      `Worker ${worker.id} should not block the General Compartment Box`
    );
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
