"use client";

import React, { useState, useEffect, useRef, useMemo } from 'react';
import * as d3 from 'd3';
import { TreeProps } from '@/types/types';

interface GraphNode extends TreeProps {
  id: string;
  name: string;
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
}

interface GraphLink {
  source: string | GraphNode;
  target: string | GraphNode;
}

interface FileMapProps {
  treeData: TreeProps[];
  onFileSelect?: (node: TreeProps) => void;
}

const FileMap: React.FC<FileMapProps> = ({ treeData, onFileSelect }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const simulationRef = useRef<d3.Simulation<GraphNode, GraphLink> | null>(null);
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const [focusedNode, setFocusedNode] = useState<GraphNode | null>(null);

  // Icon definitions
  const fileIcons = useMemo(() => ({
    js: `<path d="M12 2a2 2 0 00-2 2v2h-2a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V8a2 2 0 00-2-2h-2V4a2 2 0 00-2-2zm-2 4h4v2h-4V6zm-2 4h8v8H8v-8z" />`,
    ts: `<path d="M12 2a2 2 0 00-2 2v2h-2a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V8a2 2 0 00-2-2h-2V4a2 2 0 00-2-2zm-2 4h4v2h-4V6zm-2 4h8v8H8v-8z" />`,
    tsx: `<path d="M12 2a2 2 0 00-2 2v2h-2a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V8a2 2 0 00-2-2h-2V4a2 2 0 00-2-2zm-2 4h4v2h-4V6zm-2 4h8v8H8v-8z" />`,
    json: `<path d="M12 2a2 2 0 00-2 2v2H8a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-8a2 2 0 00-2-2h-2V4a2 2 0 00-2-2zm-2 4h4v2h-4V6zm-2 4h8v6H8v-6z" />`,
    md: `<path d="M4 4a2 2 0 00-2 2v12a2 2 0 002 2h16a2 2 0 002-2V6a2 2 0 00-2-2H4zm0 2h16v12H4V6zm4 2v2h8V8H8zm0 4v2h8v-2H8zm0 4v2h5v-2H8z" />`,
    html: `<path d="M12 2L2 7l10 5 10-5L12 2zM4.47 8.5L12 12.5l7.53-4L12 4.5 4.47 8.5zM2 17l10 5 10-5-10-5-10 5z" />`,
    css: `<path d="M12 2L2 7l10 5 10-5L12 2zM4.47 8.5L12 12.5l7.53-4L12 4.5 4.47 8.5zM2 17l10 5 10-5-10-5-10 5z" />`,
    py: `<path d="M12 2a10 10 0 100 20 10 10 0 000-20zm-1 5a1 1 0 112 0v5h-2V7zm0 7a1 1 0 112 0 1 1 0 01-2 0z" />`,
    default: `<path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zM6 4h7v5h5v11H6V4z" />`
  }), []);

  const getIcon = (filename: string) => {
    const ext = filename.split('.').pop() || '';
    return fileIcons[ext as keyof typeof fileIcons] || fileIcons.default;
  };

  // Memoize data processing
  const memoizedData = useMemo(() => {
    if (!treeData || treeData.length === 0) return { nodes: [], links: [] };

    const allNodes: GraphNode[] = treeData.map(d => ({
      ...d,
      id: d.path,
      name: d.path.split('/').pop() || d.path
    }));

    let currentNodes: GraphNode[];

    if (focusedNode) {
      const focusDepth = focusedNode.path.split('/').length;
      currentNodes = allNodes.filter(n => {
        return n.id === focusedNode.id || 
               (n.path.startsWith(focusedNode.path + '/') && 
                n.path.split('/').length === focusDepth + 1);
      });
    } else {
      if (allNodes.length === 0) return { nodes: [], links: [] };
      const minDepth = Math.min(...allNodes.map(n => n.path.split('/').length));
      currentNodes = allNodes.filter(n => n.path.split('/').length === minDepth);
    }

    const nodeMap = new Map(currentNodes.map(n => [n.id, n]));
    const currentLinks: GraphLink[] = currentNodes
      .map(n => {
        const parentPath = n.path.substring(0, n.path.lastIndexOf('/'));
        if (nodeMap.has(parentPath)) {
          return { source: parentPath, target: n.id };
        }
        return null;
      })
      .filter((link): link is { source: string; target: string } => link !== null);

    return { nodes: currentNodes, links: currentLinks };
  }, [treeData, focusedNode]);

  // Setup effect for one-time initialization
  useEffect(() => {
    if (!containerRef.current || !svgRef.current) return;

    const { width, height } = containerRef.current.getBoundingClientRect();
    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height);

    svg.selectAll("*").remove();
    const g = svg.append('g');

    const defs = g.append('defs');
    
    // Beetle Green gradient for folders (theme-aware)
    const folderGradient = defs.append("radialGradient")
      .attr("id", "folderGradient")
      .attr("cx", "30%")
      .attr("cy", "30%");
    folderGradient.append("stop").attr("offset", "0%").attr("stop-color", "#86efac"); // green-300
    folderGradient.append("stop").attr("offset", "100%").attr("stop-color", "#22c55e"); // green-500

    // Muted gradient for files
    const fileGradient = defs.append("radialGradient")
      .attr("id", "fileGradient")
      .attr("cx", "30%")
      .attr("cy", "30%");
    fileGradient.append("stop").attr("offset", "0%").attr("stop-color", "#d1d5db"); // gray-300
    fileGradient.append("stop").attr("offset", "100%").attr("stop-color", "#9ca3af"); // gray-400

    // Glow filter with green tint
    const glow = defs.append("filter").attr("id", "glow");
    glow.append("feGaussianBlur").attr("stdDeviation", "4").attr("result", "coloredBlur");
    glow.append("feFlood").attr("flood-color", "#22c55e").attr("flood-opacity", "0.6");
    glow.append("feComposite").attr("in2", "coloredBlur").attr("operator", "in").attr("result", "greenGlow");
    const feMerge = glow.append("feMerge");
    feMerge.append("feMergeNode").attr("in", "greenGlow");
    feMerge.append("feMergeNode").attr("in", "SourceGraphic");

    // Create simulation
    simulationRef.current = d3.forceSimulation<GraphNode>()
      .force("link", d3.forceLink<GraphNode, GraphLink>().id(d => d.id).distance(100).strength(0.8))
      .force("charge", d3.forceManyBody<GraphNode>().strength(-800))
      .force("x", d3.forceX<GraphNode>().strength(0.05))
      .force("y", d3.forceY<GraphNode>().strength(0.05))
      .force("collision", d3.forceCollide<GraphNode>().radius(d => (d.type === 'tree' ? 30 : 20) + 10));

    if (simulationRef.current) {
      simulationRef.current.on("tick", () => {
        g.selectAll<SVGGElement, GraphNode>('.node-group')
          .attr("transform", d => `translate(${d.x || 0},${d.y || 0})`);
        
        g.selectAll<SVGLineElement, GraphLink>('.link-line')
          .attr("x1", d => (d.source as GraphNode).x || 0)
          .attr("y1", d => (d.source as GraphNode).y || 0)
          .attr("x2", d => (d.target as GraphNode).x || 0)
          .attr("y2", d => (d.target as GraphNode).y || 0);
      });
    }

    // Zoom behavior
    zoomRef.current = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on("zoom", (event) => g.attr("transform", event.transform));
    
    svg.call(zoomRef.current);

    const initialTransform = d3.zoomIdentity.translate(width / 2, height / 2).scale(0.7);
    svg.call(zoomRef.current.transform, initialTransform);

    // Resize observer
    const resizeObserver = new ResizeObserver(entries => {
      const entry = entries[0];
      if (!entry) return;
      const { width, height } = entry.contentRect;
      svg.attr('width', width).attr('height', height);
    });
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => resizeObserver.disconnect();
  }, []);

  // Update effect for data changes
  useEffect(() => {
    if (!simulationRef.current || !svgRef.current) return;

    const g = d3.select(svgRef.current).select<SVGGElement>('g');
    if (!g.node()) return;

    const simulation = simulationRef.current;
    const { nodes, links } = memoizedData;

    // Get theme colors from CSS variables
    const computedStyle = getComputedStyle(document.documentElement);
    const mutedColor = computedStyle.getPropertyValue('--muted-foreground').trim() || '#71717a';
    const foregroundColor = computedStyle.getPropertyValue('--foreground').trim() || '#09090b';

    // Update links
    g.selectAll<SVGLineElement, GraphLink>(".link-line")
      .data(links, (d) => `${(d.source as GraphNode).id}-${(d.target as GraphNode).id}`)
      .join(
        enter => enter.append("line")
          .attr("class", "link-line")
          .attr("stroke", mutedColor)
          .attr("stroke-opacity", 0)
          .attr("stroke-width", 1.5)
          .call(enter => enter.transition().duration(300).attr("stroke-opacity", 0.4)),
        update => update,
        exit => exit.transition().duration(300).attr("stroke-opacity", 0).remove()
      );

    // Update nodes
    g.selectAll<SVGGElement, GraphNode>(".node-group")
      .data(nodes, d => d.id)
      .join(
        enter => {
          const nodeGroup = enter.append("g").attr("class", "node-group");

          nodeGroup.attr("opacity", 0)
            .call(enter => enter.transition().duration(300).attr("opacity", 1));

          nodeGroup.style("cursor", "pointer")
            .on('mouseover', function() {
              d3.select(this).select('circle').style("filter", "url(#glow)");
            })
            .on('mouseout', function() {
              d3.select(this).select('circle').style("filter", null);
            })
            .on('click', (event, d) => {
              if (d.type !== 'tree' && onFileSelect) {
                onFileSelect(d);
              }
            })
            .on('dblclick', (event, d) => {
              if (d.type === 'tree') {
                setFocusedNode(d);
              }
            });

          nodeGroup.call(
            d3.drag<SVGGElement, GraphNode>()
              .on("start", (event, d) => {
                if (!event.active) simulation.alphaTarget(0.3).restart();
                d.fx = d.x;
                d.fy = d.y;
              })
              .on("drag", (event, d) => {
                d.fx = event.x;
                d.fy = event.y;
              })
              .on("end", (event, d) => {
                if (!event.active) simulation.alphaTarget(0);
                d.fx = null;
                d.fy = null;
              })
          );

          nodeGroup.append("circle")
            .attr("r", d => d.type === 'tree' ? 30 : 20)
            .attr("fill", d => d.type === 'tree' ? 'url(#folderGradient)' : 'url(#fileGradient)')
            .attr("stroke", foregroundColor)
            .attr("stroke-width", 2);

          nodeGroup.append("g")
            .attr("transform", "translate(-10, -10)")
            .append("svg")
            .attr("viewBox", "0 0 24 24")
            .attr("width", 20)
            .attr("height", 20)
            .attr("fill", foregroundColor)
            .html(d => d.type === 'tree' 
              ? `<path d="M10 4H4c-1.11 0-2 .89-2 2v12a2 2 0 002 2h16a2 2 0 002-2V8c0-1.11-.89-2-2-2h-8l-2-2z" />`
              : getIcon(d.name)
            );

          const text = nodeGroup.append("text")
            .text(d => d.name)
            .attr("y", d => (d.type === 'tree' ? 42 : 32))
            .attr("text-anchor", "middle")
            .attr("font-size", "12px")
            .attr("fill", foregroundColor)
            .style("pointer-events", "none");

          text.clone(true)
            .lower()
            .attr("stroke", computedStyle.getPropertyValue('--background').trim() || '#ffffff')
            .attr("stroke-width", 3)
            .attr("stroke-linejoin", "round");

          return nodeGroup;
        },
        update => update,
        exit => exit.transition().duration(300).attr("opacity", 0).remove()
      );

    simulation.nodes(nodes);
    const linkForce = simulation.force<d3.ForceLink<GraphNode, GraphLink>>("link");
    if (linkForce) {
      linkForce.links(links);
    }
    simulation.alpha(1).restart();

  }, [memoizedData, onFileSelect, getIcon]);

  const handleResetView = () => {
    setFocusedNode(null);
    if (!svgRef.current || !zoomRef.current || !containerRef.current) return;
    
    const { width, height } = containerRef.current.getBoundingClientRect();
    const initialTransform = d3.zoomIdentity.translate(width / 2, height / 2).scale(0.7);
    d3.select(svgRef.current)
      .transition()
      .duration(750)
      .call(zoomRef.current.transform, initialTransform);
  };

  return (
    <div ref={containerRef} className="relative w-full h-full bg-background rounded-lg overflow-hidden border border-border">
      <svg ref={svgRef}></svg>
      <div className="absolute top-3 right-3">
        <button 
          onClick={handleResetView} 
          className="px-4 py-2 bg-background/80 backdrop-blur-sm border border-border rounded-lg text-sm font-semibold hover:bg-accent hover:text-accent-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 shadow-sm"
        >
          Reset View
        </button>
      </div>
      <div className="absolute bottom-3 left-3 bg-background/80 backdrop-blur-sm p-3 border border-border rounded-lg text-xs max-w-sm shadow-sm">
        <p className="text-foreground"><b>Navigate:</b> Scroll to zoom, drag to pan.</p>
        <p className="text-foreground"><b>Explore:</b> Click a file to preview, double-click a folder to focus.</p>
      </div>
    </div>
  );
};

export default FileMap;

