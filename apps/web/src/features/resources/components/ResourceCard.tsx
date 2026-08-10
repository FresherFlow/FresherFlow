import React from 'react';
import Link from 'next/link';
import { ResourceCollection, ResourceItem, ResourceItemType } from '@fresherflow/types';
import { BookOpen, FolderOpen, FileText, Compass, Globe, PlayCircle, ChevronRight, Bookmark } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/ui/Card';
import { Badge } from '@/ui/Badge';

interface ResourceCardProps {
    collection: ResourceCollection;
    isSaved?: boolean;
    onToggleSave?: () => void;
}

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
    
    return 'text-purple-500 bg-purple-500/10';
}

export function getIconByUrl(url: string, type?: string, className?: string) {
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
}

export const ResourceCard: React.FC<ResourceCardProps> = ({ collection, isSaved, onToggleSave }) => {
    return (
        <Card className="mb-4 overflow-hidden">
            <CardHeader className="flex flex-row items-start justify-between pb-2">
                <div className="space-y-1">
                    <CardTitle className="text-base font-bold">
                        <Link href={`/resources/${collection.id}`} className="hover:underline">
                            {collection.title}
                        </Link>
                    </CardTitle>
                    {collection.company && (
                        <p className="text-sm text-muted-foreground font-semibold">
                            {collection.company}
                        </p>
                    )}
                </div>
                <button onClick={onToggleSave} className="text-muted-foreground hover:text-foreground">
                    <Bookmark className={`w-5 h-5 ${isSaved ? 'fill-current text-primary' : ''}`} />
                </button>
            </CardHeader>
            <CardContent>
                {collection.skills && collection.skills.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-4">
                        {collection.skills.map((skill) => (
                            <Badge key={skill} variant="secondary" className="text-xs">
                                {skill}
                            </Badge>
                        ))}
                    </div>
                )}
                
                <div className="space-y-2">
                    {collection.items.slice(0, 3).map((item) => {
                        const colorClass = getColorByUrl(item.url, item.type);
                        return (
                            <a 
                                key={item.id} 
                                href={item.url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="flex items-center p-3 rounded-lg border bg-card hover:bg-accent transition-colors group"
                            >
                                <div className={`p-2 rounded-md ${colorClass} mr-3`}>
                                    {getIconByUrl(item.url, item.type, "w-4 h-4")}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                                        {item.title}
                                    </p>
                                </div>
                                <ChevronRight className="w-4 h-4 text-muted-foreground/50 opacity-0 group-hover:opacity-100 transition-opacity ml-2" />
                            </a>
                        );
                    })}
                    
                    {collection.items.length > 3 && (
                        <Link href={`/resources/${collection.id}`} className="block text-center text-sm font-semibold text-primary py-2 hover:underline">
                            View {collection.items.length - 3} more resources
                        </Link>
                    )}
                </div>
            </CardContent>
        </Card>
    );
};
