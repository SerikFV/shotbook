import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Bar, Pie, Line } from 'react-chartjs-2'
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement,
  LineElement, PointElement, ArcElement, Title, Tooltip, Legend
} from 'chart.js'
import api from '../../services/api'
import { useAuthStore } from '../../store/authStore'
import { TrendingUp, CheckCircle, Calendar, DollarSign } from 'lucide-react'

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, ArcElement, Title, Tooltip, Legend)

const chartDefaults = {
  plugins: { legend: { labels: { color: '#A0A0A0', font: { family: 'Inter' } } } },
  scales: {
    x: { ticks: { color: '#A0A0A0' }, grid: { color: '#2A2A2A' } },
    y: { ticks: { color: '#A0A0A0' }, grid: { color: '#2A2A2A' } }
  }
}

const MONTHS_KK = ['Қаң','Ақп','Нау','Сәу','Мам','Мау','Шіл','Там','Қыр','Қаз','Қар','Жел']
const MONTHS_RU = ['Янв','Фев','Мар','Апр','Май','Июн','Июл','Авг','Сен','Окт','Ноя','Дек']

export default function AnalyticsPage() {
  const { t, i18n } = useTranslation()
  const [data, setData] = useState(null)

  useEffect(() => {
    api.get('/analytics/mobilographer').then(({ data }) => setData(data))
  }, [])

  if (!data) return <div className="empty-state fade-in">{t('loading')}</div>

  const months = i18n.language === 'kk' ? MONTHS_KK : MONTHS_RU
  const monthlyLabels = data.monthly_bookings.map(m => months[m.month - 1])
  const monthlyCounts = data.monthly_bookings.map(m => m.count)

  const statusColors = {
    new: '#3b82f6', confirmed: '#7C5CFF', shooting: '#f59e0b',
    editing: '#a855f7', completed: '#22c55e', cancelled: '#ef4444'
  }
  const statusLabels = data.status_distribution.map(s => t(`status_${s.status}`))
  const statusCounts = data.status_distribution.map(s => s.count)
  const statusBgColors = data.status_distribution.map(s => statusColors[s.status] || '#666')

  const cards = [
    { label: t('active_bookings'), value: data.active_bookings, icon: Calendar, color: '#7C5CFF' },
    { label: t('completed_projects'), value: data.completed_bookings, icon: CheckCircle, color: '#22c55e' },
    { label: t('total_revenue'), value: `${data.total_revenue?.toLocaleString() || 0} ₸`, icon: TrendingUp, color: '#f59e0b' },
    { label: t('bookings'), value: data.total_bookings, icon: Calendar, color: '#3b82f6' },
  ]

  return (
    <div className="fade-in" style={{display:'flex',flexDirection:'column',gap:24}}>
      <h1 style={{fontSize:24,fontWeight:700}}>{t('analytics')}</h1>

      <div className="stats-grid">
        {cards.map((c, i) => (
          <div key={i} className="card" style={{display:'flex',flexDirection:'column',gap:12}}>
            <div style={{width:44,height:44,borderRadius:12,background:`${c.color}20`,display:'flex',alignItems:'center',justifyContent:'center'}}>
              <c.icon size={22} color={c.color}/>
            </div>
            <div style={{fontFamily:'Syne',fontSize:28,fontWeight:700}}>{c.value}</div>
            <div style={{color:'var(--text-secondary)',fontSize:13}}>{c.label}</div>
          </div>
        ))}
      </div>

      <div className="grid-2">
        <div className="card">
          <h3 style={{marginBottom:20}}>{t('monthly_bookings')}</h3>
          <Bar
            data={{
              labels: monthlyLabels,
              datasets: [{
                label: t('bookings'),
                data: monthlyCounts,
                backgroundColor: 'rgba(124,92,255,0.7)',
                borderRadius: 6,
              }]
            }}
            options={chartDefaults}
          />
        </div>

        <div className="card">
          <h3 style={{marginBottom:20}}>{t('status_distribution')}</h3>
          {statusCounts.length === 0 ? (
            <div className="empty-state">{t('no_data')}</div>
          ) : (
            <Pie
              data={{
                labels: statusLabels,
                datasets: [{
                  data: statusCounts,
                  backgroundColor: statusBgColors,
                  borderWidth: 0,
                }]
              }}
              options={{ plugins: { legend: { labels: { color: '#A0A0A0' } } } }}
            />
          )}
        </div>
      </div>

      <div className="card">
        <h3 style={{marginBottom:20}}>{t('activity_chart')}</h3>
        <Line
          data={{
            labels: monthlyLabels,
            datasets: [{
              label: t('monthly_bookings'),
              data: monthlyCounts,
              borderColor: '#7C5CFF',
              backgroundColor: 'rgba(124,92,255,0.1)',
              fill: true,
              tension: 0.4,
              pointBackgroundColor: '#7C5CFF',
            }]
          }}
          options={chartDefaults}
        />
      </div>
    </div>
  )
}
