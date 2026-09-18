import type { Opportunity } from '@fresherflow/types';
import MapPinIcon from '@heroicons/react/24/outline/MapPinIcon';
import CheckCircleIcon from '@heroicons/react/24/solid/CheckCircleIcon';
import ArrowTopRightOnSquareIcon from '@heroicons/react/24/outline/ArrowTopRightOnSquareIcon';
import ClipboardDocumentCheckIcon from '@heroicons/react/24/outline/ClipboardDocumentCheckIcon';

type WalkInDetailsCardProps = {
    walkInDetails: NonNullable<Opportunity['walkInDetails']>;
};

export function WalkInDetailsCard({ walkInDetails }: WalkInDetailsCardProps) {
    const lat = walkInDetails.latitude;
    const lng = walkInDetails.longitude;
    const hasCoords = lat !== undefined && lng !== undefined;
    const query = hasCoords ? `${lat},${lng}` : walkInDetails.venueAddress;
    const navUrl = walkInDetails.venueLink || (query ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(query)}` : null);

    return (
        <div className="bg-warning/80 dark:bg-warning/20 border border-warning/80 dark:border-warning/60 rounded-2xl p-4 mb-4 space-y-3.5 shadow-sm">
            <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm text-warning dark:text-warning flex items-center gap-2">
                    <MapPinIcon className="w-4 h-4 text-warning dark:text-warning" /> Walk-In Interview Details
                </h3>
                {walkInDetails.techCluster && (
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-warning/60 dark:bg-warning/40 text-warning dark:text-warning border border-warning/60 dark:border-warning/60">
                        {walkInDetails.techCluster}
                    </span>
                )}
            </div>
            
            {/* Venue & Directions */}
            {walkInDetails.venueAddress && (
                <div className="flex flex-col gap-1 text-sm bg-background/60 dark:bg-background/40 p-3 rounded-xl border border-warning/50 dark:border-warning/40">
                    <div className="flex items-start justify-between gap-2">
                        <div>
                            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Venue Location</span>
                            <p className="text-foreground font-medium text-xs sm:text-sm mt-0.5">{walkInDetails.venueAddress}</p>
                        </div>
                        {navUrl && (
                            <a 
                                href={navUrl}
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="shrink-0 px-2.5 py-1 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors flex items-center gap-1 shadow-xs"
                            >
                                <span>Directions</span>
                                <ArrowTopRightOnSquareIcon className="w-3 h-3" />
                            </a>
                        )}
                    </div>

                    {/* Venue Embedded Map */}
                    {query && (
                        <div className="w-full h-44 mt-2 rounded-lg overflow-hidden border border-border/80 relative">
                            <iframe
                                title="Venue Map Location"
                                className="w-full h-full border-0 dark:invert dark:hue-rotate-180 dark:contrast-90 dark:brightness-95 transition-all duration-300"
                                src={`https://maps.google.com/maps?q=${encodeURIComponent(query)}&hl=en&z=15&output=embed`}
                                loading="lazy"
                            />
                        </div>
                    )}
                </div>
            )}
            
            {/* Date & Time Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {walkInDetails.dateRange && (
                    <div className="bg-background/60 dark:bg-background/40 p-2.5 rounded-xl border border-warning/50 dark:border-warning/40">
                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">Drive Dates</span>
                        <span className="text-foreground font-bold mt-0.5 block">{walkInDetails.dateRange}</span>
                    </div>
                )}
                
                {(walkInDetails.timeRange || walkInDetails.reportingTime) && (
                    <div className="bg-background/60 dark:bg-background/40 p-2.5 rounded-xl border border-warning/50 dark:border-warning/40">
                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">Reporting Time</span>
                        <span className="text-foreground font-bold mt-0.5 block">{walkInDetails.timeRange || walkInDetails.reportingTime}</span>
                    </div>
                )}
            </div>

            {/* Documents checklist */}
            <div className="bg-background/60 dark:bg-background/40 p-3 rounded-xl border border-warning/50 dark:border-warning/40">
                <p className="text-xs font-bold text-foreground mb-2 flex items-center gap-1.5">
                    <ClipboardDocumentCheckIcon className="w-4 h-4 text-primary" />
                    <span>Mandatory Documents to Carry:</span>
                </p>
                <ul className="grid grid-cols-1 gap-1.5 text-xs text-foreground/90">
                    {['Updated Resume (2 Hard Copies)', 'Govt. Photo ID Proof (Aadhaar / PAN)', 'Original Marksheets & Provisional Degree', '2 Passport Size Photos'].map(doc => (
                        <li key={doc} className="flex items-center gap-2 font-medium">
                            <CheckCircleIcon className="w-3.5 h-3.5 text-success shrink-0" />
                            <span>{doc}</span>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
}
