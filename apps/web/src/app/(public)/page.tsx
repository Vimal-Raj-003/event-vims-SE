import Hero from "@/components/Hero";
import { LandingNavBar } from "@/components/landing/LandingNavBar";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { WhatYouGet } from "@/components/landing/WhatYouGet";
import { PricingSimple } from "@/components/landing/PricingSimple";
import { FinalCTA } from "@/components/landing/FinalCTA";

export default function LandingPage() {
  return (
    <div className="overflow-x-hidden">
      <LandingNavBar />
      <Hero />
      <HowItWorks />
      <WhatYouGet />
      <PricingSimple />
      <FinalCTA />
    </div>
  );
}
