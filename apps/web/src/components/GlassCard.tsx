"use client";

import { forwardRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import { motion } from "framer-motion";

interface GlassCardProps {
  firstName: string;
  lastName: string;
  designation: string;
  company: string;
  industry: string;
  services: string[];
  city: string;
  phone: string;
  email: string;
  profilePhotoUrl?: string | null;
  companyLogoUrl?: string | null;
  profileViewCount?: number;
  cardShareCount?: number;
  qrScanCount?: number;
  attendeeId: string;
}

export const GlassCard = forwardRef<HTMLDivElement, GlassCardProps>(
  ({
    firstName,
    lastName,
    designation,
    company,
    industry,
    services,
    city,
    phone,
    email,
    profilePhotoUrl,
    companyLogoUrl,
    profileViewCount = 0,
    cardShareCount = 0,
    qrScanCount = 0,
    attendeeId,
  }, ref) => {
    const profileUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/profile/${attendeeId}`;
    const initials = `${firstName?.[0] ?? ""}${lastName?.[0] ?? ""}`.toUpperCase();

    return (
      <motion.div
        ref={ref}
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 200, damping: 25 }}
        className="relative overflow-hidden rounded-2xl"
      >
        {/* Gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500" />

        {/* Animated mesh overlay */}
        <div className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `radial-gradient(at 40% 20%, rgba(255,255,255,0.3) 0px, transparent 50%),
              radial-gradient(at 80% 0%, rgba(255,255,255,0.15) 0px, transparent 50%),
              radial-gradient(at 0% 50%, rgba(255,255,255,0.1) 0px, transparent 50%)`,
          }}
        />

        {/* Card content */}
        <div className="relative z-10 backdrop-blur-sm bg-white/10 border border-white/20 p-6">
          {/* Top row: Photo + Info */}
          <div className="flex items-start gap-4">
            {/* Avatar */}
            <div className="relative flex-shrink-0">
              <div className="h-16 w-16 rounded-full bg-gradient-to-br from-white/40 to-white/10 p-[2px] shadow-lg">
                {profilePhotoUrl ? (
                  <img
                    src={profilePhotoUrl}
                    alt={`${firstName} ${lastName}`}
                    className="h-full w-full rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center rounded-full bg-white/20 text-lg font-bold text-white">
                    {initials}
                  </div>
                )}
              </div>
              {/* Online indicator */}
              <div className="absolute bottom-0 right-0 h-4 w-4 rounded-full border-2 border-white/30 bg-emerald-400 shadow-sm" />
            </div>

            {/* Name & Title */}
            <div className="min-w-0 flex-1">
              <h3 className="text-lg font-bold text-white truncate">
                {firstName} {lastName}
              </h3>
              <p className="text-sm font-medium text-white/80 truncate">
                {designation}
              </p>
              <div className="mt-1 flex items-center gap-1.5">
                {companyLogoUrl && (
                  <img src={companyLogoUrl} alt={company} className="h-3.5 w-3.5 rounded-sm" />
                )}
                <span className="text-xs text-white/60 truncate">{company}</span>
              </div>
            </div>
          </div>

          {/* Industry & City */}
          <div className="mt-4 flex items-center gap-2">
            <span className="rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-semibold text-white/90 uppercase tracking-wider backdrop-blur-sm">
              {industry}
            </span>
            <span className="rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-medium text-white/70 backdrop-blur-sm">
              {city}
            </span>
          </div>

          {/* Services */}
          {services && services.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {services.slice(0, 4).map((svc) => (
                <span
                  key={svc}
                  className="rounded-md bg-white/10 px-2 py-0.5 text-[10px] font-medium text-white/70"
                >
                  {svc}
                </span>
              ))}
              {services.length > 4 && (
                <span className="rounded-md bg-white/10 px-2 py-0.5 text-[10px] font-medium text-white/50">
                  +{services.length - 4} more
                </span>
              )}
            </div>
          )}

          {/* Divider */}
          <div className="my-4 h-px bg-white/10" />

          {/* QR + Contact Row */}
          <div className="flex items-end justify-between">
            {/* Contact info */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-white/60">
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                </svg>
                <span className="text-[11px] truncate">{email}</span>
              </div>
              <div className="flex items-center gap-2 text-white/60">
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                </svg>
                <span className="text-[11px]">{phone}</span>
              </div>
            </div>

            {/* QR Code */}
            <div className="rounded-lg bg-white p-1.5 shadow-lg">
              <QRCodeSVG
                value={profileUrl}
                size={64}
                level="H"
                bgColor="#ffffff"
                fgColor="#4F46E5"
                imageSettings={undefined}
              />
            </div>
          </div>

          {/* Stats */}
          <div className="mt-4 grid grid-cols-3 gap-2 rounded-xl bg-white/5 p-2.5 backdrop-blur-sm">
            <div className="text-center">
              <p className="text-sm font-bold text-white">{profileViewCount}</p>
              <p className="text-[9px] text-white/50 uppercase tracking-wider">Views</p>
            </div>
            <div className="text-center border-x border-white/10">
              <p className="text-sm font-bold text-white">{cardShareCount}</p>
              <p className="text-[9px] text-white/50 uppercase tracking-wider">Shared</p>
            </div>
            <div className="text-center">
              <p className="text-sm font-bold text-white">{qrScanCount}</p>
              <p className="text-[9px] text-white/50 uppercase tracking-wider">Scans</p>
            </div>
          </div>
        </div>
      </motion.div>
    );
  },
);

GlassCard.displayName = "GlassCard";
