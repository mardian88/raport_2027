import { createContext, useContext, useEffect, useState } from 'react';
import { tursoClient as db } from '../lib/turso-client';

export interface User {
    id: string;
    email?: string;
    role?: string;
    aud?: string;
    app_metadata?: any;
    user_metadata?: any;
    created_at?: string;
    [key: string]: any;
}

export interface Session {
    access_token: string;
    refresh_token?: string;
    user: User | null;
    [key: string]: any;
}

interface AuthContextType {
    session: Session | null;
    user: User | null;
    loading: boolean;
    signOut: () => Promise<void>;
}

// Tipe user minimal (kompatibel dengan db User shape)
const fakeAdminUser: User = {
    id: 'bypass-admin-local',
    email: 'admin@rqm.com',
    role: 'admin',
    aud: 'authenticated',
    app_metadata: {},
    user_metadata: { full_name: 'Admin RQM' },
    created_at: new Date().toISOString(),
};

const fakeSession: Session = {
    access_token: 'bypass-token',
    refresh_token: 'bypass-refresh',
    expires_in: 999999,
    token_type: 'bearer',
    user: fakeAdminUser,
};

const AuthContext = createContext<AuthContextType>({
    session: fakeSession as Session,
    user: fakeAdminUser as User,
    loading: false,
    signOut: async () => { },
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [session, setSession] = useState<Session | null>(fakeSession as Session);
    const [user, setUser] = useState<User | null>(fakeAdminUser as User);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Cek session via db.auth.getSession() — bekerja di semua mode
        // (local-db: selalu return fake session; api: cek cookie)
        db.auth.getSession().then(({ data }) => {
            if (data.session) {
                setSession(data.session as Session);
                setUser((data.session as any).user as User);
            } else {
                setSession(null);
                setUser(null);
            }
            setLoading(false);
        }).catch(() => {
            setSession(fakeSession as Session);
            setUser(fakeAdminUser as User);
            setLoading(false);
        });

        // Listen untuk perubahan session
        const { data: sub } = db.auth.onAuthStateChange((_event, sess) => {
            setSession(sess as Session | null);
            setUser((sess as any)?.user as User | null);
        });

        return () => { sub?.subscription?.unsubscribe?.(); };
    }, []);

    const signOut = async () => {
        await db.auth.signOut();
        window.location.reload();
    };

    return (
        <AuthContext.Provider value={{ session, user, loading, signOut }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
