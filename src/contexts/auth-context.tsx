"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import type { User, SignInRequest, SignInResponse } from "@/types/auth";
import { signIn as signInApi, signOut as signOutApi, getToken, getUser } from "@/lib/auth";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signIn: (credentials: SignInRequest) => Promise<SignInResponse>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticatedState, setIsAuthenticatedState] = useState(false);

  useEffect(() => {
    // Check if user is authenticated on mount
    const token = getToken();
    const userData = getUser();
    
    if (token && userData) {
      setUser(userData as User);
      setIsAuthenticatedState(true);
    } else {
      setIsAuthenticatedState(false);
    }
    
    setIsLoading(false);
  }, []);

  const signIn = useCallback(async (credentials: SignInRequest) => {
    try {
      const response = await signInApi(credentials);
      setUser(response.data.user);
      setIsAuthenticatedState(true);
      return response;
    } catch (error) {
      throw error;
    }
  }, []);

  const signOut = useCallback(async () => {
    await signOutApi();
    setUser(null);
    setIsAuthenticatedState(false);
    // Use window.location for a hard redirect to ensure cookies are cleared
    window.location.href = "/sign-in";
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: isAuthenticatedState,
        signIn,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

