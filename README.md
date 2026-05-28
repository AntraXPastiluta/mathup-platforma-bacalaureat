# MathUP

Platformă web educațională de tip SaaS, dedicată pregătirii elevilor de liceu pentru examenul de Bacalaureat la matematică. Aplicația structurează conținutul pe programele liceale (M1, M2, M3) și pe subiectele de examen, oferind un parcurs clar de învățare, evaluare și urmărire a progresului.

**Demo public:** [mathup-bacalureat.vercel.app](https://mathup-bacalureat.vercel.app)

---

## Despre proiect

MathUP este un proiect de startup / licență aflat în fază de dezvoltare (MVP). Scopul platformei este să ofere elevilor un instrument digital coerent pentru repetarea materiei, exersarea prin quiz-uri și planificarea pregătirii până la examen.

Platforma combină:
- conținut didactic structurat de profesori;
- experiență personalizată pentru fiecare elev;
- funcții avansate disponibile prin abonament MathUP Premium.

---

## Public țintă

| Rol | Descriere |
|-----|-----------|
| **Elevi** | Parcurg lecții, rezolvă exerciții și quiz-uri, urmăresc progresul pe dashboard |
| **Profesori / administratori curriculum** | Publică lecții, quiz-uri, roadmap-uri și variante rezolvate |
| **Utilizatori Premium** | Acces extins la roadmap, variante rezolvate și raport de pregătire |

---

## Funcționalități principale

### Pentru elevi

- **Cont personal** — înregistrare, autentificare, profil cu program liceal ales
- **Dashboard** — progres general, lecții grupate pe subiecte (I, II, III), streak de activitate
- **Lecții interactive** — conținut pe secțiuni, formule matematice, materiale descărcabile
- **Quiz-uri** — evaluare la final de secțiune sau lecție, cu feedback imediat
- **Profil** — nume, avatar, program, notă țintă (Premium)
- **Suport** — formular de contact integrat în platformă

### MathUP Premium

| Funcție | Descriere |
|---------|-----------|
| Roadmap de studiu | Plan vizual al parcursului recomandat, cu priorități pe subiecte |
| Variante rezolvate | Acces la documente publicate de profesori, per program |
| Programe extinse | Lecții din programe diferite față de cel ales la înregistrare |
| Raport de pregătire | Analiză greșeli quiz, medie, estimare față de nota țintă |

### Pentru administratori

- Editor de curriculum (lecții, părți, fișiere, întrebări quiz)
- Roadmap canvas — noduri, legături, nivel de importanță
- Gestionare variante rezolvate per program
- Setări platformă (ex.: dată examen BAC, acces utilizatori)

---

## Conformitate și legal

La crearea contului, utilizatorul acceptă explicit:
- **Termenii și Condițiile** platformei
- **Politica de Confidențialitate** (GDPR)

Documentele sunt accesibile public, iar consimțământul este înregistrat la momentul înregistrării.

Utilizatorii autentificați pot **exporta datele personale** (dreptul la portabilitate GDPR) din pagina **Profil**, în format JSON.

---

## Arhitectură (prezentare generală)

```text
┌─────────────────────────────────────────────────────────┐
│                    Frontend (React)                      │
│  Auth · Dashboard · Lecții · Roadmap · Profil · Admin   │
└──────────────────────────┬──────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│              Backend cloud (Supabase)                    │
│  Autentificare · Bază de date · Storage · Edge Functions │
└──────────────────────────┬──────────────────────────────┘
                           │
              ┌────────────┴────────────┐
              ▼                         ▼
     Procesare plăți              Găzduire web
     (abonament Premium)          (Vercel)
```

---

## Structura repository-ului

```text
e-learning-licenta/
├── frontend/          # Aplicația web React (interfața utilizatorului)
│   └── src/
│       ├── features/  # auth, dashboard, lessons, roadmap, admin, legal…
│       ├── services/  # comunicare cu backend-ul
│       └── shared/    # componente UI reutilizabile
│
└── backend/           # Supabase: migrări DB, funcții serverless
    ├── migrations/
    └── supabase/
        ├── migrations/
        └── functions/   # Edge Functions (deploy din backend/)
```

---

## Tehnologii utilizate

| Strat | Tehnologie |
|-------|------------|
| Frontend | React, Vite, React Router |
| Stil & animații | Tailwind CSS, Framer Motion |
| Formule matematice | KaTeX |
| Backend & autentificare | Supabase |
| Plăți abonament | Stripe |
| Deploy frontend | Vercel |

---

## Cont gratuit vs Premium (rezumat)

| Zonă | Gratuit | Premium |
|------|---------|---------|
| Lecții în programul ales | Da | Da |
| Quiz-uri și progres | Da | Da |
| Alte programe / Subiect III extins | Nu | Da |
| Roadmap de studiu | Nu | Da |
| Variante rezolvate | Nu | Da |
| Raport greșeli + notă țintă | Nu | Da |

---

## Pagini principale

| Pagină | Acces |
|--------|-------|
| Pagină de bun venit | Public |
| Înregistrare / autentificare | Public |
| Termeni și Condiții / Confidențialitate | Public |
| Dashboard, lecții, profil | Autentificat |
| Roadmap, variante rezolvate | Autentificat (Premium) |
| Panou administrare | Autentificat (admin) |

---

## Status proiect

MathUP este în **fază pilot (MVP)**. Funcționalitățile, interfața și conținutul educațional pot evolua pe parcursul dezvoltării. Platforma este concepută ca instrument de sprijin în învățare — nu garantează un anumit rezultat la examen.

---

*Proiect de licență — pregătire Bacalaureat la matematică.*
