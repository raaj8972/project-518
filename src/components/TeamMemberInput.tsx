import { memo } from 'react';
import { Trash2 } from 'lucide-react';

export interface TeamMember {
  name: string;
  email: string;
  phone: string;
}

interface TeamMemberInputProps {
  index: number;
  member: TeamMember;
  errorName?: string;
  errorPhone?: string;
  canRemove: boolean;
  onUpdate: (index: number, field: keyof TeamMember, value: string) => void;
  onRemove: (index: number) => void;
}

export const TeamMemberInput = memo(({
  index,
  member,
  errorName,
  errorPhone,
  canRemove,
  onUpdate,
  onRemove
}: TeamMemberInputProps) => {
  return (
    <div className="cyberpunk-card bg-gray-900/30 p-3">
      <div className="flex justify-between items-center mb-3">
        <h4 className="font-mono text-cyan-400 text-sm">MEMBER_{index + 1}</h4>
        {canRemove && (
          <button
            type="button"
            onClick={() => onRemove(index)}
            className="cyberpunk-btn cyberpunk-btn-danger p-1 text-xs"
          >
            <Trash2 size={16} />
          </button>
        )}
      </div>
      
      <div className="grid grid-cols-1 gap-2">
        <div>
          <input
            type="text"
            value={member.name}
            onChange={(e) => onUpdate(index, 'name', e.target.value)}
            placeholder="Member name"
            className={`cyberpunk-input text-sm ${errorName ? 'error' : ''}`}
          />
          {errorName && (
            <p className="cyberpunk-error text-xs">{errorName}</p>
          )}
        </div>
        
        <div>
          <input
            type="tel"
            value={member.phone}
            onChange={(e) => onUpdate(index, 'phone', e.target.value)}
            placeholder="Member phone"
            className={`cyberpunk-input text-sm ${errorPhone ? 'error' : ''}`}
          />
          {errorPhone && (
            <p className="cyberpunk-error text-xs">{errorPhone}</p>
          )}
        </div>
      </div>
    </div>
  );
});

TeamMemberInput.displayName = 'TeamMemberInput';
