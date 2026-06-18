import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '../../store/authStore'
import api from '../../services/api'
import toast from 'react-hot-toast'
import { Mail, KeyRound, Eye, EyeOff, CheckCircle, RefreshCw, ArrowLeft } from 'lucide-react'
import './Auth.css'

export default function ForgotPasswordPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { setVerified } = useAuthStore()

  // 3 қадам: 'email' | 'code' | 'password'
  const [step, setStep] = useState('email')
  const [email, setEmail] = useState('')
  const [userId, setUserId] = useState(null)
  const [code, setCode] = useState(['', '', '', '', '', ''])
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [countdown, setCountdown] = useState(0)
  const inputsRef = useRef([])

  // Countdown таймері
  useEffect(() => {
    if (countdown <= 0) return
    const t = setTimeout(() => setCountdown(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [countdown])

  // ─── 1-қадам: Email жіберу ──────────────────────────────────────

  const handleEmailSubmit = async (e) => {
    e.preventDefault()
    if (!email.includes('@')) { setError('Дұрыс email енгізіңіз'); return }
    setLoading(true)
    setError('')
    try {
      const { data } = await api.post('/auth/forgot-password', { email })
      if (data.user_id) {
        setUserId(data.user_id)
        setCountdown(60)
        setStep('code')
        toast.success('Код жіберілді')
      } else {
        // Пайдаланушы табылмаса да UI-да бірдей хабар
        setError('Бұл email тіркелмеген')
      }
    } catch {
      setError('Қате орын алды')
    } finally { setLoading(false) }
  }

  // ─── 2-қадам: Код тексеру (UI only, бірден reset) ─────────────

  const handleCodeInput = (index, value) => {
    if (!/^\d*$/.test(value)) return
    const newCode = [...code]
    newCode[index] = value.slice(-1)
    setCode(newCode)
    setError('')
    if (value && index < 5) inputsRef.current[index + 1]?.focus()
    if (newCode.every(c => c !== '')) setStep('password')
  }

  const handleCodeKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputsRef.current[index - 1]?.focus()
    }
  }

  const handleCodePaste = (e) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (pasted.length === 6) {
      setCode(pasted.split(''))
      setStep('password')
    }
  }

  const handleResend = async () => {
    if (countdown > 0 || !userId) return
    try {
      await api.post('/auth/resend-code', { user_id: userId, purpose: 'reset_password' })
      setCountdown(60)
      setCode(['', '', '', '', '', ''])
      setError('')
      toast.success('Жаңа код жіберілді')
      setTimeout(() => inputsRef.current[0]?.focus(), 100)
    } catch { toast.error('Қате орын алды') }
  }

  // ─── 3-қадам: Жаңа пароль ──────────────────────────────────────

  const handleResetSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (newPassword.length < 6) { setError('Кемінде 6 таңба болуы керек'); return }
    if (newPassword !== confirmPassword) { setError('Парольдер сәйкес емес'); return }
    setLoading(true)
    try {
      const { data } = await api.post('/auth/reset-password', {
        email,
        code: code.join(''),
        new_password: newPassword,
      })
      setVerified(data.user, data.access_token)
      toast.success('Пароль сәтті өзгертілді!')
      navigate('/')
    } catch (err) {
      const detail = err.response?.data?.detail || 'error'
      if (detail === 'invalid_code') {
        setError('Код қате. Алдыңғы қадамға оралыңыз.')
        setStep('code')
      } else if (detail === 'code_expired') {
        setError('Кодтың мерзімі өтті. Қайта жіберіңіз.')
        setStep('code')
      } else setError('Қате орын алды')
    } finally { setLoading(false) }
  }

  const passStrength = () => {
    const p = newPassword
    if (!p) return null
    if (p.length < 6) return { level: 1, label: t('pass_weak'), color: 'var(--danger)' }
    if (p.length < 10 || !/[0-9]/.test(p)) return { level: 2, label: t('pass_medium'), color: 'var(--warning, #f59e0b)' }
    return { level: 3, label: t('pass_strong'), color: 'var(--success)' }
  }
  const strength = passStrength()

  return (
    <div className="auth-page">
      <div className="auth-bg" />
      <div className="auth-card fade-in" style={{ maxWidth: 400 }}>

        {/* Лого */}
        <div className="auth-logo">
          <img src="/favicon.svg" alt="ShotBook" style={{ width: 48, height: 48, borderRadius: 12 }} />
          <h1>ShotBook</h1>
        </div>

        {/* Прогресс индикатор */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 28 }}>
          {['email', 'code', 'password'].map((s, i) => (
            <div key={s} style={{
              flex: 1, height: 3, borderRadius: 4,
              background: ['email', 'code', 'password'].indexOf(step) >= i
                ? 'var(--accent)' : 'var(--border)',
              transition: 'background 0.3s'
            }} />
          ))}
        </div>

        {/* ─── 1-қадам: Email ─── */}
        {step === 'email' && (
          <>
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <div style={{
                width: 56, height: 56, borderRadius: '50%',
                background: 'var(--accent-light)', display: 'flex',
                alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px'
              }}>
                <Mail size={24} color="var(--accent)" />
              </div>
              <h2 className="auth-title" style={{ marginBottom: 6 }}>Пароль ұмыттым</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
                Тіркелген email-ді енгізіңіз
              </p>
            </div>
            <form onSubmit={handleEmailSubmit} className="auth-form">
              <div className="field">
                <label>{t('email')}</label>
                <input
                  className="input"
                  type="email"
                  placeholder="email@example.com"
                  value={email}
                  onChange={e => { setEmail(e.target.value); setError('') }}
                  required autoFocus
                />
              </div>
              {error && <span className="field-error">{error}</span>}
              <button className="btn btn-primary"
                style={{ width: '100%', justifyContent: 'center', padding: '13px' }}
                disabled={loading}>
                {loading ? <span className="spin">◌</span> : 'Код жіберу'}
              </button>
            </form>
          </>
        )}

        {/* ─── 2-қадам: Код ─── */}
        {step === 'code' && (
          <>
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <div style={{
                width: 56, height: 56, borderRadius: '50%',
                background: 'var(--accent-light)', display: 'flex',
                alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px'
              }}>
                <KeyRound size={24} color="var(--accent)" />
              </div>
              <h2 className="auth-title" style={{ marginBottom: 6 }}>Кодты енгізіңіз</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: 13, lineHeight: 1.6 }}>
                <strong style={{ color: 'var(--text)' }}>{email}</strong> адресіне<br />
                6 таңбалы код жіберілді
              </p>
            </div>

            <div
              style={{ display: 'flex', gap: 10, justifyContent: 'center', marginBottom: 20 }}
              onPaste={handleCodePaste}
            >
              {code.map((digit, i) => (
                <input
                  key={i}
                  ref={el => inputsRef.current[i] = el}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={e => handleCodeInput(i, e.target.value)}
                  onKeyDown={e => handleCodeKeyDown(i, e)}
                  autoFocus={i === 0}
                  style={{
                    width: 48, height: 56,
                    textAlign: 'center', fontSize: 22, fontWeight: 700,
                    fontFamily: 'monospace',
                    background: 'var(--card2)',
                    border: `2px solid ${error ? 'var(--danger)' : digit ? 'var(--accent)' : 'var(--border)'}`,
                    borderRadius: 12, color: 'var(--text)', outline: 'none',
                    transition: 'border-color 0.15s',
                  }}
                />
              ))}
            </div>

            {error && (
              <p style={{
                color: 'var(--danger)', fontSize: 13, textAlign: 'center',
                marginBottom: 16, padding: '8px 12px',
                background: 'rgba(244,63,94,0.08)', borderRadius: 8,
                border: '1px solid rgba(244,63,94,0.2)'
              }}>{error}</p>
            )}

            {/* Қайта жіберу */}
            <button
              className="btn btn-ghost"
              style={{
                width: '100%', justifyContent: 'center', padding: '11px',
                marginBottom: 12, opacity: countdown > 0 ? 0.5 : 1,
                cursor: countdown > 0 ? 'not-allowed' : 'pointer'
              }}
              onClick={handleResend}
              disabled={countdown > 0}
            >
              <RefreshCw size={15} />
              {countdown > 0 ? `Қайта жіберу (${countdown}с)` : 'Кодты қайта жіберу'}
            </button>

            <button className="btn btn-ghost"
              style={{ width: '100%', justifyContent: 'center', padding: '10px', fontSize: 13 }}
              onClick={() => { setStep('email'); setCode(['', '', '', '', '', '']); setError('') }}>
              <ArrowLeft size={14} /> Артқа
            </button>
          </>
        )}

        {/* ─── 3-қадам: Жаңа пароль ─── */}
        {step === 'password' && (
          <>
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <div style={{
                width: 56, height: 56, borderRadius: '50%',
                background: 'var(--accent-light)', display: 'flex',
                alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px'
              }}>
                <CheckCircle size={24} color="var(--accent)" />
              </div>
              <h2 className="auth-title" style={{ marginBottom: 6 }}>Жаңа пароль</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
                Жаңа паролді енгізіңіз
              </p>
            </div>

            <form onSubmit={handleResetSubmit} className="auth-form">
              {/* Жаңа пароль */}
              <div className="field">
                <label>{t('new_password')}</label>
                <div className="input-wrap">
                  <input
                    className={`input ${newPassword.length > 0 ? newPassword.length >= 6 ? 'input-ok' : 'input-err' : ''}`}
                    type={showPass ? 'text' : 'password'}
                    placeholder={t('new_password')}
                    value={newPassword}
                    onChange={e => { setNewPassword(e.target.value); setError('') }}
                    autoComplete="new-password"
                    style={{ paddingRight: 44 }}
                    autoFocus
                  />
                  <button type="button" className="eye-btn" onClick={() => setShowPass(p => !p)}>
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {newPassword && (
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
              </div>

              {/* Растау */}
              <div className="field">
                <label>{t('confirm_password')}</label>
                <div className="input-wrap">
                  <input
                    className={`input ${confirmPassword.length > 0
                      ? confirmPassword === newPassword ? 'input-ok' : 'input-err' : ''}`}
                    type={showConfirm ? 'text' : 'password'}
                    placeholder={t('confirm_password')}
                    value={confirmPassword}
                    onChange={e => { setConfirmPassword(e.target.value); setError('') }}
                    autoComplete="new-password"
                    style={{ paddingRight: 44 }}
                  />
                  <button type="button" className="eye-btn" onClick={() => setShowConfirm(p => !p)}>
                    {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {confirmPassword && confirmPassword !== newPassword && (
                  <span className="field-error">Парольдер сәйкес емес</span>
                )}
              </div>

              {error && <span className="field-error">{error}</span>}

              <button className="btn btn-primary"
                style={{ width: '100%', justifyContent: 'center', padding: '13px' }}
                disabled={loading || newPassword.length < 6 || newPassword !== confirmPassword}>
                {loading ? <span className="spin">◌</span> : 'Паролді өзгерту'}
              </button>
            </form>
          </>
        )}

        <p className="auth-link">
          <Link to="/login">
            <ArrowLeft size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} />
            Кіруге оралу
          </Link>
        </p>
      </div>
    </div>
  )
}
