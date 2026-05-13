# ScholarBAC

Platformă web de pregătire pentru examenul de Bacalaureat la matematică, orientată pe programele liceale (M1, M2, M3), lecții structurate pe subiecte de examen, quiz-uri, progres personal și funcții Premium (roadmap, variante rezolvate, raport față de nota țintă).

**Producție:** [https://scholar-bac.vercel.app](https://scholar-bac.vercel.app)

## Cuprins

- [Prezentare generală](#prezentare-generală)
- [Funcționalități principale](#funcționalități-principale)
- [Cont gratuit vs Premium](#cont-gratuit-vs-premium)
- [Panou de administrare](#panou-de-administrare)
- [Tehnologii](#tehnologii)
- [Structura proiectului](#structura-proiectului)
- [Rute aplicație](#rute-aplicație)
- [Configurare locală](#configurare-locală)
- [Build și deploy](#build-și-deploy)
- [Supabase și backend](#supabase-și-backend)
- [Scripturi npm](#scripturi-npm)

## Prezentare generală

ScholarBAC este o aplicație **React** (Vite) cu autentificare și date în **Supabase**. Elevii își aleg programul la înregistrare, parcurg lecții pe Subiectul I, II și III, răspund la chestionare și își urmăresc progresul pe dashboard. Contul **Premium** (Stripe) extinde accesul la roadmap-ul publicat de profesor, la variante rezolvate și la raportul de pregătire legat de nota țintă din profil.

Profesorii de curriculum gestionează lecțiile, fișierele, quiz-urile, roadmap-urile și variante rezolvate la nivel de program; accesul la panoul de control care gestioneaza lista de emailuri din baza de date.

## Funcționalități principale

### Autentificare și profil

- Înregistrare, autentificare
- Profil: nume, program(e) liceal(e).

### Dashboard elev

- Rezumat progres (capitole finalizate, procent general).
- Mesaje de performanță adaptate numărului de capitole parcurse.
- Lecții grupate pe program și pe subiecte de examen (I, II, III).
- Acces la lecții conform programului înregistrat; pentru alte programe se propune upgrade Premium.
- **Premium:** secțiune roadmap, variante rezolvate, **Raport Premium** (notă țintă, greșeli la quiz, medie quiz, estimare realizabilitate).

### Lecții și quiz-uri

- Conținut pe secțiuni (părți de lecție), cu suport pentru imagini la secțiuni și la întrebări.
- Materiale suplimentare (fișiere) per lecție.
- Chestionare la final de secțiune sau la finalul lecției; feedback imediat la răspuns.
- Finalizare lecție și salvare progres/scor doar când există conținut publicat.
- **Premium:** la răspuns greșit, înregistrare în istoricul de încercări quiz (pentru raportul de pe dashboard).

### Roadmap de studiu

- Creat și editat doar de profesori (inclusiv editor **canvas**: noduri, legături, importanță subiecte BAC).

### Variante rezolvate

- **Profesor:** încărcare documente per program (tab **Variante rezolvate**).
- **Premium:** listare și descărcare pe dashboard și pe `/variante-rezolvate` (inclusiv variante legacy legate de lecții, dacă există în baza de date).

### Abonament Premium

- Checkout Stripe prin Edge Functions Supabase (`create-checkout-session`, `stripe-webhook`).
- Entitlement activ verificat în aplicație; profesorii de curriculum sunt tratați ca Premium fără plată.


## Cont gratuit vs Premium

| Zonă | Cont gratuit | Premium |
|------|----------------|---------|
| Lecții, quiz-uri, fișiere, finalizare în **programul ales la signup** | Da | Da |
| Lecții din **alte programe** / Subiectul III extins | Nu | Da |
| Roadmap publicat de profesor | Nu | Da |
| Variante rezolvate | Nu | Da |
| Raport greșeli quiz + notă țintă | Nu | Da |


- **Curriculum:** lecții, părți, fișiere, întrebări quiz (inclusiv imagini).
- **Roadmap:** pași legați de lecții și layout canvas.
- **Variante rezolvate:** upload per program

## Tehnologii

| Strat | Tehnologie |
|-------|------------|
| Frontend | React 19, Vite 8, React Router 7 |
| Stil | Tailwind CSS 4, Framer Motion |
| Formule | react-katex |
| Backend / Auth / DB | Supabase (PostgreSQL, RLS, Storage, Auth) |
| Plăți | Stripe (Edge Functions Deno) |
| Deploy frontend | Vercel |
| Iconițe | lucide-react |

## Structura proiectului

```text
scholar-bac/
├── public/                 # static, maintenance.html
├── src/
│   ├── app/                # rute protejate, AuthProvider, config mentenanță
│   ├── features/
│   │   ├── auth/           # welcome, login, register, reset parolă
│   │   ├── dashboard/      # dashboard elev
│   │   ├── lessons/        # lecție, profile M1/M2/M3
│   │   ├── profile/        # profil și avatar
│   │   ├── roadmap/        # vizualizare elev + canvas 
│   │   ├── variants/       # variante rezolvate (elev)
│   │   └── maintenance/
│   ├── services/           # Supabase, billing, progres, quiz,
│   └── shared/ui/          # componente UI reutilizabile
├── supabase/
│   └── functions/          # checkout Stripe, webhook
├── vercel.json             # rewrite SPA
└── package.json
```


## Rute aplicație

| Rută | Descriere | Acces |
|------|-----------|--------|
| `/` | Pagină de bun venit | Public |
| `/register`, `/login` | Cont nou / autentificare | Public |
| `/forgot-password`, `/reset-password` | Recuperare parolă | Public |
| `/dashboard` | Dashboard elev | Autentificat |
| `/profile` | Profil | Autentificat |
| `/lessons/:lessonId` | Lecție + quiz | Autentificat |
| `/roadmap` | Roadmap studiu | Autentificat (conținut Premium) |
| `/variante-rezolvate` | Variante rezolvate | Autentificat (Premium) |

### Cerințe

- Node.js (LTS recomandat)
- Proiect Supabase configurat (Auth, tabele, politici RLS, Storage, funcții Edge)

## Supabase și backend

- **Auth:** sesiuni persistate în browser; reset parolă către originea site-ului.
- **Storage:** materiale lecții, poze profil
- **Edge Functions:** `create-checkout-session`, `stripe-webhook`


---

Proiect de licență / pregătire BAC la matematică.