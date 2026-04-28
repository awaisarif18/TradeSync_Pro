'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'sonner';
import { logout } from '../../redux/slices/authSlice';
import type { AppDispatch, RootState } from '../../redux/slices/store';
import { Button, Logo } from '../ui';

type NavLink = {
  name: string;
  href: string;
  active?: boolean;
};

function NavAnchor({ link }: { link: NavLink }) {
  return (
    <Link
      href={link.href}
      style={{
        color: link.active ? 'var(--color-text)' : 'var(--color-text-2)',
        textDecoration: 'none',
        fontSize: 14,
        fontWeight: 500,
        transition: 'color 0.15s',
      }}
    >
      {link.name}
    </Link>
  );
}

function activeButtonStyle(kind: 'dashboard' | 'admin', active: boolean) {
  if (!active) return undefined;
  if (kind === 'admin') {
    return {
      background: 'var(--color-danger-soft)',
      border: '1px solid var(--color-danger)',
      color: 'var(--color-danger)',
    };
  }
  return {
    background: 'var(--color-mint-soft)',
    border: '1px solid var(--color-mint)',
    color: 'var(--color-mint)',
  };
}

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const { isAuthenticated, user } = useSelector((state: RootState) => state.auth);
  const role = user?.role;

  const handleLogout = () => {
    dispatch(logout());
    toast.success('Signed out');
    router.push('/login');
  };
  const dashboardActive = pathname.startsWith('/dashboard');
  const adminActive = pathname.startsWith('/admin');

  const publicLinks: NavLink[] = [
    { name: 'Discover', href: '/traders', active: pathname.startsWith('/traders') },
    { name: 'How it works', href: pathname === '/' ? '#how' : '/#how' },
    { name: 'Pricing', href: '#pricing' },
    { name: 'Docs', href: '#docs' },
  ];

  const authLinks: NavLink[] = [
    ...(role === 'SLAVE' || role === 'ADMIN'
      ? [{ name: 'Discover', href: '/traders', active: pathname.startsWith('/traders') }]
      : []),
    ...(role === 'MASTER' || role === 'SLAVE' || role === 'ADMIN'
      ? [{ name: 'Dashboard', href: '/dashboard', active: dashboardActive }]
      : []),
    ...(role === 'ADMIN' ? [{ name: 'Admin', href: '/admin', active: adminActive }] : []),
  ];

  const centerLinks = isAuthenticated ? authLinks : publicLinks;

  return (
    <nav
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        background: 'rgba(10,14,13,0.85)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--color-line)',
      }}
    >
      <div
        style={{
          maxWidth: 1240,
          margin: '0 auto',
          padding: '16px 32px',
          display: 'flex',
          alignItems: 'center',
          gap: 32,
        }}
      >
        <Logo size="md" asLink />

        <div className="nav-center" style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
          {centerLinks.map((link) => (
            <NavAnchor key={link.name} link={link} />
          ))}
        </div>

        <div className="nav-actions" style={{ marginLeft: 'auto', display: 'flex', gap: 10, alignItems: 'center' }}>
          {!isAuthenticated ? (
            <>
              <Link href="/login" style={{ textDecoration: 'none' }}>
                <Button variant="ghost" size="sm">Sign in</Button>
              </Link>
              <Link href="/register" style={{ textDecoration: 'none' }}>
                <Button variant="primary" size="sm">Get started</Button>
              </Link>
            </>
          ) : (
            <>
              <Link href="/dashboard" style={{ textDecoration: 'none' }}>
                <Button
                  variant="ghost"
                  size="sm"
                  style={activeButtonStyle('dashboard', dashboardActive)}
                >
                  Dashboard
                </Button>
              </Link>
              {role === 'ADMIN' ? (
                <Link href="/admin" style={{ textDecoration: 'none' }}>
                  <Button
                    variant="ghost"
                    size="sm"
                    style={activeButtonStyle('admin', adminActive)}
                  >
                    Admin
                  </Button>
                </Link>
              ) : null}
              <Button type="button" variant="ghost" size="sm" onClick={handleLogout}>
                Log out
              </Button>
            </>
          )}
        </div>

        <div
          className="nav-mobile-action"
          style={{
            marginLeft: 'auto',
            display: 'none',
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
          }}
        >
          {/* TODO: replace this compact mobile fallback with the full mobile nav redesign. */}
          {isAuthenticated ? (
            <>
              <Link href="/dashboard" style={{ textDecoration: 'none' }}>
                <Button variant="primary" size="sm">
                  Dashboard
                </Button>
              </Link>
              <Button type="button" variant="ghost" size="sm" onClick={handleLogout}>
                Log out
              </Button>
            </>
          ) : (
            <Link href="/login" style={{ textDecoration: 'none' }}>
              <Button variant="primary" size="sm">
                Sign in
              </Button>
            </Link>
          )}
        </div>
      </div>
      <style>{`
        @media (max-width: 639px) {
          .nav-center,
          .nav-actions {
            display: none !important;
          }

          .nav-mobile-action {
            display: flex !important;
          }
        }
      `}</style>
    </nav>
  );
}
