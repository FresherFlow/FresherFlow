import { MapPinIcon } from '@heroicons/react/24/outline';
import { SmartInput } from '@/features/admin/ui/SmartInput';
import { SmartTextarea } from '@/features/admin/ui/SmartTextarea';
import { Card, CardDescription, CardContent } from '@/ui/Card';
import type { OpportunityFormApi } from '@/features/admin/opportunities/useOpportunityForm';

export function WalkInDetailsSection({ form }: { form: OpportunityFormApi }) {
    const {
        startDate, setStartDate,
        endDate, setEndDate,
        startTime, setStartTime,
        endTime, setEndTime,
        venueAddress, setVenueAddress,
        venueLink, setVenueLink,
        requiredDocuments, setRequiredDocuments,
        contactPerson, setContactPerson,
        contactPhone, setContactPhone
    } = form;
    return (
        <Card>
            <div className="p-4 md:p-5 pb-3 space-y-1">
                <h3 className="flex items-center gap-2 text-sm md:text-base font-semibold text-foreground">
                    <MapPinIcon className="w-4 h-4 text-muted-foreground" />
                    Walk-in drive
                </h3>
                <CardDescription>
                    Dates, venue and what candidates must bring.
                </CardDescription>
            </div>
            <CardContent className="space-y-5 px-4 md:px-5 pb-4 md:pb-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="grid grid-cols-2 gap-2">
                    <SmartInput
                        label="Start Date *"
                        type="date"
                        required
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                    />
                    <SmartInput
                        label="End Date"
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                    />
                </div>
                <div className="grid grid-cols-2 gap-2">
                    <SmartInput
                        label="Start Time *"
                        type="time"
                        required
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                    />
                    <SmartInput
                        label="End Time"
                        type="time"
                        value={endTime}
                        onChange={(e) => setEndTime(e.target.value)}
                    />
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <SmartTextarea
                    label="Venue address *"
                    value={venueAddress}
                    required
                    onChange={(e) => setVenueAddress(e.target.value)}
                    rows={2}
                    placeholder="Complete street address..."
                />
                <SmartInput
                    label="Maps link"
                    type="url"
                    value={venueLink}
                    onChange={(e) => setVenueLink(e.target.value)}
                    placeholder="Google Maps URL"
                />
            </div>
            <SmartInput
                label="Required documents"
                value={requiredDocuments}
                onChange={(e) => setRequiredDocuments(e.target.value)}
                placeholder="e.g. Resume, ID Proof, 10th Marks card"
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <SmartInput
                    label="Contact person"
                    value={contactPerson}
                    onChange={(e) => setContactPerson(e.target.value)}
                    placeholder="Name of SPOC"
                />
                <SmartInput
                    label="Contact phone"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    placeholder="Mobile number"
                />
            </div>
            </CardContent>
        </Card>
    );
}
