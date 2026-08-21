import type { Opportunity } from '@fresherflow/types';
import MapPinIcon from '@heroicons/react/24/outline/MapPinIcon';
import CheckCircleIcon from '@heroicons/react/24/solid/CheckCircleIcon';

type WalkInDetailsCardProps = {
    walkInDetails: NonNullable<Opportunity['walkInDetails']>;
};

export function WalkInDetailsCard({ walkInDetails }: WalkInDetailsCardProps) {
    return (
        <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 mb-4 space-y-3">
            <h3 className="font-semibold text-amber-900 dark:text-amber-200 flex items-center gap-2">
                <MapPinIcon className="w-4 h-4" /> Walk-In Interview Details
            </h3>
            
            {/* Venue */}
            {walkInDetails.venueAddress && (
                <div className="flex items-start gap-2 text-sm">
                    <span className="text-muted-foreground min-w-16">Venue:</span>
                    <div>
                        <p className="text-foreground">{walkInDetails.venueAddress}</p>
                        {walkInDetails.venueLink && (
                            <a href={walkInDetails.venueLink}
                               target="_blank" rel="noopener noreferrer"
                               className="text-xs text-primary hover:underline flex items-center gap-1 mt-0.5">
                                <MapPinIcon className="w-3 h-3" /> Get directions →
                            </a>
                        )}
                    </div>
                </div>
            )}
            
            {/* Date */}
            {walkInDetails.dateRange && (
                <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground min-w-16">Date:</span>
                    <span className="text-foreground font-medium">
                        {walkInDetails.dateRange}
                    </span>
                </div>
            )}
            
            {/* Time */}
            {(walkInDetails.timeRange || walkInDetails.reportingTime) && (
                <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground min-w-16">Time:</span>
                    <span className="text-foreground font-medium">
                        {walkInDetails.timeRange || walkInDetails.reportingTime}
                    </span>
                </div>
            )}

            {/* Documents checklist */}
            <div>
                <p className="text-sm text-muted-foreground mb-1.5">📋 Carry these documents:</p>
                <ul className="space-y-1">
                    {['Updated Resume (2 copies)', 'Aadhaar / Govt. ID (original + copy)', 'Degree Certificate & Marksheets', '2 Recent Passport Photos', 'Offer letter (if any previous)'].map(doc => (
                        <li key={doc} className="flex items-center gap-2 text-sm text-foreground">
                            <CheckCircleIcon className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> {doc}
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
}
