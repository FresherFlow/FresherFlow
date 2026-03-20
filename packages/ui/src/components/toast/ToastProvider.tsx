import React, { useState, useEffect, useRef, useCallback } from 'react';
import { _registerToastProvider, type ToastItem } from '@repo/frontend-core';
import ToastManager from './ToastManager';
import { ToastProps } from './Toast';

const MAX_VISIBLE = 4;

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [queue, setQueue] = useState<Omit<ToastProps, 'onRemove'>[]>([]);
    const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

    const dismiss = useCallback((id: string) => {
        setQueue(prev => prev.filter(t => t.id !== id));
    }, []);

    const show = useCallback((item: Omit<ToastItem, 'id'>) => {
        const id = String(Date.now()) + Math.random().toString(36).slice(2);
        
        const toast: Omit<ToastProps, 'onRemove'> = { 
            ...item, 
            id,
            // Map our lib/toast detail to component detail
            detail: item.detail,
            position: 'top' // Default Nuvio position
        };

        setQueue(q => [...q, toast].slice(-MAX_VISIBLE));
    }, []);

    useEffect(() => {
        _registerToastProvider(show);
        const currentTimers = timers.current;
        return () => {
            Object.values(currentTimers).forEach(clearTimeout);
        };
    }, [show]);

    return (
        <>
            {children}
            <ToastManager toasts={queue} onRemoveToast={dismiss} />
        </>
    );
}


