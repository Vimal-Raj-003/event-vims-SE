"use client";

import { useEffect, useRef, useState } from "react";
import { NETWORKING_GOALS, SERVICES_OFFERED } from "@vims-events/shared";

interface StepServicesProps {
  defaultValues?: Record<string, unknown>;
  onNext: (data: Record<string, unknown>) => void;
  onBack: () => void;
  isLoading?: boolean;
}

export function StepServices({ defaultValues, onNext, onBack, isLoading }: StepServicesProps) {
  const [services, setServices] = useState<string[]>((defaultValues?.services as string[]) ?? []);
  const [interestedIn, setInterestedIn] = useState<string[]>((defaultValues?.interestedIn as string[]) ?? []);
  const [tags, setTags] = useState<string[]>((defaultValues?.tags as string[]) ?? []);
  const [tagInput, setTagInput] = useState("");

  const hasUserEdited = useRef(false);

  useEffect(() => {
    if (!defaultValues) return;
    if (hasUserEdited.current) return;
    setServices((defaultValues.services as string[]) ?? []);
    setInterestedIn((defaultValues.interestedIn as string[]) ?? []);
    setTags((defaultValues.tags as string[]) ?? []);
  }, [defaultValues]);

  const toggleGoal = (goal: string, list: string[], setter: (v: string[]) => void) => {
    hasUserEdited.current = true;
    setter(list.includes(goal) ? list.filter((g) => g !== goal) : [...list, goal]);
  };

  const addTag = () => {
    hasUserEdited.current = true;
    const trimmed = tagInput.trim();
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
      setTagInput("");
    }
  };

  const removeTag = (tag: string) => {
    hasUserEdited.current = true;
    setTags(tags.filter((t) => t !== tag));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onNext({ services, interestedIn, tags });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-foreground">Services & Interests</h2>
        <p className="mt-1 text-sm text-muted-foreground">What do you offer and what are you looking for?</p>
      </div>

      {/* Services Offered */}
      <div>
        <label className="mb-2 block text-xs font-semibold text-muted-foreground uppercase tracking-wider">Services You Offer</label>
        <div className="flex flex-wrap gap-2">
          {SERVICES_OFFERED.map((svc) => (
            <button
              key={svc}
              type="button"
              onClick={() => toggleGoal(svc, services, setServices)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                services.includes(svc)
                  ? "bg-primary text-white shadow-sm shadow-primary/30"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {svc}
            </button>
          ))}
        </div>
      </div>

      {/* Looking For / Interested In */}
      <div>
        <label className="mb-2 block text-xs font-semibold text-muted-foreground uppercase tracking-wider">Looking For</label>
        <div className="flex flex-wrap gap-2">
          {NETWORKING_GOALS.map((goal) => (
            <button
              key={goal}
              type="button"
              onClick={() => toggleGoal(goal, interestedIn, setInterestedIn)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                interestedIn.includes(goal)
                  ? "bg-indigo-500 text-white shadow-sm shadow-indigo-500/30"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {goal}
            </button>
          ))}
        </div>
      </div>

      {/* Tags / Skills */}
      <div>
        <label className="mb-2 block text-xs font-semibold text-muted-foreground uppercase tracking-wider">Skills & Tags</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
            className="flex-1 rounded-xl border border-border bg-white px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
            placeholder="Type a skill and press Enter"
          />
          <button
            type="button"
            onClick={addTag}
            className="rounded-xl bg-muted px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted/80 transition-colors"
          >
            Add
          </button>
        </div>
        {tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary"
              >
                {tag}
                <button type="button" onClick={() => removeTag(tag)} className="hover:text-red-500 transition-colors">
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

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
          disabled={isLoading}
          className="flex-1 rounded-xl bg-primary py-3 text-sm font-semibold text-white shadow-lg shadow-primary/30 hover:bg-primary/90 disabled:opacity-50 transition-all"
        >
          {isLoading ? "Saving..." : "Continue"}
        </button>
      </div>
    </form>
  );
}
