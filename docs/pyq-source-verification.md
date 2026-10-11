# Official PYQ source verification policy

Last checked: 2026-10-11

This register records official-source discovery and audit limitations. It does **not** claim that any existing question has been individually verified. No existing question is promoted to `VERIFIED_PYQ` by this audit.

## Official source register

| Exam | Official source checked | What it establishes | Limitation |
|---|---|---|---|
| UPSC CSE Prelims GS Paper I and CSAT Paper II | [UPSC previous question papers](https://www.upsc.gov.in/examinations/previous-question-papers); [UPSC answer-key archives](https://www.upsc.gov.in/examinations/answer-key/archives); [UPSC CSE Prelims 2026 exam page](https://www.upsc.gov.in/examinations/Civil%20Services%20%28Preliminary%29%20Examination%2C%202026); [UPSC archives](https://www.upsc.gov.in/examinations/previous-question-papers/archives) | UPSC lists downloadable previous papers. The 2026 exam page lists GS Paper I and GS Paper II uploaded on 25 May 2026. The 2025 listing also contains both Prelims papers. | The UPSC answer-key archive exists, but its JavaScript-driven examination filter did not expose the 2023 CSE Prelims answer-key document in the current text view. Listing a paper is not item-level verification. Match the exact paper, year, stem, options and authoritative answer before importing a question. |
| SSC CGL Tier-I | [SSC answer-key portal](https://ssc.gov.in/home/answer-key); [legacy official SSC answer-key archive](https://ssc.nic.in/Portal/AnswerKey) (lists CGL Tier-I 2023 final answer key and candidate response sheets); [official 2023 tentative-key notice](https://ssc.nic.in/SSCFileServer/PortalManagement/UploadedFiles/Write_Up_Tentative_AnswerKey_T1_CGLE_2023_01082023.pdf); [2024 Tier-I final answer-key notice](https://ssc.gov.in/api/attachment/uploads/masterData/NoticeBoards/Writeup_Final_Anwerkey_CGLE_2024_T1_191224.pdf); [2025 Tier-I notice](https://ssc.gov.in/api/attachment/uploads/masterData/NoticeBoards/writeup_181225.pdf) | SSC's 19 December 2024 notice says final answer keys and candidate response sheets were available through registered login from 19 December 2024 to 8 January 2025. The legacy official archive lists the CGL Tier-I 2023 final answer key and candidate response sheets. SSC's 1 August 2023 notice confirms that 2023 Tier-I response sheets/tentative keys were login-accessible only from 1–4 August 2023 and would not remain available afterward. The 2025 notice says final keys and papers would be hosted later. | Candidate response sheets may be login-gated and time-limited. A notice or generic SSC URL is not evidence that a specific question appeared in a specific shift. Do not substitute coaching-site copies for official item evidence. |
| RBI Grade B Phase-I | [RBI Grade B 2026 Phase-I information handout](https://opportunities.rbi.org.in/Scripts/bs_viewcontent.aspx?Id=5055); [2025 Phase-I handout](https://opportunities.rbi.org.in/scripts/bs_viewcontent.aspx?Id=4758) | Official RBI information handouts are published for exam instructions and format. | A handout or sample question does not establish that a question appeared in a previous live exam. |
| RBI Grade B Phase-II | [RBI Grade B 2025 Phase-II information handouts](https://opportunities.rbi.org.in/Scripts/bs_viewcontent.aspx?Id=4791); [RBI official recruitment/call-letter portal](https://opportunities.rbi.org.in/Scripts/CallLetters.aspx) | Official recruitment information and Phase-II handouts are available. | No complete official past-paper/answer-key set was established from these pages in this audit. Keep items as practice until item-specific past-paper evidence is available. |

## Targeted paper comparison completed

- Opened the official [UPSC CSE Prelims 2023 GS Paper I PDF](https://www.upsc.gov.in/sites/default/files/QP_CS_Pre_Exam_2023_280523.pdf) from the UPSC archive; the official PDF is 6.63 MB.
- Added a regression test with **30 distinctive short phrases** anchored to questions in the official paper and screened all six static banks: seed, expanded, priority, mapped question bank, catalog bank, and CSAT bank.
- **Exact normalized phrase matches: 0/30** across those static banks for this paper. The test runs automatically so future changes that introduce an exact anchor are flagged for review.
- This is only a literal phrase screen. It does not detect paraphrases or semantic overlap, does not prove that all other questions are different from the paper, and does not verify answers.
- The direct official answer-key file was not independently retrieved in this pass. Therefore no question was promoted to `VERIFIED_PYQ` on this basis.

## Additional static-bank coverage-gap probe

A case-insensitive literal search was run across `data/priority_question_bank.js`, `data/seed_questions.js`, `data/expanded_question_bank.js`, `data/csat_questions.js`, `data/catalog_question_bank.js`, and `data/question_bank.js` for 30 distinctive topic terms drawn from the official 2023 GS-I paper (including Wular/Kolleru/Kanwar lakes, major ports, selected tree species, mineral sands, wildlife and corridor names). **0/30 literal terms were found.** This is a narrow coverage-gap signal, not a semantic audit or proof that all related concepts are absent. It does not establish PYQ provenance for any item and must not be used to label existing questions `VERIFIED_PYQ`.

## Fuzzy lexical triage added

- The automated static-bank audit now also computes a simple lexical-overlap score between 30 short fragments from UPSC CSE Prelims 2023 GS Paper I and the question text in each bank. Common exam/geography terms (for example, “river”, “lake”, “India”, and “following”) are filtered to reduce generic false positives.
- It prints the highest-scoring candidates for human inspection, with bank name, source-paper question number, shared terms, and score. Any output must still be inspected; an overlap score is not a claim that two questions are the same.
- This is intentionally a review queue only. Lexical overlap can produce false positives for common syllabus concepts and miss paraphrases with different vocabulary; it does not confirm that a question is the same question, does not check options or the official answer, and cannot set `VERIFIED_PYQ`.
- The exact phrase screen remains a separate regression guard. Both outputs must be interpreted within the stated sample of 30 fragments, not as a complete paper-to-bank audit.

## Import and verification rules

1. Keep newly written or AI-generated questions as `ADMIN_PRACTICE`.
2. Only use `VERIFIED_PYQ` after a human reviewer checks the exact original question, exam, year, paper/phase/shift, options and official answer/source.
3. The import endpoint's approved-host check is only a URL-domain check. It does not fetch or compare the document contents, so an allowlisted official hostname alone is **not** sufficient to mark a question verified.
4. Do not use third-party coaching websites, search-result pages, social media, or generic PDF mirrors as authoritative evidence for a verified item.
5. If an official SSC response sheet has expired or an RBI official past paper cannot be located, leave the question as `ADMIN_PRACTICE` or `PYQ_PATTERN` and record the limitation rather than guessing.
6. Record a direct official document URL and answer-key evidence for every verified item. If answer-key evidence is unavailable, do not claim the answer has been officially verified.

## Mock-test provenance and reliability audit

- The mock blueprint reports paper-structure integrity separately from item provenance. Correct section counts, marks, and timer settings do not certify question wording or answers.
- Source counts distinguish items with complete verification metadata, original `ADMIN_PRACTICE`, `PYQ_PATTERN`, `AI_GENERATED`, incomplete legacy PYQ labels, and other sources.
- A set is reported as a verified same-paper set only when every item has question and answer source URLs, reviewer notes, reviewer identity/timestamp, year and paper metadata, and all verified items share one year/paper/shift key.
- Mixed practice/AI/verified sets are not reported as a complete official paper. Legacy PYQ labels missing provenance are counted separately.
- This is a provenance-metadata gate, not automatic PDF-content validation. A reviewer must still compare exact wording, options, year/paper/shift and the official answer. The normal exam-realism mock uses reviewed original practice questions and does not become an official PYQ paper just because its blueprint matches.

## Historical answer-key availability note

- The official [PIB release on the 2026 UPSC provisional key](https://www.pib.gov.in/PressReleasePage.aspx?PRID=2265884&lang=1&reg=20) says publishing a provisional CSE Prelims answer key soon after the examination began in 2026 for the first time.
- This announcement must not be overinterpreted: it does not prove that no final key for 2023 exists. The UPSC answer-key archive is JavaScript-driven, and a direct official 2023 CSE Prelims key file was not retrieved in this pass.
- Third-party answer keys may be used only as leads for review, not as the authoritative answer source for a `VERIFIED_PYQ` record. Do not mark an item verified until the relevant official answer evidence is retrieved and checked.

## Current audit result

- **UPSC:** official 2025 and 2026 Prelims paper listings found. For the 2023 GS-I Series A paper, 30 distinctive fragments were checked against six static banks: 0 exact phrase matches and 0 candidates from the conservative fuzzy lexical triage after generic terms were filtered. This is still a sample screen, not a full semantic paper-to-bank comparison. The official answer-key archive did not expose the 2023 key in this review, and answer correctness has not been verified item by item.
- **SSC CGL:** official current answer-key portal, legacy 2023 CGL Tier-I final-key listing, and relevant 2024/2025 notices found; historical response-sheet access may be time-limited or login-gated, and static-bank items have not been matched to a specific shift/answer key.
- **RBI Grade B:** official 2026 Phase-I and 2025 Phase-I/II handout pages found; these establish format/instructions, not a complete official previous-year question bank.
- **Static source-code banks:** the audit test asserts all generated seed-bank records are `ADMIN_PRACTICE` and have no invented PYQ year or item-specific source. Verified item count remains **0**.
- **Production database:** not directly queried in this static source-code audit. Do not infer its contents or verified-PYQ count from this register.

The next step for actual verified PYQs is to obtain an official paper/response sheet plus official answer evidence, then review and import each exact item with provenance. Do not bulk-convert exam-style practice questions into PYQs.
