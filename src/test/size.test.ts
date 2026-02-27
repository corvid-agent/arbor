import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { formatSize } from '../size.js';

describe('formatSize', () => {
  it('formats zero bytes', () => {
    assert.equal(formatSize(0), '  0 B');
  });

  it('formats bytes', () => {
    assert.equal(formatSize(100), '100 B');
    assert.equal(formatSize(1), '  1 B');
    assert.equal(formatSize(999), '999 B');
  });

  it('formats kilobytes', () => {
    const result = formatSize(1024);
    assert.ok(result.includes('K'), `Expected K in "${result}"`);
  });

  it('formats megabytes', () => {
    const result = formatSize(1024 * 1024);
    assert.ok(result.includes('M'), `Expected M in "${result}"`);
  });

  it('formats gigabytes', () => {
    const result = formatSize(1024 * 1024 * 1024);
    assert.ok(result.includes('G'), `Expected G in "${result}"`);
  });

  it('formats decimal kilobytes', () => {
    const result = formatSize(2048);
    assert.ok(result.includes('K'), `Expected K in "${result}"`);
  });
});
