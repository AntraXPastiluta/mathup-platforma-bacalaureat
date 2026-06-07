# Modificări — sesiunea din 7 iunie 2026

Document care rezumă toate schimbările făcute în această sesiune, grupate pe funcționalitate. Toate textele vizibile utilizatorului sunt în română; frontend-ul e JS/JSX, backend-ul Supabase (Postgres + RLS + RPC).

---

## 1. Slideshow cu variante rezolvate (M1–M4) — componentă reutilizabilă

**De ce:** slideshow-ul cu probleme rezolvate exista doar pe `WelcomePage`; voiam să-l refolosim și pe alte pagini, fără duplicarea datelor/markup-ului.

**Ce s-a făcut:**
- Componentă nouă: `frontend/src/features/auth/components/WorkedExerciseShowcase.jsx`
  - Conține datele M1–M4, rotația automată (5,2s), selectorul de tab-uri cu evidențiere glisantă și tranziția între fișe.
  - Se pune pe pauză la hover/focus; respectă `prefers-reduced-motion`.
  - `layoutId` unic per instanță (`useId`) ca evidențierea să nu se „lege" între pagini.
  - Prop `variant`: `light` (card glass, se adaptează la temă) și `dark` (panou întunecat permanent).
- `WelcomePage.jsx` — refactorizat să folosească componenta (`variant="light"`); vizual identic cu înainte.
- `LoginPage.jsx` — fișa statică M1 înlocuită cu slideshow-ul rotativ.

---

## 2. Panoul stâng de pe Login — urmează tema (light/dark)

**De ce:** panoul de brand din stânga de pe `LoginPage` era întunecat permanent (`bg-slate-950`), inclusiv în light mode.

**Ce s-a făcut** (`frontend/src/features/auth/pages/LoginPage.jsx`):
- `aside`-ul devine theme-aware: fundal luminos (`bg-slate-100`) + grilă/ambient subtile + text închis + separator `border-r` în light; rămâne `bg-slate-950` în dark (fără separator).
- Accentele lavandă-pe-întuneric (`primary-200/300`), chip-urile de profil și ștampila „BAC 2026" au primit variante `light dark:`.
- Slideshow-ul de pe Login trecut pe `variant="light"` (se adaptează singur la temă).

---

## 3. Pagină nouă „Alătură-te echipei MathUP ca profesor"

**De ce:** nu exista o pagină de recrutare profesori, accesibilă din pagina de start.

**Decizii:** aplicare **doar informativă** (adresa de email afișată ca text, fără buton de aplicare); link în **footer + secțiune dedicată** pe WelcomePage. Rută publică neprotejată (ca `/programa/:cod`).

**Ce s-a făcut:**
- Pagină nouă: `frontend/src/features/auth/pages/JoinAsTeacherPage.jsx` (structură ca `ProgramDetailPage`: header propriu, hero, secțiuni, footer; theme-aware).
  - **Cerințe** prezentate detaliat: notă minimă **9,20** la Matematică în Bac; **licență + master** (de preferință matematică), cu dovada diplomelor; **curs/modul pedagogic**; **cunoașterea programei** de Bac (M1/M2/M3).
  - **Proces:** verificare confidențială prin **interviu cu un administrator MathUP** (nu se încarcă documente pe platformă); email de contact din `OPERATOR.email` (`legalConstants`).
- Rută în `frontend/src/App.jsx`: `/devino-profesor` (neprotejată).
- `WelcomePage.jsx`: link „Devino profesor" în footer + secțiune CTA dedicată („Pentru profesori") înainte de CTA-ul final.

> Notă: slideshow-ul a fost ulterior **scos din `RegisterPage`** la cererea ta (rămâne pe Welcome și Login).

---

## 4. Separarea rolurilor de administrare — Profesor vs Administrator tehnic

**De ce:** exista un singur nivel de admin (orice email din `curriculum_admin_emails` putea tot) + un „admin principal". Voiam să separăm profesorii (doar conținut) de administratorii tehnici (operațiuni).

**Decizii confirmate:**
1. **Tehnic = superset** (vede tot; doar profesorul e restricționat la Curriculum/Roadmaps/Variante).
2. Aplicare **frontend + backend (RLS)** — restricție reală, nu doar ascundere în UI.
3. Gestiunea adminilor și atribuirea rolurilor = **doar administratorul principal**.

### Model de rol
- Coloană nouă `curriculum_admin_emails.role` ∈ `{'profesor','technical'}`, `NOT NULL DEFAULT 'technical'` (rândurile existente rămân tehnice → fără regresie).
- `is_curriculum_admin()` (neschimbat) = orice admin: intră în `/admin`, editează conținut, Premium automat, poate prelua tichete de suport.
- Funcție nouă `is_technical_admin()` = `is_primary_admin() OR role = 'technical'`.
- Accesul pe secțiuni: conținut (curriculum/roadmaps/variants) → orice admin; **Rapoarte / Acces / Platformă → tehnic**; adăugare/ștergere/rol → **principal**.

