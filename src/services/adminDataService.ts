import { supabase } from '../lib/supabase';
import { generateRegistrationReceiptPDF } from '../utils/pdfExport';
import type { Registration } from '../types/data';

export interface EmailProgress {
  pct: number;
  stage: string;
}

export const adminDataService = {
  /**
   * Downloads a participant photo from Supabase storage.
   */
  async downloadPhoto(photoUrl: string, participantName: string): Promise<{ success: boolean; message: string }> {
    try {
      const parseStoragePath = (url: string): { bucket: string; name: string } | null => {
        const m = url.match(/\/storage\/v1\/object\/(?:public|authenticated)\/([^/]+)\/(.+)$/);
        if (m) return { bucket: decodeURIComponent(m[1]), name: decodeURIComponent(m[2]) };
        
        const knownBuckets = ['registration-photos'];
        for (const b of knownBuckets) {
          const idx = url.indexOf(`${b}/`);
          if (idx >= 0) return { bucket: b, name: decodeURIComponent(url.slice(idx + b.length + 1)) };
        }
        return null;
      };

      const parsed = parseStoragePath(photoUrl);
      let blob: Blob | null = null;

      if (parsed) {
        const { data, error } = await supabase.storage.from(parsed.bucket).download(parsed.name);
        if (error) throw error;
        blob = data as Blob;
      } else {
        const response = await fetch(photoUrl);
        if (!response.ok) throw new Error('Failed to fetch photo');
        blob = await response.blob();
      }

      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      
      const extension = blob.type.split('/')[1] || 'jpg';
      const filename = `${participantName.replace(/[^a-z0-9]/gi, '_')}_photo.${extension}`;
      link.download = filename;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      setTimeout(() => URL.revokeObjectURL(blobUrl), 100);
      return { success: true, message: 'Photo downloaded successfully' };
    } catch (error: any) {
      console.error('Error downloading photo:', error);
      return { success: false, message: error.message || 'Failed to download photo' };
    }
  },

  /**
   * Uploads a watermark or stamp to Supabase storage.
   */
  async uploadBrandAsset(file: File, type: 'watermark' | 'stamp'): Promise<{ success: boolean; url?: string; message: string }> {
    if (!file.type.includes('png') && !file.type.includes('svg')) {
      return { success: false, message: `Please upload a PNG or SVG file for the ${type}.` };
    }

    try {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'png';
      const fileName = `${type}.${ext}`;
      
      const { error } = await supabase.storage
        .from('pdf-watermarks')
        .upload(fileName, file, { 
          cacheControl: '0',
          upsert: true 
        });
      
      if (error) throw error;
      
      const { data } = await supabase.storage
        .from('pdf-watermarks')
        .getPublicUrl(fileName);
      
      if (data?.publicUrl) {
        const urlWithCacheBuster = `${data.publicUrl}?t=${Date.now()}`;
        return { success: true, url: urlWithCacheBuster, message: `${type.charAt(0).toUpperCase() + type.slice(1)} uploaded successfully!` };
      }
      return { success: false, message: 'Failed to retrieve public URL.' };
    } catch (error: any) {
      console.error(`${type} upload failed:`, error);
      return { success: false, message: error.message || `Failed to upload ${type}.` };
    }
  },

  /**
   * Deletes a brand asset from storage.
   */
  async deleteBrandAsset(type: 'watermark' | 'stamp'): Promise<{ success: boolean; message: string }> {
    try {
      await supabase.storage
        .from('pdf-watermarks')
        .remove([`${type}.png`, `${type}.svg`]);
      return { success: true, message: `${type.charAt(0).toUpperCase() + type.slice(1)} removed.` };
    } catch (error: any) {
      console.error(`Failed to delete ${type}:`, error);
      return { success: false, message: error.message || `Failed to delete ${type}.` };
    }
  },

  /**
   * Sends an approval email with a PDF receipt.
   */
  async sendApprovalEmail(
    registration: Registration,
    options: {
      emailProvider: 'smtp' | 'resend';
      events: any[];
      eventCoordinators: any[];
      watermarkDataUrl: string | null;
      stampDataUrl: string | null;
      onProgress?: (progress: EmailProgress) => void;
    }
  ): Promise<{ success: boolean; error?: string }> {
    const { emailProvider, events, eventCoordinators, watermarkDataUrl, stampDataUrl, onProgress } = options;
    
    try {
      onProgress?.({ pct: 5, stage: 'Preparing data...' });
      const sessionData = await supabase.auth.getSession();
      const token = sessionData.data.session?.access_token;
      if (!token) return { success: false, error: 'Authorization token not found' };

      const event = events.find(e => e.id === registration.event_id);

      // 1. Generate PDF Receipt
      onProgress?.({ pct: 20, stage: 'Generating Receipt PDF...' });
      let pdfBase64: string | null = null;
      try {
        // Use any to bypass strict type check for the internal pdfExport Registration type
        const regForReceipt = { ...registration, status: 'approved' } as any;
        pdfBase64 = await generateRegistrationReceiptPDF(
          regForReceipt, 
          watermarkDataUrl, 
          stampDataUrl
        );
        
        onProgress?.({ pct: 50, stage: 'Validating Attachment...' });
        const sizeInMB = (pdfBase64.length * 0.75) / (1024 * 1024);
        if (sizeInMB > 3) {
          console.warn('PDF too large, sending without attachment');
          pdfBase64 = null;
        }
      } catch (pdfError: any) {
        console.error('PDF generation failed:', pdfError);
      }

      // 2. Send Email
      onProgress?.({ pct: 70, stage: 'Sending Email...' });
      
      const safeTeamMembers = (r: any): any[] => {
        const tm = r.team_members;
        if (Array.isArray(tm)) return tm;
        if (typeof tm === 'string') {
          try { return JSON.parse(tm); } catch { return []; }
        }
        return [];
      };

      const res = await fetch('/api/send-confirmation', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          registrationId: registration.id,
          email: registration.email,
          fullName: registration.full_name,
          eventTitle: registration.event_title,
          eventDate: event?.date || 'TBA',
          eventTime: event?.time || 'TBA',
          eventVenue: event?.venue || 'TBA',
          provider: emailProvider,
          coordinators: eventCoordinators
            .filter(c => c.event_id === registration.event_id)
            .map(c => `${c.name}${c.phone ? ` (${c.phone})` : ''}`)
            .join(', '),
          teamMembers: safeTeamMembers(registration),
          pdfAttachment: pdfBase64
        })
      });

      onProgress?.({ pct: 95, stage: 'Finalizing...' });

      if (!res.ok) {
        const err = await res.json();
        return { success: false, error: err.error || 'Server error' };
      }
      
      return { success: true };
    } catch (error: any) {
      console.error('Email service error:', error);
      return { success: false, error: error.message };
    }
  }
};
