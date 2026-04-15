Answer a question about the geoconflict project using the wiki at `karpathy-vault/`.

Question: $ARGUMENTS

## Instructions

1. Read `karpathy-vault/index.md` to get a catalog of all available wiki pages.
2. Identify which wiki pages are most relevant to the question. Read them.
3. If any relevant page links to other pages via [[wikilinks]], follow those links and read them too (max 2 hops).
4. If the wiki pages don't fully answer the question, read the original source files they reference (listed in each page's **Source files** or **Key files** field).
5. Compose a clear, cited answer:
   - Reference wiki pages as [[wiki/path]]
   - Reference source files as `src/...`
6. If the answer is valuable enough to save (novel synthesis, non-obvious insight, decision rationale), create a new wiki page for it:
   - Use type `decisions/` or `systems/` as appropriate
   - Update `karpathy-vault/index.md`
   - Append to `karpathy-vault/log.md`:
     ```
     ## YYYY-MM-DD — query
     - Query: "<question>"
     - Filed as: [[wiki/<path>]]
     ```
7. If the wiki is missing information needed to answer well, note the gap explicitly and suggest running `/wiki-ingest` on the relevant source.
