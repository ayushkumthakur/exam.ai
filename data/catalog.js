// Exam catalog + syllabus. Everything here is seed data: the admin panel can add/edit exams
// at runtime (stored in DB). Patterns are APPROXIMATE defaults and flagged verified:false —
// an admin must confirm them against the official notification.

const TOPICS = {
  Science: ['Matter and Its Nature','Atoms and Molecules','Cell and Tissues','Life Processes','Motion','Force and Laws of Motion','Gravitation','Work Energy and Power','Sound','Light','Electricity','Magnetic Effects','Our Environment','Natural Resources'],
  'English Language & Literature': ['Reading','Grammar','Writing Skills','Literature'],
  'English Core': ['Reading Comprehension','Creative Writing','Literature'],
  'Hindi A': ['अपठित बोध','व्याकरण','लेखन','क्षितिज','कृतिका'],
  'Hindi B': ['अपठित बोध','व्याकरण','लेखन','स्पर्श','संचयन'],
  'Hindi Core': ['अपठित बोध','अभिव्यक्ति और माध्यम','आरोह','वितान'],
  'Legal Studies': ['Judiciary','Constitutional Law','Legal Institutions','Contracts','Torts','Family Law','Criminal Law Basics'],
  Sanskrit: ['शब्दरूप','धातुरूप','सन्धि','समास','अनुवाद','गद्य','पद्य'],
  'Political Science': ['Political Theory','Constitution at Work','Rights','Election and Representation','Executive','Legislature','Judiciary','Federalism','Local Governments','International Relations'],
  Hindi: ['अपठित बोध','व्याकरण','लेखन','गद्य','पद्य'],
  'Social Science': ['History','Geography','Political Science','Economics'],
  'Political Science': ['Constitution at Work','Political Theory','Indian Constitution','Executive & Legislature','Judiciary','Federalism'],
  'Applied Mathematics': ['Numbers','Algebra','Calculus','Financial Mathematics','Statistics','Probability'],
  'Accountancy': ['Introduction to Accounting','Theory Base of Accounting','Recording of Transactions','Bank Reconciliation','Depreciation','Financial Statements','Accounting for Partnership','Company Accounts','Analysis of Financial Statements'],
  'Business Studies': ['Nature & Purpose of Business','Forms of Business Organisation','Private Public & Global Enterprises','Business Services','Emerging Modes of Business','Social Responsibility','Sources of Business Finance','Small Business','Internal Trade','International Business','Principles of Management','Business Environment','Planning','Organising','Staffing','Directing','Controlling','Financial Management','Marketing Management','Consumer Protection'],
  'Political Science': ['Constitution at Work','Political Theory','Indian Constitution','Executive & Legislature','Judiciary','Federalism'],
  'Psychology': ['Introduction to Psychology','Methods of Enquiry','Human Development','Sensory Attention and Perception','Learning','Human Memory','Thinking','Motivation and Emotion','Variations in Psychological Attributes','Self and Personality','Meeting Life Challenges'],
  'Sociology': ['Introducing Sociology','Terms Concepts and their Use in Sociology','Understanding Social Institutions','Culture and Socialisation','Social Change and Social Order','Indian Society','Social Change and Development in India'],
  'Computer Science': ['Computer Systems','Python Programming','Data Structures','Database Concepts','SQL','Computer Networks','Boolean Logic','Computing and Society'],
  'Informatics Practices': ['Data Handling','Python','Database Management','SQL','Data Visualisation','Computer Networks','Societal Impacts'],
  'Physical Education': ['Human Body and Sports','Sports Psychology','Training in Sports','Physical Fitness','Yoga','Biomechanics','Kinesiology','Health & Safety'],
  'Fine Arts': ['Elements of Art','Art Appreciation','Indian Art Heritage','Drawing and Painting','Practical Art'],
  'Entrepreneurship': ['Entrepreneurial Journey','Entrepreneurial Opportunities','Enterprise Marketing','Business Arithmetic','Resource Mobilization'],
  'Computer Applications': ['Networking','HTML','Cyber Safety','Introduction to Programming','Digital Documentation'],
  'Individuals in Society': ['Self and Identity','Family and Community','Society and Relationships','Citizenship and Responsibility'],
  'CT & AI': ['Computational Thinking','Data and Algorithms','Artificial Intelligence Basics','Ethics and Responsible AI','AI Applications'],
  Mathematics: ['Algebra','Sets','Relations & Functions','Complex Numbers','Quadratic Equations','Sequences & Series','Permutation & Combination','Binomial Theorem','Trigonometry','Matrices & Determinants','Coordinate Geometry','Differential Calculus','Integral Calculus','Vector Algebra','Statistics','Probability','Logarithms'],
  'Quantitative Aptitude': ['Number System','Percentage','Ratio & Proportion','Profit & Loss','Time & Work','Time Speed Distance','Simple & Compound Interest','Averages','Algebra','Geometry','Trigonometry','Mensuration','Data Interpretation'],
  Reasoning: ['Analogy','Series','Coding-Decoding','Blood Relations','Direction Sense','Syllogism','Puzzles','Seating Arrangement','Venn Diagrams'],
  English: ['Grammar','Vocabulary','Comprehension','Error Spotting','Sentence Improvement','Cloze Test'],
  'General Awareness': ['Static GK','Current Affairs','Science','Awards & Honours','Books & Authors','Important Days'],
  History: ['Ancient India','Medieval India','Modern India','World History'],
  Geography: ['Physical Geography','Indian Geography','World Geography'],
  Polity: ['Constitution','Fundamental Rights','Parliament','Judiciary'],
  Economics: ['Basic Concepts','Indian Economy','Banking & Finance'],
  Physics: ['Mechanics','Heat & Thermodynamics','Optics','Electricity & Magnetism','Modern Physics'],
  Chemistry: ['Physical Chemistry','Organic Chemistry','Inorganic Chemistry'],
  Biology: ['Cell Biology','Human Physiology','Genetics','Plant Biology'],
  'Banking Awareness': ['Banking Basics','RBI & Monetary Policy','Financial Institutions'],
  'Computer Awareness': ['Fundamentals','Hardware & Software','Networking & Internet'],
  Defence: ['Armed Forces','Defence Exercises','Defence Technology'],
  Environment: ['Ecology','Climate Change','Biodiversity'],
  'Child Pedagogy': ['Development','Learning','Inclusive Education'],
  'Legal Aptitude': ['Legal Reasoning','Constitutional Law','Torts & Contracts'],
};

