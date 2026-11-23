import type { DriveDetailsLike } from '@/features/jobs/utils/walkinMapUtils';
import MapPinIcon from '@heroicons/react/24/outline/MapPinIcon';
import CheckCircleIcon from '@heroicons/react/24/solid/CheckCircleIcon';
import ArrowTopRightOnSquareIcon from '@heroicons/react/24/outline/ArrowTopRightOnSquareIcon';
import ClipboardDocumentCheckIcon from '@heroicons/react/24/outline/ClipboardDocumentCheckIcon';
import { getDriveRequiredDocuments, getOsmEmbedUrlForCoords } from '@/features/jobs/utils/walkinMapUtils';

type WalkInDetailsCardProps = {
    walkInDetails: DriveDetailsLike;
    /**
     * The source did not publish an exact venue/coordinates. We show a city-level
     * area instead and must say so — never present it as the venue.
     */
    approximate?: boolean;
};

export function WalkInDetailsCard({ walkInDetails, approximate = false }: WalkInDetailsCardProps) {
    const lat = walkInDetails.latitude;
    const lng = walkInDetails.longitude;
    const venue = walkInDetails.venueAddress?.trim();
    const city = walkInDetails.city?.trim();
    const destination = venue || city || '';
    const navUrl = walkInDetails.venueLink || (
        destination
            ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`
            : null
    );
    // A city-level pin gets a wider bbox so the map reads as a neighbourhood,
    // not a fake exact venue. OSM needs no key and cannot geocode an address,
    // so the iframe is driven by coordinates resolved from the opportunity.
    const embedUrl = getOsmEmbedUrlForCoords(lat, lng, approximate ? 0.02 : 0.004);
    const documents = approximate
        ? (walkInDetails.requiredDocuments ?? [])
        : getDriveRequiredDocuments(walkInDetails);
    const hasSchedule = Boolean(walkInDetails.dateRange || walkInDetails.timeRange || walkInDetails.reportingTime);

    /* Neutral surface, warning only as an accent tint. This keeps the panel
       inside the design system: no second palette, no new shadow token. */
    return (
        <div className="bg-card border border-warning/30 rounded-2xl p-4 mb-4 space-y-3.5 shadow-sm">
            <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
                    <MapPinIcon className="w-4 h-4 text-warning" /> Walk-In Interview Details
                </h3>
                {walkInDetails.techCluster && (
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-warning/15 text-foreground border border-warning/30">
                        {walkInDetails.techCluster}
                    </span>
                )}
            </div>

            {/* Venue & Directions. Always present for a walk-in: an honest
                "not shared" state is more useful than a missing section. */}
            <div className="flex flex-col gap-1 text-sm bg-muted/60 p-3 rounded-xl">
                <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            {venue ? 'Venue Location' : 'Venue'}
                        </span>
                        <p className="text-foreground font-medium text-xs sm:text-sm mt-0.5">
                            {venue || 'Not shared by the employer'}
                        </p>
                        {!venue && city && (
                            <p className="text-xs text-muted-foreground mt-0.5">City: {city}</p>
                        )}
                    </div>
                    {navUrl && (
                        <a
                            href={navUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="shrink-0 px-2.5 py-1 text-xs font-semibold rounded-lg bg-primary text-primary-foreground [@media(hover:hover)_and_(pointer:fine)]:hover:bg-primary/90 transition-colors flex items-center gap-1"
                        >
                            <span>{approximate ? 'Search area' : 'Directions'}</span>
                            <ArrowTopRightOnSquareIcon className="w-3 h-3" />
                        </a>
                    )}
                </div>

                {embedUrl && (
                    <div className="w-full h-44 mt-2 rounded-lg overflow-hidden relative">
                        <iframe
                            title={approximate ? 'Approximate walk-in area' : 'Venue Map Location'}
                            className="w-full h-full border-0 dark:invert dark:hue-rotate-180 dark:contrast-90 dark:brightness-95 transition-all duration-300"
                            src={embedUrl}
                            loading="lazy"
                            referrerPolicy="no-referrer-when-downgrade"
                        />
                    </div>
                )}
                {approximate && (
                    <p className="text-xs text-muted-foreground mt-1">
                        Approximate area only — the exact venue has not been shared.
                    </p>
                )}
            </div>

            {hasSchedule && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    {walkInDetails.dateRange && (
                        <div className="bg-muted/60 p-2.5 rounded-xl">
                            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">Drive Dates</span>
                            <span className="text-foreground font-bold mt-0.5 block">{walkInDetails.dateRange}</span>
                        </div>
                    )}

                    {(walkInDetails.timeRange || walkInDetails.reportingTime) && (
                        <div className="bg-muted/60 p-2.5 rounded-xl">
                            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">Reporting Time</span>
                            <span className="text-foreground font-bold mt-0.5 block">{walkInDetails.timeRange || walkInDetails.reportingTime}</span>
                        </div>
                    )}
                </div>
            )}

            {documents.length > 0 && (
                <div className="bg-muted/60 p-3 rounded-xl">
                    <p className="text-xs font-bold text-foreground mb-2 flex items-center gap-1.5">
                        <ClipboardDocumentCheckIcon className="w-4 h-4 text-primary" />
                        <span>Mandatory Documents to Carry:</span>
                    </p>
                    <ul className="grid grid-cols-1 gap-1.5 text-xs text-foreground/90">
                        {documents.map(doc => (
                            <li key={doc} className="flex items-center gap-2 font-medium">
                                <CheckCircleIcon className="w-3.5 h-3.5 text-success shrink-0" />
                                <span>{doc}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}
