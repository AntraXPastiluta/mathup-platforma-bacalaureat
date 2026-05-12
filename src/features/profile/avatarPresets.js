import {
  User,
  Ghost,
  Cat,
  Dog,
  Zap,
  Brain,
  Rocket,
  Star,
} from 'lucide-react'

export const AVATAR_PRESETS = [
  { id: 'user', icon: User, color: 'bg-blue-500' },
  { id: 'ghost', icon: Ghost, color: 'bg-purple-500' },
  { id: 'cat', icon: Cat, color: 'bg-orange-500' },
  { id: 'dog', icon: Dog, color: 'bg-amber-600' },
  { id: 'zap', icon: Zap, color: 'bg-yellow-500' },
  { id: 'brain', icon: Brain, color: 'bg-pink-500' },
  { id: 'rocket', icon: Rocket, color: 'bg-indigo-500' },
  { id: 'star', icon: Star, color: 'bg-emerald-500' },
]

export function getAvatarPreset(avatarId) {
  return AVATAR_PRESETS.find((preset) => preset.id === avatarId) || AVATAR_PRESETS[0]
}

export function getAvatarPhotoUrl(metadata) {
  const value = metadata?.avatar_photo_url
  return typeof value === 'string' && value.trim() ? value.trim() : null
}
