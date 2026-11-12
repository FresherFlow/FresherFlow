import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function normalizeHost(value: string | undefined, fallback: string): string {
    const input = (value || fallback).trim();
    if (!input) return fallback;
    try {
        return new URL(input).hostname.toLowerCase();
    } catch {
        return input.replace(/^https?:\/\//i, '').replace(/\/.*$/, '').toLowerCase();
    }
}

function isRealHost(value: string): boolean {
    return Boolean(value) && value !== 'localhost' && value !== '127.0.0.1';
}

function getRegistrableBaseHost(hostname: string): string | null {
    const parts = hostname.toLowerCase().split('.').filter(Boolean);
    if (parts.length < 2) return null;
    return parts.slice(-2).join('.');
}

/**
 * Sibling hosts for a request host.
 *
 * There is no `app.` subdomain: the signed-in app lives on the public host, so
 * only `admin.` and `join.` are derived.
 */
function deriveSiblingHosts(hostname: string) {
    const baseHost = getRegistrableBaseHost(hostname);
    if (!baseHost || baseHost === 'localhost') {
        return {
            publicHost: hostname,
            adminHost: hostname,
            joinHost: hostname,
        };
    }

    if (hostname === baseHost || hostname === `www.${baseHost}`) {
        return {
            publicHost: baseHost,
            adminHost: `admin.${baseHost}`,
            joinHost: `join.${baseHost}`,
        };
    }

    if (hostname.startsWith('admin.')) {
        return {
            publicHost: baseHost,
            adminHost: hostname,
            joinHost: `join.${baseHost}`,
        };
    }

    if (hostname.startsWith('join.')) {
        return {
            publicHost: baseHost,
            adminHost: `admin.${baseHost}`,
            joinHost: hostname,
        };
    }

    return {
        publicHost: baseHost,
        adminHost: `admin.${baseHost}`,
        joinHost: `join.${baseHost}`,
    };
}

export function getHostRole(hostname: string, request: NextRequest) {
    const normalizedHost = hostname.toLowerCase();

    // On localhost we can't distinguish between public/admin/join hosts —
    // all are on the same machine. Return 'other' so none of the host-specific
    // redirect rules fire in development.
    if (normalizedHost === 'localhost' || normalizedHost === '127.0.0.1') {
        return 'other' as const;
    }

    const { PUBLIC_WEB_HOST, ADMIN_WEB_HOST, JOIN_WEB_HOST } = resolveHosts(request);
    const baseHost = getRegistrableBaseHost(normalizedHost);

    if (
        normalizedHost === JOIN_WEB_HOST ||
        normalizedHost.startsWith('join.')
    ) {
        return 'join' as const;
    }

    if (
        normalizedHost === ADMIN_WEB_HOST ||
        normalizedHost.startsWith('admin.') ||
        normalizedHost.startsWith('caps.')
    ) {
        return 'admin' as const;
    }

    if (
        normalizedHost === PUBLIC_WEB_HOST ||
        (baseHost && (normalizedHost === baseHost || normalizedHost === `www.${baseHost}`))
    ) {
        return 'public' as const;
    }

    return 'other' as const;
}

/**
 * One canonical name per host. Host routing only ever runs in the proxy, on the
 * server, so these are server-only names — no `NEXT_PUBLIC_` twins are read.
 * `.env.example` documents the same set; there is no second list.
 *
 * There is no app host: the signed-in app is served from `PUBLIC_WEB_HOST`.
 * Anything that is not `admin.` or `join.` is a public-host request, and any
 * host that matches neither falls through to `'other'`.
 */
export function resolveHosts(request: NextRequest) {
    const requestHost = request.nextUrl.hostname.toLowerCase();

    const envPublicHost = normalizeHost(process.env.PUBLIC_WEB_HOST, '');
    const envAdminHost = normalizeHost(process.env.ADMIN_WEB_HOST, '');
    const envLoginHost = normalizeHost(process.env.USER_LOGIN_HOST, '');
    const envJoinHost = normalizeHost(process.env.JOIN_WEB_HOST, '');

    const derived = deriveSiblingHosts(requestHost);

    const PUBLIC_WEB_HOST = isRealHost(envPublicHost) ? envPublicHost : derived.publicHost;
    const ADMIN_WEB_HOST = isRealHost(envAdminHost) ? envAdminHost : derived.adminHost;
    // Sign-in lives on the public host. There is no separate login host, so
    // fall straight back to PUBLIC_WEB_HOST.
    const USER_LOGIN_HOST = isRealHost(envLoginHost)
        ? envLoginHost
        : PUBLIC_WEB_HOST;
    const JOIN_WEB_HOST = isRealHost(envJoinHost) ? envJoinHost : derived.joinHost;

    return {
        PUBLIC_WEB_HOST,
        ADMIN_WEB_HOST,
        USER_LOGIN_HOST,
        JOIN_WEB_HOST,
    };
}

export function redirectWithMethodAwareness(request: NextRequest, target: string) {
    const url = new URL(target, request.url);
    const method = request.method.toUpperCase();
    const status = method === 'GET' || method === 'HEAD' ? 307 : 303;
    return NextResponse.redirect(url, status);
}
