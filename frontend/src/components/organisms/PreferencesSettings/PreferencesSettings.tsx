import { useState } from 'react'
import { Globe, Bell, Monitor, Volume2, Subtitles } from 'lucide-react'
import { Card, Switch, Select, type SelectOption } from '@/components/atoms'
import { SettingItem } from '@/components/molecules'

const languageOptions: SelectOption[] = [
  { value: 'es', label: 'Español' },
  { value: 'en', label: 'English' },
  { value: 'fr', label: 'Français' },
  { value: 'pt', label: 'Português' },
]

const qualityOptions: SelectOption[] = [
  { value: 'auto', label: 'Automática' },
  { value: '4k', label: '4K Ultra HD' },
  { value: '1080p', label: 'Full HD (1080p)' },
  { value: '720p', label: 'HD (720p)' },
  { value: '480p', label: 'SD (480p)' },
]

const subtitleOptions: SelectOption[] = [
  { value: 'off', label: 'Desactivados' },
  { value: 'es', label: 'Español' },
  { value: 'en', label: 'English' },
  { value: 'fr', label: 'Français' },
]

export function PreferencesSettings() {
  const [notifications, setNotifications] = useState(true)
  const [autoplay, setAutoplay] = useState(true)
  const [language, setLanguage] = useState('es')
  const [quality, setQuality] = useState('auto')
  const [subtitles, setSubtitles] = useState('off')

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-semibold text-white mb-4">Idioma y región</h3>
        <Card className="p-4 space-y-3">
          <SettingItem
            icon={<Globe className="w-5 h-5" />}
            title="Idioma de la aplicación"
            description="Selecciona el idioma de la interfaz"
            action={
              <Select
                options={languageOptions}
                value={language}
                onChange={setLanguage}
                className="w-48"
              />
            }
          />
        </Card>
      </div>

      <div>
        <h3 className="text-xl font-semibold text-white mb-4">Notificaciones</h3>
        <Card className="p-4 space-y-3">
          <SettingItem
            icon={<Bell className="w-5 h-5" />}
            title="Notificaciones push"
            description="Recibe notificaciones sobre nuevos contenidos"
            action={<Switch checked={notifications} onChange={setNotifications} />}
          />
        </Card>
      </div>

      <div>
        <h3 className="text-xl font-semibold text-white mb-4">Reproducción</h3>
        <Card className="p-4 space-y-3">
          <SettingItem
            icon={<Monitor className="w-5 h-5" />}
            title="Reproducción automática"
            description="Reproduce automáticamente el siguiente episodio"
            action={<Switch checked={autoplay} onChange={setAutoplay} />}
          />
          <SettingItem
            icon={<Volume2 className="w-5 h-5" />}
            title="Calidad de video"
            description="Ajusta la calidad de reproducción"
            action={
              <Select options={qualityOptions} value={quality} onChange={setQuality} className="w-48" />
            }
          />
          <SettingItem
            icon={<Subtitles className="w-5 h-5" />}
            title="Subtítulos"
            description="Configura el idioma de los subtítulos"
            action={
              <Select
                options={subtitleOptions}
                value={subtitles}
                onChange={setSubtitles}
                className="w-48"
              />
            }
          />
        </Card>
      </div>
    </div>
  )
}
