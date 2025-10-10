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

const RenderTreeNode = ({ 
  node, 
  onFileSelect, 
  selectedFile 
}: { 
  node: ITreeNode;
  onFileSelect?: (filePath: string | null) => void;
  selectedFile?: string | null;
}) => {
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

  const handleFileClick = () => {
    // Only handle file clicks (blob type), not folder clicks
    if (node.type === "blob" && onFileSelect) {
      // Toggle selection: if already selected, deselect; otherwise select
      const isCurrentlySelected = selectedFile === node.path;
      onFileSelect(isCurrentlySelected ? null : node.path);
    }
  };

  const isSelected = selectedFile === node.path && node.type === "blob";

  return (
    <TreeNode
      nodeId={node.id}
      level={node.level}
      isLast={node.isLast}
      parentPath={node.parentPath}>
      <TreeNodeTrigger 
        onClick={handleFileClick}
        className={isSelected ? "bg-accent/80" : ""}
      >
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
            <RenderTreeNode 
              key={child.id} 
              node={child} 
              onFileSelect={onFileSelect}
              selectedFile={selectedFile}
            />
          ))}
        </TreeNodeContent>
      )}
    </TreeNode>
  );
};

export default RenderTreeNode;
