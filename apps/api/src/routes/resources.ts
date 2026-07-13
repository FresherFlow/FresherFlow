import { Router, Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import prisma from '../infrastructure/database/prisma';
import { ResourceItemType } from '@fresherflow/types';
import { optionalAuth } from '../middleware/auth';
import { logger } from '@fresherflow/logger';
import { isSafeUrlForFetch } from '@fresherflow/utils';

const router = Router();

// Simple webpage title fetcher
async function fetchPageTitle(urlStr: string): Promise<string | null> {
    if (!isSafeUrlForFetch(urlStr)) {
        logger.warn(`Skipping fetch for unsafe URL: ${urlStr}`);
        return null;
    }
    try {
        const parsedUrl = new URL(urlStr);
        if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
            return null;
        }

        const hostname = parsedUrl.hostname.toLowerCase();
        
        // Strict validation: must be a valid domain name, rejecting all IP addresses and localhosts
        if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*\.[a-z]{2,}$/i.test(hostname)) {
            logger.warn(`Skipping fetch for invalid or IP-based hostname: ${hostname}`);
            return null;
        }

        const response = await fetch(parsedUrl.href, {
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
            return titleMatch[1]
                .replace(/&lt;/g, '<')
                .replace(/&gt;/g, '>')
                .replace(/&quot;/g, '"')
                .replace(/&#39;/g, "'")
                .replace(/&apos;/g, "'")
                .replace(/&amp;/g, '&')
                .trim();
        }

    } catch (error) {
        logger.warn(`Failed to fetch title for URL: ${urlStr}`, { error: String(error) });
    }
    return null;
}

// Auto-detect type
function detectResourceType(url: string): ResourceItemType {
    const lowerUrl = url.toLowerCase();
    if (lowerUrl.includes('youtube.com') || lowerUrl.includes('youtu.be')) {
        return ResourceItemType.YOUTUBE;
    }
    if (lowerUrl.endsWith('.pdf')) {
        return ResourceItemType.PDF;
    }
    if (lowerUrl.includes('roadmap.sh')) {
        return ResourceItemType.ROADMAP;
    }

    const isCloudStorage = 
        lowerUrl.includes('drive.google.com') || 
        lowerUrl.includes('dropbox.com') || 
        lowerUrl.includes('onedrive') || 
        lowerUrl.includes('box.com') ||
        lowerUrl.includes('sharepoint');

    if (isCloudStorage) {
        return ResourceItemType.FILE;
    }

    return ResourceItemType.LINK;
}

const adaptSingleUrlSubmit = (req: Request, res: Response, next: NextFunction): void => {
    if (req.body && typeof req.body.url === 'string' && req.body.url.trim()) {
        const url = req.body.url.trim();
        req.body.title = req.body.title || 'Resource Link';
        req.body.items = [
            {
                url,
                title: req.body.title !== 'Resource Link' ? req.body.title : undefined,
                type: req.body.type
            }
        ];
    }
    next();
};

const submitResourceValidation = [
    body('title').isString().notEmpty().withMessage('Collection title is required'),
    body('description').optional().isString().trim(),
    body('company').optional().isString().trim(),
    body('skills').optional().isArray(),
    body('skills.*').isString().trim(),
    body('tags').optional().isArray(),
    body('tags.*').isString().trim(),
    body('sector').optional().isIn(['PRIVATE', 'GOVERNMENT']).withMessage('Invalid sector'),
    body('items').isArray({ min: 1 }).withMessage('At least one resource item is required'),
    body('items.*.url').isURL({ require_tld: false }).withMessage('Each item must have a valid URL'),
    body('items.*.title').optional().isString().trim(),
    body('items.*.type').optional().isIn(Object.values(ResourceItemType)).withMessage('Invalid item type')
];

router.post('/', 
    optionalAuth, 
    adaptSingleUrlSubmit,
    submitResourceValidation, 
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                res.status(400).json({ error: errors.array()[0]?.msg || 'Validation failed' });
                return;
            }

            const { title, description, company, skills, tags, items, sector } = req.body;
            const userId = req.userId || null;

            // Check for duplicate URLs across any existing APPROVED or PENDING collections
            const urlsToCheck = items.map((item: { url: string }) => item.url.trim());
            const existingItem = await prisma.resourceItem.findFirst({
                where: {
                    url: {
                        in: urlsToCheck,
                        mode: 'insensitive'
                    }
                },
                include: {
                    collection: true
                }
            });

            if (existingItem) {
                res.status(409).json({
                    error: 'This link is already under review or approved!',
                    existing: true,
                    status: existingItem.collection.status
                });
                return;
            }
            
            // Map items, auto-detecting types and titles if necessary
            const mappedItems = await Promise.all(items.map(async (item: { url: string; type?: ResourceItemType; title?: string }) => {
                const url = item.url.trim();
                let type = item.type;
                if (!type || !Object.values(ResourceItemType).includes(type)) {
                    type = detectResourceType(url);
                }
                let itemTitle = item.title?.trim();
                if (!itemTitle) {
                    const fetchedTitle = await fetchPageTitle(url);
                    itemTitle = fetchedTitle || url;
                }
                if (itemTitle.length > 200) {
                    itemTitle = itemTitle.substring(0, 197) + '...';
                }
                return {
                    title: itemTitle,
                    url,
                    type
                };
            }));

            let finalCollectionTitle = title.trim();
            if (finalCollectionTitle === 'Resource Link' && mappedItems.length === 1) {
                finalCollectionTitle = mappedItems[0].title;
            }

            let username: string | null = null;
            if (userId) {
                const user = await prisma.user.findUnique({
                    where: { id: userId },
                    select: { username: true }
                });
                username = user?.username || null;
            }

            const collection = await prisma.resourceCollection.create({
                data: {
                    title: finalCollectionTitle,
                    description: description || null,
                    company: company || null,
                    skills: skills || [],
                    tags: tags || [],
                    addedByUserId: userId,
                    addedByUsername: username,
                    sector: sector || 'PRIVATE',
                    items: {
                        create: mappedItems
                    }
                },
                include: {
                    items: true
                }
            });

            res.status(201).json({ resource: collection });
            
        } catch (error) {
            next(error);
        }
    }
);

// Get approved collections (public)
router.get('/', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const collections = await prisma.resourceCollection.findMany({
            where: {
                status: 'APPROVED'
            },
            include: {
                items: true
            },
            orderBy: {
                createdAt: 'desc'
            },
            take: 100
        });

        res.json({ resources: collections });
    } catch (error) {
        next(error);
    }
});

export default router;
