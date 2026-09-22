import type { Metadata } from 'next';
import FeedbackClient from './FeedbackClient';

export const metadata: Metadata = { title: { absolute: 'Feedback | FresherFlow Admin' } };

export default function Page() {
    return <FeedbackClient />;
}
