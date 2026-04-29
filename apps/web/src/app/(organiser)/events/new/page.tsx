"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";

type WizardStep = 1 | 2 | 3 | 4;

const STEP_META: Record<WizardStep, { title: string; description: string }> = {
  1: { title: "Event Basics", description: "Name, date, location, and description" },
  2: { title: "Branding", description: "Custom colours, logo, and theme" },
  3: { title: "Registration Fields", description: "Choose what information to collect" },
  4: { title: "Networking Rules", description: "Connection limits, visibility, and privacy" },
};

const FIELD_OPTIONS = [
  { id: "name", label: "Full Name", required: true },
  { id: "email", label: "Email Address", required: true },
  { id: "company", label: "Company / Organisation", required: false },
  { id: "title", label: "Job Title", required: false },
  { id: "phone", label: "Phone Number", required: false },
  { id: "linkedin", label: "LinkedIn URL", required: false },
  { id: "twitter", label: "Twitter / X Handle", required: false },
  { id: "website", label: "Website", required: false },
  { id: "bio", label: "Short Bio", required: false },
  { id: "interests", label: "Interests / Tags", required: false },
] as const;

interface EventForm {
  name: string;
  date: string;
  endDate: string;
  location: string;
  description: string;
  primaryColor: string;
  secondaryColor: string;
  logoUrl: string;
  selectedFields: string[];
  maxConnections: string;
  visibility: "public" | "private";
  allowExport: boolean;
  requireApproval: boolean;
}

