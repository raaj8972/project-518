import { Link } from 'react-router-dom';
import { SEO } from '../components/SEO';

export const NotFound = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-black text-white p-4 text-center">
      <SEO 
        title="Page Not Found" 
        noindex={true}
      />
      
      <h1 className="text-6xl md:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-600 mb-4 font-orbitron">
        404
      </h1>
      
      <h2 className="text-2xl md:text-3xl font-bold mb-6 font-rajdhani">
        System Error: Page Not Found
      </h2>
      
      <p className="text-gray-400 mb-8 max-w-md mx-auto">
        The requested resource could not be located in the neural network. It may have been deleted or moved to a different sector.
      </p>
      
      <Link 
        to="/"
        className="px-8 py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-none border border-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.5)] transition-all uppercase tracking-widest"
      >
        Return to Base
      </Link>
    </div>
  );
};
