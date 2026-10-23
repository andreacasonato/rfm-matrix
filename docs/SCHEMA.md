# Doc 5 · Data schema

Status: approved 2026-10-23.

Five IndexedDB object stores on the merchant's device. Raw order rows are never saved, only one scored record per customer. The real schema lives as numbered migration files in the repo.

## Relationships

Project 1 → many Snapshots → many CustomerScores. Project 1 → 1 active SegmentMap. Each Snapshot stores a frozen copy of the map and settings it used, so old results stay reproducible after rules change.

## Object stores

| Store | Purpose | Key | Key fields | Owner field | Indexes |
| --- | --- | --- | --- | --- | --- |
| `projects` | One store or client | `id` (UUID) | `name`, `schemaVersion`, `currency`, `platformPreset`, `columnMapping`, `cleaningRules`, `scoringConfig`, `createdAt`, `updatedAt` | — (root) | `updatedAt` |
| `segmentMaps` | Editable rules | `id` (UUID) | `projectId`, `segments[]` (id, name, description, suggestedAction, sortOrder), `cells` (125 entries: r, f, m → segmentId), `updatedAt` | `projectId` | `projectId` |
| `snapshots` | One finished analysis | `id` (UUID) | `projectId`, `createdAt`, `sourceFileName`, `sourceFileHash`, `analysisDate`, `frozenConfig`, `frozenMap`, `breakpoints`, `rowCounts` (read, excluded, used), `customerCount` | `projectId` | `[projectId, createdAt]` |
| `customerScores` | One customer in one snapshot | `[snapshotId, customerKey]` | `email` (only if mapped), `firstOrderAt`, `lastOrderAt`, `recencyDays`, `frequency`, `monetaryMinor`, `r`, `f`, `m`, `segmentId` | `snapshotId` | `[snapshotId, segmentId]` |
| `settings` | App preferences | `'app'` | `lastProjectId`, `onboardingDone` | — | — |

Movement is computed on demand by joining `customerScores` on `customerKey`; it is not stored.

## Constraints (enforced in `core`, tested)

- `r`, `f`, `m` are whole numbers 1–5.
- A segment map has exactly 125 cells, each pointing to a segment in the same map.
- `customerKey` is unique within a snapshot: the mapped customer ID, or the lower-cased, trimmed email when no ID exists.
- Money is stored as whole minor units (`monetaryMinor`); one currency per project; import warns if a currency column holds several.
- Snapshots are immutable; a re-score creates a new snapshot.
- `sourceFileHash` (SHA-256) warns when the same file is imported twice.

## Personal data kept to a minimum

- Raw order rows stay in memory during scoring and are then discarded.
- Names, addresses and phone numbers are never stored, even if present in the file.
- Email is stored only if the user maps it.
- "Delete all data" deletes the whole database on that device.

## Default segment map

Segments are assigned by recency × frequency (25 cells), each copied across all 5 monetary scores (25 × 5 = 125). Monetary sorts customers within a segment. Users can make any cell depend on M.

| R \ F | F1 | F2 | F3 | F4 | F5 |
| --- | --- | --- | --- | --- | --- |
| **R5** | New customers | Potential loyalists | Loyal customers | Champions | Champions |
| **R4** | Promising | Potential loyalists | Loyal customers | Loyal customers | Loyal customers |
| **R3** | About to sleep | About to sleep | Need attention | Loyal customers | Loyal customers |
| **R2** | About to sleep | About to sleep | At risk | At risk | Can't lose them |
| **R1** | Lost | Hibernating | At risk | At risk | Can't lose them |

Adapted from Flyde's segment table (https://www.flyde.io/en/rfm-analysis/). Overlapping ranges were resolved with a fixed priority order: Champions, Can't lose them, Lost, New customers, Promising, Need attention, Loyal customers, Potential loyalists, At risk, About to sleep, Hibernating.

## Migrations and operations

- Each schema change is a numbered migration (`packages/app/src/storage/migrations/001-initial.ts`, …) run by IndexedDB's version upgrade.
- Changes are additive: new optional fields get defaults; removed names are never reused; types never change incompatibly.
- Every migration has a test that loads a fixture database from the previous version.
- Project files carry `schemaVersion` and migrate forward on import; files from a newer version are refused with a clear message.
- Backup is the project file export; the Start screen warns that browsers can clear storage.
- Development uses synthetic data only; real files are anonymised before entering the repo.
