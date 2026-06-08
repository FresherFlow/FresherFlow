import { BoltIcon } from '@heroicons/react/24/outline';

interface FormHeaderProps {
    isEditMode: boolean;
    showParser: boolean;
    setShowParser: (show: boolean) => void;
    isGovernmentJob?: boolean;
    setIsGovernmentJob?: (value: boolean) => void;
}

export function FormHeader({ 
    isEditMode, 
    showParser, 
    setShowParser,
}: FormHeaderProps) {
    return (
        <div className="space-y-3">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div>
                    <h1 className="text-xl md:text-2xl font-semibold tracking-tight text-foreground">
                        {isEditMode ? 'Edit listing' : 'New listing'}
                    </h1>
                    <p className="text-xs md:text-sm text-muted-foreground mt-0.5 hidden md:block">
                        {isEditMode ? 'Update and republish a verified listing.' : 'Create and publish a verified listing.'}
                    </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                        <button
                            type="button"
                            onClick={() => setShowParser(!showParser)}
                            className="hidden md:inline-flex items-center justify-center h-10 px-4 rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm md:w-auto"
                        >
                            <BoltIcon className="w-4 h-4 mr-2" />
                            Auto-fill text
                        </button>
                </div>
            </div>
        </div>
    );
}
