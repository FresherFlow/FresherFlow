import { permanentRedirect } from 'next/navigation';

/**
 * Walk-ins moved under the Drives hub so every fresher-facing drive lives at one
 * top-level path: /drives, /drives/off-campus, /drives/walk-in.
 *
 * 308 keeps the link equity and search signals on the old URL rather than
 * soft-404ing a page that has been indexed.
 */
export default function LegacyWalkInsPage() {
    permanentRedirect('/drives');
}
