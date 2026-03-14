import React, { useState } from 'react';
import { Sparkles, Loader2, AlertCircle, RefreshCw, Wand2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/ToastProvider';

interface InlineDescriptionAIProps {
  contextName: string; // The Name/Title of the item (e.g., "Google", "Hackathon 2026")
  contextType: string; // The type (e.g., "sponsor", "event", "band", "band member")
  onDescriptionGenerated: (description: string) => void;
  className?: string;
  disabled?: boolean;
}

export const InlineDescriptionAI: React.FC<InlineDescriptionAIProps> = ({
  contextName,
  contextType,
  onDescriptionGenerated,
  className = "",
  disabled = false
}) => {
  const { getValidToken } = useAuth();
  const [isGenerating, setIsGenerating] = useState(false);
  const { push } = useToast();

  const handleGenerate = async () => {
    if (!contextName.trim()) {
      push({ message: `Please enter a ${contextType} name/title first to generate a description.`, type: 'error' });
      return;
    }

    setIsGenerating(true);
    const toastId = push({ message: `Generating description for ${contextName}...`, type: 'info' }) as unknown as string;

    try {
      // Craft a highly specific prompt instructing the AI to only write a description
      const systemInstruction = `You are an expert copywriter for a premium event platform. Write a professional, engaging 2-3 sentence description for a ${contextType} named "${contextName}". 
      Return ONLY valid JSON in this exact format, with no extra text or markdown wrappers: 
      { "description": "The generated description text goes here" }`;

      const token = await getValidToken();
      const response = await fetch('/api/ai-generate-content', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          prompt: `Generate a short description for the ${contextType} named "${contextName}".`,
          systemInstruction
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate description');
      }

      if (data.success && data.text) {
        try {
          const parsedData = JSON.parse(data.text);
          if (parsedData.description) {
            onDescriptionGenerated(parsedData.description);
            push({ message: 'Description generated successfully!', type: 'success' }); // we don't have update/dismiss exposed on the toast provider here easily based on previous usage, so pushing a new one.
          } else {
            throw new Error("AI did not return a description field.");
          }
        } catch (e) {
          console.error("Failed to parse AI response:", data.text);
          throw new Error("AI returned invalid data format.");
        }
      } else {
        throw new Error("AI returned an empty response.");
      }
    } catch (error: any) {
      console.error("AI Generation Error:", error);
      push({ message: error.message || 'Failed to generate description', type: 'error' });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className={`flex items-center ${className}`}>
      <button
        type="button"
        onClick={handleGenerate}
        disabled={isGenerating || disabled || !contextName.trim()}
        title={!contextName.trim() ? `Enter a name first` : `Auto-generate description using AI`}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${
          isGenerating || disabled || !contextName.trim()
            ? 'bg-purple-900/30 text-purple-500/50 cursor-not-allowed border border-purple-500/20'
            : 'bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 hover:text-white border border-purple-500/30 hover:border-purple-400 shadow-[0_0_10px_rgba(168,85,247,0.1)] hover:shadow-[0_0_15px_rgba(168,85,247,0.2)] active:scale-95'
        }`}
      >
        {isGenerating ? (
          <>
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span className="hidden sm:inline">Generating...</span>
          </>
        ) : (
          <>
            <Wand2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">AI Fill</span>
          </>
        )}
      </button>
    </div>
  );
};
