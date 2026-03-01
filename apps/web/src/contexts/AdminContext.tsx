'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { adminAuthApi } from '@/lib/api/client';
import { useRouter } from 'next/navigation';

import { Admin } from '@fresherflow/types';

interface AdminContextType {
    isAuthenticated: boolean;
    isLoading: boolean;
    admin: Admin | null;
    logout: () => Promise<void>;
    refresh: () => Promise<void>;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

export function AdminProvider({ children }: { children: ReactNode }) {
    const [admin, setAdmin] = useState<Admin | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();

    // Check admin session on mount
    useEffect(() => {
        checkAdminSession();
    }, []);

    async function checkAdminSession() {
        try {
            const response = await adminAuthApi.me();
            if (response.admin) {
                setAdmin(response.admin);
            } else {
                setAdmin(null);
            }
        } catch {
            setAdmin(null);
        } finally {
            setIsLoading(false);
        }
    }

    async function logout() {
        try {
            await adminAuthApi.logout();
        } catch {
            // Ignore logout errors
        }
        setAdmin(null);
        router.push('/admin/login');
    }

    async function refresh() {
        await checkAdminSession();
    }

    return (
        <AdminContext.Provider
            value={{
                isAuthenticated: !!admin,
                isLoading,
                admin,
                logout,
                refresh
            }}
        >
            {children}
        </AdminContext.Provider>
    );
}

export function useAdmin() {
    const context = useContext(AdminContext);
    if (context === undefined) {
        throw new Error('useAdmin must be used within an AdminProvider');
    }
    return context;
}
