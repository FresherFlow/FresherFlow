import { redirect } from 'next/navigation';

export default function AdminJobsRedirect() {
    redirect('/opportunities?type=job');
}
