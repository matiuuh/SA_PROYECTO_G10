import { useState } from 'react'
import { Settings, User, Sliders } from 'lucide-react'
import { AccountSettings, PreferencesSettings } from '@/components/organisms'

type SettingsTab = 'account' | 'preferences'

export function UserSettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('account')

  const handleEditProfile = () => {
    console.log('Editar perfil')
  }

  const handleChangeEmail = () => {
    console.log('Cambiar email')
  }

  const handleChangePassword = () => {
    console.log('Cambiar contraseña')
  }

  const handleManagePayment = () => {
    console.log('Administrar pagos')
  }

  const handlePrivacySettings = () => {
    console.log('Configuración de privacidad')
  }

  const handleDeleteAccount = () => {
    console.log('Eliminar cuenta')
  }

  return (
    <div className="min-h-screen bg-[#080c14] py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8 flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-denim-800)] flex items-center justify-center">
            <Settings className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">Configuración</h1>
            <p className="text-[var(--color-denim-400)]">
              Administra tu cuenta y preferencias
            </p>
          </div>
        </div>

        <div className="flex gap-6">
          <aside className="w-64 flex-shrink-0">
            <nav className="space-y-2">
              <button
                onClick={() => setActiveTab('account')}
                className={`
                  w-full flex items-center gap-3 px-4 py-3 rounded-lg
                  transition-all duration-200
                  ${
                    activeTab === 'account'
                      ? 'bg-[var(--color-primary)] text-white'
                      : 'text-[var(--color-denim-300)] hover:bg-white/[0.05] hover:text-white'
                  }
                `}
              >
                <User className="w-5 h-5" />
                <span className="font-medium">Cuenta</span>
              </button>

              <button
                onClick={() => setActiveTab('preferences')}
                className={`
                  w-full flex items-center gap-3 px-4 py-3 rounded-lg
                  transition-all duration-200
                  ${
                    activeTab === 'preferences'
                      ? 'bg-[var(--color-primary)] text-white'
                      : 'text-[var(--color-denim-300)] hover:bg-white/[0.05] hover:text-white'
                  }
                `}
              >
                <Sliders className="w-5 h-5" />
                <span className="font-medium">Preferencias</span>
              </button>
            </nav>
          </aside>

          <main className="flex-1">
            {activeTab === 'account' && (
              <AccountSettings
                onEditProfile={handleEditProfile}
                onChangeEmail={handleChangeEmail}
                onChangePassword={handleChangePassword}
                onManagePayment={handleManagePayment}
                onPrivacySettings={handlePrivacySettings}
                onDeleteAccount={handleDeleteAccount}
              />
            )}

            {activeTab === 'preferences' && <PreferencesSettings />}
          </main>
        </div>
      </div>
    </div>
  )
}
