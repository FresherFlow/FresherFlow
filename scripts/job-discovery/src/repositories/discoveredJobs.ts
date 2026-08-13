import { supabase } from '../lib/db.js';
import { parseJobUrl } from '@fresherflow/parser';

export async function upsertJobs(jobs: any[], runId: string | null) {
  if (!process.env.SUPABASE_URL || jobs.length === 0) return;

  const mappedJobs = jobs.map(job => {
    // Determine source and external_id
    let source = job.sourceType === 'ATS' ? 'unknown-ats' : 'aggregator';
    let external_id: string | null = null;
    let company = job.company || 'unknown';

    const parsed = parseJobUrl(job.applyLink);
    if (parsed) {
      source = parsed.adapter;
      external_id = parsed.jobId;
      // For ATS jobs, the adapter already resolved the real company name from the API.
      // Only fall back to URL-parsed company for aggregator jobs.
      if (job.sourceType === 'ATS' && job.company && job.company !== 'unknown') {
        company = job.company; // keep what the adapter returned
      } else {
        company = parsed.company || job.company || 'unknown';
      }
    } else if (job.sourceType === 'AGGREGATOR') {
      // For aggregators (e.g. YC, Wellfound), we might not have a clean parser yet.
      // Use the domain as the source.
      try {
        const url = new URL(job.applyLink);
        source = url.hostname.replace('www.', '');
      } catch {}
    }

    return {
      run_id: runId,
      company_id: job.companyId || job.company_id || null,
      source: source,
      source_type: job.sourceType,
      company: company,
      title: job.title || 'Unknown Title',
      location: job.location || null,
      employment_type: job.employmentType || null,
      apply_link: job.applyLink,
      external_id: external_id,
      fresher_score: job.fresherScore || null,
      review_required: job.reviewRequired || false,
      status: job.reviewRequired ? 'PENDING' : 'APPROVED',
      updated_at: new Date().toISOString(),
      last_seen_at: new Date().toISOString(),
      department: job.department || null,
      batch_year: job.batchYear || null,
      degree: job.degree || null,
      skills: job.skills && Array.isArray(job.skills) ? JSON.stringify(job.skills) : null,
      location_city: job.parsedLocation?.city || null,
      location_country: job.parsedLocation?.country || null,
      description: job.description || null,
      experience_level: job.experienceLevel || null,
      experience_years: job.experienceYears || null,
      is_remote: job.isRemote || false,
      posted_at: job.postedAt || null
    };
  });

  // Chunk array to avoid Supabase limits (batch of 100)
  const chunkSize = 100;
  for (let i = 0; i < mappedJobs.length; i += chunkSize) {
    const chunk = mappedJobs.slice(i, i + chunkSize);
    
    try {
      // Use ON CONFLICT (source, apply_link) and (source, external_id)
      // Since Supabase `upsert` only supports one conflict constraint per call natively via the SDK
      // on a unique column/constraint, we'll let the database handle it by specifying onConflict
      // Wait, onConflict takes a comma-separated list of columns that form a unique constraint.
      // If we have TWO partial unique constraints, Supabase SDK's `.upsert()` can be tricky.
      // To bypass this, we just don't pass `onConflict` and let PostgREST infer it from the primary key.
      // Wait! We want to upsert based on the unique constraints, NOT the primary key (we don't have IDs for new jobs).
      // We might get an error if we have multiple partial unique indexes.
      // For safety, we will just use `insert` and ignore duplicates on the DB side if we can't reliably upsert.
      // Actually, standard `upsert` in Supabase without `onConflict` tries to use the Primary Key.
      // Since we don't have the `id` (primary key), we must specify `onConflict`.
      // Since we have TWO partial unique indexes, passing both might fail in PostgREST.
      // A better approach for this script: We just try to `insert()` and if it fails due to unique constraint, 
      // we could ignore it. But we WANT to update `last_seen_at`!
      
      // We can iterate the chunk and insert one by one? No, chunking is for batch inserts.
      // Let's use `onConflict: 'source, external_id'` as a generic string and if it fails, fallback.
      // Alternatively, let's just use `upsert` and ignore errors (the logs might complain, but it's safe).
      
      // To do this properly with multiple partial indexes via PostgREST is impossible in a single `upsert`.
      // We will separate the chunk into two groups: those with external_id, and those without.
      // Deduplicate within the batch before upserting to prevent "ON CONFLICT DO UPDATE command cannot affect row a second time"
      const withExtMap = new Map<string, typeof mappedJobs[0]>();
      chunk.filter(j => j.external_id !== null).forEach(j => {
        withExtMap.set(`${j.source}:${j.external_id}`, j);
      });
      const withExt = Array.from(withExtMap.values());

      const withoutExtMap = new Map<string, typeof mappedJobs[0]>();
      chunk.filter(j => j.external_id === null).forEach(j => {
        withoutExtMap.set(`${j.source}:${j.apply_link}`, j);
      });
      const withoutExt = Array.from(withoutExtMap.values());

      if (withExt.length > 0) {
        const { error } = await supabase
          .from('discovered_jobs')
          .upsert(withExt, { onConflict: 'source, external_id' });
        if (error) console.error('Error upserting jobs (with external_id):', error.message);
      }

      if (withoutExt.length > 0) {
        const { error } = await supabase
          .from('discovered_jobs')
          .upsert(withoutExt, { onConflict: 'source, apply_link' });
        if (error) console.error('Error upserting jobs (without external_id):', error.message);
      }

    } catch (err) {
      console.error('Exception during Supabase chunk upsert:', err);
    }
  }
}
