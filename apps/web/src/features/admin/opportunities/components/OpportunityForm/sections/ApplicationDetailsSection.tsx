import { useState } from 'react';
import { ClipboardDocumentCheckIcon, PlusIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { SmartSelect } from '@/features/admin/ui/SmartSelect';
import { SmartInput } from '@/features/admin/ui/SmartInput';
import { Card, CardDescription, CardContent } from '@/ui/Card';
import { Badge } from '@/ui/Badge';
import { Button } from '@/ui/Button';
import type { OpportunityFormApi } from '@/features/admin/opportunities/useOpportunityForm';

export function ApplicationDetailsSection({ form }: { form: OpportunityFormApi }) {
    const {
        appMethod, setAppMethod,
        appPlatform, setAppPlatform,
        appDuration, setAppDuration,
        appRequiredItems, setAppRequiredItems,
    } = form;
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
        <Card>
            <div className="p-4 md:p-5 pb-3 space-y-1">
                <h3 className="flex items-center gap-2 text-sm md:text-base font-semibold text-foreground">
                    <ClipboardDocumentCheckIcon className="w-4 h-4 text-muted-foreground" />
                    How to apply
                </h3>
                <CardDescription>
                    Direct redirect or a multi-step process candidates must follow.
                </CardDescription>
            </div>
            <CardContent className="space-y-5 px-4 md:px-5 pb-4 md:pb-5">
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

                <SmartInput
                    label="Platform"
                    disabled={!isPlatformEnabled}
                    value={appPlatform}
                    onChange={(e) => setAppPlatform(e.target.value)}
                    placeholder={isPlatformEnabled ? 'e.g. HackerRank, Google Forms' : 'Enabled for FORM / ASSESSMENT'}
                    helpText={!isPlatformEnabled ? 'Enabled for FORM / ASSESSMENT.' : undefined}
                />

                <SmartInput
                    label="Duration (mins)"
                    type="number"
                    disabled={!isPlatformEnabled}
                    value={appDuration}
                    onChange={(e) => setAppDuration(e.target.value)}
                    placeholder={isPlatformEnabled ? 'e.g. 60' : 'Enabled for FORM / ASSESSMENT'}
                    helpText={!isPlatformEnabled ? 'Enabled for FORM / ASSESSMENT.' : undefined}
                />
            </div>

            {isPlatformEnabled && (
                <div className="space-y-3 pt-2">
                    <label className="text-sm font-medium text-muted-foreground/80 block">
                        {appMethod === 'ASSESSMENT' ? 'Assessment Topics / Syllabus' : 'Required Preparation Items'}
                    </label>
                    <div className="flex gap-2">
                        <SmartInput
                            aria-label={appMethod === 'ASSESSMENT' ? 'Add topic' : 'Add item'}
                            containerClassName="flex-1"
                            value={newItem}
                            onChange={(e) => setNewItem(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder={appMethod === 'ASSESSMENT' ? 'Add topic (e.g. SQL, Python, A/B Testing)' : 'Add item (e.g. Resume, GitHub Profile)'}
                        />
                        <Button
                            type="button"
                            size="sm"
                            onClick={handleAddItem}
                            className="h-11 shrink-0"
                        >
                            <PlusIcon className="w-4 h-4 mr-1.5" />
                            Add
                        </Button>
                    </div>

                    {appRequiredItems.length > 0 && (
                        <div className="flex flex-wrap gap-2 pt-1">
                            {appRequiredItems.map((item, idx) => (
                                <Badge
                                    key={idx}
                                    variant="default"
                                    className="gap-1 px-3 py-1 normal-case tracking-normal"
                                >
                                    {item}
                                    <button
                                        type="button"
                                        onClick={() => handleRemoveItem(idx)}
                                        aria-label={`Remove ${item}`}
                                        className="flex items-center rounded-full p-0.5 transition-colors hover:bg-primary-foreground/20"
                                    >
                                        <XMarkIcon className="w-3.5 h-3.5" />
                                    </button>
                                </Badge>
                            ))}
                        </div>
                    )}
                </div>
            )}
            </CardContent>
        </Card>
    );
}
