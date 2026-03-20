import type { Opportunity } from '@fresherflow/types';
import { Button } from '@/components/ui/Button';
import { formatTimeText12Hour } from '@fresherflow/domain';

type WalkInDetailsCardProps = {
    walkInDetails: NonNullable<Opportunity['walkInDetails']>;
};

export function WalkInDetailsCard({ walkInDetails }: WalkInDetailsCardProps) {
    return (
        <div className="bg-card border border-border p-4 md:p-5 rounded-xl space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-primary pb-2">Walk-in Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                    <p className="text-xs md:text-sm font-bold text-muted-foreground uppercase">Date &amp; Time</p>
                    <p className="text-sm md:text-base font-semibold text-foreground">
                        {walkInDetails.dateRange} | {formatTimeText12Hour(walkInDetails.timeRange || walkInDetails.reportingTime)}
                    </p>
                </div>
                <div className="space-y-2">
                    <p className="text-xs md:text-sm font-bold text-muted-foreground uppercase">Venue</p>
                    <p className="text-sm md:text-base font-medium text-foreground leading-relaxed">{walkInDetails.venueAddress}</p>
                    {walkInDetails.venueLink && (
                        <Button
                            variant="outline"
                            onClick={() => window.open(walkInDetails.venueLink, '_blank')}
                            className="h-8 bg-primary hover:bg-primary/90 border-none text-primary-foreground font-bold uppercase text-xs px-3 shadow-sm"
                        >
                            View on Maps
                        </Button>
                    )}
                </div>
            </div>
            {(walkInDetails.requiredDocuments?.length || walkInDetails.contactPerson || walkInDetails.contactPhone) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {walkInDetails.requiredDocuments?.length ? (
                        <div className="space-y-1">
                            <p className="text-xs md:text-sm font-bold text-muted-foreground uppercase">Documents</p>
                            <ul className="text-sm text-foreground space-y-1 list-disc list-inside">
                                {walkInDetails.requiredDocuments.map((doc) => (
                                    <li key={doc}>{doc}</li>
                                ))}
                            </ul>
                        </div>
                    ) : null}
                    {(walkInDetails.contactPerson || walkInDetails.contactPhone) && (
                        <div className="space-y-1">
                            <p className="text-xs md:text-sm font-bold text-muted-foreground uppercase">Contact</p>
                            {walkInDetails.contactPerson && (
                                <p className="text-sm md:text-base font-medium text-foreground">{walkInDetails.contactPerson}</p>
                            )}
                            {walkInDetails.contactPhone && (
                                <p className="text-sm md:text-base font-medium text-foreground">{walkInDetails.contactPhone}</p>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
