import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getIcon } from '../icons.js';

describe('getIcon', () => {
  it('returns folder icon for directories', () => {
    const icon = getIcon('src', true, false);
    assert.equal(icon, '');
  });

  it('returns open folder icon for open directories', () => {
    const icon = getIcon('src', true, true);
    assert.equal(icon, '');
  });

  it('returns TypeScript icon for .ts files', () => {
    const icon = getIcon('index.ts', false);
    assert.equal(icon, '');
  });

  it('returns JavaScript icon for .js files', () => {
    const icon = getIcon('app.js', false);
    assert.equal(icon, '');
  });

  it('returns specific icon for known filenames', () => {
    const icon = getIcon('Dockerfile', false);
    assert.equal(icon, '');
  });

  it('returns default icon for unknown extensions', () => {
    const icon = getIcon('mystery.xyz', false);
    assert.equal(icon, '');
  });

  it('returns package.json icon', () => {
    const icon = getIcon('package.json', false);
    assert.equal(icon, '');
  });
});
