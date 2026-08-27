import { useEffect, useRef, useState } from 'react';
import { motion, useInView, useMotionValue, useSpring, useMotionTemplate, useTransform, animate, AnimatePresence } from 'framer-motion';
import type { ReactNode } from 'react';
import { ArrowUp } from 'lucide-react';

/* ─── Animated count-up number ──────────────────────────────────── */
export const AnimatedCounter = ({
  value,
  suffix = '',
  prefix = '',
  duration = 2,
}: {
  value: number;
  suffix?: string;
  prefix?: string;
  duration?: number;
}) => {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!inView) return;
    const controls = animate(0, value, {
      duration,
      ease: 'easeOut',
      onUpdate: (latest) => setDisplay(latest),
    });
    return () => controls.stop();
  }, [inView, value, duration]);

  return (
    <span ref={ref}>
      {prefix}
      {Math.round(display).toLocaleString()}
      {suffix}
    </span>
  );
};

/* ─── Stats band with animated counters ─────────────────────────── */
const stats = [
  { value: 12000, suffix: '+', label: 'Active Members' },
  { value: 45, suffix: '+', label: 'Elite Trainers' },
  { value: 320, suffix: '+', label: 'Workout Programs' },
  { value: 98, suffix: '%', label: 'Success Rate' },
];

export const StatsBand = () => {
  return (
    <section className="relative z-20 -mt-10 md:-mt-16 mb-8 px-6">
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.7, ease: 'easeOut' }}
        className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-px overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] backdrop-blur-xl shadow-2xl"
      >
        {stats.map((s, i) => (
          <div
            key={i}
            className="relative flex flex-col items-center justify-center py-8 px-4 text-center bg-[#0B0F14]/40 group hover:bg-sky-500/[0.06] transition-colors"
          >
            <div className="text-3xl md:text-5xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-b from-white to-sky-300">
              <AnimatedCounter value={s.value} suffix={s.suffix} />
            </div>
            <div className="mt-2 text-[11px] md:text-xs font-semibold uppercase tracking-widest text-gray-400">
              {s.label}
            </div>
            <span className="absolute bottom-0 left-1/2 -translate-x-1/2 h-0.5 w-0 bg-sky-500 transition-all duration-500 group-hover:w-2/3" />
          </div>
        ))}
      </motion.div>
    </section>
  );
};

