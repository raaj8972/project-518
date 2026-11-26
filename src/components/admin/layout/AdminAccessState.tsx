import { useNavigate } from 'react-router-dom';
import { ReloadIcon } from '@radix-ui/react-icons';
import { AdminLightAppearance } from './AdminLightAppearance';
import { BrandMark } from '../../BrandMark';
import '../../../styles/AdminWorkspace.css';

export function AdminAccessState({ state }: { state: 'loading' | 'timeout' | 'logout' }) {
  const navigate = useNavigate();
  const failed = state === 'timeout';
  return <div className="admin-access-state"><AdminLightAppearance /><section role={failed ? 'alert' : 'status'}>
    <BrandMark allowCachedWhileLoading width={42} height={42} alt="" />
    <span>RICORRENZA / FESTIVAL MANAGEMENT</span>
    <h1>{failed ? 'Your workspace couldn’t connect.' : state === 'logout' ? 'Signing you out…' : 'Opening your workspace…'}</h1>
    <p>{failed ? 'Check your connection and try again. Your account permissions stay the same.' : state === 'logout' ? 'Closing your admin session.' : 'Checking your session and loading your assigned pages.'}</p>
    {failed ? <div><button className="admin-primary-button" onClick={() => window.location.reload()}><ReloadIcon />Try again</button><button className="admin-secondary-button" onClick={() => navigate('/login')}>Back to sign in</button></div> : <div className="admin-access-progress"><i /><i /><i /></div>}
  </section></div>;
}
