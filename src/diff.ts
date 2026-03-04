import type { TreeNode, DiffNode, DiffStatus } from './types.js';

/** Compare two trees and produce a diff tree */
export function diffTrees(left: TreeNode, right: TreeNode): DiffNode {
  return diffNodes(left, right);
}

function diffNodes(left: TreeNode, right: TreeNode): DiffNode {
  // Build child map for both sides
  const leftChildren = new Map<string, TreeNode>();
  const rightChildren = new Map<string, TreeNode>();

  for (const child of left.children) {
    leftChildren.set(child.name, child);
  }
  for (const child of right.children) {
    rightChildren.set(child.name, child);
  }

  const children: DiffNode[] = [];

  // Entries in both or only in left
  for (const [name, leftChild] of leftChildren) {
    const rightChild = rightChildren.get(name);
    if (rightChild) {
      // Exists in both
      if (leftChild.isDirectory && rightChild.isDirectory) {
        const child = diffNodes(leftChild, rightChild);
        children.push(child);
      } else if (!leftChild.isDirectory && !rightChild.isDirectory) {
        children.push({
          name,
          path: rightChild.path,
          isDirectory: false,
          status: leftChild.size !== rightChild.size ? 'modified' : 'unchanged',
          sizeLeft: leftChild.size,
          sizeRight: rightChild.size,
          children: [],
        });
      } else {
        // Type changed (file → dir or dir → file): show as removed + added
        children.push(makeLeaf(leftChild, 'removed'));
        children.push(makeLeaf(rightChild, 'added'));
      }
    } else {
      // Only in left → removed
      children.push(makeSubtree(leftChild, 'removed'));
    }
  }

  // Entries only in right
  for (const [name, rightChild] of rightChildren) {
    if (!leftChildren.has(name)) {
      children.push(makeSubtree(rightChild, 'added'));
    }
  }

  // Sort: directories first, then by name
  children.sort((a, b) => {
    if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1;
    return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
  });

  // Determine if this directory has any changes
  const hasChanges = children.some(c => c.status !== 'unchanged');

  return {
    name: right.name,
    path: right.path,
    isDirectory: true,
    status: hasChanges ? 'modified' : 'unchanged',
    sizeLeft: left.size,
    sizeRight: right.size,
    children,
  };
}

/** Mark an entire subtree with a single status */
function makeSubtree(node: TreeNode, status: 'added' | 'removed'): DiffNode {
  const sizeLeft = status === 'removed' ? node.size : 0;
  const sizeRight = status === 'added' ? node.size : 0;

  return {
    name: node.name,
    path: node.path,
    isDirectory: node.isDirectory,
    status,
    sizeLeft,
    sizeRight,
    children: node.children.map(c => makeSubtree(c, status)),
  };
}

function makeLeaf(node: TreeNode, status: 'added' | 'removed'): DiffNode {
  return makeSubtree(node, status);
}
