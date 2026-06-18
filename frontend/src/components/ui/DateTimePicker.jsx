import { useState, useRef, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Clock, X } from 'lucide-react'

const MONTHS_KK = ['Қаңтар','Ақпан','Наурыз','Сәуір','Мамыр','Маусым','Шілде','Тамыз','Қыркүйек','Қазан','Қараша','Желтоқсан']
const DAYS_KK   = ['Дс','Сс','Ср','Бс','Жм','Сб','Жк']

// ---- DATE PICKER ----
export function DatePicker({ value, onChange, minDate, blockedDates = new Set(), placeholder = 'Күн таңдаңыз' }) {
  const [open, setOpen] = useState(false)
  const [viewDate, setViewDate] = useState(() => {
    const d = value ? new Date(value) : new Date()
    return { year: d.getFullYear(), month: d.getMonth() }
  })
  const ref = useRef(null)

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const today = new Date(); today.setHours(0,0,0,0)
  const minD = minDate ? new Date(minDate) : today
  minD.setHours(0,0,0,0)

  const getDays = () => {
    const { year, month } = viewDate
    const firstDay = new Date(year, month, 1).getDay()
    const start = (firstDay + 6) % 7 // Дүйсенбіден бастау
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const cells = []
    for (let i = 0; i < start; i++) cells.push(null)
    for (let d = 1; d <= daysInMonth; d++) cells.push(d)
    return cells
  }

  const selectDay = (day) => {
    if (!day) return
    const { year, month } = viewDate
    const d = new Date(year, month, day)
    d.setHours(0,0,0,0)
    if (d < minD) return
    const str = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`
    onChange(str)
    setOpen(false)
  }

  const prevMonth = () => setViewDate(v => {
    if (v.month === 0) return { year: v.year-1, month: 11 }
    return { year: v.year, month: v.month-1 }
  })
  const nextMonth = () => setViewDate(v => {
    if (v.month === 11) return { year: v.year+1, month: 0 }
    return { year: v.year, month: v.month+1 }
  })

  const displayValue = value
    ? new Date(value + 'T00:00').toLocaleDateString('kk', { day:'numeric', month:'long', year:'numeric' })
    : placeholder

  const selectedDay = value ? new Date(value + 'T00:00').getDate() : null
  const selectedMonth = value ? new Date(value + 'T00:00').getMonth() : null
  const selectedYear  = value ? new Date(value + 'T00:00').getFullYear() : null

  return (
    <div ref={ref} style={{ position:'relative' }}>
      <button type="button" onClick={() => setOpen(v => !v)}
        style={{
          width:'100%', padding:'12px 16px', borderRadius:10, cursor:'pointer',
          background:'var(--card2)', border:`1px solid ${open ? 'var(--accent)' : 'var(--border)'}`,
          color: value ? 'var(--text)' : 'var(--text-secondary)',
          display:'flex', justifyContent:'space-between', alignItems:'center', fontSize:14,
          boxShadow: open ? '0 0 0 3px rgba(79,142,247,0.12)' : 'none',
          transition:'all 0.2s'
        }}>
        <span>{displayValue}</span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/>
          <line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
        </svg>
      </button>

      {open && (
        <div style={{
          position:'absolute', top:'calc(100% + 8px)', left:0, zIndex:9999,
          background:'var(--card)', border:'1px solid var(--border)',
          borderRadius:16, boxShadow:'0 8px 40px rgba(0,0,0,0.5)',
          padding:20, minWidth:300,
        }}>
          {/* Header */}
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
            <button type="button" onClick={prevMonth} style={{ background:'var(--card2)', border:'1px solid var(--border)', borderRadius:8, padding:'6px 8px', cursor:'pointer', color:'var(--text)', display:'flex' }}>
              <ChevronLeft size={16}/>
            </button>
            <span style={{ fontWeight:700, fontSize:15 }}>
              {MONTHS_KK[viewDate.month]} {viewDate.year}
            </span>
            <button type="button" onClick={nextMonth} style={{ background:'var(--card2)', border:'1px solid var(--border)', borderRadius:8, padding:'6px 8px', cursor:'pointer', color:'var(--text)', display:'flex' }}>
              <ChevronRight size={16}/>
            </button>
          </div>

          {/* Weekdays */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:2, marginBottom:6 }}>
            {DAYS_KK.map(d => (
              <div key={d} style={{ textAlign:'center', fontSize:11, fontWeight:600, color:'var(--text-secondary)', padding:'4px 0' }}>{d}</div>
            ))}
          </div>

          {/* Days */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:2 }}>
            {getDays().map((day, i) => {
              if (!day) return <div key={i}/>
              const cellDate = new Date(viewDate.year, viewDate.month, day)
              cellDate.setHours(0,0,0,0)
              const isPast = cellDate < minD
              const isToday = cellDate.toDateString() === today.toDateString()
              const isSelected = day === selectedDay && viewDate.month === selectedMonth && viewDate.year === selectedYear
              const dateStr = `${viewDate.year}-${String(viewDate.month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`
              const isBlocked = blockedDates.has(dateStr)

              return (
                <button key={i} type="button" onClick={() => !isPast && !isBlocked && selectDay(day)}
                  style={{
                    borderRadius:8, padding:'8px 4px', cursor: isPast||isBlocked ? 'not-allowed' : 'pointer',
                    fontSize:13, fontWeight: isSelected ? 700 : 400, border:'none',
                    background: isSelected ? 'var(--accent)' :
                                isBlocked  ? 'rgba(244,63,94,0.15)' :
                                isToday    ? 'var(--accent-light)' : 'transparent',
                    color: isSelected ? 'white' :
                           isBlocked  ? 'var(--danger)' :
                           isPast     ? 'var(--border2)' :
                           isToday    ? 'var(--accent)' : 'var(--text)',
                    position:'relative', transition:'all 0.15s',
                  }}
                  title={isBlocked ? 'Бос емес күн' : ''}>
                  {day}
                  {isBlocked && <span style={{ position:'absolute', bottom:2, left:'50%', transform:'translateX(-50%)', width:4, height:4, borderRadius:'50%', background:'var(--danger)', display:'block'}}/>}
                </button>
              )
            })}
          </div>

          {/* Legend */}
          <div style={{ display:'flex', gap:12, marginTop:12, paddingTop:12, borderTop:'1px solid var(--border)', fontSize:11, color:'var(--text-secondary)' }}>
            <span style={{ display:'flex', alignItems:'center', gap:4 }}>
              <span style={{ width:8, height:8, borderRadius:2, background:'var(--accent-light)', display:'inline-block' }}/> Бүгін
            </span>
            <span style={{ display:'flex', alignItems:'center', gap:4 }}>
              <span style={{ width:8, height:8, borderRadius:2, background:'rgba(244,63,94,0.15)', display:'inline-block' }}/> Бос емес
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

// ---- TIME PICKER ----
const HOURS = Array.from({ length: 24 }, (_, i) => i)
const MINUTES = [0, 15, 30, 45]

function isHourBlocked(hh, blockedSlots) {
  return blockedSlots.some(slot => {
    const [sh] = slot.start_time.split(':').map(Number)
    const [eh, em] = slot.end_time.split(':').map(Number)
    const slotEnd = eh * 60 + (em > 0 ? em : 0)
    return hh * 60 >= sh * 60 && hh * 60 < slotEnd
  })
}

export function TimePicker({ value, onChange, blockedSlots = [], hasError = false }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const hourRef = useRef(null)

  const [h, m] = (value || '10:00').split(':').map(Number)

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => {
    if (open && hourRef.current) {
      const btn = hourRef.current.querySelector(`[data-h="${h}"]`)
      if (btn) btn.scrollIntoView({ block:'center' })
    }
  }, [open])

  const select = (newH, newM) => {
    onChange(`${String(newH).padStart(2,'0')}:${String(newM).padStart(2,'0')}`)
  }

  return (
    <div ref={ref} style={{ position:'relative' }}>
      <button type="button" onClick={() => setOpen(v => !v)}
        style={{
          width:'100%', padding:'12px 16px', borderRadius:10, cursor:'pointer',
          background:'var(--card2)', border:`1px solid ${hasError ? 'var(--danger)' : open ? 'var(--accent)' : 'var(--border)'}`,
          color:'var(--text)', display:'flex', justifyContent:'space-between', alignItems:'center', fontSize:14,
          boxShadow: hasError ? '0 0 0 3px rgba(244,63,94,0.15)' : open ? '0 0 0 3px rgba(79,142,247,0.12)' : 'none', transition:'all 0.2s'
        }}>
        <span style={{ fontFamily:'Syne', fontWeight:600, letterSpacing:1 }}>{value || '10:00'}</span>
        <Clock size={15} color="var(--text-secondary)"/>
      </button>

      {open && (
        <div style={{
          position:'absolute', top:'calc(100% + 8px)', left:0, zIndex:9999,
          background:'var(--card)', border:'1px solid var(--border)',
          borderRadius:16, boxShadow:'0 8px 40px rgba(0,0,0,0.5)',
          padding:12, display:'flex', gap:0, overflow:'hidden', minWidth:180,
        }}>
          {/* Hours */}
          <div ref={hourRef} style={{ flex:1, maxHeight:220, overflowY:'auto', borderRight:'1px solid var(--border)' }}>
            <div style={{ fontSize:10, fontWeight:700, color:'var(--text-secondary)', textAlign:'center', padding:'6px 0', letterSpacing:1 }}>СҒТ</div>
            {HOURS.map(hh => {
              const blocked = isHourBlocked(hh, blockedSlots)
              const isSelected = hh === h
              return (
                <button key={hh} type="button" data-h={hh}
                  onClick={() => !blocked && select(hh, m)}
                  title={blocked ? 'Бос емес уақыт' : ''}
                  style={{
                    display:'block', width:'100%', padding:'7px 12px', textAlign:'center',
                    cursor: blocked ? 'not-allowed' : 'pointer',
                    border:'none', fontSize:14, fontWeight: isSelected ? 700 : 400,
                    background: isSelected ? 'var(--accent)' : blocked ? 'rgba(244,63,94,0.1)' : 'transparent',
                    color: isSelected ? 'white' : blocked ? 'var(--danger)' : 'var(--text)',
                    borderRadius:6, transition:'all 0.15s', position:'relative'
                  }}>
                  {String(hh).padStart(2,'0')}
                  {blocked && !isSelected && (
                    <span style={{position:'absolute',right:4,top:'50%',transform:'translateY(-50%)',fontSize:9,opacity:0.7}}>🔒</span>
                  )}
                </button>
              )
            })}
          </div>

          {/* Minutes */}
          <div style={{ flex:1 }}>
            <div style={{ fontSize:10, fontWeight:700, color:'var(--text-secondary)', textAlign:'center', padding:'6px 0', letterSpacing:1 }}>МИН</div>
            {MINUTES.map(mm => (
              <button key={mm} type="button"
                onClick={() => { select(h, mm); setOpen(false) }}
                style={{
                  display:'block', width:'100%', padding:'7px 12px', textAlign:'center',
                  cursor:'pointer', border:'none', fontSize:14, fontWeight: mm===m ? 700 : 400,
                  background: mm===m ? 'var(--accent)' : 'transparent',
                  color: mm===m ? 'white' : 'var(--text)', borderRadius:6, transition:'all 0.15s',
                }}>
                {String(mm).padStart(2,'0')}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
