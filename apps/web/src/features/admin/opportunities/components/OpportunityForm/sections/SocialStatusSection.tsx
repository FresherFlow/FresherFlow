'use client';

import { ArrowPathIcon, ExclamationTriangleIcon, CheckCircleIcon, ClockIcon, NoSymbolIcon } from '@heroicons/react/24/outline';
import { adminApi } from '@/shared/api/admin';
import toast from 'react-hot-toast';
import { useState } from 'react';
import { SocialPost } from '@fresherflow/types';

interface SocialStatusSectionProps {
  socialPosts: SocialPost[];
  onRefresh: () => void;
}

export function SocialStatusSection({ socialPosts, onRefresh }: SocialStatusSectionProps) {
  const [retryingIds, setRetryingIds] = useState<Record<string, boolean>>({});

  const handleRetry = async (postId: string) => {
    setRetryingIds(prev => ({ ...prev, [postId]: true }));
    try {
      await adminApi.retrySocialPost(postId);
      toast.success('Retry triggered successfully');
      setTimeout(onRefresh, 1500); // Give backend a moment before refreshing
    } catch (err: unknown) {
      toast.error(`Retry failed: ${(err as Error).message}`);
    } finally {
      setRetryingIds(prev => ({ ...prev, [postId]: false }));
    }
  };

  if (!socialPosts || socialPosts.length === 0) return null;

  return (
    <div className="bg-card rounded-lg border border-border overflow-hidden shadow-sm">
      <div className="flex items-center justify-between px-6 py-4 border-b border-border/50 bg-muted/20">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Social Delivery Status</h2>
          <p className="text-sm text-muted-foreground mt-1">Cross-platform publish flow visibility.</p>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          className="p-2 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
          title="Refresh Status"
        >
          <ArrowPathIcon className="w-5 h-5" />
        </button>
      </div>

      <div className="divide-y divide-border/50">
        {socialPosts.map(post => {
          let StatusIcon = ClockIcon;
          let statusColorStr = "text-yellow-500 bg-yellow-500/10";
          if (post.status === 'PUBLISHED') {
             StatusIcon = CheckCircleIcon;
             statusColorStr = "text-green-500 bg-green-500/10";
          } else if (post.status === 'FAILED') {
             StatusIcon = ExclamationTriangleIcon;
             statusColorStr = "text-red-500 bg-red-500/10";
          } else if (post.status === 'DISABLED') {
             StatusIcon = NoSymbolIcon;
             statusColorStr = "text-muted-foreground bg-muted/30";
          } else if (post.status === 'DRY_RUN') {
             StatusIcon = CheckCircleIcon;
             statusColorStr = "text-blue-500 bg-blue-500/10";
          }

          return (
            <div key={post.id} className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className={`p-2 rounded-full mt-1 shrink-0 ${statusColorStr}`}>
                  <StatusIcon className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-foreground capitalize">{post.platform.toLowerCase()}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColorStr}`}>
                      {post.status.replace('_', ' ')}
                    </span>
                  </div>

                  {post.errorMessage && (
                    <p className="text-sm text-red-500 mt-2 font-mono bg-red-500/10 p-2 rounded">
                      {post.errorMessage}
                    </p>
                  )}

                  {!!post.payload && typeof post.payload === 'object' && !!(post.payload as Record<string, unknown>).text && (
                    <div className="mt-3">
                      <p className="text-[10px] font-medium text-muted-foreground capitalize tracking-wider mb-1">Generated Caption Preview</p>
                      <pre className="text-xs bg-muted/50 p-3 rounded-md border border-border/50 font-sans whitespace-pre-wrap text-foreground italic leading-relaxed">
                        {String((post.payload as Record<string, unknown>).text)}
                      </pre>
                    </div>
                  )}

                  <div className="text-xs text-muted-foreground mt-3 space-y-1">
                    {post.publishedAt && (
                      <p>Published: {new Date(post.publishedAt).toLocaleString()}</p>
                    )}
                    {post.externalPostId && (
                      <p>Ext ID: <code className="text-[10px] bg-muted px-1 py-0.5 rounded">{post.externalPostId}</code></p>
                    )}
                    {post.retryCount > 0 && (
                      <p>Retries: {post.retryCount}</p>
                    )}
                    <p className="text-[10px] opacity-70">Dedupe Key: {post.dedupeKey}</p>
                  </div>
                </div>
              </div>

              {post.status === 'FAILED' && (
                <button
                  type="button"
                  disabled={retryingIds[post.id]}
                  onClick={() => handleRetry(post.id)}
                  className="shrink-0 self-start md:self-center inline-flex h-8 items-center justify-center rounded-md border border-input bg-background px-4 text-xs font-medium text-foreground transition-all hover:bg-accent disabled:opacity-50"
                >
                  {retryingIds[post.id] ? (
                    <ArrowPathIcon className="w-3.5 h-3.5 animate-spin mr-1.5" />
                  ) : (
                    <ArrowPathIcon className="w-3.5 h-3.5 mr-1.5" />
                  )}
                  Retry Post
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
