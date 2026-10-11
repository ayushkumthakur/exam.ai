# Official PYQ source verification policy

Last checked: 2026-10-11

This register records official-source discovery and audit limitations. It does **not** claim that any existing question has been individually verified. No existing question is promoted to `VERIFIED_PYQ` by this audit.

## Official source register

| Exam | Official source checked | What it establishes | Limitation |
|---|---|---|---|
| UPSC CSE Prelims GS Paper I and CSAT Paper II | [UPSC previous question papers](https://www.upsc.gov.in/examinations/previous-question-papers); [UPSC CSE Prelims 2026 exam page](https://www.upsc.gov.in/examinations/Civil%20Services%20%28Preliminary%29%20Examination%2C%202026); [UPSC archives](https://www.upsc.gov.in/examinations/previous-question-papers/archives) | UPSC lists downloadable previous papers. The 2026 exam page lists GS Paper I and GS Paper II uploaded on 25 May 2026. The 2025 listing also contains both Prelims papers. | Listing a paper is not item-level verification. Match the exact paper, year, stem, options and authoritative answer before importing a question. |
| SSC CGL Tier-I | [SSC answer-key portal](https://ssc.gov.in/home/answer-key); [2024 Tier-I final answer-key notice](https://ssc.gov.in/api/attachment/uploads/masterData/NoticeBoards/Writeup_Final_Anwerkey_CGLE_2024_T1_191224.pdf); [2025 Tier-I notice](https://ssc.gov.in/api/attachment/uploads/masterData/NoticeBoards/writeup_181225.pdf) | SSC's 19 December 2024 notice says final answer keys and candidate response sheets were available through registered login from 19 December 2024 to 8 January 2025. The 2025 notice says final keys and papers would be hosted later. | Candidate response sheets may be login-gated and time-limited. A notice or generic SSC URL is not evidence that a specific question appeared in a specific shift. Do not substitute coaching-site copies for official item evidence. |
| RBI Grade B Phase-I | [RBI Grade B 2026 Phase-I information handout](https://opportunities.rbi.org.in/Scripts/bs_viewcontent.aspx?Id=5055); [2025 Phase-I handout](https://opportunities.rbi.org.in/scripts/bs_viewcontent.aspx?Id=4758) | Official RBI information handouts are published for exam instructions and format. | A handout or sample question does not establish that a question appeared in a previous live exam. |
| RBI Grade B Phase-II | [RBI Grade B 2025 Phase-II information handouts](https://opportunities.rbi.org.in/Scripts/bs_viewcontent.aspx?Id=4791); [RBI official recruitment/call-letter portal](https://opportunities.rbi.org.in/Scripts/CallLetters.aspx) | Official recruitment information and Phase-II handouts are available. | No complete official past-paper/answer-key set was established from these pages in this audit. Keep items as practice until item-specific past-paper evidence is available. |

## Targeted paper comparison completed

- Opened the official [UPSC CSE Prelims 2023 GS Paper I PDF](https://www.upsc.gov.in/sites/default/files/QP_CS_Pre_Exam_2023_280523.pdf) from the UPSC archive; the official PDF is 6.63 MB.
- Ran targeted phrase checks for ten prompts found in static practice material: Tropic of Cancer; Battle of Plassey; repo rate; World Environment Day; Ramsar Convention; GDP; Indian National Congress founded in 1885; Constitution adopted on 26 November 1949; Constitution came into force on 26 January 1950; and UN founded in 1945.
- **Exact matches established: 0/10** in this specific paper. This does not mean the topics never appeared in other years; it means these prompts were not matched to this paper by the checks recorded.
- The paper contains actual, differently worded questions on subjects such as lakes/rivers, ports, trees, constitutional amendments, constitutional bodies, and parliamentary bills. Topic overlap alone is not a valid exact PYQ match.
- An answer-key copy surfaced on a non-UPSC exam-preparation site, but the direct official answer-key file was not independently retrieved in this pass. Therefore no question was promoted to `VERIFIED_PYQ` on that basis.

## Import and verification rules

1. Keep newly written or AI-generated questions as `ADMIN_PRACTICE`.
2. Only use `VERIFIED_PYQ` after a human reviewer checks the exact original question, exam, year, paper/phase/shift, options and official answer/source.
3. The import endpoint's approved-host check is only a URL-domain check. It does not fetch or compare the document contents, so an allowlisted official hostname alone is **not** sufficient to mark a question verified.
4. Do not use third-party coaching websites, search-result pages, social media, or generic PDF mirrors as authoritative evidence for a verified item.
5. If an official SSC response sheet has expired or an RBI official past paper cannot be located, leave the question as `ADMIN_PRACTICE` or `PYQ_PATTERN` and record the limitation rather than guessing.
6. Record a direct official document URL and answer-key evidence for every verified item. If answer-key evidence is unavailable, do not claim the answer has been officially verified.

## Current audit result

- **UPSC:** official 2025 and 2026 Prelims paper listings found; 2023 GS Paper I opened and ten targeted static-bank wording probes recorded, with zero exact matches established. A full bank-wide audit and direct official answer-key verification remain pending.
- **SSC CGL:** official answer-key portal and relevant 2024/2025 notices found; historical response-sheet access is time-limited, and static-bank items have not been matched to a specific shift/answer key.
- **RBI Grade B:** official 2026 Phase-I and 2025 Phase-I/II handout pages found; these establish format/instructions, not a complete official previous-year question bank.
- **Static source-code banks:** the audit test asserts all generated seed-bank records are `ADMIN_PRACTICE` and have no invented PYQ year or item-specific source. Verified item count remains **0**.
- **Production database:** not directly queried in this static source-code audit. Do not infer its contents or verified-PYQ count from this register.

The next step for actual verified PYQs is to obtain an official paper/response sheet plus official answer evidence, then review and import each exact item with provenance. Do not bulk-convert exam-style practice questions into PYQs.
