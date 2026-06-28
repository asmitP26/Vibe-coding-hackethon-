import { motion } from 'framer-motion';
import { cn } from '../../lib/cn';

const VARIANTS = {
  primary:
    'bg-gradient-to-r from-brand-600 to-indigo-600 text-white shadow-glow hover:brightness-105',
  secondary:
    'bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50 shadow-sm',
  ghost: 'text-slate-600 hover:bg-slate-100',
  soft: 'bg-brand-50 text-brand-700 hover:bg-brand-100',
  dark: 'bg-slate-900 text-white hover:bg-slate-800',
  danger: 'bg-red-500 text-white hover:bg-red-600',
};

const SIZES = {
  sm: 'text-sm px-3 py-1.5 rounded-lg',
  md: 'text-sm px-4 py-2.5 rounded-xl',
  lg: 'text-base px-6 py-3 rounded-xl',
  icon: 'p-2.5 rounded-xl',
};

export default function Button({
  variant = 'primary',
  size = 'md',
  block = false,
  className,
  children,
  ...props
}) {
  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      className={cn(
        'inline-flex items-center justify-center gap-2 font-semibold transition-all',
        'disabled:pointer-events-none disabled:opacity-50',
        VARIANTS[variant],
        SIZES[size],
        block && 'w-full',
        className,
      )}
      {...props}
    >
      {children}
    </motion.button>
  );
}
