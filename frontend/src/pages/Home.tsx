import { useState, useEffect } from 'react';
import LogoIcon from '../components/LogoIcon';
import { Link } from 'react-router-dom';
import { motion, useScroll, useTransform } from 'framer-motion';
import { Activity, Dumbbell, CalendarCheck, ShieldCheck, ArrowRight, Zap, Check, Sparkles, X } from 'lucide-react';
import { packageAPI, trainerAPI } from '../api/apiService';
import { Award, Star } from 'lucide-react';
import ChatBot from '../components/ChatBot';

const Home = () => {
  const [packages, setPackages] = useState<any[]>([]);
  const [trainers, setTrainers] = useState<any[]>([]);
  const [loadingTrainers, setLoadingTrainers] = useState<boolean>(true);
  const { scrollYProgress } = useScroll();
  const y = useTransform(scrollYProgress, [0, 1], [0, 300]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [pkgRes, trnRes] = await Promise.all([
          packageAPI.getAll().catch(() => ({ data: { packages: [] } })),
          trainerAPI.getAll().catch(() => ({ data: { trainers: [] } })),
        ]);
        setPackages(pkgRes.data.packages || []);
        setTrainers(trnRes.data.trainers || trnRes.data.data || []);
      } catch (error) {
        console.error('Failed to fetch data for home page', error);
      } finally {
        setLoadingTrainers(false);
      }
    };
    fetchData();
  }, []);

  const fadeIn = {
    initial: { opacity: 0, y: 30 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: "-100px" },
    transition: { duration: 0.7, ease: "easeOut" as const }
  };

  const staggerContainer = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15
      }
    }
  };

  const staggerItem = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 100 } }
  };

  return (
    <div className="bg-[#0B0F14] text-white min-h-screen font-sans selection:bg-sky-500 selection:text-black overflow-x-hidden">
      
      {/* Navbar */}
      <nav className="fixed w-full z-50 bg-[#0B0F14]/30 backdrop-blur-lg border-b border-white/[0.03] transition-all">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group">
          <LogoIcon size="md" variant="titanium" />
          <span className="text-2xl brand-logo-title tracking-tight text-white flex items-center gap-2 font-extrabold">
            <span>TITAN<span className="text-[#00A8FF]">FIT</span></span>
            <span className="brand-accent-badge text-xs">PRO</span>
          </span>
        </Link>
          <div className="hidden md:flex gap-10 text-sm font-semibold text-gray-400 uppercase tracking-wider">
            <a href="#features" className="hover:text-white transition-colors relative group">
              Features
              <span className="absolute -bottom-2 left-0 w-0 h-0.5 bg-sky-500 transition-all group-hover:w-full" />
            </a>
            <a href="#packages" className="hover:text-white transition-colors relative group">
              Packages
              <span className="absolute -bottom-2 left-0 w-0 h-0.5 bg-sky-500 transition-all group-hover:w-full" />
            </a>
            <a href="#trainers" className="hover:text-white transition-colors relative group">
              Trainers
              <span className="absolute -bottom-2 left-0 w-0 h-0.5 bg-sky-500 transition-all group-hover:w-full" />
            </a>
          </div>
          <div className="flex gap-4">
            <Link to="/login" className="px-6 py-2.5 text-sm font-bold rounded-full hover:bg-white/10 transition-colors hidden md:block">Sign In</Link>
            <Link to="/register" className="px-6 py-2.5 text-sm font-bold bg-white text-black rounded-full hover:bg-sky-400 transition-all shadow-lg hover:scale-105">Join Now</Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-24 pb-16 md:pt-32 md:pb-24 min-h-screen flex items-center justify-center overflow-hidden">
        {/* Dynamic Abstract Background */}
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
          <motion.div style={{ y }} className="absolute inset-0">
            <div className="absolute top-[10%] left-[20%] w-[500px] h-[500px] bg-sky-500/20 blur-[150px] rounded-full mix-blend-screen" />
            <div className="absolute top-[40%] right-[10%] w-[600px] h-[600px] bg-sky-600/10 blur-[150px] rounded-full mix-blend-screen" />
            <div className="absolute bottom-[-10%] left-[50%] -translate-x-1/2 w-[800px] h-[400px] bg-blue-600/10 blur-[150px] rounded-full mix-blend-screen" />
          </motion.div>
          
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#0B0F14]/80 to-[#0B0F14] z-10" />
        </div>
        
        <div className="max-w-7xl mx-auto px-6 relative z-20 w-full text-center">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-8 backdrop-blur-md"
          >
            <Sparkles className="w-4 h-4 text-sky-400" />
            <span className="text-sm font-semibold tracking-wide text-gray-300">The Next Generation of Fitness</span>
          </motion.div>

          <motion.h1 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-5xl md:text-7xl font-extrabold leading-[1.2] mb-8 tracking-tight"
          >
            Sculpt Your Legacy <br className="hidden md:block" />
            With <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 via-sky-400 to-sky-600">TitanFit Pro</span>
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="text-lg md:text-2xl text-gray-400 mb-12 leading-relaxed max-w-3xl mx-auto font-medium"
          >
            A premium digital ecosystem for athletes. Track every rep, follow elite training programs, and shatter your physical limits.
          </motion.p>

          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="flex flex-col sm:flex-row gap-5 justify-center items-center"
          >
            <Link to="/register" className="w-full sm:w-auto px-10 py-5 bg-gradient-to-r from-sky-400 to-sky-500 text-black font-extrabold rounded-full text-lg transition-all flex items-center justify-center gap-2 group shadow-[0_0_40px_rgba(52,211,153,0.4)] hover:shadow-[0_0_60px_rgba(52,211,153,0.6)] hover:scale-105">
              Start Free Trial <ArrowRight className="w-6 h-6 group-hover:translate-x-1.5 transition-transform" />
            </Link>
            <a href="#packages" className="w-full sm:w-auto px-10 py-5 bg-white/5 backdrop-blur-md border border-white/10 font-bold rounded-full text-lg hover:bg-white/10 transition-all flex items-center justify-center group">
              Explore Plans
            </a>
          </motion.div>
        </div>
      </section>



      {/* Features Section */}
      <section id="features" className="py-32 relative">
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <motion.div {...fadeIn} className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-extrabold mb-6 tracking-tight">Everything You Need</h2>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">Built with cutting-edge tools to accelerate your progress and eliminate guesswork.</p>
          </motion.div>
          
          <motion.div 
            variants={staggerContainer}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-100px" }}
            className="grid md:grid-cols-2 lg:grid-cols-4 gap-6"
          >
            {[
              { icon: <Activity className="w-8 h-8 text-sky-400" />, title: "Live Tracking", desc: "Log sets, reps, and rest times in a frictionless interface designed for the gym floor." },
              { icon: <ShieldCheck className="w-8 h-8 text-blue-400" />, title: "Elite Packages", desc: "Unlock professional routines tailored for hypertrophy, strength, or endurance." },
              { icon: <Dumbbell className="w-8 h-8 text-slate-400" />, title: "Rich Library", desc: "Access 100+ high-quality exercises with perfect-form video guides." },
              { icon: <CalendarCheck className="w-8 h-8 text-sky-400" />, title: "Deep Analytics", desc: "Watch your volume load and 1RMs climb with beautiful data visualizations." }
            ].map((feat, idx) => (
              <motion.div 
                key={idx}
                variants={staggerItem}
                whileHover={{ y: -10 }}
                className="p-8 rounded-3xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] hover:border-white/10 transition-all group backdrop-blur-xl relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="bg-black/50 border border-white/10 w-16 h-16 rounded-2xl flex items-center justify-center mb-8 group-hover:scale-110 transition-transform shadow-inner relative z-10">
                  {feat.icon}
                </div>
                <h3 className="text-2xl font-bold mb-4 relative z-10">{feat.title}</h3>
                <p className="text-gray-400 leading-relaxed relative z-10">{feat.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Packages Section */}
      <section id="packages" className="py-32 relative overflow-hidden bg-black/40">
        {/* Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-[600px] bg-sky-500/5 rounded-full blur-[150px] pointer-events-none" />
        
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <motion.div {...fadeIn} className="text-center mb-20 max-w-3xl mx-auto">
            <div className="inline-flex items-center justify-center p-3 bg-sky-500/10 rounded-2xl mb-6 ring-1 ring-sky-500/30">
              <ShieldCheck className="w-8 h-8 text-sky-400" />
            </div>
            <h2 className="text-4xl md:text-5xl font-extrabold mb-6 tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-gray-200 to-gray-400">
              Select Your Plan
            </h2>
            <p className="text-xl text-gray-400 leading-relaxed">
              Explore our fitness packages with transparent 1-on-1 Personal Trainer entitlements and workout access.
            </p>
          </motion.div>

          {/* Package Cards Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 items-stretch mb-20">
            {packages.map((pkg: any, idx: number) => {
              const isPopular = idx === 1 || pkg.name.toLowerCase().includes('premium') || pkg.name.toLowerCase().includes('pro');
              const hasPT = Boolean(
                pkg.hasPersonalTrainer === true ||
                pkg.maxPTSessions > 0 ||
                (pkg.benefits || []).some((b: string) => /trainer|1-on-1|pt/i.test(b)) ||
                /vip|pro|elite|trainer/i.test(pkg.name)
              );

              return (
                <motion.div 
                  key={pkg._id || idx}
                  initial={{ opacity: 0, y: 50 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: idx * 0.15 }}
                  className={`
                    relative rounded-3xl flex flex-col overflow-hidden transition-all duration-500 group
                    ${hasPT
                      ? 'bg-gradient-to-b from-[#161224] to-[#0c0c10] border-2 border-sky-500/40 shadow-[0_0_40px_rgba(147,51,234,0.12)] lg:-translate-y-2'
                      : isPopular 
                      ? 'bg-gradient-to-b from-gray-900 to-[#111] border-2 border-sky-500/50 shadow-[0_0_40px_rgba(34,197,94,0.15)] lg:-translate-y-2' 
                      : 'bg-[#111113] border border-white/5 hover:border-sky-500/30'
                    }
                  `}
                >
                  {/* Top Badges */}
                  {hasPT ? (
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-sky-600 to-indigo-600 rounded-b-xl flex items-center gap-1.5 shadow-lg shadow-sky-500/20 z-10">
                      <Award className="w-3.5 h-3.5 text-yellow-300" />
                      <span className="text-[10px] font-black text-white uppercase tracking-wider">Personal Trainer Included</span>
                    </div>
                  ) : isPopular ? (
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-sky-600 to-sky-400 rounded-b-xl flex items-center gap-1 shadow-lg shadow-sky-500/20 z-10">
                      <Sparkles className="w-3 h-3 text-white" />
                      <span className="text-[10px] font-black text-white uppercase tracking-wider">Most Popular</span>
                    </div>
                  ) : null}
                  
                  <div className={`p-8 pb-5 ${hasPT || isPopular ? 'pt-9' : ''}`}>
                    <h3 className="text-2xl font-bold mb-2 text-white flex items-center gap-2">
                      {pkg.name}
                      {isPopular && !hasPT && <Zap className="w-5 h-5 text-sky-400" />}
                      {hasPT && <Award className="w-5 h-5 text-sky-400" />}
                    </h3>
                    <div className="flex items-end gap-1 mb-3">
                      <span className="text-3xl font-black tracking-tight">LKR {(pkg.price || 0).toLocaleString()}</span>
                      <span className="text-gray-400 font-medium mb-1 text-xs">/{pkg.duration || '1 Month'}</span>
                    </div>
                    <p className="text-gray-400 text-xs leading-relaxed">
                      {pkg.description || 'Comprehensive gym access and structured progression.'}
                    </p>
                  </div>

                  <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-white/10 to-transparent my-1" />
                  
                  <div className="flex-1 p-8 pt-4 flex flex-col justify-between">
                    <div>
                      <h4 className="font-bold text-xs uppercase tracking-wider mb-4 text-gray-400 flex items-center gap-2">
                        Plan Features & Entitlements
                      </h4>
                      
                      <div className="space-y-3 mb-6">
                        {/* Base Gym Features */}
                        <div className="flex items-center gap-3">
                          <div className="w-4 h-4 rounded-full bg-sky-500/10 flex items-center justify-center shrink-0">
                            <Check className="w-3 h-3 text-sky-400" strokeWidth={3} />
                          </div>
                          <span className="text-gray-300 text-xs">Full Gym Floor & Equipment Access</span>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="w-4 h-4 rounded-full bg-sky-500/10 flex items-center justify-center shrink-0">
                            <Check className="w-3 h-3 text-sky-400" strokeWidth={3} />
                          </div>
                          <span className="text-gray-300 text-xs">Workout Library & Mobile App Tracking</span>
                        </div>

                        {/* Explicit Personal Trainer Feature */}
                        <div className="flex items-center gap-3">
                          <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${hasPT ? 'bg-sky-500/20 text-sky-400' : 'bg-red-500/10 text-red-400'}`}>
                            {hasPT ? (
                              <Check className="w-3 h-3 text-sky-400" strokeWidth={3} />
                            ) : (
                              <X className="w-3 h-3 text-red-400" strokeWidth={3} />
                            )}
                          </div>
                          <span className={`text-xs font-semibold ${hasPT ? 'text-sky-300' : 'text-gray-500 line-through'}`}>
                            {hasPT ? 'Dedicated 1-on-1 Personal Trainer' : 'Personal Trainer (Not Included)'}
                          </span>
                        </div>

                        {/* Explicit Trainer Sessions Feature */}
                        <div className="flex items-center gap-3">
                          <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${hasPT ? 'bg-sky-500/20 text-sky-400' : 'bg-red-500/10 text-red-400'}`}>
                            {hasPT ? (
                              <Check className="w-3 h-3 text-sky-400" strokeWidth={3} />
                            ) : (
                              <X className="w-3 h-3 text-red-400" strokeWidth={3} />
                            )}
                          </div>
                          <span className={`text-xs font-semibold ${hasPT ? 'text-sky-300' : 'text-gray-500 line-through'}`}>
                            {hasPT ? `${pkg.maxPTSessions || 8} 1-on-1 Trainer Sessions / Month` : 'Trainer Sessions (Not Included)'}
                          </span>
                        </div>

                        {/* Additional package benefits */}
                        {(pkg.benefits || []).filter((b: string) => !/trainer|1-on-1|pt/i.test(b)).slice(0, 2).map((item: string, bIdx: number) => (
                          <div key={bIdx} className="flex items-center gap-3">
                            <div className="w-4 h-4 rounded-full bg-sky-500/10 flex items-center justify-center shrink-0">
                              <Check className="w-3 h-3 text-sky-400" strokeWidth={3} />
                            </div>
                            <span className="text-gray-300 text-xs">{item}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    <Link
                      to="/packages"
                      className={`
                        w-full py-3.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all duration-300 relative overflow-hidden group/btn
                        ${hasPT
                          ? 'bg-gradient-to-r from-sky-600 to-indigo-600 text-white shadow-lg shadow-sky-600/30 hover:shadow-sky-600/50 hover:-translate-y-0.5'
                          : isPopular 
                          ? 'bg-gradient-to-r from-sky-500 to-sky-400 text-black shadow-[0_0_20px_rgba(34,197,94,0.3)] hover:shadow-[0_0_30px_rgba(34,197,94,0.5)] hover:-translate-y-0.5' 
                          : 'bg-white/5 text-white hover:bg-white/10 border border-white/10 hover:border-white/20'
                        }
                      `}
                    >
                      <span>{hasPT ? 'Get PT Plan' : isPopular ? 'Choose Plan' : 'Get Started'}</span>
                      <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                    </Link>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Feature Comparison Table */}
          <div className="max-w-5xl mx-auto w-full px-4 relative z-10">
            <div className="bg-[#111115]/90 border border-white/10 rounded-3xl p-6 md:p-8 shadow-2xl overflow-hidden">
              <div className="mb-6 text-center">
                <h3 className="text-xl md:text-2xl font-bold text-white mb-1">
                  Plan Entitlement Comparison
                </h3>
                <p className="text-xs text-gray-400">
                  Transparent feature breakdown. Personal Trainer access is strictly plan-entitled.
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-white/10 text-gray-400 font-bold uppercase tracking-wider">
                      <th className="py-3 px-4">Feature</th>
                      <th className="py-3 px-4 text-center">Basic / Standard</th>
                      <th className="py-3 px-4 text-center text-sky-400">Pro / VIP (PT Included)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-gray-300">
                    <tr>
                      <td className="py-3 px-4 font-semibold text-white">Full Gym Floor Access</td>
                      <td className="py-3 px-4 text-center text-sky-400 font-bold">✓ Included</td>
                      <td className="py-3 px-4 text-center text-sky-400 font-bold">✓ Included</td>
                    </tr>
                    <tr>
                      <td className="py-3 px-4 font-semibold text-white">Workout & Routine Tracking</td>
                      <td className="py-3 px-4 text-center text-sky-400 font-bold">✓ Included</td>
                      <td className="py-3 px-4 text-center text-sky-400 font-bold">✓ Included</td>
                    </tr>
                    <tr>
                      <td className="py-3 px-4 font-semibold text-white">Progress & Streak Analytics</td>
                      <td className="py-3 px-4 text-center text-sky-400 font-bold">✓ Included</td>
                      <td className="py-3 px-4 text-center text-sky-400 font-bold">✓ Included</td>
                    </tr>
                    <tr className="bg-sky-950/20">
                      <td className="py-3 px-4 font-bold text-sky-300">Dedicated 1-on-1 Personal Trainer</td>
                      <td className="py-3 px-4 text-center text-red-400 font-bold">✕ No Access</td>
                      <td className="py-3 px-4 text-center text-sky-400 font-bold">✓ Unlocked</td>
                    </tr>
                    <tr className="bg-sky-950/20">
                      <td className="py-3 px-4 font-bold text-sky-300">Included 1-on-1 PT Sessions</td>
                      <td className="py-3 px-4 text-center text-red-400 font-bold">✕ 0 Sessions</td>
                      <td className="py-3 px-4 text-center text-sky-400 font-bold">✓ 8 – 16 Sessions / Mo</td>
                    </tr>
                    <tr>
                      <td className="py-3 px-4 font-semibold text-white">Coach Slot Availability & Booking</td>
                      <td className="py-3 px-4 text-center text-red-400 font-bold">✕ Inactive</td>
                      <td className="py-3 px-4 text-center text-sky-400 font-bold">✓ Live Booking</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Meet Our Elite Personal Trainers Section */}
      <section id="trainers" className="py-32 relative bg-black/40 border-y border-white/[0.04] overflow-hidden">
        <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-sky-600/10 blur-[150px] rounded-full pointer-events-none" />
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <motion.div {...fadeIn} className="text-center mb-20">
            <span className="px-4 py-1.5 bg-sky-500/10 text-sky-400 text-xs font-bold uppercase tracking-widest rounded-full border border-sky-500/20 inline-flex items-center gap-1.5 mb-4">
              <Award className="w-3.5 h-3.5" /> Certified Fitness Coaches
            </span>
            <h2 className="text-4xl md:text-5xl font-extrabold mb-5 tracking-tight">Meet Our Elite Trainers</h2>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              Our world-class certified personal trainers craft personalized 1-on-1 programs to help you shatter your fitness limits.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {loadingTrainers ? (
              <div className="col-span-3 text-center py-12 text-gray-500 animate-pulse">
                Loading trainers...
              </div>
            ) : trainers.length > 0 ? (
              trainers.slice(0, 6).map((trainer: any, idx: number) => (
                <motion.div
                  key={trainer._id || idx}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: idx * 0.1 }}
                  className="bg-[#111115]/90 border border-white/[0.08] hover:border-sky-500/40 rounded-3xl p-6 transition-all duration-300 group hover:-translate-y-1 shadow-xl flex flex-col justify-between"
                >
                  <div>
                    {/* Trainer Avatar & Header */}
                    <div className="flex items-center gap-4 mb-5">
                      <div className="w-18 h-18 rounded-2xl bg-gradient-to-br from-sky-500/30 to-indigo-500/30 border border-sky-500/30 overflow-hidden shrink-0 flex items-center justify-center">
                        {trainer.userId?.profileImage || trainer.profileImage ? (
                          <img
                            src={trainer.userId?.profileImage || trainer.profileImage}
                            alt={trainer.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                        ) : (
                          <div className="text-xl font-black text-sky-300">
                            {(trainer.name || 'Coach').charAt(0)}
                          </div>
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="px-2.5 py-0.5 bg-sky-500/10 text-sky-400 text-[10px] font-bold uppercase rounded-md border border-sky-500/20">
                            Available for 1-on-1
                          </span>
                        </div>
                        <h3 className="text-xl font-bold text-white group-hover:text-sky-300 transition-colors">
                          {trainer.name}
                        </h3>
                        <p className="text-xs text-gray-400 font-medium">
                          {trainer.experience ? `${trainer.experience}+ Years Experience` : 'Elite Fitness Coach'}
                        </p>
                      </div>
                    </div>

                    {/* Bio */}
                    <p className="text-gray-300 text-xs leading-relaxed line-clamp-3 mb-5">
                      {trainer.bio || 'Dedicated personal coach focused on athletic performance, form correction, and targeted strength development.'}
                    </p>

                    {/* Specializations & Badges */}
                    <div className="flex flex-wrap gap-1.5 mb-6">
                      {(Array.isArray(trainer.specialization) ? trainer.specialization : [trainer.specialization || 'Strength & Conditioning']).map((spec: string, sIdx: number) => (
                        <span
                          key={sIdx}
                          className="px-2.5 py-1 bg-white/[0.04] border border-white/[0.08] text-sky-300 text-[11px] font-semibold rounded-lg"
                        >
                          {spec}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-1 text-amber-400 text-xs font-bold">
                      <Star className="w-4 h-4 fill-amber-400" />
                      <span>{trainer.rating || '5.0'}</span>
                      <span className="text-gray-500 font-normal">({trainer.reviewsCount || 10} reviews)</span>
                    </div>
                    <Link
                      to="/packages"
                      className="px-4 py-2 bg-white/5 hover:bg-sky-600 text-white font-bold text-xs rounded-xl transition-all"
                    >
                      Get PT Plan
                    </Link>
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="col-span-3 text-center py-12 text-gray-500">
                No trainers currently available.
              </div>
            )}
          </div>

          {/* Plan requirement disclaimer */}
          <div className="mt-12 text-center">
            <p className="text-xs text-gray-400 flex items-center justify-center gap-2">
              <Sparkles className="w-4 h-4 text-sky-400" />
              <span>Personal training sessions are available to members who purchase an eligible membership plan.</span>
            </p>
          </div>
        </div>
      </section>

      {/* CTA Footer */}
      <section className="py-32 relative overflow-hidden">
        <div className="absolute inset-0 bg-sky-500/10" />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full h-[500px] bg-gradient-to-t from-sky-500/20 to-transparent blur-[100px]" />
        
        <div className="max-w-4xl mx-auto px-6 relative z-10 text-center">
          <h2 className="text-4xl md:text-6xl font-extrabold mb-8 tracking-tight">Ready To Begin?</h2>
          <p className="text-xl text-gray-300 mb-12">Join today and get access to our complete platform, premium workouts, and analytics dashboard.</p>
          <Link to="/register" className="inline-flex items-center justify-center gap-3 px-12 py-6 bg-white text-black font-extrabold rounded-full text-xl hover:bg-sky-400 transition-colors shadow-2xl hover:shadow-[0_0_40px_rgba(34,197,94,0.4)] hover:scale-105">
            Create Free Account <ArrowRight className="w-6 h-6" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-black py-16 border-t border-white/10 relative z-20">
        <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-4 gap-12">
          <div className="col-span-2">
            <div className="flex items-center gap-3 mb-6">
              <LogoIcon size="md" variant="titanium" />
              <span className="text-2xl brand-logo-title tracking-tight text-white flex items-center gap-2 font-extrabold">
                <span>TITAN<span className="text-[#00A8FF]">FIT</span></span>
                <span className="brand-accent-badge text-xs">PRO</span>
              </span>
            </div>
            <p className="text-gray-400 text-sm mb-6 max-w-sm">
              Empowering individuals to achieve their ultimate fitness potential with smart tracking, expert packages, and AI coaching.
            </p>
          </div>
          <div>
            <h4 className="text-white font-bold mb-4 uppercase text-xs tracking-wider">Quick Links</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li><Link to="/packages" className="hover:text-sky-400 transition-colors">Packages</Link></li>
              <li><Link to="/workouts" className="hover:text-sky-400 transition-colors">Workouts</Link></li>
              <li><a href="#trainers" className="hover:text-sky-400 transition-colors">Trainers</a></li>
              <li><Link to="/login" className="hover:text-sky-400 transition-colors">Member Sign In</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-bold mb-4 uppercase text-xs tracking-wider">Contact Us</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li><a href="mailto:poornadanushka2@gmail.com" className="hover:text-sky-400 transition-colors">poornadanushka2@gmail.com</a></li>
              <li><a href="tel:0761137931" className="hover:text-sky-400 transition-colors">0761137931</a></li>
              <li>Gampaha</li>
            </ul>
          </div>
        </div>
        <div className="border-t border-white/5 pt-8 text-center text-xs text-gray-500">
          <p>&copy; {new Date().getFullYear()} TitanFit Pro. All rights reserved.</p>
          <div className="flex gap-6 justify-center mt-4">
            <span className="hover:text-white cursor-pointer transition-colors">Privacy Policy</span>
            <span className="hover:text-white cursor-pointer transition-colors">Terms of Service</span>
          </div>
        </div>
      </footer>

      {/* FitBot — public chatbot, personal queries prompt login */}
      <ChatBot isPublic />

    </div>
  );
};

export default Home;
