import { useState } from 'react'
import { Move, Crop, Brush, Eraser, Type, Pipette, Hand, ZoomIn, Square, Layers, Eye, SlidersHorizontal } from 'lucide-react'
import type { RelicWindow } from '../../sdk/types'
import { useOS } from '../../os/runtime/store'
import { Art } from '../../ui/Art'

const MENUS = ['File', 'Edit', 'Image', 'Layer', 'Type', 'Select', 'Filter', '3D', 'View', 'Window', 'Help']
const TOOLS = [Move, Square, Crop, Pipette, Brush, Eraser, Type, Hand, ZoomIn]
const LAYERS = ['Grade · Night', 'Glass Reflections', 'Terrace Light', 'Cantilever', 'Interior Glow', 'Landscape', 'Sky · Volcanic', 'Background']

/** Simulated Windows application surface — Photoshop running through Relic Runtime. */
export function Photoshop({ win, tv }: { win: RelicWindow; tv?: boolean }) {
  const sess = useOS((s) => s.sessions.find((x) => x.id === win.sessionId))
  const exposure = Number(sess?.state.exposure ?? 0)
  const fileName = String(sess?.state.fileName ?? win.props?.fileName ?? 'House Render.psd')
  const [tool, setTool] = useState(0)
  const [layer, setLayer] = useState(3)
  const [hidden, setHidden] = useState<number[]>([])
  return (
    <div className="flex h-full flex-col bg-[#0d0c0c] text-[11px] text-ash" style={{ fontFamily: 'Segoe UI, Helvetica Neue, Arial, sans-serif' }}>
      {!tv && (
        <div className="flex h-7 items-center gap-4 border-b border-black bg-[#151313] px-3">
          <span className="text-[11px] font-semibold tracking-[0.09em] font-semibold text-red">Ps</span>
          {MENUS.map((m) => (
            <span key={m} className="text-[11px] text-ash hover:text-bone">{m}</span>
          ))}
        </div>
      )}
      <div className="flex h-8 items-center gap-4 border-b border-black bg-[#121010] px-3 text-[11px]">
        <span>Auto-Select: Layer</span>
        <span className="text-soot">|</span>
        <span>Exposure <span className="num text-bone">{exposure >= 0 ? '+' : ''}{exposure.toFixed(2)}</span></span>
        <span className="text-soot">|</span>
        <span>Opacity 100%</span>
        <span className="ml-auto text-smoke">RELIC RUNTIME · DX12 → VULKAN</span>
      </div>
      <div className="flex min-h-0 flex-1">
        <div className="flex w-10 flex-col items-center gap-1 border-r border-black bg-[#121010] py-2">
          {TOOLS.map((T, i) => (
            <button key={i} onClick={() => setTool(i)} className={`flex h-7 w-7 items-center justify-center ${tool === i ? 'bg-oxblood text-bone' : 'text-ash hover:text-bone'}`} aria-label={`Tool ${i + 1}`}>
              <T size={14} strokeWidth={1.25} />
            </button>
          ))}
        </div>
        <div className="relative flex min-w-0 flex-1 flex-col bg-[#080707]">
          <div className="flex h-6 items-center border-b border-black bg-[#141212] px-3 text-[11px]">
            <span className="border-b border-red pb-[3px] pt-1 text-bone">{fileName} @ 33.3% (RGB/16)</span>
          </div>
          <div className="flex flex-1 items-center justify-center p-6">
            <div className="relative aspect-[16/9] w-full max-w-[860px] shadow-[0_0_0_1px_#000,0_20px_60px_rgba(0,0,0,0.8)]">
              <div className="absolute inset-0 transition-[filter] duration-700" style={{ filter: `brightness(${1 + exposure * 0.9}) contrast(${1 + exposure * 0.15})` }}>
                <Art variant="render" seed={7} className="h-full w-full" />
              </div>
              {tool === 2 && <div className="absolute inset-[8%] border border-dashed border-bone/60" />}
            </div>
          </div>
          <div className="flex h-6 items-center gap-4 border-t border-black bg-[#121010] px-3 text-[11px]">
            <span>33.33%</span>
            <span>8000 px × 4500 px (300 ppi)</span>
            <span className="ml-auto text-smoke">GPU · ACCELERATED</span>
          </div>
        </div>
        {!tv && (
          <div className="flex w-[230px] flex-col border-l border-black bg-[#121010]">
            <div className="border-b border-black p-3">
              <div className="mb-2 flex items-center gap-2 text-bone"><SlidersHorizontal size={12} /> Properties</div>
              {[
                ['Exposure', exposure],
                ['Offset', 0],
                ['Gamma', 1],
              ].map(([k, v]) => (
                <div key={k as string} className="mb-2">
                  <div className="flex justify-between"><span>{k as string}</span><span className="num text-bone">{Number(v).toFixed(2)}</span></div>
                  <div className="mt-1 h-[2px] bg-[#2a2424]"><div className="h-full bg-red" style={{ width: `${50 + Number(v) * 40}%` }} /></div>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2 border-b border-black px-3 py-2 text-bone"><Layers size={12} /> Layers <span className="ml-auto text-smoke">38</span></div>
            <div className="flex-1 overflow-y-auto">
              {LAYERS.map((l, i) => (
                <div key={l} onClick={() => setLayer(i)} className={`flex items-center gap-2 border-b border-black px-3 py-1.5 ${layer === i ? 'bg-oxblood/60 text-bone' : ''}`}>
                  <button onClick={(e) => { e.stopPropagation(); setHidden((h) => (h.includes(i) ? h.filter((x) => x !== i) : [...h, i])) }} aria-label="Toggle visibility">
                    <Eye size={11} className={hidden.includes(i) ? 'text-soot' : 'text-ash'} />
                  </button>
                  <span className="h-5 w-8 overflow-hidden border border-black"><Art variant={i === 6 ? 'volcano' : 'render'} className="h-full w-full" /></span>
                  <span className="truncate">{l}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
