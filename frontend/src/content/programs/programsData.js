// Conținutul programelor de Bacalaureat la matematică, pe profiluri (M1–M4).
// Sursă: Programa de examen pentru disciplina Matematică — Bacalaureat
// (Anexa nr. 2 la OME nr. 3237/05.02.2021). Pentru fiecare profil sunt listate
// capitolele majore pe clasă (IX–XII), conform coloanei „Conținuturi" din programă.
// Date pure, fără rețea — folosite de pagina publică /programa/:cod și de WelcomePage.

export const PROGRAMS = [
  {
    code: 'M1',
    slug: 'm1',
    name: 'Matematică-Informatică',
    filiera: 'Filiera teoretică, profilul real',
    hours: '4 ore / săptămână (clasele IX–XII)',
    description:
      'Profilul real, varianta extinsă — algebră, analiză și combinatorică.',
    years: [
      {
        grade: 'Clasa a IX-a',
        hours: '4 ore/săpt.',
        chapters: [
          'Mulțimi și elemente de logică matematică',
          'Șiruri și progresii (aritmetice, geometrice)',
          'Funcții; lecturi grafice',
          'Funcția de gradul I și funcția de gradul al II-lea',
          'Vectori în plan',
          'Trigonometrie și aplicații în geometrie',
        ],
      },
      {
        grade: 'Clasa a X-a',
        hours: '4 ore/săpt.',
        chapters: [
          'Mulțimi de numere (radicali, logaritmi, numere complexe)',
          'Funcții și ecuații (putere, exponențială, logaritmică, trigonometrice)',
          'Metode de numărare (combinatorică, binomul lui Newton)',
          'Matematici financiare, statistică și probabilități',
          'Geometrie analitică',
        ],
      },
      {
        grade: 'Clasa a XI-a',
        hours: '4 ore/săpt.',
        chapters: [
          'Elemente de calcul matriceal (matrice, determinanți)',
          'Sisteme de ecuații liniare',
          'Limite de funcții și continuitate',
          'Derivabilitate și studiul funcțiilor',
          'Reprezentarea grafică a funcțiilor',
        ],
      },
      {
        grade: 'Clasa a XII-a',
        hours: '4 ore/săpt.',
        chapters: [
          'Elemente de algebră (grupuri, inele și corpuri)',
          'Primitive (integrala nedefinită)',
          'Integrala definită și aplicații',
        ],
      },
    ],
  },
  {
    code: 'M2',
    slug: 'm2',
    name: 'Științele Naturii',
    filiera: 'Filiera teoretică, profilul real',
    hours: '4 ore / săptămână (IX–X) · 3 ore / săptămână (XI–XII)',
    description:
      'Profil real, adaptat științelor naturii — esențialul programei, riguros explicat.',
    years: [
      {
        grade: 'Clasa a IX-a',
        hours: '4 ore/săpt.',
        chapters: [
          'Mulțimi și elemente de logică matematică',
          'Șiruri și progresii (aritmetice, geometrice)',
          'Funcții; lecturi grafice',
          'Funcția de gradul I și funcția de gradul al II-lea',
          'Vectori în plan',
          'Trigonometrie și aplicații în geometrie',
        ],
      },
      {
        grade: 'Clasa a X-a',
        hours: '4 ore/săpt.',
        chapters: [
          'Mulțimi de numere (radicali, logaritmi, numere complexe)',
          'Funcții și ecuații (putere, exponențială, logaritmică, trigonometrice)',
          'Metode de numărare (combinatorică, binomul lui Newton)',
          'Matematici financiare, statistică și probabilități',
          'Geometrie analitică',
        ],
      },
      {
        grade: 'Clasa a XI-a',
        hours: '3 ore/săpt.',
        chapters: [
          'Elemente de calcul matriceal (matrice, determinanți de ordin ≤ 3)',
          'Sisteme de ecuații liniare (metoda Cramer)',
          'Limite de funcții',
          'Funcții continue',
          'Funcții derivabile și studiul funcțiilor',
        ],
      },
      {
        grade: 'Clasa a XII-a',
        hours: '3 ore/săpt.',
        chapters: [
          'Elemente de algebră (grupuri, inele și corpuri)',
          'Primitive (integrala nedefinită)',
          'Integrala definită',
        ],
      },
    ],
  },
  {
    code: 'M3',
    slug: 'm3',
    name: 'Tehnologic',
    filiera: 'Filiera tehnologică (servicii, resurse naturale, tehnic)',
    hours: '3 ore / săptămână (clasele IX–XII)',
    description:
      'Programa profilului tehnologic, distilată în pași clari și aplicați.',
    years: [
      {
        grade: 'Clasa a IX-a',
        hours: '3 ore/săpt.',
        chapters: [
          'Mulțimi și elemente de logică matematică',
          'Șiruri și progresii (aritmetice, geometrice)',
          'Funcții; lecturi grafice',
          'Funcția de gradul I și funcția de gradul al II-lea',
          'Vectori în plan',
          'Trigonometrie și aplicații în geometrie',
        ],
      },
      {
        grade: 'Clasa a X-a',
        hours: '3 ore/săpt.',
        chapters: [
          'Mulțimi de numere (radicali, logaritmi, numere complexe)',
          'Funcții și ecuații (putere, exponențială, logaritmică)',
          'Metode de numărare (combinatorică)',
          'Matematici financiare, statistică și probabilități',
          'Geometrie analitică',
        ],
      },
      {
        grade: 'Clasa a XI-a',
        hours: '3 ore/săpt.',
        chapters: [
          'Elemente de calcul matriceal (matrice, determinanți)',
          'Sisteme de ecuații liniare (metoda Cramer)',
          'Limite de funcții',
          'Funcții continue',
          'Funcții derivabile și studiul funcțiilor',
        ],
      },
      {
        grade: 'Clasa a XII-a',
        hours: '3 ore/săpt.',
        chapters: [
          'Elemente de algebră (grupuri, inele și corpuri)',
          'Primitive (integrala nedefinită)',
          'Integrala definită',
        ],
      },
    ],
  },
  {
    code: 'M4',
    slug: 'm4',
    name: 'Pedagogic',
    filiera: 'Filiera vocațională, profilul pedagogic (învățător-educatoare)',
    hours: '2 ore / săptămână (IX–X) · 2 ore / săptămână (XI–XII)',
    description:
      'Programa profilului pedagogic, explicată în cel mai accesibil mod, fiind un profil vocațional.',
    years: [
      {
        grade: 'Clasa a IX-a',
        hours: '2 ore/săpt.',
        chapters: [
          'Mulțimi și elemente de logică matematică',
          'Șiruri și progresii (aritmetice, geometrice)',
          'Funcții; lecturi grafice',
          'Funcția de gradul I și funcția de gradul al II-lea',
          'Vectori în plan și calcul vectorial în geometrie',
          'Aplicații ale trigonometriei în geometrie',
        ],
      },
      {
        grade: 'Clasa a X-a',
        hours: '2 ore/săpt.',
        chapters: [
          'Numere reale (puteri, radicali, logaritmi)',
          'Funcții și ecuații (putere, radical, exponențială, logaritmică)',
          'Matematici financiare (numărare, procente, statistică, probabilități)',
          'Geometrie analitică',
        ],
      },
      {
        grade: 'Clasa a XI-a',
        hours: '2 ore/săpt.',
        chapters: [
          'Structuri algebrice (legi de compoziție; monoid, grup, inel, corp)',
        ],
      },
      {
        grade: 'Clasa a XII-a',
        hours: '2 ore/săpt.',
        chapters: [
          'Elemente de calcul matriceal (matrice, determinanți)',
          'Sisteme de ecuații liniare (metoda Cramer)',
        ],
      },
    ],
  },
]

export function getProgramBySlug(slug) {
  return PROGRAMS.find((program) => program.slug === String(slug ?? '').toLowerCase())
}
