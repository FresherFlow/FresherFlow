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

function deriveSiblingHosts(hostname: string) {
    const baseHost = getRegistrableBaseHost(hostname);
    if (!baseHost || baseHost === 'localhost') {
        return {
            publicHost: hostname,
            appHost: hostname,
            adminHost: hostname,
            joinHost: hostname,
        };
    }

    if (hostname === baseHost || hostname === `www.${baseHost}`) {
        return {
            publicHost: baseHost,
            appHost: `app.${baseHost}`,
            adminHost: `admin.${baseHost}`,
            joinHost: `join.${baseHost}`,
        };
    }

    if (hostname.startsWith('app.')) {
        return {
            publicHost: baseHost,
            appHost: hostname,
            adminHost: `admin.${baseHost}`,
            joinHost: `join.${baseHost}`,
        };
    }

    if (hostname.startsWith('admin.')) {
        return {
            publicHost: baseHost,
            appHost: `app.${baseHost}`,
            adminHost: hostname,
            joinHost: `join.${baseHost}`,
        };
    }

    if (hostname.startsWith('join.')) {
        return {
            publicHost: baseHost,
            appHost: `app.${baseHost}`,
            adminHost: `admin.${baseHost}`,
            joinHost: hostname,
        };
    }

    return {
        publicHost: baseHost,
        appHost: `app.${baseHost}`,
        adminHost: `admin.${baseHost}`,
        joinHost: `join.${baseHost}`,
    };
}

export function getHostRole(hostname: string, request: NextRequest) {
    const normalizedHost = hostname.toLowerCase();

    // On localhost we can't distinguish between app/admin/public hosts —
    // all are on the same machine. Return 'other' so none of the host-specific
    // redirect rules fire in development.
    if (normalizedHost === 'localhost' || normalizedHost === '127.0.0.1') {
        return 'other' as const;
    }

    const { PUBLIC_WEB_HOST, APP_WEB_HOST, ADMIN_WEB_HOST, JOIN_WEB_HOST } = resolveHosts(request);
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

    if (normalizedHost === APP_WEB_HOST || normalizedHost.startsWith('app.')) {
        return 'app' as const;
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
 * One canonical name per value, with older names accepted as fallbacks.
 *
 * Five hosts were being read through ten different `||` chains, which is what
 * made this config unreadable. `.env.example` lists the canonical set: the
 * server-only names. The `NEXT_PUBLIC_` twins stay readable here so an existing
 * deployment keeps working, but nothing new should use them — host routing only
 * ever runs in the proxy, on the server.
 */
function firstEnv(...names: string[]): string {
    for (const name of names) {
        const value = process.env[name];
        if (value && value.trim()) return value;
    }
    return '';
}

export function resolveHosts(request: NextRequest) {
    const requestHost = request.nextUrl.hostname.toLowerCase();

    const envPublicHost = normalizeHost(
        firstEnv('PUBLIC_WEB_HOST', 'NEXT_PUBLIC_PUBLIC_WEB_HOST', 'NEXT_PUBLIC_SITE_URL'),
        ''
    );
    const envAppHost = normalizeHost(firstEnv('APP_WEB_HOST', 'NEXT_PUBLIC_APP_WEB_HOST'), '');
    const envAdminHost = normalizeHost(firstEnv('ADMIN_WEB_HOST', 'NEXT_PUBLIC_ADMIN_WEB_HOST'), '');
    const envLoginHost = normalizeHost(firstEnv('USER_LOGIN_HOST', 'NEXT_PUBLIC_USER_LOGIN_HOST'), '');
    const envJoinHost = normalizeHost(firstEnv('JOIN_WEB_HOST', 'NEXT_PUBLIC_JOIN_WEB_HOST'), '');

    const derived = deriveSiblingHosts(requestHost);

    const PUBLIC_WEB_HOST = isRealHost(envPublicHost) ? envPublicHost : derived.publicHost;
    const APP_WEB_HOST = isRealHost(envAppHost) ? envAppHost : derived.appHost;
    const ADMIN_WEB_HOST = isRealHost(envAdminHost) ? envAdminHost : derived.adminHost;
    // Sign-in lives on the public host unless an app host actually exists.
    // Defaulting to app.<domain> sent visitors to a host that is not deployed in
    // a single-domain setup, and to a 308 loop when both names resolve together.
    const USER_LOGIN_HOST = isRealHost(envLoginHost)
        ? envLoginHost
        : (isRealHost(envAppHost) ? APP_WEB_HOST : PUBLIC_WEB_HOST);
    const JOIN_WEB_HOST = isRealHost(envJoinHost) ? envJoinHost : derived.joinHost;

    return {
        PUBLIC_WEB_HOST,
        APP_WEB_HOST,
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
