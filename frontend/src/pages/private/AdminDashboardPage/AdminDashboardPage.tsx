import { useNavigate } from 'react-router-dom'
import {
  Film,
  Tv2,
  Users,
  TrendingUp,
  Eye,
  Upload,
  Star,
  Clock,
  ArrowUpRight,
  PlayCircle,
} from 'lucide-react'
import { ScrollReveal, Button } from '@/components/atoms'
import dashboardSvg from '@/assets/Admin/dashboard.svg'

interface StatCard {
  label: string
  value: string
  change: string
  positive: boolean
  icon: React.ReactNode
  color: string
}

interface RecentItem {
  title: string
  type: 'Película' | 'Serie'
  date: string
  status: 'Publicado' | 'Borrador' | 'En revisión'
}

const STATS: StatCard[] = [
  {
    label: 'Total películas',
    value: '248',
    change: '+12 este mes',
    positive: true,
    icon: <Film size={20} strokeWidth={1.5} />,
    color: 'from-[var(--color-denim-700)] to-[var(--color-denim-900)]',
  },
  {
    label: 'Total series',
    value: '89',
    change: '+5 este mes',
    positive: true,
    icon: <Tv2 size={20} strokeWidth={1.5} />,
    color: 'from-[#1a3a5c] to-[#0d1f35]',
  },
  {
    label: 'Usuarios activos',
    value: '14,832',
    change: '+3.2% esta semana',
    positive: true,
    icon: <Users size={20} strokeWidth={1.5} />,
    color: 'from-[#1e3a2f] to-[#0d1f1a]',
  },
  {
    label: 'Reproducciones hoy',
    value: '9,410',
    change: '-1.8% vs ayer',
    positive: false,
    icon: <Eye size={20} strokeWidth={1.5} />,
    color: 'from-[#3a1e1e] to-[#1f0d0d]',
  },
]

const RECENT: RecentItem[] = [
  { title: 'El Último Horizonte', type: 'Película',  date: 'Hoy, 10:32',   status: 'Publicado'   },
  { title: 'Código Rojo',         type: 'Serie',     date: 'Hoy, 08:15',   status: 'En revisión' },
  { title: 'Sombras del Olvido',  type: 'Película',  date: 'Ayer, 22:47',  status: 'Publicado'   },
  { title: 'Mundos Paralelos',    type: 'Serie',     date: 'Ayer, 18:03',  status: 'Borrador'    },
  { title: 'Cazadores de Sombras',type: 'Película',  date: '06 jun, 14:20',status: 'Publicado'   },
]

const STATUS_STYLES: Record<RecentItem['status'], string> = {
  'Publicado':   'bg-[var(--color-success)]/15 text-[var(--color-success)]',
  'En revisión': 'bg-[var(--color-warning)]/15 text-[var(--color-warning)]',
  'Borrador':    'bg-white/[0.07] text-[var(--color-denim-400)]',
}

const TOP_CONTENT = [
  { title: 'El Detective',       views: '32,840', rating: 8.5, type: 'Película' },
  { title: 'Mundos Paralelos',   views: '28,190', rating: 8.1, type: 'Serie'    },
  { title: 'Cazadores',          views: '24,530', rating: 8.3, type: 'Serie'    },
  { title: 'Amor en París',      views: '21,760', rating: 7.3, type: 'Película' },
]

