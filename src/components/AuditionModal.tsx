import React, { useState, useEffect } from 'react';
import { X, User, Mail, Phone, Music, MessageSquare, CheckCircle, Link, Zap, Terminal, Shield } from 'lucide-react';
import { useData } from '../context/DataContext';

interface AuditionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface AuditionData {
  participant_type: string;
  full_name: string;
  email: string;
  phone: string;
  instrument_role: string;
  experience_motivation: string;
  portfolio_link: string;
}

export const AuditionModal: React.FC<AuditionModalProps> = ({
  isOpen,
  onClose
}) => {
  const { addAudition } = useData();
  const [formData, setFormData] = useState<AuditionData>({
    participant_type: '1st Year',
    full_name: '',
    email: '',
    phone: '',
    instrument_role: '',
    experience_motivation: '',
    portfolio_link: ''
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [auditionId, setAuditionId] = useState('');
  const [errors, setErrors] = useState<any>({});
  const [glitchActive, setGlitchActive] = useState(false);

  const participantTypes = [
    '1st Year',
    '2nd Year', 
    '3rd Year',
    '4th Year',
    'Intern',
    'PG (Post Graduate)'
  ];

  const instrumentRoles = [
    'Lead Vocalist',
    'Backing Vocalist',
    'Lead Guitar',
    'Rhythm Guitar',
    'Bass Guitar',
    'Drums',
    'Keyboard/Piano',
    'Electronic Music Producer',
    'Sound Engineer',
    'Other'
  ];

  // Glitch effect trigger
  useEffect(() => {
    if (isOpen) {
      const glitchTimer = setInterval(() => {
        setGlitchActive(true);
        setTimeout(() => setGlitchActive(false), 200);
      }, 10000);
      return () => clearInterval(glitchTimer);
    }
  }, [isOpen]);

  const validateForm = (): boolean => {
    const newErrors: any = {};

    if (!formData.full_name.trim()) {
      newErrors.full_name = 'Full name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (!/^\+?[\d\s\-\(\)]{10,}$/.test(formData.phone)) {
      newErrors.phone = 'Please enter a valid phone number';
    }

    if (!formData.instrument_role.trim()) {
      newErrors.instrument_role = 'Instrument/Role is required';
    }

    if (formData.portfolio_link && !/^https?:\/\/.+/.test(formData.portfolio_link)) {
      newErrors.portfolio_link = 'Please enter a valid URL (starting with http:// or https://)';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Generate audition ID
      const audId = `AUD-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      setAuditionId(audId);

      // Prepare audition data for Supabase
      const auditionData = {
        participant_type: formData.participant_type,
        full_name: formData.full_name,
        email: formData.email,
        phone: formData.phone,
        instrument_role: formData.instrument_role,
        experience_motivation: formData.experience_motivation || '',
        portfolio_link: formData.portfolio_link || null,
        status: 'pending' as const
      };

      console.log('Submitting audition data:', auditionData);

      // Submit to Supabase
      await addAudition(auditionData);
      
      setIsSubmitted(true);
    } catch (error) {
      console.error('Audition submission error:', error);
      setErrors({ submit: 'Failed to submit audition. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: keyof AuditionData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev: any) => ({ ...prev, [field]: undefined }));
    }
  };

  const resetForm = () => {
    setFormData({
      participant_type: '1st Year',
      full_name: '',
      email: '',
      phone: '',
      instrument_role: '',
      experience_motivation: '',
      portfolio_link: ''
    });
    setErrors({});
    setIsSubmitted(false);
    setAuditionId('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="cyberpunk-modal fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-2 sm:p-4">
      <div className="cyberpunk-card w-full max-w-[95vw] sm:max-w-[500px] md:max-w-[700px] lg:max-w-[800px] max-h-[90vh] overflow-hidden rounded-lg flex flex-col">
        {/* Header */}
        <div className={`cyberpunk-header p-4 sm:p-6 border-b border-cyan-500/30 flex-shrink-0 ${glitchActive ? 'glitch-active' : ''}`}>
          <div className="flex justify-between items-center">
            <div>
              <div className="flex items-center mb-2">
                <Music className="w-4 h-4 text-cyan-400 mr-3" />
                <h2 className="text-base sm:text-lg md:text-xl font-bold font-mono leading-tight">BAND AUDITION</h2>
              </div>
              <p className="text-cyan-300 font-mono text-xs sm:text-sm">JOIN HOME BOUND - RICORRENZA 2025</p>
              <p className="text-gray-400 text-xs mt-1">Initialize audition protocol. All fields marked with * are required.</p>
            </div>
            <button
              onClick={handleClose}
              className="cyberpunk-btn cyberpunk-btn-danger p-2 flex-shrink-0"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Success State */}
        {isSubmitted ? (
          <div className="p-4 sm:p-6 text-center flex-1 overflow-y-auto">
            <div className="cyberpunk-success-container">
              <div className="w-20 h-20 bg-gradient-to-r from-green-400 to-cyan-400 rounded-full flex items-center justify-center mx-auto mb-6 pulse-ring">
                <CheckCircle className="w-10 h-10 text-black" />
              </div>
              <h3 className="text-lg sm:text-xl md:text-2xl font-bold cyberpunk-title mb-4">AUDITION SUBMITTED!</h3>
              <p className="text-cyan-300 mb-4 font-mono text-sm">
                PROTOCOL EXECUTED SUCCESSFULLY FOR <strong className="text-green-400">HOME BOUND BAND</strong>
              </p>
              <div className="cyberpunk-card bg-gray-900/50 p-4 mb-4 border border-green-500/30">
                <div className="grid sm:grid-cols-2 gap-4 text-left font-mono text-sm">
                  <div>
                    <span className="text-cyan-400">AUDITION_ID:</span>
                    <div className="text-green-400 font-bold">{auditionId}</div>
                  </div>
                  <div>
                    <span className="text-cyan-400">STATUS:</span>
                    <div className="text-yellow-400 font-bold">PENDING_REVIEW</div>
                  </div>
                  <div>
                    <span className="text-cyan-400">INSTRUMENT:</span>
                    <div className="text-purple-400 font-bold">{formData.instrument_role}</div>
                  </div>
                  <div>
                    <span className="text-cyan-400">YEAR:</span>
                    <div className="text-blue-400 font-bold">{formData.participant_type}</div>
                  </div>
                  <div>
                    <span className="text-cyan-400">CONTACT:</span>
                    <div className="text-blue-400 font-bold">{formData.email}</div>
                  </div>
                </div>
              </div>
              <button
                onClick={handleClose}
                className="cyberpunk-btn cyberpunk-btn-primary text-sm px-6 py-3"
              >
                <span className="relative z-10 flex items-center">
                  <Shield className="mr-2" size={20} />
                  CLOSE TERMINAL
                </span>
              </button>
            </div>
          </div>
        ) : (
          /* Audition Form */
          <div className="flex-1 overflow-y-auto">
            <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
              {/* Error Display */}
              {errors.submit && (
                <div className="cyberpunk-alert">
                  <span className="text-red-400 text-sm">{errors.submit}</span>
                </div>
              )}

              <div className="grid md:grid-cols-2 gap-6">
                {/* Participant Type */}
                <div className="cyberpunk-section">
                  <label className="cyberpunk-label">
                    PARTICIPANT_TYPE *
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-cyan-400 pointer-events-none" />
                    <select
                      value={formData.participant_type}
                      onChange={(e) => handleInputChange('participant_type', e.target.value)}
                      className="cyberpunk-select pl-12"
                    >
                      {participantTypes.map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Full Name */}
                <div className="cyberpunk-section">
                  <label className="cyberpunk-label">
                    FULL_NAME *
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-cyan-400 pointer-events-none" />
                    <input
                      type="text"
                      value={formData.full_name}
                      onChange={(e) => handleInputChange('full_name', e.target.value)}
                      placeholder="Enter your full name"
                      className={`cyberpunk-input pl-12 ${errors.full_name ? 'error' : ''}`}
                    />
                  </div>
                  {errors.full_name && (
                    <p className="cyberpunk-error">{errors.full_name}</p>
                  )}
                </div>

                {/* Instrument/Role */}
                <div className="cyberpunk-section">
                  <label className="cyberpunk-label">
                    INSTRUMENT_ROLE *
                  </label>
                  <div className="relative">
                    <Music className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-cyan-400 pointer-events-none" />
                    <select
                      value={formData.instrument_role}
                      onChange={(e) => handleInputChange('instrument_role', e.target.value)}
                      className={`cyberpunk-select pl-12 ${errors.instrument_role ? 'error' : ''}`}
                    >
                      <option value="">Select instrument/role</option>
                      {instrumentRoles.map(role => (
                        <option key={role} value={role}>{role}</option>
                      ))}
                    </select>
                  </div>
                  {errors.instrument_role && (
                    <p className="cyberpunk-error">{errors.instrument_role}</p>
                  )}
                </div>
              </div>

              <div className="grid sm:grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                {/* Email */}
                <div className="cyberpunk-section">
                  <label className="cyberpunk-label">
                    EMAIL_ADDRESS *
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-cyan-400 pointer-events-none" />
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      placeholder="user@domain.com"
                      className={`cyberpunk-input pl-12 ${errors.email ? 'error' : ''}`}
                    />
                  </div>
                  {errors.email && (
                    <p className="cyberpunk-error">{errors.email}</p>
                  )}
                </div>

                {/* Phone Number */}
                <div className="cyberpunk-section">
                  <label className="cyberpunk-label">
                    PHONE_NUMBER *
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-cyan-400 pointer-events-none" />
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      placeholder="Contact number"
                      className={`cyberpunk-input pl-12 ${errors.phone ? 'error' : ''}`}
                    />
                  </div>
                  {errors.phone && (
                    <p className="cyberpunk-error">{errors.phone}</p>
                  )}
                </div>
              </div>

              {/* Portfolio Link */}
              <div className="cyberpunk-section">
                <label className="cyberpunk-label">
                  PORTFOLIO_LINK (OPTIONAL)
                </label>
                <div className="relative">
                  <Link className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-cyan-400 pointer-events-none" />
                  <input
                    type="url"
                    value={formData.portfolio_link}
                    onChange={(e) => handleInputChange('portfolio_link', e.target.value)}
                    placeholder="https://your-portfolio.com or social media link"
                    className={`cyberpunk-input pl-12 ${errors.portfolio_link ? 'error' : ''}`}
                  />
                </div>
                {errors.portfolio_link && (
                  <p className="cyberpunk-error">{errors.portfolio_link}</p>
                )}
                <p className="text-xs text-gray-500 mt-1 font-mono">Optional: Share your music portfolio or social media</p>
              </div>

              {/* Experience/Motivation */}
              <div className="cyberpunk-section">
                <label className="cyberpunk-label">
                  EXPERIENCE_MOTIVATION (OPTIONAL)
                </label>
                <div className="relative">
                  <MessageSquare className="absolute left-3 top-3 md:top-1/2 md:-translate-y-1/2 w-5 h-5 text-cyan-400 pointer-events-none" />
                  <textarea
                    value={formData.experience_motivation}
                    onChange={(e) => handleInputChange('experience_motivation', e.target.value)}
                    placeholder="Tell us about your musical experience and why you want to join Home Bound..."
                    rows={4}
                    className="cyberpunk-textarea pl-12"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1 font-mono">Optional: Share your musical background and motivation</p>
              </div>

              {/* Submit Button */}
              <div className="pt-4 border-t border-cyan-500/30">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`cyberpunk-btn cyberpunk-btn-primary w-full text-sm py-3 ${
                    isSubmitting ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  <span className="relative z-10 flex items-center justify-center">
                    {isSubmitting ? (
                      <>
                        <div className="cyberpunk-spinner mr-3"></div>
                        <span>PROCESSING AUDITION...</span>
                      </>
                    ) : (
                      <>
                        <Zap className="mr-2" size={20} />
                        <span>SUBMIT AUDITION</span>
                      </>
                    )}
                  </span>
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

  <style>{`
        .cyberpunk-modal {
          font-family: 'Orbitron', 'Rajdhani', sans-serif;
          backdrop-filter: blur(11px);
          overflow-y: auto;
          -webkit-overflow-scrolling: touch;
        }

        .cyberpunk-card {
          background: rgba(10, 10, 30, 0.95);
          border: 2px solid rgba(0, 255, 255, 0.3);
          border-radius: 8px;
          backdrop-filter: blur(15px);
          position: relative;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }

        .cyberpunk-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 2px;
          background: linear-gradient(90deg, #ff00ff, #00ffff, #ff00ff);
          animation: borderGlow 3s ease-in-out infinite;
        }

        @keyframes borderGlow {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 1; }
        }

        .cyberpunk-header {
          background: linear-gradient(135deg, rgba(0, 255, 255, 0.1), rgba(255, 0, 255, 0.1));
          border-bottom: 1px solid rgba(0, 255, 255, 0.3);
        }

        .cyberpunk-title {
          background: linear-gradient(45deg, #ff00ff, #00ffff, #ff00ff);
          background-size: 200% 200%;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: gradientShift 3s ease-in-out infinite;
        }

        @keyframes gradientShift {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }

        .glitch-active {
          animation: glitch 0.3s ease-in-out;
        }

        @keyframes glitch {
          0% { transform: translate(0); }
          20% { transform: translate(-2px, 2px); }
          40% { transform: translate(-2px, -2px); }
          60% { transform: translate(2px, 2px); }
          80% { transform: translate(2px, -2px); }
          100% { transform: translate(0); }
        }

        .cyberpunk-section {
          margin-bottom: 1.5rem;
        }

        .cyberpunk-label {
          display: block;
          font-size: 0.875rem;
          font-weight: 600;
          color: #00ffff;
          margin-bottom: 0.5rem;
          font-family: 'Orbitron', monospace;
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        .cyberpunk-input,
        .cyberpunk-select,
        .cyberpunk-textarea {
          width: 100%;
          padding-top: 10px;
          padding-bottom: 10px;
          padding-right: 14px;
          background: rgba(0, 0, 0, 0.7);
          border: 2px solid rgba(0, 255, 255, 0.3);
          border-radius: 8px;
          color: #ffffff;
          font-family: 'Orbitron', monospace;
          transition: all 0.3s ease;
          font-size: 0.8rem;
          line-height: 1.25rem;
          min-height: 44px;
          display: inline-flex;
          align-items: center;
        }

        .cyberpunk-select {
          -webkit-appearance: none;
          -moz-appearance: none;
          appearance: none;
          padding-right: 2.25rem;
          background-image: none;
        }
        
        @media (min-width: 640px) {
          .cyberpunk-input,
          .cyberpunk-select,
          .cyberpunk-textarea {
            padding-top: 12px;
            padding-bottom: 12px;
            padding-right: 16px;
            font-size: 0.9rem;
            min-height: 48px;
          }
        }

        .cyberpunk-input:focus,
        .cyberpunk-select:focus,
        .cyberpunk-textarea:focus {
          outline: none;
          border-color: rgba(0, 255, 255, 0.8);
          box-shadow: 
            0 0 15px rgba(0, 255, 255, 0.3),
            inset 0 0 15px rgba(0, 255, 255, 0.1);
        }

        .cyberpunk-input::placeholder,
        .cyberpunk-textarea::placeholder {
          color: rgba(255, 255, 255, 0.4);
          font-style: italic;
        }

        .cyberpunk-input.error,
        .cyberpunk-select.error,
        .cyberpunk-textarea.error {
          border-color: rgba(255, 0, 100, 0.8);
          box-shadow: 
            0 0 15px rgba(255, 0, 100, 0.3),
            inset 0 0 15px rgba(255, 0, 100, 0.1);
        }

        .cyberpunk-error {
          color: #ff0064;
          font-size: 0.75rem;
          margin-top: 0.25rem;
          font-family: 'Orbitron', monospace;
        }

        .cyberpunk-alert {
          background: rgba(255, 0, 0, 0.1);
          border: 1px solid rgba(255, 0, 0, 0.3);
          border-radius: 8px;
          padding: 12px;
          display: flex;
          align-items: center;
          margin-bottom: 1rem;
        }

        .cyberpunk-btn {
          position: relative;
          padding: 8px 16px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 1px;
          border: 2px solid;
          background: transparent;
          overflow: hidden;
          transition: all 0.3s ease;
          clip-path: polygon(0 0, calc(100% - 8px) 0, 100% 100%, 8px 100%);
          font-family: 'Orbitron', monospace;
          font-size: 0.7rem;
        }
        
        @media (min-width: 640px) {
          .cyberpunk-btn {
            padding: 12px 24px;
            clip-path: polygon(0 0, calc(100% - 15px) 0, 100% 100%, 15px 100%);
            font-size: 0.8rem;
          }
        }

        .cyberpunk-btn::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
          transition: left 0.5s;
        }

        .cyberpunk-btn:hover::before {
          left: 100%;
        }

        .cyberpunk-btn-primary {
          border-color: #00ffff;
          color: #00ffff;
          box-shadow: 
            0 0 15px rgba(0, 255, 255, 0.2),
            inset 0 0 15px rgba(0, 255, 255, 0.05);
        }

        .cyberpunk-btn-primary:hover {
          background: rgba(0, 255, 255, 0.1);
          box-shadow: 
            0 0 25px rgba(0, 255, 255, 0.4),
            inset 0 0 25px rgba(0, 255, 255, 0.1);
          transform: translateY(-2px);
        }

        .cyberpunk-btn-danger {
          border-color: #ff0064;
          color: #ff0064;
          box-shadow: 
            0 0 15px rgba(255, 0, 100, 0.2),
            inset 0 0 15px rgba(255, 0, 100, 0.05);
        }

        .cyberpunk-btn-danger:hover {
          background: rgba(255, 0, 100, 0.1);
          box-shadow: 
            0 0 25px rgba(255, 0, 100, 0.4),
            inset 0 0 25px rgba(255, 0, 100, 0.1);
          transform: translateY(-2px);
        }

        .cyberpunk-spinner {
          width: 20px;
          height: 20px;
          border: 2px solid transparent;
          border-top: 2px solid #00ffff;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .cyberpunk-success-container {
          animation: successPulse 2s ease-in-out;
        }

        @keyframes successPulse {
          0% {
            opacity: 0;
            transform: scale(0.8);
          }
          50% {
            transform: scale(1.05);
          }
          100% {
            opacity: 1;
            transform: scale(1);
          }
        }

        .pulse-ring {
          position: relative;
        }

        .pulse-ring::before {
          content: '';
          position: absolute;
          top: 50%;
          left: 50%;
          width: 100%;
          height: 100%;
          border: 2px solid rgba(0, 255, 255, 0.3);
          border-radius: 50%;
          transform: translate(-50%, -50%);
          animation: pulseRing 2s ease-out infinite;
        }

        @keyframes pulseRing {
          0% {
            transform: translate(-50%, -50%) scale(1);
            opacity: 1;
          }
          100% {
            transform: translate(-50%, -50%) scale(2);
            opacity: 0;
          }
        }

        /* Mobile optimizations */
        @media (max-width: 768px) {
          .cyberpunk-btn {
            padding: 8px 16px;
            font-size: 0.7rem;
          }
          
          .cyberpunk-input,
          .cyberpunk-select,
          .cyberpunk-textarea {
            font-size: 0.75rem;
            padding-top: 8px;
            padding-bottom: 8px;
            padding-right: 12px;
            min-height: 42px;
          }
          
          .cyberpunk-label {
            font-size: 0.7rem;
          }
          
          .cyberpunk-section {
            margin-bottom: 1rem;
          }
        }
        
        @media (max-width: 480px) {
          .cyberpunk-modal {
            padding: 0.5rem;
          }
          
          .cyberpunk-card {
            border-radius: 4px;
          }
          
          .cyberpunk-btn {
            padding: 6px 12px;
            font-size: 0.65rem;
            clip-path: polygon(0 0, calc(100% - 5px) 0, 100% 100%, 5px 100%);
          }
        }
      `}</style>
    </div>
  );
};