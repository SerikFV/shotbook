import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '../store/authStore'
import { useBadgeStore } from '../store/badgeStore'
import api from '../services/api'
import { createPortal } from 'react-dom'
import { Send, Trash2, Trash, X, MoreVertical, Check, CheckCheck, Users, Pin, LogOut, Settings, Camera as CameraIcon } from 'lucide-react'
import toast from 'react-hot-toast'
import './Messages.css'
import { formatTime } from '../utils/date'

export default function MessagesPage() {
  const { userId } = useParams()
  const { t } = useTranslation()
  const { user } = useAuthStore()
  const { clearMessages, setUnreadMessages } = useBadgeStore()
  const navigate = useNavigate()
  const [contacts, setContacts] = useState([])
  const [messages, setMessages] = useState([])
  const [selectedUser, setSelectedUser] = useState(null)
  const [input, setInput] = useState('')
  const [onlineMap, setOnlineMap] = useState({})
  const [groupRoom, setGroupRoom] = useState(null)
  const wsRef = useRef(null)
  const bottomRef = useRef(null)

  // Хабарлама контекст меню
  const [ctxMenu, setCtxMenu] = useState(null) // { msgId, x, y, isMine }
  // Чат тазарту растау
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  // Хабарлама өшіру растау
  const [deleteModal, setDeleteModal] = useState(null) // { msgId, isMine }
  const [showGroupSettings, setShowGroupSettings] = useState(false)
  const [groupNameInput, setGroupNameInput] = useState('')

  const sortContacts = (list) =>
    [...list].sort((a, b) => {
      const ta = a.last_time ? new Date(a.last_time).getTime() : 0
      const tb = b.last_time ? new Date(b.last_time).getTime() : 0
      return tb - ta
    })

  // Load contacts
  useEffect(() => {
    const fetchContacts = async () => {
      try {
        const { data } = await api.get('/messages/contacts')
        let finalContacts = sortContacts(data)
        
        let localGroupRoom = null
        if (user?.role === 'mobilographer' || user?.role === 'admin') {
          try {
            const { data: g } = await api.get('/groups/main')
            localGroupRoom = {
              id: `group_${g.id}`,
              real_id: g.id,
              username: g.name,
              avatar: '',
              is_group: true,
              is_member: g.is_member,
              last_message: g.description,
              unread: 0,
            }
            setGroupRoom(localGroupRoom)
            finalContacts = [localGroupRoom, ...finalContacts]
          } catch (e) { console.error(e) }
        }
        setContacts(finalContacts)
        
        if (userId) {
          if (userId.startsWith('group_')) {
            const found = finalContacts.find(c => c.id === userId)
            if (found) selectContact(found)
          } else {
            const found = data.find(c => c.id === parseInt(userId))
            if (found) selectContact(found)
            else api.get(`/users/${userId}`).then(({ data: u }) => selectContact(u))
          }
        }
      } catch (e) { console.error(e) }
    }
    fetchContacts()
  }, [userId, user?.role])

  // WebSocket
  useEffect(() => {
    if (!user) return
    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const host = import.meta.env.VITE_WS_URL || `${proto}//${window.location.host}`
    const token = localStorage.getItem('token')
    const ws = new WebSocket(`${host}/ws/${user.id}${token ? `?token=${token}` : ''}`)
    wsRef.current = ws
    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data)
      if (msg.type === 'message') {
        setMessages(prev => {
          if (prev.find(m => m.id === msg.id)) return prev
          return [...prev, msg]
        })
        setContacts(prev => {
          const updated = prev.map(c => {
            if (!c.is_group && (c.id === msg.sender_id || c.id === msg.receiver_id)) {
              return {
                ...c,
                last_message: msg.message,
                last_time: msg.created_at,
                unread: c.id === msg.sender_id ? (c.unread || 0) + 1 : c.unread
              }
            }
            return c
          })
          return sortContacts(updated)
        })
      }
      if (msg.type === 'group_message') {
        setMessages(prev => {
           // Тек егер топтық чат ашық болса ғана қосамыз
           const pathParts = window.location.pathname.split('/')
           const currentId = pathParts[pathParts.length - 1]
           if (currentId === `group_${msg.room_id}`) {
             if (prev.find(m => m.id === msg.id)) return prev
             return [...prev, msg]
           }
           return prev
        })
        setContacts(prev => {
           const cIdx = prev.findIndex(c => c.is_group && c.real_id === msg.room_id)
           if (cIdx >= 0) {
             const grp = { ...prev[cIdx], last_message: `${msg.sender.username}: ${msg.message}` }
             const updated = prev.filter((_, i) => i !== cIdx)
             return [grp, ...updated]
           }
           return prev
        })
      }
      if (msg.type === 'group_pin_update') {
        setMessages(prev => prev.map(m => m.id === msg.msg_id ? { ...m, is_pinned: msg.is_pinned } : m))
      }
      if (msg.type === 'group_message_deleted') {
        setMessages(prev => prev.map(m => m.id === msg.msg_id ? { ...m, deleted_for_all: true, message: '__deleted_all__' } : m))
      }
      if (msg.type === 'group_update') {
        setContacts(prev => prev.map(c => {
           if (c.is_group && c.real_id === msg.room_id) {
              return { ...c, username: msg.name, avatar: msg.avatar }
           }
           return c
        }))
        setSelectedUser(prev => {
           if (prev && prev.is_group && prev.real_id === msg.room_id) {
              return { ...prev, username: msg.name, avatar: msg.avatar }
           }
           return prev
        })
      }
    }
    return () => ws.close()
  }, [user])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Контекст меню сыртына басса жабылады
  useEffect(() => {
    if (!ctxMenu) return
    const handler = () => setCtxMenu(null)
    document.addEventListener('click', handler)
    return () => document.removeEventListener('click', handler)
  }, [ctxMenu])

  const selectContact = async (contact) => {
    setSelectedUser(contact)
    navigate(`/messages/${contact.id}`, { replace: true })
    if (contact.is_group) {
      const { data } = await api.get(`/groups/${contact.real_id}/messages`)
      setMessages(data)
    } else {
      const { data } = await api.get(`/messages/conversation/${contact.id}`)
      setMessages(data)
      setContacts(prev => prev.map(c => c.id === contact.id ? { ...c, unread: 0 } : c))
      // Badge тазалау
      const totalUnread = contacts.filter(c => c.id !== contact.id && !c.is_group).reduce((s, c) => s + (c.unread || 0), 0)
      setUnreadMessages(totalUnread)
      try {
        const { data: onlineData } = await api.get(`/online/${contact.id}`)
        setOnlineMap(prev => ({ ...prev, [contact.id]: onlineData.online }))
      } catch {}
    }
  }

  const sendMessage = async (e) => {
    e.preventDefault()
    if (!input.trim() || !selectedUser) return
    const text = input.trim()
    setInput('')
    try {
      if (selectedUser.is_group) {
        const { data } = await api.post(`/groups/${selectedUser.real_id}/messages`, { message: text })
        // wsRef.current арқылы емес, backend өзі таратады. Бірақ өзімізге тезірек көрсету үшін:
        // WebSocket арқылы келгенше күтпей қоса береміз:
        // Ол жағын backend-тен келетін 'group_message' event шешеді (немесе дубликаттан сақтаймыз).
      } else {
        const { data } = await api.post('/messages/', {
          receiver_id: selectedUser.id,
          message: text,
        })
        const msgObj = {
          id: data.id,
          sender_id: user.id,
          receiver_id: selectedUser.id,
          message: data.message,
          created_at: data.created_at,
          type: 'message',
        }
        if (wsRef.current?.readyState === 1) {
          wsRef.current.send(JSON.stringify(msgObj))
        }
        setMessages(prev => prev.find(m => m.id === msgObj.id) ? prev : [...prev, msgObj])
        setContacts(prev => sortContacts(prev.map(c =>
          c.id === selectedUser.id
            ? { ...c, last_message: data.message, last_time: data.created_at }
            : c
        )))
      }
    } catch (err) {
      setInput(text)
      toast.error(err.response?.data?.detail || 'Хабарлама жіберілмеді')
    }
  }

  // Хабарламаны өшіру
  const handleDeleteMessage = async (msgId, deleteFor) => {
    try {
      if (selectedUser?.is_group) {
        await api.delete(`/groups/messages/${msgId}`)
        // WebSocket updates the UI, but we can do it locally too
        setMessages(prev => prev.map(m => m.id === msgId ? { ...m, deleted_for_all: true, message: '__deleted_all__' } : m))
      } else {
        await api.delete(`/messages/message/${msgId}`, { data: { delete_for: deleteFor } })
        setMessages(prev => prev.map(m => {
          if (m.id !== msgId) return m
          if (deleteFor === 'all') return { ...m, deleted_for_all: true, message: '__deleted_all__' }
          if (m.sender_id === user.id) return { ...m, deleted_for_sender: true, message: '__deleted_me__' }
          return { ...m, deleted_for_receiver: true, message: '__deleted_me__' }
        }))
      }
      toast.success('Өшірілді')
    } catch (e) { toast.error(e.response?.data?.detail || 'Қате') }
    setDeleteModal(null)
  }

  // Чатты тазарту
  const handleClearChat = async () => {
    if (!selectedUser) return
    try {
      await api.delete(`/messages/clear/${selectedUser.id}`)
      setMessages([])
      setContacts(prev => prev.map(c => c.id === selectedUser.id ? { ...c, last_message: '', unread: 0 } : c))
      toast.success('Чат тазартылды')
    } catch { toast.error('Қате') }
    setShowClearConfirm(false)
  }

  // Хабарлама мазмұнын render ету
  const renderMsgText = (m) => {
    if (m.deleted_for_all || m.message === '__deleted_all__') {
      return <span style={{ fontStyle: 'italic', opacity: 0.6, fontSize: 13 }}>🚫 Хабарлама өшірілді</span>
    }
    if (m.message === '__deleted_me__') {
      return <span style={{ fontStyle: 'italic', opacity: 0.6, fontSize: 13 }}>🗑 Хабарлама өшірілді</span>
    }
    return <span>{m.message}</span>
  }

  const isDeleted = (m) => m.deleted_for_all || m.message === '__deleted_all__' || m.message === '__deleted_me__'

  const handleJoinGroup = async () => {
    try {
      await api.post(`/groups/${selectedUser.real_id}/join`)
      const updatedUser = { ...selectedUser, is_member: true }
      setSelectedUser(updatedUser)
      setContacts(prev => prev.map(c => c.id === updatedUser.id ? updatedUser : c))
      toast.success('Топқа қосылдыңыз')
    } catch { toast.error('Қате') }
  }

  const handleLeaveGroup = async () => {
    try {
      await api.post(`/groups/${selectedUser.real_id}/leave`)
      const updatedUser = { ...selectedUser, is_member: false }
      setSelectedUser(updatedUser)
      setContacts(prev => prev.map(c => c.id === updatedUser.id ? updatedUser : c))
      toast.success('Топтан шықтыңыз')
    } catch { toast.error('Қате') }
  }
  
  const handlePinMessage = async (msgId) => {
    try {
      await api.post(`/groups/messages/${msgId}/pin`)
    } catch (e) { toast.error(e.response?.data?.detail || 'Қате') }
    setCtxMenu(null)
  }


  return (
    <div className="messages-layout fade-in">
      {/* Contacts sidebar */}
      <div className="contacts-panel">
        <div className="contacts-header">
          <h3>{t('messages')}</h3>
        </div>
        <div className="contacts-list">
          {contacts.length === 0 && (
            <div style={{ padding: 24, color: 'var(--text-secondary)', textAlign: 'center', fontSize: 13 }}>{t('no_data')}</div>
          )}
          {contacts.map(c => (
            <div key={c.id}
              className={`contact-item ${selectedUser?.id === c.id ? 'active' : ''}`}
              onClick={() => selectContact(c)}>
              <div style={{ position: 'relative' }}>
                <div className="avatar" style={{ width: 40, height: 40, fontSize: 16, background: c.is_group ? 'var(--accent)' : 'var(--card2)', color: 'white' }}>
                  {c.is_group ? <Users size={20} /> : (c.avatar
                    ? <img src={c.avatar} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                    : c.username[0].toUpperCase())}
                </div>
                {onlineMap[c.id] && (
                  <div style={{ position: 'absolute', bottom: 0, right: 0, width: 10, height: 10, background: 'var(--success)', borderRadius: '50%', border: '2px solid var(--card)' }} />
                )}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 600, fontSize: 14 }}>{c.username}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {c.last_time && (
                      <span style={{ fontSize: 10, color: 'var(--text-secondary)', flexShrink: 0 }}>
                        {formatTime(c.last_time)}
                      </span>
                    )}
                    {c.unread > 0 && <span className="unread-badge">{c.unread}</span>}
                  </div>
                </div>
                {c.last_message && (
                  <div style={{ color: 'var(--text-secondary)', fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {c.last_message}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Chat area */}
      <div className="chat-panel">
        {!selectedUser ? (
          <div className="chat-empty">
            <div style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>💬</div>
              <p>{t('messages')}</p>
            </div>
          </div>
        ) : (
          <>
            {/* Chat header */}
            <div className="chat-header" style={{ cursor: selectedUser.is_group && user?.role === 'admin' ? 'pointer' : 'default' }} onClick={() => { if (selectedUser.is_group && user?.role === 'admin') { setGroupNameInput(selectedUser.username); setShowGroupSettings(true) } }}>
              <div className="avatar" style={{ width: 38, height: 38, fontSize: 14, background: selectedUser.is_group ? 'var(--accent)' : 'var(--card2)', color: 'white' }}>
                {selectedUser.is_group ? (selectedUser.avatar ? <img src={selectedUser.avatar} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} /> : <Users size={18} />) : (selectedUser.avatar
                  ? <img src={selectedUser.avatar} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                  : selectedUser.username[0].toUpperCase())}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                   {selectedUser.username}
                   {selectedUser.is_group && user?.role === 'admin' && <Settings size={14} color="var(--text-secondary)" />}
                </div>
                <div style={{ fontSize: 11, color: selectedUser.is_group ? 'var(--accent)' : (onlineMap[selectedUser.id] ? 'var(--success)' : 'var(--text-secondary)') }}>
                  {selectedUser.is_group ? 'Мобилографтар қауымдастығы' : (onlineMap[selectedUser.id] ? t('online') : t('offline'))}
                </div>
              </div>
              
              {selectedUser.is_group ? (
                selectedUser.is_member && user?.role !== 'admin' && (
                  <button
                    className="btn btn-ghost"
                    style={{ padding: '6px 10px', fontSize: 12, color: 'var(--danger)', borderColor: 'rgba(244,63,94,0.3)', gap: 6 }}
                    onClick={(e) => { e.stopPropagation(); handleLeaveGroup() }}
                    title="Топтан шығу"
                  >
                    <LogOut size={14} />
                  </button>
                )
              ) : (
                <button
                  className="btn btn-ghost"
                  style={{ padding: '6px 10px', fontSize: 12, color: 'var(--danger)', borderColor: 'rgba(244,63,94,0.3)', gap: 6 }}
                  onClick={() => setShowClearConfirm(true)}
                  title="Чатты тазарту"
                >
                  <Trash size={14} />
                </button>
              )}
            </div>
            
            {/* Закреп хабарламалар */}
            {selectedUser.is_group && messages.some(m => m.is_pinned) && (
              <div style={{ padding: '10px 16px', background: 'var(--card2)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
                <Pin size={16} color="var(--accent)" />
                <div style={{ flex: 1, fontSize: 13, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  <span style={{ fontWeight: 600, marginRight: 6 }}>Бекітілген хабарлама:</span>
                  {messages.filter(m => m.is_pinned).pop()?.message}
                </div>
              </div>
            )}

            {/* Messages */}
            <div className="chat-messages" onClick={() => setCtxMenu(null)}>
              {messages.map((m, i) => {
                const isMine = m.sender_id === user.id
                const deleted = isDeleted(m)
                return (
                  <div key={m.id || i} className={`msg-wrap ${isMine ? 'mine' : 'theirs'}`}>
                    <div
                      className={`msg-bubble ${isMine ? 'mine' : 'theirs'} ${deleted ? 'msg-deleted' : ''}`}
                      onContextMenu={e => {
                        if (deleted) return
                        e.preventDefault()
                        setCtxMenu({ msgId: m.id, x: e.clientX, y: e.clientY, isMine, msg: m })
                      }}
                    >
                      {selectedUser.is_group && !isMine && m.sender && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                           {m.sender.avatar ? (
                             <img src={m.sender.avatar} style={{ width: 16, height: 16, borderRadius: '50%', objectFit: 'cover' }} />
                           ) : (
                             <div style={{ width: 16, height: 16, borderRadius: '50%', background: 'var(--accent)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9 }}>
                               {m.sender.username[0].toUpperCase()}
                             </div>
                           )}
                           <span style={{ fontSize: 11, fontWeight: 600, color: m.sender.role === 'admin' ? 'var(--warning)' : 'var(--accent)' }}>
                             {m.sender.username} {m.sender.role === 'admin' && '👑'}
                           </span>
                        </div>
                      )}
                      <div>{renderMsgText(m)}</div>
                      {!deleted && (
                        <div className="msg-time">
                          {formatTime(m.created_at)}
                          {isMine && !selectedUser.is_group && (
                            <span style={{ marginLeft: 4 }}>
                              {m.is_read ? <CheckCheck size={12} color="var(--accent)" /> : <Check size={12} />}
                            </span>
                          )}
                          {m.is_pinned && <Pin size={10} style={{ marginLeft: 4, transform: 'rotate(45deg)', opacity: 0.7 }} />}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
              <div ref={bottomRef} />
            </div>

            {/* Input немесе Join button */}
            {selectedUser.is_group && !selectedUser.is_member ? (
              <div style={{ padding: 20, textAlign: 'center', background: 'var(--card2)', borderTop: '1px solid var(--border)' }}>
                <p style={{ marginBottom: 12, fontSize: 13, color: 'var(--text-secondary)' }}>Хабарлама жазу үшін топқа қосылыңыз</p>
                <button className="btn btn-primary" onClick={handleJoinGroup}>Топқа қосылу</button>
              </div>
            ) : (
              <form className="chat-input-row" onSubmit={sendMessage}>
                <input
                  className="chat-input"
                  placeholder={t('type_message')}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                />
                <button type="submit" className="send-btn" disabled={!input.trim()}>
                  <Send size={18} />
                </button>
              </form>
            )}
          </>
        )}
      </div>

      {/* ── Контекст меню (оң жақ шертсе) ── */}
      {ctxMenu && createPortal(
        <div style={{
          position: 'fixed', top: ctxMenu.y, left: ctxMenu.x,
          zIndex: 99999, background: 'var(--card)', border: '1px solid var(--border)',
          borderRadius: 12, boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          minWidth: 180, overflow: 'hidden', padding: 4,
        }}
          onClick={e => e.stopPropagation()}
        >
          {/* Закреп қою/алу (тек топ чатта, тек админ немесе автор) */}
          {selectedUser?.is_group && (user?.role === 'admin' || ctxMenu.isMine) && (
            <button
              style={{
                display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                padding: '10px 14px', background: 'none', border: 'none',
                color: 'var(--text)', fontSize: 14, cursor: 'pointer', borderRadius: 8,
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--card2)'}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}
              onClick={() => handlePinMessage(ctxMenu.msgId)}
            >
              <Pin size={15} color="var(--accent)" />
              {ctxMenu.msg?.is_pinned ? 'Закрептен алу' : 'Закреп қою'}
            </button>
          )}

          {/* Өшіру (жеке чатта немесе топта админ болса) */}
          {(!selectedUser?.is_group || user?.role === 'admin' || ctxMenu.isMine) && (
            <button
              style={{
                display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                padding: '10px 14px', background: 'none', border: 'none',
                color: 'var(--text)', fontSize: 14, cursor: 'pointer', borderRadius: 8,
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--card2)'}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}
              onClick={() => {
                setDeleteModal({ msgId: ctxMenu.msgId, isMine: ctxMenu.isMine }); setCtxMenu(null) 
              }}
            >
              <Trash2 size={15} color="var(--danger)" />
              Хабарламаны өшіру
            </button>
          )}
        </div>,
        document.body
      )}

      {/* ── Хабарлама өшіру модалы ── */}
      {deleteModal && createPortal(
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
          zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16
        }}>
          <div className="card" style={{ width: '100%', maxWidth: 360, padding: '24px 20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontSize: 16 }}>Хабарламаны өшіру</h3>
              <button onClick={() => setDeleteModal(null)} style={{ background: 'none', color: 'var(--text-secondary)' }}>
                <X size={18} />
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {selectedUser?.is_group ? (
                <button
                  className="btn btn-ghost"
                  style={{ width: '100%', justifyContent: 'flex-start', padding: '12px 16px', gap: 10, borderColor: 'rgba(244,63,94,0.3)' }}
                  onClick={() => handleDeleteMessage(deleteModal.msgId, 'all')}
                >
                  <Trash2 size={16} color="var(--danger)" />
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--danger)' }}>Хабарламаны жою</div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Топтағы барлық адамдардан жойылады</div>
                  </div>
                </button>
              ) : (
                <>
                  {/* Өзіме өшіру */}
                  <button
                    className="btn btn-ghost"
                    style={{ width: '100%', justifyContent: 'flex-start', padding: '12px 16px', gap: 10 }}
                    onClick={() => handleDeleteMessage(deleteModal.msgId, 'me')}
                  >
                    <Trash size={16} color="var(--text-secondary)" />
                    <div style={{ textAlign: 'left' }}>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>Өзім үшін өшіру</div>
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Тек сіз үшін жойылады</div>
                    </div>
                  </button>
    
                  {/* Барлығына өшіру — тек жіберуші */}
                  {deleteModal.isMine && (
                    <button
                      className="btn btn-ghost"
                      style={{ width: '100%', justifyContent: 'flex-start', padding: '12px 16px', gap: 10, borderColor: 'rgba(244,63,94,0.3)' }}
                      onClick={() => handleDeleteMessage(deleteModal.msgId, 'all')}
                    >
                      <Trash2 size={16} color="var(--danger)" />
                      <div style={{ textAlign: 'left' }}>
                        <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--danger)' }}>Барлығына өшіру</div>
                        <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Екі жақ үшін жойылады</div>
                      </div>
                    </button>
                  )}
                </>
              )}

              <button
                className="btn btn-ghost"
                style={{ width: '100%', justifyContent: 'center', marginTop: 4 }}
                onClick={() => setDeleteModal(null)}
              >
                Бас тарту
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}


      {/* ── Топтық чат параметрлері (тек админ) ── */}
      {showGroupSettings && selectedUser?.is_group && createPortal(
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
          zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16
        }}>
          <div className="card" style={{ width: '100%', maxWidth: 400, padding: '24px 20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ fontSize: 18 }}>Топ параметрлері</h3>
              <button onClick={() => setShowGroupSettings(false)} style={{ background: 'none', color: 'var(--text-secondary)' }}>
                <X size={20} />
              </button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 20 }}>
               <div style={{ position: 'relative', cursor: 'pointer' }}>
                 <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'var(--card2)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                    {selectedUser.avatar ? (
                      <img src={selectedUser.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <Users size={32} color="var(--text-secondary)" />
                    )}
                 </div>
                 <label style={{ position: 'absolute', bottom: 0, right: 0, background: 'var(--accent)', color: 'white', padding: 6, borderRadius: '50%', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.2)' }}>
                    <CameraIcon size={14} />
                    <input type="file" accept="image/*" style={{ display: 'none' }} onChange={async (e) => {
                      const file = e.target.files[0];
                      if (!file) return;
                      const fd = new FormData();
                      fd.append('file', file);
                      try {
                        const { data } = await api.post(`/groups/${selectedUser.real_id}/avatar`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
                        toast.success('Аватар жаңартылды');
                        // WebSocket updates UI
                      } catch (err) { toast.error('Қате шықты') }
                    }} />
                 </label>
               </div>
            </div>

            <div className="form-group">
              <label>Топтың атауы</label>
              <input 
                className="input" 
                value={groupNameInput} 
                onChange={e => setGroupNameInput(e.target.value)} 
                placeholder="Топтың атын енгізіңіз" 
              />
            </div>
            
            <button 
              className="btn btn-primary" 
              style={{ width: '100%', marginTop: 20 }}
              onClick={async () => {
                try {
                  await api.put(`/groups/${selectedUser.real_id}`, { name: groupNameInput });
                  toast.success('Сақталды');
                  setShowGroupSettings(false);
                } catch (err) { toast.error('Қате шықты') }
              }}
            >
              Сақтау
            </button>
          </div>
        </div>,
        document.body
      )}
      {/* ── Чат тазарту растау ── */}
      {showClearConfirm && createPortal(
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
          zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16
        }}>
          <div className="card" style={{ width: '100%', maxWidth: 340, padding: '24px 20px', textAlign: 'center' }}>
            <div style={{
              width: 52, height: 52, borderRadius: '50%', background: 'rgba(244,63,94,0.12)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px'
            }}>
              <Trash2 size={24} color="var(--danger)" />
            </div>
            <h3 style={{ marginBottom: 8 }}>Чатты тазарту</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 20, lineHeight: 1.5 }}>
              Бұл чаттағы барлық хабарламалар тек сізге өшіріледі. Басқа жаққа әсер етпейді.
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setShowClearConfirm(false)}>
                Бас тарту
              </button>
              <button className="btn btn-danger" style={{ flex: 1 }} onClick={handleClearChat}>
                Тазарту
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
