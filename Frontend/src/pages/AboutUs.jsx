import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldCheck, Heart, Sparkles, ArrowLeft, Target, Award,
  Cpu, Globe, Lock, Zap, Users, Code2, BookOpen, Github,
  MessageSquare, BarChart3, Brain, Server
} from 'lucide-react';
import { Card } from '../components/ui/card';

const TECH_STACK = [
  { name: 'React + Vite', category: 'Frontend', icon: <Code2 size={16} /> },
  { name: 'Tailwind CSS', category: 'Frontend', icon: <Sparkles size={16} /> },
  { name: 'Zustand', category: 'Frontend', icon: <Zap size={16} /> },
  { name: 'FastAPI', category: 'Backend', icon: <Server size={16} /> },
  { name: 'Supabase', category: 'Database', icon: <Globe size={16} /> },
  { name: 'Sentence-Transformers', category: 'AI/ML', icon: <Brain size={16} /> },
  { name: 'Google Gemini', category: 'AI/ML', icon: <Cpu size={16} /> },
  { name: 'Tesseract OCR', category: 'AI/ML', icon: <BookOpen size={16} /> },
];

const FEATURES = [
  {
    icon: <Brain size={20} className="text-emerald-600" />,
    bg: 'bg-emerald-50',
    title: 'AI-Powered Classification',
    description:
      'Tickets are automatically categorised and prioritised by a fine-tuned sentence-transformer model trained on Indian enterprise support data — no manual tagging required.',
  },
  {
    icon: <Target size={20} className="text-blue-600" />,
    bg: 'bg-blue-50',
    title: 'Self-Healing Backup Pipeline',
    description:
      'Offline sentence embeddings with Gemini failover ensure 100% classification availability even when the primary ML service is unreachable.',
  },
  {
    icon: <Award size={20} className="text-purple-600" />,
    bg: 'bg-purple-50',
    title: 'Indian Data Sovereignty',
    description:
      'All ticket summaries, OCR attachments, and database records remain under regional cloud networks. No data crosses international boundaries without explicit consent.',
  },
  {
    icon: <ShieldCheck size={20} className="text-red-600" />,
    bg: 'bg-red-50',
    title: 'Security-First Architecture',
    description:
      'AES-256-GCM encrypted backups, Pydantic-validated inputs, non-root Docker containers, environment-driven CORS, and comprehensive security headers out of the box.',
  },
  {
    icon: <BarChart3 size={20} className="text-amber-600" />,
    bg: 'bg-amber-50',
    title: 'Real-Time Analytics',
    description:
      'Admin dashboard with live ticket volume, SLA compliance rates, agent performance metrics, and Prometheus + Grafana monitoring for the FastAPI backend.',
  },
  {
    icon: <Lock size={20} className="text-slate-600" />,
    bg: 'bg-slate-50',
    title: 'Multi-Tenant Role System',
    description:
      'Three-tier access: end users, company admins, and master admin. Each role has scoped permissions with Supabase Row Level Security enforced at the database layer.',
  },
];

const OPEN_SOURCE_STATS = [
  { label: 'Open Issues', value: '160+' },
  { label: 'Contributors', value: '50+' },
  { label: 'Stars', value: '★ Growing' },
  { label: 'GSSoC 2026', value: 'Active' },
];

function StatPill({ label, value }) {
  return (
    <div className="flex flex-col items-center px-5 py-3 bg-white border border-slate-200 rounded-2xl shadow-sm">
      <span className="text-lg font-black text-emerald-600">{value}</span>
      <span className="text-[11px] font-semibold text-slate-500 mt-0.5">{label}</span>
    </div>
  );
}

function FeatureCard({ icon, bg, title, description }) {
  return (
    <Card className="p-6 rounded-[2rem] border border-slate-200 bg-white space-y-3 hover:shadow-md transition-shadow">
      <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center`}>
        {icon}
      </div>
      <h4 className="font-extrabold text-slate-800 text-sm leading-snug">{title}</h4>
      <p className="text-xs text-slate-500 leading-relaxed font-semibold">{description}</p>
    </Card>
  );
}

function TechBadge({ name, category, icon }) {
  const colors = {
    Frontend: 'bg-blue-50 text-blue-700 border-blue-200',
    Backend: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    Database: 'bg-purple-50 text-purple-700 border-purple-200',
    'AI/ML': 'bg-amber-50 text-amber-700 border-amber-200',
  };
  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-bold ${colors[category] ?? 'bg-slate-50 text-slate-700 border-slate-200'}`}>
      {icon}
      <span>{name}</span>
      <span className="opacity-60">· {category}</span>
    </div>
  );
}

