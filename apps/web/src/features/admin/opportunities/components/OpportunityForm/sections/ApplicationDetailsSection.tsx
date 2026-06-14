import { useState } from 'react';
import { ClipboardDocumentCheckIcon, PlusIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { SmartSelect } from '@/features/admin/ui/SmartSelect';

interface ApplicationDetailsSectionProps {
    appMethod: 'DIRECT' | 'FORM' | 'ASSESSMENT';
    setAppMethod: (val: 'DIRECT' | 'FORM' | 'ASSESSMENT') => void;
    appPlatform: string;
    setAppPlatform: (val: string) => void;
    appDuration: string;
    setAppDuration: (val: string) => void;
    appRequiredItems: string[];
    setAppRequiredItems: (val: string[]) => void;
}

export function ApplicationDetailsSection({
    appMethod, setAppMethod,
    appPlatform, setAppPlatform,
    appDuration, setAppDuration,
    appRequiredItems, setAppRequiredItems,
}: ApplicationDetailsSectionProps) {
    const [newItem, setNewItem] = useState('');

    const handleAddItem = () => {
        const trimmed = newItem.trim();
        if (trimmed && !appRequiredItems.includes(trimmed)) {
            setAppRequiredItems([...appRequiredItems, trimmed]);
            setNewItem('');
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleAddItem();
        }
    };

    const handleRemoveItem = (indexToRemove: number) => {
        setAppRequiredItems(appRequiredItems.filter((_, idx) => idx !== indexToRemove));
    };

    const isPlatformEnabled = appMethod === 'FORM' || appMethod === 'ASSESSMENT';

    return (
        <div className="space-y-5 md:space-y-6 border border-border rounded-lg p-4 md:p-5 bg-card shadow-sm">
            <h3 className="text-sm md:text-base font-semibold text-foreground flex items-center gap-2">
                <ClipboardDocumentCheckIcon className="w-4 h-4 text-muted-foreground" />
                Application Complexity Details
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div className="space-y-1.5">
                    <SmartSelect
                        label="Application Method"
                        value={appMethod}
                        onChange={(val) => {
                            const method = val as 'DIRECT' | 'FORM' | 'ASSESSMENT';
                            setAppMethod(method);
                            if (method === 'DIRECT') {
                                setAppPlatform('');
                                setAppDuration('');
                                setAppRequiredItems([]);
                            }
                        }}
                        options={[
                            { label: 'DIRECT (Direct redirect - default)', value: 'DIRECT' },
                            { label: 'FORM (Portal or external Form)', value: 'FORM' },
                            { label: 'ASSESSMENT (External hiring test platform)', value: 'ASSESSMENT' },
                        ]}
                    />
                </div>

                <div className="space-y-1.5">
                    <label className="text-sm font-medium text-muted-foreground/80 flex items-center gap-1.5">
                        Platform {!isPlatformEnabled && <span className="text-muted-foreground/50 text-xs">(Disabled)</span>}
                    </label>
                    <input
                        type="text"
                        disabled={!isPlatformEnabled}
                        value={appPlatform}
                        onChange={(e) => setAppPlatform(e.target.value)}
                        placeholder={isPlatformEnabled ? 'e.g. HackerRank, Google Forms' : 'Enabled for FORM / ASSESSMENT'}
                        className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary transition-all shadow-sm disabled:opacity-50 disabled:bg-muted"
                    />
                </div>

                <div className="space-y-1.5">
                    <label className="text-sm font-medium text-muted-foreground/80 flex items-center gap-1.5">
                        Duration (Mins) {!isPlatformEnabled && <span className="text-muted-foreground/50 text-xs">(Disabled)</span>}
                    </label>
                    <input
                        type="number"
                        disabled={!isPlatformEnabled}
                        min="1"
                        value={appDuration}
                        onChange={(e) => setAppDuration(e.target.value)}
                        placeholder={isPlatformEnabled ? 'e.g. 60' : 'Enabled for FORM / ASSESSMENT'}
                        className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary transition-all shadow-sm disabled:opacity-50 disabled:bg-muted"
                    />
                </div>
            </div>

            {isPlatformEnabled && (
                <div className="space-y-3 pt-2">
                    <label className="text-sm font-medium text-muted-foreground/80 block">
                        {appMethod === 'ASSESSMENT' ? 'Assessment Topics / Syllabus' : 'Required Preparation Items'}
                    </label>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={newItem}
                            onChange={(e) => setNewItem(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder={appMethod === 'ASSESSMENT' ? 'Add topic (e.g. SQL, Python, A/B Testing)' : 'Add item (e.g. Resume, GitHub Profile)'}
                            className="flex h-11 flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary transition-all shadow-sm"
                        />
                        <button
                            type="button"
                            onClick={handleAddItem}
                            className="h-11 px-4 rounded-md bg-primary text-primary-foreground hover:bg-primary/95 flex items-center justify-center font-medium shadow-sm transition-colors"
                        >
                            <PlusIcon className="w-4 h-4 mr-1.5" />
                            Add
                        </button>
                    </div>

                    {appRequiredItems.length > 0 && (
                        <div className="flex flex-wrap gap-2 pt-1">
                            {appRequiredItems.map((item, idx) => (
                                <span
                                    key={idx}
                                    className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/25 shadow-sm"
                                >
                                    {item}
                                    <button
                                        type="button"
                                        onClick={() => handleRemoveItem(idx)}
                                        className="hover:bg-primary/20 rounded-full p-0.5 transition-colors ml-0.5"
                                    >
                                        <XMarkIcon className="w-3.5 h-3.5" />
                                    </button>
                                </span>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
