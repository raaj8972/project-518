import React from 'react';
import { Plus, Trash2, GripVertical, Type, List } from 'lucide-react';
import { RuleSection, RuleBlock } from '../../../utils/rulesUtils';

interface StructuredRulesEditorProps {
  sections: RuleSection[];
  onChange: (sections: RuleSection[]) => void;
}

export const StructuredRulesEditor: React.FC<StructuredRulesEditorProps> = ({ sections, onChange }) => {
  const addSection = () => {
    onChange([...sections, { heading: 'New Section', blocks: [] }]);
  };

  const removeSection = (sIdx: number) => {
    onChange(sections.filter((_, i) => i !== sIdx));
  };

  const updateSectionHeading = (sIdx: number, heading: string) => {
    const newSections = [...sections];
    newSections[sIdx].heading = heading;
    onChange(newSections);
  };

  const addBlock = (sIdx: number, kind: 'text' | 'points') => {
    const newSections = [...sections];
    const newBlock: RuleBlock = kind === 'text' 
      ? { kind, title: 'New Text Block', content: '' }
      : { kind, title: 'New Points Block', style: 'bullet', items: [''] };
    newSections[sIdx].blocks.push(newBlock);
    onChange(newSections);
  };

  const removeBlock = (sIdx: number, bIdx: number) => {
    const newSections = [...sections];
    newSections[sIdx].blocks = newSections[sIdx].blocks.filter((_, i) => i !== bIdx);
    onChange(newSections);
  };

  const updateBlock = (sIdx: number, bIdx: number, updates: Partial<RuleBlock>) => {
    const newSections = [...sections];
    newSections[sIdx].blocks[bIdx] = { ...newSections[sIdx].blocks[bIdx], ...updates };
    onChange(newSections);
  };

  const addPoint = (sIdx: number, bIdx: number) => {
    const newSections = [...sections];
    const block = newSections[sIdx].blocks[bIdx];
    if (block.kind === 'points' && block.items) {
      block.items.push('');
      onChange(newSections);
    }
  };

  const updatePoint = (sIdx: number, bIdx: number, pIdx: number, value: string) => {
    const newSections = [...sections];
    const block = newSections[sIdx].blocks[bIdx];
    if (block.kind === 'points' && block.items) {
      block.items[pIdx] = value;
      onChange(newSections);
    }
  };

  const removePoint = (sIdx: number, bIdx: number, pIdx: number) => {
    const newSections = [...sections];
    const block = newSections[sIdx].blocks[bIdx];
    if (block.kind === 'points' && block.items) {
      block.items = block.items.filter((_, i) => i !== pIdx);
      onChange(newSections);
    }
  };

  return (
    <div className="space-y-8">
      {sections.map((section, sIdx) => (
        <div key={sIdx} className="bg-white/5 border border-white/10 rounded-2xl p-6 relative group/section">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3 flex-grow max-w-md">
              <GripVertical className="text-gray-600 cursor-move" size={18} />
              <input
                type="text"
                value={section.heading}
                onChange={(e) => updateSectionHeading(sIdx, e.target.value)}
                className="bg-transparent border-b border-white/10 text-white font-black uppercase tracking-wider text-sm focus:border-purple-500 focus:outline-none w-full py-1"
                placeholder="Section Heading"
              />
            </div>
            <button
              onClick={() => removeSection(sIdx)}
              className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all"
            >
              <Trash2 size={16} />
            </button>
          </div>

          <div className="space-y-6">
            {section.blocks.map((block, bIdx) => (
              <div key={bIdx} className="bg-black/20 border border-white/5 rounded-xl p-5 relative group/block">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-2">
                    {block.kind === 'text' ? <Type size={14} className="text-blue-400" /> : <List size={14} className="text-emerald-400" />}
                    <input
                      type="text"
                      value={block.title}
                      onChange={(e) => updateBlock(sIdx, bIdx, { title: e.target.value })}
                      className="bg-transparent text-gray-300 font-bold text-xs uppercase tracking-widest focus:outline-none focus:text-white"
                      placeholder="Block Title"
                    />
                  </div>
                  <button
                    onClick={() => removeBlock(sIdx, bIdx)}
                    className="p-1.5 text-gray-600 hover:text-red-400 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                {block.kind === 'text' ? (
                  <textarea
                    value={block.content}
                    onChange={(e) => updateBlock(sIdx, bIdx, { content: e.target.value })}
                    className="w-full bg-black/40 border border-white/5 rounded-lg px-3 py-2 text-sm text-gray-400 focus:outline-none focus:border-purple-500/50 min-h-[100px]"
                    placeholder="Enter text content..."
                  />
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center gap-4 mb-2">
                       <select 
                         value={block.style}
                         onChange={(e) => updateBlock(sIdx, bIdx, { style: e.target.value as 'bullet' | 'number' })}
                         className="bg-black/40 border border-white/5 text-[10px] text-gray-500 font-bold uppercase tracking-wider rounded px-2 py-1 outline-none"
                       >
                         <option value="bullet">Bullets</option>
                         <option value="number">Numbered</option>
                       </select>
                    </div>
                    {block.items?.map((item, pIdx) => (
                      <div key={pIdx} className="flex items-center gap-2 group/point">
                        <span className="text-gray-600 text-[10px] w-4">{block.style === 'number' ? `${pIdx + 1}.` : '•'}</span>
                        <input
                          type="text"
                          value={item}
                          onChange={(e) => updatePoint(sIdx, bIdx, pIdx, e.target.value)}
                          className="flex-grow bg-transparent border-b border-white/5 text-sm text-gray-400 focus:text-white focus:border-purple-500 transition-all py-1"
                          placeholder="Point content..."
                        />
                        <button
                          onClick={() => removePoint(sIdx, bIdx, pIdx)}
                          className="p-1 opacity-0 group-hover/point:opacity-100 text-gray-600 hover:text-red-400 transition-all"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => addPoint(sIdx, bIdx)}
                      className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-emerald-500/70 hover:text-emerald-400 pt-2 transition-colors"
                    >
                      <Plus size={12} /> Add Point
                    </button>
                  </div>
                )}
              </div>
            ))}

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => addBlock(sIdx, 'text')}
                className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all"
              >
                <Plus size={12} /> Add Text Block
              </button>
              <button
                onClick={() => addBlock(sIdx, 'points')}
                className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all"
              >
                <Plus size={12} /> Add Points Block
              </button>
            </div>
          </div>
        </div>
      ))}

      <button
        onClick={addSection}
        className="w-full py-4 border-2 border-dashed border-white/10 rounded-2xl text-gray-500 hover:text-purple-400 hover:border-purple-400/50 hover:bg-purple-400/5 transition-all flex items-center justify-center gap-2 font-black uppercase tracking-widest text-xs"
      >
        <Plus size={18} /> Add New Section
      </button>
    </div>
  );
};
