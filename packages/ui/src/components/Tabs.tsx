"use client";

import React, { useState } from 'react';
import { cn } from '../utils/cn';

export interface TabItem {
    id: string;
    label: string;
    content: React.ReactNode;
}

export interface TabsProps {
    items: TabItem[];
    className?: string;
}

export function Tabs({ items, className = '' }: TabsProps) {
    const [activeTab, setActiveTab] = useState(items[0]?.id);

    if (!items || items.length === 0) return null;

    return (
        <div className={`space-y-4 ${className}`}>
            <div className="flex border-b border-border overflow-x-auto whitespace-nowrap scrollbar-none gap-2">
                {items.map((item) => {
                    const isActive = activeTab === item.id;
                    return (
                        <button
                            key={item.id}
                            onClick={() => setActiveTab(item.id)}
                            aria-label={`Tab: ${item.label}`}
                            className={cn(
                                "py-2.5 px-4 text-sm font-semibold border-b-2 transition-all leading-none focus:outline-none",
                                isActive
                                    ? "border-primary text-primary"
                                    : "border-transparent text-muted-foreground hover:text-foreground"
                            )}
                        >
                            {item.label}
                        </button>
                    );
                })}
            </div>
            <div className="pt-1 transition-all duration-200">
                {items.find((item) => item.id === activeTab)?.content}
            </div>
        </div>
    );
}