// helper: section(subject, questions, marksPerQ, negativePerQ)
const S = (subject, q, m, n, paper) => ({ subject, questions: q, marks: m, negative: n, ...(paper ? { paper } : {}) });
const P = (minutes, sections, note, audit) => ({ minutes, sections, note: note || null, ...(audit ? { audit } : {}) });

const EXAMS = [
  // School education — CBSE Classes IX-XII (2026-27 structures; individual school subject combinations may vary).
  // School education — CBSE Classes IX-XII. Students choose their own subjects after selecting class/stream.
  ['CBSE_IX','CBSE Class IX','School · CBSE · Class 9',P(180,[
    S('English Language & Literature',80,1,0),S('Hindi A',80,1,0),S('Hindi B',80,1,0),S('Mathematics',80,1,0),
    S('Science',80,1,0),S('Social Science',80,1,0),S('Sanskrit',80,1,0),S('Computer Applications',50,1,0),S('CT & AI',40,1,0)
  ])],
  ['CBSE_X','CBSE Class X','School · CBSE · Class 10',P(180,[
    S('English Language & Literature',80,1,0),S('Hindi A',80,1,0),S('Hindi B',80,1,0),S('Mathematics',80,1,0),
    S('Science',80,1,0),S('Social Science',80,1,0),S('Sanskrit',80,1,0),S('Computer Applications',50,1,0)
  ])],
  ['CBSE_XI_SCIENCE','CBSE Class XI — Science','School · CBSE · Class 11 · Science',P(180,[
    S('English Core',80,1,0),S('Physics',70,1,0),S('Chemistry',70,1,0),S('Mathematics',80,1,0),
    S('Applied Mathematics',80,1,0),S('Biology',70,1,0),S('Computer Science',70,1,0),S('Informatics Practices',70,1,0),
    S('Physical Education',50,1,0),S('Hindi Core',80,1,0)
  ])],
  ['CBSE_XII_SCIENCE','CBSE Class XII — Science','School · CBSE · Class 12 · Science',P(180,[
    S('English Core',80,1,0),S('Physics',70,1,0),S('Chemistry',70,1,0),S('Mathematics',80,1,0),
    S('Applied Mathematics',80,1,0),S('Biology',70,1,0),S('Computer Science',70,1,0),S('Informatics Practices',70,1,0),
    S('Physical Education',50,1,0),S('Hindi Core',80,1,0)
  ])],
  ['CBSE_XI_COMMERCE','CBSE Class XI — Commerce','School · CBSE · Class 11 · Commerce',P(180,[
    S('English Core',80,1,0),S('Accountancy',80,1,0),S('Business Studies',80,1,0),S('Economics',80,1,0),
    S('Mathematics',80,1,0),S('Applied Mathematics',80,1,0),S('Entrepreneurship',60,1,0),S('Informatics Practices',70,1,0),
    S('Computer Science',70,1,0),S('Physical Education',50,1,0),S('Hindi Core',80,1,0)
  ])],
  ['CBSE_XII_COMMERCE','CBSE Class XII — Commerce','School · CBSE · Class 12 · Commerce',P(180,[
    S('English Core',80,1,0),S('Accountancy',80,1,0),S('Business Studies',80,1,0),S('Economics',80,1,0),
    S('Mathematics',80,1,0),S('Applied Mathematics',80,1,0),S('Entrepreneurship',60,1,0),S('Informatics Practices',70,1,0),
    S('Computer Science',70,1,0),S('Physical Education',50,1,0),S('Hindi Core',80,1,0)
  ])],
  ['CBSE_XI_HUMANITIES','CBSE Class XI — Humanities / Arts','School · CBSE · Class 11 · Humanities',P(180,[
    S('English Core',80,1,0),S('History',80,1,0),S('Political Science',80,1,0),S('Geography',80,1,0),
    S('Economics',80,1,0),S('Sociology',80,1,0),S('Psychology',80,1,0),S('Legal Studies',80,1,0),
    S('Fine Arts',60,1,0),S('Physical Education',50,1,0),S('Hindi Core',80,1,0)
  ])],
  ['CBSE_XII_HUMANITIES','CBSE Class XII — Humanities / Arts','School · CBSE · Class 12 · Humanities',P(180,[
    S('English Core',80,1,0),S('History',80,1,0),S('Political Science',80,1,0),S('Geography',80,1,0),
    S('Economics',80,1,0),S('Sociology',80,1,0),S('Psychology',80,1,0),S('Legal Studies',80,1,0),
    S('Fine Arts',60,1,0),S('Physical Education',50,1,0),S('Hindi Core',80,1,0)
  ])],
  // Defence
  ['NDA','NDA (National Defence Academy)','Defence',P(300,[S('Mathematics',120,2.5,0.833),S('English',50,4,1.333),S('General Awareness',100,4,1.333)])],
  ['CDS','CDS','Defence',P(360,[S('English',120,1,0.333),S('General Awareness',120,1,0.333),S('Mathematics',100,1,0.333)])],
  ['CAPF','CAPF (AC)','Defence',P(120,[S('General Awareness',100,2,0.667),S('English',25,2,0.667),S('Reasoning',25,2,0.667)])],
  ['AFCAT','AFCAT','Defence',P(120,[S('General Awareness',25,3,1),S('English',30,3,1),S('Quantitative Aptitude',18,3,1),S('Reasoning',27,3,1)])],
  ['AGNIVEER','Agniveer / Defence Recruitment','Defence',P(60,[S('General Awareness',25,1,0.25),S('Mathematics',25,1,0.25),S('Reasoning',25,1,0.25),S('English',25,1,0.25)])],
  // UPSC
  ['UPSC_CSE','UPSC CSE Prelims — Paper I (General Studies)','UPSC',P(120,[
    S('History',17,2,0.667),S('Geography',17,2,0.667),S('Polity',17,2,0.667),
    S('Economics',17,2,0.667),S('Environment',16,2,0.667),S('General Awareness',16,2,0.667)
  ],'Official baseline: 100 questions, 200 marks, 120 minutes; incorrect answers attract one-third of the marks assigned to the question as negative marking. Subject-wise counts below are adjustable practice allocations, not an official UPSC subject quota. This app currently models Prelims MCQs, not UPSC Mains descriptive papers. Only label source-backed questions as Verified PYQ.', {
    status: 'partially_verified', checkedAt: '2026-10-10', sourceName: 'UPSC Civil Services (Preliminary) Examination 2026 notice and official question papers', sourceUrl: 'https://www.upsc.gov.in/examinations/Civil%20Services%20%28Preliminary%29%20Examination%2C%202026',
    verifiedFields: ['totalQuestions', 'maximumMarks', 'durationMinutes', 'negativeMarking'], approximateFields: ['subjectWiseQuestionCounts'],
    runtimeLimitations: ['UPSC Mains descriptive answer papers are not implemented as a separate workflow.']
  })],
  ['UPSC_CSAT','UPSC CSAT — Prelims Paper II (Qualifying)','UPSC',P(120,[
    S('Quantitative Aptitude',28,2.5,0.833),S('Reasoning',26,2.5,0.833),S('English',26,2.5,0.833)
  ],'Official baseline: 80 questions, 200 marks, 120 minutes; qualifying at 33%, with one-third negative marking for wrong answers. Subject-wise allocation below is adjustable practice allocation, not an official fixed split. Questions are practice content unless explicitly labelled Verified PYQ.', {
    status: 'partially_verified', checkedAt: '2026-10-10', sourceName: 'UPSC Civil Services (Preliminary) Examination 2026 notice and official question papers', sourceUrl: 'https://www.upsc.gov.in/examinations/Civil%20Services%20%28Preliminary%29%20Examination%2C%202026',
    verifiedFields: ['totalQuestions', 'maximumMarks', 'durationMinutes', 'qualifyingThreshold', 'negativeMarking'], approximateFields: ['subjectWiseQuestionCounts'],
    runtimeLimitations: ['CSAT is an internal paper record and is not shown as a separate exam choice.']
  })],
  ['UPSC_CAPF','UPSC CAPF','UPSC',P(120,[S('General Awareness',100,2,0.667),S('English',25,2,0.667),S('Reasoning',25,2,0.667)])],
  ['UPSC_OTHER','Other UPSC Examinations','UPSC',P(120,[S('General Awareness',50,2,0.667),S('English',25,2,0.667),S('Reasoning',25,2,0.667)])],
  // SSC
  ['SSC_CGL','SSC CGL (Tier 1)','SSC',P(60,[S('Reasoning',25,2,0.5),S('General Awareness',25,2,0.5),S('Quantitative Aptitude',25,2,0.5),S('English',25,2,0.5)], 'SSC CGL 2026 Tier-I baseline: 100 questions, 200 marks, 60 minutes, 0.50 negative marks per wrong answer. The official paper uses 15-minute sectional timers; this app currently has a single overall timer and does not enforce sectional timers. SSC CGL Tier-II has a different multi-session structure and is not represented by this Tier-I pattern.', {
    status: 'verified_baseline_with_runtime_gap', checkedAt: '2026-10-10', sourceName: 'SSC Combined Graduate Level Examination 2026 official notice, section 13.8', sourceUrl: 'https://ssc.gov.in/api/attachment/uploads/masterData/NoticeBoards/Notice_of_adv_cgl_2026.pdf',
    verifiedFields: ['totalQuestions', 'maximumMarks', 'durationMinutes', 'negativeMarking', 'sectionQuestionCounts', 'sectionTimingMinutes'], approximateFields: [], sectionTimingMinutes: 15,
    runtimeLimitations: ['Official 15-minute per-section timers are not enforced; only one overall timer is available.', 'SSC CGL Tier-II is not yet a separate selectable mock pattern.']
  })],
  ['SSC_CHSL','SSC CHSL (Tier 1)','SSC',P(60,[S('English',25,2,0.5),S('Reasoning',25,2,0.5),S('Quantitative Aptitude',25,2,0.5),S('General Awareness',25,2,0.5)])],
  ['SSC_MTS','SSC MTS','SSC',P(90,[S('Reasoning',25,1,0.25),S('Quantitative Aptitude',25,1,0.25),S('English',25,1,0.25),S('General Awareness',25,1,0.25)])],
  ['SSC_GD','SSC GD','SSC',P(60,[S('Reasoning',20,2,0.5),S('General Awareness',20,2,0.5),S('Mathematics',20,2,0.5),S('English',20,2,0.5)])],
  ['SSC_CPO','SSC CPO (Paper 1)','SSC',P(120,[S('Reasoning',50,1,0.25),S('General Awareness',50,1,0.25),S('Quantitative Aptitude',50,1,0.25),S('English',50,1,0.25)])],
  ['SSC_STENO','SSC Stenographer','SSC',P(120,[S('Reasoning',50,1,0.25),S('General Awareness',50,1,0.25),S('English',100,1,0.25)])],
  ['SSC_SELECTION','SSC Selection Post','SSC',P(60,[S('General Awareness',25,2,0.5),S('Reasoning',25,2,0.5),S('Quantitative Aptitude',25,2,0.5),S('English',25,2,0.5)])],
  // Banking
  ['SBI_PO','SBI PO (Prelims)','Banking',P(60,[S('English',30,1,0.25),S('Quantitative Aptitude',35,1,0.25),S('Reasoning',35,1,0.25)])],
  ['SBI_CLERK','SBI Clerk (Prelims)','Banking',P(60,[S('English',30,1,0.25),S('Quantitative Aptitude',35,1,0.25),S('Reasoning',35,1,0.25)])],
  ['IBPS_PO','IBPS PO (Prelims)','Banking',P(60,[S('English',30,1,0.25),S('Quantitative Aptitude',35,1,0.25),S('Reasoning',35,1,0.25)])],
  ['IBPS_CLERK','IBPS Clerk (Prelims)','Banking',P(60,[S('English',30,1,0.25),S('Quantitative Aptitude',35,1,0.25),S('Reasoning',35,1,0.25)])],
  ['IBPS_RRB_PO','IBPS RRB PO','Banking',P(45,[S('Reasoning',40,1,0.25),S('Quantitative Aptitude',40,1,0.25)])],
  ['IBPS_RRB_CLERK','IBPS RRB Clerk','Banking',P(45,[S('Reasoning',40,1,0.25),S('Quantitative Aptitude',40,1,0.25)])],
  ['RBI_B','RBI Grade B (Phase 1)','Banking',P(120,[S('General Awareness',80,1,0.25),S('English',30,1,0.25),S('Quantitative Aptitude',30,1,0.25),S('Reasoning',60,1,0.25)], 'RBI Grade B General Cadre Phase-I baseline: 200 questions, 200 marks, 120 minutes; section allocation is GA 80, English 30, Quant 30, Reasoning 60, with one-quarter negative marking for wrong answers. Phase-II uses separate papers and descriptive answer-writing; this MCQ pattern is Phase-I only.', {
    status: 'verified_baseline', checkedAt: '2026-10-10', sourceName: 'RBI Officers in Grade B (DR) General Cadre 2026 official notice and Phase-I handout/results', sourceUrl: 'https://opportunities.rbi.org.in/Scripts/bs_viewcontent.aspx?Id=4997',
    supportingSourceUrl: 'https://opportunities.rbi.org.in/Scripts/bs_viewcontent.aspx?Id=5055', verifiedFields: ['totalQuestions', 'maximumMarks', 'durationMinutes', 'negativeMarking', 'sectionQuestionCounts'], approximateFields: [],
    runtimeLimitations: ['RBI Grade B Phase-II descriptive papers are not implemented as a separate workflow.']
  })],
  ['RBI_ASST','RBI Assistant (Prelims)','Banking',P(60,[S('English',30,1,0.25),S('Quantitative Aptitude',35,1,0.25),S('Reasoning',35,1,0.25)])],
  ['NABARD_A','NABARD Grade A (Prelims)','Banking',P(120,[S('Reasoning',20,1,0.25),S('English',40,1,0.25),S('Quantitative Aptitude',20,1,0.25),S('General Awareness',20,1,0.25),S('Banking Awareness',60,1,0.25)])],
  // Railway
  ['RRB_NTPC','RRB NTPC (CBT 1)','Railway',P(90,[S('General Awareness',40,1,0.333),S('Mathematics',30,1,0.333),S('Reasoning',30,1,0.333)])],
  ['RRB_GROUP_D','RRB Group D','Railway',P(90,[S('Mathematics',25,1,0.333),S('Reasoning',30,1,0.333),S('General Awareness',45,1,0.333)])],
  ['RRB_ALP','RRB ALP (CBT 1)','Railway',P(60,[S('Mathematics',20,1,0.333),S('Reasoning',25,1,0.333),S('General Awareness',30,1,0.333)])],
  ['RRB_TECH','RRB Technician (CBT 1)','Railway',P(90,[S('Mathematics',20,1,0.333),S('Reasoning',25,1,0.333),S('General Awareness',55,1,0.333)])],
  ['RPF_CONST','RPF Constable','Railway',P(90,[S('Mathematics',35,1,0.333),S('Reasoning',35,1,0.333),S('General Awareness',50,1,0.333)])],
  ['RPF_SI','RPF SI','Railway',P(90,[S('Mathematics',35,1,0.333),S('Reasoning',35,1,0.333),S('General Awareness',50,1,0.333)])],
  // Teaching
  ['CTET','CTET (Paper 1)','Teaching',P(150,[S('Child Pedagogy',30,1,0),S('English',30,1,0),S('Mathematics',30,1,0),S('General Awareness',30,1,0)])],
  ['STATE_TET','State TET','Teaching',P(150,[S('Child Pedagogy',30,1,0),S('English',30,1,0),S('Mathematics',30,1,0),S('General Awareness',60,1,0)])],
  ['KVS','KVS','Teaching',P(180,[S('General Awareness',20,1,0.25),S('English',20,1,0.25),S('Reasoning',20,1,0.25),S('Child Pedagogy',40,1,0.25)])],
  ['NVS','NVS','Teaching',P(180,[S('General Awareness',20,1,0.25),S('English',20,1,0.25),S('Reasoning',20,1,0.25),S('Child Pedagogy',40,1,0.25)])],
  ['DSSSB','DSSSB','Teaching',P(120,[S('General Awareness',20,1,0.25),S('Reasoning',20,1,0.25),S('English',20,1,0.25),S('Child Pedagogy',40,1,0.25)])],
  // Engineering / Medical
  ['JEE_MAIN','JEE Main','Engineering / Medical',P(180,[S('Physics',25,4,1),S('Chemistry',25,4,1),S('Mathematics',25,4,1)])],
  ['JEE_ADV','JEE Advanced','Engineering / Medical',P(180,[S('Physics',18,3,1),S('Chemistry',18,3,1),S('Mathematics',18,3,1)],'Real JEE Advanced uses mixed marking schemes; this is a simplified default.')],
  ['NEET','NEET UG','Engineering / Medical',P(180,[S('Physics',45,4,1),S('Chemistry',45,4,1),S('Biology',90,4,1)])],
  // Other
  ['CUET','CUET (UG)','Other',P(60,[S('English',25,5,1),S('General Awareness',25,5,1),S('Mathematics',25,5,1)])],
  ['CLAT','CLAT (UG)','Other',P(120,[S('English',28,1,0.25),S('General Awareness',35,1,0.25),S('Legal Aptitude',35,1,0.25),S('Reasoning',28,1,0.25),S('Mathematics',14,1,0.25)])],
  ['STATE_PCS','State PCS (Prelims)','Other',P(120,[S('History',30,2,0.667),S('Geography',25,2,0.667),S('Polity',25,2,0.667),S('Economics',20,2,0.667)])],
  ['STATE_POLICE','State Police','Other',P(120,[S('General Awareness',50,1,0.25),S('Reasoning',50,1,0.25),S('Mathematics',50,1,0.25)])],
  ['OTHER_GEN','Other Competitive Exam (General)','Other',P(90,[S('General Awareness',30,1,0.25),S('Reasoning',30,1,0.25),S('Quantitative Aptitude',20,1,0.25),S('English',20,1,0.25)])],
].map(([id,name,category,pattern]) => ({ id, name, category, pattern, verified: false }));

