// src/components/ui/Illustrations.tsx
// Premium SVG illustrations for empty states throughout the CRM
// These replace boring text-only empty states with visual personality

'use client'

// Empty dashboard illustration
export function EmptyDashboardIllustration() {
  return (
    <svg width="200" height="160" viewBox="0 0 200 160" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Floating chart cards */}
      <rect x="30" y="40" width="60" height="45" rx="8" fill="#f3f0ff" stroke="#ddd6fe" strokeWidth="1" style={{ animation: 'float 3s ease-in-out infinite' }} />
      <rect x="38" y="52" width="20" height="4" rx="2" fill="#c4b5fd" />
      <rect x="38" y="60" width="35" height="3" rx="1.5" fill="#e9e5ff" />
      <rect x="38" y="67" width="28" height="3" rx="1.5" fill="#e9e5ff" />
      {/* Bar chart mini */}
      <rect x="40" y="75" width="4" height="5" rx="1" fill="#5a1890" opacity="0.6" />
      <rect x="47" y="72" width="4" height="8" rx="1" fill="#5a1890" opacity="0.8" />
      <rect x="54" y="68" width="4" height="12" rx="1" fill="#5a1890" />
      <rect x="61" y="74" width="4" height="6" rx="1" fill="#5a1890" opacity="0.5" />

      {/* Second card */}
      <rect x="110" y="30" width="60" height="45" rx="8" fill="#ecfdf5" stroke="#bbf7d0" strokeWidth="1" style={{ animation: 'float 3s ease-in-out 0.5s infinite' }} />
      <circle cx="140" cy="52" r="10" fill="none" stroke="#1D9E75" strokeWidth="3" strokeDasharray="40 63" strokeLinecap="round" style={{ transform: 'rotate(-90deg)', transformOrigin: '140px 52px' }} />
      <text x="140" y="55" textAnchor="middle" fill="#1D9E75" fontSize="8" fontWeight="600">75%</text>
      <rect x="118" y="67" width="35" height="3" rx="1.5" fill="#d1fae5" />

      {/* Connection lines */}
      <path d="M90 62 L110 50" stroke="#ddd6fe" strokeWidth="1" strokeDasharray="3 3" opacity="0.5" />

      {/* Bottom decoration */}
      <rect x="60" y="100" width="80" height="35" rx="8" fill="white" stroke="#e5e7eb" strokeWidth="1" />
      <rect x="70" y="110" width="30" height="4" rx="2" fill="#5a1890" opacity="0.2" />
      <rect x="70" y="118" width="55" height="3" rx="1.5" fill="#f3f4f6" />
      <rect x="70" y="125" width="40" height="3" rx="1.5" fill="#f3f4f6" />

      {/* Sparkle accents */}
      <circle cx="25" cy="35" r="2" fill="#c9a54e" opacity="0.6" style={{ animation: 'pulse-soft 2s infinite' }} />
      <circle cx="175" cy="25" r="1.5" fill="#00adef" opacity="0.5" style={{ animation: 'pulse-soft 2s infinite 0.3s' }} />
      <circle cx="95" cy="20" r="2" fill="#5a1890" opacity="0.4" style={{ animation: 'pulse-soft 2s infinite 0.7s' }} />

      <style>{`
        @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-4px); } }
      `}</style>
    </svg>
  )
}

