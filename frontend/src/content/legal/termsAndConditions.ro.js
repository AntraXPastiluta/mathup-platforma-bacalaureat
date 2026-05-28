import { LEGAL_DOCS_VERSION, OPERATOR, PLATFORM } from './legalConstants'

export function getTermsAndConditionsSections() {
  return [
    {
      title: 'Introducere',
      paragraphs: [
        `Bun venit pe ${PLATFORM.name}, platformă accesibilă la adresa web ${PLATFORM.url} (numită în continuare „Platforma” sau „Aplicația”).`,
        'Aplicația este o platformă SaaS (Software as a Service) educațională, concepută ca un proiect de startup pentru pregătirea elevilor în vederea susținerii examenului de Bacalaureat la matematică.',
        'Prin crearea unui cont și utilizarea serviciilor noastre, vă exprimați acordul deplin și necondiționat cu prezenții Termeni și Condiții.',
        `Ultima actualizare: 28 mai 2026. Versiune document: ${LEGAL_DOCS_VERSION}.`,
      ],
    },
    {
      title: '1. Informații despre Furnizor',
      paragraphs: [
        `${PLATFORM.name} este deținută și administrată în scop demonstrativ și de dezvoltare de către:`,
        `Denumire proiect: ${OPERATOR.name}`,
        `Sediu social: ${OPERATOR.address}`,
        `Cod Unic de Înregistrare (CUI): ${OPERATOR.cui} (Cod în stadiu de proiect)`,
        `Nr. Reg. Comerțului: ${OPERATOR.regCom} (Număr în stadiu de proiect)`,
        `E-mail de contact: ${OPERATOR.email}`,
      ],
    },
    {
      title: '2. Condiții de Vârstă și Crearea Contului',
      paragraphs: [
        'Vârsta minimă: Platforma se adresează în principal elevilor de liceu. Dacă utilizatorul are sub 18 ani, crearea contului și utilizarea serviciilor se vor face exclusiv cu acordul și sub supravegherea unui părinte sau a tutorelui legal.',
        'Responsabilitatea contului: Contul MathUP este strict personal și netransmisibil. Este interzisă partajarea datelor de acces (utilizator și parolă) cu alte persoane. Identificarea utilizării concomitente a aceluiași cont de pe dispozitive diferite în mod abuziv poate duce la suspendarea imediată a contului.',
      ],
    },
    {
      title: '3. Serviciile MathUP și Modelul de Acces (SaaS)',
      paragraphs: [
        'Descrierea serviciului: MathUP oferă acces la materiale educaționale, exerciții practice interactive, simulări de examen și statistici de progres specifice programei de Bacalaureat la matematică.',
        'Abonamente și simulări de plată: Accesul la funcționalitățile premium se face pe bază de simulare de abonament sau pachete tarifare afișate pe site. Deoarece platforma funcționează ca un proiect pilot (MVP), plățile pot fi rulate în mod test prin intermediul procesatorului de plăți integrat.',
      ],
    },
    {
      title: '4. Dreptul de Retragere și Politica de Rambursare',
      paragraphs: [
        'Conform OUG 34/2014 (art. 16, lit. m), contractele de furnizare de conținut digital care nu este livrat pe un suport material sunt exceptate de la dreptul de retragere în termen de 14 zile, din momentul în care prestarea a început cu acordul prealabil expres al consumatorului.',
        'Prin urmare, din momentul în care ați primit acces la contul MathUP și la materialele aferente, eventualele plăți efectuate în cadrul simulărilor nu sunt rambursabile.',
      ],
    },
    {
      title: '5. Proprietatea Intelectuală (Drepturi de Autor)',
      paragraphs: [
        `Întregul conținut al Platformei MathUP – incluzând enunțuri și rezolvări de probleme, teste, algoritmi de generare a exercițiilor, elemente de grafică, design de interfață și codul sursă de pe domeniul ${PLATFORM.url} – este proprietatea intelectuală a echipei fondatoare MathUP și este protejat de Legea nr. 8/1996 privind dreptul de autor.`,
        'Este strict interzisă:',
      ],
      list: [
        'Copierea, extragerea sau descărcarea bazei de date cu exerciții și rezolvări fără acordul scris al echipei.',
        'Distribuirea materialelor din platformă pe alte rețele sociale sau grupuri de chat (Discord, WhatsApp, Telegram, TikTok etc.).',
        'Utilizarea platformei în scopuri comerciale de către terți (ex: centre de meditații).',
      ],
    },
    {
      title: '6. Exonerarea de Răspundere (Limitarea Răspunderii)',
      paragraphs: [
        'Nicio garanție a rezultatului: MathUP este un instrument tehnologic de sprijin în procesul de învățare. Echipa MathUP nu garantează obținerea unei anumite note sau promovarea sigură a examenului de Bacalaureat. Succesul la examen depinde exclusiv de efortul individual și nivelul de pregătire al fiecărui elev.',
        'Statutul de Proiect (MVP): Utilizatorul înțelege că aplicația este un proiect de startup aflat în fază de dezvoltare și testare. Ca atare, pot exista erori de programare, întreruperi temporare ale serviciului sau modificări ale interfeței. Furnizorul nu își asumă răspunderea pentru pierderile de date sau erorile tehnice apărute în timpul utilizării.',
      ],
    },
    {
      title: '7. Protecția Datelor cu Caracter Personal (GDPR)',
      paragraphs: [
        'MathUP colectează și prelucrează date cu caracter personal (nume, prenume, adresa de e-mail, parola criptată și statisticile de progres la matematică) în conformitate cu Regulamentul (UE) 2016/679 (GDPR).',
        'Datele sunt colectate strict pentru crearea contului, personalizarea experienței de învățare și funcționarea tehnică a aplicației.',
        `Fiind un proiect de testare, datele dumneavoastră sunt în siguranță, nu vor fi vândute și nu vor fi transmise către terți. Utilizatorul are dreptul de a solicita ștergerea definitivă a contului și a datelor asociate printr-un e-mail trimis la adresa de contact a proiectului (${OPERATOR.email}).`,
        'Pentru detalii complete, consultați Politica de Confidențialitate MathUP.',
      ],
    },
    {
      title: '8. Legea Aplicabilă și Litigii',
      paragraphs: [
        `Prezenții termeni sunt guvernați de legislația din România. Orice neînțelegere sau dispută apărută în legătură cu utilizarea platformei ${PLATFORM.url} se va soluționa pe cale amiabilă între utilizator și echipa de dezvoltare.`,
        `Pentru întrebări: ${OPERATOR.email}.`,
      ],
    },
  ]
}

export function getTermsAndConditionsTitle() {
  return 'Termeni și Condiții de Utilizare a Platformei MathUP'
}
