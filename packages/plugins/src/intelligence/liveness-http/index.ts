
export { LivenessHttpService } from './liveness-http.service.js';
export {
  classifyBody,
  classifyHttpStatus,
  hasExpiredUrlMarker,
  matchesApplyControl,
  matchesBotChallenge,
  matchesExpiredText,
  matchesListingPage,
} from './liveness-heuristics.js';
export type { HeuristicOutcome } from './liveness-heuristics.js';
export {
  DEFAULT_BATCH_CONCURRENCY,
  DEFAULT_MIN_CONTENT_LENGTH,
  DEFAULT_TIMEOUT_MS,
  LIVENESS_ACCEPT_HEADER,
  LIVENESS_USER_AGENT,
} from './liveness-http.constants.js';
