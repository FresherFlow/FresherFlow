/**
 * Non-UI code for the "Links & Work" section.
 *
 * Types, limits, URL normalisation and GitHub response mapping. None of this renders, so none
 * of it belongs in the component file: the section imports it and stays markup.
 */
import type { Profile } from '@fresherflow/types';

export const MAX_LINKS = 5;
export const MAX_PINNED_REPOS = 3;

export const LINK_TYPES = ['Resume', 'Portfolio', 'GitHub', 'LinkedIn', 'Other'] as const;
export type LinkType = (typeof LINK_TYPES)[number];

export interface LinkItem {
    id: string;
    type: LinkType;
    url: string;
}

/** The GitHub REST shape the picker renders, narrowed to the fields it actually uses. */
export interface PinnedRepoItem {
    id: number | string;
    name: string;
    description: string | null;
    html_url: string;
    language: string | null;
    stargazers_count?: number;
    updated_at?: string | null;
    homepage?: string | null;
}

const GITHUB_API = 'https://api.github.com';
const GITHUB_WEB = 'https://github.com';

export function githubUserReposUrl(username: string): string {
    return `${GITHUB_API}/users/${encodeURIComponent(username)}/repos?per_page=100&sort=updated`;
}

export function githubRepoApiUrl(owner: string, repo: string): string {
    return `${GITHUB_API}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`;
}

export function githubRepoHref(owner: string, repo: string): string {
    return `${GITHUB_WEB}/${owner}/${repo}`;
}

/**
 * Turn whatever a user typed into a real URL.
 *
 * People type `linkedin.com/in/name`, `@name`, or a bare handle; all three should end up at a
 * working profile rather than a broken href.
 */
