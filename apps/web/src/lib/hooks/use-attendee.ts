import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

export function useProfileStatus() {
  return useQuery({
    queryKey: ["profile-status"],
    queryFn: async () => {
      const { data } = await apiClient.get("/attendees/me/profile-status");
      return data;
    },
    staleTime: 30_000,
  });
}

export function useSaveWizardStep() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { step: number; data: Record<string, unknown> }) => {
      const { data } = await apiClient.patch("/attendees/me/wizard-step", payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile-status"] });
    },
  });
}

export function useAttendeeProfile() {
  return useQuery({
    queryKey: ["attendee-profile"],
    queryFn: async () => {
      const { data } = await apiClient.get("/attendees/me");
      return data;
    },
    staleTime: 30_000,
  });
}

export function useBusinessCard() {
  return useQuery({
    queryKey: ["business-card"],
    queryFn: async () => {
      const { data } = await apiClient.get("/attendees/me/card");
      return data;
    },
    staleTime: 60_000,
  });
}

export function useTrackCardShare() {
  return useMutation({
    mutationFn: async (method: string) => {
      const { data } = await apiClient.post("/attendees/me/card/shared", { method });
      return data;
    },
  });
}

export function useTrackProfileView() {
  return useMutation({
    mutationFn: async ({ attendeeId, source }: { attendeeId: string; source: string }) => {
      const { data } = await apiClient.post(`/attendees/${attendeeId}/view`, { source });
      return data;
    },
  });
}

export function usePublicProfile(attendeeId: string | null) {
  return useQuery({
    queryKey: ["public-profile", attendeeId],
    queryFn: async () => {
      const { data } = await apiClient.get(`/attendees/${attendeeId}/profile`);
      return data;
    },
    enabled: !!attendeeId,
    staleTime: 30_000,
  });
}

export function useSuggestions(eventId: string | null) {
  return useQuery({
    queryKey: ["suggestions", eventId],
    queryFn: async () => {
      const { data } = await apiClient.get(`/events/${eventId}/suggestions`);
      return data;
    },
    enabled: !!eventId,
    staleTime: 60_000,
  });
}

export function useAnalytics() {
  return useQuery({
    queryKey: ["analytics"],
    queryFn: async () => {
      const { data } = await apiClient.get("/attendees/me/analytics");
      return data;
    },
    staleTime: 30_000,
  });
}

export function useActivities(eventId: string | null, page = 1) {
  return useQuery({
    queryKey: ["activities", eventId, page],
    queryFn: async () => {
      const { data } = await apiClient.get(`/events/${eventId}/activities?page=${page}&pageSize=20`);
      return data;
    },
    enabled: !!eventId,
    staleTime: 15_000,
  });
}
