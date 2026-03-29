import React, { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';

interface InstagramTrailerSectionProps {
  url: string;
  title?: string;
  subtitle?: string;
}

export const InstagramTrailerSection: React.FC<InstagramTrailerSectionProps> = ({
  url,
  title = 'OFFICIAL TRAILER',
  subtitle = 'Watch our official event trailer'
}) => {
  const [embedHtml, setEmbedHtml] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (!url) {
      setError('No Instagram URL provided');
      setLoading(false);
      return;
    }

    // Fetch Instagram oEmbed data
    const fetchEmbed = async () => {
      try {
        setLoading(true);
        setError('');
        
        // Alternative: use a proxy or direct embed approach
        // For now, we'll use a simple iframe embed approach
        const postId = extractInstagramPostId(url);
        if (!postId) {
          throw new Error('Invalid Instagram URL');
        }

        // Create embed HTML using Instagram's embed format
        const embed = `
          <blockquote class="instagram-media" data-instgrm-permalink="${url}?utm_source=ig_embed&utm_campaign=loading" data-instgrm-version="14" style="background:#000; border:0; border-radius:12px; box-shadow:0 0 1em 0 rgba(239,68,68,0.3); margin: 1px; max-width:540px; min-width:326px; padding:0; width:99.375%; width:-webkit-calc(100% - 2px); width:calc(100% - 2px);">
          </blockquote>
        `;
        
        setEmbedHtml(embed);
        
        // Load Instagram embed script
        const script = document.createElement('script');
        script.src = '//www.instagram.com/embed.js';
        script.async = true;
        document.body.appendChild(script);
        
        // Process embeds after script loads
        setTimeout(() => {
          if ((window as any).instgrm) {
            (window as any).instgrm.Embeds.process();
          }
        }, 1000);

      } catch (err) {
        console.error('Instagram embed error:', err);
        setError('Failed to load Instagram content');
      } finally {
        setLoading(false);
      }
    };

    fetchEmbed();
  }, [url]);

  // Extract Instagram post ID from URL
  const extractInstagramPostId = (instagramUrl: string): string | null => {
    try {
      const patterns = [
        /instagram\.com\/p\/([A-Za-z0-9_-]+)/,
        /instagram\.com\/reel\/([A-Za-z0-9_-]+)/,
        /instagram\.com\/tv\/([A-Za-z0-9_-]+)/,
      ];

      for (const pattern of patterns) {
        const match = instagramUrl.match(pattern);
        if (match && match[1]) {
          return match[1];
        }
      }
      return null;
    } catch {
      return null;
    }
  };

  if (!url) {
    return null;
  }

  return (
    <section className="py-16 md:py-24 relative overflow-hidden">
      {/* Background gradients */}
      <div className="absolute inset-0 bg-gradient-to-br from-red-900/20 via-[#0a0a0a] to-orange-900/20"></div>
      
      <div className="container mx-auto px-4 relative z-10">
        {/* Section Header */}
        <div className="scroll-animate opacity-0 transform translate-y-20">
          <div className="text-center mb-12 md:mb-16">
            <div className="inline-flex items-center bg-gradient-to-r from-red-500/20 to-orange-500/20 border border-red-500/30 text-red-500 px-6 py-3 rounded-full text-sm md:text-base font-medium mb-6 backdrop-blur-sm pulse-glow font-serif">
              <Sparkles className="w-4 h-4 mr-2 animate-pulse" />
              NOW SHOWING
            </div>
            
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-black mb-6 cyberpunk-title font-serif">
               {title.split(' ')[0]} <span className="text-red-500 drop-shadow-[0_0_15px_rgba(239,68,68,0.5)]">{title.split(' ').slice(1).join(' ')}</span>
            </h2>
            
            <div className="w-32 h-1 bg-gradient-to-r from-red-600 to-orange-600 mx-auto mb-6 md:mb-8 expand-width"></div>
            
            <p className="text-lg md:text-xl text-gray-300 max-w-3xl mx-auto">
              {subtitle}
            </p>
          </div>
        </div>

        {/* Instagram Embed Container */}
        <div className="scroll-animate opacity-0 transform translate-y-20 max-w-2xl mx-auto">
          <div className="cyberpunk-card p-4 md:p-6">
            {loading && (
              <div className="flex items-center justify-center h-96">
                <div className="text-center">
                  <div className="cyberpunk-spinner mb-4 mx-auto !border-t-red-500 !border-r-orange-500"></div>
                  <p className="text-red-500 font-mono text-sm">Loading trailer...</p>
                </div>
              </div>
            )}

            {error && !loading && (
              <div className="flex items-center justify-center h-96">
                <div className="text-center">
                  <p className="text-red-600 mb-4">{error}</p>
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="superia-btn-primary"
                  >
                    View on Instagram
                  </a>
                </div>
              </div>
            )}

            {!loading && !error && (
              <div 
                className="instagram-embed-container flex justify-center items-center"
                dangerouslySetInnerHTML={{ __html: embedHtml }}
              />
            )}
          </div>
        </div>

        {/* Call to Action */}
        <div className="text-center mt-8 scroll-animate opacity-0 transform translate-y-20">
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center text-red-500 hover:text-red-400 font-semibold transition-colors font-serif italic tracking-wider"
          >
            Watch on Instagram
            <svg className="w-5 h-5 ml-2" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
            </svg>
          </a>
        </div>
      </div>

      <style>{`
        .cyberpunk-spinner {
          width: 48px;
          height: 48px;
          border: 4px solid transparent;
          border-top: 4px solid #ef4444;
          border-right: 4px solid #f97316;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .instagram-embed-container {
          min-height: 400px;
        }

        /* Ensure Instagram embed is responsive */
        .instagram-media {
          margin: 0 auto !important;
        }

        .pulse-glow {
          animation: pulse-glow 2s ease-in-out infinite;
        }

        @keyframes pulse-glow {
          0%, 100% {
            box-shadow: 0 0 10px rgba(220, 38, 38, 0.5);
          }
          50% {
            box-shadow: 0 0 20px rgba(220, 38, 38, 0.8), 0 0 30px rgba(220, 38, 38, 0.4);
          }
        }

        .expand-width {
          animation: expand-width 1s ease-out;
        }

        @keyframes expand-width {
          from {
            width: 0;
          }
          to {
            width: 8rem;
          }
        }
      `}</style>
    </section>
  );
};

export default InstagramTrailerSection;
