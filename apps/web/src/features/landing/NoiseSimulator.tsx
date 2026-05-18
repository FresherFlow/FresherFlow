"use client";

import React, { useState } from "react";
import { Opportunity } from "@fresherflow/types";

interface JobListing {
  id: number | string;
  title: string;
  company: string;
  type: string;
  status: "noisy" | "processing" | "verified";
  noiseType?: "expired" | "course_spam" | "broken_link" | "none";
  checkStep?: number; // 0: uninspected, 1: link validation, 2: eligibility check, 3: source verification
}

const INITIAL_LISTINGS_FALLBACK: JobListing[] = [
  { id: 1, title: "Software Development Intern", company: "Meta", type: "Internship", status: "noisy", noiseType: "none" },
  { id: 2, title: "Full Stack Engineer (Hiring 2020 Batch)", company: "TechCorp Solutions", type: "Full-time", status: "noisy", noiseType: "expired" },
  { id: 3, title: "Python Developer + Free 3-Month Training (Fee Rs. 49,999)", company: "SkillUp Academy", type: "Course / Spam", status: "noisy", noiseType: "course_spam" },
  { id: 4, title: "Graduate Engineer Trainee", company: "NVIDIA", type: "Full-time", status: "noisy", noiseType: "none" },
  { id: 5, title: "Frontend Developer (Apply via shorturl.at/xyz)", company: "Unknown Startup", type: "Full-time", status: "noisy", noiseType: "broken_link" },
  { id: 6, title: "Associate Analyst", company: "Deloitte", type: "Full-time", status: "noisy", noiseType: "none" }
];

interface NoiseSimulatorProps {
  opportunities?: Opportunity[];
}

