import { InformationCircleIcon } from '@heroicons/react/24/outline';
import { SmartSelect } from '@/features/admin/ui/SmartSelect';
import type { TimelineEvent } from '@/features/admin/opportunities/formUtils';

interface TimelineSectionProps {
    isEditMode: boolean;
    timelineEvents: TimelineEvent[];
    setTimelineEvents: React.Dispatch<React.SetStateAction<TimelineEvent[]>>;
    timelineLoading: boolean;
    timelineBusyId: string | null;
    newEventType: TimelineEvent['eventType'];
    setNewEventType: (val: TimelineEvent['eventType']) => void;
    newEventDate: string;
    setNewEventDate: (val: string) => void;
    newEventTitle: string;
    setNewEventTitle: (val: string) => void;
    newEventNotes: string;
    setNewEventNotes: (val: string) => void;
    newEventSourceLink: string;
    setNewEventSourceLink: (val: string) => void;
    handleCreateTimelineEvent: () => void;
    handleUpdateTimelineEvent: (event: TimelineEvent) => void;
    handleDeleteTimelineEvent: (id: string) => void;
}

export function TimelineSection({
    isEditMode,
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
}: TimelineSectionProps) {
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
                        <input
                            type="datetime-local"
                            value={newEventDate}
                            onChange={(e) => setNewEventDate(e.target.value)}
                            className="flex h-11 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
                        />
                        <input
                            value={newEventTitle}
                            onChange={(e) => setNewEventTitle(e.target.value)}
                            className="flex h-11 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 md:col-span-2"
                            placeholder="Event title"
                        />
                        <textarea
                            rows={2}
                            value={newEventNotes}
                            onChange={(e) => setNewEventNotes(e.target.value)}
                            className="flex min-h-16 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 md:col-span-2"
                            placeholder="Notes (optional)"
                        />
                        <input
                            value={newEventSourceLink}
                            onChange={(e) => setNewEventSourceLink(e.target.value)}
                            className="flex h-11 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 md:col-span-2"
                            placeholder="Source link (optional)"
                        />
                    </div>
                    <div className="flex justify-end">
                        <button
                            type="button"
                            onClick={handleCreateTimelineEvent}
                            disabled={timelineBusyId === 'new'}
                            className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground transition-all hover:bg-primary/90 disabled:opacity-60"
                        >
                            {timelineBusyId === 'new' ? 'Adding...' : 'Add event'}
                        </button>
                    </div>

                    <div className="space-y-3">
                        {timelineLoading ? (
                            <div className="text-sm text-muted-foreground">Loading timeline...</div>
                        ) : timelineEvents.length === 0 ? (
                            <div className="text-sm text-muted-foreground">No timeline events yet.</div>
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
                                    <input
                                        type="datetime-local"
                                        value={event.eventDate}
                                        onChange={(e) => setTimelineEvents((prev) => prev.map((item) => item.id === event.id ? { ...item, eventDate: e.target.value } : item))}
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
                                    />
                                    <input
                                        value={event.title}
                                        onChange={(e) => setTimelineEvents((prev) => prev.map((item) => item.id === event.id ? { ...item, title: e.target.value } : item))}
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 md:col-span-2"
                                    />
                                    <textarea
                                        rows={2}
                                        value={event.notes || ''}
                                        onChange={(e) => setTimelineEvents((prev) => prev.map((item) => item.id === event.id ? { ...item, notes: e.target.value } : item))}
                                        className="flex min-h-14 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 md:col-span-2"
                                        placeholder="Notes"
                                    />
                                    <input
                                        value={event.sourceLink || ''}
                                        onChange={(e) => setTimelineEvents((prev) => prev.map((item) => item.id === event.id ? { ...item, sourceLink: e.target.value } : item))}
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 md:col-span-2"
                                        placeholder="Source link"
                                    />
                                </div>
                                <div className="flex justify-end gap-2">
                                    <button
                                        type="button"
                                        onClick={() => handleDeleteTimelineEvent(event.id)}
                                        disabled={timelineBusyId === event.id}
                                        className="inline-flex h-9 items-center justify-center rounded-md border border-rose-300 bg-rose-50 px-3 text-sm font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-60"
                                    >
                                        Delete
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleUpdateTimelineEvent(event)}
                                        disabled={timelineBusyId === event.id}
                                        className="inline-flex h-9 items-center justify-center rounded-md border border-input bg-background px-3 text-sm font-semibold text-foreground hover:bg-accent disabled:opacity-60"
                                    >
                                        {timelineBusyId === event.id ? 'Saving...' : 'Save event'}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
