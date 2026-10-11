// Curated, deterministic expansion for the three priority exam families.
// These are original ADMIN_PRACTICE items, never official/verified PYQs.
const FACTS = {
  History: [
    ["The Revolt of 1857 began at Meerut.",true,"The uprising spread from Meerut in May 1857."],
    ["The Indian National Congress was founded in 1885.",true,"The INC was founded in 1885."],
    ["The Quit India Movement was launched in 1942.",true,"The movement was launched in August 1942."],
    ["The Dandi March took place in 1930.",true,"Gandhi's salt march culminated at Dandi in April 1930."],
    ["The Non-Cooperation Movement was launched in 1920.",true,"The movement was adopted by the Congress in 1920."],
    ["The Permanent Settlement was introduced under Lord Cornwallis in 1793.",true,"The Permanent Settlement dates to 1793."],
    ["The Battle of Plassey was fought in 1757.",true,"The Battle of Plassey took place in 1757."],
    ["Babur founded the Mughal Empire in India after the First Battle of Panipat in 1526.",true,"The First Battle of Panipat in 1526 established Babur's rule in north India."],
    ["The Harappan script has been conclusively deciphered.",false,"The Indus/Harappan script has not been conclusively deciphered."],
    ["The Simon Commission arrived in India in 1928.",true,"The Simon Commission arrived in 1928 and faced protests because it had no Indian members."],
    ["The Jallianwala Bagh massacre occurred in 1919.",true,"The massacre took place in Amritsar on 13 April 1919."],
    ["The Government of India Act, 1935 introduced provincial autonomy.",true,"Provincial autonomy was a key feature of the 1935 Act."],
  ],
  Geography: [
    ["The Tropic of Cancer passes through India.",true,"The Tropic of Cancer crosses eight Indian states."],
    ["The Narmada River generally flows westward into the Arabian Sea.",true,"The Narmada flows west through a rift valley toward the Arabian Sea."],
    ["The Western Ghats lie east of the Eastern Ghats.",false,"The Western Ghats lie along India's western side; the Eastern Ghats are farther east."],
    ["The Indian Standard Meridian is 82°30′ east longitude.",true,"Indian Standard Time is based on 82°30′ E longitude."],
    ["The Himalayas are young fold mountains.",true,"The Himalayas are geologically young fold mountains."],
    ["Black soil is associated with cotton cultivation in parts of India.",true,"Black regur soil retains moisture and is well suited to cotton in many regions."],
    ["The Thar Desert is located mainly in Rajasthan in India.",true,"Most of India's Thar Desert lies in western Rajasthan."],
    ["Chilika Lake is a freshwater lake.",false,"Chilika is a brackish-water coastal lagoon in Odisha."],
    ["The southwest monsoon is a major source of India's annual rainfall.",true,"The southwest monsoon supplies a large share of India's annual precipitation."],
    ["The Deccan Plateau lies entirely north of the Indo-Gangetic Plain.",false,"The Deccan Plateau is mainly south of the Indo-Gangetic Plain."],
    ["The Sundarbans contain extensive mangrove ecosystems.",true,"The Sundarbans are renowned for mangrove forests in the Ganga-Brahmaputra delta."],
    ["The Coromandel Coast is on the eastern coast of India.",true,"The Coromandel Coast is along the southeastern/eastern coast."],
  ],
  Polity: [
    ["The Constitution of India was adopted on 26 November 1949.",true,"The Constituent Assembly adopted the Constitution on 26 November 1949."],
    ["The Constitution of India came into force on 26 January 1950.",true,"The Constitution commenced on 26 January 1950."],
    ["Fundamental Rights are contained in Part III of the Constitution.",true,"Part III contains Fundamental Rights."],
    ["The Directive Principles of State Policy are contained in Part IV.",true,"Part IV contains the Directive Principles."],
    ["Fundamental Duties are listed in Part IVA of the Constitution.",true,"Part IVA contains Fundamental Duties."],
    ["A Money Bill can be introduced in either House of Parliament.",false,"A Money Bill can be introduced only in the Lok Sabha."],
    ["The Rajya Sabha is a permanent House and is not subject to dissolution.",true,"One-third of Rajya Sabha members retire every two years; the House is not dissolved."],
    ["The President of India is elected directly by all adult citizens.",false,"The President is elected indirectly by an electoral college."],
    ["Article 32 provides a constitutional remedy for enforcement of Fundamental Rights.",true,"Article 32 empowers citizens to approach the Supreme Court for Fundamental Rights enforcement."],
    ["The Supreme Court of India is provided for under Article 124.",true,"Article 124 provides for the establishment and constitution of the Supreme Court."],
    ["The Council of Ministers is collectively responsible to the Lok Sabha.",true,"Article 75(3) provides collective responsibility to the House of the People."],
    ["The Constitution describes India as a Union of States.",true,"Article 1 states that India, that is Bharat, shall be a Union of States."],
  ],
  Economics: [
    ["The Reserve Bank of India began operations in 1935.",true,"The RBI commenced operations on 1 April 1935."],
    ["The RBI is India's central bank.",true,"The Reserve Bank of India performs central-bank functions."],
    ["GDP measures the value of final goods and services produced within domestic territory over a period.",true,"GDP measures domestic production over a specified period."],
    ["Inflation is a sustained rise in the general price level.",true,"Inflation refers to a sustained increase in the general price level."],
    ["The repo rate is associated with RBI lending to banks against eligible collateral.",true,"Repo operations involve lending against eligible securities under the applicable framework."],
    ["The Securities and Exchange Board of India is India's central bank.",false,"SEBI regulates the securities market; the RBI is the central bank."],
    ["GST was introduced in India in 2017.",true,"India's GST regime commenced on 1 July 2017."],
    ["The fiscal deficit broadly measures expenditure in excess of receipts excluding borrowings.",true,"Fiscal deficit represents the government's borrowing requirement."],
    ["NITI Aayog replaced the Planning Commission in 2015.",true,"NITI Aayog was established in January 2015."],
    ["A direct tax is generally imposed directly on income or profits and its burden is not ordinarily shifted like an indirect tax.",true,"Direct taxes are levied directly on income/profits; economic incidence can still vary in practice."],
    ["A rise in the policy repo rate generally tightens monetary conditions, other things equal.",true,"Higher policy rates tend to raise borrowing costs and moderate demand."],
    ["Real GDP adjusts nominal GDP for changes in prices.",true,"Real GDP separates changes in production from changes in price levels."],
  ],
  Environment: [
    ["The Ramsar Convention concerns wetlands of international importance.",true,"The Ramsar Convention is an international framework for wetland conservation and wise use."],
    ["The Montreal Protocol addresses ozone-depleting substances.",true,"The Montreal Protocol controls substances that deplete the stratospheric ozone layer."],
    ["CITES regulates international trade in listed wild animals and plants.",true,"CITES seeks to ensure international trade does not threaten listed species' survival."],
    ["Biodiversity is commonly considered at genetic, species and ecosystem levels.",true,"These are three widely recognised levels of biodiversity."],
    ["Greenhouse gases absorb and re-emit outgoing infrared radiation.",true,"This process contributes to the greenhouse effect."],
    ["Biomagnification can increase contaminant concentration at higher trophic levels.",true,"Persistent contaminants may become more concentrated higher in a food chain."],
    ["The ozone layer is located mainly in the stratosphere.",true,"Most atmospheric ozone is concentrated in the stratosphere."],
    ["The main purpose of a national park is to permit unrestricted industrial extraction.",false,"National parks are protected areas with restrictions intended to conserve ecosystems and wildlife."],
    ["India's biodiversity hotspots include the Himalaya and Western Ghats-Sri Lanka regions.",true,"Both are recognised global biodiversity hotspots."],
    ["The Kyoto Protocol is an international agreement linked to greenhouse-gas emission commitments.",true,"The Kyoto Protocol established emission-reduction commitments for participating developed countries."],
    ["Eutrophication can result from excess nutrient inputs into water bodies.",true,"Excess nitrogen and phosphorus can drive algal blooms and oxygen depletion."],
    ["All renewable energy sources have zero environmental impacts throughout their life cycle.",false,"Renewables generally reduce certain impacts but can still have land, material and ecosystem effects."],
  ],
  GeneralAwareness: [
    ["The United Nations was founded in 1945.",true,"The UN officially came into existence on 24 October 1945."],
    ["The International Monetary Fund publishes the World Economic Outlook.",true,"The IMF publishes the World Economic Outlook."],
    ["The World Health Organization is a specialised agency of the United Nations.",true,"WHO is the UN specialised agency for international public health."],
    ["The headquarters of the World Health Organization is in Geneva.",true,"WHO headquarters is in Geneva, Switzerland."],
    ["The SI unit of electric current is the ampere.",true,"The ampere is the SI base unit of electric current."],
    ["The SI unit of force is the newton.",true,"Force is measured in newtons."],
    ["Plants use carbon dioxide during photosynthesis.",true,"Carbon dioxide is used to synthesise carbohydrates during photosynthesis."],
    ["Vitamin D can be synthesised in skin following suitable UVB exposure.",true,"UVB exposure enables vitamin D synthesis in the skin."],
    ["World Environment Day is observed on 5 June.",true,"World Environment Day is observed annually on 5 June."],
    ["The Bharat Ratna is India's highest civilian award.",true,"Bharat Ratna is India's highest civilian award."],
    ["The headquarters of the Reserve Bank of India is in Mumbai.",true,"The RBI's central office is in Mumbai."],
    ["UNESCO headquarters is located in Paris.",true,"UNESCO is headquartered in Paris, France."],
  ],
};

