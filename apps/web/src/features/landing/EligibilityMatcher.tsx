"use client";

import React, { useState } from "react";
import { Opportunity, EducationLevel } from "@fresherflow/types";

interface OpportunityMock {
  id: string | number;
  title: string;
  company: string;
  degrees: string[];
  gradYears: number[];
  skills: string[];
  salaryRange: string;
}

const MOCK_OPPORTUNITIES_FALLBACK: OpportunityMock[] = [
  {
    id: 1,
    title: "Software Engineer - React Frontend",
    company: "Razorpay",
    degrees: ["B.Tech", "B.E.", "BCA", "M.Tech"],
    gradYears: [2025, 2026],
    skills: ["React", "JavaScript", "TypeScript"],
    salaryRange: "Rs. 8L - Rs. 12L LPA"
  },
  {
    id: 2,
    title: "Graduate Analyst (Data Engineering)",
    company: "Goldman Sachs",
    degrees: ["B.Tech", "M.Tech", "B.Sc", "M.Sc"],
    gradYears: [2025],
    skills: ["Python", "SQL", "Java"],
    salaryRange: "Rs. 14L - Rs. 18L LPA"
  },
  {
    id: 3,
    title: "Product Operations Specialist",
    company: "Zepto",
    degrees: ["Any Degree", "BBA", "B.Com", "BCA", "B.Tech"],
    gradYears: [2025, 2026, 2027],
    skills: ["Excel", "SQL", "Product Operations"],
    salaryRange: "Rs. 6L - Rs. 8L LPA"
  }
];

interface EligibilityMatcherProps {
  opportunities?: Opportunity[];
}

