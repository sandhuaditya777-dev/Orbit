'use client';

import React, { useEffect, useRef, useState } from 'react';
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import {
  Orbit, Zap, Users, Bell, Activity, GitBranch,
  Shield, ArrowRight, CheckCircle2, Layers,
  MessageSquare, BarChart3, Lock, Globe,
} from 'lucide-react';

/* ─── Types ─────────────────────────────────────────────────── */
interface LandingPageProps {
  onLogin: () => void;
}

/* ─── Animated mesh-gradient background ─────────────────────── */
function MeshBackground() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden bg-slate-50">
      {/* Clean light base */}
      <div className="absolute inset-0 bg-gradient-to-br from-white via-slate-50 to-white" />

      {/* Single subtle warm glow behind hero */}
      <motion.div
        animate={{ scale: [1, 1.1, 1], opacity: [0.2, 0.3, 0.2] }}
        transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute -top-32 left-1/2 -translate-x-1/2 w-[700px] h-[700px] rounded-full bg-amber-200/30 blur-[120px]"
      />

      {/* Grid overlay */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(15,23,42,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(15,23,42,0.06) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />
    </div>
  );
}

/* ─── Floating task card (hero decoration) ───────────────────── */
const DEMO_TASKS = [
  { id: 1, title: 'Implement OAuth2 flow', status: 'Done', priority: 'High', color: 'bg-emerald-500', assignee: 'AR' },
  { id: 2, title: 'Realtime notifications', status: 'In Progress', priority: 'Urgent', color: 'bg-fuchsia-500', assignee: 'KP' },
  { id: 3, title: 'Dashboard analytics', status: 'To Do', priority: 'Medium', color: 'bg-blue-500', assignee: 'SM' },
  { id: 4, title: 'Rate limiting + throttle', status: 'In Review', priority: 'High', color: 'bg-amber-500', assignee: 'RN' },
];

function FloatingTaskCard({
  task,
  delay,
  x,
  y,
}: {
  task: typeof DEMO_TASKS[0];
  delay: number;
  x: number;
  y: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8, x, y }}
      animate={{
        opacity: 1,
        scale: 1,
        x: [x, x + 8, x - 5, x],
        y: [y, y - 12, y + 6, y],
      }}
      transition={{
        opacity: { delay, duration: 0.6 },
        scale:   { delay, duration: 0.6 },
        x: { delay: delay + 0.6, duration: 6, repeat: Infinity, ease: 'easeInOut' },
        y: { delay: delay + 0.6, duration: 7, repeat: Infinity, ease: 'easeInOut' },
      }}
      className="absolute pointer-events-none select-none"
      style={{ left: `${x}%`, top: `${y}%` }}
    >
      <div className="w-52 rounded-xl border border-slate-200 bg-white backdrop-blur-sm p-3 shadow-lg">
        <div className="flex items-start gap-2 mb-2">
          <div className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${task.color}`} />
          <p className="text-slate-700 text-[11px] font-medium leading-snug">{task.title}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-1.5 py-0.5 rounded text-[9px] bg-slate-100 text-slate-500 border border-slate-200">{task.status}</span>
          <span className={`px-1.5 py-0.5 rounded text-[9px] text-white ${task.color}`}>{task.priority}</span>
          <div className="ml-auto w-5 h-5 rounded-full bg-gradient-to-br from-amber-400 to-amber-500 flex items-center justify-center text-[8px] font-bold text-white">
            {task.assignee}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/* ─── Feature card ───────────────────────────────────────────── */
function FeatureCard({
  icon: Icon,
  title,
  desc,
  gradient,
  delay,
}: {
  icon: React.ElementType;
  title: string;
  desc: string;
  gradient: string;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className="group relative rounded-2xl border border-slate-200 bg-white p-6 backdrop-blur-sm hover:border-slate-300 hover:shadow-md transition-all duration-300"
    >
      {/* Glow on hover */}
      <div className={`absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${gradient} blur-xl -z-10`} />

      <div className={`inline-flex p-2.5 rounded-xl bg-gradient-to-br ${gradient} mb-4 shadow-lg`}>
        <Icon size={20} className="text-white" />
      </div>
      <h3 className="text-slate-900 font-semibold text-base mb-2">{title}</h3>
      <p className="text-slate-600 text-sm leading-relaxed">{desc}</p>
    </motion.div>
  );
}

/* ─── Tech badge ─────────────────────────────────────────────── */
function TechBadge({ label, color }: { label: string; color: string }) {
  return (
    <motion.span
      whileHover={{ scale: 1.05 }}
      className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold border ${color} cursor-default`}
    >
      {label}
    </motion.span>
  );
}