export default function AboutUs() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#f6f8f7] pb-20">
      {/* Header */}
      <header className="w-full bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-[1100px] mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
          <div
            className="flex items-center gap-3 cursor-pointer"
            onClick={() => navigate('/')}
          >
            <img
              src="/favicon.png"
              alt="HELPDESK.AI Logo"
              className="w-7 h-7 object-contain"
            />
            <div className="flex items-baseline gap-2">
              <h1 className="text-xl font-black tracking-tighter text-gray-900 italic">
                HELPDESK.AI
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-black bg-emerald-100 text-emerald-800 rounded-md uppercase tracking-wider">
                About
              </span>
            </div>
          </div>
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-xs font-bold text-gray-600 hover:text-emerald-600 transition-colors bg-gray-50 hover:bg-emerald-50 px-3.5 py-2 rounded-xl border border-gray-200"
          >
            <ArrowLeft size={14} /> Back to Home
          </button>
        </div>
      </header>

      <div className="max-w-[860px] mx-auto px-4 md:px-6 mt-12 space-y-16">

        {/* Mission */}
        <section className="space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-emerald-700 text-xs font-bold">
            <Heart size={14} /> Our Mission
          </div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight leading-tight">
            Intelligent Helpdesk for<br />
            <span className="text-emerald-600">Modern Indian Businesses</span>
          </h1>
          <p className="text-slate-600 text-base leading-relaxed max-w-[640px]">
            HELPDESK.AI is an open-source, AI-powered customer support platform
            built to eliminate manual ticket triage. Our local ML pipeline classifies,
            prioritises, and routes support tickets automatically — so your team can
            focus on solving problems, not sorting them.
          </p>
          <p className="text-slate-500 text-sm leading-relaxed max-w-[640px]">
            Built with a strong bias toward Indian data sovereignty, regional
            compliance, and offline-capable AI — HELPDESK.AI works reliably even
            under constrained network conditions.
          </p>
        </section>

        {/* Stats */}
        <section className="flex flex-wrap gap-3">
          {OPEN_SOURCE_STATS.map((s) => (
            <StatPill key={s.label} {...s} />
          ))}
        </section>

        {/* Features */}
        <section className="space-y-6">
          <div className="space-y-1">
            <h2 className="text-2xl font-black text-slate-900">What We Built</h2>
            <p className="text-slate-500 text-sm">
              Core capabilities that make HELPDESK.AI different from generic helpdesk software.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {FEATURES.map((f) => (
              <FeatureCard key={f.title} {...f} />
            ))}
          </div>
        </section>

        {/* Tech Stack */}
        <section className="space-y-5">
          <div className="space-y-1">
            <h2 className="text-2xl font-black text-slate-900">Tech Stack</h2>
            <p className="text-slate-500 text-sm">
              Every dependency chosen for production reliability and developer ergonomics.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {TECH_STACK.map((t) => (
              <TechBadge key={t.name} {...t} />
            ))}
          </div>
        </section>

        {/* Open Source */}
        <section className="space-y-5">
          <h2 className="text-2xl font-black text-slate-900">Open Source &amp; GSSoC 2026</h2>
          <Card className="p-7 rounded-[2rem] border border-emerald-200 bg-emerald-50/50 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white border border-emerald-200 flex items-center justify-center">
                <Users size={18} className="text-emerald-600" />
              </div>
              <h3 className="font-extrabold text-slate-800 text-sm">
                Contributing Under GSSoC 2026
              </h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed font-semibold">
              HELPDESK.AI is an active participant in GirlScript Summer of Code 2026.
              We have 160+ open bounty issues across beginner, intermediate, advanced,
              and critical difficulty levels. Every merged PR earns GSSoC points toward
              the final leaderboard.
            </p>
            <div className="flex flex-wrap gap-3 pt-1">
              <a
                href="https://github.com/ritesh-1918/HELPDESK.AI/issues?q=is%3Aopen+label%3Agssoc%3Aapproved"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-xs font-bold text-emerald-700 hover:text-emerald-900 bg-white border border-emerald-200 px-4 py-2 rounded-xl transition-colors"
              >
                <Github size={14} /> Browse Open Issues
              </a>
              <a
                href="https://github.com/ritesh-1918/HELPDESK.AI/blob/main/CONTRIBUTING.md"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-emerald-700 bg-white border border-slate-200 px-4 py-2 rounded-xl transition-colors"
              >
                <BookOpen size={14} /> Read CONTRIBUTING.md
              </a>
            </div>
          </Card>
        </section>

        {/* Contact */}
        <section className="space-y-4">
          <h2 className="text-2xl font-black text-slate-900">Get in Touch</h2>
          <div className="flex flex-wrap gap-3">
            <a
              href="https://github.com/ritesh-1918/HELPDESK.AI/discussions"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-xs font-bold text-slate-700 hover:text-emerald-700 bg-white border border-slate-200 px-4 py-2.5 rounded-xl transition-colors"
            >
              <MessageSquare size={14} /> GitHub Discussions
            </a>
            <a
              href="https://github.com/ritesh-1918/HELPDESK.AI/issues/new/choose"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-xs font-bold text-slate-700 hover:text-emerald-700 bg-white border border-slate-200 px-4 py-2.5 rounded-xl transition-colors"
            >
              <Github size={14} /> Open an Issue
            </a>
          </div>
          <p className="text-xs text-slate-400 font-semibold">
            For security disclosures, please use the{' '}
            <a
              href="https://github.com/ritesh-1918/HELPDESK.AI/security/advisories/new"
              className="text-emerald-600 hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              private security advisory
            </a>{' '}
            instead of opening a public issue.
          </p>
        </section>

      </div>
    </div>
  );
}
