import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '../store/authStore'
import api from '../services/api'
import toast from 'react-hot-toast'
import { Save, Eye, EyeOff, CheckCircle, XCircle, Loader, Settings, Mail, X, RefreshCw } from 'lucide-react'

function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

// ─── Email верификация модалы ─────────────────────────────────────────
function EmailVerifyModal({ newEmail, onSuccess, onClose }) {
  const { t } = useTranslation()
  const [code, setCode] = useState(['', '', '', '', '', ''])
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)
  const [countdown, setCountdown] = useState(60)
  const [error, setError] = useState('')
  const inputsRef = useRef([])

  useEffect(() => {
    if (countdown <= 0) return
    const timer = setTimeout(() => setCountdown(c => c - 1), 1000)
    return () => clearTimeout(timer)
  }, [countdown])

  useEffect(() => {
    setTimeout(() => inputsRef.current[0]?.focus(), 100)
  }, [])

  const handleInput = (index, value) => {
    if (!/^\d*$/.test(value)) return
    const newCode = [...code]
    newCode[index] = value.slice(-1)
    setCode(newCode)
    setError('')
    if (value && index < 5) inputsRef.current[index + 1]?.focus()
    if (newCode.every(c => c !== '') && newCode.join('').length === 6) {
      handleVerify(newCode.join(''))
    }
  }

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputsRef.current[index - 1]?.focus()
    }
  }

  const handlePaste = (e) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (pasted.length === 6) {
      const arr = pasted.split('')
      setCode(arr)
      inputsRef.current[5]?.focus()
      handleVerify(pasted)
    }
  }

  const handleVerify = async (codeStr) => {
    const finalCode = codeStr || code.join('')
    if (finalCode.length !== 6) return
    setLoading(true)
    setError('')
    try {
      const { data } = await api.post('/auth/confirm-email-change', {
        new_email: newEmail,
        code: finalCode,
      })
      onSuccess(data)
    } catch (err) {
      const detail = err.response?.data?.detail || 'error'
      if (detail === 'invalid_code') setError('Код қате. Қайта тексеріңіз.')
      else if (detail === 'code_expired') setError('Кодтың мерзімі өтті. Жаңа код сұраңыз.')
      else if (detail === 'email_taken') setError('Бұл email басқа пайдаланушыға тіркелген.')
      else setError(t('error'))
      setCode(['', '', '', '', '', ''])
      inputsRef.current[0]?.focus()
    } finally { setLoading(false) }
  }

  const handleResend = async () => {
    if (countdown > 0 || resending) return
    setResending(true)
    try {
      await api.post('/auth/request-email-change', { new_email: newEmail })
      setCountdown(60)
      setCode(['', '', '', '', '', ''])
      setError('')
      toast.success(t('email_change_sent'))
      setTimeout(() => inputsRef.current[0]?.focus(), 100)
    } catch { toast.error(t('error')) }
    finally { setResending(false) }
  }

  return createPortal(
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
      zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16
    }}>
      <div className="card fade-in" style={{ width: '100%', maxWidth: 400, boxShadow: '0 8px 48px rgba(0,0,0,0.6)' }}>
        {/* Тақырып */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 40, height: 40, borderRadius: '50%',
              background: 'var(--accent-light)', display: 'flex',
              alignItems: 'center', justifyContent: 'center', flexShrink: 0
            }}>
              <Mail size={18} color="var(--accent)" />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15 }}>{t('verify_new_email')}</div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                <strong style={{ color: 'var(--accent)' }}>{newEmail}</strong> {t('verify_new_email_hint')}
              </div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', color: 'var(--text-secondary)', padding: 4 }}>
            <X size={18} />
          </button>
        </div>

        {/* Код енгізу */}
        <div
          style={{ display: 'flex', gap: 10, justifyContent: 'center', marginBottom: 16 }}
          onPaste={handlePaste}
        >
          {code.map((digit, i) => (
            <input
              key={i}
              ref={el => inputsRef.current[i] = el}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={e => handleInput(i, e.target.value)}
              onKeyDown={e => handleKeyDown(i, e)}
              style={{
                width: 46, height: 54,
                textAlign: 'center', fontSize: 22, fontWeight: 700,
                fontFamily: 'monospace',
                background: 'var(--card2)',
                border: `2px solid ${error ? 'var(--danger)' : digit ? 'var(--accent)' : 'var(--border)'}`,
                borderRadius: 10, color: 'var(--text)', outline: 'none',
                transition: 'border-color 0.15s',
              }}
              onFocus={e => e.target.style.borderColor = error ? 'var(--danger)' : 'var(--accent)'}
            />
          ))}
        </div>

        {/* Қате */}
        {error && (
          <div style={{
            color: 'var(--danger)', fontSize: 13, textAlign: 'center',
            marginBottom: 14, padding: '8px 12px',
            background: 'rgba(244,63,94,0.08)', borderRadius: 8,
            border: '1px solid rgba(244,63,94,0.2)'
          }}>{error}</div>
        )}

        {/* Растау батырмасы */}
        <button
          className="btn btn-primary"
          style={{ width: '100%', justifyContent: 'center', padding: '12px', marginBottom: 10 }}
          onClick={() => handleVerify()}
          disabled={loading || code.join('').length !== 6}
        >
          {loading ? <span className="spin">◌</span> : <><CheckCircle size={15} /> Растау</>}
        </button>

        {/* Қайта жіберу */}
        <button
          className="btn btn-ghost"
          style={{
            width: '100%', justifyContent: 'center', padding: '10px', fontSize: 13,
            opacity: countdown > 0 ? 0.5 : 1, cursor: countdown > 0 ? 'not-allowed' : 'pointer'
          }}
          onClick={handleResend}
          disabled={countdown > 0 || resending}
        >
          <RefreshCw size={14} className={resending ? 'spin' : ''} />
          {countdown > 0 ? `Қайта жіберу (${countdown}с)` : 'Кодты қайта жіберу'}
        </button>
      </div>
    </div>,
    document.body
  )
}

