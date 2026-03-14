// removed unused Opportunity import
import { Button } from '@/components/ui/Button';
import { formatLpaValue } from '../detailUtils';
import { DriveMetadata, DriveSalaryRow } from '@/shared/utils/driveTimeline';

interface DetailCampusDriveInfoProps {
    driveMeta: DriveMetadata;
    hasApplyLink: boolean;
    handleApply: () => void;
}

export function DetailCampusDriveInfo({ driveMeta, hasApplyLink, handleApply }: DetailCampusDriveInfoProps) {
    // Component used for campus drive logic cleanup

    return (
        <div className="space-y-3 md:space-y-4">
            {driveMeta.isTcsNqt && (
                <div className="bg-card p-4 md:p-5 rounded-xl border border-border shadow-sm space-y-4">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground pb-2">About the Drive</h3>
                    <ul className="space-y-1.5 text-sm md:text-base text-foreground/90 font-medium">
                        {driveMeta.overviewPoints.map((point: string) => (
                            <li key={point} className="flex items-start gap-2">
                                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary" />
                                <span>{point}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {driveMeta.salaryRows.length > 0 && (
                <div className="bg-card p-4 md:p-5 rounded-xl border border-border shadow-sm space-y-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground pb-2">Salary Breakdown</h3>
                    <div className="hidden md:block overflow-x-auto">
                        <table className="w-full min-w-130 text-sm">
                            <thead>
                                <tr className="text-muted-foreground uppercase tracking-wider">
                                    <th className="text-left py-2">Cadre</th>
                                    <th className="text-left py-2">Experience</th>
                                    <th className="text-left py-2">UG CTC (LPA)</th>
                                    <th className="text-left py-2">PG CTC (LPA)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {driveMeta.salaryRows.map((row: DriveSalaryRow) => (
                                    <tr key={`${row.cadre}-${row.experience}`} className="border-t border-border/60 text-foreground font-medium">
                                        <td className="py-2">{row.cadre}</td>
                                        <td className="py-2">{row.experience}</td>
                                        <td className="py-2">{formatLpaValue(row.ug)}</td>
                                        <td className="py-2">{formatLpaValue(row.pg)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="grid grid-cols-1 gap-2 md:hidden">
                        {(['Prime', 'Digital'] as const).map((cadre) => {
                            const rows = driveMeta.salaryRows.filter((row: DriveSalaryRow) => row.cadre === cadre);
                            if (rows.length === 0) return null;
                            return (
                                <div key={cadre} className="rounded-lg border border-border bg-muted/20 px-3 py-2.5">
                                    <p className="text-xs md:text-sm font-bold text-primary uppercase tracking-wider">{cadre} Cadre</p>
                                    <div className="mt-2 space-y-1.5">
                                        {rows.map((row: DriveSalaryRow) => (
                                            <div key={`${row.cadre}-${row.experience}`} className="rounded-md border border-border/70 bg-background/30 px-2 py-1.5">
                                                <p className="text-xs md:text-sm font-bold text-muted-foreground uppercase">{row.experience}</p>
                                                <div className="mt-0.5 flex items-center justify-between gap-2 text-sm font-semibold text-foreground">
                                                    <span>UG: {formatLpaValue(row.ug)}</span>
                                                    <span>PG: {formatLpaValue(row.pg)}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    <p className="text-sm text-muted-foreground">{driveMeta.salaryNote}</p>
                </div>
            )}

            {driveMeta.selectionSteps.length > 0 && (
                <div className="bg-card p-4 md:p-5 rounded-xl border border-border shadow-sm space-y-3">
                    <h3 className="text-xs md:text-sm font-bold uppercase tracking-wider text-muted-foreground pb-2">Selection Process</h3>
                    <div className="flex flex-wrap items-center gap-2">
                        {driveMeta.selectionSteps.map((step: string, index: number) => (
                            <span key={step} className="inline-flex items-center rounded-md border border-border bg-muted/20 px-2.5 py-1.5 text-[12px] font-semibold text-foreground">
                                {index + 1}. {step}
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {driveMeta.applySteps.length > 0 && (
                <div className="bg-card p-4 md:p-5 rounded-xl border border-border shadow-sm space-y-3">
                    <h3 className="text-xs md:text-sm font-bold uppercase tracking-wider text-muted-foreground pb-2">How to Apply</h3>
                    <ol className="space-y-2 text-sm text-foreground/90 font-medium list-decimal pl-5">
                        {driveMeta.applySteps.map((step: string) => (
                            <li key={step}>{step}</li>
                        ))}
                    </ol>
                    {hasApplyLink && (
                        <Button
                            onClick={handleApply}
                            className="w-full md:w-auto h-10 text-xs bg-primary/80 text-primary-foreground border border-primary/60 hover:bg-primary rounded-lg font-bold uppercase tracking-widest"
                        >
                            Apply on Official Website
                        </Button>
                    )}
                </div>
            )}
        </div>
    );
}
