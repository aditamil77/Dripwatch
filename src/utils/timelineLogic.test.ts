import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateSeverityRating, formatElapsedSeconds, createInitialTimeline } from './timelineLogic';

test('calculateSeverityRating returns None when dry and not leaking', () => {
  const result = calculateSeverityRating(null, null, false);
  assert.equal(result, 'None');
});

test('calculateSeverityRating classifies under 1 second as Flood', () => {
  // Pad 1 at 0.5s, Pad 3 at 1.2s -> delta = 0.7s (< 1s)
  const result = calculateSeverityRating(0.5, 1.2, true);
  assert.equal(result, 'Flood');
});

test('calculateSeverityRating classifies under 3 seconds as Seep', () => {
  // Pad 1 at 0.5s, Pad 3 at 2.4s -> delta = 1.9s (< 3s)
  const result = calculateSeverityRating(0.5, 2.4, true);
  assert.equal(result, 'Seep');
});

test('calculateSeverityRating classifies 3+ seconds as Drip', () => {
  // Pad 1 at 0.5s, Pad 3 at 4.2s -> delta = 3.7s (>= 3s)
  const result = calculateSeverityRating(0.5, 4.2, true);
  assert.equal(result, 'Drip');
});

test('calculateSeverityRating defaults to Drip while leak is active before Pad 3', () => {
  const result = calculateSeverityRating(0.5, null, true);
  assert.equal(result, 'Drip');
});

test('formatElapsedSeconds formats numbers with 2 decimals and prefix', () => {
  assert.equal(formatElapsedSeconds(0.428), '+0.43s');
  assert.equal(formatElapsedSeconds(1.5), '+1.50s');
  assert.equal(formatElapsedSeconds(null), '--');
});

test('createInitialTimeline generates 5 sequential steps', () => {
  const timeline = createInitialTimeline();
  assert.equal(timeline.length, 5);
  assert.equal(timeline[0].id, 'leak_start');
  assert.equal(timeline[1].id, 'pad_wet');
  assert.equal(timeline[2].id, 'esp32_confirmed');
  assert.equal(timeline[3].id, 'mqtt_sent');
  assert.equal(timeline[4].id, 'dashboard_alert');
});