export function EligibilityMatcher({ opportunities }: EligibilityMatcherProps) {
  const [selectedDegree, setSelectedDegree] = useState("B.Tech");
  const [selectedGradYear, setSelectedGradYear] = useState<number>(2026);
  const [selectedSkill, setSelectedSkill] = useState("React");

  const degreesOptions = ["B.Tech", "BCA", "BBA", "B.Sc", "M.Tech"];
  const gradYearsOptions = [2025, 2026, 2027];
  const skillsOptions = ["React", "Python", "SQL", "JavaScript", "Excel"];

  return (
    <div className="w-full rounded-3xl border border-border bg-card/60 backdrop-blur-md p-6 md:p-8 shadow-2xl relative overflow-hidden">
      {/* Background glow decorator */}
      <div className="absolute -top-24 -left-24 w-48 h-48 bg-accent/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-5xl mx-auto space-y-8 relative z-10">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-border bg-muted/50 text-[10px] uppercase tracking-widest font-semibold text-muted-foreground">
            Smart Fit Sandbox
          </div>
          <h3 className="text-xl md:text-2xl font-bold tracking-tight">
            Stop Reading Long Job Specs - Fit Instantly
          </h3>
          <p className="text-sm text-muted-foreground max-w-xl mx-auto">
            Traditional job boards make you scroll through 2,000 words of legalese to find eligibility rules. Toggle your profile variables below to see the math matching live roles.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[0.4fr_0.6fr] gap-8 items-start">
          {/* Controls Profile Cockpit */}
          <div className="rounded-2xl border border-border bg-muted/30 p-5 space-y-6">
            <h4 className="text-sm font-bold tracking-tight uppercase tracking-wider text-muted-foreground">
              Your Academic Profile
            </h4>

            {/* Degree selector */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Degree Program
              </label>
              <div className="flex flex-wrap gap-1.5">
                {degreesOptions.map((degree) => (
                  <button
                    key={degree}
                    onClick={() => setSelectedDegree(degree)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold tracking-tight transition-all ${
                      selectedDegree === degree
                        ? "bg-primary text-primary-foreground border border-primary"
                        : "bg-card text-foreground border border-border/80 hover:bg-muted"
                    }`}
                  >
                    {degree}
                  </button>
                ))}
              </div>
            </div>

            {/* Graduation Year selector */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Graduation Year
              </label>
              <div className="flex flex-wrap gap-1.5">
                {gradYearsOptions.map((year) => (
                  <button
                    key={year}
                    onClick={() => setSelectedGradYear(year)}
                    className={`px-4 py-1.5 rounded-lg text-xs font-semibold tracking-tight transition-all ${
                      selectedGradYear === year
                        ? "bg-primary text-primary-foreground border border-primary"
                        : "bg-card text-foreground border border-border/80 hover:bg-muted"
                    }`}
                  >
                    {year} Batch
                  </button>
                ))}
              </div>
            </div>

            {/* Core Skill selector */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Primary Skill Highlight
              </label>
              <div className="flex flex-wrap gap-1.5">
                {skillsOptions.map((skill) => (
                  <button
                    key={skill}
                    onClick={() => setSelectedSkill(skill)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold tracking-tight transition-all ${
                      selectedSkill === skill
                        ? "bg-primary text-primary-foreground border border-primary"
                        : "bg-card text-foreground border border-border/80 hover:bg-muted"
                    }`}
                  >
                    {skill}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Interactive Match Feed */}
          <div className="space-y-4">
            {opportunities && opportunities.length > 0 ? (
              opportunities.slice(0, 3).map((opp) => {
                // Calculate match dynamically using real CDN parameters
                const expectedLevel = selectedDegree === "M.Tech" ? "PG" : "DEGREE";
                const degreeMatch =
                  !opp.allowedDegrees ||
                  opp.allowedDegrees.length === 0 ||
                  opp.allowedDegrees.includes(expectedLevel as EducationLevel) ||
                  opp.allowedCourses?.some(c => c.toLowerCase().includes(selectedDegree.toLowerCase()));

                const gradMatch =
                  !opp.allowedPassoutYears ||
                  opp.allowedPassoutYears.length === 0 ||
                  opp.allowedPassoutYears.includes(selectedGradYear);

                const skillMatch =
                  !opp.requiredSkills ||
                  opp.requiredSkills.length === 0 ||
                  opp.requiredSkills.some(s => s.toLowerCase().includes(selectedSkill.toLowerCase())) ||
                  opp.title.toLowerCase().includes(selectedSkill.toLowerCase());

                const isFullyEligible = degreeMatch && gradMatch && skillMatch;

                // Format salary beautifully from CDN fields
                let salaryText = "Competitive";
                if (opp.salaryRange) {
                  salaryText = opp.salaryRange;
                } else if (opp.salaryMin && opp.salaryMax) {
                  const minL = Math.round(opp.salaryMin / 100000);
                  const maxL = Math.round(opp.salaryMax / 100000);
                  salaryText = `Rs. ${minL}L - Rs. ${maxL}L LPA`;
                }

                return (
                  <div
                    key={opp.id}
                    className={`premium-card relative overflow-hidden transition-all duration-300 border ${
                      isFullyEligible
                        ? "border-success/35 bg-success/5 shadow-[0_4px_12px_rgba(34,197,94,0.06)]"
                        : "border-border/80 opacity-65"
                    }`}
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                            {opp.company}
                          </span>
                          <h4 className="text-sm md:text-base font-bold tracking-tight text-foreground">
                            {opp.title}
                          </h4>
                        </div>
                        <span className="text-xs font-bold text-foreground bg-muted px-2.5 py-1 rounded-md border border-border/40 whitespace-nowrap">
                          {salaryText}
                        </span>
                      </div>

                      {/* Eligibility details */}
                      <div className="flex flex-wrap gap-1.5">
                        <span
                          className={`badge text-[10px] font-bold tracking-tight uppercase ${
                            degreeMatch ? "badge-success" : "bg-error/10 text-error"
                          }`}
                        >
                          {selectedDegree} {degreeMatch ? "Eligible" : "Excluded"}
                        </span>
                        <span
                          className={`badge text-[10px] font-bold tracking-tight uppercase ${
                            gradMatch ? "badge-success" : "bg-error/10 text-error"
                          }`}
                        >
                          {selectedGradYear} Batch {gradMatch ? "Eligible" : "Excluded"}
                        </span>
                        <span
                          className={`badge text-[10px] font-bold tracking-tight uppercase ${
                            skillMatch ? "badge-success" : "bg-error/10 text-error"
                          }`}
                        >
                          {selectedSkill} {skillMatch ? "Eligible" : "Excluded"}
                        </span>
                      </div>

                      {/* Fit Assessment Banner */}
                      <div className="pt-3 border-t border-border/40 flex items-center justify-between text-xs">
                        {isFullyEligible ? (
                          <div className="flex items-center gap-1.5 text-success font-bold tracking-tight">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                            Matched: 100% Eligible
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-error font-semibold tracking-tight">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                            <span>
                              Ineligible: {!degreeMatch && "Degree mismatch"}
                              {degreeMatch && !gradMatch && "Batch mismatch"}
                              {degreeMatch && gradMatch && !skillMatch && `Requires ${opp.requiredSkills?.join(", ") || "Skills match"}`}
                            </span>
                          </div>
                        )}

                        {isFullyEligible && (
                          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                            Direct Apply Ready {'->'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              MOCK_OPPORTUNITIES_FALLBACK.map((opp) => {
                const degreeMatch = opp.degrees.includes("Any Degree") || opp.degrees.includes(selectedDegree);
                const gradMatch = opp.gradYears.includes(selectedGradYear);
                const skillMatch = opp.skills.includes(selectedSkill);
                const isFullyEligible = degreeMatch && gradMatch && skillMatch;

                return (
                  <div
                    key={opp.id}
                    className={`premium-card relative overflow-hidden transition-all duration-300 border ${
                      isFullyEligible
                        ? "border-success/35 bg-success/5 shadow-[0_4px_12px_rgba(34,197,94,0.06)]"
                        : "border-border/80 opacity-65"
                    }`}
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                            {opp.company}
                          </span>
                          <h4 className="text-sm md:text-base font-bold tracking-tight text-foreground">
                            {opp.title}
                          </h4>
                        </div>
                        <span className="text-xs font-bold text-foreground bg-muted px-2.5 py-1 rounded-md border border-border/40 whitespace-nowrap">
                          {opp.salaryRange}
                        </span>
                      </div>

                      {/* Eligibility details */}
                      <div className="flex flex-wrap gap-1.5">
                        <span
                          className={`badge text-[10px] font-bold tracking-tight uppercase ${
                            degreeMatch ? "badge-success" : "bg-error/10 text-error"
                          }`}
                        >
                          {selectedDegree} {degreeMatch ? "Eligible" : "Excluded"}
                        </span>
                        <span
                          className={`badge text-[10px] font-bold tracking-tight uppercase ${
                            gradMatch ? "badge-success" : "bg-error/10 text-error"
                          }`}
                        >
                          {selectedGradYear} Batch {gradMatch ? "Eligible" : "Excluded"}
                        </span>
                        <span
                          className={`badge text-[10px] font-bold tracking-tight uppercase ${
                            skillMatch ? "badge-success" : "bg-error/10 text-error"
                          }`}
                        >
                          {selectedSkill} {skillMatch ? "Eligible" : "Excluded"}
                        </span>
                      </div>

                      {/* Fit Assessment Banner */}
                      <div className="pt-3 border-t border-border/40 flex items-center justify-between text-xs">
                        {isFullyEligible ? (
                          <div className="flex items-center gap-1.5 text-success font-bold tracking-tight">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                            Matched: 100% Eligible
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-error font-semibold tracking-tight">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                            <span>
                              Ineligible: {!degreeMatch && "Degree mismatch"}
                              {degreeMatch && !gradMatch && "Batch mismatch"}
                              {degreeMatch && gradMatch && !skillMatch && `Requires ${opp.skills.join(" or ")}`}
                            </span>
                          </div>
                        )}

                        {isFullyEligible && (
                          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                            Direct Apply Ready {'->'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
