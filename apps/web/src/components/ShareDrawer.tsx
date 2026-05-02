"use client";

import { useState, useCallback } from "react";
import { toPng } from "html-to-image";
import { QRCodeSVG } from "qrcode.react";
import { motion } from "framer-motion";
import { useTrackCardShare } from "@/lib/hooks/use-attendee";

interface ShareDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  cardRef: React.RefObject<HTMLDivElement | null>;
  attendeeName: string;
  attendeeId: string;
  profileUrl: string;
}

const SHARE_METHODS = [
  {
    id: "whatsapp",
    label: "WhatsApp",
    color: "bg-[#25D366]",
    icon: (
      <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
      </svg>
    ),
  },
  {
    id: "linkedin",
    label: "LinkedIn",
    color: "bg-[#0A66C2]",
    icon: (
      <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
      </svg>
    ),
  },
  {
    id: "email",
    label: "Email",
    color: "bg-slate-600",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
      </svg>
    ),
  },
  {
    id: "sms",
    label: "SMS",
    color: "bg-emerald-500",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
      </svg>
    ),
  },
  {
    id: "vcard",
    label: "Save Contact",
    color: "bg-violet-500",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM4 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 0110.374 21c-2.331 0-4.512-.645-6.374-1.766z" />
      </svg>
    ),
  },
  {
    id: "link",
    label: "Copy Link",
    color: "bg-blue-500",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
      </svg>
    ),
  },
  {
    id: "image",
    label: "Save as Image",
    color: "bg-amber-500",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5a1.5 1.5 0 001.5-1.5V4.5a1.5 1.5 0 00-1.5-1.5H3.75a1.5 1.5 0 00-1.5 1.5v15a1.5 1.5 0 001.5 1.5zM12 9.75a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
      </svg>
    ),
  },
  {
    id: "qrcode",
    label: "Show QR",
    color: "bg-slate-700",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 6.75h.75v.75h-.75v-.75zM6.75 16.5h.75v.75h-.75v-.75zM16.5 6.75h.75v.75h-.75v-.75zM13.5 13.5h.75v.75h-.75v-.75zM13.5 19.5h.75v.75h-.75v-.75zM19.5 13.5h.75v.75h-.75v-.75zM19.5 19.5h.75v.75h-.75v-.75zM16.5 16.5h.75v.75h-.75v-.75z" />
      </svg>
    ),
  },
];

export function ShareDrawer({ isOpen, onClose, cardRef, attendeeName, attendeeId, profileUrl }: ShareDrawerProps) {
  const [showQR, setShowQR] = useState(false);
  const [copied, setCopied] = useState(false);
  const trackShare = useTrackCardShare();

  const handleShare = useCallback(async (methodId: string) => {
    const text = `Check out ${attendeeName}'s card on VIMS Events: ${profileUrl}`;

    try {
      switch (methodId) {
        case "whatsapp":
          window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
          break;
        case "linkedin":
          window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(profileUrl)}`, "_blank");
          break;
        case "email":
          window.location.href = `mailto:?subject=${encodeURIComponent(`${attendeeName}'s Business Card`)}&body=${encodeURIComponent(text)}`;
          break;
        case "sms":
          window.location.href = `sms:?body=${encodeURIComponent(text)}`;
          break;
        case "vcard": {
          const res = await fetch(`/api/v1/attendees/${attendeeId}/vcard`);
          if (res.ok) {
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `${attendeeName.replace(/\s+/g, "_")}.vcf`;
            a.click();
            URL.revokeObjectURL(url);
          }
          break;
        }
        case "link":
          await navigator.clipboard.writeText(profileUrl);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
          break;
        case "image": {
          if (cardRef?.current) {
            const dataUrl = await toPng(cardRef.current, { quality: 0.95, pixelRatio: 2 });
            const a = document.createElement("a");
            a.href = dataUrl;
            a.download = `${attendeeName.replace(/\s+/g, "_")}_card.png`;
            a.click();
          }
          break;
        }
        case "qrcode":
          setShowQR(true);
          return; // Don't close drawer or track for QR view
      }

      trackShare.mutate(methodId);
    } catch {
      // Share failed silently
    }

    if (methodId !== "qrcode") {
      setTimeout(onClose, 500);
    }
  }, [attendeeName, attendeeId, profileUrl, cardRef, trackShare, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Drawer */}
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="relative z-10 w-full max-w-lg rounded-t-2xl bg-white pb-[env(safe-area-inset-bottom)] shadow-2xl"
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="h-1 w-10 rounded-full bg-muted" />
        </div>

        <div className="px-5 pb-6">
          <h3 className="mb-4 text-base font-bold text-foreground">Share Your Card</h3>

          {showQR ? (
            <div className="flex flex-col items-center gap-4 py-4">
              <div className="rounded-2xl bg-white p-4 shadow-lg border">
                <QRCodeSVG value={profileUrl} size={200} level="H" fgColor="#4F46E5" />
              </div>
              <p className="text-sm text-muted-foreground">Scan to view profile</p>
              <button
                onClick={() => setShowQR(false)}
                className="rounded-xl bg-muted px-6 py-2.5 text-sm font-medium text-foreground hover:bg-muted/80 transition-colors"
              >
                Back to sharing options
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-3">
              {SHARE_METHODS.map((method) => (
                <button
                  key={method.id}
                  onClick={() => handleShare(method.id)}
                  className="flex flex-col items-center gap-2 rounded-xl p-3 transition-all hover:bg-muted/50 active:scale-95"
                >
                  <div className={`flex h-11 w-11 items-center justify-center rounded-xl text-white shadow-md ${method.color}`}>
                    {method.icon}
                  </div>
                  <span className="text-[10px] font-medium text-muted-foreground">
                    {method.id === "link" && copied ? "Copied!" : method.label}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
