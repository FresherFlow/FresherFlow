'use client';

import { Opportunity } from '@fresherflow/types';
import LinkIcon from '@heroicons/react/24/outline/LinkIcon';
import ChatBubbleOvalLeftEllipsisIcon from '@heroicons/react/24/outline/ChatBubbleOvalLeftEllipsisIcon';
import ClipboardDocumentCheckIcon from '@heroicons/react/24/outline/ClipboardDocumentCheckIcon';
import BookmarkIcon from '@heroicons/react/24/outline/BookmarkIcon';
import BookmarkSolidIcon from '@heroicons/react/24/solid/BookmarkIcon';
import EllipsisVerticalIcon from '@heroicons/react/24/outline/EllipsisVerticalIcon';
import toast from 'react-hot-toast';
import { isCampusDriveOpportunity } from '@/lib/utils/driveTimeline';
import { getWhatsAppShareUrl } from '@/features/opportunities/utils/walkinMapUtils';
import { generateJobSummaryText } from './jobCardUtils';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/ui/DropdownMenu';

interface JobCardMenuProps {
    job: Opportunity;
    shareUrl: string;
    isJobSaved: boolean;
    onSaveClick: (e: React.MouseEvent) => void;
}

export function JobCardMenu({ job, shareUrl, isJobSaved, onSaveClick }: JobCardMenuProps) {
    const isDrive = isCampusDriveOpportunity(job);

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <button
                    type="button"
                    onClick={(e) => e.stopPropagation()}
                    className="h-8 w-8 rounded-lg hover:bg-muted/60 text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors outline-none"
                    aria-label="Job options"
                >
                    <EllipsisVerticalIcon className="w-4 h-4" />
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 z-50">
                <DropdownMenuItem
                    onClick={(e) => {
                        e.stopPropagation();
                        const waUrl =
                            job.type === 'WALKIN' || isDrive
                                ? getWhatsAppShareUrl(job)
                                : `https://api.whatsapp.com/send?text=${encodeURIComponent(generateJobSummaryText(job, shareUrl))}`;
                        window.open(waUrl, '_blank');
                    }}
                    className="cursor-pointer text-xs"
                >
                    <ChatBubbleOvalLeftEllipsisIcon className="w-3.5 h-3.5 mr-2 text-emerald-600 dark:text-emerald-400" />
                    Share on WhatsApp
                </DropdownMenuItem>
                <DropdownMenuItem
                    onClick={(e) => {
                        e.stopPropagation();
                        navigator.clipboard.writeText(generateJobSummaryText(job, shareUrl));
                        toast.success('Summary copied to clipboard');
                    }}
                    className="cursor-pointer text-xs"
                >
                    <ClipboardDocumentCheckIcon className="w-3.5 h-3.5 mr-2 text-foreground/70" />
                    Copy Summary
                </DropdownMenuItem>
                <DropdownMenuItem
                    onClick={(e) => {
                        e.stopPropagation();
                        if (shareUrl) {
                            navigator.clipboard.writeText(shareUrl);
                            toast.success('Link copied to clipboard');
                        }
                    }}
                    className="cursor-pointer text-xs"
                >
                    <LinkIcon className="w-3.5 h-3.5 mr-2 text-foreground/70" />
                    Copy Link
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onSaveClick} className="cursor-pointer text-xs">
                    {isJobSaved ? (
                        <BookmarkSolidIcon className="w-3.5 h-3.5 mr-2 text-primary" />
                    ) : (
                        <BookmarkIcon className="w-3.5 h-3.5 mr-2" />
                    )}
                    {isJobSaved ? 'Remove Bookmark' : 'Save Job'}
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
