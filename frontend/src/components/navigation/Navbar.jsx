import { NavLink, Link, useNavigate, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import Button from '../ui/Button';

const primaryNavItems = [
  { to: '/', label: 'Home' },
  { to: '/discover', label: 'Discover' },
  { to: '/discover?industry=bollywood', label: 'Bollywood', industryKey: 'bollywood' },
  { to: '/discover?industry=hollywood', label: 'Hollywood', industryKey: 'hollywood' },
  { to: '/discover?industry=anime', label: 'Anime', industryKey: 'anime' },
  { to: '/recommendations', label: 'Recommendations' },
  { to: '/watchlist', label: 'Watchlist' },
  { to: '/favorites', label: 'Favorites' },
];

export default function Navbar() {
  const { isAuthenticated, user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const isCurrentActive = (item) => {
    if (item.industryKey) {
      const search = new URLSearchParams(location.search);
      return location.pathname === '/discover' && search.get('industry') === item.industryKey;
    }
    if (item.to === '/discover') {
      const search = new URLSearchParams(location.search);
      return location.pathname === '/discover' && !search.get('industry');
    }
    return location.pathname === item.to;
  };

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-slate-950/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <Link to="/" className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-sm font-black text-slate-950">
            M
          </div>
          <div>
            <div className="text-lg font-black tracking-[0.18em] text-white">MOVIE</div>
          </div>
        </Link>

        {/* Desktop Navigation with Industry Links */}
        <nav className="hidden items-center gap-5 lg:flex">
          {primaryNavItems.map((item) => {
            const active = isCurrentActive(item);
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={`text-sm font-medium transition ${
                  active ? 'text-amber-300 font-semibold' : 'text-slate-300 hover:text-white'
                }`}
              >
                {item.label}
              </NavLink>
            );
          })}
        </nav>

        {/* User Auth controls */}
        <div className="hidden items-center gap-3 md:flex">
          {isAuthenticated ? (
            <>
              <Link to="/profile" className="text-sm text-slate-300 hover:text-white">
                Hi, {user?.name || 'Viewer'}
              </Link>
              <Button variant="secondary" onClick={handleLogout}>
                Logout
              </Button>
            </>
          ) : (
            <>
              <Link to="/login">
                <Button variant="secondary">Login</Button>
              </Link>
              <Link to="/register">
                <Button>Join free</Button>
              </Link>
            </>
          )}
        </div>

        {/* Mobile Hamburger Button */}
        <button
          type="button"
          className="rounded-full border border-white/10 p-2 text-white lg:hidden"
          onClick={() => setMenuOpen((open) => !open)}
          aria-label="Toggle navigation menu"
        >
          ☰
        </button>
      </div>

      {/* Mobile Drawer Menu */}
      {menuOpen && (
        <div className="border-t border-white/10 bg-slate-950 px-4 py-3 lg:hidden">
          <div className="flex flex-col gap-2">
            {primaryNavItems.map((item) => {
              const active = isCurrentActive(item);
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setMenuOpen(false)}
                  className={`rounded-lg px-3 py-2 text-sm ${
                    active ? 'bg-white/10 text-amber-300 font-semibold' : 'text-slate-300'
                  }`}
                >
                  {item.label}
                </NavLink>
              );
            })}
            {!isAuthenticated ? (
              <div className="mt-3 flex gap-2">
                <Link to="/login" className="flex-1" onClick={() => setMenuOpen(false)}>
                  <Button variant="secondary" className="w-full">
                    Login
                  </Button>
                </Link>
                <Link to="/register" className="flex-1" onClick={() => setMenuOpen(false)}>
                  <Button className="w-full">Join free</Button>
                </Link>
              </div>
            ) : (
              <Button
                variant="secondary"
                className="mt-2 w-full"
                onClick={() => {
                  setMenuOpen(false);
                  handleLogout();
                }}
              >
                Logout
              </Button>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
