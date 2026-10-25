import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { ThemeProvider } from './context/ThemeContext';
import { LanguageProvider } from './context/LanguageContext';
import './styles.css';
import './premium.css';
import './booking.css';
import './mmt.css';
import './hotels.css';
import './hotels-near.css';
import './addons.css';
import './about-contact.css';
import './admin.css';
import './admin-manage.css';
import './reviews-extra.css';
import './i18n.css';
import './assistant.css';
import './unified.css';
import './responsive.css';
import './animations.css';
import './dark-auto.css';
import './dark.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider>
      <LanguageProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </LanguageProvider>
    </ThemeProvider>
  </React.StrictMode>
);

