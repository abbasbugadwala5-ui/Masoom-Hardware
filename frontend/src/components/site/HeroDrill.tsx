'use client';

import { motion } from 'framer-motion';

/**
 * Stylised cordless drill illustration — yellow + black industrial look,
 * meant as a placeholder until a real product photo is dropped in.
 */
export function HeroDrill() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92, rotate: -6 }}
      animate={{ opacity: 1, scale: 1, rotate: 0 }}
      transition={{ duration: 0.9, ease: [0.22, 0.7, 0.2, 1] }}
      className="relative h-full w-full"
    >
      {/* Rotating yellow halo behind the drill */}
      <motion.div
        aria-hidden
        animate={{ rotate: 360 }}
        transition={{ duration: 50, repeat: Infinity, ease: 'linear' }}
        className="absolute left-1/2 top-1/2 h-[440px] w-[440px] -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          background:
            'conic-gradient(from 0deg, rgba(255,204,0,.35), transparent 40%, rgba(255,204,0,.20) 70%, transparent)',
          filter: 'blur(28px)',
        }}
      />

      {/* Floating subtle particles */}
      {[0, 1, 2, 3].map((i) => (
        <motion.span
          key={i}
          aria-hidden
          className="absolute h-2 w-2 rounded-full bg-brand-500"
          style={{
            left: `${20 + i * 18}%`,
            top:  `${15 + (i % 2) * 60}%`,
          }}
          animate={{ y: [0, -14, 0], opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 3 + i * 0.5, repeat: Infinity, ease: 'easeInOut', delay: i * 0.3 }}
        />
      ))}

      {/* The drill */}
      <motion.svg
        viewBox="0 0 520 420"
        className="relative z-10 mx-auto h-full w-full max-w-[560px] drop-shadow-2xl"
        animate={{ y: [0, -10, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
      >
        <defs>
          <linearGradient id="bodyYellow" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%"   stopColor="#FFE84D" />
            <stop offset="55%"  stopColor="#FFCC00" />
            <stop offset="100%" stopColor="#B38F00" />
          </linearGradient>
          <linearGradient id="bodyBlack" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%"   stopColor="#22222a" />
            <stop offset="100%" stopColor="#050507" />
          </linearGradient>
          <linearGradient id="chuckSteel" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%"   stopColor="#c7c7cf" />
            <stop offset="50%"  stopColor="#f4f4f6" />
            <stop offset="100%" stopColor="#7d7d86" />
          </linearGradient>
        </defs>

        {/* Battery base */}
        <path d="M170 305 h150 v95 a18 18 0 0 1 -18 18 h-114 a18 18 0 0 1 -18 -18 z" fill="url(#bodyBlack)" />
        <rect x="186" y="318" width="118" height="14" rx="3" fill="#0d0d11" stroke="#FFCC00" strokeWidth="2" opacity=".9" />
        <text x="245" y="365" textAnchor="middle" fill="#FFCC00" fontFamily="Impact, sans-serif" fontSize="22" letterSpacing="3">20V</text>

        {/* Handle */}
        <path d="M210 175 q-30 30 -30 130 h130 q0 -100 -30 -130 z" fill="url(#bodyBlack)" />
        <path d="M232 196 q-15 16 -15 95 h60 q0 -75 -15 -95 z" fill="#15151b" />

        {/* Body */}
        <path d="M150 95 h260 a30 30 0 0 1 30 30 v95 a25 25 0 0 1 -25 25 h-160 l-10 30 h-95 a30 30 0 0 1 -30 -30 v-120 a30 30 0 0 1 30 -30 z" fill="url(#bodyYellow)" />
        <path d="M150 95 h260 a30 30 0 0 1 30 30 v15 h-320 v-15 a30 30 0 0 1 30 -30 z" fill="#050507" opacity=".25" />

        {/* Brand panel */}
        <rect x="190" y="155" width="180" height="34" rx="3" fill="#0d0d11" />
        <text x="280" y="180" textAnchor="middle" fill="#FFCC00" fontFamily="Impact, sans-serif" fontSize="22" letterSpacing="6">MASOOM</text>

        {/* Vent slots */}
        {[0, 1, 2, 3, 4].map((i) => (
          <rect key={i} x={210 + i * 28} y="206" width="20" height="6" rx="2" fill="#050507" opacity=".55" />
        ))}

        {/* Trigger */}
        <path d="M220 248 q20 -18 50 -18 v22 q-25 0 -50 18 z" fill="#0d0d11" />

        {/* Chuck */}
        <rect x="436" y="135" width="42" height="64" rx="6" fill="url(#chuckSteel)" stroke="#3a3a45" strokeWidth="1.5" />
        <rect x="446" y="148" width="22" height="38" rx="2" fill="#1a1a22" />
        {/* Drill bit */}
        <polygon points="478,150 510,160 510,176 478,186" fill="#22222a" />
        <polygon points="510,160 520,168 510,176" fill="#FFCC00" />

        {/* Highlights */}
        <path d="M150 105 q140 -10 290 0" stroke="#fff8b3" strokeWidth="3" fill="none" opacity=".55" />
        <path d="M155 235 q140 8 280 0" stroke="#050507" strokeWidth="1.5" fill="none" opacity=".3" />
      </motion.svg>
    </motion.div>
  );
}
