import { ClockIcon } from '@heroicons/react/24/outline';
import XMarkIcon from '@heroicons/react/20/solid/XMarkIcon';
import { SmartInput } from '@/features/admin/ui/SmartInput';
import { Card, CardDescription, CardContent } from '@/ui/Card';
import { Button } from '@/ui/Button';
import type { OpportunityFormApi } from '@/features/admin/opportunities/useOpportunityForm';

export function ExpirationSection({ form }: { form: OpportunityFormApi }) {
    const {
        expiryDate, setExpiryDate,
        expiryTime, setExpiryTime,
        onToggleAmPm
    } = form;
    const handleClear = () => {
        setExpiryDate('');
        setExpiryTime('');
    };

    return (
        <Card>
            <div className="p-4 md:p-5 pb-3 space-y-1">
                <h3 className="flex items-center gap-2 text-sm md:text-base font-semibold text-foreground">
                    <ClockIcon className="w-4 h-4 text-muted-foreground" />
                    Expiration
                </h3>
                <CardDescription>
                    When the listing stops accepting applications.
                </CardDescription>
            </div>
            <CardContent className="space-y-4 px-4 md:px-5 pb-4 md:pb-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex items-start gap-2">
                    <SmartInput
                        containerClassName="flex-1"
                        label="Date (optional)"
                        type="date"
                        value={expiryDate}
                        onChange={(e) => setExpiryDate(e.target.value)}
                        min={new Date().toISOString().split('T')[0]}
                    />
                    {expiryDate && (
                        <div className="mt-6 flex">
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={handleClear}
                                aria-label="Clear expiry date"
                            >
                                <XMarkIcon className="w-5 h-5" />
                            </Button>
                        </div>
                    )}
                </div>

                <SmartInput
                    label="Time (default 23:59)"
                    type="time"
                    value={expiryTime}
                    onChange={(e) => setExpiryTime(e.target.value)}
                />
            </div>

            {/* AM/PM quick set — only shown when a date is selected */}
            {expiryDate && (
                <div className="flex items-center gap-2 pt-1">
                    <span className="text-sm font-medium text-muted-foreground">Quick set:</span>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => onToggleAmPm('AM')}
                    >
                        Force AM
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => onToggleAmPm('PM')}
                    >
                        Force PM
                    </Button>
                </div>
            )}
            </CardContent>
        </Card>
    );
}
