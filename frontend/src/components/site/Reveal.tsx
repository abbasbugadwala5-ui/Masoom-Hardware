'use client';

import { motion, type MotionProps, type Variants } from 'framer-motion';
import type { ReactNode } from 'react';

const variants: Variants = {
  hidden:  { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.22, 0.7, 0.2, 1] } },
};

interface RevealProps extends Omit<MotionProps, 'children'> {
  children: ReactNode;
  delay?: number;
  className?: string;
  as?: keyof typeof motionTags;
}

const motionTags = {
  div:  motion.div,
  span: motion.span,
  h1:   motion.h1,
  h2:   motion.h2,
  h3:   motion.h3,
  p:    motion.p,
  li:   motion.li,
  section: motion.section,
};

export function Reveal({ children, delay = 0, className, as = 'div', ...rest }: RevealProps) {
  const Tag = motionTags[as];
  return (
    <Tag
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-60px' }}
      variants={variants}
      transition={{ delay }}
      className={className}
      {...rest}
    >
      {children}
    </Tag>
  );
}

export const stagger: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
};
export const staggerItem: Variants = {
  hidden:  { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.22, 0.7, 0.2, 1] } },
};
