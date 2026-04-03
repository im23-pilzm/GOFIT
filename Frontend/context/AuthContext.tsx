import { Session } from '@supabase/supabase-js';
import { ReactNode, createContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';

type AuthContextValue = {
    session: Session | null;
    isLoading: boolean;
    signIn: (email: string, password: string) => Promise<void>;
    signUp: (email: string, password: string) => Promise<void>;
    signOut: () => Promise<void>;
}

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
                        // Uncomment this line to sign out on app startup (for testing)
                        await supabase.auth.signOut();

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
        const { error } = await supabase.auth.signInWithPassword({ email, password })

        if (error) {
            throw new Error(error.message);
        }
    };

    const signUp = async (email: string, password: string) => {
        const { error } = await supabase.auth.signUp({ email, password })

        if (error) {
            throw new Error(error.message);
        }
    };

    const signOut = async () => {
        const { error } = await supabase.auth.signOut()

        if (error) {
            throw new Error(error.message);
        }
    };

    const value = useMemo(
        () => ({ session, isLoading, signIn, signUp, signOut }),
        [session, isLoading]
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

