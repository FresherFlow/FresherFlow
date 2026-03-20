"use strict";
// @fresherflow/domain — Central Domain Logic
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getOpportunityPathFromItem = exports.getDetailShareUrl = exports.buildLoginFromDetailHref = exports.normalizeSalaryInput = exports.isNotEligible = exports.calculateOpportunityMatch = exports.buildShareUrl = exports.getTrackerOptions = exports.getCurrentActionType = exports.isClosingSoon = exports.isExpired = exports.formatLpaValue = exports.sortTimelineEvents = exports.getRelatedOpportunities = exports.buildEligibilitySnapshot = exports.getEducationDetails = exports.formatDeadline = exports.getListingState = exports.getOpportunityDisplaySalary = exports.parseOpportunityLocation = exports.formatTimeText12Hour = exports.formatDisplayDate = exports.formatExperienceRange = exports.formatSalaryRange = void 0;
// Eligibility & Matching
__exportStar(require("./eligibility/match"), exports);
__exportStar(require("./eligibility/rules"), exports);
__exportStar(require("./eligibility/academic-normalization"), exports);
__exportStar(require("./eligibility/skill-normalization"), exports);
// Profile
__exportStar(require("./profile/completion"), exports);
__exportStar(require("./profile/constants"), exports);
__exportStar(require("./profile/validation"), exports);
// Opportunity
__exportStar(require("./opportunity/normalization"), exports);
__exportStar(require("./opportunity/display"), exports);
__exportStar(require("./opportunity/routing"), exports);
__exportStar(require("./opportunity/events"), exports);
// Analytics
__exportStar(require("./analytics/events"), exports);
__exportStar(require("./analytics/funnel"), exports);
// Ingestion
__exportStar(require("./ingestion/dedupe"), exports);
// Notifications
__exportStar(require("./notifications/logic"), exports);
// Alerts
__exportStar(require("./alerts/logic"), exports);
// Referral & Invites
__exportStar(require("./referral/routing"), exports);
var display_1 = require("./opportunity/display");
Object.defineProperty(exports, "formatSalaryRange", { enumerable: true, get: function () { return display_1.formatSalaryRange; } });
Object.defineProperty(exports, "formatExperienceRange", { enumerable: true, get: function () { return display_1.formatExperienceRange; } });
Object.defineProperty(exports, "formatDisplayDate", { enumerable: true, get: function () { return display_1.formatDisplayDate; } });
Object.defineProperty(exports, "formatTimeText12Hour", { enumerable: true, get: function () { return display_1.formatTimeText12Hour; } });
Object.defineProperty(exports, "parseOpportunityLocation", { enumerable: true, get: function () { return display_1.parseOpportunityLocation; } });
Object.defineProperty(exports, "getOpportunityDisplaySalary", { enumerable: true, get: function () { return display_1.getOpportunityDisplaySalary; } });
Object.defineProperty(exports, "getListingState", { enumerable: true, get: function () { return display_1.getListingState; } });
Object.defineProperty(exports, "formatDeadline", { enumerable: true, get: function () { return display_1.formatDeadline; } });
Object.defineProperty(exports, "getEducationDetails", { enumerable: true, get: function () { return display_1.getEducationDetails; } });
Object.defineProperty(exports, "buildEligibilitySnapshot", { enumerable: true, get: function () { return display_1.buildEligibilitySnapshot; } });
Object.defineProperty(exports, "getRelatedOpportunities", { enumerable: true, get: function () { return display_1.getRelatedOpportunities; } });
Object.defineProperty(exports, "sortTimelineEvents", { enumerable: true, get: function () { return display_1.sortTimelineEvents; } });
Object.defineProperty(exports, "formatLpaValue", { enumerable: true, get: function () { return display_1.formatLpaValue; } });
Object.defineProperty(exports, "isExpired", { enumerable: true, get: function () { return display_1.isExpired; } });
Object.defineProperty(exports, "isClosingSoon", { enumerable: true, get: function () { return display_1.isClosingSoon; } });
Object.defineProperty(exports, "getCurrentActionType", { enumerable: true, get: function () { return display_1.getCurrentActionType; } });
Object.defineProperty(exports, "getTrackerOptions", { enumerable: true, get: function () { return display_1.getTrackerOptions; } });
Object.defineProperty(exports, "buildShareUrl", { enumerable: true, get: function () { return display_1.buildShareUrl; } });
var match_1 = require("./eligibility/match");
Object.defineProperty(exports, "calculateOpportunityMatch", { enumerable: true, get: function () { return match_1.calculateOpportunityMatch; } });
Object.defineProperty(exports, "isNotEligible", { enumerable: true, get: function () { return match_1.isNotEligible; } });
var normalization_1 = require("./opportunity/normalization");
Object.defineProperty(exports, "normalizeSalaryInput", { enumerable: true, get: function () { return normalization_1.normalizeSalaryInput; } });
var routing_1 = require("./opportunity/routing");
Object.defineProperty(exports, "buildLoginFromDetailHref", { enumerable: true, get: function () { return routing_1.buildLoginFromDetailHref; } });
Object.defineProperty(exports, "getDetailShareUrl", { enumerable: true, get: function () { return routing_1.getDetailShareUrl; } });
Object.defineProperty(exports, "getOpportunityPathFromItem", { enumerable: true, get: function () { return routing_1.getOpportunityPathFromItem; } });
