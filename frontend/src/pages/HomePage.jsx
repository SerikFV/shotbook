import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { useTranslation } from 'react-i18next'
import api from '../services/api'
import { Play, Star, ChevronRight, ChevronDown, Zap, Target, Layout, MessageSquare, Video, Globe } from 'lucide-react'
import { homeTranslations, faqData } from '../locales/homeTranslations'
import './HomePage.css'

function CountUp({ end, suffix = '', duration = 2000 }) {
  const [count, setCount] = useState(0)
  const ref = useRef(null)

  useEffect(() => {
    let startTime = null
    let observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        window.requestAnimationFrame(step)
        observer.disconnect()
      }
    })
    if (ref.current) observer.observe(ref.current)

    const step = (timestamp) => {
      if (!startTime) startTime = timestamp
      const progress = Math.min((timestamp - startTime) / duration, 1)
      setCount(Math.floor(progress * end))
      if (progress < 1) {
        window.requestAnimationFrame(step)
      } else {
        setCount(end)
      }
    }
    return () => observer.disconnect()
  }, [end, duration])

  return <span ref={ref}>{count}{suffix}</span>
}

export default function HomePage() {
  const { i18n } = useTranslation()
  const lang = i18n.language || 'kk'
  const t = (key) => homeTranslations[lang][key] || key
  const faqs = faqData[lang] || faqData.kk
  const { user, logout } = useAuthStore()
  const [mobilographs, setMobilographs] = useState([])
  const [showMenu, setShowMenu] = useState(false)
  const [activeFaq, setActiveFaq] = useState(null)
  const menuRef = useRef(null)

  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setShowMenu(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => {
    const navbar = document.getElementById('navbar')
    const handleScroll = () => {
      if (navbar) navbar.classList.toggle('scrolled', window.scrollY > 20)
    }
    window.addEventListener('scroll', handleScroll)

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible')
          observer.unobserve(entry.target)
        }
      })
    }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' })

    const els = document.querySelectorAll('.reveal')
    els.forEach(el => observer.observe(el))

    api.get('/users/mobilographers').then(({ data }) => setMobilographs(data || [])).catch(() => {})

    return () => {
      window.removeEventListener('scroll', handleScroll)
      observer.disconnect()
    }
  }, [mobilographs.length])

  // Mouse move effect for Bento boxes
  const handleMouseMove = (e) => {
    const cards = document.querySelectorAll('.bento-card')
    cards.forEach(card => {
      const rect = card.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      card.style.setProperty('--mouse-x', `${x}px`)
      card.style.setProperty('--mouse-y', `${y}px`)
    })
  }

  return (
    <div className="landing-page" onMouseMove={handleMouseMove}>
      <nav className="navbar" id="navbar">
        <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Link to="/" className="nav-logo">
            <img src="/favicon.svg" alt="ShotBook" style={{ width: 32, height: 32, borderRadius: 8 }} /> ShotBook
          </Link>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
            <ul className="nav-links">
              <li><Link to="/explore">Лента (Explore)</Link></li>
              <li><Link to="/mobilographers">Мобилографтар</Link></li>
              <li><a href="#features">Мүмкіндіктер</a></li>
            </ul>
            <div className="nav-actions" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <button 
                className="btn-ghost" 
                onClick={() => i18n.changeLanguage(lang === 'kk' ? 'ru' : 'kk')}
                style={{ padding: '8px 12px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <Globe size={16} /> {lang === 'kk' ? 'RU' : 'KZ'}
              </button>

              {user ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ position: 'relative' }} ref={menuRef}>
                    <button onClick={() => setShowMenu(!showMenu)} style={{
                      display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.05)',
                      border: '1px solid var(--border-light)', padding: '6px 16px', borderRadius: 100,
                      cursor: 'pointer', color: 'white', transition: 'var(--transition-smooth)'
                    }} onMouseEnter={e => e.currentTarget.style.background='rgba(255,255,255,0.1)'} onMouseLeave={e => e.currentTarget.style.background='rgba(255,255,255,0.05)'}>
                      <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700 }}>
                        {user.avatar ? <img src={user.avatar} style={{width:'100%',height:'100%',borderRadius:'50%',objectFit:'cover'}} alt=""/> : (user.username||'?')[0].toUpperCase()}
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 500 }}>{user.username}</span>
                    </button>
                    {showMenu && (
                      <div className="reveal visible" style={{
                        position: 'absolute', top: '100%', right: 0, marginTop: 8,
                        background: '#111', border: '1px solid var(--border-light)',
                        borderRadius: 16, padding: 8, minWidth: 160, zIndex: 100,
                        boxShadow: '0 8px 32px rgba(0,0,0,0.8)'
                      }}>
                        <Link to="/profile" style={{
                          display: 'block', textDecoration: 'none', padding: '10px 16px',
                          color: 'white', fontSize: 14, borderRadius: 8, fontWeight: 500,
                          cursor: 'pointer', marginBottom: 4
                        }} onMouseEnter={e => e.currentTarget.style.background='rgba(255,255,255,0.08)'} onMouseLeave={e => e.currentTarget.style.background='none'} onClick={() => setShowMenu(false)}>
                          Профиль
                        </Link>
                        <button onClick={() => { logout(); setShowMenu(false) }} style={{
                          width: '100%', textAlign: 'left', padding: '10px 16px',
                          background: 'none', border: 'none', color: '#ef4444',
                          cursor: 'pointer', fontSize: 14, borderRadius: 8, fontWeight: 500
                        }} onMouseEnter={e => e.currentTarget.style.background='rgba(239,68,68,0.1)'} onMouseLeave={e => e.currentTarget.style.background='none'}>
                          Шығу
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <>
                  <Link to="/login" className="btn-ghost">{t('nav_login')}</Link>
                  <Link to="/register" className="btn-primary" style={{ padding: '10px 20px', fontSize: 14 }}>{t('nav_register')}</Link>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      <section className="hero">
        <div className="hero-bg"></div>
        <div className="hero-glow"></div>
        <div className="hero-content reveal">
          <div className="hero-badge">
            <span className="badge-indicator"></span>
            {t('hero_badge')}
          </div>
          <h1 className="hero-title" style={{ fontFamily: 'Inter, sans-serif' }}>
            {t('hero_title_1')} <br />
            <span className="gradient-text">{t('hero_title_2')}</span>
          </h1>
          <p className="hero-subtitle">
            {t('hero_desc')}
          </p>
          <div className="hero-actions">
            {!user && (
              <Link to="/register" className="btn-primary">
                {t('nav_register')} <ChevronRight size={18} />
              </Link>
            )}
            <Link to="/mobilographers" className="btn-outline">
              <Play size={18} /> {t('hero_btn')}
            </Link>
          </div>
        </div>
      </section>

      <div className="marquee-section">
        <div className="marquee-content">
          {[...Array(10)].map((_, i) => (
            <div className="marquee-item" key={i}>
              <Star size={16} className="marquee-star" fill="currentColor" />
              {t('marquee_1')}
              <Star size={16} className="marquee-star" fill="currentColor" />
              {t('marquee_2')}
              <Star size={16} className="marquee-star" fill="currentColor" />
              {t('marquee_3')}
            </div>
          ))}
        </div>
      </div>

      <section className="stats-section reveal">
        <div className="container">
          <div className="stats-grid">
            <div className="stat-item">
              <h3><CountUp end={500} suffix="+" /></h3>
              <p>Мобилограф</p>
            </div>
            <div className="stat-item">
              <h3><CountUp end={12000} suffix="+" /></h3>
              <p>{t('stat_orders')}</p>
            </div>
            <div className="stat-item">
              <h3><CountUp end={98} suffix="%" /></h3>
              <p>{t('stat_satisfaction')}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="features-section" id="features">
        <div className="container">
          <div className="section-header reveal">
            <span className="section-label">{t('feat_label')}</span>
            <h2 className="section-title">{t('feat_title')}</h2>
            <p className="section-desc">{t('feat_desc')}</p>
          </div>

          <div className="bento-grid">
            <div className="bento-card bento-large reveal">
              <div className="bento-icon"><Layout size={24} /></div>
              <h3>{t('feat_1_title')}</h3>
              <p>{t('feat_1_desc')}</p>
            </div>
            <div className="bento-card reveal delay-1">
              <div className="bento-icon"><Zap size={24} color="#f59e0b" /></div>
              <h3>{t('feat_2_title')}</h3>
              <p>{t('feat_2_desc')}</p>
            </div>
            <div className="bento-card reveal">
              <div className="bento-icon"><MessageSquare size={24} color="#3b82f6" /></div>
              <h3>{t('feat_3_title')}</h3>
              <p>{t('feat_3_desc')}</p>
            </div>
            <div className="bento-card bento-large reveal delay-1">
              <div className="bento-icon"><Target size={24} color="#10b981" /></div>
              <h3>{t('feat_4_title')}</h3>
              <p>{t('feat_4_desc')}</p>
            </div>
          </div>
        </div>
      </section>


      <section className="mob-showcase">
        <div className="container">
          <div className="section-header reveal">
            <h2 className="section-title">{t('mob_title')}</h2>
            <p className="section-desc">{t('mob_desc')}</p>
          </div>

          <div className="mob-grid">
            {mobilographs.slice(0, 3).map((mob, idx) => {
              const p = mob.profile || {}
              return (
                <Link to={`/mobilographers/${mob.id}`} key={mob.id} className={`mob-card reveal delay-${idx}`}>
                  <div className="mob-cover">
                    <div className="mob-avatar">
                      {mob.avatar ? <img src={mob.avatar} style={{width:'100%',height:'100%',objectFit:'cover'}} alt="" /> : mob.username[0].toUpperCase()}
                    </div>
                  </div>
                  <div className="mob-body">
                    <h3 className="mob-name">{mob.username}</h3>
                    <p className="mob-spec">{p.specializations || t('mob_spec_default')}</p>
                    <div className="mob-footer">
                      <span className="mob-price">{p.hourly_price ? `${p.hourly_price.toLocaleString()} ${t('mob_price_hour')}` : t('mob_price_none')}</span>
                      <ChevronRight size={20} color="var(--text-secondary)" />
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>

          <div style={{ textAlign: 'center' }} className="reveal">
            <Link to="/mobilographers" className="btn-outline">{t('mob_btn')}</Link>
          </div>
        </div>
      </section>



      <section className="faq-section">
        <div className="container">
          <div className="section-header reveal">
            <h2 className="section-title">{t('faq_title')}</h2>
            <p className="section-desc">{t('faq_desc')}</p>
          </div>
          <div className="faq-container">
            {faqs.map((faq, idx) => (
              <div key={idx} className={`faq-item ${activeFaq === idx ? 'active' : ''}`}>
                <div className="faq-header" onClick={() => setActiveFaq(activeFaq === idx ? null : idx)}>
                  {faq.q} <ChevronDown size={20} className="faq-icon" />
                </div>
                <div className="faq-body">{faq.a}</div>
              </div>
            ))}
          </div>
        </div>
      </section>


      <footer className="footer">
        <div className="container">
          <div className="footer-grid">
            <div className="footer-col">
              <Link to="/" className="nav-logo" style={{ marginBottom: 16 }}>
                <img src="/favicon.svg" alt="ShotBook" style={{ width: 32, height: 32, borderRadius: 8 }} /> ShotBook
              </Link>
              <p className="footer-desc">{t('footer_desc')}</p>
            </div>
            <div className="footer-col">
              <h4>{t('footer_platform')}</h4>
              <ul>
                <li><Link to="/mobilographers">{t('footer_search')}</Link></li>
                <li><Link to="/register">{t('footer_reg')}</Link></li>
              </ul>
            </div>
            <div className="footer-col">
              <h4>{t('footer_company')}</h4>
              <ul>
                <li><a href="#">{t('footer_about')}</a></li>
                <li><a href="#">{t('footer_privacy')}</a></li>
                <li><a href="#">{t('footer_terms')}</a></li>
              </ul>
            </div>
          </div>
          <div className="footer-bottom">
            <span>© 2026 {t('footer_rights')}</span>
            <div style={{ display: 'flex', gap: 16 }}>
              <span>🇰🇿 {t('footer_country')}</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
