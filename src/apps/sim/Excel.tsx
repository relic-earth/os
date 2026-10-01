import { useMemo, useState } from 'react'

const COLS = ['A', 'B', 'C', 'D', 'E', 'F', 'G']
const LINES: [string, number, number, number][] = [
  ['Land', 420000, 0, 0],
  ['Design & Permits', 186000, 24000, 0],
  ['Site Work', 142000, 38000, 12000],
  ['Foundation', 0, 212000, 18000],
  ['Structure · Steel', 0, 468000, 96000],
  ['Envelope · Glass', 0, 188000, 342000],
  ['Interiors', 0, 0, 512000],
  ['MEP', 0, 96000, 284000],
  ['Landscape', 0, 0, 148000],
  ['Contingency 8%', 60000, 82000, 113000],
]
const money = (n: number) => (n ? n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }) : '—')

/** Simulated Excel (Windows app via Relic Runtime) over Financial Model.xlsx. */
export function Excel() {
  const [sel, setSel] = useState<[number, number]>([1, 1])
  const [edits, setEdits] = useState<Record<string, number>>({})
  const [editing, setEditing] = useState<string | null>(null)
  const rows = useMemo(() => LINES.map(([k, a, b, c], i) => [k, edits[`${i}-1`] ?? a, edits[`${i}-2`] ?? b, edits[`${i}-3`] ?? c] as [string, number, number, number]), [edits])
  const totals = [1, 2, 3].map((c) => rows.reduce((s, r) => s + (r[c] as number), 0))
  const grand = totals.reduce((a, b) => a + b, 0)
  const cellRef = `${COLS[sel[1]]}${sel[0] + 2}`
  const selVal = sel[0] < rows.length ? rows[sel[0]][sel[1]] : ''
  return (
    <div className="flex h-full flex-col bg-[#0c0b0b] text-[11px]" style={{ fontFamily: 'Segoe UI, Helvetica Neue, Arial, sans-serif' }}>
      <div className="flex h-7 items-center gap-4 border-b border-black bg-[#141212] px-3 text-ash">
        {['File', 'Home', 'Insert', 'Formulas', 'Data', 'Review', 'View'].map((m, i) => (
          <span key={m} className={i === 1 ? 'border-b border-red text-bone' : ''}>{m}</span>
        ))}
        <span className="ml-auto text-smoke">Financial Model.xlsx · AutoSave · Relic Files</span>
      </div>
      <div className="flex h-7 items-center gap-2 border-b border-black bg-[#101010] px-2">
        <span className="w-12 border border-[#2a2424] px-1 text-center text-ash">{cellRef}</span>
        <span className="text-red">ƒx</span>
        <span className="flex-1 truncate border border-[#2a2424] px-2 text-bone">
          {sel[0] === rows.length ? `=SUM(${COLS[sel[1]]}2:${COLS[sel[1]]}${rows.length + 1})` : String(selVal)}
        </span>
      </div>
      <div className="flex-1 overflow-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="w-8 border border-[#1e1a1a] bg-[#141212]" />
              {['Line Item', 'Phase 1 · 2026', 'Phase 2 · 2027', 'Phase 3 · 2028', 'Total', 'Share', ''].map((h, i) => (
                <th key={i} className="border border-[#1e1a1a] bg-[#141212] px-2 py-1 text-left font-normal text-ash">
                  <span className="block text-[10px] text-smoke">{COLS[i]}</span>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[...rows, ['TOTAL', ...totals] as [string, number, number, number]].map((r, ri) => {
              const total = (r[1] as number) + (r[2] as number) + (r[3] as number)
              const isTotal = ri === rows.length
              return (
                <tr key={ri} className={isTotal ? 'bg-oxblood/30 text-bone' : 'text-bone/85'}>
                  <td className="border border-[#1e1a1a] bg-[#141212] text-center text-smoke">{ri + 2}</td>
                  {[r[0], r[1], r[2], r[3], total, grand ? `${((total / grand) * 100).toFixed(1)}%` : '', ''].map((v, ci) => {
                    const active = sel[0] === ri && sel[1] === ci
                    const editable = !isTotal && ci >= 1 && ci <= 3
                    return (
                      <td
                        key={ci}
                        onClick={() => setSel([ri, ci])}
                        onDoubleClick={() => editable && setEditing(`${ri}-${ci}`)}
                        className={`num whitespace-nowrap border border-[#1e1a1a] px-2 py-[3px] ${ci === 0 ? 'text-left' : 'text-right'} ${active ? 'outline outline-1 outline-red' : ''}`}
                      >
                        {editing === `${ri}-${ci}` ? (
                          <input
                            autoFocus
                            defaultValue={String(v)}
                            className="w-24 bg-void text-right text-bone outline-none"
                            onBlur={() => setEditing(null)}
                            onKeyDown={(e) => {
                              if (e.key === 'Escape') setEditing(null)
                              if (e.key !== 'Enter') return
                              const n = Number((e.target as HTMLInputElement).value.replace(/[^0-9.-]/g, ''))
                              if (!Number.isNaN(n)) setEdits((x) => ({ ...x, [`${ri}-${ci}`]: n }))
                              setEditing(null)
                            }}
                          />
                        ) : typeof v === 'number' ? (
                          money(v)
                        ) : (
                          v
                        )}
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
        <div className="flex items-end gap-2 px-10 pb-6 pt-8">
          {rows.map((r) => {
            const t = (r[1] as number) + (r[2] as number) + (r[3] as number)
            return (
              <div key={r[0]} className="flex flex-1 flex-col items-center gap-1">
                <div className="w-full bg-gradient-to-t from-blood to-red" style={{ height: `${(t / 700000) * 120}px` }} />
                <span className="w-full truncate text-center text-[10px] text-smoke">{r[0]}</span>
              </div>
            )
          })}
        </div>
      </div>
      <div className="flex h-6 items-center gap-4 border-t border-black bg-[#141212] px-3 text-ash">
        {['Budget', 'Cash Flow', 'Draws', 'Assumptions', 'Sensitivity'].map((s, i) => (
          <span key={s} className={i === 0 ? 'border-b border-red text-bone' : ''}>{s}</span>
        ))}
        <span className="num ml-auto text-bone">SUM {money(grand)}</span>
      </div>
    </div>
  )
}
