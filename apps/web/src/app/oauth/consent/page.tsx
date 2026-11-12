import type { Metadata } from 'next';
import Link from 'next/link';
import { API_URL } from '@/lib/utils/runtimeConfig';
import { Button } from '@/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/ui/Card';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
    title: { absolute: 'Connect to FresherFlow' },
    robots: { index: false, follow: false },
    // The consent token travels in this page's URL, so nothing navigating away
    // from it may carry the full URL as a referrer.
    referrer: 'no-referrer',
};

interface ConsentPageProps {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

interface ConsentRequest {
    clientId: string;
    redirectUri: string;
    codeChallenge: string;
    state: string;
    scope: string;
    resource: string;
    consentToken: string;
    clientName: string;
    account: string;
}

function readParam(source: Record<string, string | string[] | undefined>, key: string): string {
    const value = source[key];
    return typeof value === 'string' ? value : '';
}

/**
 * The absolute API origin this form must post back to, or `''` when it cannot
 * be built. The API reads `API_URL` / `PUBLIC_API_URL`; the browser bundle gets
 * the same origin inlined as `NEXT_PUBLIC_API_URL` by `next.config.ts`.
 */
function consentAction(): string {
    if (!API_URL) return '';
    try {
        return new URL('/oauth/authorize', API_URL).toString();
    } catch {
        return '';
    }
}

/**
 * Where "Sign in again" goes on the API's `error=session_expired` handoff.
 *
 * That handoff carries the authorization request but no `consent_token` (it
 * grants nothing), so the link rebuilds the original `<api>/oauth/authorize`
 * URL — with `response_type`, which the API's own login handoff sets too —
 * and the login screen returns the browser there after a fresh sign-in. No
 * `oauth_retry`: the marker belongs to the API's automatic bounce, and this
 * path only moves on an explicit click, which is what keeps the
 * /login <-> /oauth/authorize cycle from redirecting on its own.
 *
 * Returns `''` when the forwarded request cannot produce a valid return leg,
 * so the caller falls through to the invalid-request state below.
 */
function signInAgainUrl(source: Record<string, string | string[] | undefined>): string {
    if (!API_URL) return '';
    const clientId = readParam(source, 'client_id');
    const redirectUri = readParam(source, 'redirect_uri');
    const codeChallenge = readParam(source, 'code_challenge');
    if (!clientId || !redirectUri || !codeChallenge) return '';
    try {
        const authorizeUrl = new URL('/oauth/authorize', API_URL);
        authorizeUrl.searchParams.set('response_type', 'code');
        authorizeUrl.searchParams.set('client_id', clientId);
        authorizeUrl.searchParams.set('redirect_uri', redirectUri);
        authorizeUrl.searchParams.set('code_challenge', codeChallenge);
        const state = readParam(source, 'state');
        if (state) authorizeUrl.searchParams.set('state', state);
        const scope = readParam(source, 'scope');
        if (scope) authorizeUrl.searchParams.set('scope', scope);
        const resource = readParam(source, 'resource');
        if (resource) authorizeUrl.searchParams.set('resource', resource);
        // Same-origin, so it stays a path; the login form reads `redirect`,
        // and isSafeInternalRedirect allows this one absolute API URL.
        const loginQuery = new URLSearchParams({ redirect: authorizeUrl.toString() });
        return `/login?${loginQuery.toString()}`;
    } catch {
        return '';
    }
}

/**
 * Read the authorization request the API forwarded here.
 *
 * Returns null when the request can never produce a valid decision: the API
 * validates `client_id`, `redirect_uri` and `code_challenge` and mints
 * `consent_token` as an HMAC over exactly those parameters, so a missing one
 * means the POST below would only ever be rejected.
 */
function readConsentRequest(
    source: Record<string, string | string[] | undefined>
): ConsentRequest | null {
    const clientId = readParam(source, 'client_id');
    const redirectUri = readParam(source, 'redirect_uri');
    const codeChallenge = readParam(source, 'code_challenge');
    const consentToken = readParam(source, 'consent_token');
    if (!clientId || !redirectUri || !codeChallenge || !consentToken) return null;

    return {
        clientId,
        redirectUri,
        codeChallenge,
        state: readParam(source, 'state'),
        scope: readParam(source, 'scope'),
        resource: readParam(source, 'resource'),
        consentToken,
        clientName: readParam(source, 'client_name') || 'An AI assistant',
        account: readParam(source, 'account') || 'your FresherFlow account',
    };
}

export default async function OAuthConsentPage({ searchParams }: ConsentPageProps) {
    const source = await searchParams;
    const request = readConsentRequest(source);
    const action = consentAction();

    // The API's session-expired handoff. It has no consent_token, so it is not
    // a consent form — and it must not read as "Invalid request" either: the
    // request is intact, only the session is gone. Forwarded text renders as
    // text here, and the onward step is a sign-in click, never an automatic
    // bounce back to /oauth/authorize.
    const expiredSignInUrl =
        readParam(source, 'error') === 'session_expired' ? signInAgainUrl(source) : '';

    if (expiredSignInUrl) {
        return (
            <main className="flex min-h-svh items-center justify-center bg-background px-4 py-10">
                <Card className="w-full max-w-md">
                    <CardHeader>
                        <CardTitle>Your session expired</CardTitle>
                        <CardDescription>
                            Sign in again to connect this app to FresherFlow.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button asChild className="w-full">
                            <Link href={expiredSignInUrl}>Sign in again</Link>
                        </Button>
                    </CardContent>
                </Card>
            </main>
        );
    }

    if (!request || !action) {
        return (
            <main className="flex min-h-svh items-center justify-center bg-background px-4 py-10">
                <Card className="w-full max-w-md">
                    <CardHeader>
                        <CardTitle>Invalid request</CardTitle>
                        <CardDescription>
                            This connection request is missing required details. Return to your AI
                            client and start the FresherFlow connection again.
                        </CardDescription>
                    </CardHeader>
                </Card>
            </main>
        );
    }

    return (
        <main className="flex min-h-svh items-center justify-center bg-background px-4 py-10">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle>Connect {request.clientName} to FresherFlow</CardTitle>
                    <p className="text-base">
                        <strong>{request.clientName}</strong> is asking to act as{' '}
                        <strong>{request.account}</strong>.
                    </p>
                </CardHeader>
                <CardContent>
                    <p className="text-base">It will be able to:</p>
                    <ul className="mt-2 list-disc space-y-1 pl-5 text-base">
                        <li>
                            Add jobs as you (moderators publish on submit; everyone else submits a
                            draft for review)
                        </li>
                        <li>See the listings and submissions you own</li>
                        <li>Withdraw a submission you made</li>
                    </ul>
                    <p className="mt-4 text-sm text-muted-foreground">
                        It will not see your password or your account settings. You can disconnect
                        it at any time from your account.
                    </p>
                    {/* Plain urlencoded POST — no JavaScript, no fetch. */}
                    <form method="post" action={action} className="mt-6">
                        <input type="hidden" name="client_id" value={request.clientId} />
                        <input type="hidden" name="redirect_uri" value={request.redirectUri} />
                        <input type="hidden" name="code_challenge" value={request.codeChallenge} />
                        <input type="hidden" name="state" value={request.state} />
                        <input type="hidden" name="scope" value={request.scope} />
                        <input type="hidden" name="resource" value={request.resource} />
                        <input type="hidden" name="consent_token" value={request.consentToken} />
                        <div className="grid grid-cols-2 gap-3">
                            <Button
                                type="submit"
                                name="decision"
                                value="deny"
                                variant="outline"
                                className="w-full"
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                name="decision"
                                value="allow"
                                className="w-full"
                            >
                                Allow
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </main>
    );
}
