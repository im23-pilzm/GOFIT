import { Session } from '@supabase/supabase-js';
import { ReactNode, createContext, useEffect, useMemo, useState } from 'react';
import { apiRequest } from '@/lib/api';
import { supabase } from '@/lib/supabase';

type AuthContextValue = {
    session: Session | null;
    isLoading: boolean;
    signIn: (email: string, password: string) => Promise<void>;
    signUp: (email: string, password: string) => Promise<void>;
    signOut: () => Promise<void>;
};

type AuthApiResponse = {
    user: {
        id: string;
        email: string;
    } | null;
    session: {
        access_token: string;
        refresh_token: string;
        expires_in: number;
        token_type: string;
    } | null;
    email_confirmation_required?: boolean;
};

export const AuthContext = createContext<AuthContextValue | null>(null);

type AuthProviderProps = {
    children: ReactNode;
};

export function AuthProvider({ children }: AuthProviderProps) {
    const [session, setSession] = useState<Session | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        let mounted = true;

        const loadSession = async () => {
            const { data, error } = await supabase.auth.getSession();

            if (error) {
                console.error('Failed to load session:', error.message);
            }

            if (mounted) {
                setSession(data.session ?? null);
                setIsLoading(false);
            }
        };

        loadSession();

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, nextSession) => {
            setSession(nextSession);
            setIsLoading(false);
        });

        return () => {
            mounted = false;
            subscription.unsubscribe();
        };
    }, []);

    const signIn = async (email: string, password: string) => {
        const data = await apiRequest<AuthApiResponse>('/api/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password }),
        });

        if (!data.session?.access_token || !data.session.refresh_token) {
            throw new Error('Login did not return a valid session.');
        }

        const { error } = await supabase.auth.setSession({
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token,
        });

        if (error) {
            throw new Error(error.message);
        }
    };

    const signUp = async (email: string, password: string) => {
        const data = await apiRequest<AuthApiResponse>('/api/auth/register', {
            method: 'POST',
            body: JSON.stringify({ email, password }),
        });

        if (!data.session?.access_token || !data.session.refresh_token) {
            throw new Error('Please confirm your email address before logging in.');
        }

        const { error } = await supabase.auth.setSession({
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token,
        });

        if (error) {
            throw new Error(error.message);
        }
    };

    const signOut = async () => {
        const { error } = await supabase.auth.signOut();

        if (error) {
            throw new Error(error.message);
        }
    };

    const value = useMemo(
        () => ({ session, isLoading, signIn, signUp, signOut }),
        [session, isLoading]
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

