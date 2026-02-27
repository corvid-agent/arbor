import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { setColorEnabled, bold, dim, red, green, colorFile } from '../color.js';

describe('color', () => {
  describe('with colors enabled', () => {
    it('wraps text with ANSI codes', () => {
      setColorEnabled(true);
      const result = red('hello');
      assert.ok(result.includes('\x1b[31m'), 'should include red escape code');
      assert.ok(result.includes('hello'), 'should include the text');
      assert.ok(result.includes('\x1b[0m'), 'should include reset code');
    });

    it('makes text bold', () => {
      setColorEnabled(true);
      const result = bold('test');
      assert.ok(result.includes('\x1b[1m'));
    });

    it('colors directories blue and bold', () => {
      setColorEnabled(true);
      const result = colorFile('src', true);
      assert.ok(result.includes('\x1b[1m'));  // bold
      assert.ok(result.includes('\x1b[34m')); // blue
    });

    it('colors .ts files cyan', () => {
      setColorEnabled(true);
      const result = colorFile('index.ts', false);
      assert.ok(result.includes('\x1b[36m')); // cyan
    });
  });

  describe('with colors disabled', () => {
    it('returns plain text', () => {
      setColorEnabled(false);
      assert.equal(red('hello'), 'hello');
      assert.equal(bold('hello'), 'hello');
      assert.equal(dim('hello'), 'hello');
      assert.equal(green('hello'), 'hello');
    });

    it('returns plain filename', () => {
      setColorEnabled(false);
      assert.equal(colorFile('index.ts', false), 'index.ts');
      assert.equal(colorFile('src', true), 'src');
    });
  });
});

// Re-enable colors for other tests
setColorEnabled(true);
