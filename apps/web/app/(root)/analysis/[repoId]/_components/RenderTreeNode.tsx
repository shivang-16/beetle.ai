"use client";

import {
  TreeExpander,
  TreeIcon,
  TreeLabel,
  TreeNode,
  TreeNodeContent,
  TreeNodeTrigger,
} from "@/components/ui/kibo-ui/tree";
import { ITreeNode } from "@/types/types";
import { FileCode, FileJson, FileText } from "lucide-react";
import React from "react";

const RenderTreeNode = ({ node }: { node: ITreeNode }) => {
  const hasChildren = node.children && node.children.length > 0;

  // Utility function to get file icon based on extension
  const getFileIcon = (filename: string) => {
    const ext = filename.split(".").pop()?.toLowerCase();

    switch (ext) {
      case "tsx":
      case "ts":
      case "jsx":
      case "js":
        return <FileCode className="h-4 w-4" />;
      case "json":
        return <FileJson className="h-4 w-4" />;
      case "md":
      case "txt":
      case "svg":
        return <FileText className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  return (
    <TreeNode
      nodeId={node.id}
      level={node.level}
      isLast={node.isLast}
      parentPath={node.parentPath}>
      <TreeNodeTrigger>
        <TreeExpander hasChildren={hasChildren} />
        <TreeIcon
          hasChildren={hasChildren}
          icon={node.type === "blob" ? getFileIcon(node.name) : undefined}
        />
        <TreeLabel>{node.name}</TreeLabel>
      </TreeNodeTrigger>
      {hasChildren && (
        <TreeNodeContent hasChildren={hasChildren}>
          {node.children?.map((child) => (
            <RenderTreeNode key={child.id} node={child} />
          ))}
        </TreeNodeContent>
      )}
    </TreeNode>
  );
};

export default RenderTreeNode;
