
Node CSV columns include:
Id, Label, Context, foreign_key_count, referenced_by_count, column_count, centrality_score, related_tables, referenced_by_tables, comment

Edge CSV columns include:
Source, Target, Type, Label, Cardinality, DeleteRule, SourceFKCount, TargetFKCount, SourceCentrality, TargetCentrality, SourceColCount, TargetColCount, Comment, Weight


====
For above schema

construct a relationship manifest in  csv file for this schema. This sheet should have one row per relationship and must have following columns
sno
bounding context -> Each table name is prefixd with its bounding context 
Source_table
Target_table
Label-> relationship e.g. escalates, logs, pays, linked, contains, transitions, verifies, reviewed, derives, generates, targets, shows, reserves, closes, has, team, offers, via, catalog, places, fulfills, owns, refers, subscribes, aggregates, configures, presents, tagged, uploads, out, overrides, progresses, plans, releases, holds, performed at, writes, rated, credited, billed, features, includes, extends, joins, instantiates, settles into, emits, records, requests, located at, discloses, decorates, converts, source, performed by, refunds, bills, events, authors, assigned to, created by, acts, used by, primary, neighborhood, optional, versions, schedules, contextualizes, adjusts, backs, annotates, authenticates, default, city, assigned, grants, governs, avoided, selected, defines, primary city, mapped, typed, status, references, renders, lists, segments, pdf, og image, priority, severity, result
Cardinality
relationship-> [C] Cascade,[R] Restrict / Mandatory FK ,[S] Set Null / Optional d, [L] Logical / Soft link (no FK) , "[L] refers"
source_table_foreign_key_count
target_table_foreign_key_count
source_table_centrality_score
target_table_centrality_score
Source_table_col_count
target_table_col_count
comment


construct an entity manifest in csv file for this schema. This sheet should have one row per table and must have following columns

sno
bounding context -> Each table name is prefixd with its bounding context 
table_name
foreign_key_count
referenced_by_count -> number of other tables that reference this table
collumn_count
centrality_score
comma separated related table names in alphabetic order
comma separated table names that reference this table in alphabetic order
comma separated column names in starting iwth pk, fk's and then alphabetic order
comment


Paste csv's below





=====
1️⃣ Purpose
Generate a complete and human‑readable ER diagram from the provided schema.sql file that:

communicates functional intent rather than raw database mechanics,
clearly shows bounded contexts and cross‑context relationships, and
uses color, line, and text semantics to display constraints, optionality, and composition visually.
Mermaid version requirement → v 11.6.0 (2025‑03‑25).
Layout → elk, medium spacing, legible text.

2️⃣ Inputs
Provide together:

🗂 schema.sql — the complete schema.
🧠 This prompt — the styling and ruleset below.
3️⃣ Output Requirements
➤ Diagram structure
Use Mermaid’s erDiagram syntax.
Create a unified diagram that shows all cross‑context links.
Additionally produce context‑specific <details> ⇄ <summary> collapsible sections, one for each bounded context pair:
Auth / IAM
Consumer + Order / Payment
Restaurant + Finance
Drop / Catalog + Geo
Marketing + CMS
Support + Incident
Each section should contain a focused erDiagram block.

4️⃣ Bounded‑Context and Color Rules
AUTH / IAM #818cf8 #eef2ff Identity, access management CONSUMER #a78bfa #f5f3ff End‑users & preferences ORDER / PAYMENT #e879f9 #fdf4ff Orders, payments RESTAURANT #fb923c #fff7ed Merchants and assets FINANCE #4ade80 #f0fdf4 Settlement, invoices, billing DROP / CATALOG #38bdf8 #f0f9ff Product templates & drops GEO #2dd4bf #f0fdfa Cities, addresses MARKETING / CMS #facc15 #fefce8 Campaigns, content SUPPORT / INCIDENT #fb7185 #fff1f2 Customer + ops support
Each context should be a subgraph with its class applied via classDef.

5️⃣ Relationship Encoding Rules
Use edge color, stroke, and label to show relationship semantics.

[C] Cascade / Identifying solid #f87171 (red) 3 pt "[C] owns" [R] Restrict / Mandatory FK solid #818cf8 (indigo) 2 pt "[R] has" [S] Set Null / Optional dashed #9ca3af (gray) 1.5 pt "[S] optional" [L] Logical / Soft link (no FK) solid #2dd4bf (teal) 1.5 pt "[L] refers"
Display convention

