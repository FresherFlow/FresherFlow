import { redirect } from 'next/navigation';

interface PageProps {
    params: { id: string };
}

export default function AdminWalkinsEditRedirect({ params }: PageProps) {
    redirect(`/opportunities/edit/${params.id}`);
}
