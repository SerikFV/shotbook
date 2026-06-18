import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '../../store/authStore'
import api from '../../services/api'
import { Eye, EyeOff, CheckCircle, XCircle, Loader } from 'lucide-react'
import './Auth.css'

// Debounce hook
function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

export default function RegisterPage() {
  const { t } = useTranslation()
  const { register, isLoading } = useAuthStore()
  const navigate = useNavigate()

  const [form, setForm] = useState({
    username: '', email: '', password: '',
    role: 'client', city: '', phone: ''
  })
  const [showPass, setShowPass] = useState(false)
  const [touched, setTouched] = useState({})
  const [serverErrors, setServerErrors] = useState({})
  const [checking, setChecking] = useState({})

  const debouncedUsername = useDebounce(form.username, 600)
  const debouncedEmail = useDebounce(form.email, 600)

  // Username availability check
  useEffect(() => {
    if (!debouncedUsername || debouncedUsername.length < 3) return
    setChecking(p => ({ ...p, username: true }))
    api.post('/auth/check-field', { field: 'username', value: debouncedUsername })
      .then(({ data }) => {
        setServerErrors(p => ({ ...p, username: data.taken ? 'username_taken' : null }))
      })
      .catch(() => {})
      .finally(() => setChecking(p => ({ ...p, username: false })))
  }, [debouncedUsername])

  // Email availability check
  useEffect(() => {
    if (!debouncedEmail || !debouncedEmail.includes('@')) return
    setChecking(p => ({ ...p, email: true }))
    api.post('/auth/check-field', { field: 'email', value: debouncedEmail })
      .then(({ data }) => {
        setServerErrors(p => ({ ...p, email: data.taken ? 'email_taken' : null }))
      })
      .catch(() => {})
      .finally(() => setChecking(p => ({ ...p, email: false })))
  }, [debouncedEmail])

  const validate = {
    username: (v) => {
      if (!v) return t('field_required')
      if (v.length < 3) return t('username_min')
      if (!/^[a-zA-Z0-9_]+$/.test(v)) return t('username_invalid')
      return null
    },
    email: (v) => {
      if (!v) return t('field_required')
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return t('email_invalid')
      return null
    },
    password: (v) => {
      if (!v) return t('field_required')
      if (v.length < 6) return t('password_min')
      return null
    },
  }

  const getError = (field) => {
    const localErr = validate[field]?.(form[field])
    if (localErr) return localErr
    return serverErrors[field] ? t(serverErrors[field]) : null
  }

  const isValid = (field) => {
    if (!touched[field] || !form[field]) return null
    if (checking[field]) return null
    return getError(field) === null ? 'ok' : 'err'
  }

  const handleChange = (field, value) => {
    setForm(p => ({ ...p, [field]: value }))
    setServerErrors(p => ({ ...p, [field]: null }))
  }

  const handleBlur = (field) => setTouched(p => ({ ...p, [field]: true }))

  const canSubmit = !isLoading &&
    !getError('username') && !getError('email') && !getError('password') &&
    !checking.username && !checking.email &&
    !serverErrors.username && !serverErrors.email

  const handleSubmit = async (e) => {
    e.preventDefault()
    setTouched({ username: true, email: true, password: true })
    if (!canSubmit) return
    const res = await register(form)
    if (res.success) {
      if (res.requires_verification) {
        navigate('/verify-email', { state: { user_id: res.user_id } })
      } else {
        navigate('/')
      }
    } else {
      const msg = res.error || ''
      if (msg.toLowerCase().includes('email')) setServerErrors(p => ({ ...p, email: msg }))
      else if (msg.toLowerCase().includes('username')) setServerErrors(p => ({ ...p, username: msg }))
    }
  }

  const FieldStatus = ({ field }) => {
    const status = isValid(field)
    if (checking[field]) return <Loader size={15} className="spin" style={{ color: 'var(--text-secondary)' }} />
    if (status === 'ok') return <CheckCircle size={15} color="var(--success)" />
    if (status === 'err') return <XCircle size={15} color="var(--danger)" />
    return null
  }

  const inputClass = (field) => {
    const status = isValid(field)
    if (status === 'ok') return 'input input-ok'
    if (status === 'err') return 'input input-err'
    return 'input'
  }

  const passStrength = () => {
    const p = form.password
    if (!p) return null
    if (p.length < 6) return { level: 1, label: t('pass_weak'), color: 'var(--danger)' }
    if (p.length < 10 || !/[0-9]/.test(p)) return { level: 2, label: t('pass_medium'), color: 'var(--warning)' }
    return { level: 3, label: t('pass_strong'), color: 'var(--success)' }
  }
  const strength = passStrength()

  return (
    <div className="auth-page">
      <div className="auth-bg" />
      <div className="auth-card fade-in" style={{ maxWidth: 460 }}>
        <div className="auth-logo">
          <img src="/favicon.svg" alt="ShotBook" style={{ width: 48, height: 48, borderRadius: 12 }} />
          <h1>ShotBook</h1>
        </div>
        <h2 className="auth-title">{t('register')}</h2>

        <form onSubmit={handleSubmit} className="auth-form" noValidate>
          {/* Role selector */}
          <div className="role-tabs">
            {['client', 'mobilographer'].map(r => (
              <button type="button" key={r}
                className={`role-tab ${form.role === r ? 'active' : ''}`}
                onClick={() => setForm(p => ({ ...p, role: r }))}>
                {t(r)}
              </button>
            ))}
          </div>

          {/* Username */}
          <div className="field">
            <label>{t('username')}</label>
            <div className="input-wrap">
              <input
                className={inputClass('username')}
                placeholder={t('username')}
                value={form.username}
                onChange={e => handleChange('username', e.target.value)}
                onBlur={() => handleBlur('username')}
                autoComplete="username"
              />
              <span className="field-icon"><FieldStatus field="username" /></span>
            </div>
            {touched.username && getError('username') && (
              <span className="field-error">{getError('username')}</span>
            )}
          </div>

          {/* Email */}
          <div className="field">
            <label>{t('email')}</label>
            <div className="input-wrap">
              <input
                className={inputClass('email')}
                type="email"
                placeholder="email@example.com"
                value={form.email}
                onChange={e => handleChange('email', e.target.value)}
                onBlur={() => handleBlur('email')}
                autoComplete="email"
              />
              <span className="field-icon"><FieldStatus field="email" /></span>
            </div>
            {touched.email && getError('email') && (
              <span className="field-error">{getError('email')}</span>
            )}
          </div>

          {/* Phone + City */}
          <div className="grid-2">
            <div className="field">
              <label>{t('phone')}</label>
              <input className="input" placeholder="+7 777..." type="tel"
                value={form.phone}
                onChange={e => handleChange('phone', e.target.value)} />
            </div>
            <div className="field">
              <label>{t('city')}</label>
              <input className="input" placeholder={t('city')}
                value={form.city}
                onChange={e => handleChange('city', e.target.value)} />
            </div>
          </div>

          {/* Password */}
          <div className="field">
            <label>{t('password')}</label>
            <div className="input-wrap">
              <input
                className={inputClass('password')}
                type={showPass ? 'text' : 'password'}
                placeholder={t('password')}
                value={form.password}
                onChange={e => handleChange('password', e.target.value)}
                onBlur={() => handleBlur('password')}
                autoComplete="new-password"
                style={{ paddingRight: 80 }}
              />
              <span className="field-icon" style={{ right: 40 }}>
                <FieldStatus field="password" />
              </span>
              <button type="button" className="eye-btn" onClick={() => setShowPass(p => !p)}>
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {/* Password strength bar */}
            {form.password && (
              <div className="pass-strength">
                <div className="pass-bars">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="pass-bar"
                      style={{ background: strength && i <= strength.level ? strength.color : 'var(--border)' }} />
                  ))}
                </div>
                <span style={{ fontSize: 11, color: strength?.color }}>{strength?.label}</span>
              </div>
            )}
            {touched.password && getError('password') && (
              <span className="field-error">{getError('password')}</span>
            )}
          </div>

          <button
            className="btn btn-primary"
            style={{ width: '100%', justifyContent: 'center', padding: '13px', marginTop: 4 }}
            disabled={isLoading}>
            {isLoading ? <span className="spin">◌</span> : t('register')}
          </button>
        </form>

        <p className="auth-link">
          {t('have_account')} <Link to="/login">{t('login')}</Link>
        </p>
      </div>
    </div>
  )
}