Add the code (e.g., [C]) inline in the relationship label.
Change the actual stroke color of the connecting line to match.
For [C], use the same header fill hue as the parent in the child node to reinforce ownership.
6️⃣ Field and Type Styling
Column lists
Each database table is represented as a table with just one column. Header row is table name. Header row has a border. All column names are place on below the other with text color based on datatype. there is no line or row separation between columns. this is to make this large ERD compact
Do not include datatype words or foreign‑key tags. Color and name of column reveal that information.
Do not include primary‑key or audit columns such as created_at / updated_at. Only include functionally relevant columns. 
List field names vertically, one below another, without blank separator rows or lines.
Text color encodes datatype (approximate inference from column name):
uuid / ID violet #a78bfa varchar / string / text blue #38bdf8 integer / numeric counter green #4ade80 boolean / flag orange #fb923c timestamp / date brown #a16207 money / numeric value gold #facc15 json / structured data cyan #22d3ee
Color the field text (or annotated comment) to match these hues.

7️⃣ Layout Rules
Mermaid initialization header:

Medium spacing for readability.

Cluster related contexts near each other:

Consumer ⇄ Order / Payment
Restaurant ⇄ Finance
Drop/Catalog ⇄ Geo
Auth/IAM central
Marketing/CMS & Support/Incident peripheral.
8️⃣ Legend Box
In the unified diagram, include a small visible legend node or subgraph summarizing:

Legend:
  [C] Cascade — red solid 3 pt
  [R] Restrict — indigo solid 2 pt
  [S] Set Null — gray dashed 1.5 pt
  [L] Logical — teal solid 1.5 pt
  Text colors → violet uuid, blue string, green integer, orange boolean,
                 brown datetime, gold money, cyan json
9️⃣ Output Composition
Unified overview block — all context boxes and inter‑context relationships only (no entity internals).
Per‑context detailed sections inside <details><summary> wrappers showing entity boxes and internal relationships.
Each section must re‑declare its color classDefs for clarity.
Example shell:

<details>
<summary>Restaurant + Finance Context</summary>

```mermaid
%%{init: { "layout": "elk" } }%%
erDiagram
  classDef restaurant fill:#fff7ed,stroke:#fb923c
  classDef finance fill:#f0fdf4,stroke:#4ade80
  restaurant_restaurant {
    name
    legal_name
    tax_id
    cuisine_type
    is_active
    onboarding_date
    status
  }
  restaurant_public_profile {
    restaurant_id
    url_slug
    published
  }
  ...
  restaurant_restaurant ||--o{ restaurant_public_profile : "[C] presents"
  restaurant_restaurant ||--o{ restaurant_document : "[C] uploads"
  restaurant_restaurant ||--o{ finance_invoice : "[C] billed"
```
Repeat this structure for all contexts.

🔟 Validation Checklist
When the AI generates the diagrams, verify:

Layout uses ELK and medium spacing ✅ Each context box tinted per palette ✅ Columns shown – names only, colored text ✅ Relationships labeled [C]/[R]/[S]/[L] ✅ Line stroke color/thickness matches legend ✅ Cascade children share parent hue ✅ Legend node visible in unified block ✅ Collapsible sections grouped sequentially ✅
1️⃣1️⃣ Generation Guidance Steps for the AI
Parse schema.sql to identify tables and FKs.
Infer the bounded context from table prefixes (e.g., geo_, consumer_, restaurant_).
For each context:
Create a subgraph styled per palette.
List fields as colored names, skipping audit columns.
Define compositional (cascade) links within same context.
Identify cross‑context relationships from FKs that span prefixes and render per the relationship color semantics.
Include a final Summary section describing next‑step refinements.
1️⃣2️⃣ Example invocation text
Given my `schema.sql`, use the following design and relationship conventions (see below) to generate a complete ER diagram in Mermaid v11.6 with one unified scaffold and per‑context collapsible sections. Apply all color, cascade, and layout rules exactly as defined in the prompt.
You can now paste this file and your schema.sql into your AI assistant.
The model will parse the schema, infer relationships, and produce a documentation‑grade ER diagram with all required styling and semantics exactly as specified.

%%{init: { "layout": "elk", "theme": "default" } }%%
flowchart TD
    A --> B