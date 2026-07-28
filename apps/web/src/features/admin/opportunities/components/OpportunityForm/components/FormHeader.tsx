interface FormHeaderProps {
    isEditMode: boolean;
    showParser: boolean;
    setShowParser: (show: boolean) => void;
    isGovernmentJob?: boolean;
    setIsGovernmentJob?: (value: boolean) => void;
}

export function FormHeader({ 
    isEditMode, 
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
                        
                </div>
            </div>
        </div>
    );
}
