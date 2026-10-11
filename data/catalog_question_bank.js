// Broad catalog bank builder. All records are original ADMIN_PRACTICE items.
// It reuses validated question families and curated domain facts, with strict syllabus-topic mapping.
const { buildPriorityQuestionBank, FACTS, BANKING_FACTS, quantitativeQuestions, reasoningQuestions, englishQuestions, statementQuestions } = require('./priority_question_bank');

const EXTRA_FACTS = {
  Computer: [
    ["RAM is volatile memory and normally loses its contents when power is removed.",true,"RAM is volatile working memory."],
    ["An operating system manages hardware resources and provides services to applications.",true,"Operating systems coordinate processes, memory, devices and software services."],
    ["A primary key uniquely identifies each row in a relational database table.",true,"Primary keys identify records uniquely."],
    ["SQL is commonly used to query and manage relational databases.",true,"SQL is the standard language for relational database operations."],
    ["HTTPS uses TLS to protect data in transit between a client and server.",true,"TLS provides transport encryption and authentication for HTTPS."],
    ["A phishing message may impersonate a trusted organisation to steal credentials.",true,"Phishing uses deceptive communications to obtain sensitive information."],
    ["A compiler translates source code into another form, often machine code or an intermediate representation.",true,"Compilers translate programs before or during execution."],
    ["An IP address helps identify an interface on an Internet Protocol network.",true,"IP addressing supports packet delivery across networks."],
    ["A spreadsheet cell is identified by its column and row reference.",true,"Cell references combine column letters and row numbers in common spreadsheet tools."],
    ["A backup stored only on the same physical device protects fully against device failure.",false,"A separate copy or off-site backup is needed for resilience to device loss."],
    ["Two-factor authentication combines two distinct categories of authentication evidence.",true,"MFA combines factors such as knowledge, possession or inherence."],
    ["A hash function is designed to map input data to a fixed-length digest.",true,"Cryptographic hashes produce fixed-length outputs for variable-length inputs."],
    ["An algorithm must always be written in a specific programming language.",false,"Algorithms can be expressed in plain language, pseudocode, flowcharts or code."],
    ["A loop can repeat a set of instructions while a condition holds.",true,"Loops implement repetition in programming."],
    ["An array commonly stores elements in an indexed sequence.",true,"Arrays support indexed access to a sequence of elements."],
    ["Machine learning systems can learn patterns from data.",true,"Machine learning uses data to fit models that generalise to new inputs."],
    ["Training data should always include the target answer in every deployment input.",false,"Training labels are not necessarily available at inference time and leakage can invalidate evaluation."],
    ["A confusion matrix compares predicted classes with actual classes.",true,"It summarises true and false positives and negatives for classification."],
    ["A neural network is a family of models built from connected computational units.",true,"Neural networks compose parameterised transformations."],
    ["Data minimisation means collecting every possible field just in case it is useful later.",false,"Data minimisation limits collection to what is needed for a defined purpose."]
  ],
  Physics: [
    ["The SI unit of force is the newton.",true,"One newton is the force that gives a one-kilogram mass an acceleration of one metre per second squared."],
    ["In the absence of a net external force, linear momentum of an isolated system is conserved.",true,"Momentum conservation follows from Newtonian mechanics for an isolated system."],
    ["The SI unit of electric charge is the coulomb.",true,"Electric charge is measured in coulombs."],
    ["In a series circuit, the current is the same through ideal components.",true,"A single path carries the same current through series elements."],
    ["The speed of light in vacuum is approximately 3 × 10^8 m/s.",true,"The vacuum speed of light is about 299,792,458 m/s."],
    ["A convex lens can form a real image of a real object when the object is outside its focal length.",true,"For an object beyond the focal point, a converging lens can form a real image."],
    ["The SI unit of frequency is the hertz.",true,"One hertz is one cycle per second."],
    ["Sound travels through a perfect vacuum without any medium.",false,"Sound is a mechanical wave and requires a material medium."],
    ["Work done by a constant force is the dot product of force and displacement.",true,"W = F s cos θ for a constant force."],
    ["The resistance of an ohmic conductor at constant physical conditions follows V = IR.",true,"Ohm's law relates voltage, current and resistance under specified conditions."],
    ["The half-life of a radioactive isotope is the time in which half the undecayed nuclei in a sample decay on average.",true,"Half-life characterises exponential radioactive decay."],
    ["A transformer operates through electromagnetic induction.",true,"Changing magnetic flux induces an electromotive force."],
    ["The magnitude of gravitational acceleration near Earth's surface is approximately 9.8 m/s².",true,"The local value varies slightly with latitude and altitude."],
    ["In uniform circular motion, velocity remains constant because speed is constant.",false,"Velocity changes direction continuously even when speed is constant."],
    ["The energy of a photon is proportional to its frequency.",true,"Photon energy is E = hν."],
    ["The refractive index of a medium is related to the speed of light in that medium.",true,"Absolute refractive index is n = c/v."],
    ["An ideal ammeter is connected in parallel with the component being measured.",false,"An ideal ammeter is connected in series and has negligible resistance."],
    ["An ideal voltmeter has very high resistance and is connected in parallel.",true,"This minimises current drawn by the measuring instrument."],
    ["The magnitude of the charge on an electron equals that on a proton.",true,"Their charges are equal in magnitude and opposite in sign."],
    ["The first law of thermodynamics expresses energy conservation for thermodynamic systems.",true,"It relates heat, work and change in internal energy."]
  ],
  Chemistry: [
    ["The atomic number of an element equals the number of protons in its nucleus.",true,"Atomic number defines the element."],
    ["Isotopes of an element have the same atomic number but different mass numbers.",true,"Isotopes differ in neutron number."],
    ["A catalyst changes the rate of a reaction without being consumed overall in the net reaction.",true,"Catalysts provide an alternative pathway and are regenerated."],
    ["At 25°C, a neutral aqueous solution has pH approximately 7.",true,"At 25°C, neutral water has equal hydrogen and hydroxide ion activities, conventionally pH 7."],
    ["Oxidation can be described as loss of electrons.",true,"Oxidation is electron loss; reduction is electron gain."],
    ["A covalent bond involves sharing electron pairs between atoms.",true,"Covalent bonding involves shared electron density."],
    ["An exothermic reaction releases heat to its surroundings at constant pressure.",true,"For an exothermic process, enthalpy change is negative."],
    ["The ideal gas equation is PV = nRT.",true,"The ideal gas law relates pressure, volume, amount and temperature."],
    ["A solution's molarity is moles of solute per litre of solution.",true,"Molarity is expressed in mol L−1."],
    ["The noble gases generally have low chemical reactivity under ordinary conditions.",true,"Their filled valence shells make them relatively unreactive."],
    ["A buffer solution resists pH changes when small amounts of acid or base are added.",true,"Buffers contain a conjugate acid-base pair or equivalent system."],
    ["The empirical formula gives the simplest whole-number ratio of atoms in a compound.",true,"Empirical formulas express the simplest atom ratio."],
    ["Electrolysis uses electrical energy to drive a non-spontaneous chemical reaction.",true,"An external current drives electrolytic reactions."],
    ["Increasing temperature always decreases the rate of every chemical reaction.",false,"Higher temperature commonly increases rates, though mechanisms and systems vary."],
    ["The mass number is the sum of protons and neutrons in a nucleus.",true,"Mass number counts nucleons."],
    ["An acid donates a proton in the Brønsted-Lowry model.",true,"Brønsted-Lowry acids are proton donors."],
    ["A precipitate is an insoluble solid that forms from a solution during a reaction.",true,"Precipitation produces a solid phase from solution."],
    ["The oxidation state of an element in its standard elemental form is zero.",true,"Elements in their standard uncombined form have oxidation state zero."],
    ["Enzymes are biological catalysts that can lower activation energy.",true,"Enzymes accelerate biochemical reactions without being consumed overall."],
    ["A strong acid is necessarily concentrated in every solution.",false,"Strength describes ionisation; concentration describes amount per volume."]
  ],
  Biology: [
    ["DNA carries hereditary information in most living organisms.",true,"DNA is the principal hereditary material in cellular organisms."],
    ["Ribosomes are involved in protein synthesis.",true,"Ribosomes translate messenger RNA into polypeptides."],
    ["Mitochondria are major sites of aerobic cellular respiration in eukaryotic cells.",true,"Mitochondria generate much cellular ATP through aerobic respiration."],
    ["Photosynthesis in plants uses light energy to help convert carbon dioxide and water into carbohydrates.",true,"Photosynthesis stores light energy in chemical form."],
    ["Natural selection acts on heritable variation that affects reproductive success.",true,"Differential reproductive success changes trait frequencies over generations."],
    ["Mitosis typically produces two daughter nuclei with the same chromosome number as the parent nucleus.",true,"Mitosis preserves chromosome number in ordinary cell division."],
    ["Meiosis reduces chromosome number and contributes to genetic variation.",true,"Meiosis forms haploid cells and recombines genetic material."],
    ["Antibodies are produced by specialised B-cell lineage cells called plasma cells.",true,"Plasma cells secrete antibodies."],
    ["The human heart has four chambers.",true,"The human heart consists of two atria and two ventricles."],
    ["Insulin generally helps lower blood glucose concentration.",true,"Insulin promotes glucose uptake and storage in relevant tissues."],
    ["All bacteria cause disease in humans.",false,"Many bacteria are harmless or beneficial; only some cause disease."],
    ["An ecosystem includes organisms and the physical environment with which they interact.",true,"Ecosystems include biotic communities and abiotic conditions."],
    ["Transpiration is the loss of water vapour from plant surfaces, especially leaves.",true,"Stomatal transpiration is a major component of plant water loss."],
    ["Vaccination can prepare immune responses against a pathogen or its components.",true,"Vaccines induce immune memory or protection."],
    ["In humans, red blood cells normally lack a nucleus when mature.",true,"Mature human erythrocytes are anucleate."],
    ["The nephron is the functional unit of the kidney.",true,"Nephrons filter blood and modify filtrate to form urine."],
    ["Osmosis is the net movement of water across a selectively permeable membrane down its water-potential gradient.",true,"Osmosis involves water movement across a selective membrane."],
    ["Viruses reproduce independently without using host-cell machinery.",false,"Viruses depend on host cells to replicate."],
    ["The sequence of amino acids in a polypeptide is specified by genetic information.",true,"Genetic information directs the amino-acid sequence during translation."],
    ["Biodiversity includes variation within species, between species and among ecosystems.",true,"These are commonly recognised levels of biodiversity."]
  ],
  Pedagogy: [
    ["Formative assessment is used to gather evidence during learning and guide next instructional steps.",true,"Formative assessment informs feedback and teaching adjustments."],
    ["Inclusive education aims to support participation and learning for diverse learners in shared educational settings.",true,"Inclusion seeks to remove barriers to participation."],
    ["Constructivist approaches emphasise learners actively building understanding from experience and prior knowledge.",true,"Constructivism treats learners as active meaning-makers."],
    ["A diagnostic assessment can help identify specific learning difficulties or prerequisite gaps.",true,"Diagnostic assessment informs targeted support."],
    ["Positive reinforcement can increase the likelihood of a behaviour being repeated.",true,"Reinforcement increases the probability of a behaviour."],
    ["Development is influenced by interactions between biological factors and environment.",true,"Development reflects multiple interacting influences."],
    ["A learner-centred classroom ignores student interests and prior knowledge.",false,"Learner-centred teaching considers learners' needs, interests and prior understanding."],
    ["Feedback is generally more useful when it is specific, timely and actionable.",true,"Specific feedback helps learners identify next steps."],
    ["Differentiated instruction can vary supports or tasks to respond to learner readiness and needs.",true,"Differentiation adjusts pathways while maintaining meaningful goals."],
    ["A single test score fully captures every aspect of a learner's ability.",false,"No single score fully represents the range of learner abilities."],
    ["Collaborative learning can provide opportunities for explanation and peer feedback.",true,"Structured collaboration can support learning through dialogue."],
    ["Universal Design for Learning encourages multiple means of engagement, representation and action/expression.",true,"UDL anticipates learner variability in lesson design."],
    ["Intrinsic motivation refers to engaging in an activity for its inherent interest or satisfaction.",true,"Intrinsic motivation arises from the activity itself."],
    ["Scaffolding provides temporary support that can be reduced as competence grows.",true,"Scaffolding supports progress toward independent performance."],
    ["A safe classroom climate can support participation and willingness to take intellectual risks.",true,"Psychological safety can help students ask questions and learn from errors."]
  ],
  Legal: [
    ["The rule of law requires public power to be exercised under law rather than arbitrary personal discretion.",true,"Rule of law constrains arbitrary power and requires legal accountability."],
    ["A contract generally requires agreement, capacity, lawful consideration where required and lawful object under applicable law.",true,"Contract validity depends on statutory and doctrinal requirements."],
    ["The Indian Constitution is the supreme law of India.",true,"All ordinary laws and state action must conform to the Constitution."],
    ["The presumption of innocence is a foundational principle of criminal justice.",true,"The prosecution generally bears the burden of proving guilt to the required standard."],
    ["A tort is a civil wrong for which the law may provide a remedy.",true,"Tort law addresses civil wrongs independent of contract in many cases."],
    ["The Supreme Court of India is established under Article 124 of the Constitution.",true,"Article 124 provides for the Supreme Court."],
    ["Fundamental Rights are contained in Part III of the Indian Constitution.",true,"Part III contains Fundamental Rights."],
    ["A valid offer and acceptance can be relevant to establishing agreement.",true,"Offer and acceptance are central elements of contract formation."],
    ["Mens rea broadly refers to a required mental element of an offence.",true,"Many offences require a specified mental element, subject to statutory exceptions."],
    ["Every breach of contract automatically constitutes a criminal offence.",false,"A contract breach is ordinarily civil unless separate criminal elements are established."],
    ["Judicial review allows courts to examine the legality or constitutionality of certain public actions.",true,"Judicial review checks legal limits on public power."],
    ["The principle of natural justice can include an opportunity to be heard.",true,"Audi alteram partem is a core natural-justice principle, subject to context and law."],
    ["A legal precedent may guide or bind later courts according to the applicable hierarchy and doctrine.",true,"Precedent operates under rules of jurisdiction and binding authority."],
    ["The Indian Penal Code has remained the only general criminal code in force without statutory replacement since 2024.",false,"India's new criminal laws, including the Bharatiya Nyaya Sanhita, came into force in 2024."],
    ["The Constitution provides for an independent judiciary as part of India's constitutional framework.",true,"Judicial independence is protected through constitutional design and legal safeguards."]
  ],
  Accountancy: [
    ["The accounting equation is Assets = Liabilities + Equity.",true,"The accounting equation expresses the relationship between assets, liabilities and owners' equity."],
    ["Under double-entry bookkeeping, a transaction affects at least two accounts in a balanced entry.",true,"Double-entry records equal debit and credit totals."],
    ["Depreciation allocates the depreciable amount of a tangible asset over its useful life.",true,"Depreciation is systematic allocation, not necessarily a measure of market value."],
    ["A trial balance that agrees proves that no accounting error has occurred.",false,"Some errors do not affect trial-balance agreement."],
    ["A bank reconciliation statement explains differences between the cash-book and bank-statement balances.",true,"Timing differences and errors may cause balances to differ."],
    ["Revenue is ordinarily recognised according to the applicable accounting framework's recognition criteria.",true,"Revenue recognition follows the relevant standards and transaction facts."],
    ["A debit always means an increase in every account.",false,"Debits increase assets and expenses but may decrease liabilities, equity or revenue."],
    ["Closing inventory affects cost of goods sold and profit under common inventory accounting methods.",true,"Inventory valuation influences cost of goods sold and reported profit."],
    ["A balance sheet reports financial position at a particular date.",true,"It reports assets, liabilities and equity at a point in time."],
    ["A cash-flow statement classifies cash flows into operating, investing and financing activities.",true,"These are the standard cash-flow categories."],
    ["Goodwill may arise in a business combination when consideration exceeds the fair value of identifiable net assets acquired, subject to the applicable framework.",true,"Goodwill accounting follows the relevant business-combination standard."],
    ["A provision is recognised only when an amount and timing are perfectly certain.",false,"Provisions involve estimates where applicable recognition criteria are met."],
    ["Working capital is commonly calculated as current assets minus current liabilities.",true,"Net working capital measures the excess of current assets over current liabilities."],
    ["A partnership deed can document profit-sharing ratios and other agreed terms.",true,"The deed records important partnership arrangements."],
    ["Capital expenditure generally creates or improves a long-term asset or capacity.",true,"Capital expenditure is distinguished from routine revenue expenditure by its nature and benefit."]
  ],
  Business: [
    ["Planning involves setting objectives and determining actions to achieve them.",true,"Planning sets goals and selects courses of action."],
    ["Delegation transfers authority for tasks while ultimate accountability of the manager is not automatically eliminated.",true,"Delegation assigns authority but does not erase managerial accountability."],
    ["Marketing includes understanding customer needs and creating, communicating and delivering value.",true,"Marketing extends beyond advertising or selling."],
    ["Working capital management concerns short-term assets and liabilities.",true,"It supports liquidity and day-to-day operations."],
    ["A sole proprietorship and a company are always the same legal form.",false,"They differ in ownership, legal status and liability framework."],
    ["Entrepreneurship involves identifying opportunities and organising resources under uncertainty.",true,"Entrepreneurs mobilise resources to pursue opportunities."],
    ["A mission statement can communicate an organisation's purpose.",true,"Mission statements express organisational purpose."],
    ["Consumer protection frameworks can address misleading claims and unfair practices.",true,"Consumer laws provide remedies and obligations for market conduct."],
    ["A SWOT analysis considers strengths, weaknesses, opportunities and threats.",true,"SWOT combines internal and external factors."],
    ["A budget can help plan and monitor expected income and expenditure.",true,"Budgets support planning and control."],
    ["Human resource management includes recruitment, development and performance-related processes.",true,"HRM manages the employment lifecycle and workforce capabilities."],
    ["A company's profit and cash flow are always identical measures.",false,"Profit and cash flow differ due to accruals, non-cash items and timing."],
    ["A cooperative organisation is based on voluntary membership and member-oriented principles.",true,"Cooperatives are formed to meet common member needs."],
    ["Risk management includes identifying, assessing and responding to uncertainty.",true,"Risk management is a structured process for uncertainty."],
    ["A break-even point is where total revenue equals total cost.",true,"At break-even, operating profit is zero under the model."]
  ],
  Psychology: [
    ["Classical conditioning involves learning associations between stimuli.",true,"Classical conditioning links stimuli and can produce learned responses."],
    ["Working memory is involved in temporarily holding and manipulating information.",true,"Working memory supports short-term active processing."],
    ["Correlation alone establishes that one variable causes another.",false,"Correlation does not by itself establish causation."],
    ["A research hypothesis should be testable against observations or data.",true,"A scientific hypothesis must be open to empirical evaluation."],
    ["The Big Five model includes openness, conscientiousness, extraversion, agreeableness and neuroticism.",true,"These are the five broad personality dimensions."],
    ["Stress responses can be influenced by appraisal and coping resources.",true,"Psychological appraisal affects responses to demands."],
    ["A sample is always identical to the population from which it is drawn.",false,"Samples represent subsets and may contain sampling error."],
    ["Reinforcement and punishment have different effects on the likelihood of a behaviour.",true,"Reinforcement increases behaviour; punishment aims to reduce it."],
    ["Observational learning can occur by watching other people.",true,"Modelling can contribute to learning."],
    ["Emotion and cognition can influence one another.",true,"Emotional processes and thinking interact."],
    ["A reliable measurement gives consistent results under comparable conditions.",true,"Reliability concerns consistency."],
    ["Validity concerns whether evidence supports the intended interpretation of a measure.",true,"Validity is about the defensibility of interpretations and uses."]
  ],
  Sociology: [
    ["Socialisation is a process through which people learn norms, values and social roles.",true,"Socialisation occurs through families, peers, institutions and wider society."],
    ["A social institution is simply an individual person acting alone.",false,"Institutions are organised patterns of norms, roles and practices."],
    ["Social stratification refers to structured inequalities among social groups.",true,"Stratification organises unequal access to resources and opportunities."],
    ["Culture can include shared meanings, practices, symbols and values.",true,"Culture is broader than artistic products alone."],
    ["A census attempts to enumerate the relevant population under its defined scope.",true,"A census is a population enumeration at a specified reference time."],
    ["Social change can be influenced by technology, economy, politics and cultural processes.",true,"Multiple interacting forces shape social change."],
    ["A sample survey always has zero measurement error.",false,"Surveys can have sampling and non-sampling errors."],
    ["Primary groups are often characterised by close, enduring interpersonal relationships.",true,"Primary groups commonly involve intimate face-to-face relations."],
    ["Demographic transition models describe broad patterns in birth and death rates over development.",true,"The model describes stages of demographic change, with limitations."],
    ["A norm is a social expectation or rule for behaviour.",true,"Norms guide and regulate conduct."],
    ["Urbanisation involves an increasing share of people living in urban areas.",true,"Urbanisation describes growth in the urban share or urban settlements."],
    ["Social mobility concerns movement between social positions.",true,"Mobility can be intergenerational or intragenerational."]
  ],
  PhysicalEducation: [
    ["Regular physical activity can support cardiovascular health.",true,"Physical activity contributes to cardiorespiratory fitness and health."],
    ["A warm-up can prepare the body for more intense activity.",true,"Warm-ups gradually increase physiological readiness."],
    ["Flexibility is the range of motion available at a joint or group of joints.",true,"Flexibility describes joint range of motion."],
    ["Overtraining can improve performance indefinitely without recovery.",false,"Insufficient recovery can impair performance and health."],
    ["Hydration needs can vary with exercise intensity, duration and environmental conditions.",true,"Sweat loss and conditions influence fluid needs."],
    ["Progressive overload increases training demands in a planned manner.",true,"Training adaptations require appropriately managed increases in load."],
    ["The principle of specificity means training adaptations relate partly to the demands practised.",true,"Specificity links training stimulus to the target performance."],
    ["A sprain commonly involves injury to a ligament.",true,"Sprains affect ligaments; strains involve muscles or tendons."],
    ["Static equilibrium occurs when the body is at rest and net force and torque are zero.",true,"Static equilibrium requires balanced forces and moments."],
    ["BMI alone fully determines an individual's health and fitness.",false,"BMI is a screening measure and does not fully assess health or body composition."],
    ["Reaction time is the interval between a stimulus and the start of a response.",true,"Reaction time measures stimulus-to-response initiation."],
    ["Rest and recovery are part of a balanced training programme.",true,"Recovery enables adaptation and helps manage fatigue."]
  ],
  Hindi: [
    ["संज्ञा किसी व्यक्ति, वस्तु, स्थान या भाव के नाम को कहते हैं।",true,"संज्ञा नाम बताने वाला शब्द है।"],
    ["सर्वनाम संज्ञा के स्थान पर प्रयुक्त हो सकता है।",true,"सर्वनाम संज्ञा की पुनरावृत्ति कम करता है।"],
    ["क्रिया से कार्य, अवस्था या घटना का बोध हो सकता है।",true,"क्रिया वाक्य में कार्य या अवस्था व्यक्त करती है।"],
    ["विशेषण संज्ञा या सर्वनाम की विशेषता बता सकता है।",true,"विशेषण गुण, संख्या या परिमाण बता सकता है।"],
    ["मुहावरे का अर्थ प्रायः उसके शब्दों के शाब्दिक अर्थ से अलग होता है।",true,"मुहावरा रूढ़ अर्थ में प्रयुक्त होता है।"],
    ["विलोम शब्द समान अर्थ वाले शब्द होते हैं।",false,"विलोम विपरीत अर्थ वाले शब्द होते हैं।"],
    ["पर्यायवाची शब्द समान या निकट अर्थ व्यक्त कर सकते हैं।",true,"पर्यायवाची शब्दों के अर्थ में संदर्भ के अनुसार अंतर भी हो सकता है।"],
    ["वाक्य में विराम-चिह्न अर्थ स्पष्ट करने में मदद करते हैं।",true,"विराम-चिह्न वाक्य की संरचना और भाव स्पष्ट करते हैं।"],
    ["समास में दो या अधिक पद मिलकर संक्षिप्त पद बना सकते हैं।",true,"समास पदों का संक्षिप्त संयोजन है।"],
    ["संधि में ध्वनियों के मेल से परिवर्तन हो सकता है।",true,"संधि ध्वनि-स्तर पर होने वाला परिवर्तन है।"],
    ["अपठित गद्यांश के प्रश्नों के उत्तर गद्यांश के प्रमाण से देने चाहिए।",true,"उत्तर में बाहरी अनुमान के बजाय पाठ-साक्ष्य महत्त्वपूर्ण है।"],
    ["औपचारिक लेखन में प्रसंगानुसार स्पष्ट और संयत भाषा उपयोगी होती है।",true,"औपचारिक लेखन में उद्देश्य, पाठक और शैली का ध्यान रखा जाता है।"]
  ],
  Sanskrit: [
    ["संस्कृते 'रामः' इति प्रथमा-विभक्तेः एकवचनरूपम् अस्ति।",true,"'रामः' इति प्रथमा एकवचनम्।"],
    ["धातुः क्रियायाः मूलरूपं भवति।",true,"धातु से क्रियारूप बनते हैं।"],
    ["सन्धिः वर्णानां मेलनेन जायते।",true,"सन्धि में ध्वनियों के मेल से परिवर्तन होता है।"],
    ["समासः पदानां संक्षिप्तसंयोगः भवति।",true,"समास में पद मिलकर संक्षिप्त रूप बनाते हैं।"],
    ["'फलानि' इति नपुंसकलिङ्गस्य बहुवचनरूपम् अस्ति।",true,"फलम् का प्रथमा बहुवचन फलानि है।"],
    ["'गच्छति' इति लट्-लकारस्य प्रथमपुरुष-एकवचनरूपम् अस्ति।",true,"गम् धातु का लट् प्रथमपुरुष एकवचन गच्छति है।"],
    ["विभक्तयः वाक्ये पदानां सम्बन्धं दर्शयन्ति।",true,"विभक्तियाँ पदों के व्याकरणिक सम्बन्ध बताती हैं।"],
    ["सर्वनाम संज्ञायाः स्थाने प्रयुज्यते।",true,"सर्वनाम संज्ञा के स्थान पर आता है।"],
    ["विशेषणं विशेष्यस्य गुणं वा लक्षणं बोधयति।",true,"विशेषण विशेष्य का गुण बताता है।"],
    ["'अहम्' इति उत्तमपुरुष-एकवचनसर्वनाम अस्ति।",true,"अहम् प्रथम व्यक्ति का एकवचन सर्वनाम है।"],
    ["लकाराः क्रियायाः कालं वा भावं सूचयन्ति।",true,"लकार क्रिया के काल या भाव को व्यक्त करते हैं।"],
    ["श्लोकस्य अर्थनिर्णये व्याकरणं प्रसङ्गश्च सहायकौ भवतः।",true,"अर्थ समझने में व्याकरण और संदर्भ दोनों उपयोगी हैं।"]
  ],
  FineArts: [
    ["Primary colours in the traditional RYB model are red, yellow and blue.",true,"The traditional subtractive art model uses red, yellow and blue as primary colours."],
    ["Complementary colours are positioned opposite each other on a colour wheel.",true,"Complementary pairs create strong contrast."],
    ["Perspective techniques can create an illusion of depth on a flat surface.",true,"Linear and atmospheric perspective suggest spatial depth."],
    ["Chiaroscuro uses contrasts of light and shadow to model form.",true,"Chiaroscuro emphasises tonal contrast."],
    ["A composition's balance concerns the visual distribution of elements.",true,"Balance may be symmetrical, asymmetrical or radial."],
    ["A sculpture must always be made from marble.",false,"Sculpture can use stone, metal, wood, clay and many other materials."],
    ["Texture can be actual or visually implied in an artwork.",true,"Texture may be tactile or represented visually."],
    ["A focal point attracts attention within a composition.",true,"Artists can guide attention through contrast, placement and scale."],
    ["The Ajanta caves are known for ancient Indian paintings and Buddhist art.",true,"Ajanta is renowned for murals and Buddhist monuments."],
    ["The Bengal School was associated with a revivalist movement in modern Indian art.",true,"The Bengal School sought alternatives to academic colonial art conventions."],
    ["A monochromatic scheme uses variations of one hue.",true,"A monochromatic palette varies lightness, darkness and saturation of one hue."],
    ["Negative space refers to the areas around and between subjects.",true,"Negative space contributes to composition and visual balance."]
  ],
  CT_AI: [
    ["An algorithm is a finite sequence of well-defined steps for solving a problem.",true,"Algorithms describe procedures for solving tasks."],
    ["A dataset should be checked for bias and quality before training a model.",true,"Data quality and representation affect model performance."],
    ["A model's output is always correct if its training accuracy is high.",false,"High training accuracy may reflect overfitting and does not guarantee generalisation."],
    ["Privacy and consent are important considerations when collecting personal data.",true,"Responsible data use requires lawful, transparent and proportionate handling."],
    ["A flowchart can represent the sequence and branching of a process.",true,"Flowcharts use symbols and arrows to depict logic."],
    ["A loop is used to repeat instructions in an algorithm.",true,"Loops implement repetition."],
    ["A variable can store a value that may change during program execution.",true,"Variables name values used by a program."],
    ["Testing should include edge cases as well as typical inputs.",true,"Edge-case tests can expose boundary failures."],
    ["AI fairness can be assessed by examining outcomes across relevant groups.",true,"Fairness evaluation considers impacts across groups and contexts."],
    ["Personal data should be shared publicly whenever it makes model training easier.",false,"Personal data requires safeguards and should not be disclosed without an appropriate basis."],
    ["A classification model predicts a category or class.",true,"Classification predicts discrete labels."],
    ["A test set should be kept separate from training decisions to reduce evaluation leakage.",true,"Repeated tuning on the test set can make the final evaluation misleading."]
  ]
};

