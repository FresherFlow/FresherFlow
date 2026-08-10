
export { LivenessHttpService } from './liveness-http.service';
export {
  HeuristicOutcome,
  classifyBody,
  classifyHttpStatus,
  hasExpiredUrlMarker,
  matchesApplyControl,
  matchesBotChallenge,
  matchesExpiredText,
  matchesListingPage,
} from './liveness-heuristics';
export {
  DEFAULT_BATCH_CONCURRENCY,
  DEFAULT_MIN_CONTENT_LENGTH,
  DEFAULT_TIMEOUT_MS,
  LIVENESS_ACCEPT_HEADER,
  LIVENESS_USER_AGENT,
} from './liveness-http.constants';
