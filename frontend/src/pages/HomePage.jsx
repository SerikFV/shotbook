import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import api from '../services/api'
import { Play, Star, ChevronRight, ChevronDown, Zap, Target, Layout, MessageSquare, Video } from 'lucide-react'
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
            <div className="logo-icon">◈</div>
            ShotBook
          </Link>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
            <ul className="nav-links">
              <li><Link to="/explore">Лента (Explore)</Link></li>
              <li><Link to="/mobilographers">Мобилографтар</Link></li>
              <li><a href="#features">Мүмкіндіктер</a></li>
            </ul>
            <div className="nav-actions">
              {user ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <Link to={user.role === 'client' ? '/mobilographers' : '/bookings'} className="btn-outline" style={{ padding: '8px 16px' }}>Дашборд</Link>
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
                  <Link to="/login" className="btn-ghost">Кіру</Link>
                  <Link to="/register" className="btn-primary" style={{ padding: '10px 20px', fontSize: 14 }}>Тіркелу</Link>
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
            Жаңа буын мобилографтар платформасы
          </div>
          <h1 className="hero-title">
            Өз өнеріңді <br />
            <span className="gradient-text">әлемге паш ет</span>
          </h1>
          <p className="hero-subtitle">
            ShotBook — мобилографтар мен клиенттерді байланыстыратын премиум экожүйе. Портфолио жинап, тапсырыстарды автоматтандырыңыз.
          </p>
          <div className="hero-actions">
            {!user && (
              <Link to="/register" className="btn-primary">
                Тегін бастау <ChevronRight size={18} />
              </Link>
            )}
            <Link to="/mobilographers" className="btn-outline">
              <Play size={18} /> Платформаны көру
            </Link>
          </div>
        </div>
      </section>

      <div className="marquee-section">
        <div className="marquee-content">
          {[...Array(10)].map((_, i) => (
            <div className="marquee-item" key={i}>
              <Star size={16} className="marquee-star" fill="currentColor" />
              1000+ Табысты заказ
              <Star size={16} className="marquee-star" fill="currentColor" />
              Үздік портфолио
              <Star size={16} className="marquee-star" fill="currentColor" />
              Қазақстандағы #1 Платформа
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
              <p>Тапсырыс</p>
            </div>
            <div className="stat-item">
              <h3><CountUp end={98} suffix="%" /></h3>
              <p>Клиент ризашылығы</p>
            </div>
          </div>
        </div>
      </section>

      <section className="features-section" id="features">
        <div className="container">
          <div className="section-header reveal">
            <span className="section-label">Жүйе Мүмкіндіктері</span>
            <h2 className="section-title">Барлық құрал бір жерде</h2>
            <p className="section-desc">Жұмысыңызды жеңілдету үшін керектінің бәрін біріктірдік. Заманауи интерфейс және жылдам жүйе.</p>
          </div>

          <div className="bento-grid">
            <div className="bento-card bento-large reveal">
              <div className="bento-icon"><Layout size={24} /></div>
              <h3>Премиум Портфолио</h3>
              <p>Видеоларыңыз бен суреттеріңізді TikTok/Reels форматындағы динамикалық лентада көрсетіңіз. Нақты лайк, пікір және сақтау статистикасы.</p>
            </div>
            <div className="bento-card reveal delay-1">
              <div className="bento-icon"><Zap size={24} color="#f59e0b" /></div>
              <h3>Жылдам Брондау</h3>
              <p>Бос күндеріңізді күнтізбе арқылы басқарыңыз. Клиенттер онлайн тапсырыс береді.</p>
            </div>
            <div className="bento-card reveal">
              <div className="bento-icon"><MessageSquare size={24} color="#3b82f6" /></div>
              <h3>Тікелей Чат</h3>
              <p>Тапсырыс детальдарын клиентпен тікелей платформа ішінде талқылаңыз.</p>
            </div>
            <div className="bento-card bento-large reveal delay-1">
              <div className="bento-icon"><Target size={24} color="#10b981" /></div>
              <h3>Рейтинг & Сенім</h3>
              <p>Жасалған жұмыстардан кейін клиенттерден пікір жинап, платформа ішіндегі өз рейтингіңізді (Топ мобилограф) өсіріңіз.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="reels-section">
        <div className="container">
          <div className="section-header reveal">
            <h2 className="section-title">Жаңа жұмыстар</h2>
            <p className="section-desc">Платформадағы ең соңғы және үздік видеолар топтамасы.</p>
          </div>
        </div>
        <div className="reels-track reveal delay-1">
          {[1,2,3,4,5,6].map(i => (
            <div className="reel-card" key={i}>
              <video className="reel-video" src={`https://res.cloudinary.com/demo/video/upload/v1689243750/samples/elephants.mp4`} muted loop playsInline onMouseEnter={e => e.target.play()} onMouseLeave={e => {e.target.pause(); e.target.currentTime=0}} />
              <div className="reel-overlay"></div>
              <div className="reel-author">
                <div className="reel-avatar">M</div>
                <span className="reel-name">Mobilograph {i}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mob-showcase">
        <div className="container">
          <div className="section-header reveal">
            <h2 className="section-title">Үздік Мобилографтар</h2>
            <p className="section-desc">Платформамыздың ең талантты резиденттерімен танысыңыз.</p>
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
                    <p className="mob-spec">{p.specializations || 'Жалпы бағыт'}</p>
                    <div className="mob-footer">
                      <span className="mob-price">{p.hourly_price ? `${p.hourly_price.toLocaleString()} ₸/сағ` : 'Бағасыз'}</span>
                      <ChevronRight size={20} color="var(--text-secondary)" />
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>

          <div style={{ textAlign: 'center' }} className="reveal">
            <Link to="/mobilographers" className="btn-outline">Барлығын көру</Link>
          </div>
        </div>
      </section>

      <section className="testimonials-section">
        <div className="container">
          <div className="section-header reveal">
            <h2 className="section-title">Клиенттер пікірі</h2>
            <p className="section-desc">Біздің платформамыз арқылы мобилограф тапқан клиенттердің лебіздері.</p>
          </div>
        </div>
        <div className="testimonials-grid reveal delay-1">
          {[1, 2, 3, 4, 5].map((item) => (
            <div className="testimonial-card" key={item}>
              <div className="stars">{[...Array(5)].map((_, i) => <Star key={i} size={16} fill="currentColor" />)}</div>
              <p className="testimonial-text">"Шотбук арқылы мобилографты өте тез таптым! Портфолиолары да бірден көрініп тұрады, өте ыңғайлы платформа."</p>
              <div className="testimonial-author">
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#3b82f6' }}></div>
                <div className="testimonial-author-info">
                  <h4>Айгерім {item}</h4>
                  <p>Клиент</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="faq-section">
        <div className="container">
          <div className="section-header reveal">
            <h2 className="section-title">Жиі қойылатын сұрақтар</h2>
            <p className="section-desc">Платформаны қолдану бойынша сұрақтарыңыз болса, осы жерден жауап таба аласыз.</p>
          </div>
          <div className="faq-container">
            {[
              { q: 'Мобилографты қалай брондаймын?', a: 'Мобилографтың профиліне кіріп, күнтізбесінен бос уақытты таңдап, бронь жібересіз.' },
              { q: 'Платформаға тіркелу ақылы ма?', a: 'Жоқ, клиенттер үшін де, мобилографтар үшін де тіркелу тегін.' },
              { q: 'Жұмыс сапасына кепілдік бар ма?', a: 'Біздегі әр мобилографтың нақты пікірлері мен рейтингі бар. Соларға қарап таңдай аласыз.' },
            ].map((faq, idx) => (
              <div key={idx} className={`faq-item reveal delay-${idx % 2} ${activeFaq === idx ? 'active' : ''}`}>
                <div className="faq-header" onClick={() => setActiveFaq(activeFaq === idx ? null : idx)}>
                  {faq.q} <ChevronDown size={20} className="faq-icon" />
                </div>
                <div className="faq-body">{faq.a}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="cta">
        <div className="container">
          <div className="cta-box reveal">
            <h2>Өз жолыңды бүгіннен баста</h2>
            <p>Мыңдаған клиенттер сенің стиліңді іздеп жүр. Тіркел, портфолиоңды толтыр және табыс тап.</p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 16 }}>
              <Link to="/register" className="btn-primary">Шотбукқа қосылу</Link>
            </div>
          </div>
        </div>
      </section>

      <footer className="footer">
        <div className="container">
          <div className="footer-grid">
            <div className="footer-col">
              <Link to="/" className="nav-logo" style={{ marginBottom: 16 }}>
                <div className="logo-icon">◈</div> ShotBook
              </Link>
              <p className="footer-desc">Қазақстандағы ең креативті мобилографтар мен клиенттер экожүйесі. Өз өнеріңді әлемге паш ет.</p>
            </div>
            <div className="footer-col">
              <h4>Платформа</h4>
              <ul>
                <li><Link to="/mobilographers">Мобилографтарды іздеу</Link></li>
                <li><Link to="/register">Мобилограф болып тіркелу</Link></li>
              </ul>
            </div>
            <div className="footer-col">
              <h4>Компания</h4>
              <ul>
                <li><a href="#">Біз туралы</a></li>
                <li><a href="#">Құпиялылық саясаты</a></li>
                <li><a href="#">Келісім шарттар</a></li>
              </ul>
            </div>
          </div>
          <div className="footer-bottom">
            <span>© 2026 ShotBook Technologies. Барлық құқықтар қорғалған.</span>
            <div style={{ display: 'flex', gap: 16 }}>
              <span>🇰🇿 Қазақстан</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
