-- Add new action states for end-to-end tracker flow
ALTER TYPE "ActionType" ADD VALUE IF NOT EXISTS 'PLANNED';
ALTER TYPE "ActionType" ADD VALUE IF NOT EXISTS 'INTERVIEWED';
ALTER TYPE "ActionType" ADD VALUE IF NOT EXISTS 'SELECTED';
