'use strict';
// Exam catalogue. Everything here is DATA, not code: admins can add exams/subjects/topics through the API,
// and each exam owns its own subject/topic rows so content never mixes between exams.
// `verified: 0` means the pattern numbers are a starting point and must be confirmed against the official notification.

const T = {
  'Mathematics (NDA)': ['Algebra','Sets','Relations & Functions','Complex Numbers','Quadratic Equations','Sequences & Series','Permutation & Combination','Binomial Theorem','Trigonometry','Matrices & Determinants','Coordinate Geometry','Analytical Geometry (3D)','Differential Calculus','Integral Calculus','Differential Equations','Vector Algebra','Statistics','Probability','Logarithms'],
  'Quantitative Aptitude': ['Number System','Percentage','Profit & Loss','Ratio & Proportion','Average','Time & Work','Time, Speed & Distance','Simple & Compound Interest','Algebra','Geometry','Mensuration','Trigonometry','Data Interpretation'],
  'Elementary Mathematics': ['Number System','Arithmetic','Algebra','Trigonometry','Geometry','Mensuration','Statistics'],
  'Mathematics': ['Number System','Arithmetic','Algebra','Geometry','Mensuration','Trigonometry','Statistics'],
  'Reasoning': ['Analogy','Classification','Series','Coding-Decoding','Blood Relations','Direction Sense','Syllogism','Venn Diagrams','Order & Ranking','Puzzles & Seating Arrangement','Non-Verbal Reasoning'],
  'English': ['Reading Comprehension','Grammar','Vocabulary','Error Spotting','Sentence Improvement','Cloze Test','Para Jumbles','Idioms & Phrases'],
  'General Awareness': ['History','Geography','Polity','Economy','General Science','Static GK','Current Affairs'],
  'General Knowledge': ['History','Geography','Polity','Economy','General Science','Static GK','Current Affairs'],
  'Banking Awareness': ['Banking Basics','RBI & Monetary Policy','Financial Markets','Insurance','Government Schemes','Banking Terms'],
  'Computer Awareness': ['Fundamentals','Hardware & Software','Operating Systems','MS Office','Networking & Internet','Cyber Security'],
  'Physics (JEE/NEET)': ['Units & Measurements','Kinematics','Laws of Motion','Work, Energy & Power','Rotational Motion','Gravitation','Thermodynamics','Waves & Oscillations','Electrostatics','Current Electricity','Magnetism','Optics','Modern Physics'],
  'Chemistry (JEE/NEET)': ['Some Basic Concepts','Atomic Structure','Chemical Bonding','Thermodynamics','Equilibrium','Electrochemistry','Chemical Kinetics','Periodic Table','Coordination Compounds','Organic Basics','Hydrocarbons','Biomolecules'],
  'Mathematics (JEE)': ['Sets & Relations','Complex Numbers','Quadratic Equations','Sequences & Series','Permutations & Combinations','Binomial Theorem','Matrices & Determinants','Limits & Continuity','Differentiation','Integration','Differential Equations','Coordinate Geometry','Vectors & 3D','Probability','Trigonometry'],
  'Biology (NEET)': ['Diversity of Living World','Cell Structure & Function','Plant Physiology','Human Physiology','Genetics & Evolution','Reproduction','Biotechnology','Ecology & Environment'],
  'Physics': ['Mechanics','Heat & Thermodynamics','Waves & Sound','Light','Electricity & Magnetism','Modern Physics'],
  'Chemistry': ['Matter & Atomic Structure','Chemical Reactions','Acids, Bases & Salts','Metals & Non-metals','Carbon Compounds','Everyday Chemistry'],
  'General Science': ['Physics Basics','Chemistry Basics','Biology Basics','Health & Nutrition'],
  'History': ['Ancient India','Medieval India','Modern India','Freedom Struggle','World History'],
  'Geography': ['Physical Geography','Indian Geography','World Geography','Climate & Rivers'],
  'Polity': ['Constitution','Fundamental Rights & Duties','Parliament','Judiciary','Federalism','Local Government'],
  'Economy': ['Basic Concepts','Indian Economy','Budget & Taxation','Banking & Money','Poverty & Planning'],
  'Environment & Ecology': ['Ecology Basics','Biodiversity','Climate Change','Environmental Laws'],
  'Science & Technology': ['Space','Defence Technology','Biotechnology','IT & Communication','Energy'],
  'Current Affairs': ['National','International','Economy','Defence','Science & Tech','Awards & Appointments','Sports'],
  'CSAT': ['Comprehension','Logical Reasoning','Basic Numeracy','Data Interpretation'],
  'Child Development & Pedagogy': ['Development','Learning & Pedagogy','Inclusive Education','Teaching Methods'],
  'Language (Hindi/English)': ['Comprehension','Grammar','Pedagogy of Language'],
  'EVS / Science Pedagogy': ['Concepts','Pedagogical Issues'],
  'Verbal Ability (AFCAT)': ['Comprehension','Error Detection','Synonyms & Antonyms','Sentence Completion'],
  'Numerical Ability (AFCAT)': ['Decimal & Fractions','Time & Work','Average','Profit & Loss','Ratio','Percentage','Speed & Distance'],
  'Military Aptitude': ['Verbal Reasoning','Spatial Ability','Non-Verbal Reasoning'],
  'Defence Awareness': ['Armed Forces Structure','Ranks & Insignia','Defence Exercises','Defence Technology','Military History'],
  'Legal Reasoning': ['Legal Principles','Case Passages','Constitutional Law Basics'],
  'Logical Reasoning': ['Arguments','Assumptions','Inference','Analogies'],
  'General Test (CUET)': ['General Knowledge','Current Affairs','Numerical Ability','Logical & Analytical Reasoning'],
  'Hindi': ['Vyakaran','Comprehension','Vocabulary'],
};

