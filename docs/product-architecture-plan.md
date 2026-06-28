# Personal Health Intelligence Platform Plan

## Vision

Build a personal, AI-powered health platform that answers two questions with minimal effort from the user:

- What should I do today?
- Am I moving in the right direction?

The first version is exercise-only, but the architecture should be the first slice of a broader Personal Health Intelligence Platform covering training, cardio, body composition, nutrition, biomarkers, device integrations, and longitudinal insights.

The product should prioritize long-term adherence over perfect accuracy. When there is a tradeoff, prefer simplicity, automation, and good-enough estimates over high-friction precision.

## V1 Scope

V1 focuses on exercise planning, workout execution, and adaptive training feedback.

The app should:

- Store user profile, goals, constraints, injuries, preferences, and equipment.
- Store available equipment and load options so recommendations only use possible weights.
- Generate two-week training blocks from goals, history, preferences, constraints, and equipment.
- Generate the next concrete workout after each completed, skipped, or partially completed workout.
- Support set-by-set logging for strength training.
- Support planned and completed cardio sessions in the data model, even if cardio UX is lighter in the first release.
- Provide persistent coach notes before, during, and after workouts.
- Support contextual coach chat during workouts.
- Show concise rationale by default with expandable detail.

Out of scope for v1:

- Nutrition logging beyond profile notes or future-ready placeholders.
- Smart scale integrations.
- Wearable integrations.
- Biomarker provider integrations.
- Commercial identity features such as SAML, organization management, audit logging, billing, or enterprise administration.
- Remote access, unless added later.

## User Experience

The app should be mobile-first and optimized for use during an actual workout.

Main navigation:

- Today
- Plan
- Logs
- Profile

First-run onboarding should collect only the essentials:

- Equipment and available loads.
- Goals and goal priority.
- Constraints, injuries, and exercises to avoid.
- Exercises the user enjoys.
- Basic profile and baseline measurements.
- Preferred training times.

The Today screen should open directly to the recommended workout. A workout should include:

- Warmup.
- Exercises.
- Sets.
- Reps.
- Target weight.
- Rest period.
- Target intensity, such as RPE or RIR.
- Progression guidance.
- Coach notes.
- Expandable rationale.

Workout logging should be set-by-set and should preserve planned versus actual performance:

- Exercise.
- Planned weight.
- Actual weight.
- Planned reps.
- Actual reps.
- RPE or RIR.
- Skipped sets.
- Substitutions.
- Pain, difficulty, and freeform notes.

Users should be able to make quick changes without turning the app into a full spreadsheet:

- Swap an exercise.
- Reduce or increase intensity.
- Change duration.
- Skip with a reason.

## Coaching And Planning

The AI coaching engine should produce recommendations in two-to-four-week training blocks. V1 should default to two-week blocks.

Inputs over time should include:

- Historical strength performance.
- Cardio performance.
- Weight trends.
- Body composition trends.
- Circumference measurements.
- Nutrition adherence.
- Biomarker trends.
- User goals.
- User preferences and constraints.
- Equipment availability.

V1 uses only the exercise, profile, goal, constraint, and equipment inputs that exist initially, but the planning interface should be designed so additional health signals can be added later without redesigning the job system.

Planning jobs:

- `biweekly_plan_review`: runs every two weeks and creates the broad plan for the next training block.
- `next_workout_generation`: runs after each completed, skipped, or partially completed workout and creates the next concrete workout.
- `post_workout_feedback`: summarizes how the workout went, whether current progress is on target, and what should change next.
- `coach_note_refresh`: updates persistent notes used before, during, and after workouts.

The biweekly plan should define broad structure, such as:

- Strength sessions per week.
- Cardio sessions per week.
- Training emphasis.
- Progression expectations.
- Recovery considerations.
- Measurement reminders.

The post-workout generation job should determine specifics:

- Warmup.
- Exercise selection.
- Sets.
- Reps.
- Target weights.
- Rest.
- Target intensity.
- Substitutions if needed.
- Next-step coaching notes.

Missed, skipped, or partially completed workouts should automatically adapt the next workout based on the reason and actual completion.

## Architecture

Default v1 deployment is self-hosted on a Synology NAS or Linux host using Docker containers.

The architecture should remain portable enough to move later to managed infrastructure such as Vercel, Railway, a managed Postgres provider, or another cloud host without a structural overhaul.

Core runtime components:

- Mobile-first web app.
- Backend API service.
- Worker process from the same codebase.
- PostgreSQL database.
- Scheduler using Linux cron, systemd timers, or an app-level scheduler.
- External AI API provider.

Trigger.dev, Inngest, or similar managed job platforms are not required for v1. They remain optional future replacements if the app later moves to a serverless or managed deployment model.

The backend service can handle scheduled work by enqueueing jobs into Postgres. The worker process should claim jobs, execute them, retry failures, store errors, and preserve the last valid plan or workout if generation fails.

## Data Architecture

Use one PostgreSQL database with many related tables. Include `user_id` on core tables even though v1 is single-user, so future multi-user support or managed deployment remains practical.

Initial exercise-focused tables should include:

- Users and profile.
- User measurements.
- Goals.
- Equipment.
- Available loads and load increments.
- Exercise library.
- Exercise preferences and avoid lists.
- Training plans.
- Planned workouts.
- Planned workout exercises.
- Planned workout sets.
- Completed workouts.
- Completed workout exercises.
- Completed exercise sets.
- Cardio activities.
- Coach notes.
- AI recommendation rationale.
- Jobs and job runs.