// Empty accounts illustration
export function EmptyAccountsIllustration() {
  return (
    <svg width="180" height="140" viewBox="0 0 180 140" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Company building */}
      <rect x="60" y="35" width="60" height="70" rx="6" fill="#f8f4ff" stroke="#ddd6fe" strokeWidth="1.5" />
      {/* Windows */}
      <rect x="70" y="45" width="10" height="10" rx="2" fill="#e9e5ff" />
      <rect x="85" y="45" width="10" height="10" rx="2" fill="#e9e5ff" />
      <rect x="100" y="45" width="10" height="10" rx="2" fill="#e9e5ff" />
      <rect x="70" y="60" width="10" height="10" rx="2" fill="#e9e5ff" />
      <rect x="85" y="60" width="10" height="10" rx="2" fill="#ddd6fe" />
      <rect x="100" y="60" width="10" height="10" rx="2" fill="#e9e5ff" />
      <rect x="70" y="75" width="10" height="10" rx="2" fill="#e9e5ff" />
      <rect x="85" y="75" width="10" height="10" rx="2" fill="#e9e5ff" />
      <rect x="100" y="75" width="10" height="10" rx="2" fill="#c4b5fd" />
      {/* Door */}
      <rect x="83" y="90" width="14" height="15" rx="3" fill="#5a1890" opacity="0.2" />
      {/* Heart health indicator */}
      <circle cx="130" cy="40" r="12" fill="#ecfdf5" stroke="#1D9E75" strokeWidth="1.5" style={{ animation: 'pulse-soft 1.5s infinite' }} />
      <text x="130" y="44" textAnchor="middle" fill="#1D9E75" fontSize="10">♥</text>
      {/* Connection dots */}
      <circle cx="35" cy="55" r="6" fill="#00adef" opacity="0.15" />
      <circle cx="35" cy="55" r="2" fill="#00adef" opacity="0.5" />
      <path d="M41 55 L60 55" stroke="#00adef" strokeWidth="1" strokeDasharray="2 2" opacity="0.3" />
      <circle cx="145" cy="75" r="6" fill="#c9a54e" opacity="0.15" />
      <circle cx="145" cy="75" r="2" fill="#c9a54e" opacity="0.5" />
      <path d="M120 75 L139 75" stroke="#c9a54e" strokeWidth="1" strokeDasharray="2 2" opacity="0.3" />
      {/* Ground */}
      <line x1="40" y1="105" x2="140" y2="105" stroke="#e5e7eb" strokeWidth="1" strokeLinecap="round" />
    </svg>
  )
}

// Empty sequences illustration
export function EmptySequenceIllustration() {
  return (
    <svg width="200" height="140" viewBox="0 0 200 140" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Email flow */}
      {[0, 1, 2, 3].map(i => (
        <g key={i} style={{ animation: `fadeIn 0.3s ease ${i * 0.15}s both` }}>
          {/* Email card */}
          <rect x={30 + i * 40} y={45 + (i % 2) * 10} width="32" height="24" rx="4" fill={i < 3 ? '#f3f0ff' : '#ecfdf5'} stroke={i < 3 ? '#ddd6fe' : '#bbf7d0'} strokeWidth="1" />
          <rect x={35 + i * 40} y={51 + (i % 2) * 10} width="14" height="2" rx="1" fill={i < 3 ? '#c4b5fd' : '#86efac'} />
          <rect x={35 + i * 40} y={56 + (i % 2) * 10} width="20" height="1.5" rx="0.75" fill={i < 3 ? '#e9e5ff' : '#d1fae5'} />
          <rect x={35 + i * 40} y={60 + (i % 2) * 10} width="16" height="1.5" rx="0.75" fill={i < 3 ? '#e9e5ff' : '#d1fae5'} />
          {/* Arrow between cards */}
          {i < 3 && <path d={`M${62 + i * 40} ${57 + (i % 2) * 10} L${70 + i * 40} ${57 + ((i + 1) % 2) * 10}`} stroke="#c4b5fd" strokeWidth="1.5" strokeLinecap="round" markerEnd="url(#arrowhead)" />}
        </g>
      ))}
      {/* Check mark on last */}
      <circle cx={46 + 3 * 40} cy={42 + 10} r="6" fill="#1D9E75" />
      <text x={46 + 3 * 40} y={45 + 10} textAnchor="middle" fill="white" fontSize="8" fontWeight="bold">✓</text>
      {/* Day labels */}
      <text x="46" y="85" textAnchor="middle" fill="#9ca3af" fontSize="8">Day 0</text>
      <text x="86" y="95" textAnchor="middle" fill="#9ca3af" fontSize="8">Day 3</text>
      <text x="126" y="85" textAnchor="middle" fill="#9ca3af" fontSize="8">Day 7</text>
      <text x="166" y="95" textAnchor="middle" fill="#1D9E75" fontSize="8" fontWeight="500">Reply!</text>
      {/* Lightning bolt */}
      <path d="M96 20 L92 30 L98 30 L94 40" stroke="#c9a54e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" style={{ animation: 'pulse-soft 2s infinite' }} />
      <defs>
        <marker id="arrowhead" markerWidth="6" markerHeight="4" refX="5" refY="2" orient="auto">
          <polygon points="0 0, 6 2, 0 4" fill="#c4b5fd" />
        </marker>
      </defs>
    </svg>
  )
}

