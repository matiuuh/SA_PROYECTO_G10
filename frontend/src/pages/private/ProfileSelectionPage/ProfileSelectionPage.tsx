import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ProfileSelector, type Profile } from '@/components/organisms'
import { colorVariants } from '@/components/atoms'

const mockProfiles: Profile[] = [
  {
    id: '1',
    name: 'María',
    color: colorVariants[0],
  },
  {
    id: '2',
    name: 'Juan',
    color: colorVariants[1],
  },
  {
    id: '3',
    name: 'Sofía',
    color: colorVariants[2],
  },
  {
    id: '4',
    name: 'Niños',
    color: colorVariants[3],
    isKids: true,
  },
]

export function ProfileSelectionPage() {
  const navigate = useNavigate()
  const [profiles] = useState<Profile[]>(mockProfiles)

  const handleSelectProfile = (profileId: string) => {
    console.log('Perfil seleccionado:', profileId)
    navigate('/dashboard')
  }

  const handleAddProfile = () => {
    console.log('Agregar nuevo perfil')
  }

  const handleEditProfile = (profileId: string) => {
    console.log('Editar perfil:', profileId)
  }

  return (
    <div className="min-h-screen bg-[#080c14] flex items-center justify-center">
      <ProfileSelector
        profiles={profiles}
        maxProfiles={5}
        onSelectProfile={handleSelectProfile}
        onAddProfile={handleAddProfile}
        onEditProfile={handleEditProfile}
      />
    </div>
  )
}
