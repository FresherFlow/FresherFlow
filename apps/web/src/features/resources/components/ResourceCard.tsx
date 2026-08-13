'use client';

import { cn } from '@repo/ui/utils/cn';
import { useState, useRef, useEffect } from 'react';
import type { ResourceCollection } from '@fresherflow/types';
import BookmarkIcon from '@heroicons/react/24/outline/BookmarkIcon';
import BookmarkSolidIcon from '@heroicons/react/24/solid/BookmarkIcon';
import PaperAirplaneIcon from '@heroicons/react/24/outline/PaperAirplaneIcon';
import ChevronDownIcon from '@heroicons/react/24/outline/ChevronDownIcon';
import { ExternalLink, PlayCircle, FileText, Compass, FolderOpen, Globe } from 'lucide-react';
import { SkillPill } from '@/ui/SkillPill';
import CompanyLogo from '@/ui/CompanyLogo';
import { useAuth } from '@/lib/auth/AuthContext';
import { promptLoginToast } from '@/lib/utils/toastUtils';

export function getDomainInfo(urlStr: string) {
    try {
        const normalized = urlStr.indexOf('://') !== -1 ? urlStr : `https://${urlStr}`;
        const parsed = new URL(normalized);
        return {
            host: parsed.hostname.toLowerCase(),
            pathname: parsed.pathname.toLowerCase(),
            search: parsed.search.toLowerCase()
        };
    } catch {
        return { host: '', pathname: '', search: '' };
    }
}

export function getColorByUrl(url: string, type?: string) {
    const { host, pathname } = getDomainInfo(url);
    if (type === 'YOUTUBE' || host === 'youtube.com' || host.endsWith('.youtube.com') || host === 'youtu.be') return 'text-red-500 bg-red-500/10';
    if (type === 'PDF' || pathname.endsWith('.pdf')) return 'text-orange-500 bg-orange-500/10';
    if (type === 'ROADMAP' || host === 'roadmap.sh' || host.endsWith('.roadmap.sh')) return 'text-blue-500 bg-blue-500/10';
    if (
        type === 'FOLDER' ||
        type === 'FILE' ||
        host === 'drive.google.com' || host.endsWith('.drive.google.com') ||
        host === 'dropbox.com' || host.endsWith('.dropbox.com') ||
        host.split('.').includes('onedrive') ||
        host === 'box.com' || host.endsWith('.box.com') ||
        host.split('.').includes('sharepoint')
    ) return 'text-emerald-500 bg-emerald-500/10';
    
    return 'text-primary bg-primary/10';
}

export const getIconByUrl = (url: string, type?: string, className?: string) => {
    const { host, pathname, search } = getDomainInfo(url);
    if (type === 'YOUTUBE' || host === 'youtube.com' || host.endsWith('.youtube.com') || host === 'youtu.be') return <PlayCircle className={className} />;
    if (type === 'PDF' || pathname.endsWith('.pdf')) return <FileText className={className} />;
    if (type === 'ROADMAP' || host === 'roadmap.sh' || host.endsWith('.roadmap.sh')) return <Compass className={className} />;
    if (type === 'FOLDER') return <FolderOpen className={className} />;
    if (type === 'FILE') return <FileText className={className} />;
    if (
        host === 'drive.google.com' || host.endsWith('.drive.google.com') ||
        host === 'dropbox.com' || host.endsWith('.dropbox.com') ||
        host.split('.').includes('onedrive') ||
        host === 'box.com' || host.endsWith('.box.com') ||
        host.split('.').includes('sharepoint')
    ) {
        const isFolder = pathname.includes('folder') || pathname.includes('folders') || search.includes('id=');
        return isFolder ? <FolderOpen className={className} /> : <FileText className={className} />;
    }
    return <Globe className={className} />;
};

const calculateVisibleSkills = (skills: string[], isMobile: boolean) => {
    if (!skills || skills.length === 0) return 0;
    // Dynamically fill up to 80% width based on estimated text width
    const maxWidth = isMobile ? ((typeof window !== 'undefined' ? window.innerWidth : 375) * 0.8 - 40) : 500;
    let currentWidth = 0;
    let count = 0;
    for (let i = 0; i < skills.length; i++) {
        const skillWidth = skills[i].length * 7.5 + 24;
        const badgeWidth = 36;
        const gap = 6;
        
        const isLast = i === skills.length - 1;
        const requiredSpace = skillWidth + (isLast ? 0 : gap + badgeWidth);
        
        if (currentWidth + requiredSpace <= maxWidth) {
            currentWidth += skillWidth + gap;
            count++;
        } else {
            break;
        }
    }
    return Math.max(1, count);
};

interface ResourceCardProps {
    collection: ResourceCollection;
    isSaved?: boolean;
    onToggleSave?: () => void;
}