export function formatSocialUrl(type: string, input: string): string {
    if (!input) return '';
    const trimmed = input.trim();
    if (!trimmed) return '';

    if (/^https?:\/\//i.test(trimmed)) return trimmed;

    const clean = trimmed.replace(/^@/, '');

    if (type === 'LinkedIn') {
        if (clean.startsWith('linkedin.com/')) return `https://${clean}`;
        if (clean.startsWith('www.linkedin.com/')) return `https://${clean}`;
        if (clean.startsWith('in/')) return `https://linkedin.com/${clean}`;
        if (clean.includes('.')) return `https://${clean}`;
        return `https://linkedin.com/in/${clean}`;
    }

    if (type === 'GitHub') {
        if (clean.startsWith('github.com/')) return `https://${clean}`;
        if (clean.startsWith('www.github.com/')) return `https://${clean}`;
        if (clean.includes('.')) return `https://${clean}`;
        return `${GITHUB_WEB}/${clean}`;
    }

    return `https://${clean}`;
}

export function extractGithubUsername(githubUrl: string | null | undefined): string | null {
    if (!githubUrl) return null;
    const trimmed = githubUrl.trim();
    if (!trimmed) return null;
    const cleanUrl = trimmed.replace(/\/+$/, '');
    const match = cleanUrl.match(/(?:github\.com\/|^@?)([a-zA-Z0-9-]+)$/i);
    if (match && match[1]) {
        const name = match[1];
        if (name.toLowerCase() !== 'github.com') return name;
    }
    const parts = cleanUrl.split('/');
    const last = parts[parts.length - 1]?.replace(/^@/, '');
    return last || null;
}

export function getLinkPlaceholder(type: LinkType): string {
    switch (type) {
        case 'LinkedIn':
            return 'https://linkedin.com/in/username';
        case 'GitHub':
            return 'github.com/username or @username';
        case 'Portfolio':
            return 'https://yourportfolio.com';
        case 'Resume':
            return 'https://drive.google.com/... or resume URL';
        case 'Other':
            return 'https://example.com';
        default:
            return 'https://...';
    }
}

/** Accepts a full repo URL, an `@owner/repo` handle, or bare `owner/repo`. */
export function parseGithubRepoInput(input: string): { owner: string; repo: string } | null {
    if (!input) return null;
    const trimmed = input.trim().replace(/\/+$/, '');
    if (!trimmed) return null;

    const urlMatch = trimmed.match(/(?:github\.com\/|^)([a-zA-Z0-9_-]+)\/([a-zA-Z0-9_.-]+)$/i);
    if (urlMatch && urlMatch[1] && urlMatch[2]) {
        return { owner: urlMatch[1], repo: urlMatch[2].replace(/\.git$/i, '') };
    }
    return null;
}

/** Seed the editor from the saved profile. Always leaves one blank row to type into. */
export function buildInitialLinks(profile: Profile | null): LinkItem[] {
    const list: LinkItem[] = [];
    if (profile?.linkedinUrl) list.push({ id: 'linkedin', type: 'LinkedIn', url: profile.linkedinUrl });
    if (profile?.githubUrl) list.push({ id: 'github', type: 'GitHub', url: profile.githubUrl });
    if (profile?.portfolioUrl) list.push({ id: 'portfolio', type: 'Portfolio', url: profile.portfolioUrl });
    if (list.length === 0) list.push({ id: '1', type: 'LinkedIn', url: '' });
    return list;
}

/** Only the links that are actually filled in, ready to render. */
export function buildDisplayLinks(profile: Profile | null): LinkItem[] {
    return buildInitialLinks(profile).filter((link) => Boolean(link.url.trim()));
}

/**
 * Collapse the editor rows into the three columns the profile stores.
 *
 * The storage model has one slot each for LinkedIn, GitHub and one "other" link, so a Resume
 * and a Portfolio cannot both be saved — first filled row wins, which is the longest-standing
 * behaviour of this section.
 */
export function buildLinksPayload(linksList: LinkItem[]): {
    linkedinUrl: string | null;
    githubUrl: string | null;
    portfolioUrl: string | null;
} {
    const linkedin = linksList.find((l) => l.type === 'LinkedIn' && l.url.trim());
    const github = linksList.find((l) => l.type === 'GitHub' && l.url.trim());
    const other = linksList.find(
        (l) => (l.type === 'Portfolio' || l.type === 'Resume' || l.type === 'Other') && l.url.trim(),
    );

    return {
        linkedinUrl: linkedin ? formatSocialUrl('LinkedIn', linkedin.url) : null,
        githubUrl: github ? formatSocialUrl('GitHub', github.url) : null,
        portfolioUrl: other ? formatSocialUrl(other.type, other.url) : null,
    };
}

/** Pinned repos are stored as JSON, so a malformed value has to degrade to an empty list. */
export function toPinnedRepos(value: unknown): PinnedRepoItem[] {
    return Array.isArray(value) ? (value as PinnedRepoItem[]) : [];
}

type RawRepo = {
    id?: number | string;
    name?: string;
    description?: string | null;
    html_url?: string;
    language?: string | null;
    stargazers_count?: number;
    updated_at?: string | null;
    pushed_at?: string | null;
    homepage?: string | null;
};

export function mapRepo(raw: RawRepo, fallbackHref: string, fallbackName = ''): PinnedRepoItem {
    return {
        id: raw.id ?? fallbackHref,
        name: raw.name || fallbackName,
        description: raw.description || null,
        html_url: raw.html_url || fallbackHref,
        language: raw.language || null,
        stargazers_count: raw.stargazers_count ?? 0,
        updated_at: raw.updated_at || raw.pushed_at || null,
        homepage: raw.homepage || null,
    };
}

export function mapRepoList(data: unknown, username: string): PinnedRepoItem[] {
    if (!Array.isArray(data)) return [];
    return (data as RawRepo[]).map((repo) =>
        mapRepo(repo, githubRepoHref(username, repo.name ?? ''), repo.name ?? ''),
    );
}

export function isRepoSelected(selected: PinnedRepoItem[], repo: PinnedRepoItem): boolean {
    return selected.some((r) => r.id === repo.id || r.name === repo.name);
}

/**
 * Add or remove a repository from the pinned set.
 *
 * Returns the error instead of showing one, so the rule stays testable and the caller decides
 * how to surface it.
 */
export function toggleRepoSelection(
    selected: PinnedRepoItem[],
    repo: PinnedRepoItem,
): { next: PinnedRepoItem[]; error?: string } {
    if (isRepoSelected(selected, repo)) {
        return { next: selected.filter((r) => r.id !== repo.id && r.name !== repo.name) };
    }
    if (selected.length >= MAX_PINNED_REPOS) {
        return { next: selected, error: `Maximum ${MAX_PINNED_REPOS} repositories can be pinned.` };
    }
    return { next: [...selected, repo] };
}