const BANKING_FACTS = [
  ["The RBI regulates monetary policy in India.",true,"The RBI is responsible for monetary policy under India's statutory framework."],
  ["The Cash Reserve Ratio is the share of a bank's net demand and time liabilities kept as cash balance with the RBI.",true,"CRR requires banks to maintain a specified cash balance with the RBI."],
  ["The Statutory Liquidity Ratio requires banks to maintain specified liquid assets.",true,"SLR is a prescribed proportion of NDTL held in eligible liquid assets."],
  ["DICGC deposit insurance generally covers eligible deposits up to ₹5 lakh per depositor per bank, including principal and interest.",true,"The current insurance limit is ₹5 lakh per depositor per bank, subject to DICGC rules."],
  ["SEBI is the principal regulator of India's securities market.",true,"SEBI regulates the securities market and protects investor interests."],
  ["NABARD is associated with agriculture and rural development finance.",true,"NABARD supports agriculture and rural development."],
  ["IRDAI regulates the insurance sector in India.",true,"IRDAI is the insurance-sector regulator."],
  ["PFRDA regulates and develops India's pension sector under its mandate.",true,"PFRDA oversees pension-sector development and regulation."],
  ["NEFT is a payment system operated by the Reserve Bank of India.",true,"NEFT is an RBI-operated electronic funds transfer system."],
  ["UPI was developed by the National Payments Corporation of India.",true,"NPCI developed and operates UPI."],
  ["RTGS is designed for real-time gross settlement of transactions.",true,"RTGS settles transfers individually in real time on a gross basis."],
  ["The repo rate is the rate at which commercial banks lend unsecured funds to retail borrowers.",false,"The policy repo rate concerns RBI lending to banks against eligible collateral; retail loan rates are separate."],
];

