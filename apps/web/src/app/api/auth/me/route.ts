import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyAccessToken } from '@fresherflow/utils';
import prisma from '@fresherflow/database';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    try {
        const cookieStore = await cookies();
        let token = cookieStore.get('accessToken')?.value;
        if (!token) {
            const authHeader = req.headers.get('Authorization');
            if (authHeader && authHeader.startsWith('Bearer ')) {
                token = authHeader.split('Bearer ')[1];
            }
        }

        if (!token) {
            return NextResponse.json({ user: null, profile: null }, { status: 401 });
        }

        const userId = verifyAccessToken(token);
        if (!userId) {
            return NextResponse.json({ user: null, profile: null }, { status: 401 });
        }

        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: {
                profile: true,
            },
        });

        if (!user) {
            return NextResponse.json({ user: null, profile: null }, { status: 401 });
        }

        return NextResponse.json({
            user: {
                id: user.id,
                email: user.email || undefined,
                username: user.username,
                fullName: user.fullName,
                role: user.role,
                isAnonymous: user.isAnonymous,
                createdAt: user.createdAt,
            },
            profile: user.profile,
        });
    } catch {
        return NextResponse.json({ user: null, profile: null }, { status: 401 });
    }
}
