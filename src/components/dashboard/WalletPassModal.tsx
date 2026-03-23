import React, { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
import { X, MapPin, Calendar, Clock, ChevronRight, RotateCcw, ShieldCheck, Info } from 'lucide-react';
import { BRAND_NAME } from '../../constants/brand';

interface WalletPassModalProps {
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
  };
  onClose: () => void;
}

const WalletPassModal: React.FC<WalletPassModalProps> = ({ pass, onClose }) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0.5, y: 0.5 });
  const cardRef = useRef<HTMLDivElement>(null);

  // Holographic foil effect on mouse move
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    setMousePos({ x, y });
  }, []);

  const handleMouseLeave = useCallback(() => {
    setMousePos({ x: 0.5, y: 0.5 });
  }, []);

  const foilBackground = `radial-gradient(circle at ${mousePos.x * 100}% ${mousePos.y * 100}%, 
    rgba(255,80,80,0.35) 0%, 
    rgba(255,140,0,0.2) 20%, 
    rgba(255,50,50,0.1) 40%, 
    transparent 60%)`;

  const getDayGradient = (day?: number) => {
    switch (day) {
      case 1: return 'from-red-800 via-red-700 to-rose-900';
      case 2: return 'from-red-900 via-orange-800 to-red-800';
      case 3: return 'from-rose-900 via-red-700 to-orange-800';
      default: return 'from-red-900 via-red-800 to-orange-900';
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl"
        onClick={onClose}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-6 right-6 p-3 bg-white/10 hover:bg-white/20 rounded-full transition-all border border-white/10"
        >
          <X className="w-5 h-5 text-white" />
        </button>

        {/* Pass Card Container - 3D perspective */}
        <div
          className="relative"
          style={{ perspective: '1200px' }}
          onClick={(e) => e.stopPropagation()}
        >
          <motion.div
            ref={cardRef}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            animate={{ rotateY: isFlipped ? 180 : 0 }}
            transition={{ duration: 0.7, ease: [0.4, 0, 0.2, 1] }}
            style={{ transformStyle: 'preserve-3d' }}
            className="relative w-[360px] sm:w-[400px] h-[600px] sm:h-[650px] cursor-pointer"
            onClick={() => setIsFlipped(!isFlipped)}
          >
            {/* — FRONT OF PASS — */}
            <div
              className={`absolute inset-0 rounded-3xl overflow-hidden bg-gradient-to-br ${getDayGradient(pass.day_number)} shadow-2xl shadow-red-900/50`}
              style={{ backfaceVisibility: 'hidden' }}
            >
              {/* Holographic foil overlay */}
              <div
                className="absolute inset-0 mix-blend-overlay transition-all duration-100 pointer-events-none z-10"
                style={{ background: foilBackground }}
              />

              {/* Noise texture overlay for premium feel */}
              <div className="absolute inset-0 opacity-[0.03] pointer-events-none z-10"
                style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E")', backgroundSize: '200px' }}
              />

              {/* Diagonal shine lines */}
              <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden">
                {[...Array(8)].map((_, i) => (
                  <div
                    key={i}
                    className="absolute w-[1px] bg-white/5 h-[200%] -rotate-45"
                    style={{ left: `${i * 15}%`, top: '-50%' }}
                  />
                ))}
              </div>

              {/* Content */}
              <div className="relative z-20 h-full flex flex-col p-7">
                {/* Top Header */}
                <div className="flex justify-between items-center mb-6">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-white/70" />
                    <span className="text-[11px] font-black tracking-[0.2em] text-white/70 uppercase">{BRAND_NAME} Pass</span>
                  </div>
                  {pass.day_number && (
                    <span className="text-[11px] font-black text-white bg-white/20 px-3 py-1 rounded-full tracking-widest">
                      DAY {pass.day_number}
                    </span>
                  )}
                </div>

                {/* QR Code — Center Stage */}
                <div className="flex-1 flex flex-col items-center justify-center gap-6">
                  <div className={`relative ${pass.is_used ? 'opacity-40 grayscale' : ''}`}>
                    {/* Glow halo around QR */}
                    <div className="absolute -inset-4 rounded-2xl bg-white/10 blur-xl" />
                    <div className="relative bg-white p-5 rounded-2xl shadow-[0_0_60px_rgba(255,50,50,0.3)]">
                      <QRCodeSVG
                        value={pass.pass_token}
                        size={160}
                        level="H"
                        includeMargin={false}
                      />
                    </div>
                    {pass.is_used && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="border-4 border-red-500/50 rounded-2xl px-5 py-2 bg-black/60 backdrop-blur-sm rotate-[-20deg]">
                          <span className="text-red-400 text-3xl font-black tracking-tighter">USED</span>
                        </div>
                      </div>
                    )}
                  </div>
                  <p className="text-white/40 text-[10px] font-mono tracking-wider">{pass.pass_token.slice(0, 16).toUpperCase()}</p>
                </div>

                {/* Divider */}
                <div className="flex items-center gap-3 my-4">
                  <div className="flex-1 border-t border-dashed border-white/20" />
                  <div className="w-6 h-6 bg-black rounded-full" />
                  <div className="flex-1 border-t border-dashed border-white/20" />
                </div>

                {/* Bottom Info */}
                <div className="space-y-3">
                  <h2 className="text-2xl font-black text-white tracking-tight">{pass.participant_name}</h2>
                  <p className="text-white/60 text-sm font-semibold uppercase tracking-widest">{pass.pass_type?.replace('_', ' ')} · {pass.event_name || 'Event Entry'}</p>
                  <div className="flex items-center gap-4 text-white/50 text-xs">
                    {pass.valid_date && (
                      <span className="flex items-center gap-1.5">
                        <Calendar size={12} />
                        {new Date(pass.valid_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </span>
                    )}
                    <span className="flex items-center gap-1.5">
                      <MapPin size={12} /> {pass.venue || 'Main Venue'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* — BACK OF PASS — */}
            <div
              className="absolute inset-0 rounded-3xl overflow-hidden bg-[#0d0d0d] border border-white/10 shadow-2xl"
              style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
            >
              <div className="h-full flex flex-col p-7">
                <div className="flex items-center gap-3 mb-8">
                  <button onClick={() => setIsFlipped(false)} className="p-2 bg-white/5 hover:bg-white/10 rounded-xl transition-all">
                    <RotateCcw size={16} className="text-gray-400" />
                  </button>
                  <h3 className="text-white font-bold text-lg">Pass Details & Rules</h3>
                </div>

                <div className="space-y-6 text-sm text-gray-400 flex-1 overflow-y-auto">
                  {/* Venue Details */}
                  <div className="p-5 bg-white/5 rounded-2xl border border-white/10 space-y-3">
                    <h4 className="text-white font-bold flex items-center gap-2"><MapPin size={16} className="text-red-400" /> Venue</h4>
                    <p className="font-semibold text-white">{pass.venue || 'Main Campus Auditorium'}</p>
                    <p className="text-gray-500 text-xs">Report 15 minutes before your scheduled time. Gates close 5 minutes prior.</p>
                  </div>

                  {/* Rules */}
                  <div className="p-5 bg-white/5 rounded-2xl border border-white/10 space-y-3">
                    <h4 className="text-white font-bold flex items-center gap-2"><Info size={16} className="text-orange-400" /> Important Rules</h4>
                    <ul className="space-y-2">
                      {[
                        'Present this QR code + valid photo ID at the entry gate.',
                        'This pass is non-transferable. Misuse will result in disqualification.',
                        'Electronic devices are prohibited during the performance.',
                        'Participants must be in their designated area 10 mins before start.',
                        'Contact your coordinator for any queries regarding the event.'
                      ].map((rule, i) => (
                        <li key={i} className="flex items-start gap-2 text-gray-400">
                          <ChevronRight size={14} className="text-red-500 flex-shrink-0 mt-0.5" />
                          {rule}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Validity */}
                  <div className="p-5 bg-white/5 rounded-2xl border border-white/10 space-y-2">
                    <h4 className="text-white font-bold flex items-center gap-2"><Clock size={16} className="text-green-400" /> Validity</h4>
                    <p>{pass.valid_date
                      ? new Date(pass.valid_date).toLocaleDateString('en-GB', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })
                      : 'Valid for all event days'}</p>
                  </div>
                </div>

                <p className="text-center text-white/20 text-[9px] mt-6 uppercase tracking-widest font-bold">Tap card to flip · {BRAND_NAME} Official</p>
              </div>
            </div>
          </motion.div>

          {/* Flip hint */}
          <p className="text-center text-white/30 text-xs mt-4 flex items-center justify-center gap-2">
            <RotateCcw size={12} /> Tap card to see rules &amp; venue details
          </p>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default WalletPassModal;
