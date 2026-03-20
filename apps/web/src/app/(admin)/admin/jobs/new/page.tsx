import { redirect } from 'next/navigation';

export default function AdminJobsNewRedirect() {
    redirect('/opportunities/create?type=job');
}






