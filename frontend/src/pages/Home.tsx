import { useState, useEffect } from 'react';
import LogoIcon from '../components/LogoIcon';
import { Link } from 'react-router-dom';
import { motion, useScroll, useTransform } from 'framer-motion';
import { Activity, Dumbbell, CalendarCheck, ShieldCheck, ArrowRight, Zap, Check, Sparkles } from 'lucide-react';
import { packageAPI, exerciseAPI } from '../api/apiService';
import ChatBot from '../components/ChatBot';


const Home = () => {
  const [packages, setPackages] = useState<any[]>([]);
  const [exercises, setExercises] = useState<any[]>([]);
  const { scrollYProgress } = useScroll();
  const y = useTransform(scrollYProgress, [0, 1], [0, 300]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [pkgRes, exRes] = await Promise.all([packageAPI.getAll(), exerciseAPI.getAll()]);
        setPackages(pkgRes.data.packages?.slice(0, 3) || []);
        setExercises(exRes.data.exercises?.slice(0, 4) || []);
      } catch (error) {
        console.error('Failed to fetch data for home page', error);
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
    <div className="bg-[#0a0a0c] text-white min-h-screen font-sans selection:bg-green-500 selection:text-black overflow-x-hidden">
      
      {/* Navbar */}
      <nav className="fixed w-full z-50 bg-[#0a0a0c]/30 backdrop-blur-lg border-b border-white/[0.03] transition-all">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group">
          <LogoIcon size="md" variant="green" />
          <span className="text-2xl brand-logo-title tracking-tight text-white flex items-center gap-2 font-extrabold">
            <span>TITAN<span className="text-green-400">FIT</span></span>
            <span className="brand-accent-badge text-xs">PRO</span>
          </span>
        </Link>
          <div className="hidden md:flex gap-10 text-sm font-semibold text-gray-400 uppercase tracking-wider">
            <a href="#features" className="hover:text-white transition-colors relative group">
              Features
              <span className="absolute -bottom-2 left-0 w-0 h-0.5 bg-green-500 transition-all group-hover:w-full" />
            </a>
            <a href="#packages" className="hover:text-white transition-colors relative group">
              Packages
              <span className="absolute -bottom-2 left-0 w-0 h-0.5 bg-green-500 transition-all group-hover:w-full" />
            </a>
            <a href="#exercises" className="hover:text-white transition-colors relative group">
              Library
              <span className="absolute -bottom-2 left-0 w-0 h-0.5 bg-green-500 transition-all group-hover:w-full" />
            </a>
          </div>
          <div className="flex gap-4">
            <Link to="/login" className="px-6 py-2.5 text-sm font-bold rounded-full hover:bg-white/10 transition-colors hidden md:block">Sign In</Link>
            <Link to="/register" className="px-6 py-2.5 text-sm font-bold bg-white text-black rounded-full hover:bg-green-400 transition-all shadow-lg hover:scale-105">Join Now</Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-24 pb-16 md:pt-32 md:pb-24 min-h-screen flex items-center justify-center overflow-hidden">
        {/* Dynamic Abstract Background */}
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
          <motion.div style={{ y }} className="absolute inset-0">
            <div className="absolute top-[10%] left-[20%] w-[500px] h-[500px] bg-green-500/20 blur-[150px] rounded-full mix-blend-screen" />
            <div className="absolute top-[40%] right-[10%] w-[600px] h-[600px] bg-emerald-600/10 blur-[150px] rounded-full mix-blend-screen" />
            <div className="absolute bottom-[-10%] left-[50%] -translate-x-1/2 w-[800px] h-[400px] bg-blue-600/10 blur-[150px] rounded-full mix-blend-screen" />
          </motion.div>
          
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#0a0a0c]/80 to-[#0a0a0c] z-10" />
        </div>
        
        <div className="max-w-7xl mx-auto px-6 relative z-20 w-full text-center">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-8 backdrop-blur-md"
          >
            <Sparkles className="w-4 h-4 text-green-400" />
            <span className="text-sm font-semibold tracking-wide text-gray-300">The Next Generation of Fitness</span>
          </motion.div>

          <motion.h1 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-5xl md:text-7xl font-extrabold leading-[1.2] mb-8 tracking-tight"
          >
            Sculpt Your Legacy <br className="hidden md:block" />
            With <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-400 via-emerald-400 to-green-600">TitanFit Pro</span>
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
            <Link to="/register" className="w-full sm:w-auto px-10 py-5 bg-gradient-to-r from-green-400 to-emerald-500 text-black font-extrabold rounded-full text-lg transition-all flex items-center justify-center gap-2 group shadow-[0_0_40px_rgba(52,211,153,0.4)] hover:shadow-[0_0_60px_rgba(52,211,153,0.6)] hover:scale-105">
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
              { icon: <Activity className="w-8 h-8 text-green-400" />, title: "Live Tracking", desc: "Log sets, reps, and rest times in a frictionless interface designed for the gym floor." },
              { icon: <ShieldCheck className="w-8 h-8 text-blue-400" />, title: "Elite Packages", desc: "Unlock professional routines tailored for hypertrophy, strength, or endurance." },
              { icon: <Dumbbell className="w-8 h-8 text-orange-400" />, title: "Rich Library", desc: "Access 100+ high-quality exercises with perfect-form video guides." },
              { icon: <CalendarCheck className="w-8 h-8 text-purple-400" />, title: "Deep Analytics", desc: "Watch your volume load and 1RMs climb with beautiful data visualizations." }
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
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-[600px] bg-green-500/5 rounded-full blur-[150px] pointer-events-none" />
        
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <motion.div {...fadeIn} className="text-center mb-24">
            <h2 className="text-4xl md:text-5xl font-extrabold mb-6 tracking-tight">Premium Training</h2>
            <p className="text-xl text-gray-400">Join thousands of athletes transforming their bodies.</p>
          </motion.div>

          <div className="grid lg:grid-cols-3 gap-8 items-center">
            {packages.map((pkg: any, idx: number) => {
              const isPopular = idx === 1 || pkg.name.toLowerCase().includes('premium');
              return (
                <motion.div 
                  key={pkg._id}
                  initial={{ opacity: 0, y: 50 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: idx * 0.15 }}
                  className={`
                    relative rounded-3xl flex flex-col overflow-hidden transition-all duration-500 group
                    ${isPopular 
                      ? 'bg-gradient-to-b from-gray-900 to-[#0a0a0c] border-2 border-green-500/50 shadow-[0_0_50px_rgba(34,197,94,0.15)] lg:-translate-y-8 z-20' 
                      : 'bg-[#111113] border border-white/5 hover:border-white/20 z-10'
                    }
                  `}
                >
                  {isPopular && (
                    <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-green-400 to-emerald-600" />
                  )}
                  {isPopular && (
                    <div className="absolute top-0 right-8 px-4 py-1.5 bg-green-500 rounded-b-lg flex items-center gap-1 shadow-lg shadow-green-500/20">
                      <Zap className="w-3 h-3 text-black fill-black" />
                      <span className="text-[10px] font-black text-black uppercase tracking-widest">Popular</span>
                    </div>
                  )}
                  
                  <div className={`p-10 pb-6 ${isPopular ? 'pt-12' : ''}`}>
                    <h3 className="text-2xl md:text-3xl font-bold mb-4">{pkg.name}</h3>
                    <div className="flex items-end gap-1 mb-6">
                      <span className="text-4xl md:text-5xl font-extrabold tracking-tight">LKR {(pkg.price || 0).toLocaleString()}</span>
                      <span className="text-gray-400 font-medium mb-2">/{pkg.duration}</span>
                    </div>
                    <p className="text-gray-400 text-sm leading-relaxed mb-8 border-b border-white/5 pb-8">{pkg.description}</p>
                    
                    <div className="space-y-4 mb-10">
                      {(pkg.benefits || pkg.features || (pkg.exercises?.map((e: any) => e.name) || [])).slice(0, 4).map((item: any, idx: number) => {
                        const label = typeof item === 'string' ? item : item.name || item;
                        return (
                          <div key={idx} className="flex items-center gap-4">
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${isPopular ? 'bg-green-500/20' : 'bg-white/5'}`}>
                              <Check className={`w-3.5 h-3.5 ${isPopular ? 'text-green-400' : 'text-gray-400'}`} strokeWidth={3} />
                            </div>
                            <span className="font-medium text-gray-300">{label}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  
                  <div className="p-10 pt-0 mt-auto">
                    <Link to="/login" className={`
                      w-full py-4 rounded-xl font-black flex items-center justify-center transition-all duration-300
                      ${isPopular 
                        ? 'bg-green-500 text-black shadow-[0_0_20px_rgba(34,197,94,0.3)] hover:shadow-[0_0_30px_rgba(34,197,94,0.5)] hover:scale-[1.02]' 
                        : 'bg-white/5 text-white hover:bg-white/10'
                      }
                    `}>
                      Get Started
                    </Link>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Exercises Preview */}
      <section id="exercises" className="py-32">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div {...fadeIn} className="flex flex-col md:flex-row justify-between items-end mb-16 gap-6">
            <div>
              <h2 className="text-4xl md:text-5xl font-extrabold mb-6 tracking-tight">Massive Library</h2>
              <p className="text-xl text-gray-400 max-w-xl">Master your form with high-quality visual guides for every muscle group.</p>
            </div>
            <Link to="/register" className="text-green-400 font-bold hover:text-green-300 flex items-center gap-2 group">
              View All Exercises <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
            </Link>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {exercises.map((ex: any, idx: number) => (
              <motion.div 
                key={ex._id}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: idx * 0.1 }}
                className="group relative rounded-3xl overflow-hidden bg-gray-900 aspect-[4/5] cursor-pointer"
              >
                <img src={ex.image} alt={ex.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 opacity-70 group-hover:opacity-40" />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
                <div className="absolute bottom-0 left-0 p-8 w-full transform translate-y-4 group-hover:translate-y-0 transition-transform duration-500">
                  <span className="px-3 py-1.5 bg-black/50 backdrop-blur-md text-white border border-white/10 text-[10px] font-bold rounded-lg mb-4 inline-block uppercase tracking-widest shadow-xl">
                    {ex.muscleGroup}
                  </span>
                  <h3 className="text-2xl font-bold text-white group-hover:text-green-400 transition-colors">{ex.name}</h3>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Footer */}
      <section className="py-32 relative overflow-hidden">
        <div className="absolute inset-0 bg-green-500/10" />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full h-[500px] bg-gradient-to-t from-green-500/20 to-transparent blur-[100px]" />
        
        <div className="max-w-4xl mx-auto px-6 relative z-10 text-center">
          <h2 className="text-4xl md:text-6xl font-extrabold mb-8 tracking-tight">Ready To Begin?</h2>
          <p className="text-xl text-gray-300 mb-12">Join today and get access to our complete platform, premium workouts, and analytics dashboard.</p>
          <Link to="/register" className="inline-flex items-center justify-center gap-3 px-12 py-6 bg-white text-black font-extrabold rounded-full text-xl hover:bg-green-400 transition-colors shadow-2xl hover:shadow-[0_0_40px_rgba(34,197,94,0.4)] hover:scale-105">
            Create Free Account <ArrowRight className="w-6 h-6" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-black py-16 border-t border-white/10 relative z-20">
        <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-4 gap-12">
          <div className="col-span-2">
            <div className="flex items-center gap-3 mb-6">
              <LogoIcon size="md" variant="green" />
              <span className="text-2xl brand-logo-title tracking-tight text-white flex items-center gap-2 font-extrabold">
                <span>TITAN<span className="text-green-400">FIT</span></span>
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
              <li><Link to="/packages" className="hover:text-green-400 transition-colors">Packages</Link></li>
              <li><Link to="/workouts" className="hover:text-green-400 transition-colors">Workouts</Link></li>
              <li><Link to="/trainers" className="hover:text-green-400 transition-colors">Trainers</Link></li>
              <li><Link to="/login" className="hover:text-green-400 transition-colors">Member Sign In</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-bold mb-4 uppercase text-xs tracking-wider">Contact Us</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li>support@titanfitpro.com</li>
              <li>+1 (800) 555-TITAN</li>
              <li>100 Fitness Boulevard</li>
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
