/**
 * Architectural drawing sheets for the simulated PDF viewer — drawn, not
 * imaged, so they stay sharp at any zoom. Dark "night" print mode.
 */
export const SHEETS = [
  { id: 'A0.0', title: 'COVER SHEET' },
  { id: 'A1.1', title: 'SITE PLAN' },
  { id: 'A2.1', title: 'FLOOR PLAN · LEVEL 1' },
  { id: 'A2.2', title: 'FLOOR PLAN · LEVEL 2' },
  { id: 'A3.1', title: 'EXTERIOR ELEVATIONS' },
  { id: 'A4.1', title: 'BUILDING SECTIONS' },
]

const stroke = '#d9d2cc'

function TitleBlock({ sheet, title, rev }: { sheet: string; title: string; rev: string }) {
  return (
    <g>
      <rect x="560" y="20" width="120" height="400" fill="none" stroke={stroke} strokeWidth="0.8" />
      <text x="572" y="46" fill={stroke} fontSize="11" letterSpacing="5">RELIC</text>
      <text x="572" y="62" fill="#8a817d" fontSize="6" letterSpacing="1.5">RELIC HOUSE · 118 RIDGE RD</text>
      <line x1="560" y1="76" x2="680" y2="76" stroke={stroke} strokeWidth="0.5" />
      {['PERMIT SET', `REVISION ${rev}`, 'SCALE 1/8" = 1\'-0"', 'DRAWN · RELIC STUDIO', 'CHECKED · H'].map((t, i) => (
        <text key={t} x="572" y={96 + i * 16} fill="#8a817d" fontSize="6" letterSpacing="1.4">{t}</text>
      ))}
      <line x1="560" y1="340" x2="680" y2="340" stroke={stroke} strokeWidth="0.5" />
      <text x="572" y="360" fill="#8a817d" fontSize="6" letterSpacing="1.4">{title}</text>
      <text x="572" y="402" fill="#e8242b" fontSize="26" letterSpacing="2">{sheet}</text>
    </g>
  )
}

function Plan({ level }: { level: 1 | 2 }) {
  return (
    <g stroke={stroke} fill="none">
      <rect x="70" y="90" width="420" height="250" strokeWidth="3" />
      {level === 1 ? (
        <>
          <line x1="250" y1="90" x2="250" y2="250" strokeWidth="1.6" />
          <line x1="70" y1="250" x2="360" y2="250" strokeWidth="1.6" />
          <line x1="360" y1="250" x2="360" y2="340" strokeWidth="1.6" />
          <rect x="390" y="110" width="80" height="120" strokeWidth="0.6" strokeDasharray="4 3" />
          <path d="M250 200 A 30 30 0 0 1 280 230" strokeWidth="0.6" />
          <path d="M120 250 A 30 30 0 0 0 150 280" strokeWidth="0.6" />
          {Array.from({ length: 9 }).map((_, i) => <line key={i} x1={370 + i * 12} y1="260" x2={370 + i * 12} y2="330" strokeWidth="0.5" />)}
          <rect x="80" y="100" width="160" height="140" fill="#e8242b" fillOpacity="0.05" stroke="none" />
        </>
      ) : (
        <>
          <line x1="190" y1="90" x2="190" y2="340" strokeWidth="1.6" />
          <line x1="330" y1="90" x2="330" y2="340" strokeWidth="1.6" />
          <line x1="190" y1="210" x2="330" y2="210" strokeWidth="1.6" />
          <rect x="350" y="110" width="120" height="70" strokeWidth="0.6" />
          <rect x="90" y="280" width="80" height="40" strokeWidth="0.6" />
        </>
      )}
      {/* dimensions */}
      <line x1="70" y1="70" x2="490" y2="70" strokeWidth="0.5" />
      <line x1="70" y1="64" x2="70" y2="76" strokeWidth="0.5" />
      <line x1="490" y1="64" x2="490" y2="76" strokeWidth="0.5" />
      <text x="262" y="64" fill="#8a817d" fontSize="7" stroke="none" letterSpacing="1">84'-0"</text>
      <line x1="46" y1="90" x2="46" y2="340" strokeWidth="0.5" />
      <text x="30" y="220" fill="#8a817d" fontSize="7" stroke="none" transform="rotate(-90 30 220)" letterSpacing="1">50'-0"</text>
      {/* grid bubbles */}
      {['A', 'B', 'C', 'D'].map((g, i) => (
        <g key={g}>
          <circle cx={70 + i * 140} cy="366" r="8" strokeWidth="0.6" />
          <text x={67 + i * 140} y="369" fill={stroke} fontSize="8" stroke="none">{g}</text>
        </g>
      ))}
      <text x="80" y="176" fill="#a39b96" fontSize="7" stroke="none" letterSpacing="1.5">{level === 1 ? 'GREAT ROOM' : 'PRIMARY SUITE'}</text>
      <text x="270" y="176" fill="#a39b96" fontSize="7" stroke="none" letterSpacing="1.5">{level === 1 ? 'KITCHEN' : 'STUDY'}</text>
      <text x="400" y="300" fill="#a39b96" fontSize="7" stroke="none" letterSpacing="1.5">{level === 1 ? 'TERRACE' : 'BATH'}</text>
    </g>
  )
}

