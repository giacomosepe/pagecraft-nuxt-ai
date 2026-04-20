# Batch 5 — Polish, Consistency, And Regression Cleanup

## Goal

Close the restyling with a consistency sweep, interaction polish, and risk-focused QA so the product is ready for the V0.5 real-user test.

## Pages And Components In Scope

- all restyled pages from batches 1 through 4
- shared utilities and any remaining visual outliers
- loading, empty, error, and success states across the app

## Main Refactor Outcomes

- Audit typography, spacing, radius, shadows, and icon usage across all surfaces
- Eliminate leftover legacy patterns and visual drift
- Smooth transitions between pages, especially after creates, saves, and navigation changes
- Verify responsive behavior and long-content handling
- Run targeted cleanup on naming, duplication, and component boundaries introduced during the migration

## Consistency Checklist

- same page header grammar across the app
- same list toolbar behavior across entity surfaces
- same card and panel styling language
- same button hierarchy and destructive action treatment
- same empty, loading, and error tone
- same spacing rhythm between sections

## QA Focus

- clients and projects navigation
- document editor usability during long sessions
- create and edit flows
- mobile shell and tablet breakpoints
- regression checks for the legal-document workflow, not just static visuals

## Exit Criteria

- No page feels visually “pre-restyle” compared to the rest
- Shared components clearly own the app’s visual language
- Known edge states are intentionally designed
- We are comfortable putting the app in front of real V0.5 users

## Risks To Watch

- Declaring design done while inconsistent states remain
- Skipping regression checks because the work is “just styling”
- Leaving a trail of near-duplicate components after the migration
