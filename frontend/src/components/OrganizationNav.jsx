import { Link, useParams } from 'react-router-dom';

function tabClass(isActive) {
  return `org-nav-link${isActive ? ' org-nav-link--active' : ''}`;
}

export default function OrganizationNav({ active }) {
  const { orgId } = useParams();

  if (!orgId) return null;

  const base = `/organizations/${orgId}`;

  return (
    <nav className="org-nav" aria-label="Organization">
      <Link className={tabClass(active === 'projects')} to={`${base}/projects`}>
        Projects
      </Link>
      <Link className={tabClass(active === 'members')} to={`${base}/members`}>
        Members
      </Link>
      <Link className={tabClass(active === 'settings')} to={`${base}/settings`}>
        Settings
      </Link>
    </nav>
  );
}
