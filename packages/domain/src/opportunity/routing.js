"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildLoginFromDetailHref = buildLoginFromDetailHref;
exports.getDetailShareUrl = getDetailShareUrl;
exports.getOpportunityPathFromItem = getOpportunityPathFromItem;
const display_1 = require("./display");
function buildLoginFromDetailHref(detailPath, sourceParam, refParam) {
    const fromShare = refParam === 'share' || sourceParam === 'opportunity_share';
    const loginSource = fromShare ? 'opportunity_share' : 'opportunity_detail';
    return `/login?redirect=${encodeURIComponent(detailPath)}&source=${encodeURIComponent(loginSource)}&intent=signup`;
}
function getDetailShareUrl(currentUrl) {
    return (0, display_1.buildShareUrl)(currentUrl, {
        platform: 'other',
        source: 'opportunity_share',
        medium: 'share',
        campaign: 'opportunity_share',
        ref: 'share',
    });
}
function getOpportunityPathFromItem(item) {
    return `/opportunities/${item.slug || item.id}`;
}
