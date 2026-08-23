'use client';

import React, { useEffect } from 'react';
import { Auth0Provider, useAuth0 } from '@auth0/auth0-react';
import { useAuthStore, User } from '@/store/auth.store';

// Session expires after 8 hours of inactivity (in milliseconds)
const SESSION_TTL_MS = 8 * 60 * 60 * 1000;
const TOKEN_KEY = 'orbit_token';
const TOKEN_EXPIRY_KEY = 'orbit_token_expiry';

/** Clears all Orbit + Auth0 localStorage keys */
function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(TOKEN_EXPIRY_KEY);
  // Clear all Auth0 SDK cached session keys
  Object.keys(localStorage)
    .filter((k) => k.startsWith('@@auth0spajs@@'))
    .forEach((k) => localStorage.removeItem(k));
}

/** Returns true if a stored token expiry exists and has passed */
function isSessionExpired(): boolean {
  const expiry = localStorage.getItem(TOKEN_EXPIRY_KEY);
  if (!expiry) return false; // no expiry set yet — not expired
  return Date.now() > parseInt(expiry, 10);
}

function Auth0Sync({ children }: { children: React.ReactNode }) {
  const {
    isAuthenticated,
    isLoading,
    user: auth0User,
    getAccessTokenSilently,
    logout: auth0Logout,
  } = useAuth0();

  const login = useAuthStore((s) => s.login);
  const logout = useAuthStore((s) => s.logout);
  const setLoading = useAuthStore((s) => s.setLoading);

  // On first mount: if the stored session has expired, wipe it so the
  // Auth0 SDK starts fresh and the user has to log in again.
  useEffect(() => {
    if (isSessionExpired()) {
      clearSession();
      logout();
      // Tell Auth0 to log out so it clears its own session cookie too
      auth0Logout({ logoutParams: { returnTo: window.location.origin } });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setLoading(isLoading);
  }, [isLoading, setLoading]);

  useEffect(() => {
    const syncUser = async () => {
      if (isAuthenticated && auth0User) {
        try {
          const token = await getAccessTokenSilently();

          // Store token + fresh expiry timestamp
          localStorage.setItem(TOKEN_KEY, token);
          localStorage.setItem(
            TOKEN_EXPIRY_KEY,
            (Date.now() + SESSION_TTL_MS).toString(),
          );

          // Determine best display name from Auth0 profile
          const displayName =
            auth0User.name && !auth0User.name.includes('@')
              ? auth0User.name
              : auth0User.nickname || auth0User.given_name || auth0User.email?.split('@')[0] || 'User';

          const mappedUser: User = {
            sub: auth0User.sub || '',
            name: displayName,
            email: auth0User.email || '',
            avatar: auth0User.picture,
            roles: (auth0User['https://cosync.com/roles'] as string[]) || ['member'],
          };

          login(mappedUser);

          // Sync user profile with MongoDB server backend
          fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api'}/users/sync`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              name: displayName,
              email: auth0User.email || '',
              avatar: auth0User.picture,
            }),
          }).catch((err) => console.warn('User sync error:', err));
        } catch (error) {
          console.error('Error fetching Auth0 access token:', error);
          clearSession();
          logout();
        }
      } else if (!isLoading && !isAuthenticated) {
        clearSession();
        logout();
      }
    };

    syncUser();
  }, [isAuthenticated, auth0User, getAccessTokenSilently, login, logout, isLoading]);

  return <>{children}</>;
}

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const domain = process.env.NEXT_PUBLIC_AUTH0_DOMAIN || '';
  const clientId = process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID || '';
  const audience = process.env.NEXT_PUBLIC_AUTH0_AUDIENCE || '';

  const redirectUri = typeof window !== 'undefined' ? window.location.origin : '';

  return (
    <Auth0Provider
      domain={domain}
      clientId={clientId}
      authorizationParams={{
        redirect_uri: redirectUri,
        audience: audience,
        scope: 'openid profile email offline_access',
      }}
      cacheLocation="localstorage"
      useRefreshTokens={true}
    >
      <Auth0Sync>{children}</Auth0Sync>
    </Auth0Provider>
  );
}
