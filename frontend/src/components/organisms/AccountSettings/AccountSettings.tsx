import { User, Mail, Lock, CreditCard, Shield, Trash2 } from 'lucide-react'
import { Card, Button } from '@/components/atoms'
import { SettingItem } from '@/components/molecules'

interface AccountSettingsProps {
  onEditProfile?: () => void
  onChangeEmail?: () => void
  onChangePassword?: () => void
  onManagePayment?: () => void
  onPrivacySettings?: () => void
  onDeleteAccount?: () => void
}

export function AccountSettings({
  onEditProfile,
  onChangeEmail,
  onChangePassword,
  onManagePayment,
  onPrivacySettings,
  onDeleteAccount,
}: AccountSettingsProps) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-semibold text-white mb-4">Cuenta</h3>
        <Card className="p-4 space-y-3">
          <SettingItem
            icon={<User className="w-5 h-5" />}
            title="Editar perfil"
            description="Actualiza tu nombre y foto de perfil"
            onClick={onEditProfile}
            showArrow
          />
          <SettingItem
            icon={<Mail className="w-5 h-5" />}
            title="Cambiar correo electrónico"
            description="Actualiza tu dirección de correo"
            onClick={onChangeEmail}
            showArrow
          />
          <SettingItem
            icon={<Lock className="w-5 h-5" />}
            title="Cambiar contraseña"
            description="Actualiza tu contraseña de acceso"
            onClick={onChangePassword}
            showArrow
          />
        </Card>
      </div>

      <div>
        <h3 className="text-xl font-semibold text-white mb-4">Suscripción y pagos</h3>
        <Card className="p-4 space-y-3">
          <SettingItem
            icon={<CreditCard className="w-5 h-5" />}
            title="Métodos de pago"
            description="Administra tus tarjetas y métodos de pago"
            onClick={onManagePayment}
            showArrow
          />
        </Card>
      </div>

      <div>
        <h3 className="text-xl font-semibold text-white mb-4">Privacidad y seguridad</h3>
        <Card className="p-4 space-y-3">
          <SettingItem
            icon={<Shield className="w-5 h-5" />}
            title="Configuración de privacidad"
            description="Controla quién puede ver tu actividad"
            onClick={onPrivacySettings}
            showArrow
          />
        </Card>
      </div>

      <div>
        <h3 className="text-xl font-semibold text-white mb-4">Zona de peligro</h3>
        <Card className="p-4 border-[var(--color-error)]/20">
          <SettingItem
            icon={<Trash2 className="w-5 h-5 text-[var(--color-error)]" />}
            title="Eliminar cuenta"
            description="Elimina permanentemente tu cuenta y todos tus datos"
            action={
              <Button
                variant="outline"
                size="sm"
                onClick={onDeleteAccount}
                className="!border-[var(--color-error)] !text-[var(--color-error)] hover:!bg-[var(--color-error)]/10"
              >
                Eliminar
              </Button>
            }
          />
        </Card>
      </div>
    </div>
  )
}
