import { User } from 'lucide-react'
import { getAvatarPhotoUrl, getAvatarPreset } from '../../features/profile/avatarPresets'

const SIZE_CLASSES = {
  sm: 'size-9',
  md: 'size-10',
  lg: 'size-32',
}

const ICON_SIZE_CLASSES = {
  sm: 'size-4',
  md: 'size-5',
  lg: 'size-16',
}

export function UserAvatar({
  metadata,
  avatarId,
  size = 'md',
  className = '',
  imageClassName = '',
  fallbackClassName = '',
}) {
  const photoUrl = getAvatarPhotoUrl(metadata)
  const preset = getAvatarPreset(avatarId || metadata?.avatar_id)
  const Icon = preset.icon || User
  const sizeClass = SIZE_CLASSES[size] || SIZE_CLASSES.md

  if (photoUrl) {
    return (
      <img
        src={photoUrl}
        alt="Fotografie profil"
        className={`${sizeClass} object-cover ${imageClassName || 'rounded-full'} ${className}`.trim()}
      />
    )
  }

  return (
    <div
      className={`${sizeClass} flex items-center justify-center text-white ${preset.color} ${fallbackClassName || 'rounded-full'} ${className}`.trim()}
    >
      <Icon className={ICON_SIZE_CLASSES[size] || ICON_SIZE_CLASSES.md} />
    </div>
  )
}
