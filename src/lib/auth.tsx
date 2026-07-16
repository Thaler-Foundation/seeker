// Privy email auth plus the BFF /api/auth/allowlist gate.

import 'react-native-get-random-values';
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { PrivyProvider, usePrivy, useLoginWithEmail } from '@privy-io/expo';
import { bffBaseUrl } from '@/lib/api';

export type GateStatus = 'idle' | 'verifying' | 'allowed' | 'denied' | 'error';

type AuthState = {
  ready: boolean;
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
  const [gate, setGate] = useState<GateStatus>('idle');
  const [gateError, setGateError] = useState<string | null>(null);

  const email =
    user?.linked_accounts.find((a) => a.type === 'email')?.address ?? null;

  const verifyAllowlist = useCallback(async () => {
    setGate('verifying');
    setGateError(null);
    try {
      const token = await getAccessToken();
      const res = await fetch(`${bffBaseUrl()}/api/auth/allowlist`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({}),
      });
      if (res.ok) {
        setGate('allowed');
      } else if (res.status === 403) {
        setGate('denied');
        setGateError('This account is not on the Thaler beta list.');
      } else {
        setGate('error');
        setGateError('Verification failed. Please try again.');
      }
    } catch {
      setGate('error');
      setGateError('Verification failed. Please try again.');
    }
  }, [getAccessToken]);

  const value = useMemo<AuthState>(
    () => ({
      ready: isReady,
      authenticated: user !== null && gate === 'allowed',
      email,
      gate,
      gateError,
      sendCode: async (addr: string) => {
        await emailLogin.sendCode({ email: addr });
      },
      loginWithCode: async (addr: string, code: string) => {
        await emailLogin.loginWithCode({ email: addr, code });
        await verifyAllowlist();
      },
      getToken: () => getAccessToken(),
      signOut: async () => {
        setGate('idle');
        setGateError(null);
        await logout();
      },
    }),
    [isReady, user, email, gate, gateError, emailLogin, verifyAllowlist, getAccessToken, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const appId = process.env.EXPO_PUBLIC_PRIVY_APP_ID;
  const clientId = process.env.EXPO_PUBLIC_PRIVY_CLIENT_ID;
  if (!appId) {
    return (
      <AuthContext.Provider
        value={{
          ready: true,
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
