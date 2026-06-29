import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Copy, CheckCircle, ExternalLink, AlertCircle, Loader2, IndianRupee, Smartphone, Hash } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface PaymentStepProps {
  eventId: string | number;
  eventTitle: string;
  registrationId: string;
  upiId: string;
  upiName: string;
  amount: number;
  userId?: string;
  onSuccess: () => void;
  onSkip?: () => void; // not used but kept for future
}

export const PaymentStep: React.FC<PaymentStepProps> = ({
  eventId,
  eventTitle,
  registrationId,
  upiId,
  upiName,
  amount,
  userId,
  onSuccess,
}) => {
  const [utrNumber, setUtrNumber] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // UPI deeplink — works with PhonePe, GPay, Paytm, BHIM etc.
  const upiLink = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(upiName)}&am=${amount}&cu=INR&tn=${encodeURIComponent(`${eventTitle} Registration`)}`;

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  const handleSubmit = async () => {
    const cleaned = utrNumber.trim().toUpperCase();
    if (!cleaned || cleaned.length < 6) {
      setError('Please enter a valid UTR / Transaction Reference Number (min 6 characters).');
      return;
    }

    setError(null);
    setSubmitting(true);

    try {
      // Save payment submission
      const { error: insertError } = await supabase
        .from('payment_submissions')
        .insert({
          registration_id: registrationId,
          event_id: String(eventId),
          user_id: userId || null,
          utr_number: cleaned,
          amount: amount,
          submitted_at: new Date().toISOString(),
        });

      if (insertError) throw insertError;

      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to submit payment details. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-5 px-7 pb-7 pt-2 animate-in fade-in duration-400">
      {/* Header */}
      <div className="text-center space-y-1">
        <div className="flex items-center justify-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
            <IndianRupee className="w-4 h-4 text-emerald-400" />
          </div>
          <span className="text-[10px] font-black text-emerald-400/70 uppercase tracking-[0.2em]">Complete Payment</span>
        </div>
        <h3 className="text-xl font-black text-white tracking-tight">Pay Registration Fee</h3>
        <p className="text-white/40 text-xs">
          Scan the QR or click "Pay Now" to complete ₹{amount} payment to complete your registration.
        </p>
      </div>

      {/* Amount + UPI Info */}
      <div className="flex items-center justify-between p-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.04]">
        <div>
          <p className="text-[10px] font-black text-emerald-400/60 uppercase tracking-widest mb-0.5">Pay To</p>
          <p className="text-base font-black text-white">{upiName}</p>
          <p className="text-xs text-white/40 font-mono mt-0.5">{upiId}</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-black text-emerald-400/60 uppercase tracking-widest mb-0.5">Amount</p>
          <p className="text-2xl font-black text-emerald-400">₹{amount}</p>
        </div>
      </div>

      {/* QR Code */}
      <div className="flex flex-col items-center gap-3">
        <div className="p-4 bg-white rounded-2xl shadow-lg shadow-black/30">
          <QRCodeSVG
            value={upiLink}
            size={160}
            level="M"
            includeMargin={false}
          />
        </div>
        <p className="text-[10px] text-white/30 font-bold uppercase tracking-widest text-center">
          Scan with any UPI app
        </p>
      </div>

      {/* UPI apps / copy UPI ID */}
      <div className="grid grid-cols-2 gap-2">
        <a
          href={upiLink}
          className="flex items-center justify-center gap-2 py-3 rounded-2xl bg-indigo-500/15 border border-indigo-500/20 text-indigo-300 text-xs font-black uppercase tracking-wider hover:bg-indigo-500/25 transition-all"
        >
          <Smartphone className="w-3.5 h-3.5" />
          Pay Now
          <ExternalLink className="w-3 h-3 opacity-50" />
        </a>
        <button
          type="button"
          onClick={() => handleCopy(upiId)}
          className="flex items-center justify-center gap-2 py-3 rounded-2xl bg-white/[0.04] border border-white/[0.08] text-white/50 text-xs font-black uppercase tracking-wider hover:bg-white/[0.08] transition-all"
        >
          {copied ? <CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? 'Copied!' : 'Copy UPI ID'}
        </button>
      </div>

      {/* Divider */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-white/[0.06]" />
        <span className="text-[10px] text-white/20 font-black uppercase tracking-widest shrink-0">After Payment</span>
        <div className="flex-1 h-px bg-white/[0.06]" />
      </div>

      {/* UTR Input */}
      <div className="space-y-2">
        <label className="block text-[10px] font-black text-white/30 uppercase tracking-[0.15em] ml-1">
          UTR / Transaction Reference Number
        </label>
        <div className="relative group">
          <Hash className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-indigo-400 transition-colors w-4 h-4" />
          <input
            type="text"
            value={utrNumber}
            onChange={(e) => { setUtrNumber(e.target.value); setError(null); }}
            placeholder="e.g. 407812345678 or T2506201234"
            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-2xl py-3.5 pl-11 pr-4 text-[14px] text-white placeholder-white/20 focus:outline-none focus:bg-white/[0.07] focus:border-indigo-500/40 focus:ring-1 focus:ring-indigo-500/30 transition-all duration-300 font-mono tracking-wider"
          />
        </div>
        <p className="text-[10px] text-white/25 ml-1">
          Find this in your UPI app → Transaction Details → UTR / Reference ID
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-medium">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Submit */}
      <button
        type="button"
        onClick={handleSubmit}
        disabled={submitting || !utrNumber.trim()}
        className="w-full py-4 rounded-2xl font-black text-sm uppercase tracking-[0.15em] text-white transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        style={{
          background: 'linear-gradient(135deg, #059669, #10b981)',
          boxShadow: submitting || !utrNumber.trim() ? 'none' : '0 8px 32px rgba(16,185,129,0.35)',
        }}
      >
        {submitting ? (
          <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</>
        ) : (
          <><CheckCircle className="w-4 h-4" /> Submit UTR & Complete Registration</>
        )}
      </button>

      <p className="text-[10px] text-white/20 text-center leading-relaxed">
        Your registration will be activated once the coordinator verifies your payment (usually within a few hours).
      </p>
    </div>
  );
};
