-- Add VIEWED action for passive opportunity tracking
ALTER TYPE "ActionType" ADD VALUE IF NOT EXISTS 'VIEWED';