// [category, name, duration(min), questions, totalMarks, negativePerWrong, verified, subjects[], note]
const E = [
  ['Defence','NDA',300,270,900,null,0,['Mathematics (NDA)','English','Physics','Chemistry','General Science','History','Geography','Current Affairs'],'Two papers: Mathematics and GAT. Marks/negative differ per paper; confirm in the UPSC notification.'],
  ['Defence','CDS',120,100,100,0.33,0,['English','General Knowledge','Elementary Mathematics'],'Separate papers per subject; confirm in the notification.'],
  ['Defence','CAPF (AC)',120,125,250,null,0,['General Awareness','English'],'Confirm in notification.'],
  ['Defence','AFCAT',120,100,300,1,0,['General Awareness','Verbal Ability (AFCAT)','Numerical Ability (AFCAT)','Military Aptitude'],'Confirm in notification.'],
  ['Defence','Agniveer (Defence Recruitment)',60,50,200,1,0,['General Knowledge','General Science','Mathematics','Reasoning'],'Varies by trade; confirm in notification.'],
  ['UPSC','UPSC Civil Services (Prelims)',120,100,200,0.66,1,['History','Geography','Polity','Economy','Environment & Ecology','Science & Technology','Current Affairs','CSAT'],'GS Paper I: 100 Q, 2 marks each, 1/3 negative. CSAT is qualifying (33%).'],
  ['UPSC','UPSC CAPF (AC)',120,125,250,null,0,['General Awareness','English'],'Confirm in notification.'],
  ['UPSC','Other UPSC Examinations',120,100,200,null,0,['General Knowledge','English','Reasoning'],'Select the specific exam pattern once admin configures it.'],
  ['SSC','SSC CGL (Tier 1)',60,100,200,0.5,1,['Reasoning','General Awareness','Quantitative Aptitude','English'],'25 questions per section, 2 marks each.'],
  ['SSC','SSC CHSL (Tier 1)',60,100,200,0.5,1,['Reasoning','General Awareness','Quantitative Aptitude','English'],'25 questions per section, 2 marks each.'],
  ['SSC','SSC MTS',90,90,270,null,0,['Reasoning','General Awareness','Quantitative Aptitude','English'],'Confirm in notification.'],
  ['SSC','SSC GD',60,80,160,0.25,0,['Reasoning','General Knowledge','Elementary Mathematics','Hindi'],'Confirm in notification.'],
  ['SSC','SSC CPO',120,200,200,0.25,0,['Reasoning','General Awareness','Quantitative Aptitude','English'],'Confirm in notification.'],
  ['SSC','SSC Stenographer',120,200,200,0.5,0,['Reasoning','General Awareness','English'],'Confirm in notification.'],
  ['SSC','SSC Selection Post',60,100,200,0.5,0,['Reasoning','General Awareness','Quantitative Aptitude','English'],'Confirm in notification.'],
  ['Banking','SBI PO (Prelims)',60,100,100,0.25,1,['English','Quantitative Aptitude','Reasoning'],'Sectional timing applies.'],
  ['Banking','SBI Clerk (Prelims)',60,100,100,0.25,1,['English','Quantitative Aptitude','Reasoning'],'Sectional timing applies.'],
  ['Banking','IBPS PO (Prelims)',60,100,100,0.25,1,['English','Quantitative Aptitude','Reasoning'],'Sectional timing applies.'],
  ['Banking','IBPS Clerk (Prelims)',60,100,100,0.25,1,['English','Quantitative Aptitude','Reasoning'],'Sectional timing applies.'],
  ['Banking','IBPS RRB PO',45,80,80,0.25,0,['Reasoning','Quantitative Aptitude'],'Prelims; confirm in notification.'],
  ['Banking','IBPS RRB Clerk',45,80,80,0.25,0,['Reasoning','Quantitative Aptitude'],'Prelims; confirm in notification.'],
  ['Banking','RBI Grade B',120,200,200,0.25,0,['General Awareness','English','Quantitative Aptitude','Reasoning','Economy','Banking Awareness'],'Confirm in notification.'],
  ['Banking','RBI Assistant',60,100,100,0.25,0,['English','Quantitative Aptitude','Reasoning'],'Confirm in notification.'],
  ['Banking','NABARD Grade A',120,200,200,0.25,0,['General Awareness','English','Reasoning','Quantitative Aptitude','Computer Awareness','Economy'],'Confirm in notification.'],
  ['Railway','RRB NTPC',90,100,100,0.33,0,['Mathematics','Reasoning','General Awareness'],'CBT 1; confirm in notification.'],
  ['Railway','RRB Group D',90,100,100,0.33,0,['Mathematics','Reasoning','General Science','General Awareness'],'Confirm in notification.'],
  ['Railway','RRB ALP',60,75,75,0.33,0,['Mathematics','Reasoning','General Science','General Awareness'],'CBT 1; confirm in notification.'],
  ['Railway','RRB Technician',90,100,100,0.33,0,['Mathematics','Reasoning','General Science','General Awareness'],'Confirm in notification.'],
  ['Railway','RPF Constable',90,120,120,0.33,0,['General Awareness','Mathematics','Reasoning'],'Confirm in notification.'],
  ['Railway','RPF SI',90,120,120,0.33,0,['General Awareness','Mathematics','Reasoning'],'Confirm in notification.'],
  ['Teaching','CTET',150,150,150,0,1,['Child Development & Pedagogy','Language (Hindi/English)','Mathematics','EVS / Science Pedagogy'],'No negative marking.'],
  ['Teaching','State TET',150,150,150,0,0,['Child Development & Pedagogy','Language (Hindi/English)','Mathematics','EVS / Science Pedagogy'],'State-specific; confirm in notification.'],
  ['Teaching','KVS',180,180,180,0.25,0,['General Awareness','Reasoning','English','Child Development & Pedagogy'],'Confirm in notification.'],
  ['Teaching','NVS',180,180,180,0,0,['General Awareness','Reasoning','English','Child Development & Pedagogy'],'Confirm in notification.'],
  ['Teaching','DSSSB',120,200,200,0.25,0,['General Awareness','Reasoning','English','Mathematics','Child Development & Pedagogy'],'Confirm in notification.'],
  ['Engineering / Medical','JEE Main',180,75,300,1,1,['Physics (JEE/NEET)','Chemistry (JEE/NEET)','Mathematics (JEE)'],'+4 / -1 for MCQs; numerical questions have no negative.'],
  ['Engineering / Medical','JEE Advanced',180,54,null,null,0,['Physics (JEE/NEET)','Chemistry (JEE/NEET)','Mathematics (JEE)'],'Pattern changes yearly; admin should configure.'],
  ['Engineering / Medical','NEET UG',180,180,720,1,1,['Physics (JEE/NEET)','Chemistry (JEE/NEET)','Biology (NEET)'],'+4 / -1.'],
  ['Other','CUET',60,50,250,1,0,['English','General Test (CUET)'],'Varies by domain subject.'],
  ['Other','CLAT',120,120,120,0.25,1,['English','Current Affairs','Legal Reasoning','Logical Reasoning','Quantitative Aptitude'],'1 mark per question.'],
  ['Other','State PCS',120,150,200,0.33,0,['History','Geography','Polity','Economy','Environment & Ecology','Current Affairs'],'State-specific; confirm in notification.'],
  ['Other','State Police',120,150,150,0.25,0,['General Knowledge','Reasoning','Mathematics','Hindi'],'State-specific; confirm in notification.'],
];

