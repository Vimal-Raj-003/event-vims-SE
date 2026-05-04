"use client";

import { useEffect, useRef, useState } from "react";
import { SEX_OPTIONS } from "@vims-events/shared";

interface StepPersonalProps {
  defaultValues?: Record<string, unknown>;
  onNext: (data: Record<string, unknown>) => void;
  isLoading?: boolean;
}

export function StepPersonal({ defaultValues, onNext, isLoading }: StepPersonalProps) {
  const [form, setForm] = useState({
    firstName: (defaultValues?.firstName as string) ?? "",
    lastName: (defaultValues?.lastName as string) ?? "",
    age: (defaultValues?.age as string) ?? "",
    sex: (defaultValues?.sex as string) ?? "",
    phone: (defaultValues?.phone as string) ?? "",
  });
  const [photoUrl, setPhotoUrl] = useState((defaultValues?.profilePhotoUrl as string) ?? "");

  const [uploadError, setUploadError] = useState("");

  const hasUserEdited = useRef(false);

  useEffect(() => {
    if (!defaultValues) return;
    if (hasUserEdited.current) return;
    setForm({
      firstName: (defaultValues.firstName as string) ?? "",
      lastName: (defaultValues.lastName as string) ?? "",
      age: (defaultValues.age as string) ?? "",
      sex: (defaultValues.sex as string) ?? "",
      phone: (defaultValues.phone as string) ?? "",
    });
    setPhotoUrl((defaultValues.profilePhotoUrl as string) ?? "");
  }, [defaultValues]);

  const updateForm = (patch: Partial<typeof form>) => {
    hasUserEdited.current = true;
    setForm((prev) => ({ ...prev, ...patch }));
  };

  const updatePhoto = (url: string) => {
    hasUserEdited.current = true;
    setPhotoUrl(url);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setUploadError("Photo must be under 5 MB");
      return;
    }
    const formData = new FormData();
    formData.append("file", file);
    formData.append("context", "attendee-photo");
    setUploadError("");
    try {
      const token = typeof window !== "undefined" ? JSON.parse(localStorage.getItem("vims:tokens") ?? "{}")?.accessToken : null;
      const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";
      const res = await fetch(`${baseUrl}/storage/upload`, {
        method: "POST",
        body: formData,
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? "Upload failed");
      updatePhoto(data.url ?? data.data?.url ?? "");
    } catch {
      setUploadError("Photo upload failed. You can continue and add it later.");
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onNext({ ...form, age: form.age ? Number(form.age) : null, profilePhotoUrl: photoUrl || null });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-foreground">Personal Details</h2>
        <p className="mt-1 text-sm text-muted-foreground">Tell us about yourself to get started.</p>
      </div>

      {/* Photo Upload */}
      <div className="flex items-center gap-4">
        <div className="relative">
          <div className="h-20 w-20 overflow-hidden rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 p-[2px]">
            {photoUrl ? (
              <img src={photoUrl} alt="Profile" className="h-full w-full rounded-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center rounded-full bg-white text-lg font-bold text-indigo-500">
                {(form.firstName?.[0] ?? "").toUpperCase()}
              </div>
            )}
          </div>
          <label className="absolute -bottom-1 -right-1 flex h-7 w-7 cursor-pointer items-center justify-center rounded-full bg-primary text-white shadow-md hover:bg-primary/90 transition-colors">
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
            </svg>
            <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
          </label>
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">Profile Photo</p>
          <p className="text-xs text-muted-foreground">Click to upload</p>
          {uploadError && <p className="text-xs text-destructive mt-1">{uploadError}</p>}
        </div>
      </div>

      {/* Name Row */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-muted-foreground uppercase tracking-wider">First Name *</label>
          <input
            type="text"
            required
            value={form.firstName}
            onChange={(e) => updateForm({ firstName: e.target.value })}
            className="w-full rounded-xl border border-border bg-white px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
            placeholder="John"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-muted-foreground uppercase tracking-wider">Last Name *</label>
          <input
            type="text"
            required
            value={form.lastName}
            onChange={(e) => updateForm({ lastName: e.target.value })}
            className="w-full rounded-xl border border-border bg-white px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
            placeholder="Smith"
          />
        </div>
      </div>

      {/* Age & Sex Row */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-muted-foreground uppercase tracking-wider">Age</label>
          <input
            type="number"
            min="18"
            max="100"
            value={form.age}
            onChange={(e) => updateForm({ age: e.target.value })}
            className="w-full rounded-xl border border-border bg-white px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
            placeholder="30"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-muted-foreground uppercase tracking-wider">Gender</label>
          <select
            value={form.sex}
            onChange={(e) => updateForm({ sex: e.target.value })}
            className="w-full rounded-xl border border-border bg-white px-3.5 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
          >
            <option value="">Select</option>
            {SEX_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Email (readonly) */}
      <div>
        <label className="mb-1.5 block text-xs font-semibold text-muted-foreground uppercase tracking-wider">Email</label>
        <input
          type="email"
          readOnly
          value={(defaultValues?.email as string) ?? ""}
          className="w-full rounded-xl border border-border bg-muted/50 px-3.5 py-2.5 text-sm text-muted-foreground cursor-not-allowed"
        />
      </div>

      {/* Phone */}
      <div>
        <label className="mb-1.5 block text-xs font-semibold text-muted-foreground uppercase tracking-wider">Phone *</label>
        <input
          type="tel"
          required
          value={form.phone}
          onChange={(e) => updateForm({ phone: e.target.value })}
          className="w-full rounded-xl border border-border bg-white px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
          placeholder="+91 98765 43210"
        />
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-white shadow-lg shadow-primary/30 hover:bg-primary/90 disabled:opacity-50 transition-all"
      >
        {isLoading ? "Saving..." : "Continue"}
      </button>
    </form>
  );
}
