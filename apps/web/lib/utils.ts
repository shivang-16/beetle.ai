import { ITreeNode, TreeProps } from "@/types/types";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Calculate parentPath array for tree styling
export const calculateParentPath = (
  pathParts: string[],
  allPaths: Set<string>
): boolean[] => {
  const parentPath: boolean[] = [];

  for (let i = 0; i < pathParts.length - 1; i++) {
    const currentPath = pathParts.slice(0, i + 1).join("/");
    const siblingPrefix = pathParts.slice(0, i).join("/");

    // Check if this level has more siblings after the current path
    const hasMoreSiblings = Array.from(allPaths).some((path) => {
      if (path === currentPath) return false;
      const parts = path.split("/");
      if (parts.length !== i + 1) return false;
      return siblingPrefix === "" ? true : path.startsWith(siblingPrefix + "/");
    });

    parentPath.push(hasMoreSiblings);
  }

  return parentPath;
};

export const buildTreeStructure = (data: TreeProps[]): ITreeNode[] => {
  const nodeMap = new Map<string, ITreeNode>();
  const roots: ITreeNode[] = [];
  const allPaths = new Set(data.map((item) => item.path));

  // Sort data by path to ensure parent directories come before children
  const sortedData = data.sort((a, b) => a.path.localeCompare(b.path));

  // First pass: create all nodes
  sortedData.forEach((item) => {
    const pathParts = item.path.split("/");
    const name = pathParts[pathParts.length - 1] || "";
    const parentPath = calculateParentPath(pathParts, allPaths);

    const node: ITreeNode = {
      id: item.sha || item.path,
      name,
      path: item.path,
      type: item.type,
      level: pathParts.length - 1,
      parentPath: parentPath.length > 0 ? parentPath : undefined,
      children: item.type === "tree" ? [] : undefined,
      sha: item.sha,
      size: item.size,
    };

    nodeMap.set(item.path, node);
  });

  // Second pass: build parent-child relationships
  sortedData.forEach((item) => {
    const pathParts = item.path.split("/");
    const currentNode = nodeMap.get(item.path);

    if (!currentNode) return;

    if (pathParts.length === 1) {
      // Root level item
      roots.push(currentNode);
    } else {
      // Find parent
      const parentPath = pathParts.slice(0, -1).join("/");
      const parentNode = nodeMap.get(parentPath);

      if (parentNode && parentNode.children) {
        parentNode.children.push(currentNode);
      }
    }
  });

  // Mark last children and sort folders before files
  const markLastChildrenAndSort = (nodes: ITreeNode[]) => {
    // Sort each level: folders first, then files
    nodes.sort((a, b) => {
      // First sort by type: folders ('tree') before files ('blob')
      if (a.type !== b.type) {
        return a.type === "tree" ? -1 : 1;
      }
      // Then sort alphabetically within the same type
      return a.name.localeCompare(b.name);
    });

    // Mark the last child after sorting
    nodes.forEach((node, index) => {
      node.isLast = index === nodes.length - 1;

      if (node.children && node.children.length > 0) {
        markLastChildrenAndSort(node.children);
      }
    });
  };

  markLastChildrenAndSort(roots);
  return roots;
};
