import { CompensationInterval } from '../enums/compensation-interval.enum';

export class CompensationDto {
  interval?: CompensationInterval | null;
  minAmount?: number | null;
  maxAmount?: number | null;
  currency?: string;

  constructor(partial?: Partial<CompensationDto>) {
    this.currency = 'USD';
    if (partial) {
      const clean = Object.fromEntries(
        Object.entries(partial).filter(([, v]) => v !== undefined),
      );
      Object.assign(this, clean);
    }
  }
}