function makeOptions(correct, distractors, seed) {
  const answerText = String(correct);
  const values = [answerText, ...distractors.map(String)].filter((v, i, a) => a.indexOf(v) === i);
  const numeric = answerText.trim() !== "" && Number.isFinite(Number(answerText));
  const fillers = ["None of these", "Cannot be determined", "All of these", "Not enough information"];
  let bump = 1;
  while (values.length < 4) {
    const v = numeric ? fmt(Number(answerText) + bump * Math.max(1, Math.round(Math.abs(Number(answerText)) * 0.1))) : fillers[(seed + bump) % fillers.length];
    if (!values.includes(v)) values.push(v);
    bump++;
  }
  const options = values.slice(0, 4);
  const shift = ((seed % 4) + 4) % 4;
  const rotated = options.slice(shift).concat(options.slice(0, shift));
  return { options: rotated, answer: rotated.indexOf(answerText) };
}
function maskLabel(mask) {
  const parts = [1,2,4].filter(bit => mask & bit).map(bit => String(bit === 1 ? 1 : bit === 2 ? 2 : 3));
  if (parts.length === 0) return "None of the statements";
  if (parts.length === 3) return "All three statements";
  return parts.join(" and ") + " only";
}
function statementQuestions(examId, subject, topic, facts, limit, startSeed) {
  const rows = [];
  let serial = 0;
  // Use each fact triple once. Permuting the same three statements created six
  // near-duplicate questions that inflated bank size without adding new practice.
  for (let a = 0; a < facts.length && rows.length < limit; a++) {
    for (let b = a + 1; b < facts.length && rows.length < limit; b++) {
      for (let d = b + 1; d < facts.length && rows.length < limit; d++) {
        const triple = [facts[a], facts[b], facts[d]];
        const mask = (triple[0][1] ? 1 : 0) | (triple[1][1] ? 2 : 0) | (triple[2][1] ? 4 : 0);
        const wrongMasks = [];
        for (const m of [mask ^ 1, mask ^ 2, mask ^ 4, (mask + 3) % 8, (mask + 5) % 8, (mask + 6) % 8]) {
          if (m !== mask && !wrongMasks.includes(m)) wrongMasks.push(m);
        }
        const built = makeOptions(maskLabel(mask), wrongMasks.slice(0,3).map(maskLabel), startSeed + serial);
        const statementText = triple.map((f, i) => (i + 1) + ". " + f[0]).join("\n");
        rows.push({
          exam_id: examId, subject, topic, difficulty: "medium",
          text: "Consider the following statements:\n" + statementText + "\nWhich of the statements given above are correct?",
          options: built.options, answer: built.answer,
          explanation: triple.map((f,i) => "Statement " + (i+1) + " is " + (f[1] ? "correct. " : "incorrect. ") + f[2]).join(" "),
          concept: topic, tip: "Evaluate each statement independently before matching the correct combination.",
          source_type: "ADMIN_PRACTICE"
        });
        serial++;
      }
    }
  }
  return rows;
}
function numericQuestion(examId, subject, topic, text, correct, distractors, explanation, concept, tip, seed, difficulty) {
  const built = makeOptions(correct, distractors, seed);
  return { exam_id: examId, subject, topic, difficulty: difficulty || "medium", text, options: built.options,
    answer: built.answer, explanation, concept, tip, source_type: "ADMIN_PRACTICE" };
}
function fmt(n) {
  if (Number.isInteger(n)) return String(n);
  return String(Math.round(n * 100) / 100);
}
function quantitativeQuestions(examId, subject, count, seedBase) {
  const rows = [];
  const topics = ["Percentage","Profit & Loss","Ratio & Proportion","Simple & Compound Interest","Averages","Time & Work","Time Speed Distance","Number System","Algebra","Data Interpretation"];
  for (let i = 0; i < count; i++) {
    const family = i % 10, k = Math.floor(i / 10), seed = seedBase + i;
    let topic = topics[family], text, correct, distractors, explanation, concept;
    if (family === 0) {
      const base = 200 + 20 * k, p = [5,10,15,20,25,30,35,40,45,50][k % 10];
      correct = base * p / 100; text = "What is " + p + "% of " + base + "?";
      distractors = [correct + p, correct - p, correct + 10];
      explanation = p + "% of " + base + " = " + base + " × " + p + "/100 = " + fmt(correct) + "."; concept = "Percentage calculation";
    } else if (family === 1) {
      const cp = 100 * (k + 2), p = 5 * (1 + (k % 8)); correct = cp * (100 + p) / 100;
      text = "An article costs ₹" + cp + ". If it is sold at a profit of " + p + "%, what is its selling price?";
      distractors = [cp * (100-p)/100, correct + 100, cp + p];
      explanation = "Selling price = cost price × (1 + profit rate) = ₹" + fmt(correct) + "."; concept = "Profit and loss";
    } else if (family === 2) {
      const a = 2 + (k % 7), b = 3 + ((k * 3) % 8), unit = 10 + (k % 25), total = (a+b)*unit;
      correct = Math.max(a,b) * unit;
      text = "₹" + total + " is divided in the ratio " + a + ":" + b + ". What is the larger share?";
      distractors = [Math.min(a,b)*unit, total/a, total/b];
      explanation = "Total parts = " + (a+b) + "; one part = ₹" + unit + ". The larger share is ₹" + fmt(correct) + "."; concept = "Ratio and proportion";
    } else if (family === 3) {
      const principal = 1000 + 250*k, rate = 4 + (k % 9), years = 1 + (k % 5);
      correct = principal * rate * years / 100;
      text = "Find the simple interest on ₹" + principal + " at " + rate + "% per annum for " + years + " year" + (years===1?"":"s") + ".";
      distractors = [principal*rate/100, principal*years/100, correct+rate*10];
      explanation = "Simple interest = PRT/100 = " + principal + " × " + rate + " × " + years + "/100 = ₹" + fmt(correct) + "."; concept = "Simple interest";
    } else if (family === 4) {
      const base = 8 + k*2, step = 2 + (k % 7), values = [base,base+step,base+2*step,base+3*step,base+4*step];
      correct = base + 2*step;
      text = "Find the average of " + values.join(", ") + ".";
      distractors = [correct+step, correct-step, values[0]+values[4]];
      explanation = "The five values form an arithmetic sequence; their mean is the middle value, " + fmt(correct) + "."; concept = "Arithmetic mean";
    } else if (family === 5) {
      const daysA = 6 + k, daysB = daysA * 2;
      correct = daysA * daysB / (daysA + daysB);
      text = "A can complete a job in " + daysA + " days and B in " + daysB + " days. How long will they take working together?";
      distractors = [daysA+daysB, Math.min(daysA,daysB), Math.max(daysA,daysB)/2];
      explanation = "Combined daily rate = 1/" + daysA + " + 1/" + daysB + " = 1/" + fmt(correct) + " job per day; time = " + fmt(correct) + " days."; concept = "Combined work rate";
    } else if (family === 6) {
      const speed = 30 + 5*(k % 15), time = 2 + (k % 6); correct = speed*time;
      text = "A vehicle travels at " + speed + " km/h for " + time + " hours. How far does it travel?";
      distractors = [speed+time, speed*(time+1), correct-speed];
      explanation = "Distance = speed × time = " + speed + " × " + time + " = " + fmt(correct) + " km."; concept = "Distance, speed and time";
    } else if (family === 7) {
      const a = 12 + 2*(k % 15), b = 18 + 3*((k*7) % 12);
      const gcd = (x,y) => y ? gcd(y,x%y) : x;
      correct = a*b/gcd(a,b);
      text = "Find the least common multiple (LCM) of " + a + " and " + b + ".";
      distractors = [a+b, gcd(a,b), a*b];
      explanation = "LCM × HCF = product of the two positive integers; the LCM is " + fmt(correct) + "."; concept = "Least common multiple";
    } else if (family === 8) {
      const x = 2 + (k % 25), a = 2 + (k % 8), b = 5 + ((k*7) % 35), c = a*x+b;
      correct = x; text = "Solve for x: " + a + "x + " + b + " = " + c + ".";
      distractors = [x+1, Math.max(0,x-1), x+2];
      explanation = a + "x = " + c + " − " + b + " = " + (a*x) + "; dividing by " + a + " gives x = " + x + "."; concept = "Linear equation";
    } else {
      const mp = 200 + 50*k, discount = 5 + 5*(k%8); correct = mp*(100-discount)/100;
      text = "The marked price of an item is ₹" + mp + ". What is its price after a discount of " + discount + "%?";
      distractors = [mp*discount/100, mp+mp*discount/100, correct+50];
      explanation = "Discount = ₹" + fmt(mp*discount/100) + "; price after discount = ₹" + fmt(correct) + "."; concept = "Discount";
    }
    rows.push(numericQuestion(examId, subject, topic, text, fmt(correct), distractors.map(fmt), explanation, concept,
      "Write the governing formula first, then substitute the values.", seed, family === 8 ? "easy" : "medium"));
  }
  return rows;
}
function reasoningQuestions(examId, subject, count, seedBase) {
  const rows = [];
  const words = ["CAT","DOG","SUN","MAP","PEN","BOX","RAT","HEN","CUP","JAM","BUS","KEY","FOX","NET","TOP","BAT","RED","MIX","LOG","ZIP"];
  for (let i = 0; i < count; i++) {
    const family = i % 5, k = Math.floor(i / 5), seed = seedBase + i;
    let topic, text, correct, distractors, explanation, concept;
    if (family === 0) {
      const start = 2 + k*2, step = 2 + (k%11), vals = [start,start+step,start+2*step,start+3*step];
      correct = start+4*step; topic = "Series"; text = "Find the next number: " + vals.join(", ") + ", ?";
      distractors = [correct+step, correct-step, correct+2]; explanation = "The sequence increases by a constant difference of " + step + "; the next term is " + correct + "."; concept = "Arithmetic number series";
    } else if (family === 1) {
      const start = 2 + k, vals = [start*start,(start+1)*(start+1),(start+2)*(start+2)];
      correct = (start+3)*(start+3); topic = "Series"; text = "Find the next number: " + vals.join(", ") + ", ?";
      distractors = [correct+1, (start+3)*2, correct+2*(start+3)]; explanation = "The terms are squares of consecutive integers; the next is " + (start+3) + "² = " + correct + "."; concept = "Square-number series";
    } else if (family === 2) {
      const word = words[k % words.length], shift = 1 + (k % 3);
      const code = word.split("").map(ch => String.fromCharCode(65 + (ch.charCodeAt(0)-65+shift)%26)).join("");
      correct = code; topic = "Coding-Decoding"; text = "In a code, each letter is moved " + shift + " position" + (shift===1?"":"s") + " forward in the alphabet. How is " + word + " coded?";
      const wrong1 = word.split("").map(ch => String.fromCharCode(65+(ch.charCodeAt(0)-65+shift+1)%26)).join("");
      const wrong2 = word.split("").map(ch => String.fromCharCode(65+(ch.charCodeAt(0)-65+shift+2)%26)).join("");
      const wrong3 = word.split("").reverse().join("");
      distractors = [wrong1,wrong2,wrong3]; explanation = "Move each letter forward by " + shift + " position" + (shift===1?"":"s") + ": " + word + " becomes " + code + "."; concept = "Letter coding";
    } else if (family === 3) {
      const a = 3 + (k%10), b = 4 + ((k*3)%9);
      const scale = 1 + (k%8), north = a*scale, east = b*scale;
      const gcd = (x,y) => y ? gcd(y,x%y) : x;
      const dist = Math.sqrt(north*north+east*east);
      topic = "Direction Sense"; correct = fmt(dist);
      text = "A person walks " + north + " km north and then " + east + " km east. What is the straight-line distance from the starting point (approximately, if needed)?";
      distractors = [fmt(north+east),fmt(Math.abs(north-east)),fmt(dist+scale)];
      explanation = "The movements are perpendicular, so distance = √(" + north + "² + " + east + "²) = " + fmt(dist) + " km."; concept = "Direction and distance";
    } else {
      const nounsA = ["sparrows","roses","squares","whales","mangoes","triangles","planets","oak trees","novels","copper wires","dolphins","rectangles","tulips","comets","poems","eagles","cubes","oranges","bicycles","islands","pines","whales","hexagons","sonnets","satellites","lilies","cylinders","peaches","trains","continents","falcons","orchids","pentagons","haiku poems","rockets","bamboo plants"];
      const nounsB = ["birds","flowers","polygons","mammals","fruits","shapes","celestial bodies","trees","books","conductors","mammals","quadrilaterals","flowers","celestial bodies","literary works","birds of prey","solids","fruits","vehicles","landforms","trees","mammals","polygons","poetry","artificial objects","flowers","solids","fruits","transport","animals","plants","geometric figures","literary works","vehicles","ecosystems"];
      const nounsC = ["animals","plants","geometric figures","living organisms","food items","mathematical objects","objects in space","plants","written works","materials","animals","geometric figures","plants","objects in space","written works","animals","mathematical objects","food items","machines","geographical features","plants","animals","geometric figures","literary works","objects in orbit","plants","mathematical objects","food items","transport systems","animals","plants","mathematical objects","literary forms","machines","natural systems"];
      const ix = k % nounsA.length;
      const modifiers = ["red","blue","green","small","large","young","trained","registered","local","senior","junior","certified"];
      const mod = modifiers[Math.floor(k / nounsA.length) % modifiers.length];
      const a = mod + " " + nounsA[ix], b = mod + " " + nounsB[ix], d = mod + " " + nounsC[ix];
      correct = "All " + a + " are " + d;
      topic = "Syllogism";
      text = "Statements: All " + a + " are " + b + ". All " + b + " are " + d + ". Which conclusion must follow?";
      distractors = ["All " + d + " are " + a, "No " + a + " are " + d, "Some " + a + " are not " + d];
      explanation = "If every " + a + " belongs to the group " + b + ", and every " + b + " belongs to " + d + ", then every " + a + " must belong to " + d + ".";
      concept = "Transitive class inclusion";
    }
    rows.push(numericQuestion(examId, subject, topic, text, String(correct),
      distractors.map(String), explanation, concept, "Identify the rule or relationship and test it against every term.", seed, "medium"));
  }
  return rows;
}
const SYNONYMS = [
 ["abundant","plentiful","scarce","fragile"],["accurate","precise","vague","careless"],["brief","concise","lengthy","complex"],
 ["candid","frank","deceptive","hesitant"],["diligent","hardworking","idle","reckless"],["elated","overjoyed","miserable","indifferent"],
 ["frugal","thrifty","wasteful","lavish"],["hostile","unfriendly","cordial","generous"],["impartial","unbiased","prejudiced","partial"],
 ["lucid","clear","confusing","obscure"],["mitigate","alleviate","worsen","prolong"],["novice","beginner","expert","veteran"],
 ["obsolete","outdated","current","modern"],["prudent","wise","rash","careless"],["resilient","adaptable","brittle","weak"],
 ["skeptical","doubtful","convinced","certain"],["tranquil","peaceful","agitated","noisy"],["vital","essential","trivial","optional"],
 ["reluctant","unwilling","eager","enthusiastic"],["commend","praise","criticise","condemn"],["deteriorate","worsen","improve","recover"],
 ["explicit","clear","implicit","uncertain"],["feasible","possible","impossible","unrealistic"],["genuine","authentic","fake","imitation"],
 ["hinder","obstruct","assist","encourage"],["inevitable","unavoidable","avoidable","unlikely"],["mandatory","compulsory","optional","voluntary"],
 ["peril","danger","safety","comfort"],["rapid","swift","sluggish","slow"],["substantial","considerable","minor","negligible"],
 ["versatile","adaptable","inflexible","limited"],["zeal","enthusiasm","apathy","indifference"],["arduous","difficult","easy","effortless"],
 ["benevolent","kind","cruel","hostile"],["coherent","logical","inconsistent","confused"],["dormant","inactive","active","alert"],
 ["eminent","distinguished","unknown","ordinary"],["meticulous","thorough","careless","hasty"],["plausible","believable","impossible","absurd"],
 ["scarce","rare","abundant","common"]
];
const ANTONYMS = [
 ["ancient","modern","old","historic"],["artificial","natural","synthetic","manufactured"],["expand","contract","extend","enlarge"],
 ["frequent","rare","common","regular"],["generous","stingy","kind","charitable"],["humble","arrogant","modest","respectful"],
 ["optimistic","pessimistic","hopeful","positive"],["permanent","temporary","lasting","enduring"],["rigid","flexible","stiff","strict"],
 ["transparent","opaque","clear","visible"],["victory","defeat","success","triumph"],["accept","reject","receive","admit"],
 ["complex","simple","complicated","difficult"],["deficit","surplus","shortage","lack"],["exterior","interior","outer","external"],
 ["gloomy","cheerful","sad","dark"],["lenient","strict","tolerant","mild"],["maximum","minimum","greatest","highest"],
 ["noisy","quiet","loud","clamorous"],["prosperity","adversity","wealth","success"],["scarce","plentiful","rare","limited"],
 ["superior","inferior","higher","better"],["vacant","occupied","empty","available"],["wisdom","folly","judgement","insight"],
 ["advance","retreat","progress","proceed"],["bold","timid","brave","confident"],["create","destroy","build","form"],
 ["dawn","dusk","sunrise","morning"],["exclude","include","omit","remove"],["innocent","guilty","blameless","pure"],
 ["major","minor","important","significant"],["reward","penalty","prize","benefit"],["seldom","often","rarely","infrequently"],
 ["unite","divide","join","combine"],["arrival","departure","coming","entry"],["calm","agitated","peaceful","serene"],
 ["compulsory","optional","mandatory","required"],["diligent","negligent","careful","attentive"],["inflate","deflate","expand","enlarge"],
 ["optimise","degrade","improve","enhance"]
];
function englishQuestions(examId, subject, count, seedBase, mode) {
  const rows = [];
  let i = 0;
  const add = (topic, text, correct, wrong, explanation, concept, difficulty) => {
    const q = numericQuestion(examId, subject, topic, text, correct, wrong, explanation, concept,
      mode === "csat" ? "Read the passage or condition carefully and eliminate options unsupported by the evidence." : "Check meaning and grammatical fit in the complete sentence.", seedBase + i, difficulty || "medium");
    rows.push(q); i++;
  };
  if (mode === "csat") {
    const themes = [
      ["public transport","reduce travel delays","route reliability","average journey time","connect routes with housing and employment"],
      ["groundwater management","protect drinking-water supplies","local recharge and extraction","annual rainfall alone","combine conservation with transparent monitoring"],
      ["urban trees","reduce heat exposure","species choice and maintenance","the number of trees planted","measure shade, survival and local temperatures"],
      ["digital public services","make applications more convenient","connectivity and accessibility","the number of downloads","retain assisted access and evaluate completion rates"],
      ["school assessment","improve learning decisions","the variety of skills being measured","a single examination score","combine comparable tests with classroom evidence"],
      ["renewable energy projects","reduce emissions from electricity","storage, location and grid capacity","installed capacity alone","evaluate lifecycle effects and reliable delivery"],
      ["waste separation","increase material recovery","household participation and collection systems","the quantity collected at one site","coordinate sorting, collection and processing"],
      ["coastal protection","reduce damage from storms","local ecology and changing exposure","the length of a barrier alone","combine risk assessment with ecosystem-sensitive planning"],
      ["public health campaigns","improve preventive care","trust, access and follow-up","the number of messages sent","pair communication with accessible services"],
      ["farm advisory services","support resilient crop decisions","local soil, water and weather","average yield in one season","combine local evidence with ongoing evaluation"],
      ["financial inclusion","make formal payments easier to use","fees, trust and digital access","the number of accounts opened","track active use and barriers faced by customers"],
      ["road safety measures","reduce serious collisions","driver behaviour and road design","the number of signs installed","use collision data and improve high-risk locations"],
      ["air-quality plans","reduce harmful exposure","weather, transport and industrial sources","one day's pollution reading","monitor multiple sources over time and adapt interventions"],
      ["library programmes","improve access to learning resources","opening hours, relevance and community needs","the number of books purchased","evaluate use and consult the people served"],
      ["flood management","reduce disruption during heavy rainfall","drainage, land use and maintenance","the capacity of one drain","coordinate infrastructure with land-use planning"],
      ["small-business support","improve business resilience","credit terms, skills and market access","the number of loans announced","assess outcomes and tailor support to local needs"],
      ["biodiversity restoration","recover ecological functions","native species and habitat connectivity","the number of saplings planted","monitor survival, diversity and ecosystem condition"],
      ["open-data initiatives","support accountable public decisions","data quality, privacy and accessibility","the volume of data released","publish useful information with safeguards and context"],
      ["nutrition programmes","improve long-term health","availability, affordability and household practices","food distribution totals alone","combine access with follow-up on nutritional outcomes"],
      ["water-quality monitoring","identify risks to communities","sampling frequency and representative locations","one sample from one location","use consistent methods and communicate uncertainty"]
    ];
    const conditions = [
      "the needs of the people who use the service",
      "the quality of implementation across locations",
      "maintenance and long-term operating capacity"
    ];
    const evidence = [
      "a single headline indicator",
      "short-term results from one location",
      "the number of activities completed"
    ];
    const actions = [
      "compare outcomes across locations and review them over time",
      "consult affected communities and disclose the assumptions used",
      "combine outcome measures with evidence about access and quality"
    ];
    const unsupported = "A favourable result on one measure guarantees success in every setting.";
    for (let p = 0; rows.length < count; p++) {
      const theme = themes[p % themes.length];
      const variant = Math.floor(p / themes.length);
      const condition = conditions[variant % conditions.length];
      const evidenceItem = evidence[(variant + p) % evidence.length];
      const action = actions[(variant + Math.floor(p / 3)) % actions.length];
      const passage = "An initiative concerning " + theme[0] + " may help to " + theme[1] + ". Its actual effect depends on " + theme[2] + " and " + condition + ". If evaluation counts only " + evidenceItem + ", it may overlook " + theme[3] + ". A stronger approach is to " + action + ", while adapting the intervention when new evidence reveals a problem.";
      const qs = [
        {topic:"Comprehension",q:"Which option best expresses the central idea of the passage?",a:"The initiative should be evaluated in context and adjusted using evidence.",w:["The initiative should be rejected in every location.","A single activity count is sufficient to prove long-term success.","The initiative will succeed regardless of implementation."],e:"The passage links outcomes to context, evaluation and revision."},
        {topic:"Comprehension",q:"Which inference is best supported by the passage?",a:"Outcomes depend on implementation and should be reviewed using relevant evidence.",w:["The same intervention must work equally well everywhere.","Evaluation should ignore the needs of the people affected.","New evidence should never change an existing plan."],e:"The passage states that conditions differ and that interventions should adapt to evidence."},
        {topic:"Comprehension",q:"Which claim is NOT supported by the passage?",a:unsupported,w:["Implementation conditions can affect results.","A narrow indicator can overlook important outcomes.","Decisions may need to change when evidence changes."],e:"The passage explicitly warns that a single indicator cannot guarantee success."}
      ];
      for (const qt of qs) {
        if (rows.length >= count) break;
        add(qt.topic, passage + "\n\n" + qt.q, qt.a, qt.w, qt.e, "Reading comprehension", "medium");
      }
    }
    return rows;
  }
  for (const [word, answer, d1, d2] of SYNONYMS) {
    if (rows.length >= count) break;
    add("Vocabulary", "Choose the word nearest in meaning to '" + word + "'.", answer, [d1,d2, SYNONYMS[(i+7)%SYNONYMS.length][1]], "The closest synonym of " + word + " is " + answer + ".", "Synonyms");
  }
  for (const [word, answer, d1, d2] of ANTONYMS) {
    if (rows.length >= count) break;
    add("Vocabulary", "Choose the word opposite in meaning to '" + word + "'.", answer, [d1,d2, ANTONYMS[(i+9)%ANTONYMS.length][1]], "The antonym of " + word + " is " + answer + ".", "Antonyms");
  }
  const grammar = [
    ["Neither of the proposals ___ acceptable.", "is", ["are","were","have"], "Neither is treated as singular in this construction.","Subject–verb agreement"],
    ["Each of the candidates ___ required to carry an identity card.", "is", ["are","were","have"], "The singular subject 'each' takes 'is'.","Subject–verb agreement"],
    ["By the time we arrived, the meeting ___.", "had begun", ["has begin","begins","will begin"], "The earlier past event takes the past perfect.","Verb tense"],
    ["She has been working here ___ 2022.", "since", ["for","from","by"], "Use 'since' with a starting point in time.","Prepositions"],
    ["The committee ___ submitted its report.", "has", ["have","are","were"], "A committee acting as one unit commonly takes a singular verb in this sentence.","Subject–verb agreement"],
    ["He is good ___ solving analytical problems.", "at", ["in","on","for"], "The conventional phrase is 'good at'.","Prepositions"],
    ["No sooner had the train left ___ it began to rain.", "than", ["when","then","while"], "'No sooner' is paired with 'than'.","Conjunctions"],
    ["If I ___ enough time, I would learn another language.", "had", ["have","will have","am having"], "The second conditional uses a past form in the if-clause.","Conditionals"],
    ["The information ___ useful to the committee.", "is", ["are","were","have"], "'Information' is an uncountable singular noun.","Subject–verb agreement"],
    ["The book, along with the notes, ___ on the desk.", "is", ["are","were","have"], "The main subject is singular 'book'; the phrase 'along with the notes' does not change it.","Subject–verb agreement"],
    ["She prefers reading ___ watching television.", "to", ["than","over than","from"], "'Prefer' is commonly followed by 'to' when comparing activities.","Prepositions"],
    ["The manager asked us ___ the form before noon.", "to submit", ["submit","submitting","submitted"], "The pattern is ask someone to do something.","Infinitives"],
    ["Despite ___ tired, he completed the assignment.", "being", ["be","was","been"], "A preposition such as 'despite' is followed by a noun or gerund.","Gerunds"],
    ["The results were different ___ our expectations.", "from", ["than","to","with"], "'Different from' is the standard construction in this context.","Prepositions"],
    ["One of my friends ___ in Delhi.", "lives", ["live","living","have lived"], "The subject is 'one', which is singular.","Subject–verb agreement"],
    ["The documents must ___ before they are filed.", "be checked", ["checked","checking","have checking"], "A modal passive uses modal + be + past participle.","Passive voice"],
    ["Hardly had she reached the station ___ the train arrived.", "when", ["than","then","that"], "'Hardly' is commonly paired with 'when'.","Conjunctions"],
    ["He apologised ___ being late.", "for", ["on","at","with"], "The phrase is 'apologise for'.","Prepositions"],
    ["The teacher made the students ___ the passage again.", "read", ["to read","reading","readed"], "'Make' takes an object plus the base verb in this active construction.","Causative verbs"],
    ["If he had prepared well, he ___ the examination.", "would have passed", ["will pass","would pass","passed"], "A third conditional uses would have + past participle in the result clause.","Conditionals"],
    ["The news ___ encouraging.", "is", ["are","were","have"], "'News' is grammatically singular.","Subject–verb agreement"],
    ["She has less time ___ I do.", "than", ["then","from","as"], "Comparative 'less' is followed by 'than'.","Comparisons"],
    ["The officer insisted ___ seeing the original document.", "on", ["for","at","to"], "The verb 'insist' takes 'on' before a gerund.","Prepositions"],
    ["The child is afraid ___ the dark.", "of", ["from","with","by"], "The usual construction is 'afraid of'.","Prepositions"],
    ["Please ensure that every page ___ numbered.", "is", ["are","have","were"], "'Every page' is singular.","Subject–verb agreement"],
    ["The proposal was rejected because it lacked ___ evidence.", "sufficient", ["many","few","several"], "'Evidence' is uncountable and 'sufficient' fits the meaning.","Determiners"],
    ["He speaks as though he ___ the answer.", "knew", ["knows always","has know","will knew"], "An unreal comparison commonly uses a past form after 'as though'.","Verb forms"],
    ["The principal, not the teachers, ___ responsible for the announcement.", "is", ["are","were","have"], "The subject 'principal' is singular; the intervening phrase does not change it.","Subject–verb agreement"],
    ["The medicine should be taken ___ the doctor's instructions.", "according to", ["according with","accordance to","according by"], "'According to' introduces the source of instructions.","Prepositions"],
    ["She succeeded ___ careful planning and consistent effort.", "through", ["although","unless","despite of"], "'Through' expresses the means by which she succeeded.","Prepositions"],
  ];
  grammar.push(
    ["Neither the manager nor the assistants ___ available.", "are", ["is","was","has"], "The verb agrees with the nearer plural subject 'assistants'.", "Subject–verb agreement"],
    ["The train arrived ___ time despite the rain.", "on", ["in","at","by"], "'On time' means punctual.", "Prepositions"],
    ["She asked me where I ___ the previous evening.", "had been", ["have been","am","will be"], "The earlier reporting context takes a past-perfect form.", "Reported speech"],
    ["The project was completed ___ the deadline.", "before", ["until","since","during"], "'Before' indicates completion earlier than a time limit.", "Prepositions"],
    ["The new policy will come ___ effect next month.", "into", ["in","on","at"], "The expression is 'come into effect'.", "Phrasal expressions"],
    ["The data ___ collected from five different districts.", "were", ["was","is","has"], "In formal usage, data is often treated as plural.", "Subject–verb agreement"],
    ["She is one of the students who ___ volunteered.", "have", ["has","is","was"], "The relative clause refers to plural 'students'.", "Subject–verb agreement"],
    ["Please refrain ___ making unnecessary noise.", "from", ["to","at","for"], "'Refrain from' is followed by a gerund.", "Prepositions"],
    ["The more carefully you plan, ___ the result tends to be.", "the better", ["better","best","the best"], "The correlative comparative uses 'the + comparative' in both clauses.", "Comparisons"],
    ["The officer ordered that the gate ___ closed.", "be", ["is","was","being"], "The mandative subjunctive uses the base form after 'ordered that'.", "Subjunctive mood"],
    ["I would rather walk ___ wait for an uncertain bus.", "than", ["to","from","instead"], "'Would rather ... than ...' expresses a preference.", "Comparisons"],
    ["The equipment, including the cables, ___ been inspected.", "has", ["have","are","were"], "The singular head noun 'equipment' takes a singular verb.", "Subject–verb agreement"],
    ["He succeeded not because he was lucky, ___ because he prepared.", "but", ["and","or","so"], "The structure is 'not because ... but because ...'.", "Conjunctions"],
    ["Each applicant should bring ___ own documents.", "their", ["his only","our","them"], "Singular 'they/their' is widely accepted for an unspecified person.", "Pronouns"],
    ["The teacher explained the concept ___ the class.", "to", ["for","at","with"], "'Explain something to someone' is the standard pattern.", "Prepositions"],
    ["The meeting was postponed ___ further notice.", "until", ["by","since","during"], "'Until further notice' is the conventional expression.", "Prepositions"],
    ["The report is based ___ interviews with local residents.", "on", ["in","at","from"], "'Based on' introduces the evidence or foundation.", "Prepositions"],
    ["The city has fewer parks ___ it had a decade ago.", "than", ["then","as","from"], "'Fewer' is comparative and takes 'than'.", "Comparisons"],
    ["The team worked ___ to finish before the deadline.", "efficiently", ["efficient","efficiency","more efficient"], "An adverb modifies the verb 'worked'.", "Parts of speech"],
    ["No candidate is allowed to enter ___ a valid admit card.", "without", ["unless","beside","within"], "'Without' expresses absence of a required item.", "Prepositions"],
    ["The manager asked whether the files ___ been uploaded.", "had", ["have","has","were"], "The past reporting context calls for past perfect.", "Reported speech"],
    ["She has lived in the city ___ five years.", "for", ["since","from","by"], "'For' is used with a duration.", "Prepositions"],
    ["The results were announced after the committee ___ its review.", "had completed", ["has complete","completes","will complete"], "The earlier past action takes the past perfect.", "Verb tense"],
    ["The manager is responsible ___ ensuring compliance.", "for", ["to","of","at"], "'Responsible for' is the correct collocation.", "Prepositions"],
    ["The files are arranged ___ alphabetical order.", "in", ["on","at","by"], "The conventional phrase is 'in alphabetical order'.", "Prepositions"],
    ["He denied ___ the confidential document.", "having seen", ["to see","see","saw"], "'Deny' can be followed by a gerund; the perfect gerund marks an earlier action.", "Gerunds"],
    ["The policy applies to employees ___ work remotely.", "who", ["which","whose","whom"], "'Who' refers to people as the subject of the relative clause.", "Relative pronouns"],
    ["She is capable ___ solving the problem independently.", "of", ["for","to","with"], "'Capable of' is the correct construction.", "Prepositions"],
    ["The instructions were so complicated ___ few participants understood them.", "that", ["than","as","which"], "'So ... that' expresses a result.", "Conjunctions"],
    ["The team has made significant ___ in reducing errors.", "progress", ["progresses","progressive","progressed"], "'Progress' is uncountable in this sense.", "Nouns"],
    ["Scarcely had the announcement been made ___ questions began.", "when", ["than","then","while"], "'Scarcely' is commonly paired with 'when'.", "Conjunctions"],
    ["The evidence is insufficient ___ support that conclusion.", "to", ["for","at","with"], "The construction is 'insufficient to do something'.", "Infinitives"],
    ["A number of applicants ___ requested clarification.", "have", ["has","is","was"], "'A number of' takes a plural verb.", "Subject–verb agreement"],
    ["The number of applicants ___ increased this year.", "has", ["have","are","were"], "'The number' is singular.", "Subject–verb agreement"],
    ["The new rule is applicable ___ all registered candidates.", "to", ["for","with","at"], "'Applicable to' is the standard collocation.", "Prepositions"],
    ["The analyst cautioned against drawing conclusions ___ limited data.", "from", ["by","at","on"], "'Draw conclusions from data' is the usual construction.", "Prepositions"],
    ["The organisation aims to provide services ___ an affordable cost.", "at", ["on","in","for"], "The phrase is 'at an affordable cost'.", "Prepositions"],
    ["The proposal is worth ___ carefully.", "considering", ["to consider","consider","considered"], "'Worth' is followed by a gerund.", "Gerunds"],
    ["The results are consistent ___ the earlier findings.", "with", ["to","for","at"], "'Consistent with' is the correct collocation.", "Prepositions"],
    ["He was accused ___ violating the safety rules.", "of", ["for","with","to"], "'Accused of' is the standard phrase.", "Prepositions"]
  );
  for (const item of grammar) {
    if (rows.length >= count) break;
    add("Grammar", item[0], item[1], item[2], item[3], item[4]);
  }
  while (rows.length < count) {
    const idx = rows.length % grammar.length, item = grammar[idx];
    add("Grammar", item[0] + " [Practice set " + (Math.floor(rows.length/grammar.length)+2) + "]", item[1], item[2], item[3], item[4]);
  }
  return rows;
}
// Carefully authored, reviewed exam-style items. These remain ADMIN_PRACTICE;
 // they are not copied or represented as official previous-year questions.
