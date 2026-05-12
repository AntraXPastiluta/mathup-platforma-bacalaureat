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

Administratorii de curriculum gestionează lecțiile, fișierele, quiz-urile, roadmap-urile și variante rezolvate la nivel de program; accesul la panoul admin este controlat prin lista de emailuri din baza de date.

## Funcționalități principale

### Autentificare și profil

- Înregistrare, autentificare, recuperare parolă (`/forgot-password`, `/reset-password`).
- Profil: nume, program(e) liceal(e), **notă țintă la BAC** (validată, maxim 10), temă clară/întunecată.
- Avatar: preseturi sau fotografie încărcată în Supabase Storage (`profile-photos/{userId}/`).

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

- Creat și editat doar de administratori (inclusiv editor **canvas**: noduri, legături, importanță subiecte BAC).
- Vizualizat de elevii Premium pe `/roadmap` (read-only).

### Variante rezolvate

- **Admin:** încărcare documente per program (tab **Variante rezolvate**).
- **Premium:** listare și descărcare pe dashboard și pe `/variante-rezolvate` (inclusiv variante legacy legate de lecții, dacă există în baza de date).

### Abonament Premium

- Checkout Stripe prin Edge Functions Supabase (`create-checkout-session`, `stripe-webhook`).
- Entitlement activ verificat în aplicație; administratorii de curriculum sunt tratați ca Premium fără plată.

### Mentenanță

- Mod mentenanță local (`VITE_MAINTENANCE_MODE`) sau pe Vercel (`MAINTENANCE_MODE` + `public/maintenance.html`).

## Cont gratuit vs Premium

| Zonă | Cont gratuit | Premium |
|------|----------------|---------|
| Lecții, quiz-uri, fișiere, finalizare în **programul ales la signup** | Da | Da |
| Lecții din **alte programe** / Subiectul III extins | Nu | Da |
| Roadmap publicat de profesor | Nu | Da |
| Variante rezolvate | Nu | Da |
| Raport greșeli quiz + notă țintă | Nu | Da |

Regulile de acces sunt centralizate în `src/services/premiumAccessService.js`.

## Panou de administrare

Ruta `/admin` (doar utilizatori marcați administrator în Supabase):

- **Curriculum:** lecții, părți, fișiere, întrebări quiz (inclusiv imagini).
- **Roadmap:** pași legați de lecții și layout canvas.
- **Variante rezolvate:** upload per program (`AdminSolvedVariantsSection`).
- **Administratori:** adăugare/eliminare emailuri admin (`AdminAccessSection`); administratorul principal nu poate fi eliminat; la adăugare se verifică existența contului în Auth.

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
│   │   ├── roadmap/        # vizualizare elev + canvas admin
│   │   ├── variants/       # variante rezolvate (elev)
│   │   ├── admin/          # panou administrator
│   │   └── maintenance/
│   ├── services/           # Supabase, billing, progres, quiz, admin
│   └── shared/ui/          # componente UI reutilizabile
├── supabase/
│   └── functions/          # checkout Stripe, webhook
├── vercel.json             # rewrite SPA
└── package.json
```

Serviciile din `src/services/` izolează apelurile către Supabase (lecții, progres, roadmap, billing, administratori, variante rezolvate, încercări quiz, raport notă țintă).

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
| `/admin` | Administrare curriculum | Administrator |
| `/maintenance` | Mentenanță | Când modul mentenanță e activ |

## Configurare locală

### Cerințe

- Node.js (LTS recomandat)
- Proiect Supabase configurat (Auth, tabele, politici RLS, Storage, funcții Edge)

### Variabile de mediu

Creează `scholar-bac/.env.local`:

```env
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key>
```

Opțional, pentru previzualizare mentenanță local:

```env
VITE_MAINTENANCE_MODE=true
```

Nu comite `.env.local` (este în `.gitignore`).

### Pornire development

```bash
cd scholar-bac
npm install
npm run dev
```

## Build și deploy

### Build local

```bash
npm run build
npm run preview
```

### Vercel

- **Build command:** `npm run build`
- **Output:** `dist`
- Variabile în proiectul Vercel: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
- După deploy: actualizează în Supabase Auth **Site URL** și **Redirect URLs** (inclusiv `/reset-password`); secretul `APP_URL` pe Edge Functions pentru return Stripe

### Git

Repository-ul Git este rădăcina folderului `scholar-bac` (nu folderul părinte al workspace-ului).

## Supabase și backend

- **Auth:** sesiuni persistate în browser; reset parolă către originea site-ului.
- **Date:** lecții, progres, roadmap, entitlement Premium, administratori, variante pe program, încercări quiz — cu RLS; funcții precum `has_active_premium()` și `is_curriculum_admin()` pentru politici server-side.
- **Storage:** materiale lecții, poze profil, upload-uri admin.
- **Edge Functions:** `create-checkout-session`, `stripe-webhook` (secrete Stripe și `APP_URL` în Supabase, nu pe Vercel).

Migrările și politicile trebuie aplicate manual în proiectul Supabase înainte de funcționalități complete în producție. Detalii istorice de implementare: `WORKSPACE_WORK_LOG.txt`.

## Scripturi npm

| Comandă | Rol |
|---------|-----|
| `npm run dev` | Server development Vite |
| `npm run build` | Build producție în `dist/` |
| `npm run preview` | Previzualizare build local |
| `npm run lint` | ESLint |

---

Proiect de licență / pregătire BAC la matematică. Pentru probleme de deploy sau configurare Supabase, verifică log-ul de lucru din repo și setările din dashboard-urile Vercel și Supabase.