export function AdminDashboardPage() {
  const navigate = useNavigate()

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8 max-w-7xl mx-auto">

      <ScrollReveal variant="fade-up">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h2 className="text-2xl font-bold text-white">Bienvenido de nuevo</h2>
            <p className="text-sm text-[var(--color-denim-400)] mt-0.5">
              Gestiona el contenido de la plataforma desde aquí.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => navigate('/admin/upload/series')}>
              <Tv2 size={14} />
              Nueva serie
            </Button>
            <Button size="sm" onClick={() => navigate('/admin/upload/movie')}>
              <Film size={14} />
              Nueva película
            </Button>
          </div>
        </div>
      </ScrollReveal>

      <ScrollReveal variant="fade-up" delay={60}>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
          {STATS.map((stat) => (
            <div
              key={stat.label}
              className="relative rounded-xl border border-white/[0.07] bg-[#0a0f1c] p-5 overflow-hidden group hover:border-white/[0.12] transition-colors duration-200"
            >
              <div className={`absolute top-0 right-0 w-24 h-24 rounded-bl-full bg-gradient-to-br ${stat.color} opacity-25`} />
              <div className="relative z-10">
                <div className="flex items-start justify-between mb-3">
                  <span className="text-[var(--color-denim-500)]">{stat.icon}</span>
                  <ArrowUpRight size={14} className="text-[var(--color-denim-700)] group-hover:text-[var(--color-denim-400)] transition-colors" />
                </div>
                <p className="text-2xl font-bold text-white">{stat.value}</p>
                <p className="text-xs text-[var(--color-denim-400)] mt-0.5">{stat.label}</p>
                <p className={`text-xs mt-2 font-medium ${stat.positive ? 'text-[var(--color-success)]' : 'text-[var(--color-error)]'}`}>
                  {stat.change}
                </p>
              </div>
            </div>
          ))}
        </div>
      </ScrollReveal>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-8">

        <ScrollReveal variant="fade-up" delay={100} className="xl:col-span-2">
          <div className="rounded-xl border border-white/[0.07] bg-[#0a0f1c] overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
              <div className="flex items-center gap-2">
                <Clock size={15} className="text-[var(--color-denim-500)]" />
                <h3 className="text-sm font-semibold text-white">Contenido reciente</h3>
              </div>
              <button className="text-xs text-[var(--color-denim-400)] hover:text-white transition-colors">
                Ver todo
              </button>
            </div>
            <div className="divide-y divide-white/[0.04]">
              {RECENT.map((item) => (
                <div key={item.title} className="flex items-center gap-4 px-5 py-3.5 hover:bg-white/[0.02] transition-colors">
                  <div className="w-8 h-8 rounded-lg bg-[var(--color-denim-900)]/60 flex items-center justify-center shrink-0">
                    {item.type === 'Película'
                      ? <Film size={14} className="text-[var(--color-denim-400)]" />
                      : <Tv2 size={14} className="text-[var(--color-denim-400)]" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{item.title}</p>
                    <p className="text-xs text-[var(--color-denim-500)]">{item.type} · {item.date}</p>
                  </div>
                  <span className={`shrink-0 text-[11px] font-medium px-2.5 py-1 rounded-full ${STATUS_STYLES[item.status]}`}>
                    {item.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </ScrollReveal>

        <ScrollReveal variant="fade-up" delay={140}>
          <div className="rounded-xl border border-white/[0.07] bg-[#0a0f1c] overflow-hidden h-full flex flex-col">
            <div className="flex items-center gap-2 px-5 py-4 border-b border-white/[0.06]">
              <TrendingUp size={15} className="text-[var(--color-denim-500)]" />
              <h3 className="text-sm font-semibold text-white">Top contenido</h3>
            </div>
            <div className="flex-1 divide-y divide-white/[0.04]">
              {TOP_CONTENT.map((item, i) => (
                <div key={item.title} className="flex items-center gap-3 px-5 py-3.5">
                  <span className="text-xs font-bold text-[var(--color-denim-700)] w-4 text-center shrink-0">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{item.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="flex items-center gap-1 text-[11px] text-[var(--color-denim-400)]">
                        <PlayCircle size={11} />
                        {item.views}
                      </span>
                      <span className="flex items-center gap-1 text-[11px] text-[var(--color-warning)]">
                        <Star size={10} fill="currentColor" />
                        {item.rating}
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] text-[var(--color-denim-600)] shrink-0">{item.type}</span>
                </div>
              ))}
            </div>
          </div>
        </ScrollReveal>
      </div>

      <ScrollReveal variant="fade-up" delay={180}>
        <div className="rounded-xl border border-white/[0.07] bg-[#0a0f1c] overflow-hidden">
          <div className="flex flex-col md:flex-row items-center gap-6 px-6 py-6">
            <div className="flex-1">
              <p className="text-xs font-semibold uppercase tracking-widest text-[var(--color-denim-500)] mb-1">
                Acciones rápidas
              </p>
              <h3 className="text-xl font-bold text-white mb-2">Agrega nuevo contenido</h3>
              <p className="text-sm text-[var(--color-denim-400)] mb-5 max-w-md">
                Sube películas o series al catálogo. Completa el formulario con metadatos, géneros, reparto y el archivo multimedia.
              </p>
              <div className="flex flex-wrap gap-3">
                <Button onClick={() => navigate('/admin/upload/movie')}>
                  <Upload size={15} />
                  Subir película
                </Button>
                <Button variant="outline" onClick={() => navigate('/admin/upload/series')}>
                  <Upload size={15} />
                  Subir serie
                </Button>
              </div>
            </div>
            <div className="w-full md:w-72 shrink-0 opacity-80">
              <img src={dashboardSvg} alt="Dashboard illustration" className="w-full h-auto" />
            </div>
          </div>
        </div>
      </ScrollReveal>

    </div>
  )
}
