export class ScraperException extends Error {
  constructor(message: string) { super(message); this.name = 'ScraperException'; }
}
export class GlassdoorException extends ScraperException {
  constructor(message = 'Glassdoor scraping failed') { super(message); this.name = 'GlassdoorException'; }
}
export class LinkedInException extends ScraperException {
  constructor(message = 'LinkedIn scraping failed') { super(message); this.name = 'LinkedInException'; }
}
export class IndeedException extends ScraperException {
  constructor(message = 'Indeed scraping failed') { super(message); this.name = 'IndeedException'; }
}
export class NaukriException extends ScraperException {
  constructor(message = 'Naukri scraping failed') { super(message); this.name = 'NaukriException'; }
}
export class RateLimitException extends ScraperException {
  constructor(message = 'Rate limit exceeded') { super(message); this.name = 'RateLimitException'; }
}
export class AuthenticationException extends ScraperException {
  constructor(message = 'Authentication failed') { super(message); this.name = 'AuthenticationException'; }
}
export class NetworkException extends ScraperException {
  constructor(message = 'Network error') { super(message); this.name = 'NetworkException'; }
}