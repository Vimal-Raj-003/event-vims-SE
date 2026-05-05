import Hero from "@/components/Hero";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { ProofMoments } from "@/components/landing/ProofMoments";
import { WhatYouGet } from "@/components/landing/WhatYouGet";
import { PricingSimple } from "@/components/landing/PricingSimple";
import { FinalCTA } from "@/components/landing/FinalCTA";

export default function LandingPage() {
  return (
    <div className="overflow-x-hidden">
      <Hero />
      <HowItWorks />
      <ProofMoments />
      <WhatYouGet />
      <PricingSimple />
      <FinalCTA />
    </div>
  );
}
