"use client";

import { useEffect, useRef, useState } from "react";
import { NETWORKING_GOALS } from "@vims-events/shared";

interface StepPreferencesProps {
  defaultValues?: Record<string, unknown>;
  onNext: (data: Record<string, unknown>) => void;
  onBack: () => void;
  isLoading?: boolean;
}

export function StepPreferences({ defaultValues, onNext, onBack, isLoading }: StepPreferencesProps) {
  const [form, setForm] = useState({
    linkedinUrl: (defaultValues?.linkedinUrl as string) ?? "",
    websiteUrl: (defaultValues?.websiteUrl as string) ?? "",
    twitterHandle: (defaultValues?.twitterHandle as string) ?? "",
    consentGiven: (defaultValues?.consentGiven as boolean) ?? false,
  });
  const [networkingGoals, setNetworkingGoals] = useState<string[]>(
    (defaultValues?.networkingGoals as string[]) ?? [],
  );

  const hasUserEdited = useRef(false);

  useEffect(() => {
    if (!defaultValues) return;
    if (hasUserEdited.current) return;
    setForm({
      linkedinUrl: (defaultValues.linkedinUrl as string) ?? "",
      websiteUrl: (defaultValues.websiteUrl as string) ?? "",
      twitterHandle: (defaultValues.twitterHandle as string) ?? "",
      consentGiven: (defaultValues.consentGiven as boolean) ?? false,
    });
    setNetworkingGoals((defaultValues.networkingGoals as string[]) ?? []);
  }, [defaultValues]);

  const updateForm = (patch: Partial<typeof form>) => {
    hasUserEdited.current = true;
    setForm((prev) => ({ ...prev, ...patch }));
  };

  const toggleGoal = (goal: string) => {
    hasUserEdited.current = true;
    setNetworkingGoals((prev) =>
      prev.includes(goal) ? prev.filter((g) => g !== goal) : [...prev, goal],
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onNext({ ...form, networkingGoals });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-foreground">Preferences & Social</h2>
        <p className="mt-1 text-sm text-muted-foreground">Almost done! Set your networking goals and social links.</p>
      </div>

      {/* Networking Goals */}
      <div>
        <label className="mb-2 block text-xs font-semibold text-muted-foreground uppercase tracking-wider">Networking Goals</label>
        <div className="grid grid-cols-2 gap-2">
          {NETWORKING_GOALS.map((goal) => (
            <label
              key={goal}
              className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2.5 transition-all ${
                networkingGoals.includes(goal)
                  ? "border-primary bg-primary/5 text-foreground"
                  : "border-border bg-white text-muted-foreground hover:border-primary/30"
              }`}
            >
              <input
                type="checkbox"
                checked={networkingGoals.includes(goal)}
                onChange={() => toggleGoal(goal)}
                className="h-3.5 w-3.5 rounded border-border text-primary accent-primary"
              />
              <span className="text-xs font-medium">{goal}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Social Links */}
      <div className="space-y-3">
        <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider">Social Links</label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
          </span>
          <input
            type="url"
            value={form.linkedinUrl}
            onChange={(e) => updateForm({ linkedinUrl: e.target.value })}
            className="w-full rounded-xl border border-border bg-white py-2.5 pl-10 pr-3.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
            placeholder="linkedin.com/in/yourprofile"
          />
        </div>
        <input
          type="url"
          value={form.websiteUrl}
          onChange={(e) => updateForm({ websiteUrl: e.target.value })}
          className="w-full rounded-xl border border-border bg-white px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
          placeholder="https://yourwebsite.com"
        />
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">@</span>
          <input
            type="text"
            value={form.twitterHandle}
            onChange={(e) => updateForm({ twitterHandle: e.target.value })}
            className="w-full rounded-xl border border-border bg-white py-2.5 pl-8 pr-3.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
            placeholder="twitterhandle"
          />
        </div>
      </div>

      {/* Consent */}
      <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-white p-4 transition-all hover:border-primary/30">
        <input
          type="checkbox"
          required
          checked={form.consentGiven}
          onChange={(e) => updateForm({ consentGiven: e.target.checked })}
          className="mt-0.5 h-4 w-4 rounded border-border text-primary accent-primary"
        />
        <span className="text-xs text-muted-foreground leading-relaxed">
          I consent to sharing my professional information with other event attendees for networking purposes. I understand I can manage my data and privacy settings at any time.
        </span>
      </label>

      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={onBack}
          className="flex-1 rounded-xl border border-border py-3 text-sm font-semibold text-foreground hover:bg-muted transition-colors"
        >
          Back
        </button>
        <button
          type="submit"
          disabled={isLoading || !form.consentGiven}
          className="flex-1 rounded-xl bg-gradient-to-r from-primary to-indigo-500 py-3 text-sm font-semibold text-white shadow-lg shadow-primary/30 hover:opacity-90 disabled:opacity-50 transition-all"
        >
          {isLoading ? "Completing..." : "Complete Profile"}
        </button>
      </div>
    </form>
  );
}
