import React, { useMemo, Suspense } from 'react';

const TechVideoBackground = React.lazy(() => import('./TechVideoBackground'));
const PremiumGenerativeEffect = React.lazy(() => import('./PremiumGenerativeEffect'));

interface CommitteeBackgroundEffectProps {
  committeeName: string;
  mode?: 'background' | 'foreground';
}

const CommitteeBackgroundEffect: React.FC<CommitteeBackgroundEffectProps> = ({ committeeName, mode = 'background' }) => {
  const name = (committeeName || '').toLowerCase();

  const effectType = useMemo(() => {
    if (name.includes('tech') || name.includes('web')) return 'tech';
    if (name.includes('stage') || name.includes('product')) return 'stage';
    if (name.includes('public relation') || name.includes('financ') || name.includes('sponsor') || name === 'pr' || name.startsWith('pr ')) return 'money';
    if (name.includes('logist') || name.includes('oper')) return 'logistics';
    if (name.includes('hospit')) return 'hospitality';
    if (name.includes('photo') || name.includes('video') || name.includes('camera')) return 'photography';
    if (name.includes('art') || name.includes('design') || name.includes('creativ')) return 'art';
    if (name.includes('social')) return 'social';
    if (name.includes('report') || name.includes('journal') || name.includes('content')) return 'reporter';
    if (name.includes('emcee') || name.includes('writ') || name.includes('anchor')) return 'emcee';
    return 'default';
  }, [name]);

  const renderEffect = () => {
    // If background mode, we return nothing to keep the background clean as per user request
    if (mode === 'background') return null;

    switch (effectType) {
      case 'tech':
        return (
          <div className="absolute inset-0 z-[50] pointer-events-none overflow-hidden">
             {/* High-intensity sparks that pass OVER the cards */}
             <Suspense fallback={null}>
              <TechVideoBackground layer="foreground" />
            </Suspense>
            {/* Smooth scanning line moving through cards */}
            <div className="absolute top-0 left-0 w-full h-[20vh] bg-gradient-to-b from-cyan-400/0 via-cyan-400/20 to-transparent animate-scan-slow opacity-40"></div>
          </div>
        );
      case 'money':
        return (
          <Suspense fallback={null}>
            <PremiumGenerativeEffect type="money" layer={mode} />
          </Suspense>
        );
      case 'logistics':
        return (
          <Suspense fallback={null}>
            <PremiumGenerativeEffect type="logistics" layer={mode} />
          </Suspense>
        );
      case 'hospitality':
        return (
          <Suspense fallback={null}>
            <PremiumGenerativeEffect type="hospitality" layer={mode} />
          </Suspense>
        );
      case 'photography':
        return (
          <Suspense fallback={null}>
            <PremiumGenerativeEffect type="photography" layer={mode} />
          </Suspense>
        );
      case 'art':
        return (
          <Suspense fallback={null}>
            <PremiumGenerativeEffect type="art" layer={mode} />
          </Suspense>
        );
      case 'social':
        return (
          <Suspense fallback={null}>
            <PremiumGenerativeEffect type="social" layer={mode} />
          </Suspense>
        );
      case 'reporter':
        return (
          <Suspense fallback={null}>
            <PremiumGenerativeEffect type="reporter" layer={mode} />
          </Suspense>
        );
      case 'stage':
        return (
          <Suspense fallback={null}>
            <PremiumGenerativeEffect type="stage" layer={mode} />
          </Suspense>
        );
      case 'emcee':
        return (
          <Suspense fallback={null}>
            <PremiumGenerativeEffect type="emcee" layer={mode} />
          </Suspense>
        );
      default:
        return null;
    }
  };

  return (
    <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden rounded-3xl">
      {renderEffect()}
      <style>{`
        @keyframes scan {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(100%); }
        }
        @keyframes shimmer {
          0% { background-position: 100% 100%; }
          50% { background-position: 0% 0%; }
          100% { background-position: 100% 100%; }
        }
        @keyframes light-sweep {
          0% { transform: translateX(-150%) skewX(12deg); }
          100% { transform: translateX(150%) skewX(12deg); }
        }
        @keyframes float-slow {
          0%, 100% { transform: translateY(0) translateX(0); }
          50% { transform: translateY(-30px) translateX(20px); }
        }
        @keyframes float-up {
          0% { transform: translateY(0) scale(1); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translateY(-50vh) scale(1.2); opacity: 0; }
        }
        @keyframes pulse-slow {
          0%, 100% { opacity: 0.2; }
          50% { opacity: 0.6; }
        }
        @keyframes eq {
          0%, 100% { transform: scaleY(0.2); opacity: 0.2; }
          50% { transform: scaleY(1); opacity: 0.5; }
        }
        @keyframes scan-slow {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(100vh); }
        }
      `}</style>
    </div>
  );
};

export default React.memo(CommitteeBackgroundEffect);
