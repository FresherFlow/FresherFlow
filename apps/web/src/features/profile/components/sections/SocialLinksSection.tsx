'use client';

import { useEffect, useMemo, useState } from 'react';
import { Plus, Search, Trash2, X } from 'lucide-react';
import type { Project } from '@fresherflow/types';
import toast from 'react-hot-toast';
import { getErrorMessage } from '@/lib/utils/error';
import { useAuth } from '@/lib/auth/AuthContext';
import { profileApi } from '@/lib/api/profile';
import { Input } from '@/ui/Input';
import { Textarea } from '@/ui/Textarea';
import { Button } from '@/ui/Button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/ui/Select';
import {
    buildInitialLinks,
    buildLinksPayload,
    getLinkPlaceholder,
    githubRepoApiUrl,
    githubUserReposUrl,
    mapRepoList,
    isRepoSelected,
    LINK_TYPES,
    mapRepo,
    MAX_LINKS,
    MAX_PINNED_REPOS,
    parseGithubRepoInput,
    toPinnedRepos,
    toggleRepoSelection,
    extractGithubUsername,
    type LinkItem,
    type LinkType,
    type PinnedRepoItem,
} from '@/features/profile/socialLinks';
import { ProfileSectionCard } from '@/features/profile/components/sections/ProfileSectionCard';
import { SectionFooter, useSectionSave } from '@/features/profile/components/editor/SectionFooter';

/**
 * Links & Work — one form, one save.
 *
 * Links, projects and pinned repositories are the same concern (what a recruiter
 * clicks), so they are one section with one submit rather than three editors
 * with three toggles, three Cancel buttons and three separate writes. Nothing
 * here opens a dialog or hides behind a "Close" button.
 *
 * The URL, repo and pin rules live in `features/profile/socialLinks.ts`; this
 * file renders them and nothing else.
 */
