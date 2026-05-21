"use client";

import React, { useState } from "react";
import { Opportunity, EducationLevel } from "@fresherflow/types";
import Link from "next/link";
import { getOpportunityPath } from "@/lib/opportunityPath";
import { EducationMetadata } from "@/lib/api/cdnFeed";


interface EligibilityMatcherProps {
  opportunities?: Opportunity[];
  educationMetadata?: EducationMetadata;
  skillsMetadata?: string[];
}

export function EligibilityMatcher({ 
  opportunities, 
  educationMetadata, 
  skillsMetadata 
}: EligibilityMatcherProps) {
  const currentYear = new Date().getFullYear();
  
  // Extract and format dynamic degrees from CDN education.json
  const degreesOptions = educationMetadata?.courses?.DEGREE
    ? educationMetadata.courses.DEGREE.slice(0, 5).map(c => c.replace(" / B.E.", ""))
    : ["B.Tech", "BCA", "BBA", "B.Sc", "M.Tech"];

  // Compute dynamic batches (current-1, current, current+1)
  const gradYearsOptions = [currentYear - 1, currentYear, currentYear + 1];

  // Extract dynamic skills from CDN skills.json, filtering generic soft skills
  const skillsOptions = skillsMetadata && skillsMetadata.length > 0
    ? skillsMetadata
        .filter(s => !["communication skills", "problem solving", "analytical skills"].includes(s))
        .slice(0, 5)
        .map(s => s.charAt(0).toUpperCase() + s.slice(1))
    : ["React", "Python", "SQL", "JavaScript", "Excel"];

  const [selectedDegree, setSelectedDegree] = useState(degreesOptions[0] || "B.Tech");
  const [selectedGradYear, setSelectedGradYear] = useState<number>(gradYearsOptions[1] || 2026);
  const [selectedSkill, setSelectedSkill] = useState(skillsOptions[0] || "React");

  const expectedLevel = selectedDegree === "M.Tech" ? "PG" : "DEGREE";
  
  const processedOpps = React.useMemo(() => {
    if (!opportunities) return [];
    
    const mapped = opportunities.map(opp => {
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

      const isFullyEligible = !!(degreeMatch && gradMatch && skillMatch);
      
      let matchScore = 0;
      if (degreeMatch) matchScore += 1;
      if (gradMatch) matchScore += 1;
      if (skillMatch) matchScore += 1;

      return { opp, degreeMatch: !!degreeMatch, gradMatch: !!gradMatch, skillMatch: !!skillMatch, isFullyEligible, matchScore };
    });

    return mapped.sort((a, b) => b.matchScore - a.matchScore);
  }, [opportunities, selectedDegree, selectedGradYear, selectedSkill, expectedLevel]);

  return (
    <div className="w-full rounded-3xl border border-border bg-card/60 backdrop-blur-md p-5 sm:p-6 md:p-8 shadow-xl relative overflow-hidden">
      <div className="max-w-5xl mx-auto space-y-8 relative z-10">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-border bg-muted/50 text-[10px] uppercase tracking-widest font-semibold text-muted-foreground">
            Smart Fit Sandbox
          </div>
          <h3 className="text-xl md:text-2xl font-bold tracking-tight">
            Stop Reading Long Job Specs - Fit Instantly
          </h3>
          <p className="text-sm text-muted-foreground max-w-xl mx-auto">
            Traditional job boards make you scroll through long job descriptions just to check eligibility. Select your degree, batch, and skills to instantly see matching opportunities.
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
            {processedOpps && processedOpps.length > 0 ? (
              processedOpps.slice(0, 3).map(({ opp, degreeMatch, gradMatch, skillMatch, isFullyEligible }) => {
                // Format salary beautifully from CDN fields
                let salaryText = "";
                if (opp.salaryRange) {
                  salaryText = opp.salaryRange;
                } else if (opp.salaryMin && opp.salaryMax) {
                  const minL = Math.round(opp.salaryMin / 100000);
                  const maxL = Math.round(opp.salaryMax / 100000);
                  salaryText = `Rs. ${minL}L - Rs. ${maxL}L LPA`;
                }

                return (
                  <Link
                    key={opp.id}
                    href={getOpportunityPath(opp.type, opp.slug || opp.id)}
                    className={`block premium-card relative overflow-hidden transition-all duration-300 border hover:border-primary/45 hover:shadow-md ${
                      isFullyEligible
                        ? "border-success/45 bg-success/[0.03] shadow-sm"
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
                        {salaryText && (
                          <span className="text-xs font-bold text-foreground bg-muted px-2.5 py-1 rounded-md border border-border/40 whitespace-nowrap">
                            {salaryText}
                          </span>
                        )}
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
                      <div className="pt-3 border-t border-border/40 flex flex-col sm:flex-row sm:items-center gap-2 justify-between text-xs">
                        {isFullyEligible ? (
                          <div className="flex items-center gap-1.5 text-success font-bold tracking-tight">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                            Eligibility Confirmed
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
                          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground group-hover:text-primary transition-colors">
                            Apply Directly
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                );
              })
            ) : (
              <div className="flex flex-col items-center justify-center p-8 text-center border border-dashed border-border rounded-2xl bg-muted/10 space-y-2">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                <span className="text-xs font-semibold text-muted-foreground">Loading live verified opportunities...</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
