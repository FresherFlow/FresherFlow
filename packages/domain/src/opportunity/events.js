"use strict";
// Domain Events — Clear contracts for state changes
// Emitted by the domain layer, consumed by infrastructure/queue
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpportunityEvent = void 0;
var OpportunityEvent;
(function (OpportunityEvent) {
    OpportunityEvent["CREATED"] = "opportunity.created";
    OpportunityEvent["UPDATED"] = "opportunity.updated";
    OpportunityEvent["PUBLISHED"] = "opportunity.published";
    OpportunityEvent["EXPIRED"] = "opportunity.expired";
    OpportunityEvent["ARCHIVED"] = "opportunity.archived";
    OpportunityEvent["REJECTED"] = "opportunity.rejected";
})(OpportunityEvent || (exports.OpportunityEvent = OpportunityEvent = {}));
