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
        <h3 className="mb-4 text-xl font-semibold text-white">Cuenta</h3>
        <Card className="space-y-3 p-4">
          <SettingItem
            icon={<User className="h-5 w-5" />}
            title="Gestionar perfiles"
            description="Crea, edita o elimina los perfiles de tu cuenta"
            onClick={onEditProfile}
            showArrow
          />
          <SettingItem
            icon={<Mail className="h-5 w-5" />}
            title="Cambiar correo electronico"
            description="Actualiza la direccion principal de acceso"
            onClick={onChangeEmail}
            showArrow
          />
          <SettingItem
            icon={<Lock className="h-5 w-5" />}
            title="Cambiar contrasena"
            description="Actualiza tu contrasena de acceso"
            onClick={onChangePassword}
            showArrow
          />
        </Card>
      </div>

      <div>
        <h3 className="mb-4 text-xl font-semibold text-white">Suscripcion y pagos</h3>
        <Card className="space-y-3 p-4">
          <SettingItem
            icon={<CreditCard className="h-5 w-5" />}
            title="Planes y suscripcion"
            description="Visualiza tu plan activo y las opciones disponibles"
            onClick={onManagePayment}
            showArrow
          />
        </Card>
      </div>

      <div>
        <h3 className="mb-4 text-xl font-semibold text-white">Privacidad y seguridad</h3>
        <Card className="space-y-3 p-4">
          <SettingItem
            icon={<Shield className="h-5 w-5" />}
            title="Configuracion de privacidad"
            description="Controla quien puede ver tu actividad"
            onClick={onPrivacySettings}
            showArrow
          />
        </Card>
      </div>

      <div>
        <h3 className="mb-4 text-xl font-semibold text-white">Zona de peligro</h3>
        <Card className="border-[var(--color-error)]/20 p-4">
          <SettingItem
            icon={<Trash2 className="h-5 w-5 text-[var(--color-error)]" />}
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
