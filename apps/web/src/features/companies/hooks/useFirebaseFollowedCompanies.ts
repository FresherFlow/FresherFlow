import { useEffect, useState } from 'react';
import { database } from '@/lib/api/firebase';
import { ref, onValue, set, remove } from 'firebase/database';

export type FirebaseFollowedCompaniesMap = Record<string, { followedAt: number }>;

export function useFirebaseFollowedCompanies(userId: string | undefined) {
    const [followedMap, setFollowedMap] = useState<FirebaseFollowedCompaniesMap>({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!userId) {
            setFollowedMap({});
            setLoading(false);
            return;
        }

        setLoading(true);
        const followRef = ref(database, `/users/${userId}/followedCompanies`);

        const unsubscribe = onValue(
            followRef,
            (snapshot) => {
                setFollowedMap(snapshot.val() || {});
                setLoading(false);
            },
            () => {
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, [userId]);

    const followCompany = async (companySlug: string) => {
        if (!userId) return;
        const itemRef = ref(database, `/users/${userId}/followedCompanies/${companySlug}`);
        await set(itemRef, { followedAt: Date.now() });
    };

    const unfollowCompany = async (companySlug: string) => {
        if (!userId) return;
        const itemRef = ref(database, `/users/${userId}/followedCompanies/${companySlug}`);
        await remove(itemRef);
    };

    const toggleFollow = async (companySlug: string) => {
        if (followedMap[companySlug]) {
            await unfollowCompany(companySlug);
        } else {
            await followCompany(companySlug);
        }
    };

    const isFollowing = (companySlug: string) => !!followedMap[companySlug];

    return { followedMap, loading, followCompany, unfollowCompany, toggleFollow, isFollowing };
}
