import { redirect } from 'next/navigation';

export default function AdminWalkinsRedirect() {
    redirect('/opportunities?type=walk-in');
}
