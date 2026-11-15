import { Navigate } from 'react-router-dom';

/** Legacy links use the common admin sign-in and owner-assigned sports pages. */
export const SportsLogin = () => <Navigate to="/login" replace />;