export function NoiseSimulator({ opportunities }: NoiseSimulatorProps) {
  const getInitialListings = (): JobListing[] => {
    if (opportunities && opportunities.length > 0) {
      // Filter clean tech jobs from CDN to display
      const realListings: JobListing[] = opportunities.slice(0, 3).map((opp, idx) => ({
        id: opp.id || `real-${idx}`,
        title: opp.title,
        company: opp.company,
        type: opp.type === "INTERNSHIP" ? "Internship" : opp.type === "WALKIN" ? "Walk-In" : "Full-time",
        status: "noisy" as const,
        noiseType: "none" as const
      }));

      // Inject noisy listings to show how the flow protocol Purifier weeds them out
      const noiseListings: JobListing[] = [
        { id: "noise-1", title: "Python Developer + Free 3-Month Training (Fee Rs. 49,999)", company: "SkillUp Academy", type: "Course / Spam", status: "noisy" as const, noiseType: "course_spam" as const },
        { id: "noise-2", title: "Frontend Developer (Apply via shorturl.at/xyz)", company: "Unknown Startup", type: "Full-time", status: "noisy" as const, noiseType: "broken_link" as const },
        { id: "noise-3", title: "Full Stack Engineer (Hiring 2020 Batch)", company: "TechCorp Solutions", type: "Full-time", status: "noisy" as const, noiseType: "expired" as const },
      ];

      return [...realListings, ...noiseListings];
    }
    return INITIAL_LISTINGS_FALLBACK;
  };

  const [listings, setListings] = useState<JobListing[]>(getInitialListings);
  const [isRunning, setIsRunning] = useState(false);
  const [activeStep, setActiveStep] = useState<"idle" | "filtering" | "complete">("idle");
  const [currentCheckLabel, setCurrentCheckLabel] = useState("");

  const resetSimulator = () => {
    setListings(getInitialListings());
    setIsRunning(false);
    setActiveStep("idle");
    setCurrentCheckLabel("");
  };

  const startFiltering = async () => {
    if (isRunning) return;
    setIsRunning(true);
    setActiveStep("filtering");

    const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

    // Copy listings to mutate
    const currentListings = [...listings];

    // Step 1: Link & Redirect Health Check
    setCurrentCheckLabel("Step 1/3: Validating domain health & broken links...");
    for (let i = 0; i < currentListings.length; i++) {
      currentListings[i] = { ...currentListings[i], status: "processing", checkStep: 1 };
      setListings([...currentListings]);
      await sleep(400);

      if (currentListings[i].noiseType === "broken_link") {
        currentListings[i] = { ...currentListings[i], status: "noisy", checkStep: 1 };
      }
    }
    await sleep(600);

    // Step 2: Spam & Course Exclusion
    setCurrentCheckLabel("Step 2/3: Filtering commercial course upsells & marketing bait...");
    for (let i = 0; i < currentListings.length; i++) {
      if (currentListings[i].noiseType === "broken_link") continue;
      currentListings[i] = { ...currentListings[i], status: "processing", checkStep: 2 };
      setListings([...currentListings]);
      await sleep(400);

      if (currentListings[i].noiseType === "course_spam") {
        currentListings[i] = { ...currentListings[i], status: "noisy", checkStep: 2 };
      }
    }
    await sleep(600);

    // Step 3: Expiry Verification
    setCurrentCheckLabel("Step 3/3: Manually verifying deadline status & eligibility batches...");
    for (let i = 0; i < currentListings.length; i++) {
      if (currentListings[i].noiseType === "broken_link" || currentListings[i].noiseType === "course_spam") continue;
      currentListings[i] = { ...currentListings[i], status: "processing", checkStep: 3 };
      setListings([...currentListings]);
      await sleep(400);

      if (currentListings[i].noiseType === "expired") {
        currentListings[i] = { ...currentListings[i], status: "noisy", checkStep: 3 };
      } else {
        currentListings[i] = { ...currentListings[i], status: "verified", checkStep: 3 };
      }
    }

    await sleep(500);
    setActiveStep("complete");
    setIsRunning(false);
    setCurrentCheckLabel("All checks completed. Flow Protocol has successfully purified the feed!");
  };

  return (
    <div className="w-full rounded-3xl border border-border bg-card/60 backdrop-blur-md p-6 md:p-8 shadow-2xl relative overflow-hidden">
      {/* Background glow decorator */}
      <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-accent/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-3xl mx-auto space-y-6 relative z-10">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-border bg-muted/50 text-[10px] uppercase tracking-widest font-semibold text-muted-foreground">
            Flow Protocol Simulator
          </div>
          <h3 className="text-xl md:text-2xl font-bold tracking-tight">
            See the noise-removal protocol in action
          </h3>
          <p className="text-sm text-muted-foreground max-w-xl mx-auto">
            Our multi-step verification filters out dead redirects, course upsells, and expired listings. Run the engine below to see it live.
          </p>
        </div>

        {/* Live Simulator Log Bar */}
        <div className="rounded-xl border border-border bg-muted/30 p-3 text-center min-h-[48px] flex items-center justify-center">
          {activeStep === "idle" && (
            <span className="text-xs font-medium text-muted-foreground">
              Ready to verify. Click &quot;Purify Feed&quot; below.
            </span>
          )}
          {activeStep === "filtering" && (
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
              </span>
              <span className="text-xs font-semibold tracking-tight text-foreground transition-all duration-300">
                {currentCheckLabel}
              </span>
            </div>
          )}
          {activeStep === "complete" && (
            <div className="flex items-center gap-2 text-success">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-xs font-bold tracking-tight">
                Flow Protocol Complete. 3 Spurious Listings Eliminated.
              </span>
            </div>
          )}
        </div>

        {/* Listings Sandbox Card Deck */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {listings.map((job) => {
            const isNoisy = job.status === "noisy";
            const isProcessing = job.status === "processing";
            const isVerified = job.status === "verified";

            return (
              <div
                key={job.id}
                className={`premium-card relative overflow-hidden transition-all duration-500 border ${
                  isVerified
                    ? "border-success/40 bg-success/5 shadow-[0_4px_12px_rgba(34,197,94,0.06)] scale-[1.02]"
                    : isNoisy && job.noiseType !== "none" && activeStep !== "idle"
                    ? "border-error/25 bg-error/5 opacity-55 scale-[0.98] blur-[0.5px]"
                    : isProcessing
                    ? "border-primary/50 bg-primary/5 scale-[1.01] shadow-[0_0_8px_rgba(var(--primary),0.2)]"
                    : "border-border/80"
                }`}
              >
                {/* Visual Status Indicator Tag */}
                <div className="absolute top-3 right-3 flex items-center gap-1.5">
                  {isVerified && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-success/15 text-success">
                      Verified
                    </span>
                  )}
                  {isNoisy && job.noiseType !== "none" && activeStep !== "idle" && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-error/15 text-error">
                      Rejected
                    </span>
                  )}
                  {isProcessing && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-primary/20 text-primary animate-pulse">
                      Analyzing...
                    </span>
                  )}
                  {activeStep === "idle" && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-muted text-muted-foreground">
                      Pending
                    </span>
                  )}
                </div>

                <div className="space-y-2 pr-16">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    {job.type}
                  </span>
                  <h4 className="text-sm font-bold tracking-tight text-foreground line-clamp-1">
                    {job.title}
                  </h4>
                  <p className="text-xs text-muted-foreground font-semibold">
                    {job.company}
                  </p>
                </div>

                {/* Micro-Details/Reason Banner */}
                {activeStep !== "idle" && (
                  <div className="mt-3 pt-3.5 border-t border-border/40 flex items-center justify-between text-[11px]">
                    {isVerified && (
                      <span className="text-success font-semibold flex items-center gap-1">
                        Verified 100% Official Link - Direct Application
                      </span>
                    )}
                    {isNoisy && job.noiseType === "expired" && (
                      <span className="text-error font-medium">
                        Expired batch: 2020 Batch recruitment is closed.
                      </span>
                    )}
                    {isNoisy && job.noiseType === "course_spam" && (
                      <span className="text-error font-medium">
                        Upsell Warning: High fee course masquerading as job.
                      </span>
                    )}
                    {isNoisy && job.noiseType === "broken_link" && (
                      <span className="text-error font-medium">
                        Redirect alert: Untrusted domain (shorturl.at)
                      </span>
                    )}
                    {isProcessing && (
                      <span className="text-primary font-semibold animate-pulse">
                        Checking standard integrity protocols...
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Action button trigger */}
        <div className="flex justify-center gap-3 pt-2">
          {activeStep === "idle" ? (
            <button
              onClick={startFiltering}
              className="premium-button text-[12px] capitalize tracking-widest shadow-xl"
            >
              Purify Feed
              <svg className="w-4 h-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            </button>
          ) : (
            <button
              disabled={isRunning}
              onClick={resetSimulator}
              className={`premium-button-outline text-[12px] capitalize tracking-widest ${
                isRunning ? "opacity-50 cursor-not-allowed" : ""
              }`}
            >
              Reset Simulation
              <svg className="w-4 h-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 7.89H17" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
