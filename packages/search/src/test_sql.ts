import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

async function test() {
    const query = 'byterid';
    const sanitizedQuery = query.trim();
    
    const statuses = ['PUBLISHED', 'DRAFT', 'ARCHIVED'];
    const baseConditions: Prisma.Sql[] = [];
    baseConditions.push(Prisma.sql`"deletedAt" IS NULL`);
    baseConditions.push(Prisma.sql`"expiredAt" IS NULL`);
    baseConditions.push(Prisma.sql`status::text = ANY(${statuses})`);

    const webQuery = Prisma.sql`websearch_to_tsquery('english', ${sanitizedQuery})`;
    const webQuerySimple = Prisma.sql`websearch_to_tsquery('simple', ${sanitizedQuery})`;
    
    const cleanWords = sanitizedQuery.split(/\s+/)
        .map(w => w.replace(/[*:&|!'( )]/g, ''))
        .filter(w => w.length > 0);
        
    const prefixTerm = cleanWords.length > 0 
        ? cleanWords.map(w => `${w}:*`).join(' & ')
        : null;
    
    const prefixQuery = prefixTerm 
        ? Prisma.sql`to_tsquery('simple', ${prefixTerm})`
        : null;

    let fullTsQuery: Prisma.Sql;
    if (prefixQuery) {
        fullTsQuery = Prisma.sql`(${webQuery} || ${webQuerySimple} || ${prefixQuery})`;
    } else {
        fullTsQuery = Prisma.sql`(${webQuery} || ${webQuerySimple})`;
    }

    const allPageConditions = [...baseConditions];
    allPageConditions.push(Prisma.sql`search_vector @@ ${fullTsQuery}`);

    const whereClause = Prisma.sql`WHERE ${Prisma.join(allPageConditions, ' AND ')}`;

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
