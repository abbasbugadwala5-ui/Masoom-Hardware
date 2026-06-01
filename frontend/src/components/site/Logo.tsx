'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';

export function Logo({
  size = 'md',
  variant = 'dark',
}: { size?: 'sm' | 'md' | 'lg'; variant?: 'dark' | 'light' }) {
  const dim  = size === 'sm' ? 'h-9 w-9'  : size === 'lg' ? 'h-14 w-14' : 'h-11 w-11';
  const text = size === 'sm' ? 'text-sm leading-tight' : size === 'lg' ? 'text-2xl leading-tight' : 'text-lg leading-tight';
  const titleColor = variant === 'light' ? 'text-white' : 'text-ink-950';
  const subColor   = variant === 'light' ? 'text-ink-300' : 'text-ink-500';

  return (
    <Link href="/" className="group inline-flex items-center gap-3">
      {/* Yellow hex MH icon */}
      <motion.span
        whileHover={{ rotate: -6, scale: 1.05 }}
        transition={{ type: 'spring', stiffness: 320, damping: 14 }}
        className={`relative grid ${dim} place-items-center bg-brand-500 shadow-[0_8px_24px_-12px_rgba(255,204,0,.6)]`}
        style={{ clipPath: 'polygon(25% 0, 75% 0, 100% 50%, 75% 100%, 25% 100%, 0 50%)' }}
      >
        <span className="font-display text-lg font-bold tracking-tight text-ink-950">MH</span>
      </motion.span>
      <span className="flex flex-col">
        <span className={`font-display ${text} tracking-widest ${titleColor}`}>MASOOM</span>
        <span className={`font-display ${text} -mt-1 tracking-[0.32em] ${subColor}`}>HARDWARE</span>
      </span>
    </Link>
  );
}
