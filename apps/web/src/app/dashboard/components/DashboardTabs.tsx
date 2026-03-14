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
        <div className="">
            {/* Mobile tabs */}
            <div className="md:hidden flex items-center gap-1 overflow-x-auto no-scrollbar">
                {tabs.map(s => (
                    <button
                        key={s.key}
                        onClick={() => setActiveTab(s.key)}
                        className={`relative whitespace-nowrap px-3 py-2 text-[12px] font-semibold transition-colors ${activeTab === s.key ? 'text-foreground' : 'text-muted-foreground'} flex items-center gap-1.5`}
                    >
                        {s.title}
                        {s.key === 'latest' && latestBadgeCount > 0 && (
                            <span className="inline-flex min-w-4 h-4 px-1 rounded-full bg-primary/15 border border-primary/30 text-[9px] leading-4 font-bold text-primary">
                                {latestBadgeCount > 99 ? '99+' : latestBadgeCount}
                            </span>
                        )}
                        {activeTab === s.key && <span className="absolute left-1/2 -translate-x-1/2 bottom-0 h-0.5 w-7 rounded-full bg-primary" />}
                    </button>
                ))}
            </div>
            {/* Desktop tabs */}
            <div className="hidden md:flex items-center gap-6">
                {tabs.map(s => (
                    <button
                        key={`dt-${s.key}`}
                        onClick={() => setActiveTab(s.key)}
                        className={`relative pb-3 text-xs font-bold uppercase tracking-widest transition-all ${activeTab === s.key ? 'text-primary' : 'text-muted-foreground hover:text-foreground'} flex items-center gap-1.5`}
                    >
                        {s.title}
                        {s.key === 'latest' && latestBadgeCount > 0 && (
                            <span className="inline-flex min-w-4 h-4 px-1 rounded-full bg-primary/15 border border-primary/30 text-[9px] leading-4 font-bold text-primary normal-case tracking-normal">
                                {latestBadgeCount > 99 ? '99+' : latestBadgeCount}
                            </span>
                        )}
                        {activeTab === s.key && <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-primary animate-in fade-in zoom-in duration-300" />}
                    </button>
                ))}
            </div>
        </div>
    );
};
