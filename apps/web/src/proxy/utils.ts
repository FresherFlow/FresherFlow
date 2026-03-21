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
        };
    }

    if (hostname === baseHost || hostname === `www.${baseHost}`) {
        return {
            publicHost: baseHost,
            appHost: `app.${baseHost}`,
            adminHost: `admin.${baseHost}`,
        };
    }

    if (hostname.startsWith('app.')) {
        return {
            publicHost: baseHost,
            appHost: hostname,
            adminHost: `admin.${baseHost}`,
        };
    }

    if (hostname.startsWith('admin.')) {
        return {
            publicHost: baseHost,
            appHost: `app.${baseHost}`,
            adminHost: hostname,
        };
    }

    return {
        publicHost: baseHost,
        appHost: `app.${baseHost}`,
        adminHost: `admin.${baseHost}`,
    };
}

export function getHostRole(hostname: string, request: NextRequest) {
    const normalizedHost = hostname.toLowerCase();
    const { PUBLIC_WEB_HOST, APP_WEB_HOST, ADMIN_WEB_HOST } = resolveHosts(request);
    const baseHost = getRegistrableBaseHost(normalizedHost);

    if (normalizedHost === ADMIN_WEB_HOST || normalizedHost.startsWith('admin.')) {
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

export function resolveHosts(request: NextRequest) {
    const requestHost = request.nextUrl.hostname.toLowerCase();

    const envPublicHost = normalizeHost(
        process.env.PUBLIC_WEB_HOST || process.env.NEXT_PUBLIC_PUBLIC_WEB_HOST || process.env.NEXT_PUBLIC_SITE_URL,
        ''
    );
    const envAppHost = normalizeHost(
        process.env.APP_WEB_HOST || process.env.NEXT_PUBLIC_APP_WEB_HOST,
        ''
    );
    const envAdminHost = normalizeHost(
        process.env.ADMIN_WEB_HOST || process.env.NEXT_PUBLIC_ADMIN_WEB_HOST,
        ''
    );
    const envLoginHost = normalizeHost(
        process.env.USER_LOGIN_HOST || process.env.NEXT_PUBLIC_USER_LOGIN_HOST,
        ''
    );

    const derived = deriveSiblingHosts(requestHost);

    const PUBLIC_WEB_HOST = isRealHost(envPublicHost) ? envPublicHost : derived.publicHost;
    const APP_WEB_HOST = isRealHost(envAppHost) ? envAppHost : derived.appHost;
    const ADMIN_WEB_HOST = isRealHost(envAdminHost) ? envAdminHost : derived.adminHost;
    const USER_LOGIN_HOST = isRealHost(envLoginHost) ? envLoginHost : APP_WEB_HOST;

    return {
        PUBLIC_WEB_HOST,
        APP_WEB_HOST,
        ADMIN_WEB_HOST,
        USER_LOGIN_HOST,
    };
}

export function redirectWithMethodAwareness(request: NextRequest, target: string) {
    const url = new URL(target, request.url);
    const method = request.method.toUpperCase();
    const status = method === 'GET' || method === 'HEAD' ? 307 : 303;
    return NextResponse.redirect(url, status);
}
