import React from 'react';

export interface DataTableProps {
    headers: string[];
    data: React.ReactNode[][];
    className?: string;
}

export function DataTable({ headers, data, className = '' }: DataTableProps) {
    if (!data || data.length === 0) {
        return (
            <div className="text-sm text-muted-foreground p-4 text-center border border-dashed border-border rounded-lg">
                No records available.
            </div>
        );
    }

    return (
        <div className={`overflow-x-auto rounded-lg border border-border bg-card/50 shadow-sm ${className}`}>
            <table className="w-full min-w-[500px] md:min-w-full border-collapse text-left text-sm">
                <thead>
                    <tr className="border-b border-border bg-muted/20 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        {headers.map((header, idx) => (
                            <th key={idx} className="py-3 px-4 select-none">
                                {header}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="divide-y divide-border/40 text-sm">
                    {data.map((row, rowIdx) => (
                        <tr key={rowIdx} className="hover:bg-muted/10 transition-colors">
                            {row.map((cell, cellIdx) => (
                                <td key={cellIdx} className="py-3 px-4 text-foreground leading-normal font-medium">
                                    {cell}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
