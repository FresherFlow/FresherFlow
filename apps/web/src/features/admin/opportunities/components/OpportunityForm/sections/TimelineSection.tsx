import { InformationCircleIcon } from '@heroicons/react/24/outline';
import { SmartSelect } from '@/features/admin/ui/SmartSelect';
import { Input } from '@/ui/Input';
import { Textarea } from '@/ui/Textarea';
import { Button } from '@/ui/Button';
import { EmptyState } from '@/ui/EmptyState';
import { Skeleton } from '@/ui/Skeleton';
import type { TimelineEvent } from '@/features/admin/opportunities/formUtils';
import type { OpportunityFormApi } from '@/features/admin/opportunities/useOpportunityForm';

export function TimelineSection({
    form,
    isEditMode,
}: {
    form: OpportunityFormApi;
    isEditMode: boolean;
}) {
    const {
        timelineEvents, setTimelineEvents,
        timelineLoading,
        timelineBusyId,
        newEventType, setNewEventType,
        newEventDate, setNewEventDate,
        newEventTitle, setNewEventTitle,
        newEventNotes, setNewEventNotes,
        newEventSourceLink, setNewEventSourceLink,
        handleCreateTimelineEvent,
        handleUpdateTimelineEvent,
        handleDeleteTimelineEvent
    } = form;
    return (
        <div className="space-y-5 md:space-y-6 border border-border rounded-lg p-4 md:p-5 bg-card shadow-sm">
            <h3 className="text-sm md:text-base font-semibold text-foreground flex items-center gap-2">
                <InformationCircleIcon className="w-4 h-4 text-muted-foreground" />
                Drive timeline events
            </h3>
            {!isEditMode ? (
                <p className="text-sm text-muted-foreground">
                    Publish this listing first, then add timeline milestones like registration dates, exam, result, and interview.
                </p>
            ) : (
                <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <SmartSelect
                            value={newEventType}
                            onChange={(val) => setNewEventType(val as TimelineEvent['eventType'])}
                            containerClassName="w-full"
                            options={[
                                { label: 'Notification', value: 'NOTIFICATION' },
                                { label: 'Registration Start', value: 'REG_START' },
                                { label: 'Registration End', value: 'REG_END' },
                                { label: 'Exam Date', value: 'EXAM_DATE' },
                                { label: 'Result', value: 'RESULT' },
                                { label: 'Interview', value: 'INTERVIEW' },
                                { label: 'Document Verification', value: 'DOC_VERIFICATION' },
                                { label: 'Other', value: 'OTHER' },
                            ]}
                        />
                        <Input
                            type="datetime-local"
                            value={newEventDate}
                            onChange={(e) => setNewEventDate(e.target.value)}
                            aria-label="Event date"
                        />
                        <Input
                            value={newEventTitle}
                            onChange={(e) => setNewEventTitle(e.target.value)}
                            className="md:col-span-2"
                            placeholder="Event title"
                            aria-label="Event title"
                        />
                        <Textarea
                            rows={2}
                            value={newEventNotes}
                            onChange={(e) => setNewEventNotes(e.target.value)}
                            className="md:col-span-2"
                            placeholder="Notes (optional)"
                            aria-label="Event notes"
                        />
                        <Input
                            value={newEventSourceLink}
                            onChange={(e) => setNewEventSourceLink(e.target.value)}
                            className="md:col-span-2"
                            placeholder="Source link (optional)"
                            aria-label="Event source link"
                        />
                    </div>
                    <div className="flex justify-end">
                        <Button
                            type="button"
                            onClick={() => void handleCreateTimelineEvent()}
                            disabled={timelineBusyId === 'new'}
                        >
                            {timelineBusyId === 'new' ? 'Adding...' : 'Add event'}
                        </Button>
                    </div>

                    <div className="space-y-3">
                        {timelineLoading ? (
                            <div className="space-y-2" aria-hidden="true">
                                <Skeleton className="h-3 w-full" />
                                <Skeleton className="h-3 w-4/5" />
                                <Skeleton className="h-3 w-3/5" />
                            </div>
                        ) : timelineEvents.length === 0 ? (
                            <EmptyState
                                title="No timeline events yet"
                                description="Add registration, exam, or result milestones for this drive."
                                icon="inbox"
                                size="md"
                                variant="ghost"
                            />
                        ) : timelineEvents.map((event) => (
                            <div key={event.id} className="border border-border rounded-md p-3 space-y-2">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                    <SmartSelect
                                        value={event.eventType}
                                        onChange={(val) => setTimelineEvents((prev) => prev.map((item) => item.id === event.id ? { ...item, eventType: val as TimelineEvent['eventType'] } : item))}
                                        containerClassName="w-full"
                                        options={[
                                            { label: 'Notification', value: 'NOTIFICATION' },
                                            { label: 'Registration Start', value: 'REG_START' },
                                            { label: 'Registration End', value: 'REG_END' },
                                            { label: 'Exam Date', value: 'EXAM_DATE' },
                                            { label: 'Result', value: 'RESULT' },
                                            { label: 'Interview', value: 'INTERVIEW' },
                                            { label: 'Document Verification', value: 'DOC_VERIFICATION' },
                                            { label: 'Other', value: 'OTHER' },
                                        ]}
                                    />
                                    <Input
                                        type="datetime-local"
                                        value={event.eventDate}
                                        onChange={(e) => setTimelineEvents((prev) => prev.map((item) => item.id === event.id ? { ...item, eventDate: e.target.value } : item))}
                                        aria-label="Event date"
                                    />
                                    <Input
                                        value={event.title}
                                        onChange={(e) => setTimelineEvents((prev) => prev.map((item) => item.id === event.id ? { ...item, title: e.target.value } : item))}
                                        className="md:col-span-2"
                                        aria-label="Event title"
                                    />
                                    <Textarea
                                        rows={2}
                                        value={event.notes || ''}
                                        onChange={(e) => setTimelineEvents((prev) => prev.map((item) => item.id === event.id ? { ...item, notes: e.target.value } : item))}
                                        className="md:col-span-2"
                                        placeholder="Notes"
                                        aria-label="Event notes"
                                    />
                                    <Input
                                        value={event.sourceLink || ''}
                                        onChange={(e) => setTimelineEvents((prev) => prev.map((item) => item.id === event.id ? { ...item, sourceLink: e.target.value } : item))}
                                        className="md:col-span-2"
                                        placeholder="Source link"
                                        aria-label="Event source link"
                                    />
                                </div>
                                <div className="flex justify-end gap-2">
                                    <Button
                                        type="button"
                                        variant="destructive"
                                        size="sm"
                                        onClick={() => void handleDeleteTimelineEvent(event.id)}
                                        disabled={timelineBusyId === event.id}
                                    >
                                        Delete
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => void handleUpdateTimelineEvent(event)}
                                        disabled={timelineBusyId === event.id}
                                    >
                                        {timelineBusyId === event.id ? 'Saving...' : 'Save event'}
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
