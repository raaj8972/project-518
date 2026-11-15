import React, { useId } from 'react';
import { createPortal } from 'react-dom';
import { CheckIcon, Cross2Icon, FileTextIcon } from '@radix-ui/react-icons';
import { useFestivalDialog } from '../../hooks/useFestivalDialog';

interface RulesModalProps { isOpen: boolean; onClose: () => void; eventTitle: string; rules: any[] }

export const RulesModal: React.FC<RulesModalProps> = ({ isOpen, onClose, eventTitle, rules }) => {
  const titleId = useId();
  const dialogRef = useFestivalDialog(isOpen, onClose);
  if (!isOpen) return null;
  return createPortal(<div className="arena-dialog-layer arena-rules-layer"><div className="arena-dialog-backdrop" onClick={onClose} /><div ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby={titleId} className="arena-dialog arena-rulebook" data-lenis-prevent>
    <div className="arena-web-corner" aria-hidden="true" />
    <header className="arena-rulebook-header"><span className="arena-eyebrow"><FileTextIcon /> THE OFFICIAL RULEBOOK</span><h2 id={titleId}>Rules of the arena</h2><p>{eventTitle}</p><button type="button" className="arena-close" aria-label="Close event rules" onClick={onClose}><Cross2Icon /></button></header>
    <div className="arena-rulebook-content">{rules.length ? rules.map((item, index) => item.level === 'h1' ? <h3 key={index}>{item.content}</h3> : item.level === 'h2' ? <h4 key={index}>{item.content}</h4> : item.level === 'text' ? <p className="arena-rule-text" key={index}>{item.content}</p> : <div className="arena-rule" key={index}><span>{item.level === 'numbered' ? String(item.index || index + 1).padStart(2, '0') : '·'}</span><p>{item.content}</p></div>) : <div className="arena-rules-empty"><FileTextIcon /><p>The official guidelines will be published soon.</p><small>Contact the event coordinator for details before registering.</small></div>}</div>
    <footer className="arena-rulebook-footer"><p>Read the guidelines. Respect the arena.</p><button type="button" className="arena-gold-button" onClick={onClose}>Got it <CheckIcon /></button></footer>
  </div></div>, document.body);
};
