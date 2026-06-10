import { Info, ShieldCheck, UserCog, Users } from 'lucide-react'
import { ScrollReveal } from '@/components/atoms'

const USER_FEATURES = [
  {
    title: 'Revision de cuentas',
    description:
      'Esta vista queda lista para conectar listados, filtros y detalles de usuarios cuando el backend exponga esos endpoints.',
    icon: <Users size={18} strokeWidth={1.75} />,
  },
  {
    title: 'Roles y permisos',
    description:
      'Aqui podremos administrar cuentas administrativas o revisar permisos especiales sin mezclarlo con el flujo del usuario final.',
    icon: <ShieldCheck size={18} strokeWidth={1.75} />,
  },
  {
    title: 'Soporte operativo',
    description:
      'Tambien es el punto natural para acciones como suspender cuentas, revisar actividad o dar seguimiento a incidencias.',
    icon: <UserCog size={18} strokeWidth={1.75} />,
  },
]

export function AdminUsersPage() {
  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8 max-w-6xl mx-auto">
      <ScrollReveal variant="fade-up">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-[var(--color-primary)]/15 border border-[var(--color-primary)]/25 flex items-center justify-center">
            <Users size={20} className="text-[var(--color-denim-300)]" strokeWidth={1.5} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">Gestion de usuarios</h2>
            <p className="text-sm text-[var(--color-denim-400)] mt-0.5">
              Vista base conectada al flujo administrativo para continuar la expansion del panel.
            </p>
          </div>
        </div>
      </ScrollReveal>

      <ScrollReveal variant="fade-up" delay={40}>
        <div className="rounded-2xl border border-[var(--color-primary)]/20 bg-[var(--color-primary)]/10 p-5 mb-8">
          <div className="flex items-start gap-3">
            <Info size={18} className="text-[var(--color-denim-300)] shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-white">Conexion de flujo completada</p>
              <p className="text-sm text-[var(--color-denim-300)] mt-1">
                La ruta ya existe y esta protegida por rol. Lo que falta ahora es conectar esta vista con endpoints
                administrativos reales del backend para consulta y mantenimiento de cuentas.
              </p>
            </div>
          </div>
        </div>
      </ScrollReveal>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {USER_FEATURES.map((feature, index) => (
          <ScrollReveal key={feature.title} variant="fade-up" delay={80 + index * 40}>
            <section className="rounded-2xl border border-white/[0.07] bg-[#0a0f1c] p-6 h-full">
              <div className="w-11 h-11 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-[var(--color-denim-300)] mb-4">
                {feature.icon}
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
              <p className="text-sm text-[var(--color-denim-400)]">{feature.description}</p>
            </section>
          </ScrollReveal>
        ))}
      </div>
    </div>
  )
}
