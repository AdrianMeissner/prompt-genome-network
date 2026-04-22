'use client'

import { useEffect, useRef, useState } from 'react'
import * as d3 from 'd3'
import { KATEGORIE_LABELS } from '@/types'
import type { Prompt } from '@/types'

interface GraphNode extends d3.SimulationNodeDatum {
  id: string
  title: string
  category: string
  kisScore: number
  erfolgsrate: number
  generation: number
}

interface GraphLink extends d3.SimulationLinkDatum<GraphNode> {
  source: string | GraphNode
  target: string | GraphNode
  vererbungsRate: number
}

interface StammbaumGraphProps {
  prompts: Prompt[]
  genealogie: Array<{ parent_id: string; child_id: string; vererbungs_rate: number }>
  onNodeClick?: (promptId: string) => void
}

// Farbe pro Kategorie
const KATEGORIE_FARBEN: Record<string, string> = {
  code: '#6366f1',
  writing: '#10b981',
  analysis: '#f59e0b',
  creative: '#ec4899',
  business: '#3b82f6',
}

export default function StammbaumGraph({ prompts, genealogie, onNodeClick }: StammbaumGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null)
  const [dimensions, setDimensions] = useState({ width: 800, height: 500 })

  useEffect(() => {
    const updateDimensions = () => {
      if (svgRef.current?.parentElement) {
        setDimensions({
          width: svgRef.current.parentElement.clientWidth,
          height: Math.max(500, window.innerHeight * 0.6),
        })
      }
    }
    updateDimensions()
    window.addEventListener('resize', updateDimensions)
    return () => window.removeEventListener('resize', updateDimensions)
  }, [])

  useEffect(() => {
    if (!svgRef.current || prompts.length === 0) return

    const { width, height } = dimensions

    // Nodes und Links aufbauen
    const nodes: GraphNode[] = prompts.map((p) => ({
      id: p.id,
      title: p.title,
      category: p.category,
      kisScore: p.kollektiver_score,
      erfolgsrate: p.erfolgsrate,
      generation: p.generation,
    }))

    const promptIds = new Set(nodes.map((n) => n.id))
    const links: GraphLink[] = genealogie
      .filter((g) => promptIds.has(g.parent_id) && promptIds.has(g.child_id))
      .map((g) => ({
        source: g.parent_id,
        target: g.child_id,
        vererbungsRate: g.vererbungs_rate,
      }))

    // SVG leeren und neu aufbauen
    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()

    // Zoom-Verhalten
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.3, 3])
      .on('zoom', (event) => {
        container.attr('transform', event.transform)
      })

    svg
      .attr('width', width)
      .attr('height', height)
      .call(zoom)

    const container = svg.append('g')

    // Pfeil-Marker für Vererbungslinien
    svg.append('defs').append('marker')
      .attr('id', 'arrow')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 20)
      .attr('refY', 0)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path')
      .attr('fill', '#4b5563')
      .attr('d', 'M0,-5L10,0L0,5')

    // Force Simulation
    const simulation = d3.forceSimulation<GraphNode>(nodes)
      .force('link', d3.forceLink<GraphNode, GraphLink>(links)
        .id((d) => d.id)
        .distance(120)
        .strength(0.5)
      )
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide<GraphNode>()
        .radius((d) => nodeRadius(d.kisScore) + 10)
      )

    // Links zeichnen
    const link = container.append('g')
      .selectAll<SVGLineElement, GraphLink>('line')
      .data(links)
      .join('line')
      .attr('stroke', '#1e1e2e')
      .attr('stroke-width', 1.5)
      .attr('marker-end', 'url(#arrow)')

    // Nodes zeichnen
    const node = container.append('g')
      .selectAll<SVGGElement, GraphNode>('g')
      .data(nodes)
      .join('g')
      .attr('cursor', 'pointer')
      .call(
        d3.drag<SVGGElement, GraphNode>()
          .on('start', (event, d) => {
            if (!event.active) simulation.alphaTarget(0.3).restart()
            d.fx = d.x
            d.fy = d.y
          })
          .on('drag', (event, d) => {
            d.fx = event.x
            d.fy = event.y
          })
          .on('end', (event, d) => {
            if (!event.active) simulation.alphaTarget(0)
            d.fx = null
            d.fy = null
          })
      )
      .on('click', (event, d) => {
        event.stopPropagation()
        setSelectedNode(d)
        onNodeClick?.(d.id)
      })

    // Kreis pro Node (Größe = KIS Score)
    node.append('circle')
      .attr('r', (d) => nodeRadius(d.kisScore))
      .attr('fill', (d) => KATEGORIE_FARBEN[d.category] ?? '#6366f1')
      .attr('fill-opacity', 0.15)
      .attr('stroke', (d) => KATEGORIE_FARBEN[d.category] ?? '#6366f1')
      .attr('stroke-width', 2)

    // Generation-Badge in der Mitte
    node.append('text')
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'central')
      .attr('fill', (d) => KATEGORIE_FARBEN[d.category] ?? '#6366f1')
      .attr('font-size', '10px')
      .attr('font-weight', '600')
      .text((d) => `G${d.generation}`)

    // Label unter dem Node
    node.append('text')
      .attr('text-anchor', 'middle')
      .attr('y', (d) => nodeRadius(d.kisScore) + 14)
      .attr('fill', '#6b7280')
      .attr('font-size', '10px')
      .text((d) => d.title.length > 18 ? d.title.slice(0, 18) + '…' : d.title)

    // Simulation tick
    simulation.on('tick', () => {
      link
        .attr('x1', (d) => (d.source as GraphNode).x ?? 0)
        .attr('y1', (d) => (d.source as GraphNode).y ?? 0)
        .attr('x2', (d) => (d.target as GraphNode).x ?? 0)
        .attr('y2', (d) => (d.target as GraphNode).y ?? 0)

      node.attr('transform', (d) => `translate(${d.x ?? 0},${d.y ?? 0})`)
    })

    return () => { simulation.stop() }
  }, [prompts, genealogie, dimensions, onNodeClick])

  function nodeRadius(kisScore: number): number {
    return 16 + kisScore * 20
  }

  return (
    <div className="relative">
      {/* Legende */}
      <div className="flex flex-wrap gap-3 mb-4">
        {Object.entries(KATEGORIE_FARBEN).map(([k, farbe]) => (
          <div key={k} className="flex items-center gap-1.5 text-xs text-[#6b7280]">
            <div className="w-3 h-3 rounded-full border-2" style={{ borderColor: farbe }} />
            {KATEGORIE_LABELS[k as keyof typeof KATEGORIE_LABELS] ?? k}
          </div>
        ))}
        <div className="flex items-center gap-1.5 text-xs text-[#6b7280]">
          <div className="w-3 h-3 rounded-full border border-[#6b7280]" />
          Größe = KIS Score
        </div>
      </div>

      {/* Graph */}
      <div className="bg-[#12121a] border border-[#1e1e2e] rounded-xl overflow-hidden relative">
        <svg ref={svgRef} className="w-full" />

        {/* Node-Info Tooltip */}
        {selectedNode && (
          <div className="absolute bottom-4 left-4 bg-[#0a0a0f] border border-[#1e1e2e] rounded-xl p-4 max-w-xs">
            <button
              onClick={() => setSelectedNode(null)}
              className="absolute top-2 right-2 text-[#6b7280] hover:text-[#e8e8f0] text-xs"
            >
              ✕
            </button>
            <div
              className="text-xs font-medium mb-1"
              style={{ color: KATEGORIE_FARBEN[selectedNode.category] ?? '#6366f1' }}
            >
              {KATEGORIE_LABELS[selectedNode.category as keyof typeof KATEGORIE_LABELS]} · Gen. {selectedNode.generation}
            </div>
            <p className="font-semibold text-[#e8e8f0] text-sm mb-2">{selectedNode.title}</p>
            <div className="flex gap-3 text-xs text-[#6b7280]">
              <span>KIS: <strong className="text-[#e8e8f0]">{(selectedNode.kisScore * 100).toFixed(0)}</strong></span>
              <span>Erfolg: <strong className="text-[#e8e8f0]">{(selectedNode.erfolgsrate * 100).toFixed(0)}%</strong></span>
            </div>
          </div>
        )}

        {/* Hinweis wenn leer */}
        {prompts.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center text-[#6b7280]">
            <div className="text-center">
              <div className="text-4xl mb-3">🌳</div>
              <p>Noch keine Vererbungslinien vorhanden</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
