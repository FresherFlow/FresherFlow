'use client';

import { createContext, useContext, useState, useCallback } from 'react';

interface FeedHeaderState {
    count: number | null;
    setCount: (n: number | null) => void;
}

const FeedHeaderContext = createContext<FeedHeaderState>({
    count: null,
    setCount: () => {},
});

export function FeedHeaderProvider({ children }: { children: React.ReactNode }) {
    const [count, setCountState] = useState<number | null>(null);
    const setCount = useCallback((n: number | null) => setCountState(n), []);
    return (
        <FeedHeaderContext.Provider value={{ count, setCount }}>
            {children}
        </FeedHeaderContext.Provider>
    );
}

export const useFeedHeader = () => useContext(FeedHeaderContext);
