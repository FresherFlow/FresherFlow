-- Add structured-but-flexible hiring guidance fields
ALTER TABLE "Opportunity"
ADD COLUMN "selectionProcess" TEXT,
ADD COLUMN "notesHighlights" TEXT;
