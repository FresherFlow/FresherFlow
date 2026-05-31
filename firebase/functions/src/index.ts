import { getApps, initializeApp } from 'firebase-admin/app';
import { getDatabase } from 'firebase-admin/database';
import { getMessaging, type MulticastMessage } from 'firebase-admin/messaging';
import { onValueCreated } from 'firebase-functions/v2/database';

if (getApps().length === 0) initializeApp();

type CampaignRequest = {
  title?: unknown;
  body?: unknown;
  opportunityUrl?: unknown;
  companyLogoUrl?: unknown;
  requestedBy?: unknown;
};

type PushTokenRecord = {
  token?: unknown;
};

type AcceptedShareEvent = {
  userId?: unknown;
  outcome?: unknown;
  acceptedAt?: unknown;
};

const INVALID_TOKEN_CODES = new Set([
  'messaging/invalid-registration-token',
  'messaging/registration-token-not-registered',
]);

function optionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

export const dispatchNotificationCampaign = onValueCreated(
  '/notificationCampaignRequests/{campaignId}',
  async (event) => {
    const campaignId = event.params.campaignId;
    const campaign = (event.data.val() || {}) as CampaignRequest;
    const title = optionalString(campaign.title);
    const body = optionalString(campaign.body);

    if (!title || !body) {
      await event.data.ref.update({
        status: 'REJECTED',
        completedAt: Date.now(),
        error: 'title_and_body_required',
      });
      return;
    }

    const db = getDatabase();
    const usersSnapshot = await db.ref('/users').once('value');
    const users = (usersSnapshot.val() || {}) as Record<string, { pushTokens?: Record<string, PushTokenRecord> }>;
    const registrations: Array<{ path: string; token: string }> = [];

    for (const [userId, user] of Object.entries(users)) {
      for (const [tokenKey, value] of Object.entries(user.pushTokens || {})) {
        const token = optionalString(value.token);
        if (token) registrations.push({ path: `/users/${userId}/pushTokens/${tokenKey}`, token });
      }
    }

    const opportunityUrl = optionalString(campaign.opportunityUrl);
    const imageUrl = optionalString(campaign.companyLogoUrl);
    const chunks: Array<Array<{ path: string; token: string }>> = [];
    for (let index = 0; index < registrations.length; index += 500) {
      chunks.push(registrations.slice(index, index + 500));
    }

    let successCount = 0;
    let failureCount = 0;
    let removedInvalidTokens = 0;

    for (const chunk of chunks) {
      const message: MulticastMessage = {
        tokens: chunk.map(item => item.token),
        notification: {
          title,
          body,
          ...(imageUrl ? { imageUrl } : {}),
        },
        data: {
          campaignId,
          ...(opportunityUrl ? { url: opportunityUrl } : {}),
          ...(imageUrl ? { companyLogoUrl: imageUrl } : {}),
        },
        android: {
          priority: 'high',
          notification: {
            channelId: 'matches',
            ...(imageUrl ? { imageUrl } : {}),
          },
        },
      };

      const result = await getMessaging().sendEachForMulticast(message);
      successCount += result.successCount;
      failureCount += result.failureCount;

      await Promise.all(result.responses.map(async (response, index) => {
        if (response.success || !response.error || !INVALID_TOKEN_CODES.has(response.error.code)) return;
        await db.ref(chunk[index].path).remove();
        removedInvalidTokens++;
      }));
    }

    const summary = {
      status: 'SENT',
      title,
      body,
      requestedBy: optionalString(campaign.requestedBy) || null,
      completedAt: Date.now(),
      recipientCount: registrations.length,
      successCount,
      failureCount,
      removedInvalidTokens,
    };

    await Promise.all([
      event.data.ref.update(summary),
      db.ref(`/notificationCampaignDeliveries/${campaignId}`).set(summary),
    ]);
  },
);

export const updateContributorLeaderboard = onValueCreated(
  '/acceptedShareEvents/{eventId}',
  async (event) => {
    const eventId = event.params.eventId;
    const contribution = (event.data.val() || {}) as AcceptedShareEvent;
    const userId = optionalString(contribution.userId);
    const outcome = optionalString(contribution.outcome);

    if (!userId || (outcome !== 'DEDUPED' && outcome !== 'PUBLISHED')) {
      await event.data.ref.update({
        status: 'REJECTED',
        processedAt: Date.now(),
        error: 'invalid_accepted_share_event',
      });
      return;
    }

    const acceptedAt = typeof contribution.acceptedAt === 'number'
      ? contribution.acceptedAt
      : Date.now();
    const contributorRef = getDatabase().ref(`/leaderboards/contributors/${userId}`);

    await contributorRef.transaction((currentValue) => {
      const current = (currentValue || {}) as Record<string, unknown>;
      const processedEvents = (current.processedEvents || {}) as Record<string, boolean>;
      if (processedEvents[eventId]) return current;

      return {
        ...current,
        acceptedShareCount: Number(current.acceptedShareCount || 0) + 1,
        publishedShareCount: Number(current.publishedShareCount || 0) + (outcome === 'PUBLISHED' ? 1 : 0),
        duplicateDiscoveryCount: Number(current.duplicateDiscoveryCount || 0) + (outcome === 'DEDUPED' ? 1 : 0),
        lastAcceptedAt: acceptedAt,
        processedEvents: {
          ...processedEvents,
          [eventId]: true,
        },
      };
    });

    await event.data.ref.update({
      status: 'PROCESSED',
      processedAt: Date.now(),
    });
  },
);
