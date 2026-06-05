import { Router, Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import prisma from '../infrastructure/database/prisma';
import { ResourceItemType, CreateSharedResourceRequest } from '@fresherflow/types';
import { optionalAuth } from '../middleware/auth';
import { logger } from '@fresherflow/logger';

const router = Router();

// Simple webpage title fetcher
async function fetchPageTitle(url: string): Promise<string | null> {
    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'FresherFlow Bot 1.0',
                'Accept': 'text/html,application/xhtml+xml'
            },
            signal: AbortSignal.timeout(5000)
        });
        
        if (!response.ok) return null;
        
        const html = await response.text();
        const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
        
        if (titleMatch && titleMatch[1]) {
            // Unescape common HTML entities
            return titleMatch[1]
                .replace(/&amp;/g, '&')
                .replace(/&lt;/g, '<')
                .replace(/&gt;/g, '>')
                .replace(/&quot;/g, '"')
                .replace(/&#39;/g, "'")
                .trim();
        }
    } catch (error) {
        logger.warn(`Failed to fetch title for URL: ${url}`, { error: String(error) });
    }
    return null;
}

// Auto-detect type
function detectResourceType(url: string): ResourceItemType {
    const lowerUrl = url.toLowerCase();
    if (lowerUrl.includes('youtube.com') || lowerUrl.includes('youtu.be')) {
        return ResourceItemType.YOUTUBE;
    }
    if (lowerUrl.includes('drive.google.com')) {
        return ResourceItemType.GOOGLE_DRIVE;
    }
    if (lowerUrl.includes('roadmap.sh')) {
        return ResourceItemType.ROADMAP;
    }
    return ResourceItemType.LINK;
}

const submitResourceValidation = [
    body('url').isURL().withMessage('Valid URL is required'),
    body('title').optional().isString().trim(),
    body('company').optional().isString().trim(),
    body('skills').optional().isArray(),
    body('skills.*').isString().trim()
];

router.post('/', 
    optionalAuth, 
    submitResourceValidation, 
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                res.status(400).json({ error: errors.array()[0]?.msg || 'Validation failed' });
                return;
            }

            const { url, title: providedTitle, company, skills } = req.body as CreateSharedResourceRequest;
            const userId = req.userId || null;
            
            // Check for existing url
            const existing = await prisma.sharedResource.findUnique({
                where: { url }
            });

            if (existing) {
                res.status(409).json({ error: 'This resource has already been submitted.' });
                return;
            }

            const type = detectResourceType(url);
            let finalTitle = providedTitle?.trim();

            if (!finalTitle) {
                const fetchedTitle = await fetchPageTitle(url);
                finalTitle = fetchedTitle || url; // Fallback to URL if we can't get a title
            }

            // Truncate title if extremely long
            if (finalTitle.length > 200) {
                finalTitle = finalTitle.substring(0, 197) + '...';
            }

            let username: string | null = null;
            if (userId) {
                const user = await prisma.user.findUnique({
                    where: { id: userId },
                    select: { username: true }
                });
                username = user?.username || null;
            }

            const resource = await prisma.sharedResource.create({
                data: {
                    url,
                    title: finalTitle,
                    type,
                    company: company || null,
                    skills: skills || [],
                    addedByUserId: userId,
                    addedByUsername: username
                }
            });

            res.status(201).json({ resource });
            
        } catch (error) {
            next(error);
        }
    }
);

// Get approved resources (public)
router.get('/', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const resources = await prisma.sharedResource.findMany({
            where: {
                status: 'APPROVED'
            },
            orderBy: {
                createdAt: 'desc'
            },
            take: 100
        });

        res.json({ resources });
    } catch (error) {
        next(error);
    }
});

export default router;