### Backend — migrare `backend/supabase/migrations/20260702120000_admin_role_split.sql`
Aplicată pe remote prin **Supabase MCP `apply_migration`** (nu prin `db push`, din cauza driftului de istoric de migrări); fișierul local există pentru paritate cu repo-ul.
- `add column role` + `check`.
- `is_technical_admin()` (SECURITY DEFINER, `search_path=public`, grant la `authenticated`).
- Garda schimbată `is_curriculum_admin()` → `is_technical_admin()` în: `get_admin_reports`, `list_premium_entitlements_for_admin`.
- Garda schimbată `is_primary_admin()` → `is_technical_admin()` în: `set_maintenance_mode`, `set_bac_exam_date`.
- Politica RLS de UPDATE pe `platform_settings` rămâne **primary-only** (protejează `primary_admin_email` de auto-promovare); tehnicii scriu doar prin RPC-urile SECURITY DEFINER.
- Politică nouă `curriculum_admin_emails_update_primary` (UPDATE, primary-only) pentru schimbarea rolului.
- **Neschimbat:** RLS de conținut (lessons/roadmaps/variants) = `is_curriculum_admin()`; INSERT/DELETE pe `curriculum_admin_emails` = `is_primary_admin()`.

### Frontend
- `services/curriculumAdminService.js` — `checkCurrentUserIsTechnicalAdmin()`; `role` în list/add; `updateCurriculumAdminRole(id, role)`; `ADMIN_ROLES`.
- `app/providers/AuthProvider.jsx` — expune `isTechnicalAdmin` (state + cache + context value).
- `features/admin/constants.js` — flag `technicalOnly` pe Rapoarte/Acces/Platformă; `getAdminSectionsForUser(isTechnicalAdmin)`.
- `features/admin/components/SectionNav.jsx` — folosește `isTechnicalAdmin`.
- `features/admin/pages/AdminDashboardPage.jsx` — secțiuni vizibile după `isTechnicalAdmin`; etichetă de rol (Principal / Tehnic / Profesor); rutele invizibile cad pe Curriculum.
- `features/admin/components/AccesSection.jsx` — selector de rol la adăugare + coloană „Rol" cu schimbare (doar principalul); text descriptiv actualizat.
- `features/admin/components/PlatformSection.jsx` — comutatoarele de mentenanță/dată examen acum pentru administratorii tehnici (mesaje actualizate).

### Implicații de securitate (intenționate)
- Comutarea **mentenanței** și **data examenului** au trecut de la „doar principal" la „orice administrator tehnic".
- `primary_admin_email` rămâne protejat (UPDATE pe tabel = primary-only).
- **În afara scopului:** profesorul e tot tratat ca admin pentru Premium automat și preluarea tichetelor de suport (de restrâns separat dacă se dorește).

---

## 5. Fix UI — comutatorul de rol „nu apărea complet"

**Cauză:** selectorul de rol din tabelul de admini era un dropdown poziționat absolut, iar wrapper-ul tabelului are `overflow-hidden` (pentru colțurile rotunjite) → lista de opțiuni era tăiată.

**Fix** (`AccesSection.jsx`): dropdown-ul din tabel a fost înlocuit cu un **comutator din două butoane** (`Profesor` / `Tehnic`) — fără popup care să fie clipuit; butonul activ e evidențiat, click pe celălalt schimbă rolul pe loc. Dropdown-ul din formularul de adăugare a rămas (nu e în tabelul cu `overflow-hidden`).

---

## Verificare
- `npm run lint` și `npm run build` — verzi după fiecare etapă.
- Backend confirmat prin MCP: coloana `role` și `is_technical_admin()` există; cele 4 RPC-uri gardează acum pe `is_technical_admin`; `get_advisors` (security) fără probleme noi.
- Stare curentă a adminilor: `cruceanu.cristian3004@gmail.com` (principal, technical), `laurairina07@gmail.com` (profesor).

### Cum testezi separarea rolurilor
1. Ca **principal**: `/admin → Acces` — comuți rolul lui `laurairina07` între Profesor/Tehnic.
2. Ca **profesor**: vezi doar Curriculum/Roadmaps/Variante; `?section=rapoarte|platform|admins` cade pe Curriculum; apel direct la `get_admin_reports` → „Acces neautorizat".
3. Ca **tehnic (ne-principal)**: vezi toate secțiunile, comuți mentenanța/data examenului, dar NU poți adăuga/șterge/atribui roluri.