export const ResourceCard: React.FC<ResourceCardProps> = ({ collection, isSaved, onToggleSave }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [showChevron, setShowChevron] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const itemsContainerRef = useRef<HTMLDivElement>(null);
    const { user } = useAuth();
    
    const primaryItem = collection.items?.[0];
    const targetUrl = primaryItem?.url || '#';

    const hasMultipleItems = collection.items && collection.items.length > 1;

    useEffect(() => {
        const checkOverflow = () => {
            const mobile = window.innerWidth < 768;
            setIsMobile(mobile);
            
            if (itemsContainerRef.current) {
                // Mobile (1 line): > 40px, Desktop (2 lines): > 76px
                const threshold = mobile ? 40 : 76;
                setShowChevron(itemsContainerRef.current.scrollHeight > threshold);
            }
        };

        checkOverflow();
        window.addEventListener('resize', checkOverflow);
        
        const el = itemsContainerRef.current;
        if (el) {
            const observer = new ResizeObserver(checkOverflow);
            observer.observe(el);
            return () => {
                observer.disconnect();
                window.removeEventListener('resize', checkOverflow);
            };
        }
    }, [collection.items, isExpanded]);

    return (
        <div
            className={cn(
                "group relative bg-card border rounded-xl p-3.5 flex items-start gap-3 md:gap-3.5 hover:border-primary/40 hover:shadow-md transition-all duration-200 border-transparent",
                "mb-4"
            )}
        >
            <button
                type="button"
                onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    if (!user) {
                        promptLoginToast('Sign in to save resources');
                        return;
                    }
                    if (onToggleSave) onToggleSave();
                }}
                className="absolute top-3 right-3 h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors z-20 pointer-events-auto"
                aria-label="Save Resource"
            >
                {isSaved ? <BookmarkSolidIcon className="w-4 h-4 text-primary" /> : <BookmarkIcon className="w-4 h-4" />}
            </button>


            {/* Center Section: Content */}
            <div className="flex-1 min-w-0 flex flex-col justify-center gap-1.5">
                {/* Header info: Title + Company + Open Button */}
                <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                            <h2 className="text-[15px] font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-1 leading-snug">
                                {collection.title}
                            </h2>
                            {hasMultipleItems && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold text-muted-foreground bg-muted border border-border/50 shrink-0 leading-none">
                                    {collection.items.length} Items
                                </span>
                            )}
                        </div>
                        {collection.company && (
                            <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-0.5 truncate">
                                <span className="font-semibold text-foreground/80 truncate shrink-0 max-w-[120px] md:max-w-none">
                                    {collection.company}
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Actions (Open) */}
                    <div className="shrink-0 relative z-20 pointer-events-auto h-8 md:pr-8">
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                if (targetUrl && targetUrl !== '#') {
                                    window.open(targetUrl, '_blank', 'noopener,noreferrer');
                                }
                            }}
                            className={cn(
                                "inline-flex items-center justify-center gap-1.5 px-4 h-8 text-xs font-semibold rounded-lg bg-primary text-primary-foreground transition-all duration-200 cursor-pointer shadow-xs",
                                "opacity-100 md:opacity-0 md:-translate-y-1 md:group-hover:opacity-100 md:group-hover:translate-y-0",
                                "hover:bg-primary/90"
                            )}
                        >
                            <span>Open</span>
                            <ExternalLink className="w-3.5 h-3.5 -mt-0.5" />
                        </button>
                    </div>
                </div>

                {/* Skills Row */}
                {(collection.skills && collection.skills.length > 0) && (
                    <div className="flex items-center gap-1.5 mt-1 mb-2 max-w-[85%] md:max-w-none overflow-hidden whitespace-nowrap">
                        {collection.skills.slice(0, calculateVisibleSkills(collection.skills, isMobile)).map(skill => (
                            <SkillPill
                                key={skill}
                                skill={skill.charAt(0).toUpperCase() + skill.slice(1)}
                                size="sm"
                                className="py-0.5 text-xs shrink-0"
                            />
                        ))}
                        {collection.skills.length > calculateVisibleSkills(collection.skills, isMobile) && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold text-muted-foreground bg-muted border border-border/50 shrink-0">
                                +{collection.skills.length - calculateVisibleSkills(collection.skills, isMobile)}
                            </span>
                        )}
                    </div>
                )}

                {/* Items List (if multiple) */}
                {hasMultipleItems && (
                    <div className="mt-2 relative pr-10">
                        <div 
                            ref={itemsContainerRef}
                            className={cn(
                                "flex flex-wrap gap-2 items-start",
                                !isExpanded && showChevron ? "max-h-[32px] md:max-h-[72px] overflow-hidden" : ""
                            )}
                        >
                            {collection.items?.map((item, idx) => (
                                <button
                                    key={idx}
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (item.url && item.url !== '#') {
                                            window.open(item.url, '_blank', 'noopener,noreferrer');
                                        }
                                    }}
                                    className="group/btn inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-lg border border-border/60 bg-muted/20 hover:bg-muted/80 text-foreground hover:text-primary transition-colors cursor-pointer"
                                >
                                    <span className="truncate max-w-[200px]">{item.title || `Resource ${idx + 1}`}</span>
                                    <div className="w-0 overflow-hidden opacity-0 group-hover/btn:w-3.5 group-hover/btn:ml-1 group-hover/btn:opacity-100 transition-all duration-200">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>
                                    </div>
                                </button>
                            ))}
                        </div>
                        {showChevron && (
                            <div className="absolute right-0 top-0 md:top-auto md:bottom-0 flex justify-end">
                                <button
                                    onClick={() => setIsExpanded(!isExpanded)}
                                    className="inline-flex items-center justify-center w-[32px] h-[32px] rounded-lg border border-border/60 bg-muted/20 hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors"
                                    aria-label={isExpanded ? "Show less items" : "Show more items"}
                                >
                                    <ChevronDownIcon className={cn("w-4 h-4 transition-transform", isExpanded && "rotate-180")} />
                                </button>
                            </div>
                        )}
                    </div>
                )}


            </div>
        </div>
    );
};
