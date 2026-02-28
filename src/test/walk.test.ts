import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync, rmSync, symlinkSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { walkTree } from '../walk.js';
import { defaultOptions } from '../types.js';

describe('walkTree', () => {
  const testDir = join(tmpdir(), 'arbor-test-' + Date.now());

  before(() => {
    // Create a test directory structure
    mkdirSync(join(testDir, 'src'), { recursive: true });
    mkdirSync(join(testDir, 'src', 'utils'), { recursive: true });
    mkdirSync(join(testDir, '.hidden'), { recursive: true });
    writeFileSync(join(testDir, 'package.json'), '{}');
    writeFileSync(join(testDir, 'README.md'), '# Test');
    writeFileSync(join(testDir, 'src', 'index.ts'), 'export {}');
    writeFileSync(join(testDir, 'src', 'app.ts'), 'const x = 1;');
    writeFileSync(join(testDir, 'src', 'utils', 'helper.ts'), 'export const h = 1;');
    writeFileSync(join(testDir, '.hidden', 'secret.txt'), 'hidden');
    writeFileSync(join(testDir, '.env'), 'SECRET=123');
  });

  after(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  it('walks a directory tree', () => {
    const tree = walkTree({ ...defaultOptions, root: testDir, showGitStatus: false });
    assert.equal(tree.isDirectory, true);
    assert.ok(tree.children.length > 0);
  });

  it('hides dotfiles by default', () => {
    const tree = walkTree({ ...defaultOptions, root: testDir, showGitStatus: false });
    const names = tree.children.map(c => c.name);
    assert.ok(!names.includes('.hidden'), 'should not include .hidden');
    assert.ok(!names.includes('.env'), 'should not include .env');
  });

  it('shows dotfiles with showHidden', () => {
    const tree = walkTree({ ...defaultOptions, root: testDir, showHidden: true, showGitStatus: false });
    const names = tree.children.map(c => c.name);
    assert.ok(names.includes('.hidden'), 'should include .hidden');
    assert.ok(names.includes('.env'), 'should include .env');
  });

  it('limits depth', () => {
    const tree = walkTree({ ...defaultOptions, root: testDir, maxDepth: 1, showGitStatus: false });
    const src = tree.children.find(c => c.name === 'src');
    assert.ok(src, 'should have src');
    assert.equal(src.children.length, 0, 'src should have no children at depth 1');
  });

  it('filters by pattern', () => {
    const tree = walkTree({ ...defaultOptions, root: testDir, pattern: '*.ts', showGitStatus: false });
    // Should only have directories and .ts files
    const allFiles = flattenFiles(tree);
    for (const file of allFiles) {
      assert.ok(file.name.endsWith('.ts'), `${file.name} should be a .ts file`);
    }
  });

  it('shows dirs only', () => {
    const tree = walkTree({ ...defaultOptions, root: testDir, dirsOnly: true, showGitStatus: false });
    const allChildren = flattenAll(tree);
    for (const node of allChildren) {
      assert.ok(node.isDirectory, `${node.name} should be a directory`);
    }
  });

  it('sorts directories first', () => {
    const tree = walkTree({ ...defaultOptions, root: testDir, showGitStatus: false });
    const dirs = tree.children.filter(c => c.isDirectory);
    const files = tree.children.filter(c => !c.isDirectory);

    if (dirs.length > 0 && files.length > 0) {
      const lastDirIdx = tree.children.lastIndexOf(dirs[dirs.length - 1]!);
      const firstFileIdx = tree.children.indexOf(files[0]!);
      assert.ok(lastDirIdx < firstFileIdx, 'directories should come before files');
    }
  });
});

describe('walkTree symlinks', () => {
  const testDir = join(tmpdir(), 'arbor-symlink-test-' + Date.now());

  before(() => {
    // Create a test directory structure with symlinks
    mkdirSync(join(testDir, 'real-dir'), { recursive: true });
    writeFileSync(join(testDir, 'real-file.txt'), 'hello');
    writeFileSync(join(testDir, 'real-dir', 'nested.txt'), 'nested');

    // Symlink to a file
    symlinkSync(join(testDir, 'real-file.txt'), join(testDir, 'link-to-file.txt'));
    // Symlink to a directory
    symlinkSync(join(testDir, 'real-dir'), join(testDir, 'link-to-dir'));
    // Broken symlink (target does not exist)
    symlinkSync(join(testDir, 'nonexistent'), join(testDir, 'broken-link'));
  });

  after(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  it('detects symlink to file', () => {
    const tree = walkTree({ ...defaultOptions, root: testDir, showGitStatus: false });
    const link = tree.children.find(c => c.name === 'link-to-file.txt');
    assert.ok(link, 'should find link-to-file.txt');
    assert.equal(link.isSymlink, true);
    assert.ok(link.symlinkTarget, 'should have symlinkTarget');
    assert.equal(link.isBrokenSymlink, false);
  });

  it('detects symlink to directory', () => {
    const tree = walkTree({ ...defaultOptions, root: testDir, showGitStatus: false });
    const link = tree.children.find(c => c.name === 'link-to-dir');
    assert.ok(link, 'should find link-to-dir');
    assert.equal(link.isSymlink, true);
    assert.equal(link.isDirectory, true);
    assert.ok(link.symlinkTarget, 'should have symlinkTarget');
  });

  it('detects broken symlink', () => {
    const tree = walkTree({ ...defaultOptions, root: testDir, showGitStatus: false });
    const link = tree.children.find(c => c.name === 'broken-link');
    assert.ok(link, 'should find broken-link');
    assert.equal(link.isSymlink, true);
    assert.equal(link.isBrokenSymlink, true);
    assert.ok(link.symlinkTarget, 'should have symlinkTarget');
  });

  it('follows symlink directories by default', () => {
    const tree = walkTree({ ...defaultOptions, root: testDir, showGitStatus: false });
    const link = tree.children.find(c => c.name === 'link-to-dir');
    assert.ok(link, 'should find link-to-dir');
    assert.ok(link.children.length > 0, 'should have children when following symlinks');
  });

  it('does not follow symlink directories with followSymlinks=false', () => {
    const tree = walkTree({ ...defaultOptions, root: testDir, showGitStatus: false, followSymlinks: false });
    const link = tree.children.find(c => c.name === 'link-to-dir');
    assert.ok(link, 'should find link-to-dir');
    assert.equal(link.children.length, 0, 'should have no children when not following symlinks');
    assert.equal(link.isSymlink, true);
    assert.equal(link.isDirectory, true);
  });
});

function flattenFiles(node: { name: string; isDirectory: boolean; children: typeof node[] }): typeof node[] {
  const result: typeof node[] = [];
  for (const child of node.children) {
    if (!child.isDirectory) {
      result.push(child);
    }
    result.push(...flattenFiles(child));
  }
  return result;
}

function flattenAll(node: { name: string; isDirectory: boolean; children: typeof node[] }): typeof node[] {
  const result: typeof node[] = [];
  for (const child of node.children) {
    result.push(child);
    result.push(...flattenAll(child));
  }
  return result;
}
