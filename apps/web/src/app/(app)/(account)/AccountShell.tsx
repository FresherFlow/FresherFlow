'use client';

import React from 'react';

export function AccountShell({ children }: { children: React.ReactNode }) {
    return <div className="w-full flex-1">{children}</div>;
}
