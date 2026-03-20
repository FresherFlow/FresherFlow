// Shared Types - Single Source of Truth
// Apps can import from here. This package NEVER imports from apps.
// ========================================
// ENUMS - Match Prisma schema exactly
// ========================================
export var OpportunityType;
(function (OpportunityType) {
    OpportunityType["JOB"] = "JOB";
    OpportunityType["INTERNSHIP"] = "INTERNSHIP";
    OpportunityType["WALKIN"] = "WALKIN";
})(OpportunityType || (OpportunityType = {}));
export var Role;
(function (Role) {
    Role["USER"] = "USER";
    Role["ADMIN"] = "ADMIN";
})(Role || (Role = {}));
export var OpportunityStatus;
(function (OpportunityStatus) {
    OpportunityStatus["DRAFT"] = "DRAFT";
    OpportunityStatus["PUBLISHED"] = "PUBLISHED";
    OpportunityStatus["ARCHIVED"] = "ARCHIVED";
    OpportunityStatus["EXPIRED"] = "EXPIRED";
})(OpportunityStatus || (OpportunityStatus = {}));
export var EducationLevel;
(function (EducationLevel) {
    EducationLevel["DIPLOMA"] = "DIPLOMA";
    EducationLevel["DEGREE"] = "DEGREE";
    EducationLevel["PG"] = "PG";
})(EducationLevel || (EducationLevel = {}));
export var WorkMode;
(function (WorkMode) {
    WorkMode["ONSITE"] = "ONSITE";
    WorkMode["HYBRID"] = "HYBRID";
    WorkMode["REMOTE"] = "REMOTE";
})(WorkMode || (WorkMode = {}));
export var SalaryPeriod;
(function (SalaryPeriod) {
    SalaryPeriod["MONTHLY"] = "MONTHLY";
    SalaryPeriod["YEARLY"] = "YEARLY";
})(SalaryPeriod || (SalaryPeriod = {}));
export var Availability;
(function (Availability) {
    Availability["IMMEDIATE"] = "IMMEDIATE";
    Availability["DAYS_15"] = "DAYS_15";
    Availability["MONTH_1"] = "MONTH_1";
})(Availability || (Availability = {}));
export var ActionType;
(function (ActionType) {
    ActionType["APPLIED"] = "APPLIED";
    ActionType["PLANNED"] = "PLANNED";
    ActionType["INTERVIEWED"] = "INTERVIEWED";
    ActionType["SELECTED"] = "SELECTED";
    ActionType["VIEWED"] = "VIEWED";
    // Backward-compatible legacy values
    ActionType["PLANNING"] = "PLANNING";
    ActionType["ATTENDED"] = "ATTENDED";
    ActionType["NOT_ELIGIBLE"] = "NOT_ELIGIBLE";
})(ActionType || (ActionType = {}));
export var OpportunityEventType;
(function (OpportunityEventType) {
    OpportunityEventType["NOTIFICATION"] = "NOTIFICATION";
    OpportunityEventType["REG_START"] = "REG_START";
    OpportunityEventType["REG_END"] = "REG_END";
    OpportunityEventType["EXAM_DATE"] = "EXAM_DATE";
    OpportunityEventType["RESULT"] = "RESULT";
    OpportunityEventType["INTERVIEW"] = "INTERVIEW";
    OpportunityEventType["DOC_VERIFICATION"] = "DOC_VERIFICATION";
    OpportunityEventType["OTHER"] = "OTHER";
})(OpportunityEventType || (OpportunityEventType = {}));
export var FeedbackReason;
(function (FeedbackReason) {
    FeedbackReason["EXPIRED"] = "EXPIRED";
    FeedbackReason["LINK_BROKEN"] = "LINK_BROKEN";
    FeedbackReason["DUPLICATE"] = "DUPLICATE";
    FeedbackReason["INACCURATE"] = "INACCURATE";
})(FeedbackReason || (FeedbackReason = {}));
export var AppFeedbackType;
(function (AppFeedbackType) {
    AppFeedbackType["BUG"] = "BUG";
    AppFeedbackType["IDEA"] = "IDEA";
    AppFeedbackType["PRAISE"] = "PRAISE";
    AppFeedbackType["OTHER"] = "OTHER";
})(AppFeedbackType || (AppFeedbackType = {}));
export var LinkHealth;
(function (LinkHealth) {
    LinkHealth["HEALTHY"] = "HEALTHY";
    LinkHealth["BROKEN"] = "BROKEN";
    LinkHealth["RETRYING"] = "RETRYING";
})(LinkHealth || (LinkHealth = {}));
export var SocialPlatform;
(function (SocialPlatform) {
    SocialPlatform["X"] = "X";
    SocialPlatform["LINKEDIN"] = "LINKEDIN";
    SocialPlatform["FACEBOOK"] = "FACEBOOK";
})(SocialPlatform || (SocialPlatform = {}));
export var SocialPostStatus;
(function (SocialPostStatus) {
    SocialPostStatus["PENDING"] = "PENDING";
    SocialPostStatus["PUBLISHED"] = "PUBLISHED";
    SocialPostStatus["FAILED"] = "FAILED";
    SocialPostStatus["DISABLED"] = "DISABLED";
    SocialPostStatus["DRY_RUN"] = "DRY_RUN";
})(SocialPostStatus || (SocialPostStatus = {}));
//# sourceMappingURL=index.js.map