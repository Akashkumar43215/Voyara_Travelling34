import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Compass,
  MapPin,
  Hotel,
  Briefcase,
  User,
  Shield,
  Menu,
  X,
  LogOut,
  UserPlus,
  Heart,
  Home,
  Info,
  Phone,
  ChevronDown
} from 'lucide-react';

import { useAuth } from '../context/AuthContext';
import ThemeToggle from './ThemeToggle';
import LanguageToggle from './LanguageToggle';
import { useLanguage } from '../context/LanguageContext';

const Navbar = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const { t } = useLanguage();
  const [scrolled, setScrolled] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const accountRef = useRef(null);

  const {
    user,
    isAuthenticated,
    logout
  } = useAuth();

  // Track scroll so the navbar can be transparent over the home hero
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const overHero = location.pathname === '/' && !scrolled && !mobileMenuOpen;

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
    setAccountOpen(false);
  }, [location.pathname]);

  // The account menu closes on an outside click or Escape
  useEffect(() => {
    if (!accountOpen) return undefined;

    const onClick = (event) => {
      if (!accountRef.current?.contains(event.target)) setAccountOpen(false);
    };
    const onKey = (event) => event.key === 'Escape' && setAccountOpen(false);

    document.addEventListener('mousedown', onClick);
    window.addEventListener('keydown', onKey);

    return () => {
      document.removeEventListener('mousedown', onClick);
      window.removeEventListener('keydown', onKey);
    };
  }, [accountOpen]);

  const isActive = (path) => {
    return location.pathname === path ? 'active' : '';
  };

  const closeMenu = () => setMobileMenuOpen(false);

  const handleLogout = () => {
    logout();
    closeMenu();
  };

  return (
    <>
      <header className={`navbar-wrapper ${overHero ? 'on-hero' : ''}`}>
        <div className="container">
          <nav className="navbar">

            {/* 1. Brand Logo */}
            <Link
              to="/"
              className="nav-brand"
              onClick={closeMenu}
            >
              <div className="nav-brand-logo">
                <Compass size={22} />
              </div>

              <div>
                <span>VOYARA</span>
                <span className="nav-brand-sub">
                  {t('nav.tagline')}
                </span>
              </div>
            </Link>

            {/* 2. Navigation Links */}
            <ul
              className={`nav-menu ${
                mobileMenuOpen ? 'mobile-open' : ''
              }`}
            >
              <li>
                <Link
                  to="/"
                  className={`nav-link ${isActive('/')}`}
                  onClick={closeMenu}
                >
                  <Home size={15} />
                  {t('nav.home')}
                </Link>
              </li>

              <li>
                <Link
                  to="/state-region"
                  className={`nav-link ${
                    location.pathname === '/state-region' ||
                    location.pathname.startsWith('/places')
                      ? 'active'
                      : ''
                  }`}
                  onClick={closeMenu}
                >
                  <Compass size={15} />
                  {t('nav.destinations')}
                </Link>
              </li>

              <li>
                <Link
                  to="/stays"
                  className={`nav-link ${isActive('/stays')}`}
                  onClick={closeMenu}
                >
                  <Hotel size={15} />
                  {t('nav.stays')}
                </Link>
              </li>

              <li>
                <Link
                  to="/trips"
                  className={`nav-link ${isActive('/trips')}`}
                  onClick={closeMenu}
                >
                  <Briefcase size={15} />
                  {t('nav.trips')}
                </Link>
              </li>

              <li>
                <Link
                  to="/favorites"
                  className={`nav-link ${isActive('/favorites')}`}
                  onClick={closeMenu}
                >
                  <Heart size={15} />
                  {t('nav.favorites')}
                </Link>
              </li>

              <li className="nav-extra">
                <Link
                  to="/about"
                  className={`nav-link ${isActive('/about')}`}
                  aria-label={t('nav.about')}
                  title={t('nav.about')}
                  onClick={closeMenu}
                >
                  <Info size={15} />
                  {t('nav.about')}
                </Link>
              </li>

              <li className="nav-extra">
                <Link
                  to="/contact"
                  className={`nav-link ${isActive('/contact')}`}
                  aria-label={t('nav.contact')}
                  title={t('nav.contact')}
                  onClick={closeMenu}
                >
                  <Phone size={15} />
                  {t('nav.contact')}
                </Link>
              </li>

              {/* =========================
                  MOBILE AUTH ACTIONS
              ========================= */}

              {!isAuthenticated ? (
                <>
                  <li className="mobile-only-action">
                    <Link
                      to="/register"
                      className="btn btn-primary"
                      style={{
                        width: '100%',
                        justifyContent: 'center'
                      }}
                      onClick={closeMenu}
                    >
                      <UserPlus size={15} />
                      {t('nav.register')}
                    </Link>
                  </li>

                  <li className="mobile-only-action">
                    <Link
                      to="/login"
                      className="btn btn-primary"
                      style={{
                        width: '100%',
                        justifyContent: 'center'
                      }}
                      onClick={closeMenu}
                    >
                      <User size={15} />
                      {t('nav.travelerLogin')}
                    </Link>
                  </li>
                </>
              ) : (
                <>
                  <li className="mobile-only-action">
                    <div className="nav-user-mobile">
                      <User size={16} />
                      <span>
                        {t('nav.welcome', { name: user?.name || t('nav.traveler') })}
                      </span>
                    </div>
                  </li>

                  <li className="mobile-only-action">
                    <button
                      type="button"
                      className="btn btn-primary"
                      style={{
                        width: '100%',
                        justifyContent: 'center'
                      }}
                      onClick={handleLogout}
                    >
                      <LogOut size={15} />
                      {t('nav.logout')}
                    </button>
                  </li>
                </>
              )}

              {/* Mobile Admin */}
              {user?.role === 'admin' && (
              <li className="mobile-only-action">
                <Link
                  to="/admin"
                  className="btn btn-admin"
                  style={{
                    width: '100%',
                    justifyContent: 'center'
                  }}
                  onClick={closeMenu}
                >
                  <Shield size={14} />
                  {t('nav.adminPortal')}
                </Link>
              </li>
              )}
            </ul>

            {/* Over the home hero (wide screens): two-line shortcuts in the middle of the bar */}
            <div className="nav-utility">
              <Link to="/state-region" className="nav-util">
                <span className="nav-util-icon"><Compass size={20} /></span>
                <span className="nav-util-text">
                  <strong>{t('nav.destinations')}</strong>
                  <small>Explore 36 states</small>
                </span>
              </Link>

              <Link to="/stays" className="nav-util">
                <span className="nav-util-icon"><Hotel size={20} /></span>
                <span className="nav-util-text">
                  <strong>{t('nav.stays')}</strong>
                  <small>Hotels and villas</small>
                </span>
              </Link>

              <Link to="/trips" className="nav-util">
                <span className="nav-util-icon"><Briefcase size={20} /></span>
                <span className="nav-util-text">
                  <strong>{t('nav.trips')}</strong>
                  <small>Manage bookings</small>
                </span>
              </Link>

              <Link to="/favorites" className="nav-util">
                <span className="nav-util-icon"><Heart size={20} /></span>
                <span className="nav-util-text">
                  <strong>{t('nav.favorites')}</strong>
                  <small>Save favourites</small>
                </span>
              </Link>
            </div>

            {/* 3. Desktop Actions */}
            <div className="nav-actions">

              {/* Admin (visible to admins only) */}
              {user?.role === 'admin' && (
                <Link
                  to="/admin"
                  className="btn btn-admin"
                >
                  <Shield size={14} />
                  {t('nav.admin')}
                </Link>
              )}

              {/* Authentication */}
              {!isAuthenticated ? (
                <>
                  <Link
                    to="/register"
                    className="btn btn-primary nav-guest-btn"
                  >
                    <UserPlus size={15} />
                    {t('nav.register')}
                  </Link>

                  <Link
                    to="/login"
                    className="btn btn-primary nav-guest-btn"
                  >
                    <User size={15} />
                    {t('nav.login')}
                  </Link>

                  {/* Over the home hero: one blue pill with a small menu */}
                  <div className="nav-account" ref={accountRef}>
                    <button
                      type="button"
                      className="nav-account-btn"
                      aria-haspopup="menu"
                      aria-expanded={accountOpen}
                      onClick={() => setAccountOpen((open) => !open)}
                    >
                      <span className="nav-account-icon"><User size={16} /></span>
                      <span className="nav-account-text">{t('nav.login')} / {t('nav.register')}</span>
                      <ChevronDown size={16} />
                    </button>

                    {accountOpen && (
                      <ul className="nav-account-menu" role="menu">
                        <li role="none"><Link role="menuitem" to="/login"><User size={15} /> {t('nav.login')}</Link></li>
                        <li role="none"><Link role="menuitem" to="/register"><UserPlus size={15} /> {t('footer.createAccount')}</Link></li>
                      </ul>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <div className="nav-user">
                    <User size={15} />
                    <span>
                      {user?.name || t('nav.traveler')}
                    </span>
                  </div>

                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleLogout}
                  >
                    <LogOut size={15} />
                    {t('nav.logout')}
                  </button>
                </>
              )}

              {/* English / Hindi */}
              <LanguageToggle />

              {/* Light / dark mode */}
              <ThemeToggle />

              {/* Mobile Hamburger Toggle */}
              <button
                className="nav-toggle"
                onClick={() =>
                  setMobileMenuOpen(!mobileMenuOpen)
                }
                aria-label={t('nav.menu')}
              >
                {mobileMenuOpen ? (
                  <X size={26} />
                ) : (
                  <Menu size={26} />
                )}
              </button>
            </div>
          </nav>
        </div>
      </header>

      {/* Backdrop for mobile drawer */}
      {mobileMenuOpen && (
        <div
          className="mobile-backdrop"
          onClick={closeMenu}
          aria-hidden="true"
        />
      )}
    </>
  );
};

export default Navbar;