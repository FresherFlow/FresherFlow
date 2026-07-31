import { Country, getCountryDisplayName } from '../enums/country.enum';

export class LocationDto {
  country?: Country | string | null;
  city?: string | null;
  state?: string | null;

  constructor(partial?: Partial<LocationDto>) {
    Object.assign(this, partial);
  }

  displayLocation(): string {
    const parts: string[] = [];
    if (this.city) parts.push(this.city);
    if (this.state) parts.push(this.state);
    if (typeof this.country === 'string') {
      parts.push(this.country);
    } else if (
      this.country &&
      this.country !== Country.US_CANADA &&
      this.country !== Country.WORLDWIDE
    ) {
      parts.push(getCountryDisplayName(this.country));
    }
    return parts.join(', ');
  }
}
