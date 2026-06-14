import { SmartSelect } from '@/features/admin/ui/SmartSelect';

interface TypeSelectionProps {
    type: 'JOB' | 'INTERNSHIP' | 'WALKIN' | 'GOVERNMENT';
    setType: (type: 'JOB' | 'INTERNSHIP' | 'WALKIN' | 'GOVERNMENT') => void;
}

export function TypeSelection({ type, setType }: TypeSelectionProps) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col justify-center">
                <SmartSelect
                    label="Opportunity Type"
                    value={type}
                    onChange={(val) => setType(val as 'JOB' | 'INTERNSHIP' | 'WALKIN' | 'GOVERNMENT')}
                    options={[
                        { label: 'JOB - Direct apply', value: 'JOB' },
                        { label: 'INTERNSHIP - Direct apply', value: 'INTERNSHIP' },
                        { label: 'WALKIN - In-person', value: 'WALKIN' },
                        { label: 'GOVERNMENT', value: 'GOVERNMENT' },
                    ]}
                />
            </div>
        </div>
    );
}