function factsFor(subject) {
  const s = String(subject || '');
  if (['History'].includes(s)) return FACTS.History;
  if (['Geography'].includes(s)) return FACTS.Geography;
  if (['Polity','Political Science'].includes(s)) return FACTS.Polity;
  if (['Economics'].includes(s)) return FACTS.Economics;
  if (['Environment'].includes(s)) return FACTS.Environment;
  if (['Banking Awareness'].includes(s)) return BANKING_FACTS;
  if (['Computer Awareness','Computer Science','Computer Applications','Informatics Practices','CT & AI'].includes(s)) return EXTRA_FACTS[s === 'CT & AI' ? 'CT_AI' : 'Computer'];
  if (['Physics'].includes(s)) return EXTRA_FACTS.Physics;
  if (['Chemistry'].includes(s)) return EXTRA_FACTS.Chemistry;
  if (['Biology'].includes(s)) return EXTRA_FACTS.Biology;
  if (['Child Pedagogy'].includes(s)) return EXTRA_FACTS.Pedagogy;
  if (['Legal Aptitude','Legal Studies'].includes(s)) return EXTRA_FACTS.Legal;
  if (['Accountancy'].includes(s)) return EXTRA_FACTS.Accountancy;
  if (['Business Studies','Entrepreneurship'].includes(s)) return EXTRA_FACTS.Business;
  if (['Psychology'].includes(s)) return EXTRA_FACTS.Psychology;
  if (['Sociology'].includes(s)) return EXTRA_FACTS.Sociology;
  if (['Physical Education'].includes(s)) return EXTRA_FACTS.PhysicalEducation;
  if (['Fine Arts'].includes(s)) return EXTRA_FACTS.FineArts;
  if (['Hindi','Hindi A','Hindi B','Hindi Core'].includes(s)) return EXTRA_FACTS.Hindi;
  if (['Sanskrit'].includes(s)) return EXTRA_FACTS.Sanskrit;
  if (['Science'].includes(s)) return [...EXTRA_FACTS.Physics,...EXTRA_FACTS.Chemistry,...EXTRA_FACTS.Biology];
  if (['General Awareness'].includes(s)) return [...FACTS.GeneralAwareness,...FACTS.History,...FACTS.Geography,...FACTS.Polity,...FACTS.Economics,...FACTS.Environment,...BANKING_FACTS];
  if (['Social Science'].includes(s)) return [...FACTS.History,...FACTS.Geography,...FACTS.Polity,...FACTS.Economics];
  if (['English','English Core','English Language & Literature'].includes(s)) return null;
  if (['Mathematics','Applied Mathematics','Quantitative Aptitude'].includes(s)) return null;
  if (['Reasoning'].includes(s)) return null;
  return null;
}
function factGroupsFor(subject, allowed) {
  const s = String(subject || '');
  const group = (topic, facts) => ({ topic: allowed.includes(topic) ? topic : (allowed[0] || 'General'), facts });
  if (s === 'General Awareness') return [
    group('Static GK', FACTS.History), group('Static GK', FACTS.Geography), group('Static GK', FACTS.Polity),
    group('Static GK', FACTS.Economics), group('Science', EXTRA_FACTS.Physics.concat(EXTRA_FACTS.Chemistry,EXTRA_FACTS.Biology)),
    group('Current Affairs', FACTS.Environment), group('Static GK', BANKING_FACTS), group('Important Days', FACTS.GeneralAwareness)
  ];
  if (s === 'Social Science') return [
    group('History', FACTS.History), group('Geography', FACTS.Geography), group('Political Science', FACTS.Polity), group('Economics', FACTS.Economics)
  ];
  if (s === 'Science') return [
    group('Motion', EXTRA_FACTS.Physics), group('Matter and Its Nature', EXTRA_FACTS.Chemistry), group('Life Processes', EXTRA_FACTS.Biology)
  ];
  if (s === 'History') return [group(allowed.includes('Modern India') ? 'Modern India' : allowed[0], FACTS.History)];
  if (s === 'Geography') return [group(allowed.includes('Indian Geography') ? 'Indian Geography' : allowed[0], FACTS.Geography)];
  if (s === 'Polity' || s === 'Political Science') {
    const chunks = [FACTS.Polity.slice(0,5), FACTS.Polity.slice(5,10), FACTS.Polity.slice(10)];
    const labels = s === 'Polity' ? ['Constitution','Fundamental Rights','Parliament'] : ['Constitution at Work','Indian Constitution','Executive & Legislature'];
    return chunks.map((facts,i) => group(labels[i] || allowed[i % allowed.length], facts));
  }
  if (s === 'Economics') return [
    group('Basic Concepts', FACTS.Economics.slice(0,5)), group('Indian Economy', FACTS.Economics.slice(5,9)), group('Banking & Finance', FACTS.Economics.slice(9))
  ];
  if (s === 'Environment') return [
    group('Ecology', FACTS.Environment.slice(0,5)), group('Climate Change', FACTS.Environment.slice(5,9)), group('Biodiversity', FACTS.Environment.slice(9))
  ];
  if (s === 'Banking Awareness') return [
    group('Banking Basics', BANKING_FACTS.slice(0,4)), group('RBI & Monetary Policy', BANKING_FACTS.slice(4,8)), group('Financial Institutions', BANKING_FACTS.slice(8))
  ];
  if (s === 'Physics') return [
    group(allowed.includes('Mechanics') ? 'Mechanics' : allowed[0], EXTRA_FACTS.Physics.slice(0,5)),
    group(allowed.includes('Electricity & Magnetism') ? 'Electricity & Magnetism' : allowed[1] || allowed[0], EXTRA_FACTS.Physics.slice(5,11)),
    group(allowed.includes('Optics') ? 'Optics' : allowed[2] || allowed[0], EXTRA_FACTS.Physics.slice(11))
  ];
  if (s === 'Chemistry') return [
    group(allowed.includes('Physical Chemistry') ? 'Physical Chemistry' : allowed[0], EXTRA_FACTS.Chemistry.slice(0,7)),
    group(allowed.includes('Inorganic Chemistry') ? 'Inorganic Chemistry' : allowed[1] || allowed[0], EXTRA_FACTS.Chemistry.slice(7,14)),
    group(allowed.includes('Organic Chemistry') ? 'Organic Chemistry' : allowed[2] || allowed[0], EXTRA_FACTS.Chemistry.slice(14))
  ];
  if (s === 'Biology') return [
    group(allowed.includes('Cell Biology') ? 'Cell Biology' : allowed[0], EXTRA_FACTS.Biology.slice(0,6)),
    group(allowed.includes('Human Physiology') ? 'Human Physiology' : allowed[1] || allowed[0], EXTRA_FACTS.Biology.slice(6,12)),
    group(allowed.includes('Genetics') ? 'Genetics' : allowed[2] || allowed[0], EXTRA_FACTS.Biology.slice(12))
  ];
  const facts = factsFor(s);
  if (!facts) return [];
  return [group(allowed[0], facts)];
}
function topicForQuestion(subject, questionTopic, allowed, index) {
  if (allowed.includes(questionTopic)) return questionTopic;
  const s = String(subject || '');
  const t = String(questionTopic || '').toLowerCase();
  const preferred = [];
  if (s === 'General Awareness') {
    if (t.includes('science')) preferred.push('Science');
    if (t.includes('history')) preferred.push('Static GK');
    if (t.includes('environment')) preferred.push('Current Affairs');
    preferred.push('Static GK','Current Affairs','Important Days');
  } else if (s === 'English Core') {
    if (t.includes('comprehension')) preferred.push('Reading Comprehension');
    preferred.push('Literature','Creative Writing','Reading Comprehension');
  } else if (s === 'English Language & Literature') {
    if (t.includes('comprehension')) preferred.push('Reading');
    preferred.push('Grammar','Reading','Writing Skills');
  } else if (s === 'Applied Mathematics') {
    preferred.push(t.includes('interest') ? 'Financial Mathematics' : t.includes('average') ? 'Statistics' : t.includes('data') ? 'Statistics' : 'Algebra');
  } else if (s === 'Mathematics') {
    preferred.push(t.includes('average') || t.includes('data') ? 'Statistics' : t.includes('ratio') || t.includes('percentage') || t.includes('profit') ? 'Algebra' : t.includes('number') ? 'Numbers' : 'Algebra');
  } else if (s === 'Quantitative Aptitude') {
    preferred.push(questionTopic);
  } else if (s === 'Reasoning') {
    preferred.push(questionTopic);
  } else if (s === 'English') {
    preferred.push(t.includes('comprehension') ? 'Comprehension' : t.includes('vocab') || t.includes('synonym') || t.includes('antonym') ? 'Vocabulary' : 'Grammar');
  } else if (s === 'Science') {
    preferred.push(t.includes('chem') ? 'Natural Resources' : t.includes('bio') ? 'Life Processes' : t.includes('optic') ? 'Light' : 'Motion');
  } else if (s === 'Legal Aptitude') {
    preferred.push('Legal Reasoning');
  }
  for (const item of preferred) if (allowed.includes(item)) return item;
  return allowed[index % Math.max(allowed.length,1)] || 'General';
}
function buildCatalogQuestionBank(exams, topics, baseQuestions, expandedQuestions, priorityRows) {
  const rows = [];
  const skip = new Set(['UPSC_CSE','UPSC_CSAT','SSC_CGL','RBI_B']);
  const byId = Object.fromEntries(exams.map(e => [e.id,e]));
  const source = [...baseQuestions,...expandedQuestions];
  const addRows = (exam, subject, questions, allowed) => {
    const target = 500;
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      const topic = topicForQuestion(subject, q.topic, allowed, i);
      if (!allowed.includes(topic)) continue;
      rows.push({ ...q, exam_id: exam.id, subject, topic, source_type:'ADMIN_PRACTICE', pyq_year:null, pyq_paper:null, pyq_shift:null, source_ref:null });
    }
  };
  for (const exam of exams) {
    if (skip.has(exam.id)) continue;
    const sections = exam.pattern.sections || [];
    if (!sections.length) continue;
    const targetPerSection = Math.ceil(500 / sections.length);
    for (let si = 0; si < sections.length; si++) {
      const section = sections[si], subject = section.subject;
      const allowed = topics[subject] || ['General'];
      let questions = [];
      if (['Mathematics','Applied Mathematics','Quantitative Aptitude'].includes(subject)) {
        questions = quantitativeQuestions(exam.id,subject,targetPerSection,15000 + si*1000 + exam.id.length*17);
      } else if (subject === 'Reasoning') {
        questions = reasoningQuestions(exam.id,subject,targetPerSection,18000 + si*1000 + exam.id.length*19);
      } else if (['English','English Core','English Language & Literature'].includes(subject)) {
        questions = englishQuestions(exam.id,subject,targetPerSection,21000 + si*1000 + exam.id.length*23, subject === 'English' ? 'ssc' : 'school');
      } else {
        const groups = factGroupsFor(subject, allowed);
        if (groups.length) {
          const seenLocal = new Set();
          for (let gi = 0; gi < groups.length && questions.length < targetPerSection; gi++) {
            const g = groups[gi];
            const need = Math.ceil((targetPerSection - questions.length) / (groups.length - gi));
            const generated = statementQuestions(exam.id,subject,g.topic,g.facts,need,24000 + si*1000 + gi*100 + exam.id.length*29);
            for (const q of generated) {
              if (seenLocal.has(q.text)) continue;
              seenLocal.add(q.text);
              questions.push(q);
              if (questions.length >= targetPerSection) break;
            }
          }
        }
      }
      // Add existing authored material first, where available; keep stems unique per exam+section.
      const known = source.filter(q => q.subject === subject && allowed.includes(q.topic));
      const seen = new Set();
      const combined = [];
      for (const q of [...known,...questions]) {
        const key = q.text;
        if (seen.has(key)) continue;
        seen.add(key);
        combined.push(q);
        if (combined.length >= targetPerSection) break;
      }
      // A section must have enough questions to make practice usable. Never fabricate PYQ labels.
      if (combined.length < targetPerSection && factsFor(subject)) {
        const facts = factsFor(subject);
        const extra = statementQuestions(exam.id,subject,allowed[0] || 'General',facts,targetPerSection-combined.length,29000 + si*1000 + exam.id.length*31);
        for (const q of extra) {
          if (seen.has(q.text)) continue;
          seen.add(q.text);
          combined.push(q);
          if (combined.length >= targetPerSection) break;
        }
      }
      addRows(exam,subject,combined,allowed);
    }
  }
  return rows;
}
module.exports = { buildCatalogQuestionBank, factsFor, EXTRA_FACTS, topicForQuestion };
