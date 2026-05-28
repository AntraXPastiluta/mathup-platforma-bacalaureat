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
    shortLabel: 'M2',
    description: 'Filiera tehnologica - programa M2',
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
    shortLabel: 'M3',
    description: 'Filiera vocationala, profil pedagogic - programa M3',
  },
]

export const DEFAULT_PROFILE = PROFILE_KEYS.MATE_INFO

export function getProfileMeta(profileKey) {
  return PROFILES.find((profile) => profile.key === profileKey) || PROFILES[0]
}

export const SUBJECT_PARTS = [
  { value: 1, label: 'Subiectul I',  roman: 'I'  },
  { value: 2, label: 'Subiectul II', roman: 'II' },
  { value: 3, label: 'Subiectul III', roman: 'III' },
]
