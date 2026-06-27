"use client";

import React, { useState } from "react";
import { Opportunity, EducationLevel } from "@fresherflow/types";
import { EducationMetadata } from "@/lib/api/cdnFeed";
import JobCard from "@/features/opportunities/components/JobCard";


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
  
  // Extract unique degrees dynamically from opportunities or metadata
  const degreesOptions = React.useMemo(() => {
    const fromMetadata = educationMetadata?.courses?.DEGREE?.slice(0, 5).map(c => c.replace(" / B.E.", "")) || [];
    if (fromMetadata.length > 0) return fromMetadata;

    if (opportunities && opportunities.length > 0) {
      const degrees = new Set<string>();
      opportunities.forEach(opp => {
        opp.allowedCourses?.forEach(c => {
          const cleaned = c.replace(" / B.E.", "").trim();
          if (cleaned) degrees.add(cleaned);
        });
      });
      const list = Array.from(degrees).slice(0, 5);
      if (list.length > 0) return list;
    }
    return ["B.Tech", "BCA", "BBA", "B.Sc", "M.Tech"];
  }, [educationMetadata, opportunities]);

  // Compute dynamic graduation batches dynamically from opportunities or default
  const gradYearsOptions = React.useMemo(() => {
    if (opportunities && opportunities.length > 0) {
      const years = new Set<number>();
      opportunities.forEach(opp => {
        opp.allowedPassoutYears?.forEach(y => {
          if (y) years.add(y);
        });
      });
      const list = Array.from(years).sort((a, b) => a - b).slice(0, 4);
      if (list.length > 0) return list;
    }
    return [currentYear - 1, currentYear, currentYear + 1];
  }, [opportunities, currentYear]);

  // Stable, consistent skillsOptions sourced from metadata or high-end default list
  const skillsOptions = React.useMemo(() => {
    const fromMetadata = skillsMetadata && skillsMetadata.length > 0
      ? skillsMetadata
          .filter(s => !["communication skills", "problem solving", "analytical skills", "soft skills"].includes(s.toLowerCase()))
          .slice(0, 5)
          .map(s => s.charAt(0).toUpperCase() + s.slice(1))
      : [];
    if (fromMetadata.length > 0) return fromMetadata;

    return ["React", "Python", "SQL", "JavaScript", "Excel"];
  }, [skillsMetadata]);

  // Selection Profile States
  const [selectedDegree, setSelectedDegree] = useState("B.Tech");
  const [selectedGradYear, setSelectedGradYear] = useState<number>(currentYear);
  const [selectedSkill, setSelectedSkill] = useState("React");

  // Keep selected states in sync when selection lists change
  React.useEffect(() => {
    if (degreesOptions.length > 0 && !degreesOptions.includes(selectedDegree)) {
       
      setSelectedDegree(degreesOptions[0] || "B.Tech");
    }
  }, [degreesOptions, selectedDegree]);

  React.useEffect(() => {
    if (gradYearsOptions.length > 0 && !gradYearsOptions.includes(selectedGradYear)) {
       
      setSelectedGradYear(gradYearsOptions[0] || currentYear);
    }
  }, [gradYearsOptions, selectedGradYear, currentYear]);

  React.useEffect(() => {
    if (skillsOptions.length > 0 && !skillsOptions.includes(selectedSkill)) {
       
      setSelectedSkill(skillsOptions[0] || "React");
    }
  }, [skillsOptions, selectedSkill]);

  // expected level for degree mapping
  const expectedLevel = selectedDegree === "M.Tech" ? "PG" : "DEGREE";

  // Process all opportunities, score their match, and sort by highest matches
  const processedOpps = React.useMemo(() => {
    if (!opportunities || opportunities.length === 0) return [];
    
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

    // Show fully eligible first, then sort by match score descending
    return mapped.sort((a, b) => {
      if (a.isFullyEligible && !b.isFullyEligible) return -1;
      if (!a.isFullyEligible && b.isFullyEligible) return 1;
      return b.matchScore - a.matchScore;
    });
  }, [opportunities, selectedDegree, selectedGradYear, selectedSkill, expectedLevel]);

  const renderedOpps = React.useMemo(() => {
    // Filter to show opportunities matching the hard academic criteria (degree & grad batch)
    // based on left side settings
    let filtered = processedOpps.filter(item => item.degreeMatch && item.gradMatch);
    
    // Fallback if no jobs match both hard criteria perfectly
    if (filtered.length === 0) {
      filtered = processedOpps.filter(item => item.degreeMatch || item.gradMatch);
    }
    
    // Ultimate fallback to ensure a robust feed
    if (filtered.length === 0) {
      filtered = processedOpps;
    }
    
    return filtered.slice(0, 20); // Render up to 20 compact scrollable jobs
  }, [processedOpps]);

  return (
    <div className="w-full rounded-3xl border border-border bg-card/60 backdrop-blur-md p-5 sm:p-6 md:p-8 shadow-xl relative overflow-hidden">
      <div className="max-w-5xl mx-auto relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-[0.4fr_0.6fr] gap-8 items-start">
          {/* Controls Profile Cockpit */}
          <div className="rounded-2xl border border-border bg-muted/30 p-5 space-y-6">
            <h3 className="text-sm font-bold tracking-tight uppercase tracking-wider text-muted-foreground">
              Your Academic Profile
            </h3>

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

          {/* Interactive Match Feed with a scrollable container */}
          <div className="space-y-3 max-h-[440px] min-h-[440px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
            {opportunities && opportunities.length > 0 ? (
              renderedOpps.map(({ opp }) => {
                return (
                  <JobCard
                    key={opp.id}
                    job={{
                      ...opp,
                      normalizedRole: opp.title,
                      salary: (opp.salaryMin !== undefined && opp.salaryMax !== undefined) ? { min: opp.salaryMin, max: opp.salaryMax } : undefined,
                    }}
                    jobId={opp.id}
                    isApplied={(opp.actions || []).some((a: { actionType: string }) => a.actionType === 'APPLIED')}
                  />
                );
              })
            ) : (
              <div className="flex flex-col items-center justify-center border border-dashed border-border rounded-2xl bg-muted/10 h-[440px] space-y-2">
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
