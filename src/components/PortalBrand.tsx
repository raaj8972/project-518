import { Link } from 'react-router-dom';
import BrandLogo3D from './BrandLogo3D';
import { BRAND_NAME } from '../constants/brand';
import '../styles/PortalBrand.css';

interface PortalBrandProps {
  logo: string;
  year: string | number;
  onNavigate: () => void;
}

export function PortalBrand({ logo, year, onNavigate }: PortalBrandProps) {
  return (
    <Link to="/" onClick={onNavigate} className="portal-brand pointer-events-auto" aria-label={`${BRAND_NAME} ${year} home`}>
      <span className="portal-brand__mark" aria-hidden="true">
        <BrandLogo3D src={logo} size={48} glowStrength={0} animated={false} alt="" />
      </span>
      <span className="portal-brand__copy">
        <span className="portal-brand__name">Ricorrenza</span>
        <span className="portal-brand__caption">The annual cultural fest</span>
      </span>
      <span className="portal-brand__edition">
        <span>Edition</span>
        <strong>{year}</strong>
      </span>
    </Link>
  );
}