const REVIEWED_EXAM_ITEMS = [
  ['UPSC_CSE','Polity','Constitution','hard','With reference to a Money Bill in India, consider the following statements: (1) The Speaker of the Lok Sabha certifies whether a Bill is a Money Bill. (2) The Rajya Sabha can amend a Money Bill and require the Lok Sabha to accept those amendments. (3) The President may return a Money Bill to Parliament for reconsideration. Which statements are correct?','1 only',['1 and 2 only','1 and 3 only','1, 2 and 3'],'The Speaker certifies a Money Bill. The Rajya Sabha can only recommend changes, and the President cannot return a Money Bill for reconsideration.','Constitutional procedure','Check the distinct powers of the Speaker, Rajya Sabha and President.',31001],
  ['UPSC_CSE','Geography','Indian Geography','hard','A river forms an estuary rather than a large delta most directly when:','strong tidal action and coastal currents remove much of the deposited sediment',['the river carries no sediment at all','the river flows only through hard crystalline rocks','the river has no tributaries'],'Strong tides and currents can disperse sediment before it accumulates into a delta.','River landforms','Distinguish sediment supply from the processes that redistribute sediment.',31002],
  ['UPSC_CSE','Economics','Indian Economy','hard','If the RBI raises the policy repo rate and other factors remain broadly unchanged, which immediate transmission is most likely?','short-term borrowing costs tend to rise, moderating credit demand',['all bank deposit rates must fall immediately','the rupee supply automatically doubles','government tax revenue necessarily rises by the same percentage'],'A higher policy rate tends to increase funding costs and lending rates, though transmission varies and is not instantaneous or one-for-one.','Monetary transmission','Look for a likely transmission channel, not an unconditional outcome.',31003],
  ['UPSC_CSE','Environment','Ecology','hard','Which situation best illustrates biomagnification?','A persistent pollutant reaches higher concentrations in organisms at successively higher trophic levels',['a biodegradable leaf breaks down in soil','a nutrient is diluted as water flows downstream','a population grows after a temporary increase in food'],'Biomagnification is an increase in concentration across trophic levels for certain persistent substances.','Ecology and pollution','Separate biomagnification from bioaccumulation within one organism.',31004],
  ['UPSC_CSE','History','Modern India','medium','The main political significance of the 1931 Gandhi–Irwin Pact was that it:','led to Congress participation in the Second Round Table Conference',['immediately granted complete independence to India','abolished separate electorates permanently','transferred provincial governments to elected Indian ministries'],'The pact enabled Congress to participate in the Second Round Table Conference; it did not grant independence.','National movement','Identify the concrete political consequence rather than a broader movement goal.',31005],
  ['UPSC_CSE','General Awareness','Static GK','hard','Which statement best distinguishes a constitutional body from a statutory body in India?','A constitutional body derives its existence or mandate from the Constitution, while a statutory body is created by legislation',['a constitutional body is always elected directly by citizens','a statutory body can never exercise regulatory powers','every constitutional body is part of the judiciary'],'The distinction concerns the legal source of establishment, not election or function.','Indian institutions','Focus on the legal source of the institution.',31006],
  ['UPSC_CSAT','Quantitative Aptitude','Percentage','hard','A town’s population rises by 20% in one year and falls by 10% the next year. Relative to the original population, the final population is:','8% higher',['10% higher','2% higher','2% lower'],'Using an index of 100, the final value is 100 × 1.20 × 0.90 = 108, an 8% increase.','Successive percentage change','Apply each percentage to the value after the previous change.',32001],
  ['UPSC_CSAT','Quantitative Aptitude','Ratio & Proportion','medium','A sum is divided between A and B in the ratio 3:5. If B receives ₹480 more than A, the total sum is:','₹1,920',['₹1,440','₹2,400','₹3,840'],'The difference is 2 parts, so one part is ₹240. The total is 8 parts = ₹1,920.','Ratio and proportion','Use the difference between ratio parts before finding the total.',32002],
  ['UPSC_CSAT','Reasoning','Syllogism','hard','Statements: All district officers are public servants. Some public servants are engineers. Conclusions: (I) Some district officers are engineers. (II) All district officers are public servants. Which conclusion follows?','Only conclusion II',['Only conclusion I','Both conclusions I and II','Neither conclusion I nor II'],'Conclusion II repeats the first statement. The engineers who are public servants need not be district officers, so I does not follow.','Logical deduction','Do not assume two groups overlap merely because both belong to a larger group.',32003],
  ['UPSC_CSAT','English','Comprehension','medium','Passage: A policy may achieve its stated output while failing to improve public welfare if access is unequal or benefits do not reach the intended group. Evaluation should therefore compare both delivery and outcomes. Which inference is best supported?','Counting delivered services alone may be insufficient to judge a policy’s impact',['Every policy with measurable outputs improves welfare','Unequal access proves that no service was delivered','Outcome evaluation makes delivery data irrelevant'],'The passage distinguishes outputs from welfare outcomes and asks evaluators to consider access and beneficiaries.','Reading comprehension','Choose the inference that preserves the passage’s qualification.',32004],
  ['SSC_CGL','Quantitative Aptitude','Profit & Loss','medium','An article is marked 25% above cost price and sold after a discount of 10% on the marked price. The seller’s profit percentage is:','12.5%',['10%','15%','17.5%'],'Let cost be 100. Marked price = 125; selling price = 112.5, so profit = 12.5%.','Successive percentage calculations','Use cost price as 100 to track the markup and discount.',33001],
  ['SSC_CGL','Quantitative Aptitude','Time & Work','hard','A can finish a job in 12 days and B in 18 days. They work together for 4 days, after which A leaves. How many additional days does B need to finish the remaining work?','8 days',['6 days','9 days','10 days'],'Their combined rate is 1/12 + 1/18 = 5/36. In four days they finish 5/9, leaving 4/9. B needs (4/9) ÷ (1/18) = 8 days.','Work rates','Subtract completed work from one whole job, then use B’s individual rate.',33002],
  ['SSC_CGL','Reasoning','Coding-Decoding','medium','In a code, each letter is replaced by the letter three places after it in the alphabet, with Z followed by C. How is BANK coded?','EDQN',['EDMP','EDQN','EDPJ'],'B→E, A→D, N→Q and K→N, giving EDQN.','Letter coding','Apply the same forward shift independently to each letter.',33003],
  ['SSC_CGL','Reasoning','Seating Arrangement','hard','Five people P, Q, R, S and T sit in a row facing north. Q is immediately to the right of P. R is at the left end. S sits immediately to the left of T. P is not at either end. Which arrangement is possible from left to right?','R, P, Q, S, T',['R, S, T, P, Q','P, Q, R, S, T','S, T, R, P, Q'],'R must be first; P cannot be at either end and Q must immediately follow P. R, P, Q, S, T satisfies all conditions, including S immediately before T.','Linear seating','Check every condition against the complete arrangement.',33004],
  ['SSC_CGL','English','Error Spotting','medium','Identify the part containing an error: “Each of the applicants / have submitted / the required certificate / before the deadline.”','have submitted',['Each of the applicants','the required certificate','before the deadline'],'The head word “Each” is singular, so the verb phrase should be “has submitted”.','Subject–verb agreement','Find the grammatical head of the subject before selecting the verb.',33005],
  ['SSC_CGL','General Awareness','Static GK','medium','The Comptroller and Auditor General of India is appointed by the:','President of India',['Prime Minister','Chief Justice of India','Speaker of the Lok Sabha'],'Article 148 provides for appointment of the CAG by the President.','Indian polity','Recall the constitutional appointing authority, not the reporting relationship.',33006],
  ['RBI_B','General Awareness','Static GK','hard','Which of the following is the clearest example of a liquidity risk for a bank?','The bank cannot meet expected cash outflows when due without unacceptable losses',['the bank’s annual profit is higher than forecast','a borrower repays a loan earlier than scheduled','the bank’s branch network expands faster than planned'],'Liquidity risk concerns meeting payment obligations when due; profitability and expansion alone do not define it.','Bank risk management','Distinguish liquidity risk from credit and profitability risk.',34001],
  ['RBI_B','General Awareness','Static GK','hard','When a central bank conducts an open-market sale of government securities, the immediate intended effect, all else equal, is to:','absorb liquidity from the banking system',['inject reserve money into banks','reduce the face value of every government security','guarantee an increase in bank credit'],'A sale receives funds from buyers and tends to absorb liquidity from the banking system.','Monetary operations','Track the direction of the cash payment in the transaction.',34002],
  ['RBI_B','General Awareness','Static GK','medium','A rise in the policy repo rate is generally intended to make short-term central-bank borrowing for eligible counterparties:','more expensive',['automatically interest-free','cheaper in nominal terms','unrelated to the policy rate'],'The repo rate is a policy rate that influences the cost of short-term funds; actual transmission depends on conditions.','RBI monetary policy','Separate the intended rate signal from the eventual effect on inflation or output.',34003],
  ['RBI_B','Quantitative Aptitude','Data Interpretation','hard','A bank’s deposits rise from ₹800 crore to ₹920 crore. Over the same period, advances rise from ₹600 crore to ₹690 crore. The advances-to-deposits ratio is:','75% in both periods',['75% initially and 80% later','80% initially and 75% later','the ratio cannot be compared'],'600/800 = 75%; 690/920 = 75%. The ratio is unchanged.','Banking data interpretation','Compute each ratio separately before comparing them.',34004],
  ['RBI_B','Reasoning','Puzzles','hard','Three officers A, B and C each handle exactly one of Risk, Audit and Treasury. A does not handle Risk. B handles Audit. C does not handle Treasury. Which assignment is consistent?','A–Treasury, B–Audit, C–Risk',['A–Risk, B–Audit, C–Treasury','A–Audit, B–Risk, C–Treasury','A–Treasury, B–Risk, C–Audit'],'B is Audit. A cannot be Risk, so A is Treasury or Audit; Audit is taken, hence A is Treasury and C is Risk, satisfying C not Treasury.','Constraint-based assignment','Apply fixed assignments first, then eliminate impossible options.',34005],
  ['RBI_B','English','Comprehension','medium','Passage: A bank’s rapid growth in digital transactions may improve convenience, but transaction volume alone does not show whether customers can resolve failed payments or access help. Which metric would best complement transaction volume?','The proportion of failed transactions resolved within a stated service time',['the number of promotional messages sent','the total number of app downloads only','the number of branches opened in a different region'],'Resolution within a defined time measures service quality and customer outcomes, which transaction volume alone cannot show.','Reading comprehension','Choose a measurable outcome that addresses the passage’s stated gap.',34006]
];

