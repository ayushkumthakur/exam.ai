# Official PYQ source verification policy

Last checked: 2026-10-11

This is a source-discovery register, not a claim that any existing question has been verified. No existing question is promoted to `VERIFIED_PYQ` by this change.

## Approved official starting points

| Exam | Official source | What it establishes | Important limitation |
|---|---|---|---|
| UPSC CSE Prelims GS Paper I and CSAT Paper II | https://www.upsc.gov.in/examinations/previous-question-papers | UPSC publishes downloadable previous question papers, including Civil Services Preliminary Examination papers. | Verify the exact PDF, year, paper, stem, options and answer before importing each item. |
| UPSC archived papers | https://www.upsc.gov.in/examinations/previous-question-papers/archives | Older official question papers. | Same per-question and answer review required. |
| SSC CGL | https://ssc.gov.in/ | Official SSC notices, syllabus and answer-key announcements. | Candidate response sheets and final answer keys may be login-gated and available only for a limited window. A syllabus, notice, coaching-site copy, or generic SSC URL is not evidence that a specific question is a verified PYQ. Capture an official item-specific reference and answer provenance during the available window. |
| RBI Grade B recruitment and information handouts | https://opportunities.rbi.org.in/Scripts/bs_viewcontent.aspx?Id=4758 (Phase-I information handout, Panel Year 2025); https://opportunities.rbi.org.in/Scripts/bs_viewcontent.aspx?Id=4791 (Phase-II information handouts, Panel Year 2025) | Official RBI recruitment notices and exam information handouts are available. | An information handout is not itself a complete previous-year question paper. Treat questions written from its sample formats as practice, not PYQs. Require a specific official paper/response-sheet/answer-key source before marking an item VERIFIED_PYQ. |
| RBI official recruitment notices and updates | https://opportunities.rbi.org.in/Scripts/CallLetters.aspx | RBI identifies this as its official place for recruitment communications and warns about look-alike domains. | Official-hosted recruitment documents do not automatically prove an individual question is from an actual exam. |

## Import rules

1. Keep newly written or AI-generated questions as `ADMIN_PRACTICE`.
2. Only use `VERIFIED_PYQ` after a human reviewer checks the exact original question, exam, year, paper/phase, options and official answer/source.
3. The import endpoint now rejects unapproved hostnames for the three priority exam families. An allowlisted hostname is only a first-level URL check; it does not fetch or compare the document contents, so it is **not** sufficient by itself to mark a question verified.
4. Do not use third-party coaching websites, search-result pages, social media, or generic PDF mirrors as the authoritative source for a verified item.
5. If the official SSC response sheet has expired or an RBI official paper cannot be located, leave the question as `ADMIN_PRACTICE` or `PYQ_PATTERN` and record the limitation rather than guessing.
6. For source references, prefer a direct official document URL or an official exam notice page that links to the exact document. Record the official answer-key reference separately where the schema supports it; otherwise include it in the review note/source metadata.

## Source review result at this stage

- UPSC: official previous-question-paper portal found; suitable starting point for item-by-item verification.
- SSC CGL: official commission domain and syllabus/answer-key announcements found; the 2024 Tier-II final answer-key notice says candidate response sheets were accessible through login for a limited period. It does not make an arbitrary third-party paper a verified PYQ.
- RBI Grade B: official Phase-I and Phase-II information handouts found for 2025; these are exam guidance/sample-format sources, not proof of complete actual PYQ content.
- Existing question bank: no bulk conversion to `VERIFIED_PYQ` was performed. Original reviewed questions remain `ADMIN_PRACTICE`.
