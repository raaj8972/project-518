import React from 'react';
import { useTheme } from '../../context/ThemeContext';
import { Cpu, Layers, Zap, Database, Shield, Workflow } from 'lucide-react';

export const CyberpunkThemeOverlay: React.FC = React.memo(() => {
  const { theme } = useTheme();
  
  // Apply globally or just for specific theme slot
  if (theme !== 'bollywood' && theme !== 'cyberpunk') return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden mix-blend-screen" aria-hidden="true">
      {/* Cyberpunk Floating Tech Icons Background */}
      <div className="absolute inset-0 opacity-[0.03]">
         <div className="absolute top-[10%] left-[5%] animate-pulse will-change-transform"><Cpu color="#22d3ee" size={120} /></div>
         <div className="absolute bottom-[20%] right-[10%] animate-bounce will-change-transform" style={{ animationDuration: '4s' }}><Database color="#d946ef" size={80} /></div>
         <div className="absolute top-[30%] right-[15%] animate-pulse will-change-transform" style={{ animationDuration: '3s' }}><Layers color="#22d3ee" size={100} /></div>
         <div className="absolute bottom-[10%] left-[15%] animate-pulse will-change-transform" style={{ animationDuration: '5s' }}><Zap color="#d946ef" size={90} /></div>
         <div className="absolute top-[50%] left-[30%] animate-bounce will-change-transform" style={{ animationDuration: '6s' }}><Shield color="#22d3ee" size={60} /></div>
         <div className="absolute top-[70%] right-[30%] animate-bounce will-change-transform" style={{ animationDuration: '7s' }}><Workflow color="#d946ef" size={70} /></div>
      </div>
      
      {/* Optimized Data Port / Circuit Sidebars (Reduced node counts for better FPS) */}
      <div className="absolute left-0 top-0 bottom-0 w-[2vw] max-w-[20px] flex flex-col justify-between py-10 opacity-[0.2] bg-cyan-950/20 border-r border-cyan-500/30 backdrop-blur-sm z-10">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={`left-node-${i}`} className="w-2 h-2 bg-cyan-400 rounded-full mx-auto shadow-[0_0_8px_rgba(34,211,238,0.8)] animate-pulse will-change-[transform,opacity]" style={{ animationDelay: `${i * 0.4}s` }} />
        ))}
      </div>
      
      <div className="absolute right-0 top-0 bottom-0 w-[2vw] max-w-[20px] flex flex-col justify-between py-10 opacity-[0.2] bg-fuchsia-950/20 border-l border-fuchsia-500/30 backdrop-blur-sm z-10">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={`right-node-${i}`} className="w-2 h-2 bg-fuchsia-400 rounded-full mx-auto shadow-[0_0_8px_rgba(217,70,239,0.8)] animate-pulse will-change-[transform,opacity]" style={{ animationDelay: `${i * 0.6}s` }} />
        ))}
      </div>

      {/* Hologram Scanlines Overlay */}
      <div className="absolute inset-0 z-10 pointer-events-none opacity-[0.05] hologram-scanline" />

      {/* Grid Floor Effect (optional, very subtle) */}
      <div className="absolute bottom-0 left-0 w-full h-[30vh] bg-[linear-gradient(to_top,rgba(34,211,238,0.05),transparent)] z-0 pointer-events-none" />

       {/* Top/Bottom HUD Borders */}
       <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent z-10"></div>
       <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-fuchsia-500/30 to-transparent z-10"></div>
    </div>
  );
});

export default CyberpunkThemeOverlay;
