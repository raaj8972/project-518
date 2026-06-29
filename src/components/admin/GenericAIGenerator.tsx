import React, { useState } from 'react';
import { Sparkles, Loader2, AlertCircle, RefreshCw, Wand2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface GenericAIGeneratorProps {
  uiTitle: string;
  uiDescription: string;
  placeholder: string;
  systemInstruction: string;
  onGenerated: (data: any) => void;
  className?: string;
}

export const GenericAIGenerator: React.FC<GenericAIGeneratorProps> = ({
  uiTitle,
  uiDescription,
  placeholder,
  systemInstruction,
  onGenerated,
  className = ""
}) => {
  const { getValidToken } = useAuth();
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;

    setIsGenerating(true);
    setError(null);

    try {
      const token = await getValidToken();
      const response = await fetch('/api/ai-generate-content', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          prompt,
          systemInstruction
        }),
      });

      const text = await response.text();
      let data: any = {};
      try {
        data = JSON.parse(text);
      } catch (parseErr) {
        console.error("Non-JSON response received:", text);
        if (!response.ok) {
          throw new Error(`Server returned error ${response.status}: Please make sure Netlify Dev is running.`);
        }
        throw new Error("Invalid response format from server.");
      }

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate content');
      }

      if (data.success && data.text) {
        try {
          const parsedData = JSON.parse(data.text);
          onGenerated(parsedData);
          setPrompt(""); // Clear prompt on success
        } catch (e) {
          console.error("Failed to parse AI response:", data.text);
          throw new Error("AI returned invalid data format. Please try again.");
        }
      } else {
        throw new Error("AI returned an empty response.");
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
      console.error("AI Generation Error:", err);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className={`relative overflow-hidden group ${className}`}>
      {/* Premium Glassmorphism Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-indigo-500/5 to-transparent rounded-2xl border border-white/10 backdrop-blur-sm -z-10 group-hover:border-purple-500/20 transition-all duration-500" />
      
      <div className="p-4 sm:p-6 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-500/20 group-hover:scale-110 transition-transform duration-500">
              <Sparkles className="w-5 h-5 text-white animate-pulse" />
            </div>
            <div>
              <h4 className="text-sm font-black text-white uppercase tracking-wider">{uiTitle}</h4>
              <p className="text-[10px] text-gray-400 font-medium uppercase tracking-tight">{uiDescription}</p>
            </div>
          </div>
        </div>

        <div className="relative">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && e.metaKey) {
                handleGenerate();
              }
            }}
            placeholder={placeholder}
            rows={2}
            className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all resize-none font-medium leading-relaxed"
          />
          <div className="absolute bottom-2 right-2 flex items-center gap-2">
            <span className="text-[9px] text-gray-500 font-bold uppercase tracking-widest hidden sm:inline-block">Cmd + Enter to Generate</span>
            <button
              onClick={handleGenerate}
              disabled={isGenerating || !prompt.trim()}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${
                isGenerating || !prompt.trim()
                  ? 'bg-gray-800 text-gray-600 cursor-not-allowed opacity-50'
                  : 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow-lg shadow-purple-500/20 hover:scale-105 active:scale-95'
              }`}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Wand2 className="w-3.5 h-3.5" />
                  Magic Fill
                </>
              )}
            </button>
          </div>
        </div>

        {error && (
          <div className="flex items-start gap-3 p-3 bg-red-500/10 border border-red-500/20 rounded-xl animate-in fade-in slide-in-from-top-2">
            <AlertCircle size={14} className="text-red-400 mt-0.5 flex-shrink-0" />
            <div className="flex-grow">
              <p className="text-xs text-red-400 font-bold leading-tight">{error}</p>
              <button 
                onClick={handleGenerate} 
                className="mt-1 flex items-center gap-1 text-[10px] text-red-300 hover:text-red-200 font-black uppercase tracking-widest transition-colors"
              >
                <RefreshCw size={10} />
                Try Again
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Decorative Light Leak */}
      <div className="absolute -top-24 -right-24 w-48 h-48 bg-purple-500/10 rounded-full blur-[60px] pointer-events-none group-hover:bg-purple-500/20 transition-all duration-700" />
    </div>
  );
};