/* ─── Infinite scrolling marquee band ───────────────────────────── */
export const Marquee = ({ items }: { items: string[] }) => {
  const row = [...items, ...items];
  return (
    <div className="relative overflow-hidden border-y border-white/[0.06] bg-black/40 py-5">
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-[#0B0F14] to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-[#0B0F14] to-transparent" />
      <motion.div
        className="flex whitespace-nowrap gap-10"
        animate={{ x: ['0%', '-50%'] }}
        transition={{ duration: 22, ease: 'linear', repeat: Infinity }}
      >
        {row.map((item, i) => (
          <div key={i} className="flex items-center gap-10 text-2xl md:text-3xl font-extrabold uppercase tracking-tight">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-white/80 to-white/30">
              {item}
            </span>
            <span className="text-sky-500 text-lg">◆</span>
          </div>
        ))}
      </motion.div>
    </div>
  );
};

/* ─── Mouse-tracking spotlight card ─────────────────────────────── */
export const SpotlightCard = ({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const mouseX = useMotionValue(-200);
  const mouseY = useMotionValue(-200);
  const smoothX = useSpring(mouseX, { stiffness: 200, damping: 25 });
  const smoothY = useSpring(mouseY, { stiffness: 200, damping: 25 });

  const handleMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    mouseX.set(e.clientX - rect.left);
    mouseY.set(e.clientY - rect.top);
  };

  const handleLeave = () => {
    mouseX.set(-200);
    mouseY.set(-200);
  };

  const spotlight = useMotionTemplate`radial-gradient(320px circle at ${smoothX}px ${smoothY}px, rgba(0,168,255,0.15), transparent 70%)`;

  return (
    <div
      ref={ref}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      className={`relative overflow-hidden ${className}`}
    >
      <motion.div
        className="pointer-events-none absolute -inset-px z-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{ background: spotlight }}
      />
      {children}
    </div>
  );
};

/* ─── 3D mouse-tracking tilt wrapper ────────────────────────────── */
export const TiltCard = ({
  children,
  className = '',
  max = 12,
}: {
  children: ReactNode;
  className?: string;
  max?: number;
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useSpring(useTransform(y, [-0.5, 0.5], [max, -max]), { stiffness: 150, damping: 18 });
  const rotateY = useSpring(useTransform(x, [-0.5, 0.5], [-max, max]), { stiffness: 150, damping: 18 });

  const handleMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    x.set((e.clientX - rect.left) / rect.width - 0.5);
    y.set((e.clientY - rect.top) / rect.height - 0.5);
  };

  const handleLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      style={{ rotateX, rotateY, transformStyle: 'preserve-3d', transformPerspective: 1000 }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

/* ─── Magnetic button — pulls toward cursor ─────────────────────── */
export const MagneticButton = ({
  children,
  className = '',
  strength = 0.4,
}: {
  children: ReactNode;
  className?: string;
  strength?: number;
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const smoothX = useSpring(x, { stiffness: 250, damping: 15 });
  const smoothY = useSpring(y, { stiffness: 250, damping: 15 });

  const handleMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    x.set((e.clientX - (rect.left + rect.width / 2)) * strength);
    y.set((e.clientY - (rect.top + rect.height / 2)) * strength);
  };

  const handleLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      style={{ x: smoothX, y: smoothY }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

/* ─── Rising energy particles ───────────────────────────────────── */
export const EnergyParticles = ({ count = 26 }: { count?: number }) => {
  const particles = useRef(
    Array.from({ length: count }).map(() => ({
      left: Math.random() * 100,
      size: Math.random() * 3 + 1.5,
      delay: Math.random() * 8,
      duration: Math.random() * 8 + 8,
      drift: (Math.random() - 0.5) * 60,
    }))
  ).current;

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {particles.map((p, i) => (
        <motion.span
          key={i}
          className="absolute rounded-full bg-sky-400"
          style={{
            left: `${p.left}%`,
            width: p.size,
            height: p.size,
            bottom: -10,
            boxShadow: '0 0 8px rgba(0,168,255,0.8)',
          }}
          animate={{ y: [0, -700], x: [0, p.drift], opacity: [0, 0.8, 0] }}
          transition={{ duration: p.duration, delay: p.delay, repeat: Infinity, ease: 'easeOut' }}
        />
      ))}
    </div>
  );
};

/* ─── Word-by-word reveal for headings ──────────────────────────── */
export const RevealWords = ({
  text,
  className = '',
  delay = 0,
}: {
  text: string;
  className?: string;
  delay?: number;
}) => {
  const words = text.split(' ');
  return (
    <span className={className}>
      {words.map((word, i) => (
        <span key={i} className="inline-block overflow-hidden align-bottom">
          <motion.span
            className="inline-block"
            initial={{ y: '110%' }}
            animate={{ y: 0 }}
            transition={{ duration: 0.7, delay: delay + i * 0.08, ease: [0.33, 1, 0.68, 1] }}
          >
            {word}&nbsp;
          </motion.span>
        </span>
      ))}
    </span>
  );
};

/* ─── Scroll-to-top floating button ─────────────────────────────── */
export const ScrollToTop = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 600);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.button
          initial={{ opacity: 0, scale: 0.6, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.6, y: 20 }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.92 }}
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          aria-label="Scroll back to top"
          className="fixed bottom-24 left-5 lg:left-8 z-[55] w-12 h-12 rounded-full bg-white/5 border border-white/15 backdrop-blur-xl text-sky-400 flex items-center justify-center shadow-lg shadow-black/40 hover:border-sky-500/50 hover:text-sky-300 transition-colors"
        >
          <ArrowUp className="w-5 h-5" />
        </motion.button>
      )}
    </AnimatePresence>
  );
};
