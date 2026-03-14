-- Add search_vector column
ALTER TABLE "Opportunity" ADD COLUMN IF NOT EXISTS "search_vector" tsvector DEFAULT ''::tsvector;

-- Create GIN index for search_vector
CREATE INDEX IF NOT EXISTS "Opportunity_search_vector_idx" ON "Opportunity" USING GIN ("search_vector");

-- Create the trigger function for search_vector updates
CREATE OR REPLACE FUNCTION opportunity_search_vector_update() RETURNS trigger AS $$
BEGIN
  new.search_vector :=
    setweight(to_tsvector('english', COALESCE(new.title, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(new.company, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(new.description, '')), 'C') ||
    setweight(to_tsvector('english', array_to_string(COALESCE(new.locations, ARRAY[]::text[]), ' ')), 'B') ||
    setweight(to_tsvector('english', array_to_string(COALESCE(new."requiredSkills", ARRAY[]::text[]), ' ')), 'A');
  RETURN new;
END
$$ LANGUAGE plpgsql;

-- Set up the trigger
DROP TRIGGER IF EXISTS opportunity_search_vector_trigger ON "Opportunity";
CREATE TRIGGER opportunity_search_vector_trigger
BEFORE INSERT OR UPDATE ON "Opportunity"
FOR EACH ROW EXECUTE FUNCTION opportunity_search_vector_update();

-- Initial backfill for existing records
UPDATE "Opportunity" SET search_vector = 
    setweight(to_tsvector('english', COALESCE(title, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(company, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(description, '')), 'C') ||
    setweight(to_tsvector('english', array_to_string(COALESCE(locations, ARRAY[]::text[]), ' ')), 'B') ||
    setweight(to_tsvector('english', array_to_string(COALESCE("requiredSkills", ARRAY[]::text[]), ' ')), 'A');
