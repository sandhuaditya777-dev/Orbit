'use client';

import React, { useEffect } from 'react';
import { Auth0Provider, useAuth0 } from '@auth0/auth0-react';
import { useAuthStore, User } from '@/store/auth.store';

function Auth0Sync({ children }: { children: React.ReactNode }) {
  const {
    isAuthenticated,
    isLoading,
    user: auth0User,
    getAccessTokenSilently,
  } = useAuth0();

  const login = useAuthStore((s) => s.login);
  const logout = useAuthStore((s) => s.logout);
  const setLoading = useAuthStore((s) => s.setLoading);

  useEffect(() => {
    setLoading(isLoading);
  }, [isLoading, setLoading]);

  useEffect(() => {
    const syncUser = async () => {
      if (isAuthenticated && auth0User) {
        try {
          // Retrieve Auth0 access token
          const token = await getAccessTokenSilently();
          // Store with the key the api-client reads
          localStorage.setItem('orbit_token', token);

          const mappedUser: User = {
            sub: auth0User.sub || '',
            name: auth0User.name || auth0User.nickname || 'User',
            email: auth0User.email || '',
            roles: (auth0User['https://cosync.com/roles'] as string[]) || ['member'],
          };

          login(mappedUser);
        } catch (error) {
          console.error('Error fetching Auth0 access token:', error);
          localStorage.removeItem('orbit_token');
          logout();
        }
      } else if (!isLoading && !isAuthenticated) {
        localStorage.removeItem('orbit_token');
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
        scope: 'openid profile email',
      }}
    >
      <Auth0Sync>{children}</Auth0Sync>
    </Auth0Provider>
  );
}
