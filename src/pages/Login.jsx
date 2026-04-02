import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, User, ShieldAlert, ArrowRight, Loader2, Eye, EyeOff } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

export default function Login() {
  const [activeTab, setActiveTab] = useState('Public'); // 'Public' or 'Official'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    setTimeout(() => {
      setLoading(false);
      if (activeTab === 'Official') {
        if (email === 'admin@city.gov' && password === 'password123') {
          localStorage.setItem('user_role', 'Admin');
          toast.success("Redirecting to Admin Portal...");
          navigate('/admin-dashboard');
        } else {
          toast.error("Invalid Admin Credentials. Try admin@city.gov / password123");
        }
      } else {
        if (email === 'citizen@email.com' && password === 'password123') {
          localStorage.setItem('user_role', 'Public');
          toast.success("Welcome to Citizen Portal.");
          navigate('/public-dashboard');
        } else {
          toast.error("Invalid Citizen Credentials. Try citizen@email.com / password123");
        }
      }
    }, 800);
  };

  return (
    <div className="min-h-screen mesh-gradient flex items-center justify-center p-4 font-sans relative overflow-hidden">
      {/* Background Orbs for extra depth */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-blue-400/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-purple-400/10 blur-[120px] pointer-events-none" />

      <Toaster position="top-center" />
      
      <div className="max-w-md w-full glass rounded-[2.5rem] p-10 shadow-2xl border border-white/60 relative z-10 animate-in fade-in zoom-in duration-700">
        
        {/* Header */}
        <div className="text-center mb-10">
          <div className="mx-auto w-16 h-16 bg-primary-600 rounded-2xl flex items-center justify-center mb-6 shadow-xl shadow-primary-500/30 transform -rotate-3 hover:rotate-0 transition-transform duration-300">
            <Lock className="text-white w-8 h-8" />
          </div>
          <h2 className="text-3xl font-bold tracking-tight text-neutral-900">SmartBin <span className="text-primary-600">Tracker</span></h2>
          <p className="text-neutral-500 mt-3 text-sm font-medium">Urban Waste Intelligence System</p>
        </div>

        {/* Custom Tabs */}
        <div className="flex p-1.5 bg-neutral-100/80 backdrop-blur-md rounded-2xl mb-10 border border-neutral-200/50">
          <button
            onClick={() => setActiveTab('Public')}
            className={`flex-1 flex justify-center items-center gap-2 py-3 text-sm font-semibold rounded-xl transition-all duration-300 ${
              activeTab === 'Public' 
                ? 'bg-white text-primary-600 shadow-md border border-neutral-200/30 scale-[1.02]' 
                : 'text-neutral-500 hover:text-neutral-800'
            }`}
          >
            <User className="w-4 h-4" />
            Citizen
          </button>
          <button
            onClick={() => setActiveTab('Official')}
            className={`flex-1 flex justify-center items-center gap-2 py-3 text-sm font-semibold rounded-xl transition-all duration-300 ${
              activeTab === 'Official' 
                ? 'bg-neutral-900 text-white shadow-lg shadow-neutral-900/20 scale-[1.02]' 
                : 'text-neutral-500 hover:text-neutral-800'
            }`}
          >
            <ShieldAlert className="w-4 h-4" />
            Official
          </button>
        </div>

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-6">
          <div className="group">
            <label className="block text-sm font-semibold text-neutral-700 mb-2 ml-1">Email Address</label>
            <div className="relative">
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder={activeTab === 'Official' ? "admin@city.gov" : "citizen@email.com"}
                className="w-full rounded-2xl border border-neutral-200 bg-white/50 px-5 py-4 text-sm focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 focus:bg-white transition-all outline-none group-hover:border-neutral-300"
              />
            </div>
          </div>
          
          <div className="group">
            <label className="block text-sm font-semibold text-neutral-700 mb-2 ml-1">Secret Key</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-2xl border border-neutral-200 bg-white/50 px-5 py-4 pr-14 text-sm focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 focus:bg-white transition-all outline-none group-hover:border-neutral-300"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-primary-600 transition-colors p-1"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className={`w-full group text-white rounded-2xl py-4 px-6 font-bold flex justify-center items-center transition-all duration-300 shadow-xl active:scale-[0.98] ${
              activeTab === 'Official' 
                ? 'bg-neutral-900 hover:bg-neutral-800 shadow-neutral-900/20' 
                : 'bg-primary-600 hover:bg-primary-500 shadow-primary-600/30'
            }`}
          >
            {loading ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : (
              <>
                Sign In to Portal
                <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>
        </form>

      </div>
      

    </div>
  );
}
