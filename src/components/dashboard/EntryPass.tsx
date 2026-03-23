import React from 'react';
import { motion, useMotionValue, useTransform, useSpring } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
import { 
  Calendar, 
  MapPin, 
  User, 
  ShieldCheck, 
  Share2,
  Wallet,
  Navigation,
  Activity
} from 'lucide-react';

interface EntryPassProps {
  pass: {
    pass_token: string;
    pass_type: string;
    participant_name: string;
    created_at: string;
    valid_date?: string;
    venue?: string;
    event_name?: string;
    day_number?: number;
    is_used?: boolean;
    scanned_at?: string;
  };
}

const EntryPass: React.FC<EntryPassProps> = ({ pass }) => {
  const downloadPass = () => {
    window.print();
  };

  // Theme based on day
  const getDayTheme = (day: number) => {
    switch (day) {
      case 1: return "from-red-600 via-orange-500 to-red-400";
      case 2: return "from-red-700 via-red-500 to-orange-600";
      case 3: return "from-orange-600 via-yellow-500 to-red-500";
      default: return "from-red-600 via-orange-600 to-red-400";
    }
  };

  const getDayLabel = (day: number) => `DAY ${day}`;
  const theme = getDayTheme(pass.day_number || 1);

  // Indian Standard Time is UTC+5:30
  const now = new Date();
  const istDate = new Date(now.getTime() + (5.5 * 60 * 60 * 1000));
  const todayStr = istDate.toISOString().split('T')[0];
  
  const isExpired = pass.valid_date ? todayStr > pass.valid_date : false;
  const isUpcoming = pass.valid_date ? todayStr < pass.valid_date : false;
  const isUsed = pass.is_used || !!pass.scanned_at;

  // Holographic 3D Tilt Effect
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const mouseXSpring = useSpring(x);
  const mouseYSpring = useSpring(y);

  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ["17.5deg", "-17.5deg"]);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ["-17.5deg", "17.5deg"]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement, globalThis.MouseEvent>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const xPct = mouseX / width - 0.5;
    const yPct = mouseY / height - 0.5;
    x.set(xPct);
    y.set(yPct);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        rotateY,
        rotateX,
        transformStyle: "preserve-3d",
      }}
      className={`relative group w-full max-w-md mx-auto [perspective:1000px] ${(isUsed || isExpired || isUpcoming) ? 'opacity-60 grayscale-[0.5]' : ''}`}
    >
      {/* Premium Glow Effect */}
      <div className={`absolute -inset-1 bg-gradient-to-r ${theme} rounded-3xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200`}></div>
      
      <div 
        style={{ transform: "translateZ(30px)", transformStyle: "preserve-3d" }}
        className="relative bg-[#0d0d0d]/95 backdrop-blur-2xl border border-white/10 rounded-3xl overflow-hidden shadow-2xl"
      >
        {/* Top Header */}
        <div className={`bg-gradient-to-r ${theme} opacity-20 absolute top-0 left-0 right-0 h-1`}></div>
        <div className="px-6 py-5 flex justify-between items-center border-b border-white/5 bg-white/[0.02]">
          <div className="flex items-center gap-2">
            <ShieldCheck className={`w-5 h-5 ${isUsed ? 'text-red-500' : isExpired ? 'text-orange-500' : isUpcoming ? 'text-cyan-500' : 'text-green-400'}`} />
            <span className="text-white font-bold tracking-widest text-[10px] uppercase">
              {isUsed ? 'Consumed Pass' : isExpired ? 'Expired Pass' : isUpcoming ? 'Upcoming Pass' : 'Official Entry Pass'}
            </span>
          </div>
          {pass.day_number && (
            <div className={`px-3 py-1 bg-gradient-to-r ${theme} rounded-full text-[10px] text-white font-black tracking-tighter uppercase shadow-lg shadow-black/20`}>
              {getDayLabel(pass.day_number)}
            </div>
          )}
        </div>

        {/* Pass Content */}
        <div className="p-8 space-y-6 relative">
          {/* Watermarks */}
          {isUsed && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-50">
              <motion.div 
                initial={{ scale: 2, opacity: 0 }}
                animate={{ scale: 1, opacity: 1, rotate: -25 }}
                className="border-8 border-red-500/30 px-8 py-4 rounded-3xl backdrop-blur-sm"
              >
                <div className="text-red-500/50 text-6xl font-black uppercase tracking-tighter">USED</div>
                <div className="text-red-500/40 text-[10px] text-center font-bold tracking-widest uppercase mt-2">
                  {pass.scanned_at ? new Date(pass.scanned_at).toLocaleString() : 'SCANNED'}
                </div>
              </motion.div>
            </div>
          )}

          {isExpired && !isUsed && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-50">
              <motion.div 
                initial={{ scale: 2, opacity: 0 }}
                animate={{ scale: 1, opacity: 1, rotate: 15 }}
                className="border-8 border-orange-500/30 px-8 py-4 rounded-3xl backdrop-blur-sm"
              >
                <div className="text-orange-500/50 text-5xl font-black uppercase tracking-tighter">EXPIRED</div>
                <div className="text-orange-500/40 text-[10px] text-center font-bold tracking-widest uppercase mt-2">
                  VALID UNTIL {pass.valid_date}
                </div>
              </motion.div>
            </div>
          )}

          {isUpcoming && !isUsed && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-50">
              <motion.div 
                initial={{ scale: 2, opacity: 0 }}
                animate={{ scale: 1, opacity: 1, rotate: -15 }}
                className="border-8 border-cyan-500/30 px-8 py-4 rounded-3xl backdrop-blur-sm"
              >
                <div className="text-cyan-500/50 text-5xl font-black uppercase tracking-tighter">UPCOMING</div>
                <div className="text-cyan-500/40 text-[10px] text-center font-bold tracking-widest uppercase mt-2">
                  VALID FROM {pass.valid_date}
                </div>
              </motion.div>
            </div>
          )}

          {/* Main Info */}
          <div className="text-center">
            <motion.h3 
              className="text-4xl font-black text-white mb-2 tracking-tight line-clamp-1"
            >
              {pass.participant_name}
            </motion.h3>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/5 rounded-lg border border-white/10">
              <User className="w-3 h-3 text-red-400" />
              <p className="text-red-400 text-[10px] font-bold tracking-[0.3em] uppercase">
                {pass.pass_type.replace('_', ' ')}
              </p>
            </div>
          </div>

          {/* QR Code Container */}
          <div className="relative flex justify-center py-2">
            <div className={`absolute inset-0 bg-gradient-to-r ${theme} opacity-10 blur-3xl rounded-full scale-75`}></div>
            <div className={`relative bg-white p-5 rounded-[2rem] shadow-2xl transform rotate-1 group-hover:rotate-0 transition-transform duration-500 overflow-hidden ${isUsed || isExpired || isUpcoming ? 'opacity-40' : ''}`}>
              <QRCodeSVG 
                value={pass.pass_token} 
                size={180}
                level="H"
                includeMargin={false}
              />
              {/* Scan Guide corner marks */}
              <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-black/10 m-2"></div>
              <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-black/10 m-2"></div>
              <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-black/10 m-2"></div>
              <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-black/10 m-2"></div>
            </div>
          </div>

          {/* Pass Details Footer */}
          <div className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className={`bg-white/5 rounded-2xl p-4 border border-white/5 group-hover:bg-white/[0.08] transition-colors ${isExpired ? 'border-orange-500/20' : isUpcoming ? 'border-cyan-500/20' : ''}`}>
                <div className="flex items-center gap-2 text-white/30 mb-2 text-[9px] uppercase font-bold tracking-widest">
                  <Calendar className={`w-3 h-3 ${isExpired ? 'text-orange-500' : isUpcoming ? 'text-cyan-500' : 'text-red-400'}`} />
                  <span>Validity Date</span>
                </div>
                <div className={`text-white text-xs font-bold font-mono ${isExpired ? 'text-orange-400' : isUpcoming ? 'text-cyan-400' : ''}`}>
                  {pass.valid_date ? new Date(pass.valid_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Varies'}
                </div>
              </div>
              <div className="bg-white/5 rounded-2xl p-4 border border-white/5 group-hover:bg-white/[0.08] transition-colors">
                <div className="flex items-center gap-2 text-white/30 mb-2 text-[9px] uppercase font-bold tracking-widest">
                  <MapPin className="w-3 h-3 text-orange-400" />
                  <span>Venue Access</span>
                </div>
                <div className="text-white text-xs font-bold">{pass.venue || 'Main Campus'}</div>
              </div>
            </div>

            <div className="flex items-center justify-between px-2 text-[8px] text-white/20 uppercase tracking-[0.2em] font-bold">
              <span>Token: {pass.pass_token.slice(0, 8)}...</span>
              <span className={isUsed ? 'text-red-500/40' : isExpired ? 'text-orange-500/40' : isUpcoming ? 'text-cyan-500/40' : 'text-green-500/40'}>
                {isUsed ? 'CONSUMED' : isExpired ? 'EXPIRED' : isUpcoming ? 'UPCOMING' : 'ACTIVE'}
              </span>
            </div>
          </div>
        </div>

        {/* Advanced Functional Buttons */}
        <div className="grid grid-cols-2 lg:grid-cols-4 border-t border-white/5 bg-white/[0.02] divide-x divide-y lg:divide-y-0 divide-white/5">
          <button 
            disabled={pass.is_used}
            className="py-4 px-2 flex flex-col items-center justify-center gap-1.5 hover:bg-white/5 transition-all text-white/50 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <Wallet className="w-4 h-4 text-emerald-400" />
            <span className="text-[9px] font-bold uppercase tracking-wider">Add to Wallet</span>
          </button>
          <button 
            className="py-4 px-2 flex flex-col items-center justify-center gap-1.5 hover:bg-white/5 transition-all text-white/50 hover:text-white"
          >
            <Navigation className="w-4 h-4 text-cyan-400" />
            <span className="text-[9px] font-bold uppercase tracking-wider">Directions</span>
          </button>
          <button 
            className="py-4 px-2 flex flex-col items-center justify-center gap-1.5 hover:bg-white/5 transition-all text-white/50 hover:text-white"
          >
            <Activity className="w-4 h-4 text-orange-400" />
            <span className="text-[9px] font-bold uppercase tracking-wider">Gate Status</span>
          </button>
          <button 
            onClick={downloadPass}
            className="py-4 px-2 flex flex-col items-center justify-center gap-1.5 hover:bg-white/5 transition-all text-white/50 hover:text-white"
          >
            <Share2 className="w-4 h-4 text-purple-400" />
            <span className="text-[9px] font-bold uppercase tracking-wider">Share Pass</span>
          </button>
        </div>
      </div>

    </motion.div>
  );
};

export default EntryPass;
