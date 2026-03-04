import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { walkTree } from '../walk.js';
import { diffTrees } from '../diff.js';
import { renderDiff } from '../render-diff.js';
import { setColorEnabled } from '../color.js';
import { defaultOptions } from '../types.js';

function walkOpts(root: string) {
  return { ...defaultOptions, root, showGitStatus: false };
}

describe('diffTrees', () => {
  const baseDir = join(tmpdir(), 'arbor-diff-test-' + Date.now());
  const dirA = join(baseDir, 'a');
  const dirB = join(baseDir, 'b');

  before(() => {
    // Create directory A
    mkdirSync(join(dirA, 'src'), { recursive: true });
    writeFileSync(join(dirA, 'package.json'), '{}');
    writeFileSync(join(dirA, 'README.md'), '# Hello');
    writeFileSync(join(dirA, 'src', 'index.ts'), 'export {}');
    writeFileSync(join(dirA, 'src', 'old.ts'), 'const x = 1;');

    // Create directory B (some overlap, some changes)
    mkdirSync(join(dirB, 'src'), { recursive: true });
    mkdirSync(join(dirB, 'dist'), { recursive: true });
    writeFileSync(join(dirB, 'package.json'), '{"name": "b"}');  // modified (different content/size)
    writeFileSync(join(dirB, 'README.md'), '# Hello');
    writeFileSync(join(dirB, 'src', 'index.ts'), 'export {}');
    writeFileSync(join(dirB, 'src', 'new.ts'), 'const y = 2;');
    writeFileSync(join(dirB, 'dist', 'bundle.js'), 'var x = 1;');
  });

  after(() => {
    rmSync(baseDir, { recursive: true, force: true });
  });

  it('detects identical trees as unchanged', () => {
    const treeA = walkTree(walkOpts(dirA));
    const treeA2 = walkTree(walkOpts(dirA));
    const diff = diffTrees(treeA, treeA2);
    assert.equal(diff.status, 'unchanged');
  });

  it('detects added files', () => {
    const treeA = walkTree(walkOpts(dirA));
    const treeB = walkTree(walkOpts(dirB));
    const diff = diffTrees(treeA, treeB);

    const srcDiff = diff.children.find(c => c.name === 'src');
    assert.ok(srcDiff, 'should find src');
    const added = srcDiff!.children.find(c => c.name === 'new.ts');
    assert.ok(added, 'should find new.ts');
    assert.equal(added!.status, 'added');
  });

  it('detects removed files', () => {
    const treeA = walkTree(walkOpts(dirA));
    const treeB = walkTree(walkOpts(dirB));
    const diff = diffTrees(treeA, treeB);

    const srcDiff = diff.children.find(c => c.name === 'src');
    assert.ok(srcDiff, 'should find src');
    const removed = srcDiff!.children.find(c => c.name === 'old.ts');
    assert.ok(removed, 'should find old.ts');
    assert.equal(removed!.status, 'removed');
  });

  it('detects modified files', () => {
    const treeA = walkTree(walkOpts(dirA));
    const treeB = walkTree(walkOpts(dirB));
    const diff = diffTrees(treeA, treeB);

    const pkg = diff.children.find(c => c.name === 'package.json');
    assert.ok(pkg, 'should find package.json');
    assert.equal(pkg!.status, 'modified');
  });

  it('detects added directories', () => {
    const treeA = walkTree(walkOpts(dirA));
    const treeB = walkTree(walkOpts(dirB));
    const diff = diffTrees(treeA, treeB);

    const dist = diff.children.find(c => c.name === 'dist');
    assert.ok(dist, 'should find dist');
    assert.equal(dist!.status, 'added');
    assert.equal(dist!.isDirectory, true);
  });

  it('marks parent directory as modified when children change', () => {
    const treeA = walkTree(walkOpts(dirA));
    const treeB = walkTree(walkOpts(dirB));
    const diff = diffTrees(treeA, treeB);

    assert.equal(diff.status, 'modified', 'root should be modified');
    const srcDiff = diff.children.find(c => c.name === 'src');
    assert.ok(srcDiff, 'should find src');
    assert.equal(srcDiff!.status, 'modified', 'src should be modified (children changed)');
  });

  it('preserves size info in diff nodes', () => {
    const treeA = walkTree(walkOpts(dirA));
    const treeB = walkTree(walkOpts(dirB));
    const diff = diffTrees(treeA, treeB);

    // Added file: sizeLeft=0, sizeRight>0
    const dist = diff.children.find(c => c.name === 'dist');
    const bundle = dist!.children.find(c => c.name === 'bundle.js');
    assert.ok(bundle, 'should find bundle.js');
    assert.equal(bundle!.sizeLeft, 0);
    assert.ok(bundle!.sizeRight > 0);

    // Removed file: sizeLeft>0, sizeRight=0
    const srcDiff = diff.children.find(c => c.name === 'src');
    const old = srcDiff!.children.find(c => c.name === 'old.ts');
    assert.ok(old, 'should find old.ts');
    assert.ok(old!.sizeLeft > 0);
    assert.equal(old!.sizeRight, 0);
  });

  it('sorts directories first in diff output', () => {
    const treeA = walkTree(walkOpts(dirA));
    const treeB = walkTree(walkOpts(dirB));
    const diff = diffTrees(treeA, treeB);

    const dirs = diff.children.filter(c => c.isDirectory);
    const files = diff.children.filter(c => !c.isDirectory);

    if (dirs.length > 0 && files.length > 0) {
      const lastDirIdx = diff.children.lastIndexOf(dirs[dirs.length - 1]!);
      const firstFileIdx = diff.children.indexOf(files[0]!);
      assert.ok(lastDirIdx < firstFileIdx, 'directories should come before files');
    }
  });
});

