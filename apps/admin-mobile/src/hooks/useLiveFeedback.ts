import { useState, useEffect, useCallback } from 'react';
import { getFirebaseDatabaseUrl } from '../config/firebase';

let databaseInstance: any;

function getDb() {
  if (databaseInstance !== undefined) return databaseInstance;
  try {
    const firebase = require('@react-native-firebase/app').default;
    require('@react-native-firebase/database');
    databaseInstance = firebase.app().database(getFirebaseDatabaseUrl());
  } catch (error) {
    console.warn('[useLiveFeedback] Firebase Database unavailable:', error);
    databaseInstance = null;
  }
  return databaseInstance;
}

export interface UserProfile {
    fullName?: string;
    email?: string;
    username?: string;
}

export interface FirebaseOpportunityReport {
    id: string;
    jobId: string;
    reason: string;
    createdAt: number;
    userId: string;
    user?: UserProfile;
}

export interface FirebaseAppFeedback {
    id: string;
    type: string;
    rating?: number;
    message: string;
    createdAt: number;
    userId: string;
    user?: UserProfile;
}

export interface LiveCommentItem {
    id: string;
    jobId: string;
    text: string;
    createdAt: string;
    user: {
        id: string;
        fullName?: string | null;
        username?: string | null;
    };
}

export function useLiveFeedback() {
  const [oppReports, setOppReports] = useState<FirebaseOpportunityReport[]>([]);
  const [appFeedback, setAppFeedback] = useState<FirebaseAppFeedback[]>([]);
  const [liveComments, setLiveComments] = useState<LiveCommentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const database = getDb();
    if (!database) {
      setIsLoading(false);
      return;
    }

    const usersRef = database.ref('/users');
    const commentsRef = database.ref('/comments');

    const handleUsersChange = (snapshot: any) => {
        const data = snapshot.val();
        const reports: FirebaseOpportunityReport[] = [];
        const feedbackList: FirebaseAppFeedback[] = [];

        if (data) {
            Object.entries(data).forEach(([userId, userNode]: [string, any]) => {
                const profile = userNode.careerProfile || {};
                const userProfile = {
                    fullName: profile.fullName || profile.personalInfo?.fullName || '',
                    email: profile.email || profile.personalInfo?.email || '',
                    username: profile.username || '',
                };

                // Opportunity Reports
                const reportsNode = userNode.feedback?.opportunities;
                if (reportsNode && typeof reportsNode === 'object') {
                    Object.entries(reportsNode).forEach(([jobId, reportItem]: [string, any]) => {
                        reports.push({
                            id: `${userId}_${jobId}`,
                            jobId,
                            reason: reportItem.reason || 'OTHER',
                            createdAt: reportItem.createdAt || Date.now(),
                            userId,
                            user: userProfile,
                        });
                    });
                }

                // App Feedback
                const feedbackNode = userNode.feedback?.global;
                if (feedbackNode && typeof feedbackNode === 'object') {
                    Object.entries(feedbackNode).forEach(([pushId, feedbackItem]: [string, any]) => {
                        feedbackList.push({
                            id: pushId,
                            type: feedbackItem.type || 'FEEDBACK',
                            rating: feedbackItem.rating,
                            message: feedbackItem.message || '',
                            createdAt: feedbackItem.createdAt || Date.now(),
                            userId,
                            user: userProfile,
                        });
                    });
                }
            });
        }

        reports.sort((a, b) => b.createdAt - a.createdAt);
        feedbackList.sort((a, b) => b.createdAt - a.createdAt);

        setOppReports(reports);
        setAppFeedback(feedbackList);
        setIsLoading(false);
    };

    const handleCommentsChange = (snapshot: any) => {
        const data = snapshot.val();
        const commentsList: LiveCommentItem[] = [];

        if (data) {
            Object.entries(data).forEach(([jobId, jobComments]: [string, any]) => {
                if (jobComments && typeof jobComments === 'object') {
                    Object.entries(jobComments).forEach(([commentId, commentItem]: [string, any]) => {
                        commentsList.push({
                            id: commentId,
                            jobId,
                            text: commentItem.text || '',
                            createdAt: commentItem.createdAt || new Date().toISOString(),
                            user: {
                                id: commentItem.user?.id || 'unknown',
                                fullName: commentItem.user?.fullName || null,
                                username: commentItem.user?.username || null,
                            }
                        });
                    });
                }
            });
        }

        commentsList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setLiveComments(commentsList);
    };

    usersRef.on('value', handleUsersChange);
    commentsRef.on('value', handleCommentsChange);

    return () => {
      usersRef.off('value', handleUsersChange);
      commentsRef.off('value', handleCommentsChange);
    };
  }, []);

  const deleteComment = useCallback(async (jobId: string, commentId: string) => {
      const database = getDb();
      if (!database) return;
      await database.ref(`/comments/${jobId}/${commentId}`).remove();
  }, []);

  const deleteReport = useCallback(async (userId: string, jobId: string) => {
      const database = getDb();
      if (!database) return;
      await database.ref(`/users/${userId}/feedback/opportunities/${jobId}`).remove();
  }, []);

  const deleteAppFeedback = useCallback(async (userId: string, pushId: string) => {
      const database = getDb();
      if (!database) return;
      await database.ref(`/users/${userId}/feedback/global/${pushId}`).remove();
  }, []);

  return {
    oppReports,
    appFeedback,
    liveComments,
    isLoading,
    deleteComment,
    deleteReport,
    deleteAppFeedback
  };
}
