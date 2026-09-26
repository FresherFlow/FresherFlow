import React from 'react';

type TabKey = 'featured' | 'latest' | 'expiring' | 'all' | 'applied' | 'archived';

interface Tab {
    key: TabKey;
    title: string;
}

interface DashboardTabsProps {
    tabs: Tab[];
    activeTab: TabKey;
    setActiveTab: (key: TabKey) => void;
    latestBadgeCount: number;
}

export const DashboardTabs = ({
    tabs,
    activeTab,
    setActiveTab,
    latestBadgeCount
}: DashboardTabsProps) => {
    return (
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar md:gap-6" role="tablist" aria-label="Dashboard sections">
            {tabs.map(s => (
                    <button
                        key={s.key}
                        role="tab"
                        aria-selected={activeTab === s.key}
                        onClick={() => setActiveTab(s.key)}
                        className={`relative whitespace-nowrap px-3 py-2 text-xs font-semibold transition-all duration-150 ease-out active:scale-95 md:text-sm ${activeTab === s.key ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'} flex items-center gap-1.5`}
                    >
                        {s.title}
                        {s.key === 'latest' && latestBadgeCount > 0 && (
                            <span className="inline-flex min-w-4 h-4 px-1 rounded-full bg-primary/15 border border-primary/30 text-xs leading-4 font-bold text-primary">
                                {latestBadgeCount > 99 ? '99+' : latestBadgeCount}
                            </span>
                        )}
                        {activeTab === s.key && <span className="absolute left-1/2 -translate-x-1/2 bottom-0 h-0.5 w-7 rounded-full bg-primary" />}
                    </button>
                ))}
        </div>
    );
};
