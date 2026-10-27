import React from 'react';
import { Link } from 'react-router-dom';
import { Compass, Heart, ShieldCheck, Sparkles, MapPin } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

const Footer = () => {
  const { t } = useLanguage();

  return (
    <footer className="footer" id="footer">
      <div className="container">
        <div className="footer-grid">
          {/* Brand Col */}
          <div className="footer-brand">
            <h3>
              <Compass size={24} color="#10b981" /> VOYARA
            </h3>
            <p>{t('footer.about')}</p>
            <div className="viva-badge">
              {t('footer.built')}
            </div>
          </div>

          {/* Quick Links */}
          <div className="footer-col">
            <h4>{t('footer.navigation')}</h4>
            <ul className="footer-links">
              <li><Link to="/">{t('nav.home')}</Link></li>
              <li><Link to="/state-region">{t('footer.explore')}</Link></li>
              <li><Link to="/stays">{t('footer.accommodations')}</Link></li>
              <li><Link to="/trips">{t('footer.bookings')}</Link></li>
              <li><Link to="/favorites">{t('footer.favorites')}</Link></li>
              <li><Link to="/about">{t('footer.aboutUs')}</Link></li>
              <li><Link to="/contact">{t('footer.contactUs')}</Link></li>
            </ul>
          </div>

          {/* Regions */}
          <div className="footer-col">
            <h4>{t('footer.regions')}</h4>
            <ul className="footer-links">
              <li><Link to="/state-region?region=North">{t('footer.north')}</Link></li>
              <li><Link to="/state-region?region=South">{t('footer.south')}</Link></li>
              <li><Link to="/state-region?region=West">{t('footer.west')}</Link></li>
              <li><Link to="/state-region?region=East">{t('footer.east')}</Link></li>
              <li><Link to="/state-region?region=Northeast">{t('footer.northeast')}</Link></li>
              <li><Link to="/state-region?region=Union Territory">{t('footer.ut')}</Link></li>
            </ul>
          </div>

          {/* Popular states (plain English for now: not yet translated) */}
          <div className="footer-col">
            <h4>Popular states</h4>
            <ul className="footer-links">
              {[['goa', 'Goa'], ['kerala', 'Kerala'], ['rajasthan', 'Rajasthan'], ['himachal-pradesh', 'Himachal Pradesh'], ['ladakh', 'Ladakh'], ['karnataka', 'Karnataka']].map(([slug, name]) => (
                <li key={slug}><Link to={`/places/${slug}`}>{name}</Link></li>
              ))}
            </ul>
          </div>

          {/* Account */}
          <div className="footer-col">
            <h4>{t('footer.account')}</h4>
            <ul className="footer-links">
              <li><Link to="/login">{t('nav.login')}</Link></li>
              <li><Link to="/register">{t('footer.createAccount')}</Link></li>
              <li><Link to="/trips">{t('footer.manage')}</Link></li>
              <li><Link to="/trip-builder">{t('footer.plan')}</Link></li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="footer-bottom">
          <p>
            &copy; {new Date().getFullYear()} {t('footer.rights')}
          </p>
          <p style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span>{t('footer.demo')}</span>
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

