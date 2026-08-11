'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { profileApi } from '@/lib/api/profile';
import toast from 'react-hot-toast';
import { Input } from '@/ui/Input';
import { Button } from '@/ui/Button';
import { NativeSelect as Select } from "@/ui/NativeSelect";
import { PencilSquareIcon, PlusIcon, CheckIcon, LinkIcon, TrashIcon, DocumentTextIcon } from '@heroicons/react/24/outline';

const MAX_LINKS = 5;

export const LINK_TYPES = ['Resume', 'Portfolio', 'GitHub', 'LinkedIn', 'Other'] as const;
export type LinkType = (typeof LINK_TYPES)[number];

export interface LinkItem {
    id: string;
    type: LinkType;
    url: string;
}

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

export function formatSocialUrl(type: string, input: string): string {
    if (!input) return '';
    const trimmed = input.trim();
    if (!trimmed) return '';

    if (/^https?:\/\//i.test(trimmed)) {
        return trimmed;
    }

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
        return `https://github.com/${clean}`;
    }

    return `https://${clean}`;
}

function extractGithubUsername(githubUrl: string | null | undefined): string | null {
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

function getPlaceholder(type: LinkType): string {
    switch (type) {
        case 'LinkedIn': return 'https://linkedin.com/in/username';
        case 'GitHub': return 'github.com/username or @username';
        case 'Portfolio': return 'https://yourportfolio.com';
        case 'Resume': return 'https://drive.google.com/... or resume URL';
        case 'Other': return 'https://example.com';
        default: return 'https://...';
    }
}

function parseGithubRepoInput(input: string): { owner: string; repo: string } | null {
    if (!input) return null;
    const trimmed = input.trim().replace(/\/+$/, '');
    if (!trimmed) return null;

    const urlMatch = trimmed.match(/(?:github\.com\/|^)([a-zA-Z0-9_-]+)\/([a-zA-Z0-9_.-]+)$/i);
    if (urlMatch && urlMatch[1] && urlMatch[2]) {
        return { owner: urlMatch[1], repo: urlMatch[2].replace(/\.git$/i, '') };
    }
    return null;
}

export function SocialLinksSection() {
    const { profile, updateProfileState } = useAuth();
    const [isEditing, setIsEditing] = useState(false);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [linksList, setLinksList] = useState<LinkItem[]>([]);

    // Pinned Repos State
    const [isPinModalOpen, setIsPinModalOpen] = useState(false);
    const [fetchedRepos, setFetchedRepos] = useState<PinnedRepoItem[]>([]);
    const [isFetchingRepos, setIsFetchingRepos] = useState(false);
    const [selectedRepos, setSelectedRepos] = useState<PinnedRepoItem[]>([]);
    const [customRepoInput, setCustomRepoInput] = useState('');
    const [isAddingCustomRepo, setIsAddingCustomRepo] = useState(false);

    const githubUsername = extractGithubUsername(profile?.githubUrl);
    const existingPinned: PinnedRepoItem[] = Array.isArray((profile as any)?.githubPinnedRepos)
        ? (profile as any).githubPinnedRepos
        : [];

    const buildInitialLinks = (): LinkItem[] => {
        const list: LinkItem[] = [];
        if (profile?.linkedinUrl) list.push({ id: 'linkedin', type: 'LinkedIn', url: profile.linkedinUrl });
        if (profile?.githubUrl) list.push({ id: 'github', type: 'GitHub', url: profile.githubUrl });
        if (profile?.portfolioUrl) list.push({ id: 'portfolio', type: 'Portfolio', url: profile.portfolioUrl });
        if (list.length === 0) list.push({ id: '1', type: 'LinkedIn', url: '' });
        return list;
    };

    useEffect(() => {
        setLinksList(buildInitialLinks());
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [profile]);

    const handleOpenEdit = () => {
        setLinksList(buildInitialLinks());
        setIsEditing(true);
    };

    const handleAddLink = () => {
        if (linksList.length >= MAX_LINKS) {
            toast.error(`Maximum ${MAX_LINKS} links allowed.`);
            return;
        }
        const usedTypes = linksList.map(l => l.type);
        const nextType = LINK_TYPES.find(t => !usedTypes.includes(t)) || 'Other';
        setLinksList(prev => [...prev, { id: Date.now().toString(), type: nextType, url: '' }]);
    };

    const handleRemoveLink = (index: number) => {
        setLinksList(prev => prev.filter((_, i) => i !== index));
    };

    const handleTypeChange = (index: number, newType: LinkType) => {
        setLinksList(prev => prev.map((item, i) => i === index ? { ...item, type: newType } : item));
    };

    const handleUrlChange = (index: number, newUrl: string) => {
        setLinksList(prev => prev.map((item, i) => i === index ? { ...item, url: newUrl } : item));
    };

    const handleSave = () => {
        if (linksList.length > MAX_LINKS) {
            toast.error(`Maximum ${MAX_LINKS} links allowed.`);
            return;
        }

        const linkedinLink = linksList.find(l => l.type === 'LinkedIn' && l.url.trim());
        const githubLink = linksList.find(l => l.type === 'GitHub' && l.url.trim());
        const portfolioLink = linksList.find(l => (l.type === 'Portfolio' || l.type === 'Resume' || l.type === 'Other') && l.url.trim());

        const formattedLinkedin = linkedinLink ? formatSocialUrl('LinkedIn', linkedinLink.url) : undefined;
        const formattedGithub = githubLink ? formatSocialUrl('GitHub', githubLink.url) : undefined;
        const formattedPortfolio = portfolioLink ? formatSocialUrl(portfolioLink.type, portfolioLink.url) : undefined;

        const payload = {
            linkedinUrl: formattedLinkedin || null,
            githubUrl: formattedGithub || null,
            portfolioUrl: formattedPortfolio || null,
        };

        updateProfileState(payload as any, () => profileApi.updateProfile(payload as any));
        toast.success('Links updated successfully');
        setIsEditing(false);
    };

    // Pinned Repos Handlers
    const handleOpenPinModal = async () => {
        setIsPinModalOpen(true);
        setSelectedRepos(existingPinned);
        setCustomRepoInput('');
        if (!githubUsername) {
            setFetchedRepos([]);
            return;
        }
        setIsFetchingRepos(true);
        try {
            const res = await fetch(`https://api.github.com/users/${encodeURIComponent(githubUsername)}/repos?per_page=100&sort=updated`);
            if (!res.ok) throw new Error('Failed to fetch repositories');
            const data = await res.json();
            if (Array.isArray(data)) {
                setFetchedRepos(
                    data.map((r: any) => ({
                        id: r.id,
                        name: r.name,
                        description: r.description || null,
                        html_url: r.html_url || `https://github.com/${githubUsername}/${r.name}`,
                        language: r.language || null,
                        stargazers_count: r.stargazers_count ?? 0,
                        updated_at: r.updated_at || r.pushed_at || null,
                        homepage: r.homepage || null,
                    }))
                );
            }
        } catch {
            toast.error('Could not load repositories from GitHub');
        } finally {
            setIsFetchingRepos(false);
        }
    };

    const handleAddCustomRepo = async () => {
        const parsed = parseGithubRepoInput(customRepoInput);
        if (!parsed) {
            toast.error('Invalid format. Enter URL or owner/repo (e.g. facebook/react)');
            return;
        }
        if (selectedRepos.length >= 3) {
            toast.error('Maximum 3 repositories can be pinned.');
            return;
        }
        const alreadySelected = selectedRepos.some(
            (r) => r.name.toLowerCase() === parsed.repo.toLowerCase() || r.html_url.toLowerCase().includes(`${parsed.owner.toLowerCase()}/${parsed.repo.toLowerCase()}`)
        );
        if (alreadySelected) {
            toast.error('This repository is already pinned.');
            return;
        }

        setIsAddingCustomRepo(true);
        let newRepo: PinnedRepoItem;
        try {
            const res = await fetch(`https://api.github.com/repos/${encodeURIComponent(parsed.owner)}/${encodeURIComponent(parsed.repo)}`);
            if (res.ok) {
                const data = await res.json();
                newRepo = {
                    id: data.id || `${parsed.owner}/${parsed.repo}`,
                    name: data.name || parsed.repo,
                    description: data.description || null,
                    html_url: data.html_url || `https://github.com/${parsed.owner}/${parsed.repo}`,
                    language: data.language || null,
                    stargazers_count: data.stargazers_count ?? 0,
                    updated_at: data.updated_at || data.pushed_at || null,
                    homepage: data.homepage || null,
                };
            } else {
                newRepo = {
                    id: `${parsed.owner}/${parsed.repo}`,
                    name: parsed.repo,
                    description: null,
                    html_url: `https://github.com/${parsed.owner}/${parsed.repo}`,
                    language: null,
                    stargazers_count: 0,
                    updated_at: null,
                    homepage: null,
                };
            }
        } catch {
            newRepo = {
                id: `${parsed.owner}/${parsed.repo}`,
                name: parsed.repo,
                description: null,
                html_url: `https://github.com/${parsed.owner}/${parsed.repo}`,
                language: null,
                stargazers_count: 0,
                updated_at: null,
                homepage: null,
            };
        } finally {
            setIsAddingCustomRepo(false);
        }

        setSelectedRepos((prev) => [...prev, newRepo]);
        setFetchedRepos((prev) => {
            const exists = prev.some((r) => r.id === newRepo.id || r.name === newRepo.name);
            return exists ? prev : [newRepo, ...prev];
        });
        setCustomRepoInput('');
        toast.success(`Pinned ${newRepo.name}!`);
    };

    const handleToggleRepo = (repo: PinnedRepoItem) => {
        const isSelected = selectedRepos.some((r) => r.id === repo.id || r.name === repo.name);
        if (isSelected) {
            setSelectedRepos((prev) => prev.filter((r) => r.id !== repo.id && r.name !== repo.name));
        } else {
            if (selectedRepos.length >= 3) {
                toast.error('Maximum 3 repositories can be pinned.');
                return;
            }
            setSelectedRepos((prev) => [...prev, repo]);
        }
    };

    const handleSavePinnedRepos = () => {
        updateProfileState({ githubPinnedRepos: selectedRepos } as any, () =>
            profileApi.updateProfile({ githubPinnedRepos: selectedRepos } as any)
        );
        toast.success('Pinned repositories saved!');
        setIsPinModalOpen(false);
    };

    const displayLinks = buildInitialLinks().filter(l => Boolean(l.url.trim()));
    const hasLinks = displayLinks.length > 0;

    return (
        <div className="w-full bg-card rounded-xl border border-border/60 shadow-sm p-5 h-full flex flex-col justify-between">
            <div>
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-base font-bold text-foreground">Links</h3>
                    {!isEditing && (
                        <Button variant="ghost" size="sm" onClick={handleOpenEdit} className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground">
                            {hasLinks ? <PencilSquareIcon className="w-4 h-4" /> : <PlusIcon className="w-4 h-4" />}
                        </Button>
                    )}
                </div>

                {hasLinks ? (
                    <div className="flex flex-col gap-2.5">
                        {displayLinks.map(link => (
                            <a
                                key={link.id}
                                href={formatSocialUrl(link.type, link.url)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center justify-between p-2.5 rounded-xl border border-border/80 bg-muted/40 hover:bg-accent/40 hover:border-primary/40 transition-all text-xs font-semibold text-foreground group"
                            >
                                <div className="flex items-center gap-2.5 min-w-0">
                                    {link.type === 'LinkedIn' ? (
                                        <svg className="w-4 h-4 shrink-0 fill-current text-blue-600 dark:text-blue-400" viewBox="0 0 24 24">
                                            <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z"/>
                                        </svg>
                                    ) : link.type === 'GitHub' ? (
                                        <svg className="w-4 h-4 shrink-0 fill-current text-foreground" viewBox="0 0 24 24">
                                            <path d="M12 2A10 10 0 0 0 2 12c0 4.42 2.87 8.17 6.84 9.5.5.08.66-.23.66-.5v-1.69c-2.77.6-3.36-1.34-3.36-1.34-.46-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.87 1.52 2.34 1.07 2.91.83.1-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.92 0-1.11.38-2 1.03-2.71-.1-.25-.45-1.29.1-2.64 0 0 .84-.27 2.75 1.02.79-.22 1.65-.33 2.5-.33.85 0 1.71.11 2.5.33 1.91-1.29 2.75-1.02 2.75-1.02.55 1.35.2 2.39.1 2.64.65.71 1.03 1.6 1.03 2.71 0 3.82-2.34 4.66-4.57 4.91.36.31.69.92.69 1.85V21c0 .27.16.59.67.5C19.14 20.16 22 16.42 22 12A10 10 0 0 0 12 2z"/>
                                        </svg>
                                    ) : link.type === 'Resume' ? (
                                        <DocumentTextIcon className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                                    ) : (
                                        <LinkIcon className="w-4 h-4 shrink-0 text-primary" />
                                    )}
                                    <span className="truncate">{link.type}</span>
                                </div>
                                <span className="text-muted-foreground group-hover:text-primary transition-colors text-xs shrink-0 font-bold ml-2">↗</span>
                            </a>
                        ))}
                    </div>
                ) : (
                    <p className="text-sm text-muted-foreground italic">No links added.</p>
                )}

                {/* PINNED GITHUB REPOSITORIES UI */}
                <div className="mt-4 pt-3 border-t border-border/50 space-y-2.5">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                            📌 Pinned Repositories ({existingPinned.length}/3)
                        </span>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleOpenPinModal}
                            className="h-7 px-2.5 text-[11px] font-semibold text-primary border-primary/30 hover:bg-primary/5"
                        >
                            Select Repositories to Pin
                        </Button>
                    </div>

                    {existingPinned.length > 0 ? (
                        <div className="space-y-1.5">
                            {existingPinned.map((repo) => (
                                <div
                                    key={repo.id || repo.name}
                                    className="p-2 rounded-lg bg-muted/30 border border-border/60 flex items-center justify-between text-xs"
                                >
                                    <div className="min-w-0 pr-2">
                                        <p className="font-bold text-foreground truncate">{repo.name}</p>
                                        {repo.language && (
                                            <p className="text-[10px] text-muted-foreground">{repo.language}</p>
                                        )}
                                    </div>
                                    <span className="text-[10px] font-semibold px-1.5 py-0.5 bg-card rounded border border-border/50 shrink-0 text-muted-foreground">Pinned</span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-xs text-muted-foreground italic">No repositories pinned yet. Click above to select up to 3 repos for your public profile.</p>
                    )}
                </div>
            </div>

            {/* EDIT LINKS MODAL */}
            {isEditing && (
                <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4 shadow-2xl animate-in fade-in duration-200">
                    <div className="bg-card w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl border border-border shadow-2xl p-8 space-y-6">
                        <div className="flex justify-between items-center pb-2 border-b border-border/40">
                            <div>
                                <h3 className="font-bold text-lg text-foreground">Edit Links</h3>
                                <p className="text-xs text-muted-foreground">Add up to {MAX_LINKS} external links (Resume, Portfolio, GitHub, LinkedIn, Other)</p>
                            </div>
                            <button onClick={() => setIsEditing(false)} className="text-muted-foreground hover:text-foreground">✕</button>
                        </div>
                        <div className="space-y-4">
                            {linksList.map((item, index) => (
                                <div key={item.id || index} className="flex items-center gap-2">
                                    <Select
                                        value={item.type}
                                        onChange={(e) => handleTypeChange(index, e.target.value as LinkType)}
                                        disabled={isSubmitting}
                                        className="h-10 text-xs px-3 font-semibold bg-card border-border rounded-lg shrink-0 w-auto"
                                    >
                                        {LINK_TYPES.map((t) => (
                                            <option key={t} value={t}>
                                                {t}
                                            </option>
                                        ))}
                                    </Select>
                                    <Input
                                        type="text"
                                        value={item.url}
                                        onChange={(e) => handleUrlChange(index, e.target.value)}
                                        placeholder={getPlaceholder(item.type)}
                                        disabled={isSubmitting}
                                        className="h-10 flex-1 text-sm"
                                    />
                                    {linksList.length > 1 && (
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleRemoveLink(index)}
                                            disabled={isSubmitting}
                                            className="h-10 w-10 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0"
                                            title="Remove link"
                                        >
                                            <TrashIcon className="w-4 h-4" />
                                        </Button>
                                    )}
                                </div>
                            ))}

                            {linksList.length < MAX_LINKS && (
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={handleAddLink}
                                    disabled={isSubmitting}
                                    className="h-9 px-3 text-xs font-semibold gap-1.5 text-primary border-primary/30 hover:bg-primary/5"
                                >
                                    <PlusIcon className="w-3.5 h-3.5" /> Add Link ({linksList.length}/{MAX_LINKS})
                                </Button>
                            )}

                            <div className="flex justify-end gap-4 pt-2 border-t border-border/40">
                                <Button variant="outline" className="h-10 px-4" onClick={() => setIsEditing(false)} disabled={isSubmitting}>Cancel</Button>
                                <Button className="h-10 px-4 gap-1.5" onClick={handleSave} disabled={isSubmitting}><CheckIcon className="w-3.5 h-3.5" /> Save</Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* PINNED REPOSITORIES SELECTION MODAL */}
            {isPinModalOpen && (
                <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4 shadow-2xl animate-in fade-in duration-200">
                    <div className="bg-card w-full max-w-lg max-h-[85vh] flex flex-col rounded-2xl border border-border shadow-2xl p-6 space-y-4">
                        <div className="flex justify-between items-center pb-2 border-b border-border/40">
                            <div>
                                <h3 className="font-bold text-base text-foreground">Select Repositories to Pin</h3>
                                <p className="text-xs text-muted-foreground">Select up to 3 repositories to feature on your public profile</p>
                            </div>
                            <button onClick={() => setIsPinModalOpen(false)} className="text-muted-foreground hover:text-foreground">✕</button>
                        </div>

                        {/* Custom / Org Repository Input */}
                        <div className="space-y-1.5 bg-muted/30 p-3 rounded-xl border border-border/60">
                            <label className="text-xs font-semibold text-foreground">
                                Add custom/org repository URL or name
                            </label>
                            <div className="flex gap-2">
                                <Input
                                    type="text"
                                    value={customRepoInput}
                                    onChange={(e) => setCustomRepoInput(e.target.value)}
                                    placeholder="https://github.com/org/repo or org/repo"
                                    disabled={isAddingCustomRepo}
                                    className="h-9 flex-1 text-xs"
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            handleAddCustomRepo();
                                        }
                                    }}
                                />
                                <Button
                                    type="button"
                                    size="sm"
                                    onClick={handleAddCustomRepo}
                                    disabled={isAddingCustomRepo || !customRepoInput.trim()}
                                    className="h-9 px-3 text-xs font-semibold shrink-0"
                                >
                                    {isAddingCustomRepo ? 'Adding...' : 'Add Repo'}
                                </Button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                            {isFetchingRepos ? (
                                <div className="space-y-2 py-4">
                                    {[1, 2, 3].map((i) => (
                                        <div key={i} className="h-14 bg-muted/40 animate-pulse rounded-xl" />
                                    ))}
                                </div>
                            ) : fetchedRepos.length > 0 ? (
                                fetchedRepos.map((repo) => {
                                    const isChecked = selectedRepos.some((r) => r.id === repo.id || r.name === repo.name);
                                    return (
                                        <div
                                            key={repo.id}
                                            onClick={() => handleToggleRepo(repo)}
                                            className={`p-3 rounded-xl border transition-all cursor-pointer flex items-start gap-3 ${
                                                isChecked
                                                    ? 'bg-primary/5 border-primary/50 text-foreground'
                                                    : 'bg-muted/30 border-border/60 hover:bg-muted/60 text-muted-foreground'
                                            }`}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={isChecked}
                                                onChange={() => {}}
                                                className="mt-1 h-4 w-4 rounded border-border text-primary focus:ring-primary cursor-pointer"
                                            />
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center justify-between gap-2">
                                                    <p className="font-bold text-sm text-foreground truncate">{repo.name}</p>
                                                    {repo.language && (
                                                        <span className="px-2 py-0.5 text-[10px] font-semibold bg-card rounded border border-border/50 shrink-0">
                                                            {repo.language}
                                                        </span>
                                                    )}
                                                </div>
                                                {repo.description && (
                                                    <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                                                        {repo.description}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })
                            ) : (
                                <p className="text-sm text-muted-foreground text-center py-6">
                                    {githubUsername ? `No public repositories found for @${githubUsername}.` : 'Enter a repository URL or name above to pin.'}
                                </p>
                            )}
                        </div>

                        <div className="flex items-center justify-between pt-3 border-t border-border/40">
                            <span className="text-xs font-semibold text-muted-foreground">
                                Selected {selectedRepos.length} / 3
                            </span>
                            <div className="flex gap-2">
                                <Button variant="outline" size="sm" onClick={() => setIsPinModalOpen(false)}>
                                    Cancel
                                </Button>
                                <Button size="sm" onClick={handleSavePinnedRepos}>
                                    Save Pinned Repos
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
