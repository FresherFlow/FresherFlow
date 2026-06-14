import { SmartInput } from '@/features/admin/ui/SmartInput';
import { SmartTextarea } from '@/features/admin/ui/SmartTextarea';

interface WalkInDetailsSectionProps {
    startDate: string;
    setStartDate: (val: string) => void;
    endDate: string;
    setEndDate: (val: string) => void;
    startTime: string;
    setStartTime: (val: string) => void;
    endTime: string;
    setEndTime: (val: string) => void;
    venueAddress: string;
    setVenueAddress: (val: string) => void;
    venueLink: string;
    setVenueLink: (val: string) => void;
    requiredDocuments: string;
    setRequiredDocuments: (val: string) => void;
    contactPerson: string;
    setContactPerson: (val: string) => void;
    contactPhone: string;
    setContactPhone: (val: string) => void;
}

export function WalkInDetailsSection({
    startDate, setStartDate,
    endDate, setEndDate,
    startTime, setStartTime,
    endTime, setEndTime,
    venueAddress, setVenueAddress,
    venueLink, setVenueLink,
    requiredDocuments, setRequiredDocuments,
    contactPerson, setContactPerson,
    contactPhone, setContactPhone
}: WalkInDetailsSectionProps) {
    return (
        <div className="space-y-5 border border-border rounded-lg p-4 md:p-5 bg-card shadow-sm">
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
        </div>
    );
}
