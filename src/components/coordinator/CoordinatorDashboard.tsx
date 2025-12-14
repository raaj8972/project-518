import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../../context/DataContext';
import { useToast } from '../ToastProvider';
import { LogOut, Save, MessageCircle, Link as LinkIcon, ExternalLink, Users, Clock } from 'lucide-react';

// WhatsApp Logo SVG Component
const WhatsAppLogo = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
  </svg>
);

export const CoordinatorDashboard: React.FC = () => {
  const navigate = useNavigate();
  // We still use useData for events (public) but NOT for registrations (RLS protected)
  const { events } = useData(); 
  const { push } = useToast();
  
  const [session, setSession] = useState<{ eventId: number; eventTitle: string; token?: string } | null>(null);
  const [whatsappLink, setWhatsappLink] = useState('');
  const [linkSaving, setLinkSaving] = useState(false);
  
  // Local state for registrations fetched via RPC
  const [rpcRegistrations, setRpcRegistrations] = useState<any[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Load session and fetch data
  useEffect(() => {
    let mounted = true;

    const loadData = async () => {
      try {
        const stored = sessionStorage.getItem('coordinator_session');
        if (!stored) {
          navigate('/coordinator');
          return;
        }

        const data = JSON.parse(stored);
        
        // Check if token expired (client-side check)
        if (data.expiresAt && new Date(data.expiresAt) < new Date()) {
          sessionStorage.removeItem('coordinator_session');
          push({ message: 'Session expired. Please login again.', type: 'error' });
          navigate('/coordinator');
          return;
        }
        
        if (mounted) setSession(data);
        
        // Load WhatsApp link from event data
        const event = events.find((e: any) => e.id === data.eventId);
        if (event?.whatsapp_group_link && mounted) {
          setWhatsappLink(event.whatsapp_group_link);
        }

        // Fetch registrations using RPC if we have the token
        if (data.token) {
          if (mounted) setIsLoadingData(true);
          const { supabase } = await import('../../lib/supabase');
          
          console.log('Fetching secure data...', { eventId: data.eventId, hasToken: !!data.token });
          
          // Use NEW signature with token
          const { data: regs, error } = await supabase.rpc('get_coordinator_registrations', {
            event_id_param: data.eventId,
            token_param: data.token
          });

          if (error) {
            console.error('RPC Fetch Error:', error);
            if (mounted) {
              setRpcRegistrations([]);
              setErrorMsg(error.message || 'Failed to load data. The session may have expired.');
            }
          } else {
            console.log('RPC Fetch Success:', regs?.length || 0, 'registrations');
            if (mounted) {
              setRpcRegistrations(regs || []);
              setErrorMsg(null);
            }
          }
        } else {
          console.warn('No token in session');
          if (mounted) setErrorMsg('Session expired. Please logout and login again.');
        }
      } catch (error) {
        console.error('Failed to load coordinator session or data:', error);
        if (mounted) setErrorMsg('System error loading data');
      } finally {
        if (mounted) setIsLoadingData(false);
      }
    };

    loadData();

    return () => { mounted = false; };
  }, [navigate, events]);

  const handleLogout = () => {
    sessionStorage.removeItem('coordinator_session');
    navigate('/coordinator');
    push({ message: 'Logged out successfully', type: 'success' });
  };

  const handleSaveLink = async () => {
    if (!session) return;
    try {
      setLinkSaving(true);
      const { supabase } = await import('../../lib/supabase');
      // Note: We use the secure update RPC with token validation
      const { error } = await supabase.rpc('update_event_whatsapp_link', {
        event_id_param: session.eventId,
        token_param: session.token,
        new_link: whatsappLink
      });
      
      if (error) throw error;
      push({ message: 'WhatsApp link updated!', type: 'success' });
    } catch (e: any) {
      console.error('Update failed', e);
      push({ message: 'Failed to save link', type: 'error' });
    } finally {
      setLinkSaving(false);
    }
  };

  // Process registrations stats
  const { approvedRegs, pendingCount, totalFound } = useMemo(() => {
    const approved = rpcRegistrations.filter((r: any) => r.status === 'approved' || r.status === 'Approved');
    const pending = rpcRegistrations.filter((r: any) => r.status === 'pending' || r.status === 'Pending');
    
    return {
      approvedRegs: approved.sort((a: any, b: any) => a.full_name.localeCompare(b.full_name)),
      pendingCount: pending.length,
      totalFound: rpcRegistrations.length
    };
  }, [rpcRegistrations]);

  if (!session) return null;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <div>
             <h1 className="text-xl font-bold text-gray-900">Coordinator Dashboard</h1>
             <p className="text-sm text-purple-600 font-medium">{session.eventTitle}</p>
          </div>
          <button 
            onClick={handleLogout}
            className="flex items-center text-sm text-gray-500 hover:text-red-600 transition-colors"
          >
            <LogOut size={16} className="mr-2" />
            Logout
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6 sm:px-6 lg:px-8 space-y-6">
        {/* WhatsApp Link Section */}
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-green-500">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex-1 w-full">
              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                <MessageCircle size={16} className="text-green-600 mr-2" />
                WhatsApp Group Link
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <LinkIcon size={14} className="text-gray-400" />
                  </div>
                  <input
                    type="url"
                    value={whatsappLink}
                    onChange={(e) => setWhatsappLink(e.target.value)}
                    className="block w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 text-gray-900 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-green-500 focus:border-green-500 sm:text-sm"
                    placeholder="https://chat.whatsapp.com/..."
                    style={{ color: '#111827' }}
                  />
                </div>
                <button
                  onClick={handleSaveLink}
                  disabled={linkSaving}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                >
                  {linkSaving ? 'Saving...' : <><Save size={16} className="mr-2" /> Save</>}
                </button>
                {whatsappLink && (
                  <a 
                    href={whatsappLink} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                  >
                    <ExternalLink size={16} />
                  </a>
                )}
              </div>
              <p className="mt-1 text-xs text-gray-500">
                This link will be sent to students when you click the WhatsApp icon next to their name below.
              </p>
            </div>
          </div>
        </div>

        {/* Approved Participants */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Approved Participants</h2>
            <p className="text-sm text-gray-600 mb-6">
              Showing approved registrations for {session.eventTitle}
            </p>

            <div className="space-y-4">
              {/* Error Message */}
              {errorMsg && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4 text-red-700 text-sm">
                  {errorMsg}
                </div>
              )}

              {/* Stats Overview */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-green-600" />
                    <span className="font-medium text-green-900">Approved</span>
                  </div>
                  <div className="text-2xl font-bold text-green-700 mt-2">
                    {isLoadingData ? "..." : approvedRegs.length}
                  </div>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-yellow-600" />
                    <span className="font-medium text-yellow-900">Pending</span>
                  </div>
                  <div className="text-2xl font-bold text-yellow-700 mt-2">
                    {isLoadingData ? "..." : pendingCount}
                  </div>
                </div>
              </div>

              {/* List Header */}
              <div className="flex justify-between items-center mt-6">
                 <h2 className="text-lg font-semibold text-gray-800">Approved Participants List</h2>
                 <span className="text-xs text-gray-500">Total Records: {totalFound}</span>
              </div>

              {/* Participants List */}
              {isLoadingData ? (
                <div className="text-center py-12">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
                  <p className="mt-3 text-gray-600">Loading participants...</p>
                </div>
              ) : approvedRegs.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>No approved participants yet</p>
                </div>
              ) : (
                <>
                  {/* Mobile View - Cards */}
                  <div className="block md:hidden space-y-3">
                    {approvedRegs.map((reg: any, index: number) => (
                      <div key={reg.reg_id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-medium text-gray-500">#{index + 1}</span>
                              <h3 className="font-semibold text-gray-900">{reg.full_name}</h3>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-gray-600 mt-2">
                              <span>{reg.phone}</span>
                              {reg.phone && whatsappLink && (
                                <a
                                  href={`https://wa.me/91${reg.phone.replace(/[^0-9]/g, '').replace(/^91/, '')}?text=${encodeURIComponent(`Hello ${reg.full_name.split(' ')[0]}! 👋\n\nYou have successfully registered for *${session.eventTitle}* at Ricorrenza 2026! 🎭\n\nPlease join the official WhatsApp group for important updates:\n\n${whatsappLink}`)}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center text-green-600 hover:text-green-700 hover:bg-green-50 rounded p-1.5 transition-colors"
                                  title="Send WhatsApp group link"
                                >
                                  <WhatsAppLogo className="w-5 h-5" />
                                </a>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Desktop View - Table */}
                  <div className="hidden md:block border border-gray-200 rounded-lg overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">#</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {approvedRegs.map((reg: any, index: number) => (
                          <tr key={reg.reg_id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{index + 1}</td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">{reg.full_name}</td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                              <div className="flex items-center gap-2">
                                {reg.phone}
                                {reg.phone && whatsappLink && (
                                  <a
                                    href={`https://wa.me/91${reg.phone.replace(/[^0-9]/g, '').replace(/^91/, '')}?text=${encodeURIComponent(`Hello ${reg.full_name.split(' ')[0]}! 👋\n\nYou have successfully registered for *${session.eventTitle}* at Ricorrenza 2026! 🎭\n\nPlease join the official WhatsApp group for important updates:\n\n${whatsappLink}`)}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center text-green-600 hover:text-green-700 hover:bg-green-50 rounded p-1 transition-colors"
                                    title="Send WhatsApp group link"
                                  >
                                    <WhatsAppLogo className="w-4 h-4" />
                                  </a>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
