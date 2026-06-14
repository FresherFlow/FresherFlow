'use client';

import React, { createContext, useContext, useState } from 'react';

interface AuthFormData {
    email: string;
    fullName: string;
    setEmail: (email: string) => void;
    setFullName: (fullName: string) => void;
}

const AuthFormDataContext = createContext<AuthFormData | undefined>(undefined);

export function AuthFormDataProvider({ children }: { children: React.ReactNode }) {
    const [email, setEmailState] = useState('');
    const [fullName, setFullNameState] = useState('');

    const setEmail = (val: string) => setEmailState(val);
    const setFullName = (val: string) => setFullNameState(val);

    return (
        <AuthFormDataContext.Provider value={{ email, fullName, setEmail, setFullName }}>
            {children}
        </AuthFormDataContext.Provider>
    );
}

export function useAuthFormData() {
    const context = useContext(AuthFormDataContext);
    if (context === undefined) {
        throw new Error('useAuthFormData must be used within an AuthFormDataProvider');
    }
    return context;
}

