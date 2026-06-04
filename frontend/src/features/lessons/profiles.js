export const PROFILE_KEYS = {
  MATE_INFO: 'mate_info',
  TEHNOLOGIC: 'tehnologic',
  STIINTELE_NATURII: 'stiintele_naturii',
  PEDAGOGIC: 'pedagogic',
}

export const PROFILES = [
  {
    key: PROFILE_KEYS.MATE_INFO,
    label: 'Mate-Info',
    shortLabel: 'M1',
    description: 'Real, intensiv informatica - programa M1',
  },
  {
    key: PROFILE_KEYS.TEHNOLOGIC,
    label: 'Tehnologic',
    shortLabel: 'M3',
    description: 'Filiera tehnologica - programa M3',
  },
  {
    key: PROFILE_KEYS.STIINTELE_NATURII,
    label: 'Stiintele Naturii',
    shortLabel: 'M2',
    description: 'Real, stiintele naturii - programa M2',
  },
  {
    key: PROFILE_KEYS.PEDAGOGIC,
    label: 'Pedagogic',
    shortLabel: 'M4',
    description: 'Filiera vocationala, profil pedagogic - programa M4',
  },
]

export const DEFAULT_PROFILE = PROFILE_KEYS.MATE_INFO

export function getProfileMeta(profileKey) {
  return PROFILES.find((profile) => profile.key === profileKey) || PROFILES[0]
}

// Mapează un cod de programă (M1–M4, ex. din URL-ul /programa/:cod) la cheia de profil
// folosită la înregistrare. Acceptă atât „m1" cât și „M1". Întoarce null dacă nu există.
export function getProfileKeyByProgramCode(code) {
  if (!code) return null
  const normalized = String(code).trim().toUpperCase()
  const match = PROFILES.find((profile) => profile.shortLabel.toUpperCase() === normalized)
  return match ? match.key : null
}

export const SUBJECT_PARTS = [
  { value: 1, label: 'Subiectul I',  roman: 'I'  },
  { value: 2, label: 'Subiectul II', roman: 'II' },
  { value: 3, label: 'Subiectul III', roman: 'III' },
]
