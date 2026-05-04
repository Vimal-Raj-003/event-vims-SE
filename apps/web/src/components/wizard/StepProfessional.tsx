"use client";

import { useEffect, useRef, useState } from "react";
import { INDUSTRIES, BUSINESS_TYPES, COMPANY_SIZE_OPTIONS } from "@vims-events/shared";

interface StepProfessionalProps {
  defaultValues?: Record<string, unknown>;
  onNext: (data: Record<string, unknown>) => void;
  onBack: () => void;
  isLoading?: boolean;
}

export function StepProfessional({ defaultValues, onNext, onBack, isLoading }: StepProfessionalProps) {
  const [form, setForm] = useState({
    company: (defaultValues?.company as string) ?? "",
    designation: (defaultValues?.designation as string) ?? "",
    occupation: (defaultValues?.occupation as string) ?? "",
    industry: (defaultValues?.industry as string) ?? "",
    businessType: (defaultValues?.businessType as string) ?? "",
    city: (defaultValues?.city as string) ?? "",
    companySize: (defaultValues?.companySize as string) ?? "",
  });

  const hasUserEdited = useRef(false);

  useEffect(() => {
    if (!defaultValues) return;
    if (hasUserEdited.current) return;
    setForm({
      company: (defaultValues.company as string) ?? "",
      designation: (defaultValues.designation as string) ?? "",
      occupation: (defaultValues.occupation as string) ?? "",
      industry: (defaultValues.industry as string) ?? "",
      businessType: (defaultValues.businessType as string) ?? "",
      city: (defaultValues.city as string) ?? "",
      companySize: (defaultValues.companySize as string) ?? "",
    });
  }, [defaultValues]);

  const updateForm = (patch: Partial<typeof form>) => {
    hasUserEdited.current = true;
    setForm((prev) => ({ ...prev, ...patch }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onNext(form);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-foreground">Professional Info</h2>
        <p className="mt-1 text-sm text-muted-foreground">Your business details help others find and connect with you.</p>
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-semibold text-muted-foreground uppercase tracking-wider">Company / Organization *</label>
        <input
          type="text"
          required
          value={form.company}
          onChange={(e) => updateForm({ company: e.target.value })}
          className="w-full rounded-xl border border-border bg-white px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
          placeholder="TechNova Solutions"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-muted-foreground uppercase tracking-wider">Designation *</label>
          <input
            type="text"
            required
            value={form.designation}
            onChange={(e) => updateForm({ designation: e.target.value })}
            className="w-full rounded-xl border border-border bg-white px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
            placeholder="CEO & Founder"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-muted-foreground uppercase tracking-wider">Occupation</label>
          <input
            type="text"
            value={form.occupation}
            onChange={(e) => updateForm({ occupation: e.target.value })}
            className="w-full rounded-xl border border-border bg-white px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
            placeholder="Entrepreneur"
          />
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-semibold text-muted-foreground uppercase tracking-wider">Industry *</label>
        <select
          required
          value={form.industry}
          onChange={(e) => updateForm({ industry: e.target.value })}
          className="w-full rounded-xl border border-border bg-white px-3.5 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
        >
          <option value="">Select Industry</option>
          {INDUSTRIES.map((ind) => (
            <option key={ind} value={ind}>{ind}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-semibold text-muted-foreground uppercase tracking-wider">Business Type *</label>
        <select
          required
          value={form.businessType}
          onChange={(e) => updateForm({ businessType: e.target.value })}
          className="w-full rounded-xl border border-border bg-white px-3.5 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
        >
          <option value="">Select Type</option>
          {BUSINESS_TYPES.map((bt) => (
            <option key={bt} value={bt}>{bt}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-muted-foreground uppercase tracking-wider">City *</label>
          <input
            type="text"
            required
            value={form.city}
            onChange={(e) => updateForm({ city: e.target.value })}
            className="w-full rounded-xl border border-border bg-white px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
            placeholder="Bangalore"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-muted-foreground uppercase tracking-wider">Company Size</label>
          <select
            value={form.companySize}
            onChange={(e) => updateForm({ companySize: e.target.value })}
            className="w-full rounded-xl border border-border bg-white px-3.5 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
          >
            <option value="">Select</option>
            {COMPANY_SIZE_OPTIONS.map((cs) => (
              <option key={cs} value={cs}>{cs}</option>
            ))}
          </select>
        </div>
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