export default function NewEventPage() {
  const [step, setStep] = useState<WizardStep>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState<EventForm>({
    name: "",
    date: "",
    endDate: "",
    location: "",
    description: "",
    primaryColor: "#4F46E5",
    secondaryColor: "#818CF8",
    logoUrl: "",
    selectedFields: ["name", "email", "company", "title"],
    maxConnections: "0",
    visibility: "public",
    allowExport: true,
    requireApproval: false,
  });

  const toggleField = (fieldId: string) => {
    setForm((prev) => ({
      ...prev,
      selectedFields: prev.selectedFields.includes(fieldId)
        ? prev.selectedFields.filter((f) => f !== fieldId)
        : [...prev.selectedFields, fieldId],
    }));
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (step < 4) {
      setStep((s) => (s + 1) as WizardStep);
      return;
    }
    setIsSubmitting(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      window.location.href = "/events";
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl">
      <Link
        href="/events"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
        </svg>
        Back to Events
      </Link>

      <h1 className="mt-4 text-2xl font-bold text-foreground">
        Create New Event
      </h1>

      {/* Step indicator */}
      <div className="mt-8 flex items-center justify-between">
        {([1, 2, 3, 4] as const).map((s) => (
          <div key={s} className="flex items-center">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ${
                s < step
                  ? "bg-primary text-white"
                  : s === step
                  ? "bg-primary text-white ring-4 ring-primary/20"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {s < step ? (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                s
              )}
            </div>
            <div className="ml-3 hidden sm:block">
              <p className={`text-sm font-medium ${s === step ? "text-foreground" : "text-muted-foreground"}`}>
                {STEP_META[s].title}
              </p>
              <p className="text-xs text-muted-foreground">
                {STEP_META[s].description}
              </p>
            </div>
            {s < 4 && (
              <div className="mx-4 hidden h-px w-12 bg-border sm:block" />
            )}
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="mt-8 rounded-xl border border-border bg-white p-6">
        {/* Step 1: Basics */}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <label htmlFor="eventName" className="block text-sm font-medium text-foreground">
                Event Name
              </label>
              <input
                id="eventName"
                type="text"
                required
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                className="mt-1 block w-full rounded-lg border border-input bg-white px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                placeholder="TechConnect Summit 2025"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="startDate" className="block text-sm font-medium text-foreground">
                  Start Date
                </label>
                <input
                  id="startDate"
                  type="date"
                  required
                  value={form.date}
                  onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))}
                  className="mt-1 block w-full rounded-lg border border-input bg-white px-3 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <div>
                <label htmlFor="endDate" className="block text-sm font-medium text-foreground">
                  End Date
                </label>
                <input
                  id="endDate"
                  type="date"
                  required
                  value={form.endDate}
                  onChange={(e) => setForm((p) => ({ ...p, endDate: e.target.value }))}
                  className="mt-1 block w-full rounded-lg border border-input bg-white px-3 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>
            <div>
              <label htmlFor="location" className="block text-sm font-medium text-foreground">
                Location
              </label>
              <input
                id="location"
                type="text"
                required
                value={form.location}
                onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))}
                className="mt-1 block w-full rounded-lg border border-input bg-white px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                placeholder="ExCeL London"
              />
            </div>
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-foreground">
                Description
              </label>
              <textarea
                id="description"
                rows={3}
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                className="mt-1 block w-full rounded-lg border border-input bg-white px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                placeholder="A brief description of your event..."
              />
            </div>
          </div>
        )}

        {/* Step 2: Branding */}
        {step === 2 && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-foreground">
                Brand Colours
              </label>
              <p className="mt-1 text-xs text-muted-foreground">
                These colours will be applied to the attendee experience
              </p>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="primaryColor" className="block text-xs font-medium text-muted-foreground">
                    Primary Colour
                  </label>
                  <div className="mt-1 flex items-center gap-2">
                    <input
                      type="color"
                      id="primaryColor"
                      value={form.primaryColor}
                      onChange={(e) => setForm((p) => ({ ...p, primaryColor: e.target.value }))}
                      className="h-10 w-10 cursor-pointer rounded border border-border"
                    />
                    <input
                      type="text"
                      value={form.primaryColor}
                      onChange={(e) => setForm((p) => ({ ...p, primaryColor: e.target.value }))}
                      className="flex-1 rounded-lg border border-input bg-white px-3 py-2 text-sm font-mono text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="secondaryColor" className="block text-xs font-medium text-muted-foreground">
                    Secondary Colour
                  </label>
                  <div className="mt-1 flex items-center gap-2">
                    <input
                      type="color"
                      id="secondaryColor"
                      value={form.secondaryColor}
                      onChange={(e) => setForm((p) => ({ ...p, secondaryColor: e.target.value }))}
                      className="h-10 w-10 cursor-pointer rounded border border-border"
                    />
                    <input
                      type="text"
                      value={form.secondaryColor}
                      onChange={(e) => setForm((p) => ({ ...p, secondaryColor: e.target.value }))}
                      className="flex-1 rounded-lg border border-input bg-white px-3 py-2 text-sm font-mono text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                </div>
              </div>
            </div>
            <div>
              <label htmlFor="logo" className="block text-sm font-medium text-foreground">
                Event Logo
              </label>
              <div className="mt-2 flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-lg border-2 border-dashed border-border bg-muted/50">
                  <svg className="h-6 w-6 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
                  </svg>
                </div>
                <div>
                  <button type="button" className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted">
                    Upload Logo
                  </button>
                  <p className="mt-1 text-xs text-muted-foreground">
                    PNG, JPG, or SVG up to 2 MB
                  </p>
                </div>
              </div>
            </div>
            {/* Preview card */}
            <div>
              <p className="text-sm font-medium text-foreground">Preview</p>
              <div className="mt-2 overflow-hidden rounded-xl border border-border">
                <div className="h-3" style={{ backgroundColor: form.primaryColor }} />
                <div className="p-4">
                  <p className="text-sm font-semibold text-foreground">
                    {form.name || "Your Event Name"}
                  </p>
                  <div className="mt-2 flex gap-2">
                    <span className="rounded-full px-2 py-0.5 text-xs text-white" style={{ backgroundColor: form.primaryColor }}>
                      Tag 1
                    </span>
                    <span className="rounded-full px-2 py-0.5 text-xs text-white" style={{ backgroundColor: form.secondaryColor }}>
                      Tag 2
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Fields */}
        {step === 3 && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Select the information fields to collect from attendees during registration.
              Required fields cannot be removed.
            </p>
            <div className="space-y-2">
              {FIELD_OPTIONS.map((field) => {
                const isSelected = form.selectedFields.includes(field.id);
                return (
                  <label
                    key={field.id}
                    className={`flex items-center justify-between rounded-lg border p-3 transition-colors ${
                      isSelected ? "border-primary/30 bg-primary-50" : "border-border hover:bg-muted/50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleField(field.id)}
                        disabled={field.required}
                        className="h-4 w-4 rounded border-border text-primary focus:ring-primary/20"
                      />
                      <span className="text-sm font-medium text-foreground">
                        {field.label}
                      </span>
                    </div>
                    {field.required && (
                      <span className="text-xs font-medium text-primary">Required</span>
                    )}
                  </label>
                );
              })}
            </div>
          </div>
        )}

        {/* Step 4: Rules */}
        {step === 4 && (
          <div className="space-y-6">
            <div>
              <label htmlFor="maxConnections" className="block text-sm font-medium text-foreground">
                Maximum Connections per Attendee
              </label>
              <p className="mt-1 text-xs text-muted-foreground">
                Set to 0 for unlimited connections
              </p>
              <input
                id="maxConnections"
                type="number"
                min="0"
                value={form.maxConnections}
                onChange={(e) => setForm((p) => ({ ...p, maxConnections: e.target.value }))}
                className="mt-2 block w-full rounded-lg border border-input bg-white px-3 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground">
                Directory Visibility
              </label>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                <label
                  className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 ${
                    form.visibility === "public" ? "border-primary bg-primary-50" : "border-border"
                  }`}
                >
                  <input
                    type="radio"
                    name="visibility"
                    value="public"
                    checked={form.visibility === "public"}
                    onChange={() => setForm((p) => ({ ...p, visibility: "public" }))}
                    className="text-primary focus:ring-primary/20"
                  />
                  <div>
                    <p className="text-sm font-medium text-foreground">Public</p>
                    <p className="text-xs text-muted-foreground">All attendees see each other</p>
                  </div>
                </label>
                <label
                  className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 ${
                    form.visibility === "private" ? "border-primary bg-primary-50" : "border-border"
                  }`}
                >
                  <input
                    type="radio"
                    name="visibility"
                    value="private"
                    checked={form.visibility === "private"}
                    onChange={() => setForm((p) => ({ ...p, visibility: "private" }))}
                    className="text-primary focus:ring-primary/20"
                  />
                  <div>
                    <p className="text-sm font-medium text-foreground">Private</p>
                    <p className="text-xs text-muted-foreground">Only mutual connections</p>
                  </div>
                </label>
              </div>
            </div>
            <div className="space-y-3">
              <label className="flex items-center justify-between rounded-lg border border-border p-4">
                <div>
                  <p className="text-sm font-medium text-foreground">Allow Contact Export</p>
                  <p className="text-xs text-muted-foreground">
                    Attendees can export connections as vCard or CSV
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={form.allowExport}
                  onClick={() => setForm((p) => ({ ...p, allowExport: !p.allowExport }))}
                  className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
                    form.allowExport ? "bg-primary" : "bg-muted"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      form.allowExport ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </label>
              <label className="flex items-center justify-between rounded-lg border border-border p-4">
                <div>
                  <p className="text-sm font-medium text-foreground">Require Approval</p>
                  <p className="text-xs text-muted-foreground">
                    Connection requests must be accepted before sharing details
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={form.requireApproval}
                  onClick={() => setForm((p) => ({ ...p, requireApproval: !p.requireApproval }))}
                  className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
                    form.requireApproval ? "bg-primary" : "bg-muted"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      form.requireApproval ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </label>
            </div>
          </div>
        )}

        {/* Navigation buttons */}
        <div className="mt-8 flex items-center justify-between border-t border-border pt-6">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => setStep((s) => (s - 1) as WizardStep)}
              className="rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted"
            >
              Previous
            </button>
          ) : (
            <div />
          )}
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-600 disabled:opacity-50"
          >
            {isSubmitting
              ? "Creating..."
              : step === 4
              ? "Create Event"
              : "Continue"}
          </button>
        </div>
      </form>
    </div>
  );
}
