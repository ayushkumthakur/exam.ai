// Build exam-specific banks from authored practice material without mislabelling it as PYQ.
// Every generated row keeps source_type ADMIN_PRACTICE and a topic allowed by that exam's syllabus.
const SOURCE_ALIASES = {
  "General Awareness": ["General Awareness", "History", "Geography", "Polity", "Economics", "Environment", "Banking Awareness", "Computer Awareness", "Physics", "Chemistry", "Biology"],
  "Social Science": ["Social Science", "History", "Geography", "Polity", "Political Science", "Economics"],
  "Science": ["Science", "Physics", "Chemistry", "Biology"],
  "English Core": ["English Core"],
  "English Language & Literature": ["English Language & Literature", "English"],
  "Hindi A": ["Hindi A"],
  "Hindi B": ["Hindi B"],
  "Hindi Core": ["Hindi Core"],
  "Mathematics": ["Mathematics", "Quantitative Aptitude"],
  "Applied Mathematics": ["Applied Mathematics", "Mathematics", "Quantitative Aptitude"],
  "Quantitative Aptitude": ["Quantitative Aptitude", "Mathematics"],
  "English": ["English", "English Core", "English Language & Literature"],
  "Polity": ["Polity", "Political Science"],
};

function topicFor(target, item, allowed) {
  if (allowed.includes(item.topic)) return item.topic;
  if (target === "General Awareness") {
    if (["Physics", "Chemistry", "Biology", "Science"].includes(item.subject)) return "Science";
    return "Static GK";
  }
  if (target === "Social Science") {
    if (item.subject === "History") return "History";
    if (item.subject === "Geography") return "Geography";
    if (item.subject === "Economics") return "Economics";
    if (["Polity", "Political Science"].includes(item.subject)) return "Political Science";
  }
  if (target === "Science") {
    if (item.subject === "Physics") {
      const t = String(item.topic).toLowerCase();
      if (t.includes("optic") || t.includes("light")) return "Light";
      if (t.includes("electric")) return "Electricity";
      if (t.includes("heat") || t.includes("thermo")) return "Heat";
      if (t.includes("motion") || t.includes("mechanic")) return "Motion";
      return "Force and Laws of Motion";
    }
    if (item.subject === "Chemistry") return "Matter and Its Nature";
    if (item.subject === "Biology") return "Life Processes";
  }
  if (target === "English") {
    if (String(item.topic).toLowerCase().includes("read") || String(item.topic).toLowerCase().includes("comprehension")) return "Comprehension";
    if (allowed.includes("Grammar")) return "Grammar";
  }
  if (target === "English Language & Literature") {
    if (String(item.topic).toLowerCase().includes("read") || String(item.topic).toLowerCase().includes("comprehension")) return "Reading";
    if (allowed.includes("Grammar")) return "Grammar";
  }
  if (target === "English Core") {
    if (String(item.topic).toLowerCase().includes("read") || String(item.topic).toLowerCase().includes("comprehension")) return "Reading Comprehension";
  }
  if (target === "Polity" && item.subject === "Political Science") {
    const t = String(item.topic).toLowerCase();
    if (t.includes("judiciar")) return "Judiciary";
    if (t.includes("parliament") || t.includes("legislature")) return "Parliament";
    return "Constitution";
  }
  // Mathematics aliases are used only when the actual topic exists in the target syllabus.
  return null;
}

function buildExamQuestionBank(exams, topics, baseQuestions, expandedQuestions) {
  const source = [...baseQuestions, ...expandedQuestions];
  const rows = [];
  for (const exam of exams) {
    const seen = new Set();
    for (const section of exam.pattern.sections || []) {
      const subject = section.subject;
      const allowed = topics[subject] || ["General"];
      const sourceSubjects = SOURCE_ALIASES[subject] || [subject];
      for (const item of source) {
        if (!sourceSubjects.includes(item.subject)) continue;
        let topic = allowed.includes(item.topic) ? item.topic : null;
        if (!topic) topic = topicFor(subject, item, allowed);
        if (!topic || !allowed.includes(topic)) continue;
        const key = subject + "\u0000" + topic + "\u0000" + item.text;
        if (seen.has(key)) continue;
        seen.add(key);
        rows.push({
          exam_id: exam.id, subject, topic,
          difficulty: ["easy", "medium", "hard"].includes(item.difficulty) ? item.difficulty : "medium",
          text: item.text, options: item.options, answer: item.answer,
          explanation: item.explanation || "Review the concept and eliminate options using the stated rule.",
          concept: item.concept || topic, tip: item.tip || "Identify the tested concept before selecting an option.",
          source_type: "ADMIN_PRACTICE", pyq_year: null, pyq_paper: null, pyq_shift: null, source_ref: null
        });
      }
    }
  }
  return rows;
}

module.exports = { buildExamQuestionBank, topicFor };
