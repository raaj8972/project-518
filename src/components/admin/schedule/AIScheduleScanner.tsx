import React, { useState } from 'react';
import { AIChatScanner } from '../AIChatScanner';
import { ChevronRight, CalendarDays } from 'lucide-react';

interface AIScheduleScannerProps {
  onScanComplete: (scheduleData: unknown[], scheduleType: 'prelims' | 'mains') => void;
  onCancel: () => void;
}

const getSystemInstruction = (scheduleType: 'prelims' | 'mains') => `You are a rigorous AI conversational assistant for ${scheduleType.toUpperCase()} schedule extraction.
Your goal is to extract event slots from timetable images or text provided by the user.

MANDATORY FIELDS FOR EVERY SCHEDULE SLOT:
- "title": Name of the event or activity.
- "category": Type of event (e.g., Technical, Cultural, Sports).
- "date": Date of the event (YYYY-MM-DD).
- "start_time": Beginning time (e.g., 10:00 AM).
- "end_time": Finishing time (e.g., 11:30 AM).
- "venue": Location of the activity.

STRICT PROTOCOL:
1. If ANY mandatory field is missing, ask the user unless they say "skip" or it's "not available".
2. If the user explicitly states a mandatory field is "not available", "unknown", "skip", or "not decided", USE A PLACEHOLDER (e.g., "TBA", "Requested") and proceed to generate the JSON.
3. If the user says "extract what you can" or "proceed with missing data", generate the JSON array using placeholders for any missing fields. DO NOT repeatedly ask for info once a field is explicitly waived.
4. ONLY finalize by outputting the final result as a JSON array (not an object) wrapped in markdown blocks:
\`\`\`json
[
  {
    "title": "Event Name",
    "category": "Technical",
    "description": "Short description",
    "date": "2025-10-24",
    "start_time": "10:00 AM",
    "end_time": "11:30 AM",
    "venue": "Location",
    "is_highlight": false
  }
]
\`\`\`
5. Be professional and ensure schedule accuracy.`;

export const AIScheduleScanner: React.FC<AIScheduleScannerProps> = ({ onScanComplete, onCancel }) => {
  const [scheduleType, setScheduleType] = useState<'prelims' | 'mains' | null>(null);

  if (!scheduleType) {
    return (
      <div className="bg-[#181824] rounded-2xl border border-white/10 shadow-2xl p-8 max-w-md mx-auto relative animate-in zoom-in-95 duration-300">
        <div className="flex flex-col items-center text-center space-y-4 mb-8">
          <div className="w-16 h-16 bg-cyan-500/20 text-cyan-400 rounded-full flex items-center justify-center">
            <CalendarDays size={32} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">Schedule Scanner</h2>
            <p className="text-gray-400 text-sm">Select which schedule you want to extract using AI.</p>
          </div>
        </div>

        <div className="space-y-4">
          <button 
            onClick={() => setScheduleType('prelims')}
            className="w-full bg-black/40 hover:bg-white/5 border border-white/10 hover:border-cyan-500/50 p-4 rounded-xl flex items-center justify-between group transition-all"
          >
            <div className="text-left">
              <h3 className="text-cyan-400 font-bold text-lg">Prelims Schedule</h3>
              <p className="text-xs text-gray-500 mt-1">Extract preliminary events</p>
            </div>
            <ChevronRight className="text-gray-600 group-hover:text-cyan-400 group-hover:translate-x-1 transition-all" />
          </button>

          <button 
            onClick={() => setScheduleType('mains')}
            className="w-full bg-black/40 hover:bg-white/5 border border-white/10 hover:border-orange-500/50 p-4 rounded-xl flex items-center justify-between group transition-all"
          >
             <div className="text-left">
              <h3 className="text-orange-400 font-bold text-lg">Mains Schedule</h3>
               <p className="text-xs text-gray-500 mt-1">Extract main festival events</p>
            </div>
            <ChevronRight className="text-gray-600 group-hover:text-orange-400 group-hover:translate-x-1 transition-all" />
          </button>
        </div>

        <button 
          onClick={onCancel}
          className="mt-8 w-full py-3 text-sm font-medium text-gray-400 hover:text-white transition-colors"
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <AIChatScanner
      title={`${scheduleType === 'prelims' ? 'Prelims' : 'Mains'} Schedule Scanner`}
      description={`Extracting timetable slots for ${scheduleType}.`}
      systemInstruction={getSystemInstruction(scheduleType)}
      onDataComplete={(data) => onScanComplete(data as unknown[], scheduleType)}
      onCancel={onCancel}
      placeholder="Drop schedule images here..."
    />
  );
};