// Subject names used in patterns that must resolve to topic trees
const SUBJECT_ALIASES = { Mathematics: 'Mathematics' };

function syllabusFor(exam) {
  return exam.pattern.sections.map(s => ({ subject: s.subject, topics: TOPICS[s.subject] || ['General'] }));
}

// Static, hand-checked revision notes (other topics fall back to AI-generated notes when AI is configured)
const NOTES = {
  'Mathematics|Trigonometry': {
    concepts: ['Ratios: sinθ = P/H, cosθ = B/H, tanθ = P/B (right triangle).','Reciprocals: cosecθ = 1/sinθ, secθ = 1/cosθ, cotθ = 1/tanθ.','Identities hold for all θ where defined; ratios are periodic (sin, cos: 360°; tan: 180°).'],
    formulas: ['sin²θ + cos²θ = 1','1 + tan²θ = sec²θ','1 + cot²θ = cosec²θ','sin(A±B) = sinA cosB ± cosA sinB','cos(A±B) = cosA cosB ∓ sinA sinB','cos2θ = cos²θ − sin²θ = 1 − 2sin²θ = 2cos²θ − 1','sin2θ = 2 sinθ cosθ'],
    keypoints: ['Memorise values at 0°, 30°, 45°, 60°, 90°.','Use ASTC to decide signs by quadrant.','Convert everything to sin/cos when stuck.'],
    examples: [{ q: 'Find sin²30° + cos²30°.', a: 'By the identity sin²θ + cos²θ = 1, the value is 1.' }],
  },
  'Mathematics|Probability': {
    concepts: ['P(E) = favourable outcomes / total equally likely outcomes, 0 ≤ P(E) ≤ 1.','Complement: P(not E) = 1 − P(E).','Independent events: P(A and B) = P(A)·P(B).'],
    formulas: ['P(A∪B) = P(A) + P(B) − P(A∩B)','P(A|B) = P(A∩B)/P(B)','Binomial: P(X=r) = nCr · pʳ · qⁿ⁻ʳ'],
    keypoints: ['Check that outcomes are equally likely before using favourable/total.','"At least one" is usually easiest as 1 − P(none).'],
    examples: [{ q: 'Probability of a sum of 7 with two fair dice?', a: 'Favourable: (1,6),(2,5),(3,4),(4,3),(5,2),(6,1) = 6 of 36, so 1/6.' }],
  },
  'Mathematics|Quadratic Equations': {
    concepts: ['Standard form ax² + bx + c = 0, a ≠ 0.','Discriminant D = b² − 4ac decides the nature of roots.'],
    formulas: ['x = [−b ± √(b² − 4ac)] / 2a','Sum of roots = −b/a','Product of roots = c/a','D > 0: two distinct real; D = 0: equal real; D < 0: complex'],
    keypoints: ['Check D before solving when only the nature of roots is asked.'],
    examples: [{ q: 'Sum of roots of x² − 5x + 6 = 0?', a: 'Sum = −(−5)/1 = 5 (roots are 2 and 3).' }],
  },
};

module.exports = { TOPICS, EXAMS, syllabusFor, NOTES };