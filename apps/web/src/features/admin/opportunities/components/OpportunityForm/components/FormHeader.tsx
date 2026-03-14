import Link from 'next/link';
import { ArrowLeftIcon, BoltIcon } from '@heroicons/react/24/outline';

interface FormHeaderProps {
    isEditMode: boolean;
    showParser: boolean;
    setShowParser: (show: boolean) => void;
}

export function FormHeader({ isEditMode, showParser, setShowParser }: FormHeaderProps) {
    return (
        <div className="space-y-3">
            <Link href="/opportunities" className="inline-flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">
                <ArrowLeftIcon className="w-3.5 h-3.5" />
                Back to listings
            </Link>
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div>
                    <h1 className="text-xl md:text-2xl font-semibold tracking-tight text-foreground">
                        {isEditMode ? 'Edit listing' : 'New listing'}
                    </h1>
                    <p className="text-xs md:text-sm text-muted-foreground mt-0.5">
                        {isEditMode ? 'Update and republish a verified listing.' : 'Create and publish a verified listing.'}
                    </p>
                </div>
                {!isEditMode && (
                    <button
                        type="button"
                        onClick={() => setShowParser(!showParser)}
                        className="inline-flex items-center justify-center h-10 px-4 rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm w-full md:w-auto"
                    >
                        <BoltIcon className="w-4 h-4 mr-2" />
                        Auto-fill text
                    </button>
                )}
            </div>
        </div>
    );
}
