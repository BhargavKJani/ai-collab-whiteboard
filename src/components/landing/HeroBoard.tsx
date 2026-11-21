/** Decorative animated board used in the landing hero (pure SVG + CSS, no JS). */
export function HeroBoard() {
  return (
    <div className="relative mx-auto mt-16 max-w-5xl">
      <div className="absolute -inset-8 -z-10 rounded-[40px] bg-gradient-to-r from-cyan-500/20 via-violet-500/20 to-fuchsia-500/20 blur-3xl animate-glow" />
      <div className="glass overflow-hidden rounded-3xl">
        <div className="flex items-center gap-2 border-b border-white/10 px-4 py-2.5">
          <span className="h-2.5 w-2.5 rounded-full bg-red-400/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-400/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/70" />
          <span className="ml-3 rounded-md bg-white/5 px-2 py-0.5 font-mono text-[11px] text-slate-400">collab.board/b/sprint-retro</span>
          <div className="ml-auto flex -space-x-2">
            {["#22d3ee", "#a78bfa", "#f472b6"].map((c, i) => (
              <span key={c} className="grid h-6 w-6 place-items-center rounded-full border-2 border-[#0b0f1f] text-[9px] font-bold text-slate-950" style={{ background: c }}>
                {["NO", "QF", "SP"][i]}
              </span>
            ))}
          </div>
        </div>
        <svg viewBox="0 0 960 440" className="board-bg block w-full" role="img" aria-label="Animated whiteboard preview">
          <defs>
            <pattern id="hgrid" width="24" height="24" patternUnits="userSpaceOnUse">
              <circle cx="1" cy="1" r="1" fill="rgba(148,163,184,0.16)" />
            </pattern>
          </defs>
          <rect width="960" height="440" fill="url(#hgrid)" />
          {/* rough sketch → clean diagram */}
          <g fill="none" strokeLinecap="round" strokeLinejoin="round">
            <path className="animate-draw" d="M70 92 C 72 70, 210 66, 222 80 C 236 96, 232 150, 216 160 C 180 170, 90 172, 74 158 C 62 140, 64 108, 72 92" stroke="#e2e8f0" strokeWidth="3" opacity="0.5" />
            <rect x="300" y="80" width="180" height="90" rx="12" stroke="#22d3ee" strokeWidth="2.5" />
            <text x="390" y="131" textAnchor="middle" fill="#a5f3fc" fontSize="18" fontFamily="sans-serif">API Gateway</text>
            <ellipse cx="640" cy="125" rx="95" ry="46" stroke="#a78bfa" strokeWidth="2.5" />
            <text x="640" y="131" textAnchor="middle" fill="#ddd6fe" fontSize="18" fontFamily="sans-serif">Auth service</text>
            <polygon points="390,230 470,280 390,330 310,280" stroke="#f472b6" strokeWidth="2.5" />
            <text x="390" y="286" textAnchor="middle" fill="#fbcfe8" fontSize="16" fontFamily="sans-serif">Cache hit?</text>
            <path d="M480 125 L545 125" stroke="#e2e8f0" strokeWidth="2" />
            <path d="M533 116 L545 125 L533 134" stroke="#e2e8f0" strokeWidth="2" />
            <path d="M390 170 L390 230" stroke="#e2e8f0" strokeWidth="2" />
            <path d="M381 218 L390 230 L399 218" stroke="#e2e8f0" strokeWidth="2" />
            <path d="M226 125 L290 125" stroke="#e2e8f0" strokeWidth="2" strokeDasharray="5 6" opacity="0.6" />
          </g>
          <text x="148" y="200" textAnchor="middle" fill="#94a3b8" fontSize="13" fontFamily="sans-serif">rough sketch</text>
          <g transform="translate(170 104)">
            <rect x="0" y="0" width="98" height="26" rx="13" fill="url(#aigrad)" />
            <text x="49" y="17" textAnchor="middle" fontSize="12" fontWeight="700" fill="#0b1020" fontFamily="sans-serif">✨ AI Tidy</text>
          </g>
          <linearGradient id="aigrad" x1="0" x2="1">
            <stop offset="0" stopColor="#22d3ee" />
            <stop offset="1" stopColor="#a78bfa" />
          </linearGradient>
          {/* sticky notes */}
          {[
            ["#fde68a", 620, 230, "Add rate limiting"],
            ["#a5f3fc", 780, 230, "Cache JWKS keys"],
            ["#fbcfe8", 700, 330, "Load test Friday"],
          ].map(([c, x, y, t]) => (
            <g key={t as string} className="animate-float" style={{ animationDelay: `${(x as number) / 300}s` }}>
              <rect x={x as number} y={y as number} width="140" height="80" rx="6" fill={c as string} />
              <text x={(x as number) + 12} y={(y as number) + 30} fontSize="14" fill="#0f172a" fontFamily="sans-serif">
                {t}
              </text>
            </g>
          ))}
          {/* live cursors */}
          <g className="animate-cursor" style={{ animationDelay: "0s" }}>
            <g transform="translate(250 260)">
              <path d="M0 0 L15 7 L8 9 L5 16 Z" fill="#22d3ee" stroke="#0b1020" />
              <rect x="14" y="14" width="70" height="20" rx="10" fill="#22d3ee" />
              <text x="49" y="28" textAnchor="middle" fontSize="11" fontWeight="700" fill="#0b1020" fontFamily="sans-serif">Neon Otter</text>
            </g>
          </g>
          <g className="animate-cursor" style={{ animationDelay: "-3s" }}>
            <g transform="translate(560 330)">
              <path d="M0 0 L15 7 L8 9 L5 16 Z" fill="#f472b6" stroke="#0b1020" />
              <rect x="14" y="14" width="78" height="20" rx="10" fill="#f472b6" />
              <text x="53" y="28" textAnchor="middle" fontSize="11" fontWeight="700" fill="#0b1020" fontFamily="sans-serif">Swift Panda</text>
            </g>
          </g>
        </svg>
      </div>
    </div>
  );
}
