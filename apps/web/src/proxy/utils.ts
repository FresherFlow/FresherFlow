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

export const ADMIN_WEB_HOST = normalizeHost(process.env.ADMIN_WEB_HOST, 'admin.fresherflow.in');
export const PUBLIC_WEB_HOST = normalizeHost(process.env.PUBLIC_WEB_HOST, 'fresherflow.in');
export const APP_WEB_HOST = normalizeHost(process.env.APP_WEB_HOST || process.env.NEXT_PUBLIC_APP_WEB_HOST, 'app.fresherflow.in');
export const USER_LOGIN_HOST = normalizeHost(process.env.USER_LOGIN_HOST || process.env.NEXT_PUBLIC_USER_LOGIN_HOST, APP_WEB_HOST);

export function redirectWithMethodAwareness(request: NextRequest, target: string) {
    const url = new URL(target, request.url);
    const method = request.method.toUpperCase();
    const status = method === 'GET' || method === 'HEAD' ? 307 : 303;
    return NextResponse.redirect(url, status);
}
