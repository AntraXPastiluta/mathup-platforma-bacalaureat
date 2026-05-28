# MathUP

Platformă web de pregătire pentru examenul de Bacalaureat la matematică, orientată pe programele liceale (M1, M2, M3), lecții structurate pe subiecte de examen, quiz-uri, progres personal și funcții MathUP Premium (roadmap, variante rezolvate, raport față de nota țintă).

**Producție:** [https://mathup-bacalureat.vercel.app](https://mathup-bacalureat.vercel.app)

## Cuprins

- [Prezentare generală](#prezentare-generală)
- [Funcționalități principale](#funcționalități-principale)
- [Cont gratuit vs MathUP Premium](#cont-gratuit-vs-MathUP Premium)
- [Panou de administrare](#panou-de-administrare)
- [Tehnologii](#tehnologii)
- [Structura proiectului](#structura-proiectului)
- [Rute aplicație](#rute-aplicație)
- [Configurare locală](#configurare-locală)
- [Build și deploy](#build-și-deploy)
- [Supabase și backend](#supabase-și-backend)
- [Scripturi npm](#scripturi-npm)
- [Mod mentenanță](#mod-mentenanță)

## Prezentare generală

MathUP este o aplicație **React** (Vite) cu autentificare și date în **Supabase**. Elevii își aleg programul la înregistrare, parcurg lecții pe Subiectul I, II și III, răspund la chestionare și își urmăresc progresul pe dashboard. Contul **MathUP Premium** (Stripe) extinde accesul la roadmap-ul publicat de profesor, la variante rezolvate și la raportul de pregătire legat de nota țintă din profil.

Profesorii de curriculum gestionează lecțiile, fișierele, quiz-urile, roadmap-urile și variante rezolvate la nivel de program; accesul la panoul de control care gestioneaza lista de emailuri din baza de date.

## Funcționalități principale

### Autentificare și profil

- Înregistrare, autentificare (email/parolă sau **Google OAuth**)
- Profil: nume, program(e) liceal(e).
- Utilizatorii noi Google trec prin `/complete-profile` (profil + consimțământ legal GDPR).

### Dashboard elev

- Rezumat progres (capitole finalizate, procent general).
- Mesaje de performanță adaptate numărului de capitole parcurse.
- Lecții grupate pe program și pe subiecte de examen (I, II, III).
- Acces la lecții conform programului înregistrat; pentru alte programe se propune upgrade MathUP Premium.
- **MathUP Premium:** secțiune roadmap, variante rezolvate, **Raport MathUP Premium** (notă țintă, greșeli la quiz, medie quiz, estimare realizabilitate).

### Lecții și quiz-uri

- Conținut pe secțiuni (părți de lecție), cu suport pentru imagini la secțiuni și la întrebări.
- Materiale suplimentare (fișiere) per lecție.
- Chestionare la final de secțiune sau la finalul lecției; feedback imediat la răspuns.
- Finalizare lecție și salvare progres/scor doar când există conținut publicat.
- **MathUP Premium:** la răspuns greșit, înregistrare în istoricul de încercări quiz (pentru raportul de pe dashboard).

### Roadmap de studiu

- Creat și editat doar de profesori (inclusiv editor **canvas**: noduri, legături, nivelul de importanță subiecte).

### Variante rezolvate

- **Profesor:** încărcare documente per program (tab **Variante rezolvate**).
- **MathUP Premium:** listare și descărcare pe dashboard și pe `/variante-rezolvate` (inclusiv variante legacy legate de lecții, dacă există în baza de date).

### Abonament MathUP Premium

- Checkout Stripe prin Edge Functions Supabase (`create-checkout-session`, `stripe-webhook`).
- Entitlement activ verificat în aplicație; profesorii de curriculum sunt tratați ca MathUP Premium fără plată.


## Cont gratuit vs MathUP Premium

| Zonă | Cont gratuit | MathUP Premium |
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
frontend/
├── public/                 # static, maintenance.html
├── src/
│   ├── app/                # rute protejate, AuthProvider, config mentenanță
│   ├── features/
│   │   ├── auth/           # welcome, login, register, resetare parolă
│   │   ├── dashboard/      # dashboard elev
│   │   ├── lessons/        # lecție, profile M1/M2/M3
│   │   ├── profile/        # profil și avatar
│   │   ├── roadmap/        # vizualizare elev + canvas
│   │   ├── variants/       # variante rezolvate (elev)
│   │   ├── support/        # contact suport
│   │   └── maintenance/
│   ├── services/           # Supabase, plăți, progres, quiz
│   └── shared/ui/          # componente UI reutilizabile
├── vercel.json             # rewrite SPA
└── package.json
```


## Rute aplicație

| Rută | Descriere | Acces |
|------|-----------|--------|
| `/` | Pagină de bun venit | Public |
| `/register`, `/login` | Cont nou / autentificare (email sau Google) | Public |
| `/complete-profile` | Onboarding OAuth (profil + consimțământ legal) | Autentificat |
| `/forgot-password`, `/reset-password` | Recuperare parolă | Public |
| `/dashboard` | Dashboard elev | 
| `/profile` | Profil |
| `/lessons/:lessonId` | Lecție + quiz 
| `/roadmap` | Roadmap studiu | (conținut MathUP Premium) |
| `/variante-rezolvate` | Variante rezolvate | Autentificat (MathUP Premium) |
| `/support` | Contact suport |

### Cerințe

- Node.js (LTS recomandat)
- Proiect Supabase configurat (Auth, tabele, politici RLS, Storage, funcții Edge)

## Configurare locală

Creează `frontend/.env.local`:

```env
VITE_SUPABASE_URL=https://<PROJECT_REF>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon_key>
```

Pornește aplicația:

```bash
cd frontend
npm install
npm run dev
```

## Autentificare Google OAuth

Autentificarea Google folosește **Supabase Auth** — nu sunt necesare variabile `VITE_GOOGLE_*` în frontend; Client ID și Secret se configurează în Supabase Dashboard.

### 1. Google Cloud Console

1. [Google Cloud Console](https://console.cloud.google.com/) → proiect → **APIs & Services → OAuth consent screen** (External, app name MathUP).
2. **Credentials → Create OAuth client ID** → tip **Web application**.
3. **Authorized redirect URIs** (exact):
   - `https://<PROJECT_REF>.supabase.co/auth/v1/callback`
   - `http://127.0.0.1:54321/auth/v1/callback` (doar pentru Supabase local)
4. Notează **Client ID** și **Client Secret**.

### 2. Supabase Dashboard → Authentication

1. **Providers → Google** — Enable, lipește Client ID + Secret.
2. **URL Configuration**:
   - Site URL: `https://mathup-bacalureat.vercel.app`
   - Redirect URLs:
     - `http://localhost:5173/**`
     - `https://mathup-bacalureat.vercel.app/**`
3. (Recomandat) **Account linking** — permite legarea contului Google la un cont email/parolă existent cu același email.

### Flux OAuth în aplicație

1. Utilizatorul apasă „Continuă cu Google” pe `/login` sau `/register`.
2. Supabase redirecționează către Google, apoi înapoi la `/dashboard` cu sesiune activă.
3. Dacă metadata lipsește (profil liceal sau consimțământ legal), `ProtectedRoute` redirecționează la `/complete-profile`.
4. După completare, utilizatorul accesează dashboard-ul normal.

## Supabase și backend

- **Auth:** sesiuni persistate în browser; reset parolă către originea site-ului; Google OAuth prin Supabase (`signInWithOAuth`).
- **Storage:** materiale lecții, poze profil
- **Edge Functions:** `create-checkout-session`, `stripe-webhook`, `submit-support-request`, `cancel-premium-subscription`, `export-user-data` (export GDPR din Profil)
- **Migrări:** din `backend/`, `npx supabase db push` (inclusiv `20260528140000_gdpr_export_log.sql` pentru export GDPR și `20260628120000_bac_exam_date.sql` pentru data examen BAC).
- **Deploy Edge Functions:** din `backend/`, `npx supabase login` apoi `npx supabase functions deploy <nume>` (codul e în `supabase/functions/`). Export GDPR: `npx supabase functions deploy export-user-data`. Fără deploy, exportul din Profil folosește fallback direct din baza de date (fără limită 3/24h în `gdpr_export_logs`).
- **Export GDPR:** utilizatorii autentificați descarcă JSON din **Profil → Datele mele (GDPR)** (max. 3 exporturi / 24h)

---

Proiect de licență / pregătire BAC la matematică.