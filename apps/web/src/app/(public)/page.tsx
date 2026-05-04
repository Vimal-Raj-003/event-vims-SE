import Hero from "@/components/Hero";
import { WhatYouGet } from "@/components/landing/WhatYouGet";
import { PricingSimple } from "@/components/landing/PricingSimple";
import { FinalCTA } from "@/components/landing/FinalCTA";

export default function LandingPage() {
  return (
    <div className="overflow-x-hidden">
      <Hero />
      <WhatYouGet />
      <PricingSimple />
      <FinalCTA />
    </div>
  );
}