/* ─── Stat card ──────────────────────────────────────────────── */
function StatCard({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-center">
      <p className="text-4xl font-black text-white tracking-tight">{value}</p>
      <p className="text-slate-400 text-sm mt-1">{label}</p>
    </div>
  );
}

/* ─── Main Landing Page ──────────────────────────────────────── */
export default function LandingPage({ onLogin }: LandingPageProps) {
  const [typed, setTyped] = useState('');
  const words = ['Teams', 'Projects', 'Workflows', 'Sprints'];
  const [wordIdx, setWordIdx] = useState(0);
  const [deleting, setDeleting] = useState(false);
  const heroRef = useRef<HTMLElement>(null);
  const { scrollY } = useScroll();
  const heroOpacity = useTransform(scrollY, [0, 400], [1, 0]);
  const heroY = useTransform(scrollY, [0, 400], [0, -60]);

  // Typewriter effect
  useEffect(() => {
    const word = words[wordIdx];
    let timeout: ReturnType<typeof setTimeout>;

    if (!deleting && typed.length < word.length) {
      timeout = setTimeout(() => setTyped(word.slice(0, typed.length + 1)), 80);
    } else if (!deleting && typed.length === word.length) {
      timeout = setTimeout(() => setDeleting(true), 2000);
    } else if (deleting && typed.length > 0) {
      timeout = setTimeout(() => setTyped(typed.slice(0, -1)), 45);
    } else {
      setDeleting(false);
      setWordIdx((i) => (i + 1) % words.length);
    }

    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typed, deleting, wordIdx]);

  const features = [
    { icon: Zap,          title: 'Real-time Collaboration', desc: 'Socket.IO powered live updates — see task changes, comments, and presence indicators the instant they happen.', gradient: 'from-yellow-500/20 to-orange-500/20', border: 'from-yellow-500 to-orange-500' },
    { icon: Bell,         title: 'Smart Notifications',     desc: 'In-app notification system with unread badge, real-time push delivery to personal rooms, and assignee alerts.', gradient: 'from-indigo-500/20 to-violet-500/20', border: 'from-indigo-500 to-violet-500' },
    { icon: Activity,     title: 'Full Activity Log',       desc: 'Every mutation is recorded — who created, updated, or changed status — displayed in a live timeline feed.', gradient: 'from-emerald-500/20 to-teal-500/20', border: 'from-emerald-500 to-teal-500' },
    { icon: Users,        title: 'Live Presence',           desc: 'See who\'s viewing the same board with live avatar stacks and typing indicators in comment threads.', gradient: 'from-pink-500/20 to-rose-500/20', border: 'from-pink-500 to-rose-500' },
    { icon: GitBranch,    title: 'Kanban + Subtasks',       desc: 'Drag-and-drop Kanban with multi-column layouts, nested subtasks, labels, priorities, and story points.', gradient: 'from-cyan-500/20 to-sky-500/20', border: 'from-cyan-500 to-sky-500' },
    { icon: Shield,       title: 'Auth0 + Rate Limiting',   desc: 'Enterprise-grade security with Auth0 JWT authentication, role-based access, and per-route rate throttling.', gradient: 'from-violet-500/20 to-purple-500/20', border: 'from-violet-500 to-purple-500' },
  ];

  const techStack = [
    { label: 'Next.js 15',      color: 'bg-slate-800/80 border-slate-700 text-slate-300' },
    { label: 'NestJS',          color: 'bg-red-950/50 border-red-800/50 text-red-300' },
    { label: 'Socket.IO',       color: 'bg-indigo-950/50 border-indigo-800/50 text-indigo-300' },
    { label: 'MongoDB',         color: 'bg-emerald-950/50 border-emerald-800/50 text-emerald-300' },
    { label: 'Auth0',           color: 'bg-orange-950/50 border-orange-800/50 text-orange-300' },
    { label: 'TanStack Query',  color: 'bg-rose-950/50 border-rose-800/50 text-rose-300' },
    { label: 'Framer Motion',   color: 'bg-violet-950/50 border-violet-800/50 text-violet-300' },
    { label: 'Mongoose',        color: 'bg-cyan-950/50 border-cyan-800/50 text-cyan-300' },
  ];

  return (
    <div className="relative min-h-screen text-white overflow-x-hidden">
      <MeshBackground />

      {/* ── NAV ───────────────────────────────────────────────── */}
      <motion.nav
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 md:px-12 h-16 border-b border-slate-800/50 bg-slate-950/80 backdrop-blur-md"
      >
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/25">
            <Orbit className="h-4 w-4 text-white" />
          </div>
          <span className="font-extrabold text-white text-lg tracking-tight">Orbit</span>
        </div>

        <div className="hidden md:flex items-center gap-8 text-sm text-slate-400">
          <a href="#features" className="hover:text-white transition-colors">Features</a>
          <a href="#stack"    className="hover:text-white transition-colors">Stack</a>
          <a href="#stats"    className="hover:text-white transition-colors">Stats</a>
        </div>

        <motion.button
          id="landing-login-btn"
          onClick={onLogin}
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-sm font-semibold shadow-lg shadow-indigo-500/25 transition-all cursor-pointer"
        >
          Get Started
          <ArrowRight size={14} />
        </motion.button>
      </motion.nav>

      {/* ── HERO ──────────────────────────────────────────────── */}
      <motion.section
        ref={heroRef}
        style={{ opacity: heroOpacity, y: heroY }}
        className="relative pt-36 pb-24 px-6 md:px-12 text-center"
      >
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-indigo-500/30 bg-indigo-500/10 text-indigo-300 text-xs font-medium mb-8"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
          Real-time project collaboration platform
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-5xl md:text-7xl font-black leading-[1.08] tracking-tight max-w-4xl mx-auto"
        >
          Ship faster with your
          <br />
          <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-cyan-400 bg-clip-text text-transparent">
            {typed}
            <motion.span
              animate={{ opacity: [1, 0, 1] }}
              transition={{ duration: 0.8, repeat: Infinity }}
              className="inline-block w-[3px] h-[0.85em] bg-indigo-400 ml-1 align-middle"
            />
          </span>
        </motion.h1>

        {/* Sub-heading */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.35 }}
          className="mt-6 text-slate-400 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed"
        >
          Orbit is a full-stack project management suite — Kanban boards, real-time presence,
          activity logs, and smart notifications — built for modern engineering teams.
        </motion.p>

        {/* CTA buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-10"
        >
          <motion.button
            id="landing-cta-primary"
            onClick={onLogin}
            whileHover={{ scale: 1.04, boxShadow: '0 0 40px rgba(99,102,241,0.4)' }}
            whileTap={{ scale: 0.96 }}
            className="flex items-center gap-2.5 px-7 py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold text-base shadow-2xl shadow-indigo-500/30 transition-all cursor-pointer"
          >
            Launch App
            <ArrowRight size={16} />
          </motion.button>

          <a
            href="#features"
            className="flex items-center gap-2 px-7 py-3.5 rounded-xl border border-slate-700 text-slate-300 hover:text-white hover:border-slate-600 hover:bg-slate-800/40 font-medium text-base transition-all"
          >
            <Layers size={16} />
            See features
          </a>
        </motion.div>

        {/* Trust line */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9 }}
          className="flex items-center justify-center gap-2 mt-8 text-slate-600 text-xs"
        >
          <CheckCircle2 size={12} className="text-emerald-500" />
          Free to use &nbsp;·&nbsp;
          <CheckCircle2 size={12} className="text-emerald-500" />
          No credit card &nbsp;·&nbsp;
          <CheckCircle2 size={12} className="text-emerald-500" />
          Instant access
        </motion.div>

        {/* Floating task cards */}
        <div className="relative mt-16 h-64 hidden lg:block">
          {DEMO_TASKS.map((task, i) => (
            <FloatingTaskCard
              key={task.id}
              task={task}
              delay={0.6 + i * 0.15}
              x={10 + i * 22}
              y={10 + (i % 2) * 40}
            />
          ))}
        </div>
      </motion.section>

      {/* ── STATS ─────────────────────────────────────────────── */}
      <section id="stats" className="px-6 md:px-12 py-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="max-w-4xl mx-auto rounded-2xl border border-slate-800/60 bg-slate-900/50 backdrop-blur p-10 grid grid-cols-2 md:grid-cols-4 gap-8"
        >
          <StatCard value="&lt; 50ms" label="Realtime latency" />
          <StatCard value="6+"       label="Modules built" />
          <StatCard value="30+"      label="REST endpoints" />
          <StatCard value="100%"     label="TypeScript" />
        </motion.div>
      </section>

      {/* ── FEATURES ──────────────────────────────────────────── */}
      <section id="features" className="px-6 md:px-12 py-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center max-w-2xl mx-auto mb-14"
        >
          <p className="text-indigo-400 text-sm font-semibold uppercase tracking-widest mb-3">Features</p>
          <h2 className="text-3xl md:text-4xl font-black text-white">Everything your team needs</h2>
          <p className="text-slate-400 mt-4 text-base leading-relaxed">
            Production-grade engineering, not just CRUD. Every feature is built with
            scalability and real-world usage in mind.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-6xl mx-auto">
          {features.map((f, i) => (
            <FeatureCard key={f.title} {...f} gradient={f.gradient} delay={i * 0.08} />
          ))}
        </div>
      </section>

      {/* ── HOW IT WORKS ──────────────────────────────────────── */}
      <section className="px-6 md:px-12 py-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center max-w-2xl mx-auto mb-14"
        >
          <p className="text-violet-400 text-sm font-semibold uppercase tracking-widest mb-3">How it works</p>
          <h2 className="text-3xl md:text-4xl font-black text-white">From task to shipped in seconds</h2>
        </motion.div>

        <div className="max-w-3xl mx-auto flex flex-col gap-0">
          {[
            { num: '01', title: 'Create your workspace',  desc: 'Sign in with Auth0, create an organisation, and invite your team members with role-based access.', icon: Globe },
            { num: '02', title: 'Plan on the Kanban',     desc: 'Create projects, add tasks with priorities, labels, story points, and drag them across status columns.', icon: Layers },
            { num: '03', title: 'Collaborate in real-time', desc: 'Comment with @mentions, watch live activity feeds, and see presence avatars — all powered by Socket.IO.', icon: MessageSquare },
            { num: '04', title: 'Stay notified',           desc: 'Get instant in-app notifications for assignments, comments, and status changes, delivered to your personal socket room.', icon: Bell },
          ].map((step, i) => (
            <motion.div
              key={step.num}
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="flex gap-6 items-start relative pb-10 last:pb-0"
            >
              {/* Connector line */}
              {i < 3 && (
                <div className="absolute left-5 top-12 bottom-0 w-px bg-gradient-to-b from-indigo-500/40 to-transparent" />
              )}

              {/* Number circle */}
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center text-white font-black text-sm shadow-lg shadow-indigo-500/25 relative z-10">
                {i + 1}
              </div>

              <div className="pt-1.5">
                <h3 className="text-white font-semibold text-lg mb-1">{step.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{step.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── TECH STACK ────────────────────────────────────────── */}
      <section id="stack" className="px-6 md:px-12 py-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center max-w-2xl mx-auto mb-10"
        >
          <p className="text-cyan-400 text-sm font-semibold uppercase tracking-widest mb-3">Tech Stack</p>
          <h2 className="text-3xl md:text-4xl font-black text-white">Built with best-in-class tools</h2>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="flex flex-wrap justify-center gap-3 max-w-3xl mx-auto"
        >
          {techStack.map((t, i) => (
            <motion.div
              key={t.label}
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.3, delay: i * 0.06 }}
            >
              <TechBadge {...t} />
            </motion.div>
          ))}
        </motion.div>

        {/* Architecture diagram placeholder */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-16 max-w-4xl mx-auto rounded-2xl border border-slate-800/60 bg-slate-900/40 backdrop-blur p-8"
        >
          <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-8 text-center">
            {[
              { label: 'Next.js Client',   sub: 'React + TanStack Query', color: 'from-slate-800 to-slate-700',          icon: Globe },
              { label: 'NestJS API',       sub: 'REST + Socket.IO',       color: 'from-red-950/60 to-red-900/40',        icon: Zap },
              { label: 'MongoDB Atlas',    sub: 'Mongoose ODM',            color: 'from-emerald-950/60 to-emerald-900/40', icon: BarChart3 },
            ].map((layer, i) => (
              <React.Fragment key={layer.label}>
                <motion.div
                  whileHover={{ scale: 1.04 }}
                  className={`w-full md:w-48 rounded-xl border border-slate-800/60 bg-gradient-to-br ${layer.color} p-5 text-center cursor-default`}
                >
                  <layer.icon size={24} className="mx-auto text-slate-400 mb-3" />
                  <p className="text-white font-semibold text-sm">{layer.label}</p>
                  <p className="text-slate-500 text-xs mt-1">{layer.sub}</p>
                </motion.div>
                {i < 2 && (
                  <div className="flex items-center justify-center">
                    <ArrowRight size={20} className="text-slate-600 rotate-90 md:rotate-0" />
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>
        </motion.div>
      </section>

      {/* ── CTA SECTION ───────────────────────────────────────── */}
      <section className="px-6 md:px-12 py-24">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="max-w-3xl mx-auto text-center rounded-3xl border border-indigo-500/20 bg-gradient-to-br from-indigo-950/60 via-slate-900/80 to-violet-950/40 p-14 relative overflow-hidden"
        >
          {/* Glow */}
          <div className="absolute inset-0 -z-10">
            <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-64 h-64 rounded-full bg-indigo-500/20 blur-[80px]" />
          </div>

          <div className="inline-flex p-3 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 mb-6 shadow-xl shadow-indigo-500/30 mx-auto">
            <Orbit size={32} className="text-white" />
          </div>

          <h2 className="text-4xl md:text-5xl font-black text-white mb-4">
            Ready to launch?
          </h2>
          <p className="text-slate-400 text-lg leading-relaxed mb-10">
            Join Orbit and experience project management the way it should be —
            fast, real-time, and built for developers.
          </p>

          <motion.button
            id="landing-cta-final"
            onClick={onLogin}
            whileHover={{ scale: 1.05, boxShadow: '0 0 60px rgba(99,102,241,0.5)' }}
            whileTap={{ scale: 0.96 }}
            className="inline-flex items-center gap-3 px-10 py-4 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold text-lg shadow-2xl shadow-indigo-500/40 transition-all cursor-pointer"
          >
            <Lock size={18} />
            Sign in with Auth0
            <ArrowRight size={18} />
          </motion.button>

          <p className="mt-4 text-slate-600 text-xs">
            Secured by Auth0 · JWT-based · Role-based access control
          </p>
        </motion.div>
      </section>

      {/* ── FOOTER ────────────────────────────────────────────── */}
      <footer className="px-6 md:px-12 py-8 border-t border-slate-800/50">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-slate-600 text-xs">
          <div className="flex items-center gap-2">
            <div className="h-5 w-5 rounded bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
              <Orbit className="h-3 w-3 text-white" />
            </div>
            <span className="font-semibold text-slate-400">Orbit</span>
            <span>— Real-time project collaboration</span>
          </div>
          <p>Built with Next.js, NestJS, MongoDB &amp; Socket.IO</p>
        </div>
      </footer>
    </div>
  );
}