function slugify(s) { return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }

function seed(db) {
  const has = db.prepare('SELECT COUNT(*) c FROM exams').get().c;
  if (has) return;
  const insExam = db.prepare('INSERT INTO exams (category,name,slug,duration_min,total_questions,total_marks,negative_marking,pattern_verified,pattern_note) VALUES (?,?,?,?,?,?,?,?,?)');
  const insSub = db.prepare('INSERT INTO subjects (exam_id,name,position) VALUES (?,?,?)');
  const insTopic = db.prepare('INSERT INTO topics (subject_id,name,position) VALUES (?,?,?)');
  db.exec('BEGIN');
  try {
    for (const [cat, name, dur, q, marks, neg, ver, subs, note] of E) {
      const e = insExam.run(cat, name, slugify(name), dur, q, marks, neg, ver, note);
      subs.forEach((s, i) => {
        const sid = insSub.run(e.lastInsertRowid, s.replace(/ \((NDA|JEE\/NEET|JEE|NEET|AFCAT|CUET)\)$/, ''), i).lastInsertRowid;
        (T[s] || []).forEach((t, j) => insTopic.run(sid, t, j));
      });
    }
    db.exec('COMMIT');
  } catch (err) { db.exec('ROLLBACK'); throw err; }
}

module.exports = { seed, slugify };