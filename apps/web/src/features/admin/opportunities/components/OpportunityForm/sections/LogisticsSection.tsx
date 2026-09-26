import { MapPinIcon } from '@heroicons/react/24/outline';
import { SmartInput } from '@/features/admin/ui/SmartInput';
import { Card, CardDescription, CardContent } from '@/ui/Card';
import { Tabs, TabsList, TabsTrigger } from '@/ui/Tabs';
import { Button } from '@/ui/Button';
import { INDIAN_CITIES } from '@fresherflow/constants';
import type { OpportunityFormApi } from '@/features/admin/opportunities/useOpportunityForm';

export function LogisticsSection({
    form,
    handleQuickLocation,
}: {
    form: OpportunityFormApi;
    handleQuickLocation: (loc: string) => void;
}) {
    const {
        type,
        locations, setLocations,
        workMode, setWorkMode
    } = form;
    return (
        <Card>
            <div className="p-4 md:p-5 pb-3 space-y-1">
                <h3 className="flex items-center gap-2 text-sm md:text-base font-semibold text-foreground">
                    <MapPinIcon className="w-4 h-4 text-muted-foreground" />
                    Logistics
                </h3>
                <CardDescription>
                    Where and how the work happens.
                </CardDescription>
            </div>
            <CardContent className="space-y-5 px-4 md:px-5 pb-4 md:pb-5">
            <SmartInput
                label="Locations"
                value={locations}
                onChange={(e) => setLocations(e.target.value)}
                placeholder="Mumbai, Bangalore, Remote"
                helpText={
                    <div className="flex flex-wrap gap-1.5 pt-1.5">
                        {['Pan India', ...INDIAN_CITIES.slice(0, 5), 'Remote'].map(loc => (
                            <Button
                                key={loc}
                                type="button"
                                variant="outline"
                                onClick={() => handleQuickLocation(loc)}
                                className="h-7 rounded-md px-2.5 text-xs font-semibold"
                            >
                                + {loc}
                            </Button>
                        ))}
                    </div>
                }
            />

            {type !== 'WALKIN' && (
                <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground/80 flex items-center gap-1.5">Work mode</label>
                    <Tabs value={workMode} onValueChange={(v) => setWorkMode(v as 'ONSITE' | 'HYBRID' | 'REMOTE')}>
                        <TabsList className="grid w-full grid-cols-3">
                            <TabsTrigger value="ONSITE">On-site</TabsTrigger>
                            <TabsTrigger value="HYBRID">Hybrid</TabsTrigger>
                            <TabsTrigger value="REMOTE">Remote</TabsTrigger>
                        </TabsList>
                    </Tabs>
                </div>
            )}
            </CardContent>
        </Card>
    );
}
