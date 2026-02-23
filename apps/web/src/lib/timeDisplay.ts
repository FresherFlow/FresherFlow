function to12HourPart(value: string): string {
    const normalized = value.trim().replace(/\./g, ':').replace(/\s+/g, ' ');
    const match = normalized.match(/^(\d{1,2})(?::([0-5]\d))?\s*([AaPp][Mm])?$/);
    if (!match) return value.trim();

    const rawHour = Number(match[1]);
    const rawMinute = match[2] ?? '00';
    const ampm = match[3]?.toUpperCase();

    if (ampm) {
        const hour = rawHour % 12 || 12;
        return `${hour}:${rawMinute} ${ampm}`;
    }

    if (rawHour > 23) return value.trim();
    const hour12 = rawHour % 12 || 12;
    const suffix = rawHour >= 12 ? 'PM' : 'AM';
    return `${hour12}:${rawMinute} ${suffix}`;
}

export function formatTimeText12Hour(input?: string | null): string {
    if (!input) return '';
    const trimmed = input.trim();
    if (!trimmed) return '';

    const rangeMatch = trimmed.match(/^(.*?)(?:\s*(?:-|–|to)\s*)(.*?)$/i);
    if (!rangeMatch) {
        return to12HourPart(trimmed);
    }

    const start = to12HourPart(rangeMatch[1]);
    const end = to12HourPart(rangeMatch[2]);
    return `${start} - ${end}`;
}