export function SocialLinksSection() {
    const { profile, updateProfileState } = useAuth();
    const { saving, save } = useSectionSave();

    const [linksList, setLinksList] = useState<LinkItem[]>(() => buildInitialLinks(profile ?? null));
    const [projects, setProjects] = useState<EditableProject[]>(() => toEditableProjects(profile?.projects));
    const [selectedRepos, setSelectedRepos] = useState<PinnedRepoItem[]>(() => toPinnedRepos(profile?.githubPinnedRepos));

    const [repoSearch, setRepoSearch] = useState('');
    const [fetchedRepos, setFetchedRepos] = useState<PinnedRepoItem[]>([]);
    const [isFetchingRepos, setIsFetchingRepos] = useState(false);
    const [reposLoaded, setReposLoaded] = useState(false);
    const [customRepoInput, setCustomRepoInput] = useState('');
    const [isAddingCustomRepo, setIsAddingCustomRepo] = useState(false);

    const githubUsername = extractGithubUsername(profile?.githubUrl);
    const pinnedRepos = useMemo(() => toPinnedRepos(profile?.githubPinnedRepos), [profile]);
    const savedProjects = useMemo(() => toEditableProjects(profile?.projects), [profile]);
    const savedLinks = useMemo(() => buildInitialLinks(profile ?? null), [profile]);

    // The fields take their values from the profile whenever it changes, which is
    // after a successful save (every handler hands the saved values back).
    useEffect(() => {
        setLinksList(buildInitialLinks(profile ?? null));
        setProjects(toEditableProjects(profile?.projects));
        setSelectedRepos(toPinnedRepos(profile?.githubPinnedRepos));
        setReposLoaded(false);
    }, [profile]);

    const handleAddLink = () => {
        if (linksList.length >= MAX_LINKS) {
            toast.error(`Maximum ${MAX_LINKS} links allowed.`);
            return;
        }
        const used = linksList.map((link) => link.type);
        const nextType = LINK_TYPES.find((type) => !used.includes(type)) || 'Other';
        setLinksList((prev) => [...prev, { id: String(Date.now()), type: nextType, url: '' }]);
    };

    /** Fetched on request rather than on mount: one less call per profile visit. */
    const loadRepositories = async () => {
        if (!githubUsername) return;
        setIsFetchingRepos(true);
        setReposLoaded(true);
        try {
            const res = await fetch(githubUserReposUrl(githubUsername));
            if (!res.ok) throw new Error('Failed to load repositories');
            setFetchedRepos(mapRepoList(await res.json(), githubUsername));
        } catch {
            setReposLoaded(false);
            toast.error('Could not load repositories from GitHub');
        } finally {
            setIsFetchingRepos(false);
        }
    };

    const handleAddCustomRepo = async () => {
        const parsed = parseGithubRepoInput(customRepoInput);
        if (!parsed) {
            toast.error('Enter a repo URL or owner/repo (e.g. facebook/react)');
            return;
        }
        if (selectedRepos.length >= MAX_PINNED_REPOS) {
            toast.error(`Maximum ${MAX_PINNED_REPOS} repositories can be pinned.`);
            return;
        }

        setIsAddingCustomRepo(true);
        let repo: PinnedRepoItem;
        try {
            const res = await fetch(githubRepoApiUrl(parsed.owner, parsed.repo));
            const href = `https://github.com/${parsed.owner}/${parsed.repo}`;
            repo = res.ok
                ? mapRepo(await res.json(), href, parsed.repo)
                : mapRepo({ name: parsed.repo }, href, parsed.repo);
        } catch {
            repo = mapRepo({ name: parsed.repo }, `https://github.com/${parsed.owner}/${parsed.repo}`, parsed.repo);
        } finally {
            setIsAddingCustomRepo(false);
        }

        if (isRepoSelected(selectedRepos, repo)) {
            toast.error('This repository is already pinned.');
            return;
        }

        setSelectedRepos((prev) => [...prev, repo]);
        setFetchedRepos((prev) => (isRepoSelected(prev, repo) ? prev : [repo, ...prev]));
        setCustomRepoInput('');
    };

    const handleToggleRepo = (repo: PinnedRepoItem) => {
        const { next, error } = toggleRepoSelection(selectedRepos, repo);
        if (error) {
            toast.error(getErrorMessage(error));
            return;
        }
        setSelectedRepos(next);
    };

    /** Unpinning is one click — no need to search the list again to undo one. */
    const handleUnpinRepo = (repo: PinnedRepoItem) => {
        setSelectedRepos((prev) => prev.filter((item) => item.id !== repo.id && item.name !== repo.name));
    };

    const visibleRepos = repoSearch.trim()
        ? fetchedRepos.filter((repo) =>
              `${repo.name} ${repo.language ?? ''}`.toLowerCase().includes(repoSearch.trim().toLowerCase()),
          )
        : fetchedRepos;

    const addProject = () => setProjects((prev) => [...prev, emptyProject()]);

    const isDirty = useMemo(() => {
        const linkKey = (list: LinkItem[]) =>
            list
                .map((link) => `${link.type}\u0000${(link.url || '').trim()}`)
                .sort()
                .join('|');
        const projectKey = (list: EditableProject[]) =>
            JSON.stringify(
                list
                    .filter((project) => project.name.trim())
                    .map((project) => [
                        project.name.trim(),
                        project.description.trim(),
                        project.githubUrl.trim(),
                        project.liveUrl.trim(),
                    ]),
            );
        const repoKey = (list: PinnedRepoItem[]) => list.map((repo) => repo.name).sort().join('|');

        return (
            linkKey(linksList) !== linkKey(savedLinks) ||
            projectKey(projects) !== projectKey(savedProjects) ||
            repoKey(selectedRepos) !== repoKey(pinnedRepos)
        );
    }, [linksList, savedLinks, projects, savedProjects, selectedRepos, pinnedRepos]);

    /** One write for the whole section. */
    const handleSave = async () => {
        const namedProjects = projects
            .filter((project) => project.name.trim())
            .map((project) => ({
                ...project,
                name: project.name.trim(),
                description: project.description.trim() || null,
                githubUrl: project.githubUrl.trim() || null,
                liveUrl: project.liveUrl.trim() || null,
            }));

        const payload = {
            ...buildLinksPayload(linksList),
            // The public page reads `title ?? name`, description and the two links.
            projects: namedProjects as unknown as Project[],
            githubPinnedRepos: selectedRepos,
        } as never;

        await profileApi.updateProfile(payload);
        updateProfileState(payload);
        return true;
    };

    const summary = [
        `${linksList.length}/${MAX_LINKS} links`,
        namedProjectCount(projects),
        `${selectedRepos.length}/${MAX_PINNED_REPOS} repos`,
    ].join(' · ');

    return (
        <ProfileSectionCard
            title="Links & Work"
            description={`Portfolio, GitHub, projects and the repositories worth clicking · ${summary}`}
        >
            <form
                className="space-y-6"
                onSubmit={(event) => {
                    event.preventDefault();
                    void save(handleSave, 'Links & work saved.');
                }}
            >
                <fieldset className="space-y-3">
                    <legend className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Links
                    </legend>

                    <ul className="space-y-3">
                        {linksList.map((link, index) => (
                            <li key={link.id || index} className="flex items-center gap-2">
                                <Select
                                    value={link.type}
                                    onValueChange={(type) =>
                                        setLinksList((prev) =>
                                            prev.map((item, i) => (i === index ? { ...item, type: type as LinkType } : item)),
                                        )
                                    }
                                    disabled={saving}
                                >
                                    <SelectTrigger className="w-32 shrink-0" aria-label="Link type">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {LINK_TYPES.map((type) => (
                                            <SelectItem key={type} value={type}>
                                                {type}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <Input
                                    value={link.url}
                                    onChange={(e) =>
                                        setLinksList((prev) => prev.map((item, i) => (i === index ? { ...item, url: e.target.value } : item)))
                                    }
                                    placeholder={getLinkPlaceholder(link.type)}
                                    disabled={saving}
                                    className="flex-1"
                                />
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setLinksList((prev) => prev.filter((_, i) => i !== index))}
                                    aria-label={`Remove ${link.type} link`}
                                >
                                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                                </Button>
                            </li>
                        ))}
                    </ul>

                    {linksList.length < MAX_LINKS && (
                        <Button type="button" variant="outline" size="sm" onClick={handleAddLink} disabled={saving}>
                            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                            Add link
                        </Button>
                    )}
                </fieldset>

                <fieldset className="space-y-3 border-t border-border/50 pt-5">
                    <legend className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Projects
                    </legend>
                    <p className="text-xs text-muted-foreground">
                        A project with a link is worth ten bullet points. The first one shows on your public page.
                    </p>

                    {projects.map((project, index) => (
                        <div key={project.id} className="space-y-3 rounded-xl border border-border/70 p-3">
                            <div className="flex items-center gap-2">
                                <Input
                                    value={project.name}
                                    onChange={(e) =>
                                        setProjects((prev) =>
                                            prev.map((item, i) => (i === index ? { ...item, name: e.target.value } : item)),
                                        )
                                    }
                                    placeholder="Project name"
                                    aria-label="Project name"
                                    disabled={saving}
                                    className="flex-1"
                                />
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setProjects((prev) => prev.filter((_, i) => i !== index))}
                                    aria-label={`Remove ${project.name || 'project'}`}
                                >
                                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                                </Button>
                            </div>
                            <Textarea
                                rows={2}
                                value={project.description}
                                onChange={(e) =>
                                    setProjects((prev) =>
                                        prev.map((item, i) => (i === index ? { ...item, description: e.target.value } : item)),
                                    )
                                }
                                placeholder="What it does, and what you built"
                                aria-label="Project description"
                                disabled={saving}
                            />
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                <Input
                                    type="url"
                                    value={project.githubUrl}
                                    onChange={(e) =>
                                        setProjects((prev) =>
                                            prev.map((item, i) => (i === index ? { ...item, githubUrl: e.target.value } : item)),
                                        )
                                    }
                                    placeholder="GitHub URL"
                                    aria-label="Project GitHub URL"
                                    disabled={saving}
                                />
                                <Input
                                    type="url"
                                    value={project.liveUrl}
                                    onChange={(e) =>
                                        setProjects((prev) =>
                                            prev.map((item, i) => (i === index ? { ...item, liveUrl: e.target.value } : item)),
                                        )
                                    }
                                    placeholder="Live URL"
                                    aria-label="Project live URL"
                                    disabled={saving}
                                />
                            </div>
                        </div>
                    ))}

                    {/* Only offered once the last row is actually named — the old
                        button stacked blank project forms on every click. */}
                    {projects.length < MAX_PROJECTS && (projects.length === 0 || projects[projects.length - 1]?.name.trim()) && (
                        <Button type="button" variant="outline" size="sm" onClick={addProject} disabled={saving}>
                            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                            Add project
                        </Button>
                    )}
                </fieldset>

                <fieldset className="space-y-3 border-t border-border/50 pt-5">
                    <legend className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Pinned repositories
                    </legend>
                    <p className="text-xs text-muted-foreground">
                        Optional — up to {MAX_PINNED_REPOS}, shown with language and stars.
                    </p>

                    {selectedRepos.length > 0 && (
                        <ul className="grid gap-2 sm:grid-cols-3">
                            {selectedRepos.map((repo) => (
                                <li key={repo.id || repo.name} className="group relative rounded-xl border border-border/70 p-3">
                                    <a
                                        href={repo.html_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="block text-sm font-medium text-foreground hover:text-primary"
                                    >
                                        {repo.name}
                                    </a>
                                    <p className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                                        {repo.language && <span>{repo.language}</span>}
                                        {Boolean(repo.stargazers_count) && (
                                            <span className="tabular-nums">★ {repo.stargazers_count}</span>
                                        )}
                                    </p>
                                    <button
                                        type="button"
                                        onClick={() => handleUnpinRepo(repo)}
                                        disabled={saving}
                                        aria-label={`Unpin ${repo.name}`}
                                        className="absolute right-2 top-2 rounded-md p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-muted hover:text-foreground group-hover:opacity-100 focus:opacity-100"
                                    >
                                        <X className="h-3.5 w-3.5" aria-hidden="true" />
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}

                    {githubUsername ? (
                        <div className="overflow-hidden rounded-xl border border-border/70">
                            <div className="flex items-center gap-2 border-b border-border/60 px-3 py-2">
                                <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
                                <input
                                    value={repoSearch}
                                    onChange={(e) => setRepoSearch(e.target.value)}
                                    onFocus={() => {
                                        if (!reposLoaded && !isFetchingRepos) void loadRepositories();
                                    }}
                                    placeholder="Filter your repositories"
                                    aria-label="Filter repositories"
                                    className="h-7 w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
                                />
                                <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                                    {selectedRepos.length}/{MAX_PINNED_REPOS}
                                </span>
                            </div>

                            {isFetchingRepos ? (
                                <div className="space-y-2 p-3">
                                    {[1, 2, 3].map((i) => (
                                        <div key={i} className="h-10 animate-pulse rounded-lg bg-muted/50" />
                                    ))}
                                </div>
                            ) : reposLoaded && visibleRepos.length > 0 ? (
                                <ul className="max-h-64 divide-y divide-border/50 overflow-y-auto">
                                    {visibleRepos.map((repo) => {
                                        const checked = isRepoSelected(selectedRepos, repo);
                                        return (
                                            <li key={repo.id}>
                                                <button
                                                    type="button"
                                                    onClick={() => handleToggleRepo(repo)}
                                                    aria-pressed={checked}
                                                    className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-muted/60"
                                                >
                                                    <span
                                                        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                                                            checked ? 'border-primary bg-primary text-primary-foreground' : 'border-border'
                                                        }`}
                                                        aria-hidden="true"
                                                    >
                                                        {checked && (
                                                            <svg viewBox="0 0 20 20" fill="currentColor" className="h-3 w-3">
                                                                <path
                                                                    fillRule="evenodd"
                                                                    d="M16.7 5.3a1 1 0 0 1 0 1.4l-7.5 7.5a1 1 0 0 1-1.4 0L3.3 9.7a1 1 0 1 1 1.4-1.4l3.8 3.8 6.8-6.8a1 1 0 0 1 1.4 0Z"
                                                                    clipRule="evenodd"
                                                                />
                                                            </svg>
                                                        )}
                                                    </span>
                                                    <span className="min-w-0 flex-1 truncate text-sm text-foreground">{repo.name}</span>
                                                    {repo.language && (
                                                        <span className="shrink-0 text-xs text-muted-foreground">{repo.language}</span>
                                                    )}
                                                    {Boolean(repo.stargazers_count) && (
                                                        <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                                                            ★ {repo.stargazers_count}
                                                        </span>
                                                    )}
                                                </button>
                                            </li>
                                        );
                                    })}
                                </ul>
                            ) : reposLoaded ? (
                                <p className="px-3 py-6 text-center text-xs text-muted-foreground">
                                    {repoSearch.trim()
                                        ? `No repository matches “${repoSearch}”.`
                                        : `No public repositories found for @${githubUsername}.`}
                                </p>
                            ) : (
                                <div className="flex items-center justify-between gap-3 px-3 py-3">
                                    <p className="text-xs text-muted-foreground">
                                        Load your public repositories to pick from them.
                                    </p>
                                    <Button type="button" variant="outline" size="sm" onClick={() => void loadRepositories()}>
                                        Load repos
                                    </Button>
                                </div>
                            )}

                            <div className="flex items-center gap-2 border-t border-border/60 bg-muted/30 px-3 py-2">
                                <Input
                                    value={customRepoInput}
                                    onChange={(e) => setCustomRepoInput(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            void handleAddCustomRepo();
                                        }
                                    }}
                                    placeholder="Or paste owner/repo"
                                    aria-label="Add a repository by name"
                                    disabled={isAddingCustomRepo}
                                    className="h-8 flex-1"
                                />
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    onClick={() => void handleAddCustomRepo()}
                                    disabled={isAddingCustomRepo || !customRepoInput.trim()}
                                >
                                    {isAddingCustomRepo ? 'Adding…' : 'Add'}
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <p className="rounded-xl border border-dashed border-border/70 px-3 py-4 text-center text-xs text-muted-foreground">
                            Add a GitHub link above and your repositories can be pinned here.
                        </p>
                    )}
                </fieldset>

                <SectionFooter isDirty={isDirty} saving={saving} saveLabel="Save links & work" />
            </form>
        </ProfileSectionCard>
    );
}

/** A project row as this editor edits it. Links are what recruiters click. */
type EditableProject = {
    id: string;
    name: string;
    description: string;
    githubUrl: string;
    liveUrl: string;
};

const MAX_PROJECTS = 5;

function emptyProject(): EditableProject {
    return { id: String(Date.now() + Math.random()), name: '', description: '', githubUrl: '', liveUrl: '' };
}

/** "2 projects" / "No projects" — the count, not the padding. */
function namedProjectCount(projects: EditableProject[]) {
    const count = projects.filter((project) => project.name.trim()).length;
    return count === 1 ? '1 project' : `${count} projects`;
}

/** Reads both the stored shape (`name`) and the public API shape (`title`). */
function toEditableProjects(value: unknown): EditableProject[] {
    if (!Array.isArray(value)) return [];
    return (value as Array<Record<string, unknown>>)
        .map((project, index) => {
            const name = (project?.name as string) || (project?.title as string) || '';
            if (!name) return null;
            return {
                id: String(project?.id ?? `${name}-${index}`),
                name,
                description: (project?.description as string) || '',
                githubUrl: (project?.githubUrl as string) || '',
                liveUrl: (project?.liveUrl as string) || '',
            };
        })
        .filter((project): project is EditableProject => project !== null);
}

