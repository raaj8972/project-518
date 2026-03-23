import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Loader2, ImagePlus, Send, MessageSquare, Bot, User } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock';

interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  images?: { file?: File; preview: string; base64: string }[];
  isPending?: boolean;
}

interface AIChatScannerProps {
  title?: string;
  description?: string;
  systemInstruction: string;
  model?: string;
  onDataComplete: (data: any, images: string[]) => void;
  onCancel: () => void;
  placeholder?: string;
}

export const AIChatScanner: React.FC<AIChatScannerProps> = ({
  title = "AI Chat Scanner",
  description = "Upload images and chat with AI to extract structured data.",
  systemInstruction,
  model = "gemini-2.5-flash", 
  onDataComplete,
  onCancel,
  placeholder = "Message Gemini or drop images here..."
}) => {
  const { getValidToken } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [attachments, setAttachments] = useState<{ file: File; preview: string; base64: string; id: string }[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedModel] = useState(model);
  const [modelStatus, setModelStatus] = useState<Record<string, 'available' | 'busy'>>({});

  // Scroll Lock
  useBodyScrollLock(true);

  const ALLOWED_MODELS = [
    { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', desc: 'Fastest & Multi-modal', provider: 'Google' },
    { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', desc: 'Most Intelligent', provider: 'Google' },
    { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', desc: 'Balanced', provider: 'Google' },
    { id: 'gemini-2.0-flash-lite', name: 'Gemini 2.0 Lite', desc: 'Ultra-fast', provider: 'Google' },
    { id: 'gemini-3-flash-preview', name: 'Gemini 3 Flash', desc: 'Next-Gen Ultra Fast (Preview)', provider: 'Google' },
    { id: 'gemini-3.1-pro-preview', name: 'Gemini 3.1 Pro', desc: 'Next-Gen Super Intelligence (Preview)', provider: 'Google' },
    { id: 'gemini-pro-latest', name: 'Gemini Pro 1.5', desc: 'Legacy Pro', provider: 'Google' }
  ];
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, attachments]);

  // Expand text area automatically
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`;
    }
  }, [input]);

  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 1200;
          const MAX_HEIGHT = 1200;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
          } else {
            if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.8).split(',')[1]);
        };
        img.onerror = reject;
      };
      reader.onerror = reject;
    });
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    
    const validFiles = Array.from(files).filter(f => f.type.startsWith('image/')).slice(0, 5);
    if (validFiles.length === 0) return;
    
    if (attachments.length + validFiles.length > 5) {
      toast.error('Maximum 5 images allowed per message.');
      return;
    }

    const toastId = toast.loading('Processing image(s)...');
    try {
      const newAttachments = await Promise.all(
        validFiles.map(async (file) => ({
          id: Math.random().toString(36).substring(7),
          file,
          preview: URL.createObjectURL(file),
          base64: await compressImage(file)
        }))
      );
      setAttachments(prev => [...prev, ...newAttachments]);
      toast.success('Ready to send', { id: toastId });
    } catch {
       toast.error('Error processing image', { id: toastId });
    }
  };

  const removeAttachment = (id: string) => {
    setAttachments(prev => prev.filter(a => a.id !== id));
  };

  const sendMessage = async () => {
    if ((!input.trim() && attachments.length === 0) || isProcessing) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      images: attachments.map(a => ({ base64: a.base64, preview: a.preview }))
    };

    const newHistory = [...messages, userMessage];
    setMessages(newHistory);
    setInput('');
    setAttachments([]);
    setIsProcessing(true);

    try {
      const token = await getValidToken();
      
      const apiPayload = newHistory.map(m => ({
          role: m.role,
          content: m.content,
          images: m.images?.map(i => i.base64) || []
      }));

      const response = await fetch('/api/ai-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          messages: apiPayload,
          systemInstruction,
          model: selectedModel
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to communicate with AI');
      }

      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'model',
        content: data.message || (data.isComplete ? "Extraction complete." : "")
      }]);

      if (data.isComplete && data.data) {
        toast.success("AI successfully extracted the data!");
        
        // Collect all base64 images from the conversation history
        const allImages = newHistory.flatMap(m => m.images?.map(i => i.base64) || []);
        
        setTimeout(() => {
           onDataComplete(data.data, allImages);
        }, 1500);
      }

    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Chat error occurred.';
      
      // Update model status if busy
      if (errorMessage.toLowerCase().includes('busy') || errorMessage.toLowerCase().includes('quota') || errorMessage.toLowerCase().includes('limit')) {
        setModelStatus(prev => ({ ...prev, [selectedModel]: 'busy' }));
        // Automatically reset to available after 2 minutes
        setTimeout(() => {
          setModelStatus(prev => ({ ...prev, [selectedModel]: 'available' }));
        }, 120000);
      }

      toast.error(errorMessage);
      
      setMessages(prev => [...prev, {
          id: Date.now().toString(),
          role: 'model',
          content: `\u26a0\ufe0f Error: ${errorMessage}. Please try again.`
      }]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const currentFocusText = isProcessing ? "AI is thinking..." : (attachments.length > 0 ? "Add message or press Send..." : placeholder);

  return createPortal(
    <div className="fixed inset-0 z-[11000] flex items-center justify-center p-0 sm:p-4 md:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-[#181824] sm:rounded-3xl border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)] flex flex-col w-full h-full sm:h-auto sm:max-h-[90vh] max-w-4xl overflow-hidden scale-100 animate-in zoom-in-95 duration-300">
        {/* Header */}
        <div className="bg-black/40 border-b border-white/10 p-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-500/20 to-blue-500/20 flex flex-col items-center justify-center border border-white/10 shadow-inner group">
               <Bot className="w-5 h-5 text-purple-400 group-hover:scale-110 transition-transform" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white tracking-wide">{title}</h3>
              {description && <p className="text-[10px] text-gray-400 mt-0.5 line-clamp-1">{description}</p>}
              <div className="flex items-center gap-2 mt-1">
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/5 border border-white/10">
                  <div className={`w-1.5 h-1.5 rounded-full animate-pulse transition-colors ${
                    modelStatus[selectedModel] === 'busy' ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]' : 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]'
                  }`} />
                  <span className="text-[10px] text-purple-200/60 font-medium">
                    {ALLOWED_MODELS.find(m => m.id === selectedModel)?.name || 'Gemini'}
                  </span>
                </div>
              </div>
            </div>
          </div>
          <button 
            onClick={onCancel}
            className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Chat Area */}
        <div 
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar relative bg-gradient-to-br from-black/20 via-transparent to-purple-900/5"
        >
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto space-y-4 opacity-50 select-none">
              <div className="w-20 h-20 bg-white/[0.03] rounded-3xl flex items-center justify-center shadow-inner border border-white/5 mb-4">
                 <MessageSquare size={32} className="text-gray-500" />
              </div>
              <h4 className="text-xl font-bold text-white">How can I help you extract data?</h4>
              <p className="text-sm text-gray-400 leading-relaxed">
                Upload screenshots of rosters, tables, or text and tell me what you need. 
                I'll analyze the images and structure the data automatically.
              </p>
            </div>
          ) : (
            messages.map((msg) => (
              <div key={msg.id} className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                 
                 {msg.role === 'model' && (
                   <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-600 to-blue-600 flex items-center justify-center shrink-0 shadow-lg mt-1">
                     <Bot size={14} className="text-white" />
                   </div>
                 )}

                 <div className={`max-w-[80%] space-y-2 ${msg.role === 'user' ? 'items-end' : 'items-start'} flex flex-col`}>
                   {msg.images && msg.images.length > 0 && (
                     <div className="flex gap-2 flex-wrap justify-end">
                       {msg.images.map((img, i) => (
                         <img key={i} src={img.preview} alt="Attached" className="w-32 h-32 object-cover rounded-xl border border-white/10 shadow-md" />
                       ))}
                     </div>
                   )}
                   {msg.content && (
                     <div className={`px-5 py-3 rounded-2xl text-sm leading-relaxed shadow-sm ${
                       msg.role === 'user' 
                         ? 'bg-gradient-to-br from-purple-600 to-indigo-600 text-white rounded-tr-sm' 
                         : 'bg-white/10 border border-white/10 text-gray-200 rounded-tl-sm'
                     }`}>
                       {msg.content.split('\n').map((line, i) => (
                          <span key={i}>{line}<br/></span>
                       ))}
                     </div>
                   )}
                 </div>

                 {msg.role === 'user' && (
                   <div className="w-8 h-8 rounded-full bg-white/10 border border-white/20 flex items-center justify-center shrink-0 mt-1">
                     <User size={14} className="text-gray-300" />
                   </div>
                 )}
              </div>
            ))
          )}
          
          {isProcessing && (
            <div className="flex gap-4 justify-start animate-in fade-in">
               <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-600 to-blue-600 flex items-center justify-center shrink-0 shadow-lg mt-1">
                 <Bot size={14} className="text-white animate-pulse" />
               </div>
               <div className="bg-white/10 border border-white/10 rounded-2xl rounded-tl-sm px-5 py-4 flex items-center gap-2">
                  <span className="flex space-x-1">
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </span>
               </div>
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="p-4 bg-black/40 border-t border-white/10 shrink-0">
          
          {/* Attachments Preview */}
          {attachments.length > 0 && (
            <div className="flex gap-3 mb-3 px-2 overflow-x-auto pb-2 custom-scrollbar">
              {attachments.map(att => (
                <div key={att.id} className="relative w-16 h-16 rounded-lg overflow-hidden shrink-0 border border-white/20 group bg-black/50">
                  <img src={att.preview} alt="Attachment" className="w-full h-full object-cover" />
                  <button 
                    onClick={() => removeAttachment(att.id)}
                    className="absolute top-1 right-1 w-5 h-5 bg-black/80 hover:bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all backdrop-blur-md"
                  >
                    <X size={10} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div 
            className={`relative bg-black/40 border transition-all rounded-3xl flex items-end ${
              isDragging ? 'border-purple-500 bg-purple-500/10' : 'border-white/10 focus-within:border-purple-500/50 focus-within:bg-white/[0.02]'
            }`}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => { 
              e.preventDefault(); 
              setIsDragging(false); 
              handleFiles(e.dataTransfer.files); 
            }}
          >
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={(e) => handleFiles(e.target.files)} 
              multiple 
              accept="image/*" 
              className="hidden" 
            />
            
            <button 
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing}
              className="p-4 text-gray-500 hover:text-purple-400 hover:bg-white/5 disabled:opacity-50 transition-colors rounded-l-3xl self-end h-full flex items-center justify-center shrink-0"
              title="Upload Images"
            >
              <ImagePlus size={20} />
            </button>
            
            <div className="flex-1 py-1 flex items-center relative">
                 <textarea
                   ref={textareaRef}
                   value={input}
                   onChange={(e) => setInput(e.target.value)}
                   onKeyDown={handleKeyDown}
                   disabled={isProcessing}
                   placeholder={currentFocusText}
                   rows={1}
                   className="w-full bg-transparent border-none text-sm text-white focus:ring-0 resize-none py-3 placeholder-gray-600 leading-relaxed max-h-[150px] custom-scrollbar"
                 />
            </div>
            
            <div className="p-2 self-end">
              <button
                 onClick={sendMessage}
                 disabled={(!input.trim() && attachments.length === 0) || isProcessing}
                 className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                   (!input.trim() && attachments.length === 0) || isProcessing
                    ? 'bg-transparent text-gray-600'
                    : 'bg-gradient-to-tr from-purple-600 to-indigo-600 text-white shadow-lg hover:scale-105 active:scale-95'
                 }`}
              >
                {isProcessing ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} className={input.trim() || attachments.length > 0 ? "ml-0.5" : ""} />}
              </button>
            </div>
          </div>
          
          <div className="text-center mt-3">
             <div className="flex items-center justify-center gap-2">
               <div className={`w-1 h-1 rounded-full ${modelStatus[selectedModel] === 'busy' ? 'bg-red-500' : 'bg-green-500'}`} />
               <span className="text-[10px] text-gray-600 font-medium tracking-wide">
                 Powered by {ALLOWED_MODELS.find(m => m.id === selectedModel)?.provider || "AI"} {ALLOWED_MODELS.find(m => m.id === selectedModel)?.name || "Gemini"} • {modelStatus[selectedModel] === 'busy' ? 'Model Busy' : 'Model Available'}
               </span>
             </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
