export {
  coachChatActionOutputSchema,
  coachChatOutputV1Schema,
  coachNoteRefreshOutputV1Schema,
  plannedWorkoutOutputV1Schema,
  postWorkoutFeedbackOutputV1Schema,
  trainingPlanOutputV1Schema
} from "@/server/ai/output-schemas";
export type {
  CoachChatOutputV1,
  CoachNoteRefreshOutputV1,
  PlannedWorkoutOutputV1,
  PostWorkoutFeedbackOutputV1,
  TrainingPlanOutputV1
} from "@/server/ai/output-schemas";
export type {
  AiProvider,
  AiProviderRequest,
  AiProviderResponse
} from "@/server/ai/provider";
export { fakeAiProvider } from "@/server/ai/fake-provider";
export { getConfiguredAiProvider } from "@/server/ai/providers";
