import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Shield, ChevronRight, Eye, Activity, Globe, FileText, UserCheck, Flame, AlertTriangle, Zap, Lock, ScanLine } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { ThemeToggle } from '../components/ui/ThemeToggle';

const LandingPage = () => {
  // --- Custom CSS for Animations (Grid, Glitch, Float) ---
  const styles = `
    @keyframes move-grid {
      0% { transform: perspective(500px) rotateX(60deg) translateY(0); }
      100% { transform: perspective(500px) rotateX(60deg) translateY(50px); }
    }
    @keyframes float {
      0%, 100% { transform: translateY(0px); }
      50% { transform: translateY(-20px); }
    }
    @keyframes pulse-glow {
      0%, 100% { opacity: 0.5; transform: scale(1); }
      50% { opacity: 0.8; transform: scale(1.1); }
    }
    .cyber-grid {
      position: absolute;
      width: 200%;
      height: 200%;
      top: -50%;
      left: -50%;
      background-image: 
        linear-gradient(rgba(16, 185, 129, 0.1) 1px, transparent 1px),
        linear-gradient(90deg, rgba(16, 185, 129, 0.1) 1px, transparent 1px);
      background-size: 40px 40px;
      animation: move-grid 4s linear infinite;
      z-index: 0;
      opacity: 0.3;
      mask-image: linear-gradient(to bottom, transparent 5%, black 40%, transparent 90%);
    }
    .card-3d {
      transition: transform 0.3s ease, box-shadow 0.3s ease;
      transform-style: preserve-3d;
    }
    .card-3d:hover {
      transform: translateY(-10px) scale(1.02);
      box-shadow: 0 20px 40px -15px rgba(16, 185, 129, 0.3);
    }
    .glitch-text {
      position: relative;
    }
    .glitch-text::before, .glitch-text::after {
      content: attr(data-text);
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      opacity: 0.8;
    }
    .glitch-text::before {
      color: #0ea5e9;
      z-index: -1;
      animation: glitch-anim-1 3s infinite linear alternate-reverse;
    }
    .glitch-text::after {
      color: #ef4444;
      z-index: -2;
      animation: glitch-anim-2 2s infinite linear alternate-reverse;
    }
    @keyframes glitch-anim-1 {
      0% { clip-path: inset(20% 0 80% 0); transform: translate(-2px, 1px); }
      20% { clip-path: inset(60% 0 10% 0); transform: translate(2px, -1px); }
      40% { clip-path: inset(40% 0 50% 0); transform: translate(-2px, 2px); }
      60% { clip-path: inset(80% 0 5% 0); transform: translate(2px, -2px); }
      80% { clip-path: inset(10% 0 60% 0); transform: translate(-1px, 1px); }
      100% { clip-path: inset(50% 0 30% 0); transform: translate(1px, -1px); }
    }
    @keyframes glitch-anim-2 {
      0% { clip-path: inset(10% 0 60% 0); transform: translate(2px, -1px); }
      20% { clip-path: inset(30% 0 20% 0); transform: translate(-2px, 1px); }
      40% { clip-path: inset(70% 0 10% 0); transform: translate(1px, -2px); }
      60% { clip-path: inset(20% 0 50% 0); transform: translate(-1px, 2px); }
      80% { clip-path: inset(50% 0 30% 0); transform: translate(2px, 1px); }
      100% { clip-path: inset(80% 0 5% 0); transform: translate(-2px, -1px); }
    }
  `;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 font-sans selection:bg-emerald-500/30 overflow-x-hidden">
      <style>{styles}</style>
      
      {/* --- Navigation --- */}
      <nav className="fixed top-0 w-full z-50 border-b border-slate-200 dark:border-slate-800/50 bg-slate-50 dark:bg-slate-950/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-emerald-500 font-bold text-xl tracking-tighter group cursor-pointer">
            <Shield className="w-6 h-6 fill-emerald-500/20 group-hover:rotate-12 transition-transform duration-500" />
            <span className="tracking-[0.2em]">VANISHLINK</span>
          </Link>
          <div className="flex items-center gap-6">
            <ThemeToggle />
            <Link to="/login" className="text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors relative group">
              <span>Access Terminal</span>
              <span className="absolute -bottom-1 left-0 w-0 h-px bg-emerald-500 transition-all duration-300 group-hover:w-full"></span>
            </Link>
            <Link to="/register">
              <Button className="w-auto px-5 py-2 text-xs uppercase tracking-wider bg-emerald-600 hover:bg-emerald-500 border border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.3)] hover:shadow-[0_0_25px_rgba(16,185,129,0.6)] transition-all duration-300">
                Initialize Protocol
              </Button>
            </Link>
            <Link to="/admin/login">
              <Button className="w-auto px-5 py-2 text-xs uppercase tracking-wider bg-red-600 hover:bg-red-500 border border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.3)] hover:shadow-[0_0_25px_rgba(239,68,68,0.6)] transition-all duration-300">
                [ADMIN ACCESS]
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* --- Hero Section --- */}
      <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 px-6 overflow-hidden">
        {/* Animated Cyber Grid Background */}
        <div className="absolute inset-0 pointer-events-none perspective-[1000px]">
            <div className="cyber-grid"></div>
        </div>

        {/* Floating Orbs */}
        <div className="absolute top-20 left-10 w-72 h-72 bg-emerald-500/10 rounded-full blur-[100px] animate-[pulse-glow_4s_infinite]"></div>
        <div className="absolute top-40 right-10 w-96 h-96 bg-red-600/5 rounded-full blur-[120px] animate-[pulse-glow_5s_infinite_reverse]"></div>

        <div className="max-w-5xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 text-emerald-500 text-xs font-medium mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700 backdrop-blur-sm">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
            SYSTEM OPERATIONAL V2.0
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold text-slate-900 dark:text-white tracking-tight mb-6 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-100 leading-tight">
            Intelligent Links That <br />
            <span className="glitch-text text-transparent bg-clip-text bg-linear-to-r from-emerald-400 to-cyan-500" data-text="Self-Destruct & Adapt">
              Self-Destruct & Adapt.
            </span>
          </h1>
          
          <p className="text-lg md:text-xl text-slate-600 dark:text-slate-400 mb-10 max-w-2xl mx-auto leading-relaxed animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200">
            The ultimate tool for secure communications. Create password-protected, time-sensitive links that vanish after use. Used by operatives, journalists, and privacy advocates worldwide.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300">
            <Link to="/register" className="w-full sm:w-auto">
              <Button className="h-14 px-8 text-base bg-emerald-600 hover:bg-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.4)] hover:scale-105 transition-all duration-300">
                Start Mission <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
            <a href="#features" className="w-full sm:w-auto">
              <button className="w-full sm:w-auto h-14 px-8 rounded-lg border border-slate-300 dark:border-slate-700 hover:border-emerald-500/50 hover:bg-white dark:bg-slate-900/80 text-slate-700 dark:text-slate-300 font-medium transition-all duration-300 flex items-center justify-center gap-2 group backdrop-blur-sm">
                <ScanLine className="w-4 h-4 text-emerald-500 group-hover:animate-ping" /> View Capabilities
              </button>
            </a>
          </div>
        </div>
      </section>

      {/* --- User Features Grid (3D Cards) --- */}
      <section id="features" className="py-24 px-6 bg-white dark:bg-slate-900/30 border-y border-slate-200 dark:border-slate-800/50 relative">
        {/* Decorative Lines */}
        <div className="absolute top-0 left-1/4 w-px h-full bg-linear-to-b from-transparent via-slate-800 to-transparent opacity-50"></div>
        <div className="absolute top-0 right-1/4 w-px h-full bg-linear-to-b from-transparent via-slate-800 to-transparent opacity-50"></div>

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-4 flex items-center justify-center gap-3">
              <span className="w-8 h-1 bg-emerald-500 rounded-full"></span>
              Field Agent Capabilities
              <span className="w-8 h-1 bg-emerald-500 rounded-full"></span>
            </h2>
            <p className="text-slate-600 dark:text-slate-400">Tools designed for secure, ephemeral data sharing.</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <FeatureCard 
              icon={Zap} 
              color="text-yellow-400"
              bg="bg-yellow-400/10"
              title="Instant Shortening" 
              desc="Generate compact, shareable short links from any URL in a single click. Ready for immediate deployment." 
            />
            <FeatureCard 
              icon={Flame} 
              color="text-orange-500"
              bg="bg-orange-500/10"
              title="Self-Destruct Timer" 
              desc="Set an exact timestamp. Once reached, the link incinerates itself and shows an expiry message." 
            />
            <FeatureCard 
              icon={Eye} 
              color="text-emerald-400"
              bg="bg-emerald-400/10"
              title="One-Time Access" 
              desc="Burn after reading. The link invalidates immediately after the first successful access." 
            />
            <FeatureCard 
              icon={Lock} 
              color="text-blue-400"
              bg="bg-blue-400/10"
              title="Password Protection" 
              desc="Links are hashed server-side. Visitors must enter the correct decryption key to proceed." 
            />
            <FeatureCard 
              icon={Activity} 
              color="text-purple-400"
              bg="bg-purple-400/10"
              title="Multi-Use Countdown" 
              desc="Limit access to a specific count (e.g., 5 clicks). The link auto-destroys when the limit is reached." 
            />
            <FeatureCard 
              icon={Globe} 
              color="text-cyan-400"
              bg="bg-cyan-400/10"
              title="Custom Slugs" 
              desc="Choose a human-readable alias for your links to make them memorable and brandable." 
            />
          </div>
        </div>
      </section>

      {/* --- Admin Features Grid --- */}
      <section className="py-24 px-6 relative overflow-hidden">
        {/* Subtle Red Glow for Admin Section */}
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-red-900/10 rounded-full blur-[120px]"></div>

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-4 flex items-center justify-center gap-3">
              <span className="w-8 h-1 bg-red-500 rounded-full"></span>
              Command & Control
              <span className="w-8 h-1 bg-red-500 rounded-full"></span>
            </h2>
            <p className="text-slate-600 dark:text-slate-400">Advanced tools for system administrators and moderators.</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <FeatureCard 
              icon={Shield} 
              color="text-red-500"
              bg="bg-red-500/10"
              title="Global Moderation" 
              desc="Search and manage all links. Disable or delete problematic entries instantly." 
            />
            <FeatureCard 
              icon={UserCheck} 
              color="text-indigo-400"
              bg="bg-indigo-400/10"
              title="Access Controls" 
              desc="Define roles (Regular, Premium, Admin) and assign specific feature sets." 
            />
            <FeatureCard 
              icon={FileText} 
              color="text-slate-700 dark:text-slate-300"
              bg="bg-slate-300/10"
              title="Audit Logs" 
              desc="Immutable records of all admin actions and major system events for accountability." 
            />
            <FeatureCard 
              icon={AlertTriangle} 
              color="text-yellow-500"
              bg="bg-yellow-500/10"
              title="Abuse Prevention" 
              desc="Rate-limiting and IP blacklisting to protect the infrastructure from attacks." 
            />
          </div>
        </div>
      </section>

      {/* --- Footer --- */}
      <footer className="border-t border-slate-200 dark:border-slate-800 py-12 bg-slate-50 dark:bg-slate-950 text-center relative z-10">
        <div className="max-w-7xl mx-auto px-6 flex flex-col items-center">
          <div className="flex items-center gap-2 text-emerald-500 font-bold text-lg mb-6 hover:scale-110 transition-transform duration-300">
            <Shield className="w-5 h-5" />
            <span>VANISHLINK LINK</span>
          </div>
          <p className="text-xs text-slate-600">
            © 2025 VanishLink Inc. Encrypted in transit and at rest.
          </p>
        </div>
      </footer>
    </div>
  );
};

// 3D Tilt Card Component
const FeatureCard = ({ icon: Icon, title, desc, color, bg }) => (
  <div className="card-3d p-6 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-emerald-500/30 relative overflow-hidden group">
    {/* Glow effect on hover */}
    <div className="absolute inset-0 bg-linear-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
    
    <div className={`w-14 h-14 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-center mb-4 transition-all duration-500 group-hover:scale-110 group-hover:rotate-3 ${bg}`}>
      <Icon className={`w-7 h-7 ${color}`} />
    </div>
    
    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-3 group-hover:text-emerald-400 transition-colors">{title}</h3>
    <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed relative z-10 group-hover:text-slate-700 dark:text-slate-300 transition-colors">
      {desc}
    </p>
  </div>
);

export default LandingPage;