function addReviewedExamItems(addForExam) {
  for (const item of REVIEWED_EXAM_ITEMS) {
    const [examId,subject,topic,difficulty,text,correct,distractors,explanation,concept,tip,seed] = item;
    const q = numericQuestion(examId,subject,topic,text,correct,distractors,explanation,
      'Exam-realism reviewed: ' + concept,tip,seed,difficulty);
    addForExam(examId,subject,topic,[q]);
  }
}

function buildPriorityQuestionBank(exams, topics) {
  const rows = [];
  const byId = Object.fromEntries(exams.map(e => [e.id,e]));
  function addForExam(examId, sectionSubject, topic, questions) {
    const exam = byId[examId];
    if (!exam || !exam.pattern.sections.some(s => s.subject === sectionSubject)) return;
    const allowed = topics[sectionSubject] || [];
    for (const q of questions) {
      const rowTopic = q.topic && allowed.includes(q.topic) ? q.topic : topic;
      if (allowed.length && !allowed.includes(rowTopic)) throw new Error("Invalid topic " + rowTopic + " for " + sectionSubject);
      rows.push({ ...q, exam_id: examId, subject: sectionSubject, topic: rowTopic });
    }
  }
  // UPSC CSE Prelims GS: statement-combination practice across all six syllabus domains.
  const upscMap = [
    ["History","Modern India","History"],["Geography","Indian Geography","Geography"],["Polity","Constitution","Polity"],
    ["Economics","Indian Economy","Economics"],["Environment","Ecology","Environment"],["General Awareness","Static GK","GeneralAwareness"]
  ];
  for (let d = 0; d < upscMap.length; d++) {
    const [subject,topic,key] = upscMap[d];
    addForExam("UPSC_CSE", subject, topic, statementQuestions("UPSC_CSE",subject,topic,FACTS[key] || FACTS[key],90,1000+d*100));
  }
  // CSAT: a deeper pool for quantitative aptitude, reasoning and comprehension.
  addForExam("UPSC_CSAT","Quantitative Aptitude","Percentage",quantitativeQuestions("UPSC_CSAT","Quantitative Aptitude",180,2000));
  addForExam("UPSC_CSAT","Reasoning","Series",reasoningQuestions("UPSC_CSAT","Reasoning",180,3000));
  addForExam("UPSC_CSAT","English","Comprehension",englishQuestions("UPSC_CSAT","English",180,4000,"csat"));
  // SSC CGL Tier-I: speed/accuracy-oriented four-section banks.
  addForExam("SSC_CGL","Reasoning","Series",reasoningQuestions("SSC_CGL","Reasoning",150,5000));
  const sscGA = Object.values(FACTS).flatMap((facts,di) => statementQuestions("SSC_CGL","General Awareness",di === 5 ? "Science" : "Static GK",facts,25,6000+di*100)).slice(0,150);
  addForExam("SSC_CGL","General Awareness","Static GK",sscGA.map(q => ({...q,topic:q.topic==="Science"?"Science":"Static GK"})));
  addForExam("SSC_CGL","Quantitative Aptitude","Percentage",quantitativeQuestions("SSC_CGL","Quantitative Aptitude",150,7000));
  addForExam("SSC_CGL","English","Grammar",englishQuestions("SSC_CGL","English",150,8000,"ssc"));
  // RBI Grade B Phase-I: broad static/economy/financial awareness plus aptitude.
  const rbiFacts = Object.values(FACTS).concat([BANKING_FACTS]);
  const rbiGA = rbiFacts.flatMap((facts,di) => statementQuestions("RBI_B","General Awareness",di === 5 ? "Science" : "Static GK",facts,35,9000+di*100)).slice(0,240);
  addForExam("RBI_B","General Awareness","Static GK",rbiGA.map(q => ({...q,topic:q.topic==="Science"?"Science":"Static GK"})));
  addForExam("RBI_B","Quantitative Aptitude","Percentage",quantitativeQuestions("RBI_B","Quantitative Aptitude",100,11000));
  addForExam("RBI_B","Reasoning","Series",reasoningQuestions("RBI_B","Reasoning",100,12000));
  addForExam("RBI_B","English","Grammar",englishQuestions("RBI_B","English",100,13000,"ssc"));
  addReviewedExamItems(addForExam);
  return rows;
}
module.exports = { buildPriorityQuestionBank, FACTS, BANKING_FACTS, quantitativeQuestions, reasoningQuestions, englishQuestions, statementQuestions };
