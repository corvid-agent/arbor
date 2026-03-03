import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { walkTree } from '../walk.js';
import { formatJson, formatPaths, formatCsv } from '../format.js';
import { defaultOptions } from '../types.js';

describe('output formats', () => {
  const testDir = join(tmpdir(), 'arbor-format-test-' + Date.now());

  before(() => {
    mkdirSync(join(testDir, 'src'), { recursive: true });
    writeFileSync(join(testDir, 'package.json'), '{}');
    writeFileSync(join(testDir, 'README.md'), '# Test');
    writeFileSync(join(testDir, 'src', 'index.ts'), 'export {}');
    writeFileSync(join(testDir, 'src', 'app.ts'), 'const x = 1;');
  });

  after(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  function getTree() {
    return walkTree({ ...defaultOptions, root: testDir, showGitStatus: false });
  }

  describe('formatJson', () => {
    it('returns valid JSON', () => {
      const tree = getTree();
      const output = formatJson(tree, { ...defaultOptions, showGitStatus: false });
      const parsed = JSON.parse(output);
      assert.ok(parsed, 'should parse as JSON');
    });

    it('has correct root structure', () => {
      const tree = getTree();
      const parsed = JSON.parse(formatJson(tree, { ...defaultOptions, showGitStatus: false }));
      assert.equal(parsed.path, '.');
      assert.equal(parsed.type, 'directory');
      assert.ok(Array.isArray(parsed.children));
    });

    it('includes children with correct types', () => {
      const tree = getTree();
      const parsed = JSON.parse(formatJson(tree, { ...defaultOptions, showGitStatus: false }));
      const src = parsed.children.find((c: { name: string }) => c.name === 'src');
      assert.ok(src, 'should have src');
      assert.equal(src.type, 'directory');

      const pkg = parsed.children.find((c: { name: string }) => c.name === 'package.json');
      assert.ok(pkg, 'should have package.json');
      assert.equal(pkg.type, 'file');
    });

    it('includes nested children', () => {
      const tree = getTree();
      const parsed = JSON.parse(formatJson(tree, { ...defaultOptions, showGitStatus: false }));
      const src = parsed.children.find((c: { name: string }) => c.name === 'src');
      assert.ok(src.children, 'src should have children');
      assert.ok(src.children.length >= 2, 'src should have at least 2 children');
    });

    it('includes size when showSize is true', () => {
      const tree = getTree();
      const parsed = JSON.parse(formatJson(tree, { ...defaultOptions, showSize: true, showGitStatus: false }));
      const pkg = parsed.children.find((c: { name: string }) => c.name === 'package.json');
      assert.equal(typeof pkg.size, 'number');
    });

    it('omits size when showSize is false', () => {
      const tree = getTree();
      const parsed = JSON.parse(formatJson(tree, { ...defaultOptions, showSize: false, showGitStatus: false }));
      const pkg = parsed.children.find((c: { name: string }) => c.name === 'package.json');
      assert.equal(pkg.size, undefined);
    });

    it('includes modified timestamp as ISO string', () => {
      const tree = getTree();
      const parsed = JSON.parse(formatJson(tree, { ...defaultOptions, showGitStatus: false }));
      const pkg = parsed.children.find((c: { name: string }) => c.name === 'package.json');
      assert.ok(pkg.modified, 'should have modified');
      assert.ok(!isNaN(Date.parse(pkg.modified)), 'modified should be a valid date');
    });
  });

  describe('formatPaths', () => {
    it('returns one path per line', () => {
      const tree = getTree();
      const output = formatPaths(tree);
      const lines = output.split('\n');
      assert.ok(lines.length >= 4, `should have at least 4 entries, got ${lines.length}`);
    });

    it('includes relative paths', () => {
      const tree = getTree();
      const output = formatPaths(tree);
      const lines = output.split('\n');
      assert.ok(lines.includes('package.json'), 'should include package.json');
      assert.ok(lines.includes('README.md'), 'should include README.md');
    });

    it('includes nested paths with separators', () => {
      const tree = getTree();
      const output = formatPaths(tree);
      const lines = output.split('\n');
      assert.ok(
        lines.some(l => l.startsWith('src/')),
        'should have paths starting with src/'
      );
    });

    it('includes directories', () => {
      const tree = getTree();
      const output = formatPaths(tree);
      const lines = output.split('\n');
      assert.ok(lines.includes('src'), 'should include src directory');
    });
  });

  describe('formatCsv', () => {
    it('starts with a header row', () => {
      const tree = getTree();
      const output = formatCsv(tree, { ...defaultOptions, showGitStatus: false });
      const lines = output.split('\n');
      assert.equal(lines[0], 'path,type,size,modified,git_status');
    });

    it('has correct number of columns per row', () => {
      const tree = getTree();
      const output = formatCsv(tree, { ...defaultOptions, showGitStatus: false });
      const lines = output.split('\n');
      for (const line of lines) {
        const cols = line.split(',');
        assert.ok(cols.length >= 5, `should have at least 5 columns: ${line}`);
      }
    });

    it('includes directory and file types', () => {
      const tree = getTree();
      const output = formatCsv(tree, { ...defaultOptions, showGitStatus: false });
      assert.ok(output.includes(',directory,'), 'should contain directory type');
      assert.ok(output.includes(',file,'), 'should contain file type');
    });

    it('includes all files and directories', () => {
      const tree = getTree();
      const output = formatCsv(tree, { ...defaultOptions, showGitStatus: false });
      const lines = output.split('\n');
      // header + src dir + 2 src files + package.json + README.md = 6
      assert.ok(lines.length >= 6, `should have at least 6 rows (header + 5 entries), got ${lines.length}`);
    });

    it('has valid ISO dates in modified column', () => {
      const tree = getTree();
      const output = formatCsv(tree, { ...defaultOptions, showGitStatus: false });
      const lines = output.split('\n').slice(1); // skip header
      for (const line of lines) {
        const cols = line.split(',');
        const modified = cols[3]!;
        assert.ok(!isNaN(Date.parse(modified)), `modified should be valid date: ${modified}`);
      }
    });
  });
});
