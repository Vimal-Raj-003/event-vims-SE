import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

type UserRole = "attendee" | "organiser" | "super-admin";

interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatarUrl?: string;
  organisation?: string;
  eventId?: string;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  activeEventId: string | null;
  isAuthenticated: boolean;
  profileCompleted: boolean;

  setUser: (user: User) => void;
  setTokens: (accessToken: string, refreshToken: string) => void;
  setActiveEvent: (eventId: string) => void;
  setProfileCompleted: (completed: boolean) => void;
  login: (user: User, accessToken: string, refreshToken: string, profileCompleted?: boolean) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      activeEventId: null,
      isAuthenticated: false,
      profileCompleted: false,

      setUser: (user) => set({ user }),

      setTokens: (accessToken, refreshToken) =>
        set({ accessToken, refreshToken }),

      setActiveEvent: (eventId) => set({ activeEventId: eventId }),

      setProfileCompleted: (completed) => set({ profileCompleted: completed }),

      login: (user, accessToken, refreshToken, profileCompleted) =>
        set({
          user,
          accessToken,
          refreshToken,
          isAuthenticated: true,
          profileCompleted: profileCompleted ?? false,
          // Keep activeEventId in sync for attendees so suggestions/home
          // queries continue to work after token-refresh-driven re-auth.
          ...(user.eventId ? { activeEventId: user.eventId } : {}),
        }),

      logout: () =>
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          activeEventId: null,
          isAuthenticated: false,
          profileCompleted: false,
        }),
    }),
    {
      name: "vims:auth",
      storage: createJSONStorage(() => {
        if (typeof window !== "undefined") return localStorage;
        return {
          getItem: () => null,
          setItem: () => {},
          removeItem: () => {},
        };
      }),
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        activeEventId: state.activeEventId,
        isAuthenticated: state.isAuthenticated,
        profileCompleted: state.profileCompleted,
      }),
    },
  ),
);