// ─── SettingsPage ─────────────────────────────────────────────────────
export default function SettingsPage() {
  const { t } = useTranslation()
  const { user, refreshUser } = useAuthStore()

  // Аккаунт деректері
  const [account, setAccount] = useState({ username: '', email: '' })
  const [accountSaving, setAccountSaving] = useState(false)
  const [usernameCheck, setUsernameCheck] = useState({ checking: false, taken: false, touched: false })
  const [emailCheck, setEmailCheck] = useState({ checking: false, taken: false, touched: false })

  // Email верификация модалы
  const [showEmailModal, setShowEmailModal] = useState(false)
  const [emailSending, setEmailSending] = useState(false)

  // Құпиясөз
  const [pwForm, setPwForm] = useState({ current: '', newPw: '', confirm: '' })
  const [showPw, setShowPw] = useState({ current: false, newPw: false, confirm: false })
  const [pwSaving, setPwSaving] = useState(false)
  const [pwError, setPwError] = useState('')

  const debouncedUsername = useDebounce(account.username, 600)
  const debouncedEmail = useDebounce(account.email, 600)

  useEffect(() => {
    if (user) {
      setAccount({ username: user.username || '', email: user.email || '' })
    }
  }, [user?.username, user?.email])

  // Username тексеру
  useEffect(() => {
    if (!debouncedUsername || debouncedUsername === user?.username) return
    setUsernameCheck(p => ({ ...p, checking: true }))
    api.post('/auth/check-field', { field: 'username', value: debouncedUsername })
      .then(({ data }) => setUsernameCheck(p => ({ ...p, checking: false, taken: data.taken })))
      .catch(() => setUsernameCheck(p => ({ ...p, checking: false })))
  }, [debouncedUsername])

  // Email тексеру
  useEffect(() => {
    if (!debouncedEmail || debouncedEmail === user?.email || !debouncedEmail.includes('@')) return
    setEmailCheck(p => ({ ...p, checking: true }))
    api.post('/auth/check-field', { field: 'email', value: debouncedEmail })
      .then(({ data }) => setEmailCheck(p => ({ ...p, checking: false, taken: data.taken })))
      .catch(() => setEmailCheck(p => ({ ...p, checking: false })))
  }, [debouncedEmail])

  // Username ғана сақтау (email бөлек)
  const handleUsernameSave = async (e) => {
    e.preventDefault()
    if (usernameCheck.taken) return
    // Тек username өзгерген болса ғана
    if (account.username === user?.username && account.email === user?.email) {
      toast('Ешнәрсе өзгерген жоқ')
      return
    }

    // Email өзгерген болса — верификация керек
    if (account.email !== user?.email) {
      if (emailCheck.taken || !account.email.includes('@')) return
      setEmailSending(true)
      try {
        await api.post('/auth/request-email-change', { new_email: account.email })
        toast.success(t('email_change_sent'))
        setShowEmailModal(true)
      } catch (err) {
        const detail = err.response?.data?.detail || 'error'
        if (detail === 'email_taken') toast.error(t('email_taken'))
        else if (detail === 'same_email') toast.error(t('same_email'))
        else toast.error(t('error'))
      } finally { setEmailSending(false) }
      return
    }

    // Тек username өзгерген
    setAccountSaving(true)
    try {
      const { data } = await api.put('/auth/account', { username: account.username, email: user?.email })
      const stored = JSON.parse(localStorage.getItem('user') || '{}')
      localStorage.setItem('user', JSON.stringify({ ...stored, username: data.username }))
      await refreshUser()
      toast.success(t('success'))
    } catch (err) {
      toast.error(err.response?.data?.detail || t('error'))
    } finally { setAccountSaving(false) }
  }

  // Email верификациядан өткен соң
  const handleEmailVerified = async (userData) => {
    setShowEmailModal(false)
    // Username да өзгерген болса — оны да сақтаймыз
    if (account.username !== user?.username) {
      try {
        await api.put('/auth/account', { username: account.username, email: userData.email })
      } catch {}
    }
    const stored = JSON.parse(localStorage.getItem('user') || '{}')
    localStorage.setItem('user', JSON.stringify({ ...stored, email: userData.email, username: account.username }))
    await refreshUser()
    toast.success(t('email_changed'))
  }

  const handlePasswordChange = async (e) => {
    e.preventDefault()
    setPwError('')
    if (pwForm.newPw !== pwForm.confirm) { toast.error(t('password_mismatch')); return }
    if (pwForm.newPw.length < 6) { toast.error(t('password_min')); return }
    setPwSaving(true)
    try {
      await api.put('/auth/password', {
        current_password: pwForm.current,
        new_password: pwForm.newPw,
      })
      toast.success(t('password_changed'))
      setPwForm({ current: '', newPw: '', confirm: '' })
    } catch (err) {
      const detail = err.response?.data?.detail || 'error'
      setPwError(t(detail) !== detail ? t(detail) : t('error'))
    } finally { setPwSaving(false) }
  }

  const emailChanged = account.email !== user?.email
  const usernameChanged = account.username !== user?.username

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 600 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 10 }}>
        <Settings size={22} /> {t('settings')}
      </h1>

      {/* Email верификация модалы */}
      {showEmailModal && (
        <EmailVerifyModal
          newEmail={account.email}
          onSuccess={handleEmailVerified}
          onClose={() => setShowEmailModal(false)}
        />
      )}

      {/* Аккаунт деректері */}
      <div className="card">
        <h3 style={{ marginBottom: 20 }}>{t('account_settings')}</h3>
        <form onSubmit={handleUsernameSave} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="grid-2">
            {/* Username */}
            <div className="field">
              <label>{t('username')}</label>
              <div className="input-wrap">
                <input
                  className={`input ${usernameCheck.touched && account.username !== user?.username
                    ? usernameCheck.taken ? 'input-err' : account.username.length >= 3 && !usernameCheck.checking ? 'input-ok' : ''
                    : ''}`}
                  value={account.username}
                  onChange={e => { setAccount(p => ({ ...p, username: e.target.value })); setUsernameCheck(p => ({ ...p, touched: true })) }}
                  autoComplete="username"
                />
                <span className="field-icon">
                  {usernameCheck.checking
                    ? <Loader size={15} className="spin" style={{ color: 'var(--text-secondary)' }} />
                    : usernameCheck.touched && account.username !== user?.username && account.username.length >= 3
                      ? usernameCheck.taken
                        ? <XCircle size={15} color="var(--danger)" />
                        : <CheckCircle size={15} color="var(--success)" />
                      : null}
                </span>
              </div>
              {usernameCheck.taken && account.username !== user?.username && (
                <span className="field-error">{t('username_taken')}</span>
              )}
            </div>

            {/* Email */}
            <div className="field">
              <label>
                {t('email')}
                {emailChanged && (
                  <span style={{
                    marginLeft: 8, fontSize: 11, fontWeight: 600,
                    color: 'var(--accent)', background: 'var(--accent-light)',
                    padding: '2px 8px', borderRadius: 20
                  }}>
                    ✉ Растау қажет
                  </span>
                )}
              </label>
              <div className="input-wrap">
                <input
                  className={`input ${emailCheck.touched && account.email !== user?.email
                    ? emailCheck.taken ? 'input-err' : account.email.includes('@') && !emailCheck.checking ? 'input-ok' : ''
                    : ''}`}
                  type="email"
                  value={account.email}
                  onChange={e => { setAccount(p => ({ ...p, email: e.target.value })); setEmailCheck(p => ({ ...p, touched: true })) }}
                  autoComplete="email"
                />
                <span className="field-icon">
                  {emailCheck.checking
                    ? <Loader size={15} className="spin" style={{ color: 'var(--text-secondary)' }} />
                    : emailCheck.touched && account.email !== user?.email && account.email.includes('@')
                      ? emailCheck.taken
                        ? <XCircle size={15} color="var(--danger)" />
                        : <CheckCircle size={15} color="var(--success)" />
                      : null}
                </span>
              </div>
              {emailCheck.taken && account.email !== user?.email && (
                <span className="field-error">{t('email_taken')}</span>
              )}
              {emailChanged && !emailCheck.taken && (
                <span style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4, display: 'block' }}>
                  💡 Сақтасаңыз, жаңа emailге растау коды жіберіледі
                </span>
              )}
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ alignSelf: 'flex-start', padding: '10px 24px' }}
            disabled={accountSaving || emailSending || usernameCheck.taken || emailCheck.taken || (!usernameChanged && !emailChanged)}
          >
            {(accountSaving || emailSending) ? <span className="spin">◌</span> : (
              emailChanged
                ? <><Mail size={15} /> Код жіберу</>
                : <><Save size={15} /> {t('save')}</>
            )}
          </button>
        </form>
      </div>

      {/* Құпиясөзді өзгерту */}
      <div className="card">
        <h3 style={{ marginBottom: 20 }}>{t('change_password')}</h3>
        <form onSubmit={handlePasswordChange} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Ағымдағы құпиясөз */}
          <div className="field">
            <label>{t('current_password')}</label>
            <div className="input-wrap">
              <input
                className={`input ${pwError ? 'input-err' : ''}`}
                type={showPw.current ? 'text' : 'password'}
                value={pwForm.current}
                onChange={e => { setPwForm(p => ({ ...p, current: e.target.value })); setPwError('') }}
                autoComplete="current-password"
                style={{ paddingRight: 44 }}
              />
              <button type="button" className="eye-btn" onClick={() => setShowPw(p => ({ ...p, current: !p.current }))}>
                {showPw.current ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {pwError && <span className="field-error">{pwError}</span>}
          </div>

          {/* Жаңа құпиясөз */}
          <div className="field">
            <label>{t('new_password')}</label>
            <div className="input-wrap">
              <input
                className={`input ${pwForm.newPw.length > 0 ? pwForm.newPw.length >= 6 ? 'input-ok' : 'input-err' : ''}`}
                type={showPw.newPw ? 'text' : 'password'}
                value={pwForm.newPw}
                onChange={e => setPwForm(p => ({ ...p, newPw: e.target.value }))}
                autoComplete="new-password"
                style={{ paddingRight: 80 }}
              />
              <span className="field-icon" style={{ right: 40 }}>
                {pwForm.newPw.length > 0 && (pwForm.newPw.length >= 6
                  ? <CheckCircle size={15} color="var(--success)" />
                  : <XCircle size={15} color="var(--danger)" />)}
              </span>
              <button type="button" className="eye-btn" onClick={() => setShowPw(p => ({ ...p, newPw: !p.newPw }))}>
                {showPw.newPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {pwForm.newPw.length > 0 && pwForm.newPw.length < 6 && (
              <span className="field-error">{t('password_min')}</span>
            )}
          </div>

          {/* Растау */}
          <div className="field">
            <label>{t('confirm_password')}</label>
            <div className="input-wrap">
              <input
                className={`input ${pwForm.confirm.length > 0 ? pwForm.confirm === pwForm.newPw ? 'input-ok' : 'input-err' : ''}`}
                type={showPw.confirm ? 'text' : 'password'}
                value={pwForm.confirm}
                onChange={e => setPwForm(p => ({ ...p, confirm: e.target.value }))}
                autoComplete="new-password"
                style={{ paddingRight: 80 }}
              />
              <span className="field-icon" style={{ right: 40 }}>
                {pwForm.confirm.length > 0 && (pwForm.confirm === pwForm.newPw
                  ? <CheckCircle size={15} color="var(--success)" />
                  : <XCircle size={15} color="var(--danger)" />)}
              </span>
              <button type="button" className="eye-btn" onClick={() => setShowPw(p => ({ ...p, confirm: !p.confirm }))}>
                {showPw.confirm ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {pwForm.confirm.length > 0 && pwForm.confirm !== pwForm.newPw && (
              <span className="field-error">{t('password_mismatch')}</span>
            )}
          </div>

          <button type="submit" className="btn btn-primary"
            style={{ alignSelf: 'flex-start', padding: '10px 24px' }}
            disabled={pwSaving || !pwForm.current || pwForm.newPw.length < 6 || pwForm.newPw !== pwForm.confirm}>
            {pwSaving ? <span className="spin">◌</span> : <><Save size={15} /> {t('change_password')}</>}
          </button>
        </form>
      </div>
    </div>
  )
}
