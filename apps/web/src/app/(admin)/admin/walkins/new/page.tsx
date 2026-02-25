import { redirect } from 'next/navigation';

export default function AdminWalkinsNewRedirect() {
    redirect('/opportunities/create?type=walk-in');
}
