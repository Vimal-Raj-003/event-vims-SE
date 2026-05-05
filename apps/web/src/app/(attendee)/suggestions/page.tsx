"use client";

import { useAuthStore } from "@/lib/stores/auth-store";
import { useSuggestions } from "@/lib/hooks/use-attendee";
import { SuggestionCard } from "@/components/SuggestionCard";

export default function SuggestionsPage() {
  const { activeEventId } = useAuthStore();
  const { data, isLoading } = useSuggestions(activeEventId);

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const suggestions = data?.data ?? [];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-foreground">People You Should Meet</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Smart matches based on your industry, services, and networking goals.
        </p>
      </div>

      {suggestions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <svg className="h-8 w-8 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
            </svg>
          </div>
          <h3 className="mt-4 text-base font-semibold text-foreground">No suggestions yet</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Complete your profile to get personalized match suggestions.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {suggestions.map((suggestion: any) => (
            <SuggestionCard
              key={suggestion.attendee.id}
              attendee={suggestion.attendee}
              score={suggestion.score}
              reasons={suggestion.reasons}
            />
          ))}
        </div>
      )}
    </div>
  );
}