Future-ready domains should be represented with clean extension points, not fully built unless needed:

- Body metrics.
- Nutrition entries.
- Biomarker results.
- Device integrations.
- Integration sync jobs.
- Insight events.

The data model should support longitudinal health tracking across:

- Physical performance.
- Cardio performance.
- Body composition.
- Nutrition habits.
- Biomarkers.
- Behavioral trends.

## Future Domains

### Body Composition

Future smart scale integrations should support automatic sync of:

- Weight.
- Body fat percentage.
- Lean mass.
- Muscle mass.
- Water percentage.

Potential vendors to evaluate later:

- Withings.
- Garmin.

Weight may be collected daily, while body composition should be interpreted through daily or weekly trends rather than single readings.

### Manual Measurements

The app should eventually prompt for body measurements every two to four weeks:

- Waist.
- Hips.
- Chest.
- Arms.
- Thighs.
- Neck.

The app should provide guidance on how and when to measure so measurements remain consistent over time.

### Nutrition

The target nutrition workflow should be frictionless:

1. User photographs a meal.
2. AI estimates food items.
3. AI estimates calories and macros.
4. User optionally edits results.

Track:

- Calories.
- Protein.
- Carbohydrates.
- Fat.

Precision is less important than consistency.

### Biomarkers

Future biomarker tracking should support annual, biannual, monthly, or quarterly testing cadences depending on provider and test type.

Example biomarker categories:

- CBC.
- CMP.
- Lipid panel.
- Hemoglobin A1C.
- Fasting glucose.
- Insulin.
- Vitamin D.
- Testosterone.
- hs-CRP.
- Ferritin.
- Thyroid markers.

Potential vendors to evaluate later:

- InsideTracker.
- Function Health.
- Quest Diagnostics.
- Labcorp.

Requirements for any biomarker integration:

- API access to results.
- User ownership of data.
- Historical trend analysis.

### Device Integrations

Future integration phases:

- Phase 1: smart scale API, Apple Health, meal photo recognition.
- Phase 2: wearables, Strava, Garmin, biomarker providers.
- Phase 3: continuous glucose monitors, sleep tracking, recovery metrics.

Device integration records should eventually store:

- Connected account.
- Provider.
- Token metadata.
- Sync settings.
- Last sync status.
- Last successful sync time.

Secrets and tokens should be stored securely and isolated from ordinary application data.

## AI And Vendor Strategy

Use external AI API calls. Do not plan for local model hosting.

The AI provider is the most important external vendor because health profile details, goals, injuries, constraints, workout logs, and eventually nutrition or biomarker summaries may be sent to it.

Keep the vendor list lean for v1:

- AI API provider.
- Optional domain or DNS provider later.
- Optional managed app/database hosting later.
- Optional error monitoring later.

Avoid unnecessary commercial services in v1:

- Analytics.
- Email notifications.
- Payment systems.
- Enterprise auth.
- Remote access tooling.
- Managed job orchestration.

For any future vendor that touches user data, maintain a subprocessor register with:

- Vendor name.
- Purpose.
- Data shared.
- Retention settings.
- Failure impact.
- Whether sensitive health data is shared.

## Reporting And Insights

The platform should eventually answer:

- Am I getting healthier?
- Am I gaining muscle?
- Am I losing fat?
- Which habits improve my results?
- Which habits correlate with setbacks?
- How am I performing relative to my goals?

Example insights:

- Average weight decreased while strength was maintained.
- Waist measurement decreased despite stable body weight.
- Protein intake was below target on recent days.
- Resting heart rate increased for two consecutive weeks.
- Squat performance improved over the last training block.

V1 should begin this pattern with exercise-focused insights:

- Strength trend by lift or movement pattern.
- Consistency over the current training block.
- Planned versus completed work.
- Load progression.
- Missed or modified sessions.
- Goal alignment.

## Test Scenarios

V1 should verify:

- Onboarding stores profile, equipment, constraints, and goals.
- Today view renders a generated workout using only available equipment and possible weights.
- Set-by-set logging preserves planned versus actual work.
- Completing a workout creates post-workout feedback and next-workout generation jobs.
- Skipped or partial workouts adapt the next workout.
- Biweekly review creates a broad two-week plan with goal-linked rationale.
- Worker failures are logged, retried, and do not destroy the last usable plan.
- Coach chat answers from workout context without mutating logs unless the user explicitly acts.
- The self-hosted deployment works locally while preserving a path to managed deployment later.

Future test coverage should add:

- Smart scale sync.
- Cardio import.
- Meal photo estimation.
- Biomarker import.
- Cross-domain insight generation.

## Success Criteria

The platform succeeds when:

- Data collection is mostly automatic.
- User engagement remains high after 90 days.
- Logging requires minimal effort.
- Recommendations improve over time.
- The user can quickly answer what to do today.
- The user can quickly understand whether they are moving in the right direction.

## Assumptions

- V1 is exercise-only.
- Self-hosting on Synology NAS or Linux is the default target.
- Remote access is not necessary for now.
- Managed deployment remains a future option.
- PostgreSQL is the system of record.
- External AI API calls are expected and important.
- Recommendation reasoning is concise by default and expandable when needed.
- Future health domains should be supported architecturally, but not fully implemented in v1.
