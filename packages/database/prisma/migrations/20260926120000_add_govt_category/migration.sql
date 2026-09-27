-- Government sub-category for filtering and counts.
-- Canonical values mirror the GOVT_CATEGORIES labels in the web UI:
--   UPSC, SSC, Banking, Railways, State PSC, Defence, Teaching, Police,
--   Engineering, Nursing.

ALTER TABLE "GovernmentJobDetails" ADD COLUMN "govtCategory" TEXT;

CREATE INDEX "GovernmentJobDetails_govtCategory_idx" ON "GovernmentJobDetails"("govtCategory");

-- Backfill from the same keyword heuristic the UI used before this column
-- existed (jobCategory[] + recruitingBody). It is best-effort: rows that match
-- no keyword stay NULL and can be set from the admin form. Most specific
-- categories are checked first.
UPDATE "GovernmentJobDetails"
SET "govtCategory" = CASE
    WHEN src.haystack ~ 'upsc|ias|ips|civil services'                                     THEN 'UPSC'
    WHEN src.haystack ~ 'ssc|staff selection'                                             THEN 'SSC'
    WHEN src.haystack ~ 'railway|railways|rrb|rail'                                       THEN 'Railways'
    WHEN src.haystack ~ 'banking|bank|ibps|rbi|sbi'                                       THEN 'Banking'
    WHEN src.haystack ~ 'teaching|teacher|education|ugc|net'                              THEN 'Teaching'
    WHEN src.haystack ~ 'defence|defense|army|navy|air force|afcat|nda|cds|crpf|bsf|cisf' THEN 'Defence'
    WHEN src.haystack ~ 'police|constable'                                                THEN 'Police'
    WHEN src.haystack ~ 'psc|state public service|bpsc|mpsc|rpsc|uppsc|mppsc|hpsc|kpsc'   THEN 'State PSC'
    WHEN src.haystack ~ 'engineering|engineer|je|technical|jto'                           THEN 'Engineering'
    WHEN src.haystack ~ 'nursing|nurse|anm|gnm|medical|health'                            THEN 'Nursing'
    ELSE NULL
  END
FROM (
    SELECT
      "id",
      lower(
        coalesce(array_to_string("jobCategory", ' '), '') || ' ' || coalesce("recruitingBody", '')
      ) AS haystack
    FROM "GovernmentJobDetails"
) AS src
WHERE "GovernmentJobDetails"."id" = src."id";