// Success / celebration illustration
export function CelebrationIllustration() {
  return (
    <svg width="120" height="100" viewBox="0 0 120 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="60" cy="50" r="28" fill="#f3f0ff" />
      <circle cx="60" cy="50" r="20" fill="#5a1890" opacity="0.1" />
      <text x="60" y="57" textAnchor="middle" fontSize="28">🎉</text>
      {/* Confetti */}
      {[
        { x: 25, y: 20, c: '#5a1890', d: 0 },
        { x: 90, y: 15, c: '#00adef', d: 0.2 },
        { x: 15, y: 60, c: '#c9a54e', d: 0.4 },
        { x: 95, y: 65, c: '#1D9E75', d: 0.6 },
        { x: 40, y: 10, c: '#dc2626', d: 0.1 },
        { x: 80, y: 80, c: '#5a1890', d: 0.3 },
      ].map((p, i) => (
        <rect key={i} x={p.x} y={p.y} width="4" height="4" rx="1" fill={p.c} opacity="0.6"
          style={{ animation: `float 2s ease-in-out ${p.d}s infinite`, transformOrigin: `${p.x + 2}px ${p.y + 2}px` }} />
      ))}
      <style>{`@keyframes float { 0%, 100% { transform: translateY(0) rotate(0deg); } 50% { transform: translateY(-6px) rotate(15deg); } }`}</style>
    </svg>
  )
}

// KEEP Framework visual
export function KEEPIllustration({ scores }: { scores?: { k: number; e: number; ex: number; p: number } }) {
  const s = scores || { k: 4, e: 3, ex: 5, p: 2 }
  const dims = [
    { label: 'K', score: s.k, color: '#5a1890', angle: -45 },
    { label: 'E', score: s.e, color: '#00adef', angle: 45 },
    { label: 'E', score: s.ex, color: '#c9a54e', angle: 135 },
    { label: 'P', score: s.p, color: '#1D9E75', angle: 225 },
  ]

  return (
    <svg width="120" height="120" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Background ring */}
      <circle cx="60" cy="60" r="45" fill="none" stroke="#f3f4f6" strokeWidth="8" />
      {/* Score arcs */}
      {dims.map((d, i) => {
        const circumference = 2 * Math.PI * 45
        const quarter = circumference / 4
        const filled = (d.score / 5) * quarter
        return (
          <circle key={i} cx="60" cy="60" r="45" fill="none" stroke={d.color} strokeWidth="8"
            strokeDasharray={`${filled} ${circumference - filled}`}
            strokeDashoffset={-(i * quarter)}
            strokeLinecap="round"
            style={{ transform: 'rotate(-90deg)', transformOrigin: 'center', transition: 'stroke-dasharray 0.8s ease' }} />
        )
      })}
      {/* Center score */}
      <text x="60" y="55" textAnchor="middle" fill="#111827" fontSize="20" fontWeight="700">{s.k + s.e + s.ex + s.p}</text>
      <text x="60" y="68" textAnchor="middle" fill="#9ca3af" fontSize="9">/20</text>
    </svg>
  )
}
