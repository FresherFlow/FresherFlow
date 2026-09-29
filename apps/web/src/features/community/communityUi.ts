/**
 * Single switch for every user-facing community surface.
 *
 * Community (Discussions, Rooms, share-to-room, the landing page's
 * "Ask / Discuss" and "N discussing") is paused pending a rework of the model.
 * The reason is structural, not cosmetic:
 *
 *  - `Discussions` and `Rooms` render the same `CommunityPost` table - one
 *    unscoped, one scoped by `roomId` - with no stated boundary between them.
 *  - A reply to a post comment cannot deep-link to the post: `Notification`
 *    carries `opportunityId` and `commentId` (the latter a foreign key to
 *    `OpportunityComment`), and has no `postId` and no `roomId`. The reply
 *    itself is delivered with the excerpt in `payload`, so a reader is told
 *    something happened but cannot be taken to it. A real link needs a
 *    `communityPostCommentId` relation on `Notification`.
 *
 * Hiding is centralised here on purpose. Flipping a flag in the sidebar while
 * leaving a "Share to room" button and a hero CTA pointing into the paused area
 * is worse than not hiding anything: users can still walk in.
 *
 * Routes are deliberately NOT gated. `/community`, `/community/rooms`,
 * `/community/rooms/[slug]` and every `?tab=` value still resolve, so existing
 * bookmarks and inbound links do not 404. This flag hides entry points only.
 *
 * Flip to `true` to restore every surface at once.
 */
export const COMMUNITY_UI_ENABLED = false;
