// Paleta de simboluri și termeni LaTeX pentru editorul de lecții (Bacalaureat M1/M2/M3).
// Fiecare element are:
//   - label: ce vede profesorul pe buton
//   - snippet: codul LaTeX inserat (fără delimitatorii $; aceștia se adaugă în toolbar)
//   - cursorOffset (opțional): poziția caret-ului în interiorul snippet-ului după inserare,
//     ex. în prima pereche `{}`, ca profesorul să poată tasta direct conținutul.
export const MATH_CATEGORIES = [
  {
    id: 'greek',
    label: 'Litere grecești',
    items: [
      { label: 'α', snippet: '\\alpha ' },
      { label: 'β', snippet: '\\beta ' },
      { label: 'γ', snippet: '\\gamma ' },
      { label: 'δ', snippet: '\\delta ' },
      { label: 'Δ', snippet: '\\Delta ' },
      { label: 'ε', snippet: '\\varepsilon ' },
      { label: 'θ', snippet: '\\theta ' },
      { label: 'λ', snippet: '\\lambda ' },
      { label: 'μ', snippet: '\\mu ' },
      { label: 'π', snippet: '\\pi ' },
      { label: 'ρ', snippet: '\\rho ' },
      { label: 'σ', snippet: '\\sigma ' },
      { label: 'φ', snippet: '\\varphi ' },
      { label: 'ω', snippet: '\\omega ' },
      { label: 'Ω', snippet: '\\Omega ' },
    ],
  },
  {
    id: 'rel',
    label: 'Operatori și relații',
    items: [
      { label: '≤', snippet: '\\le ' },
      { label: '≥', snippet: '\\ge ' },
      { label: '≠', snippet: '\\ne ' },
      { label: '≈', snippet: '\\approx ' },
      { label: '±', snippet: '\\pm ' },
      { label: '∓', snippet: '\\mp ' },
      { label: '×', snippet: '\\times ' },
      { label: '÷', snippet: '\\div ' },
      { label: '·', snippet: '\\cdot ' },
      { label: '∈', snippet: '\\in ' },
      { label: '∉', snippet: '\\notin ' },
      { label: '⊂', snippet: '\\subset ' },
      { label: '⊆', snippet: '\\subseteq ' },
      { label: '∪', snippet: '\\cup ' },
      { label: '∩', snippet: '\\cap ' },
      { label: '∅', snippet: '\\emptyset ' },
      { label: '∞', snippet: '\\infty ' },
      { label: '→', snippet: '\\to ' },
      { label: '⇒', snippet: '\\Rightarrow ' },
      { label: '⇔', snippet: '\\Leftrightarrow ' },
      { label: '∀', snippet: '\\forall ' },
      { label: '∃', snippet: '\\exists ' },
    ],
  },
  {
    id: 'powindex',
    label: 'Puteri și indici',
    items: [
      { label: 'xⁿ', snippet: 'x^{}', cursorOffset: 3 },
      { label: 'xₙ', snippet: 'x_{}', cursorOffset: 3 },
      { label: 'x²', snippet: 'x^{2}' },
      { label: '|x|', snippet: '\\left| \\right|', cursorOffset: 6 },
    ],
  },
  {
    id: 'fracroot',
    label: 'Fracții și radicali',
    items: [
      { label: 'a/b', snippet: '\\frac{}{}', cursorOffset: 6 },
      { label: '√', snippet: '\\sqrt{}', cursorOffset: 6 },
      { label: 'ⁿ√', snippet: '\\sqrt[]{}', cursorOffset: 6 },
    ],
  },
  {
    id: 'bigops',
    label: 'Sume, integrale, limite',
    items: [
      { label: '∑', snippet: '\\sum_{}^{}', cursorOffset: 6 },
      { label: '∏', snippet: '\\prod_{}^{}', cursorOffset: 7 },
      { label: '∫', snippet: '\\int_{}^{}', cursorOffset: 6 },
      { label: 'lim', snippet: '\\lim_{ \\to }', cursorOffset: 6 },
      { label: 'lim →∞', snippet: '\\lim_{ \\to \\infty}', cursorOffset: 6 },
    ],
  },
  {
    id: 'triglog',
    label: 'Trigonometrie și logaritmi',
    items: [
      { label: 'sin', snippet: '\\sin ' },
      { label: 'cos', snippet: '\\cos ' },
      { label: 'tg', snippet: '\\tan ' },
      { label: 'ctg', snippet: '\\cot ' },
      { label: 'ln', snippet: '\\ln ' },
      { label: 'log', snippet: '\\log_{}', cursorOffset: 6 },
    ],
  },
  {
    id: 'matvec',
    label: 'Matrice și vectori',
    items: [
      { label: 'vector', snippet: '\\vec{}', cursorOffset: 5 },
      { label: 'matrice 2×2', snippet: '\\begin{pmatrix} & \\\\ & \\end{pmatrix}', cursorOffset: 15 },
    ],
  },
  {
    id: 'templates',
    label: 'Formule gata făcute',
    items: [
      { label: 'Ecuație gr. II', snippet: 'ax^2 + bx + c = 0' },
      { label: 'Discriminant', snippet: '\\Delta = b^2 - 4ac' },
      { label: 'Soluții gr. II', snippet: 'x_{1,2} = \\frac{-b \\pm \\sqrt{\\Delta}}{2a}' },
    ],
  },
]
