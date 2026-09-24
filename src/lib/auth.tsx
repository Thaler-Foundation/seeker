import { bffBaseUrl, endpoints, fetchThaler, ThalerProxyError } from '@/lib/api';
import { PrivyProvider, useLoginWithEmail, usePrivy } from '@privy-io/expo';
import { useQueryClient } from '@tanstack/react-query';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import 'react-native-get-random-values';

export type GateStatus = 'idle' | 'verifying' | 'allowed' | 'denied' | 'error';

type AuthState = {
  ready: boolean;
  sessionReady: boolean;
  authenticated: boolean;
  email: string | null;
  gate: GateStatus;
  gateError: string | null;
  sendCode: (email: string) => Promise<void>;
  loginWithCode: (email: string, code: string) => Promise<void>;
  getToken: () => Promise<string | null>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

function InnerAuthProvider({ children }: { children: ReactNode }) {
  const { user, isReady, logout, getAccessToken } = usePrivy();
  const emailLogin = useLoginWithEmail();
  const qc = useQueryClient();
  const [gate, setGate] = useState<GateStatus>('idle');
  const [gateError, setGateError] = useState<string | null>(null);
  const verifiedForRef = useRef<string | null>(null);
  const ensuredRef = useRef(false);
  const refreshingRef = useRef(false);
  const lastRefreshAtRef = useRef(0);
  const lastTokenRef = useRef<string | null>(null);

  const email =
    user?.linked_accounts.find((a) => a.type === 'email')?.address ?? null;

  const verifyAllowlist = useCallback(async (): Promise<GateStatus> => {
    setGate('verifying');
    setGateError(null);
    try {
      const token = await getAccessToken();
      console.log('[Auth:BFF] verifyAllowlist: Privy token present?', Boolean(token));
      const res = await fetch(`${bffBaseUrl()}/api/auth/allowlist`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({}),
      });
      console.log('[Auth:BFF] verifyAllowlist: response status =', res.status);
      if (res.ok) {
        setGate('allowed');
        return 'allowed';
      }
      if (res.status === 403) {
        setGate('denied');
        setGateError('This account is not on the Thaler beta list.');
        return 'denied';
      }
      let errBody = '';
      try {
        errBody = await res.text();
      } catch {}
      console.warn('[Auth:BFF] verifyAllowlist failed with status:', res.status, errBody);
      setGate('error');
      setGateError('Verification failed. Please try again.');
      return 'error';
    } catch (err: any) {
      console.error('[Auth:BFF] verifyAllowlist fetch/network error:', {
        name: err?.name,
        message: err?.message,
        stack: err?.stack,
        raw: err,
      });
      setGate('error');
      setGateError('Verification failed. Please try again.');
      return 'error';
    }
  }, [getAccessToken]);

  useEffect(() => {
    if (!isReady) return;
    if (user === null) {
      verifiedForRef.current = null;
      return;
    }
    if (!email) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setGate('error');
      setGateError('No verified email on this Privy account. Sign out and try again.');
      return;
    }
    if (verifiedForRef.current === email) return;
    verifiedForRef.current = email;
    void verifyAllowlist().then((status) => {
      if (status === 'error') verifiedForRef.current = null;
    });
  }, [isReady, user, email, verifyAllowlist]);

  useEffect(() => {
    if (!isReady || user === null) {
      ensuredRef.current = false;
      return;
    }
    if (ensuredRef.current) return;
    ensuredRef.current = true;
    void (async () => {
      try {
        await fetchThaler(await getAccessToken(), endpoints.dualWallet, {
          method: 'POST',
        });
      } catch (err) {
        if (!(err instanceof ThalerProxyError && err.status === 401)) {
          ensuredRef.current = false;
        }
      }
    })();
  }, [isReady, user, getAccessToken]);

  useEffect(() => {
    if (isReady && user === null) qc.clear();
  }, [isReady, user, qc]);

  useEffect(() => {
    if (!isReady || user === null) return;
    const onError = (err: unknown) => {
      if (!(err instanceof ThalerProxyError) || err.status !== 401) return;
      if (refreshingRef.current) return;
      const now = Date.now();
      if (now - lastRefreshAtRef.current < 5000) return;
      lastRefreshAtRef.current = now;
      refreshingRef.current = true;
      void (async () => {
        try {
          const token = await getAccessToken();
          if (token === null) {
            await logout();
            qc.clear();
            return;
          }
          if (lastTokenRef.current === token) return;
          lastTokenRef.current = token;
          await qc.invalidateQueries();
        } finally {
          refreshingRef.current = false;
        }
      })();
    };
    const unsubQuery = qc.getQueryCache().subscribe((event) => {
      if (event.type !== 'updated') return;
      onError(event.query.state.error);
    });
    const unsubMutation = qc.getMutationCache().subscribe((event) => {
      if (event.type !== 'updated') return;
      onError(event.mutation?.state.error);
    });
    return () => {
      unsubQuery();
      unsubMutation();
    };
  }, [isReady, user, qc, getAccessToken, logout]);

  const value = useMemo<AuthState>(
    () => ({
      ready: isReady,
      sessionReady: isReady && user !== null,
      authenticated: user !== null && gate === 'allowed',
      email,
      gate,
      gateError,
      sendCode: async (addr: string) => {
        console.log('[Auth:Privy] sendCode starting for:', addr);
        try {
          await emailLogin.sendCode({ email: addr });
          console.log('[Auth:Privy] sendCode succeeded for:', addr);
        } catch (err: any) {
          console.error('[Auth:Privy] sendCode FAILED for:', addr, 'Error:', {
            name: err?.name,
            message: err?.message,
            code: err?.code,
            stack: err?.stack,
            cause: err?.cause,
          });
          throw err;
        }
      },
      loginWithCode: async (addr: string, code: string) => {
        console.log('[Auth:Privy] loginWithCode starting for:', addr, 'code length:', code.length);
        try {
          await emailLogin.loginWithCode({ email: addr, code });
          console.log('[Auth:Privy] loginWithCode succeeded for:', addr);
        } catch (err: any) {
          console.error('[Auth:Privy] loginWithCode FAILED for:', addr, 'Error:', {
            name: err?.name,
            message: err?.message,
            code: err?.code,
            stack: err?.stack,
            cause: err?.cause,
          });
          throw err;
        }
      },
      getToken: () => getAccessToken(),
      signOut: async () => {
        setGate('idle');
        setGateError(null);
        verifiedForRef.current = null;
        lastTokenRef.current = null;
        await logout();
        qc.clear();
      },
    }),
    [isReady, user, email, gate, gateError, emailLogin, getAccessToken, logout, qc]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const appId = process.env.EXPO_PUBLIC_PRIVY_APP_ID;
  const clientId = process.env.EXPO_PUBLIC_PRIVY_CLIENT_ID;
  console.log('[Auth:Boot] PrivyProvider initialized with appId:', appId ? `${appId.slice(0, 6)}...` : 'MISSING', 'clientId:', clientId ? `${clientId.slice(0, 10)}...` : 'MISSING');
  if (!appId) {
    return (
      <AuthContext.Provider
        value={{
          ready: true,
          sessionReady: false,
          authenticated: false,
          email: null,
          gate: 'idle',
          gateError: 'EXPO_PUBLIC_PRIVY_APP_ID is not set.',
          sendCode: async () => {},
          loginWithCode: async () => {},
          getToken: async () => null,
          signOut: async () => {},
        }}
      >
        {children}
      </AuthContext.Provider>
    );
  }
  return (
    <PrivyProvider appId={appId} clientId={clientId}>
      <InnerAuthProvider>{children}</InnerAuthProvider>
    </PrivyProvider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth outside AuthProvider');
  return ctx;
}
