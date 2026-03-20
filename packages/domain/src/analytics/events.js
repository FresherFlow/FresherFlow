"use strict";
// @fresherflow/domain — Universal Analytics Events
// Unified event names and parameter structures for the platform.
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnalyticsEvent = void 0;
var AnalyticsEvent;
(function (AnalyticsEvent) {
    // Opportunity interactions
    AnalyticsEvent["JOB_VIEW"] = "job_view";
    AnalyticsEvent["APPLY_CLICK"] = "apply_click";
    AnalyticsEvent["SAVE_JOB"] = "save_job";
    AnalyticsEvent["SHARE_JOB"] = "share_job";
    // Growth & Referrals
    AnalyticsEvent["INVITE_SHARE"] = "invite_share_clicked";
    AnalyticsEvent["SIGNUP"] = "sign_up";
    AnalyticsEvent["LOGIN"] = "login";
    // Search & Filter
    AnalyticsEvent["SEARCH"] = "search";
    AnalyticsEvent["FILTER"] = "filter";
    // Profile Progress
    AnalyticsEvent["PROFILE_STEP"] = "profile_complete_step";
})(AnalyticsEvent || (exports.AnalyticsEvent = AnalyticsEvent = {}));
