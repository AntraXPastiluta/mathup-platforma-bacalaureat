import { LEGAL_DOCS_VERSION, OPERATOR, PLATFORM } from './legalConstants'

export function getPrivacyPolicySections() {
  return [
    {
      title: 'Introducere',
      paragraphs: [
        'Echipa MathUP se angajează să protejeze și să respecte confidențialitatea datelor dumneavoastră cu caracter personal. Această Politică de Confidențialitate explică cum colectăm, utilizăm, stocăm și protejăm datele dumneavoastră atunci când accesați și folosiți platforma SaaS mathup-bacalureat.vercel.app (numită în continuare „Aplicația” sau „MathUP”).',
        'Prin crearea unui cont pe Platformă, acceptați practicile descrise în această politică, în conformitate cu Regulamentul (UE) 2016/679 (GDPR).',
        `Ultima actualizare: 29 mai 2026. Versiune document: ${LEGAL_DOCS_VERSION}.`,
      ],
    },
    {
      title: '1. Ce date cu caracter personal colectăm?',
      paragraphs: [
        'Fiind o aplicație de tip SaaS educațional, colectăm doar datele strict necesare pentru funcționarea platformei și personalizarea procesului de învățare:',
      ],
      list: [
        'Date de identificare și acces: Numele, prenumele și adresa de e-mail (folosită ca nume de utilizator și pentru comunicări tehnice), precum și parola (stocată în formă criptată securizat).',
        'Date de utilizare și progres: Istoricul testelor rezolvate, scorurile obținute la simulări, timpul petrecut pe platformă și răspunsurile la exerciții (necesare pentru generarea statisticilor de progres).',
        'Date tehnice: Adresa IP, tipul de browser, sistemul de operare și modulele cookie folosite exclusiv pentru menținerea sesiunii active (rămânerea conectat în cont).',
      ],
      afterList: [
        'Notă: Deoarece MathUP este un proiect de startup aflat în fază de testare (MVP), plățile se realizează în mod simulare (Stripe Test Mode) și NU colectăm sau stocăm date reale de card bancar.',
      ],
    },
    {
      title: '2. Scopurile și temeiurile prelucrării',
      paragraphs: [
        'Prelucrăm datele dumneavoastră în următoarele scopuri legale:',
      ],
      list: [
        'Executarea contractului (Art. 6 alin. 1 lit. b din GDPR): Pentru a vă crea contul, pentru a vă oferi acces la exerciții și pentru a vă afișa progresul individual la matematică.',
        'Interes legitim (Art. 6 alin. 1 lit. f din GDPR): Pentru a monitoriza stabilitatea tehnică a aplicației găzduite pe Vercel, pentru a remedia eventualele erori de programare și pentru a securiza platforma împotriva atacurilor cibernetice.',
      ],
    },
    {
      title: '3. Cât timp păstrăm datele dumneavoastră?',
      paragraphs: [
        'Datele asociate contului dumneavoastră sunt păstrate atât timp cât contul este activ pe platformă. Deoarece MathUP este un proiect de startup, conturile și datele aferente vor fi șterse definitiv în momentul încheierii fazei de testare/evaluare a proiectului sau la cererea expresă a utilizatorului.',
      ],
    },
    {
      title: '4. Destinatarii datelor (Cui transmitem datele?)',
      paragraphs: [
        'Datele dumneavoastră sunt confidențiale și nu vor fi vândute sau închiriate. Pentru ca aplicația să ruleze în cloud, folosim exclusiv servicii tehnice recunoscute care sunt aliniate la standardele GDPR:',
      ],
      list: [
        'Vercel Inc. – Pentru găzduirea infrastructurii web a aplicației.',
        'Supabase – Pentru stocarea securizată a tabelelor cu utilizatori, autentificare și date de progres.',
        'Stripe (mod test) – Pentru simularea plăților; nu stocăm date reale de card bancar pe serverele noastre.',
      ],
    },
    {
      title: '5. Protecția datelor minorilor',
      paragraphs: [
        'Platforma se adresează elevilor care se pregătesc pentru examenul de Bacalaureat, unii dintre aceștia având vârsta sub 18 ani. MathUP nu colectează cu bună știință date de la minori fără acordul implicit al părinților sau tutorilor legali. Prin utilizarea aplicației, minorul declară că are acordul părinților pentru a folosi acest instrument educațional.',
      ],
    },
    {
      title: '6. Drepturile dumneavoastră conform GDPR',
      paragraphs: [
        'În calitate de persoană vizată, beneficiați de următoarele drepturi pe care le puteți exercita în mod gratuit:',
      ],
      list: [
        'Dreptul de acces: Puteți solicita o confirmare a faptului că datele dumneavoastră sunt sau nu prelucrate de noi.',
        'Dreptul de rectificare: Puteți solicita corectarea datelor inexacte din cont.',
        'Dreptul la ștergere („dreptul de a fi uitat”): Puteți solicita ștergerea completă a contului dumneavoastră și a tuturor statisticilor de progres asociate.',
        'Dreptul la portabilitate: Puteți cere exportul datelor dumneavoastră într-un format structurat (JSON), direct din pagina Profil — secțiunea „Datele mele (GDPR)”, sau prin e-mail la DPO.',
      ],
      afterList: [
        'Exportul din Profil include datele de cont, progresul la lecții, rezultatele quiz-urilor, informațiile despre abonamentul Premium și mesajele trimise către suport. Sunt permise maximum 3 exporturi la 24 de ore.',
        `Pentru celelalte drepturi (acces, rectificare, ștergere) sau dacă aveți nevoie de asistență, puteți trimite un e-mail la: ${OPERATOR.dpoEmail}.`,
      ],
    },
    {
      title: '7. Modificări ale Politicii de Confidențialitate',
      paragraphs: [
        'Ne rezervăm dreptul de a actualiza această Politică de Confidențialitate odată cu evoluția tehnică a startup-ului nostru. Orice modificare va fi publicată pe această pagină, iar data ultimei actualizări va fi modificată în mod corespunzător.',
        'Data acceptării și versiunea documentului la înregistrare sunt înregistrate în contul dumneavoastră.',
      ],
    },
  ]
}

export function getPrivacyPolicyTitle() {
  return 'Politica de Confidențialitate (GDPR)'
}
