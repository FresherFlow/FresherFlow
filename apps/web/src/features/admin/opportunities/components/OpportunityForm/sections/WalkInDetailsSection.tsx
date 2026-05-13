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
        <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-4 md:p-5 space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-amber-700 dark:text-amber-400 capitalize tracking-wider">Drive dates *</label>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                        <input
                            type="date"
                            required
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="flex h-11 w-full rounded-md border border-amber-500/30 bg-background px-3 text-sm focus-visible:outline-none focus:ring-2 focus:ring-amber-500/50"
                        />
                        <span className="text-amber-700/50 text-center text-xs font-bold">{">>"}</span>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="flex h-11 w-full rounded-md border border-amber-500/30 bg-background px-3 text-sm focus-visible:outline-none focus:ring-2 focus:ring-amber-500/50"
                        />
                    </div>
                </div>
                <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-amber-700 dark:text-amber-400 capitalize tracking-wider">Reporting window *</label>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                        <input
                            type="time"
                            required
                            value={startTime}
                            onChange={(e) => setStartTime(e.target.value)}
                            className="flex h-11 w-full rounded-md border border-amber-500/30 bg-background px-3 text-sm focus-visible:outline-none focus:ring-2 focus:ring-amber-500/50"
                        />
                        <span className="text-amber-700/50 text-center text-xs font-bold">{">>"}</span>
                        <input
                            type="time"
                            value={endTime}
                            onChange={(e) => setEndTime(e.target.value)}
                            className="flex h-11 w-full rounded-md border border-amber-500/30 bg-background px-3 text-sm focus-visible:outline-none focus:ring-2 focus:ring-amber-500/50"
                        />
                    </div>
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-amber-700 dark:text-amber-400 capitalize tracking-wider">Venue address *</label>
                    <textarea
                        required
                        value={venueAddress}
                        onChange={(e) => setVenueAddress(e.target.value)}
                        rows={2}
                        className="flex min-h-15 w-full rounded-md border border-amber-500/30 bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus:ring-2 focus:ring-amber-500/50 resize-none transition-all"
                        placeholder="Complete street address..."
                    />
                </div>
                <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-amber-700 dark:text-amber-400 capitalize tracking-wider">Maps link</label>
                    <input
                        type="url"
                        value={venueLink}
                        onChange={(e) => setVenueLink(e.target.value)}
                        className="flex h-11 w-full rounded-md border border-amber-500/30 bg-background px-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus:ring-2 focus:ring-amber-500/50 transition-all"
                        placeholder="Google Maps URL"
                    />
                </div>
            </div>
            <div className="space-y-1.5">
                <label className="text-xs font-semibold text-amber-700 dark:text-amber-400 capitalize tracking-wider">Required documents</label>
                <input
                    value={requiredDocuments}
                    onChange={(e) => setRequiredDocuments(e.target.value)}
                    className="flex h-11 w-full rounded-md border border-amber-500/30 bg-background px-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus:ring-2 focus:ring-amber-500/50 transition-all"
                    placeholder="e.g. Resume, ID Proof, 10th Marks card"
                />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-amber-700 dark:text-amber-400 capitalize tracking-wider">Contact person</label>
                    <input
                        value={contactPerson}
                        onChange={(e) => setContactPerson(e.target.value)}
                        className="flex h-11 w-full rounded-md border border-amber-500/30 bg-background px-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus:ring-2 focus:ring-amber-500/50 transition-all"
                        placeholder="Name of SPOC"
                    />
                </div>
                <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-amber-700 dark:text-amber-400 capitalize tracking-wider">Contact phone</label>
                    <input
                        value={contactPhone}
                        onChange={(e) => setContactPhone(e.target.value)}
                        className="flex h-11 w-full rounded-md border border-amber-500/30 bg-background px-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus:ring-2 focus:ring-amber-500/50 transition-all"
                        placeholder="Mobile number"
                    />
                </div>
            </div>
        </div>
    );
}
