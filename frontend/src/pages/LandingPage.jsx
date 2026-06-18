import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../services/api'
import './LandingPage.css'

export default function LandingPage() {
  const [mobilographers, setMobilographers] = useState([])
  const [scrolled, setScrolled] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    // Мобилографтарды жүктеу
    api.get('/users/mobilographers?sort_by=rating')
      .then(({ data }) => setMobilographers(data.slice(0, 6)))
      .catch(() => {})
  }, [])

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handler)
    return () => window.removeEventListener('scroll', handler)
  }, [])

  const features = [
    {
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <rect x="3" y="3" width="18" height="18" rx="2"/>
          <circle cx="8.5" cy="8.5" r="1.5"/>
          <path d="m21 15-5-5L5 21"/>
        </svg>
      ),
      colorClass: 'icon-purple',
      title: 'Портфолио галереясы',
      desc: 'Жұмыстарыңды сұлу галерея форматында қос. Фото мен видео жүктеу оңай.',
      highlight: false,
    },
    {
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
          <circle cx="9" cy="7" r="4"/>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
          <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
        </svg>
      ),
      colorClass: 'icon-white',
      title: 'Клиенттер таптыру',
      desc: 'Клиенттер сенің профиліңді тауып, тікелей байланысады.',
      highlight: true,
    },
    {
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <rect x="3" y="4" width="18" height="18" rx="2"/>
          <line x1="16" y1="2" x2="16" y2="6"/>
          <line x1="8" y1="2" x2="8" y2="6"/>
          <line x1="3" y1="10" x2="21" y2="10"/>
        </svg>
      ),
      colorClass: 'icon-blue',
      title: 'Брондау жүйесі',
      desc: 'Бос уақыттарыңды белгіле, клиенттер онлайн бронь жіберсін.',
      highlight: false,
    },
    {
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
      ),
      colorClass: 'icon-green',
      title: 'Жеке чат',
      desc: 'Клиенттермен тікелей байланыс. Заказ шарттарын чатта талқыла.',
      highlight: false,
    },
    {
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <rect x="2" y="2" width="20" height="20" rx="5"/>
          <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
          <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
        </svg>
      ),
      colorClass: 'icon-pink',
      title: 'Instagram & WhatsApp',
      desc: 'Профиліңе Instagram және WhatsApp сілтемелеріңді қос.',
      highlight: false,
    },
    {
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
        </svg>
      ),
      colorClass: 'icon-orange',
      title: 'Рейтинг жүйесі',
      desc: 'Клиенттердің пікірлері мен рейтингі арқылы сенімділігіңді арттыр.',
      highlight: false,
    },
  ]

  const steps = [
    { num: '01', title: 'Тіркеліп, профиль жаса', desc: 'Мобилограф ретінде тіркеліп, портфолиоңды, бағаңды және мамандығыңды толтыр.' },
    { num: '02', title: 'Жұмыстарыңды қос', desc: 'Ең жақсы фото/видео жұмыстарыңды галереяға жүктеп, клиенттерге көрсет.' },
    { num: '03', title: 'Заказтар қабылда', desc: 'Клиенттер брондайды, сен растайсың — жұмыс басталады.' },
  ]

  return (
    <div className="landing">
      {/* ── NAVBAR ── */}
      <nav className={`landing-nav ${scrolled ? 'scrolled' : ''}`}>
        <div className="landing-nav-inner">
          <Link to="/" className="landing-logo">
            <img src="/favicon.svg" alt="ShotBook" style={{ width: 32, height: 32, borderRadius: 8 }} />
            <span>ShotBook</span>
          </Link>
          <div className="landing-nav-actions">
            <Link to="/login" className="landing-btn-ghost">Кіру</Link>
            <Link to="/register" className="landing-btn-primary">Тіркелу</Link>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="landing-hero">
        <div className="hero-bg">
          <div className="hero-grid" />
          <div className="blob blob-1" />
          <div className="blob blob-2" />
          <div className="blob blob-3" />
        </div>
        <div className="hero-content">
          <div className="hero-badge">
            <span className="badge-dot" />
            Қазақстандағы мобилограф платформасы
          </div>
          <h1 className="hero-title">
            Өз өнеріңді<br />
            <span className="hero-gradient">Әлемге көрсет</span>
          </h1>
          <p className="hero-subtitle">
            Портфолио жаса, клиенттер тап, заказтар қабылда.<br />
            Мобилографтар үшін жасалған кәсіби платформа.
          </p>
          <div className="hero-actions">
            <Link to="/register" className="landing-btn-primary landing-btn-lg">
              Портфолио жасау
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </Link>
            <Link to="/mobilographers" className="landing-btn-outline landing-btn-lg">
              Мобилографтарды көру
            </Link>
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section className="landing-section">
        <div className="landing-container">
          <div className="section-header">
            <span className="section-label">Мүмкіндіктер</span>
            <h2>Барлығы бір платформада</h2>
            <p>Мобилографтың кәсіби өмірін жеңілдететін барлық құрал</p>
          </div>
          <div className="features-grid">
            {features.map((f, i) => (
              <div key={i} className={`feature-card ${f.highlight ? 'feature-card--highlight' : ''}`}>
                <div className={`feature-icon ${f.colorClass}`}>{f.icon}</div>
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
                {f.highlight && <div className="card-glow" />}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TOP MOBILOGRAPHERS ── */}
      <section className="landing-section landing-section--dark">
        <div className="landing-container">
          <div className="section-header">
            <span className="section-label">Мобилографтар</span>
            <h2>Платформа мүшелері</h2>
            <p>Тіркелген мобилографтар</p>
          </div>
          {mobilographers.length === 0 ? (
            <div className="landing-empty">
              <p>Платформада әлі мобилографтар жоқ. Бірінші болыңыз!</p>
              <Link to="/register" className="landing-btn-primary" style={{ marginTop: 16, display: 'inline-flex' }}>
                Тіркелу
              </Link>
            </div>
          ) : (
            <>
              <div className="mob-landing-grid">
                {mobilographers.map(m => (
                  <Link key={m.id} to="/login" className="mob-landing-card">
                    <div className="mob-landing-cover gradient-purple" />
                    <div className="mob-landing-avatar">
                      {m.avatar
                        ? <img src={m.avatar} alt={m.username} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : <span>{m.username[0].toUpperCase()}</span>}
                    </div>
                    <div className="mob-landing-body">
                      <h3>{m.username}</h3>
                      <p className="mob-landing-spec">
                        {m.profile?.specializations?.split(',')[0] || ''}
                        {m.city ? ` · ${m.city}` : ''}
                      </p>
                      <div className="mob-landing-footer">
                        <span className="mob-landing-price">
                          {m.profile?.hourly_price
                            ? `${m.profile.hourly_price.toLocaleString()} ₸/сағ`
                            : 'Баға белгіленбеген'}
                        </span>
                        <span className="landing-btn-sm">Профиль</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
              <div style={{ textAlign: 'center', marginTop: 32 }}>
                <Link to="/login" className="landing-btn-outline landing-btn-lg">
                  Барлық мобилографтар →
                </Link>
              </div>
            </>
          )}
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="landing-section">
        <div className="landing-container">
          <div className="section-header">
            <span className="section-label">Қалай жұмыс істейді</span>
            <h2>3 қадамда бастаңыз</h2>
          </div>
          <div className="steps-grid">
            {steps.map((s, i) => (
              <>
                <div key={s.num} className="step">
                  <div className="step-number">{s.num}</div>
                  <div className="step-content">
                    <h3>{s.title}</h3>
                    <p>{s.desc}</p>
                  </div>
                </div>
                {i < steps.length - 1 && <div className="step-arrow" key={`arrow-${i}`}>→</div>}
              </>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="landing-section">
        <div className="landing-container">
          <div className="cta-card">
            <div className="cta-blob" />
            <div className="cta-content">
              <h2>Бүгін бастаңыз</h2>
              <p>Клиенттер сенің сияқты мобилографтарды іздеп жатыр</p>
              <div className="cta-actions">
                <Link to="/register" className="landing-btn-primary landing-btn-lg">Тегін тіркелу</Link>
                <Link to="/login" className="landing-btn-ghost landing-btn-lg">Платформаны зерттеу</Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="landing-footer">
        <div className="landing-container">
          <div className="footer-grid">
            <div className="footer-brand">
              <Link to="/" className="landing-logo">
                <img src="/favicon.svg" alt="ShotBook" style={{ width: 28, height: 28, borderRadius: 7 }} />
                <span>ShotBook</span>
              </Link>
              <p>Мобилографтар үшін жасалған кәсіби платформа.</p>
            </div>
            <div className="footer-links">
              <h4>Платформа</h4>
              <ul>
                <li><Link to="/login">Мобилографтар</Link></li>
              </ul>
            </div>
            <div className="footer-links">
              <h4>Аккаунт</h4>
              <ul>
                <li><Link to="/register">Тіркелу</Link></li>
                <li><Link to="/login">Кіру</Link></li>
              </ul>
            </div>
          </div>
          <div className="footer-bottom">
            <p>2025 ShotBook.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
