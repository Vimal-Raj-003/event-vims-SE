"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useSaveWizardStep } from "@/lib/hooks/use-attendee";
import { useAuthStore } from "@/lib/stores/auth-store";
import { useAttendeeProfile } from "@/lib/hooks/use-attendee";
import { StepPersonal } from "@/components/wizard/StepPersonal";
import { StepProfessional } from "@/components/wizard/StepProfessional";
import { StepServices } from "@/components/wizard/StepServices";
import { StepPreferences } from "@/components/wizard/StepPreferences";

const STEPS = ["Personal", "Professional", "Services", "Preferences"];

export default function WizardPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [stepData, setStepData] = useState<Record<string, unknown>>({});
  const router = useRouter();
  const { setProfileCompleted } = useAuthStore();
  const saveStep = useSaveWizardStep();
  const { data: profile } = useAttendeeProfile();

  const handleNext = async (data: Record<string, unknown>) => {
    const merged = { ...stepData, ...data };
    setStepData(merged);

    try {
      await saveStep.mutateAsync({ step: currentStep, data });

      if (currentStep === 4) {
        setProfileCompleted(true);
        router.replace("/dashboard");
        return;
      }

      setCurrentStep((prev) => Math.min(prev + 1, 4));
    } catch {
      // Error handled by mutation state
    }
  };

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  return (
    <div className="flex min-h-[calc(100vh-8rem)] flex-col">
      {/* Progress Bar */}
      <div className="mb-8">
        <div className="mb-3 flex items-center justify-between">
          {STEPS.map((label, i) => (
            <div key={label} className="flex items-center gap-2">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-all duration-300 ${
                  i + 1 <= currentStep
                    ? "bg-primary text-white shadow-md shadow-primary/30"
                    : i + 1 === currentStep + 1
                    ? "border-2 border-primary/30 text-primary"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {i + 1}
              </div>
              <span
                className={`hidden text-xs font-medium sm:block ${
                  i + 1 <= currentStep ? "text-foreground" : "text-muted-foreground"
                }`}
              >
                {label}
              </span>
            </div>
          ))}
        </div>
        <div className="h-1.5 rounded-full bg-muted">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-primary to-indigo-400"
            initial={{ width: "0%" }}
            animate={{ width: `${(currentStep / 4) * 100}%` }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          />
        </div>
      </div>

      {/* Step Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.25 }}
          className="flex-1"
        >
          {currentStep === 1 && (
            <StepPersonal
              defaultValues={profile}
              onNext={handleNext}
              isLoading={saveStep.isPending}
            />
          )}
          {currentStep === 2 && (
            <StepProfessional
              defaultValues={profile}
              onNext={handleNext}
              onBack={handleBack}
              isLoading={saveStep.isPending}
            />
          )}
          {currentStep === 3 && (
            <StepServices
              defaultValues={profile}
              onNext={handleNext}
              onBack={handleBack}
              isLoading={saveStep.isPending}
            />
          )}
          {currentStep === 4 && (
            <StepPreferences
              defaultValues={profile}
              onNext={handleNext}
              onBack={handleBack}
              isLoading={saveStep.isPending}
            />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
