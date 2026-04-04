import { Link } from 'react-router-dom';
import PublicShell from './PublicShell';

export default function AuthShell({ title, subtitle, children }) {
  return (
    <PublicShell variant="auth" showNav={false}>
      <div className="auth-card">
        <p className="auth-kicker">
          <Link to="/" className="auth-back">
            ← Home
          </Link>
        </p>
        <h1 className="auth-title">{title}</h1>
        {subtitle ? <p className="auth-subtitle">{subtitle}</p> : null}
        {children}
      </div>
    </PublicShell>
  );
}