describe('renderDiff', () => {
  const baseDir = join(tmpdir(), 'arbor-diff-render-' + Date.now());
  const dirA = join(baseDir, 'a');
  const dirB = join(baseDir, 'b');

  before(() => {
    setColorEnabled(false);

    mkdirSync(join(dirA, 'src'), { recursive: true });
    writeFileSync(join(dirA, 'src', 'index.ts'), 'export {}');
    writeFileSync(join(dirA, 'src', 'old.ts'), 'removed');

    mkdirSync(join(dirB, 'src'), { recursive: true });
    writeFileSync(join(dirB, 'src', 'index.ts'), 'export {}');
    writeFileSync(join(dirB, 'src', 'new.ts'), 'added');
  });

  after(() => {
    rmSync(baseDir, { recursive: true, force: true });
    setColorEnabled(true);
  });

  it('renders diff with status markers', () => {
    const treeA = walkTree(walkOpts(dirA));
    const treeB = walkTree(walkOpts(dirB));
    const diff = diffTrees(treeA, treeB);
    const output = renderDiff(diff, { showSize: false, showIcons: false, showUnchanged: true });

    assert.ok(output.includes('[+]'), 'should show added marker');
    assert.ok(output.includes('[-]'), 'should show removed marker');
    assert.ok(output.includes('new.ts'), 'should show added file');
    assert.ok(output.includes('old.ts'), 'should show removed file');
  });

  it('hides unchanged files by default', () => {
    const treeA = walkTree(walkOpts(dirA));
    const treeB = walkTree(walkOpts(dirB));
    const diff = diffTrees(treeA, treeB);
    const output = renderDiff(diff, { showSize: false, showIcons: false, showUnchanged: false });

    assert.ok(output.includes('new.ts'), 'should show added');
    assert.ok(output.includes('old.ts'), 'should show removed');
    assert.ok(!output.includes('index.ts'), 'should hide unchanged');
  });

  it('shows unchanged files when requested', () => {
    const treeA = walkTree(walkOpts(dirA));
    const treeB = walkTree(walkOpts(dirB));
    const diff = diffTrees(treeA, treeB);
    const output = renderDiff(diff, { showSize: false, showIcons: false, showUnchanged: true });

    assert.ok(output.includes('index.ts'), 'should show unchanged file');
  });

  it('shows summary counts', () => {
    const treeA = walkTree(walkOpts(dirA));
    const treeB = walkTree(walkOpts(dirB));
    const diff = diffTrees(treeA, treeB);
    const output = renderDiff(diff, { showSize: false, showIcons: false, showUnchanged: false });

    assert.ok(output.includes('+1 added'), 'should show added count');
    assert.ok(output.includes('-1 removed'), 'should show removed count');
  });

  it('shows size info when enabled', () => {
    const treeA = walkTree(walkOpts(dirA));
    const treeB = walkTree(walkOpts(dirB));
    const diff = diffTrees(treeA, treeB);
    const output = renderDiff(diff, { showSize: true, showIcons: false, showUnchanged: false });

    // Should have size values in the output
    assert.ok(output.includes('B'), 'should show size units');
  });

  it('shows no differences for identical trees', () => {
    const treeA = walkTree(walkOpts(dirA));
    const treeA2 = walkTree(walkOpts(dirA));
    const diff = diffTrees(treeA, treeA2);
    const output = renderDiff(diff, { showSize: false, showIcons: false, showUnchanged: false });

    assert.ok(output.includes('no differences'), 'should show no differences');
  });
});
