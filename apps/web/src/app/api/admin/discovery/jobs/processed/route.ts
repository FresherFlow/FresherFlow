import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.INGESTION_DATABASE_URL || process.env.DATABASE_URL || 'postgresql://fresherflow:fresherflow_local_dev@localhost:5432/fresherflow_jobs',
});

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');

    let query = `
      SELECT id, company, title, location, apply_link as "applyLink", ats_provider as "atsType", status, created_at as "createdAt"
      FROM processed_jobs 
    `;
    const values: any[] = [];

    if (status && status !== 'ALL') {
      query += ` WHERE status = $1`;
      values.push(status);
    }

    query += ` ORDER BY created_at DESC LIMIT 100`;

    const result = await pool.query(query, values);
    
    return NextResponse.json({ jobs: result.rows });
  } catch (error) {
    console.error('Error fetching processed jobs:', error);
    return NextResponse.json({ jobs: [], error: 'Failed to fetch jobs' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, status } = body;

    if (!id || !status) {
      return NextResponse.json({ error: 'Missing id or status' }, { status: 400 });
    }

    const result = await pool.query(
      `UPDATE processed_jobs SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
      [status, id]
    );

    if (result.rowCount === 0) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    return NextResponse.json({ job: result.rows[0] });
  } catch (error) {
    console.error('Error updating processed job:', error);
    return NextResponse.json({ error: 'Failed to update job' }, { status: 500 });
  }
}
