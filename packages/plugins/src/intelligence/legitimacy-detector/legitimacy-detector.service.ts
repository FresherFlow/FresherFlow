
export interface LegitimacyVerdict {
  state: 'verified' | 'likely' | 'uncertain';
  reasons: string[];
  checkedAt: string;
}

export interface LegitimacyInput {
  redirectsOffPlatform?: boolean;
  sourceCount: number;
  isFromAts?: boolean;
  hasCompensation?: boolean;
  descriptionLength: number;
  hasCompanyLogo?: boolean;
}

export interface ILegitimacyChecker {
  assess(input: LegitimacyInput): LegitimacyVerdict;
  assessBatch(inputs: LegitimacyInput[]): LegitimacyVerdict[];
}

/**
 * Deterministic, explainable posting-legitimacy scorer (Spec 740).
 *
 * Pure + in-memory: classifies how likely a posting is genuine from corpus signals already known
 * about it. `uncertain` is the conservative default; `verified` requires strong corroboration.
 * Orthogonal to fit and to liveness. Never throws.
 */

export class LegitimacyDetectorService implements ILegitimacyChecker {
  assess(input: LegitimacyInput): LegitimacyVerdict {
    const checkedAt = new Date().toISOString();

    // An off-platform apply redirect is a strong negative — short-circuit to uncertain.
    if (input.redirectsOffPlatform) {
      return {
        state: 'uncertain',
        reasons: ['Apply URL redirects off-platform.'],
        checkedAt,
      };
    }

    // Strong corroboration → verified.
    if (input.sourceCount >= 3) {
      return {
        state: 'verified',
        reasons: [`Observed on ${input.sourceCount} independent sources.`],
        checkedAt,
      };
    }
    if (input.isFromAts && input.hasCompensation) {
      return {
        state: 'verified',
        reasons: ['Sourced from an ATS with disclosed compensation.'],
        checkedAt,
      };
    }

    // Otherwise weigh concerns against mild positives.
    const reasons: string[] = [];
    let concerns = 0;
    if (!input.hasCompensation) {
      reasons.push('No compensation disclosed.');
      concerns += 1;
    }
    if (input.descriptionLength < 300) {
      reasons.push('Very thin job description.');
      concerns += 1;
    }
    if (!input.hasCompanyLogo) {
      reasons.push('Sparse company profile (no logo).');
      concerns += 1;
    }

    const hasPositiveSignal =
      input.isFromAts || input.sourceCount >= 2 || input.hasCompensation;
    if (input.isFromAts) reasons.push('Sourced from an ATS.');
    if (input.sourceCount >= 2) reasons.push(`Observed on ${input.sourceCount} sources.`);

    if (concerns >= 2 && !hasPositiveSignal) {
      return { state: 'uncertain', reasons, checkedAt };
    }
    if (hasPositiveSignal) {
      return {
        state: 'likely',
        reasons: reasons.length
          ? reasons
          : ['Has compensation and a substantive description.'],
        checkedAt,
      };
    }
    return { state: 'uncertain', reasons, checkedAt };
  }

  assessBatch(inputs: LegitimacyInput[]): LegitimacyVerdict[] {
    return inputs.map((input) => this.assess(input));
  }
}
