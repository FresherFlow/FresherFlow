import { PrismaClient } from '@prisma/client';
import { join, sqltag as sql, type Sql } from '@prisma/client/runtime/library';

const prisma = new PrismaClient();

async function test() {
    const query = 'byterid';
    const sanitizedQuery = query.trim();

    const statuses = ['PUBLISHED', 'DRAFT', 'ARCHIVED'];
    const baseConditions: Sql[] = [];
    baseConditions.push(sql`"deletedAt" IS NULL`);
    baseConditions.push(sql`"expiredAt" IS NULL`);
    baseConditions.push(sql`status::text = ANY(${statuses})`);

    const webQuery = sql`websearch_to_tsquery('english', ${sanitizedQuery})`;
    const webQuerySimple = sql`websearch_to_tsquery('simple', ${sanitizedQuery})`;

    const cleanWords = sanitizedQuery.split(/\s+/)
        .map(w => w.replace(/[*:&|!'( )]/g, ''))
        .filter(w => w.length > 0);

    const prefixTerm = cleanWords.length > 0
        ? cleanWords.map(w => `${w}:*`).join(' & ')
        : null;

    const prefixQuery = prefixTerm
        ? sql`to_tsquery('simple', ${prefixTerm})`
        : null;

    let fullTsQuery: Sql;
    if (prefixQuery) {
        fullTsQuery = sql`(${webQuery} || ${webQuerySimple} || ${prefixQuery})`;
    } else {
        fullTsQuery = sql`(${webQuery} || ${webQuerySimple})`;
    }

    const allPageConditions = [...baseConditions];
    allPageConditions.push(sql`search_vector @@ ${fullTsQuery}`);

    const whereClause = sql`WHERE ${join(allPageConditions, ' AND ')}`;

    console.log('Testing query:', query);

    const countResult = await prisma.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(*) as count FROM "Opportunity" ${whereClause}
    `;
    console.log('Total Count:', countResult[0].count);

    try {
        const result = await prisma.$queryRaw`
            SELECT id, company, status, ts_rank_cd(search_vector, ${fullTsQuery}) as rank
            FROM "Opportunity"
            ${whereClause}
            ORDER BY rank DESC
            LIMIT 5
        `;
        console.log('Result:', JSON.stringify(result, null, 2));
    } catch (e) {
        console.error('Error:', e);
    } finally {
        await prisma.$disconnect();
    }
}

test();
