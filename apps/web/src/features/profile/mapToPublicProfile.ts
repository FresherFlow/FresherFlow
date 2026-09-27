import type { Profile, Project, User } from '@fresherflow/types';
import type { PublicProfile } from '@/features/profile/publicProfile';
import type { PublicProfileData } from '@/features/profile/components/public/PublicProfileClient';

/**
 * One mapping, in one file.
 *
 * The Preview section renders the *real* `PublicProfileClient`, so it has to hand it the same
 * shape the public API returns. Guessing that shape inline is how a preview silently drifts
 * from the live page — a field gets renamed, and the preview just stops showing it. Keeping
 * the conversion here means there is exactly one place to fix when the contract moves.
 */

/**
 * Projects arrive in two real shapes: the session profile's stored rows (`Project.name`,
 * plus the link/skill fields the Links & Work editor saves alongside) and the public
 * API's payload (`title`, as the page renders it). Both are typed — no `unknown` cast —
 * so a shape change fails the build instead of silently dropping projects.
 */
type SessionProject = Project & Partial<PublicProfile['projects'][number]>;

function toPublicProjects(projects: SessionProject[] | undefined): PublicProfile['projects'] {
    if (!projects) return [];
    return projects
        .map((project, index) => {
            const title = project?.title || project?.name;
            // The public page renders the title, so a project without one is not renderable.
            if (!title) return null;
            return {
                id: String(project?.id ?? `${title}-${index}`),
                title,
                description: project?.description ?? null,
                githubUrl: project?.githubUrl ?? null,
                liveUrl: project?.liveUrl ?? null,
                skills: Array.isArray(project?.skills) ? project.skills : [],
            };
        })
        .filter((project): project is PublicProfile['projects'][number] => project !== null);
}

function toIsoString(value: Date | string | null | undefined): string | null {
    if (!value) return null;
    const date = value instanceof Date ? value : new Date(value);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function toPublicProfile(
    profile: Profile | null,
    user: User | null,
    options: {
        /** Last activation stamp. Only pass this while the page is inside its live window. */
        lastActivatedAt?: Date | string | null;
        completionPercentage?: number;
    } = {},
): PublicProfile {
    return {
        userId: user?.id ?? profile?.userId ?? '',
        fullName: user?.fullName ?? null,
        username: user?.username ?? null,
        avatarUrl: profile?.avatarUrl ?? null,
        memberSince: toIsoString(user?.createdAt) ?? undefined,
        headline: profile?.headline ?? null,
        about: profile?.about ?? null,
        // The public page labels these "degree / specialization"; the editor calls them
        // grad course / grad specialization. Same field, two vocabularies.
        degree: profile?.gradCourse ?? null,
        specialization: profile?.gradSpecialization ?? null,
        gradYear: profile?.gradYear ?? null,
        collegeName: profile?.collegeName ?? null,
        educationLevel: profile?.educationLevel ?? null,
        skills: profile?.skills ?? [],
        availability: profile?.availability ?? null,
        preferredCities: profile?.preferredCities ?? [],
        workModes: profile?.workModes ?? [],
        expectedCtc: profile?.expectedCtc ?? null,
        resumeUrl: profile?.resumeUrl ?? null,
        willingToRelocate: profile?.willingToRelocate ?? null,
        // Recruiters are opted out only when explicitly set to false, matching the page.
            openToRecruiters: profile?.openToRecruiters ?? false,
        lastActivatedAt: toIsoString(options.lastActivatedAt),
        completionPercentage: options.completionPercentage,
        projects: toPublicProjects(profile?.projects),
    };
}

/**
 * The public API returns one flat `PublicProfile`; the page component renders a
 * `user` + `profile` pair. This is the one place that split happens, so the live
 * page and the editor preview both reach the component through the same shape and
 * cannot drift.
 *
 * Fields the flat API does not carry yet (social links, PG/10th/12th years, target
 * roles) map to `null`/omitted rather than being invented — the page already
 * treats every one of them as optional.
 */
export function toPublicProfileData(profile: PublicProfile): PublicProfileData {
    return {
        user: {
            id: profile.userId,
            fullName: profile.fullName,
            username: profile.username ?? '',
            createdAt: profile.memberSince ?? '',
        },
        profile: {
            headline: profile.headline,
            about: profile.about,
            skills: profile.skills,
            // The public page labels these "degree / specialization"; the API payload
            // calls them grad course / grad specialization. Same field, two vocabularies.
            gradCourse: profile.degree,
            gradSpecialization: profile.specialization,
            gradYear: profile.gradYear,
            collegeName: profile.collegeName,
            educationLevel: profile.educationLevel,
            githubUrl: null,
            linkedinUrl: null,
            portfolioUrl: null,
            avatarUrl: profile.avatarUrl,
            resumeUrl: profile.resumeUrl,
            availability: profile.availability,
            preferredCities: profile.preferredCities,
            workModes: profile.workModes,
            openToRecruiters: profile.openToRecruiters,
            openToRelocate: profile.willingToRelocate ?? undefined,
            completionPercentage: profile.completionPercentage,
            projects: (profile.projects || []).map((project) => ({
                id: project.id,
                title: project.title,
                description: project.description ?? '',
                skills: project.skills,
                githubUrl: project.githubUrl ?? undefined,
                liveUrl: project.liveUrl ?? undefined,
            })),
        },
    };
}