function Elevation() {
  return (
    <g stroke={stroke} fill="none">
      <line x1="40" y1="330" x2="520" y2="330" strokeWidth="1.5" />
      <path d="M90 330 L90 210 L470 210 L470 330" strokeWidth="1.4" />
      <path d="M60 210 L500 210 L500 196 L60 196 Z" strokeWidth="1.2" fill="#e8242b" fillOpacity="0.05" />
      <path d="M140 196 L140 120 L420 120 L420 196" strokeWidth="1.4" />
      <path d="M120 120 L440 120 L440 108 L120 108 Z" strokeWidth="1.2" />
      {Array.from({ length: 8 }).map((_, i) => <rect key={i} x={110 + i * 44} y="230" width="30" height="80" strokeWidth="0.6" />)}
      {Array.from({ length: 6 }).map((_, i) => <rect key={i} x={160 + i * 44} y="135" width="30" height="50" strokeWidth="0.6" />)}
      <text x="44" y="350" fill="#8a817d" fontSize="7" stroke="none" letterSpacing="1.5">T.O. GRADE 0'-0"</text>
      <text x="444" y="104" fill="#8a817d" fontSize="7" stroke="none" letterSpacing="1.5">T.O. ROOF 26'-6"</text>
    </g>
  )
}

function Site() {
  return (
    <g stroke={stroke} fill="none">
      {Array.from({ length: 10 }).map((_, i) => (
        <path key={i} d={`M30 ${120 + i * 26} C 160 ${90 + i * 28}, 360 ${150 + i * 22}, 530 ${110 + i * 27}`} strokeWidth="0.4" strokeOpacity="0.5" />
      ))}
      <path d="M60 60 L520 80 L500 390 L40 370 Z" strokeWidth="1" strokeDasharray="8 4" />
      <rect x="200" y="170" width="170" height="100" strokeWidth="2.5" fill="#e8242b" fillOpacity="0.08" />
      <path d="M285 270 L300 380" strokeWidth="1" />
      <text x="208" y="162" fill="#a39b96" fontSize="7" stroke="none" letterSpacing="1.5">RELIC HOUSE · FF 412.00</text>
      <text x="70" y="52" fill="#8a817d" fontSize="7" stroke="none" letterSpacing="1.5">PROPERTY LINE</text>
      <path d="M470 110 L470 80 M462 92 L470 80 L478 92" strokeWidth="1" />
      <text x="466" y="124" fill={stroke} fontSize="8" stroke="none">N</text>
    </g>
  )
}

function Section() {
  return (
    <g stroke={stroke} fill="none">
      <path d="M40 330 L520 330" strokeWidth="1.5" />
      <path d="M90 330 L90 200 L470 200 L470 330" strokeWidth="1.4" />
      <path d="M90 265 L470 265" strokeWidth="1.2" />
      <path d="M140 200 L140 110 L420 110 L420 200" strokeWidth="1.4" />
      <path d="M40 360 L520 360" strokeWidth="0.4" strokeDasharray="3 3" />
      <rect x="90" y="330" width="380" height="30" fill="#e8242b" fillOpacity="0.07" strokeWidth="0.6" />
      {Array.from({ length: 12 }).map((_, i) => <line key={i} x1={300 + i * 8} y1={330 - i * 5.4} x2={308 + i * 8} y2={330 - i * 5.4} strokeWidth="0.6" />)}
    </g>
  )
}

function Cover({ rev }: { rev: string }) {
  return (
    <g>
      <text x="70" y="140" fill="#ebe5df" fontSize="30" letterSpacing="14">RELIC HOUSE</text>
      <text x="72" y="166" fill="#8a817d" fontSize="8" letterSpacing="3">PERMIT DRAWINGS · REVISION {rev}</text>
      <line x1="70" y1="186" x2="500" y2="186" stroke="#e8242b" strokeWidth="0.8" />
      {SHEETS.map((s, i) => (
        <g key={s.id}>
          <text x="72" y={216 + i * 18} fill="#ebe5df" fontSize="8" letterSpacing="2">{s.id}</text>
          <text x="140" y={216 + i * 18} fill="#a39b96" fontSize="8" letterSpacing="2">{s.title}</text>
        </g>
      ))}
    </g>
  )
}

export function PlanSheet({ index, rev = 'C' }: { index: number; rev?: string }) {
  const s = SHEETS[index % SHEETS.length]
  return (
    <svg viewBox="0 0 700 440" className="h-full w-full" aria-label={`Sheet ${s.id}`}>
      <rect width="700" height="440" fill="#0b0909" />
      <rect x="20" y="20" width="660" height="400" fill="none" stroke={stroke} strokeWidth="1" />
      {s.id === 'A0.0' && <Cover rev={rev} />}
      {s.id === 'A1.1' && <Site />}
      {s.id === 'A2.1' && <Plan level={1} />}
      {s.id === 'A2.2' && <Plan level={2} />}
      {s.id === 'A3.1' && <Elevation />}
      {s.id === 'A4.1' && <Section />}
      <TitleBlock sheet={s.id} title={s.title} rev={rev} />
    </svg>
  )
}
