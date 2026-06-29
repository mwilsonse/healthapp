import {
  ExerciseModality,
  ExerciseStatus,
  MovementPattern,
  type Prisma
} from "@prisma/client";

type ExerciseSeed = Prisma.ExerciseCreateManyInput;

function normalizeName(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function exercise(input: Omit<ExerciseSeed, "normalizedName" | "status">) {
  return {
    ...input,
    normalizedName: normalizeName(input.name),
    status: ExerciseStatus.ACTIVE
  } satisfies ExerciseSeed;
}

export const exerciseSeeds: ExerciseSeed[] = [
  exercise({
    name: "Back Squat",
    modality: ExerciseModality.STRENGTH,
    movementPattern: MovementPattern.SQUAT,
    primaryMuscles: ["quadriceps", "glutes"],
    secondaryMuscles: ["hamstrings", "trunk"],
    equipmentTypes: ["barbell"],
    contraindicationTags: ["knee-pain", "back-pain"],
    substitutionTags: ["squat", "lower-body"],
    instructions: "Barbell squat pattern with controlled depth and bracing."
  }),
  exercise({
    name: "Goblet Squat",
    modality: ExerciseModality.STRENGTH,
    movementPattern: MovementPattern.SQUAT,
    primaryMuscles: ["quadriceps", "glutes"],
    secondaryMuscles: ["trunk"],
    equipmentTypes: ["dumbbell", "kettlebell"],
    contraindicationTags: ["knee-pain"],
    substitutionTags: ["squat", "lower-body"],
    instructions: "Hold one load at the chest and squat with a vertical torso."
  }),
  exercise({
    name: "Romanian Deadlift",
    modality: ExerciseModality.STRENGTH,
    movementPattern: MovementPattern.HINGE,
    primaryMuscles: ["hamstrings", "glutes"],
    secondaryMuscles: ["back"],
    equipmentTypes: ["barbell", "dumbbell"],
    contraindicationTags: ["back-pain"],
    substitutionTags: ["hinge", "posterior-chain"],
    instructions: "Hip hinge with soft knees and controlled range of motion."
  }),
  exercise({
    name: "Push-Up",
    modality: ExerciseModality.STRENGTH,
    movementPattern: MovementPattern.PUSH,
    primaryMuscles: ["chest", "triceps"],
    secondaryMuscles: ["shoulders", "trunk"],
    equipmentTypes: ["bodyweight"],
    contraindicationTags: ["wrist-pain", "shoulder-pain"],
    substitutionTags: ["horizontal-push", "bodyweight"],
    instructions: "Bodyweight horizontal press with a straight body line."
  }),
  exercise({
    name: "Dumbbell Bench Press",
    modality: ExerciseModality.STRENGTH,
    movementPattern: MovementPattern.PUSH,
    primaryMuscles: ["chest", "triceps"],
    secondaryMuscles: ["shoulders"],
    equipmentTypes: ["dumbbell"],
    contraindicationTags: ["shoulder-pain"],
    substitutionTags: ["horizontal-push", "upper-body"],
    instructions: "Press dumbbells from chest level while controlling shoulder position."
  }),
  exercise({
    name: "One-Arm Dumbbell Row",
    modality: ExerciseModality.STRENGTH,
    movementPattern: MovementPattern.PULL,
    primaryMuscles: ["lats", "upper-back"],
    secondaryMuscles: ["biceps"],
    equipmentTypes: ["dumbbell"],
    contraindicationTags: ["back-pain"],
    substitutionTags: ["horizontal-pull", "upper-body"],
    instructions: "Pull the dumbbell toward the hip while keeping the torso stable."
  }),
  exercise({
    name: "Reverse Lunge",
    modality: ExerciseModality.STRENGTH,
    movementPattern: MovementPattern.LUNGE,
    primaryMuscles: ["quadriceps", "glutes"],
    secondaryMuscles: ["hamstrings", "trunk"],
    equipmentTypes: ["bodyweight", "dumbbell"],
    contraindicationTags: ["knee-pain"],
    substitutionTags: ["single-leg", "lower-body"],
    instructions: "Step backward into a lunge and return under control."
  }),
  exercise({
    name: "Farmer Carry",
    modality: ExerciseModality.STRENGTH,
    movementPattern: MovementPattern.CARRY,
    primaryMuscles: ["grip", "traps", "trunk"],
    secondaryMuscles: ["glutes"],
    equipmentTypes: ["dumbbell", "kettlebell"],
    contraindicationTags: ["grip-pain"],
    substitutionTags: ["carry", "trunk"],
    instructions: "Walk with heavy implements while staying tall and braced."
  }),
  exercise({
    name: "Pallof Press",
    modality: ExerciseModality.STRENGTH,
    movementPattern: MovementPattern.ROTATION,
    primaryMuscles: ["trunk"],
    secondaryMuscles: ["shoulders"],
    equipmentTypes: ["band", "cable"],
    contraindicationTags: ["shoulder-pain"],
    substitutionTags: ["anti-rotation", "trunk"],
    instructions: "Press the handle away from the chest while resisting rotation."
  }),
  exercise({
    name: "Dumbbell Curl",
    modality: ExerciseModality.STRENGTH,
    movementPattern: MovementPattern.ISOLATION,
    primaryMuscles: ["biceps"],
    secondaryMuscles: ["forearms"],
    equipmentTypes: ["dumbbell"],
    contraindicationTags: ["elbow-pain"],
    substitutionTags: ["arm-isolation", "upper-body"],
    instructions: "Curl dumbbells with controlled elbow position."
  }),
  exercise({
    name: "Cat-Cow",
    modality: ExerciseModality.MOBILITY,
    movementPattern: MovementPattern.MOBILITY,
    primaryMuscles: ["spine"],
    secondaryMuscles: ["trunk"],
    equipmentTypes: ["bodyweight"],
    contraindicationTags: [],
    substitutionTags: ["spine-mobility", "warmup"],
    instructions: "Move slowly between spinal flexion and extension."
  }),
  exercise({
    name: "World's Greatest Stretch",
    modality: ExerciseModality.WARMUP,
    movementPattern: MovementPattern.MOBILITY,
    primaryMuscles: ["hips", "thoracic-spine"],
    secondaryMuscles: ["hamstrings"],
    equipmentTypes: ["bodyweight"],
    contraindicationTags: ["hip-pain"],
    substitutionTags: ["dynamic-warmup", "mobility"],
    instructions: "Dynamic lunge-based mobility drill for hips and thoracic rotation."
  }),
  exercise({
    name: "Walking",
    modality: ExerciseModality.CARDIO,
    movementPattern: MovementPattern.GAIT,
    primaryMuscles: ["cardiorespiratory"],
    secondaryMuscles: ["legs"],
    equipmentTypes: ["bodyweight"],
    contraindicationTags: [],
    substitutionTags: ["low-intensity-cardio", "gait"],
    instructions: "Low-intensity steady-state walking."
  }),
  exercise({
    name: "Stationary Bike",
    modality: ExerciseModality.CARDIO,
    movementPattern: MovementPattern.CARDIO,
    primaryMuscles: ["cardiorespiratory", "quadriceps"],
    secondaryMuscles: ["glutes"],
    equipmentTypes: ["cardio_machine"],
    contraindicationTags: ["knee-pain"],
    substitutionTags: ["low-impact-cardio", "bike"],
    instructions: "Low-impact cycling using a stationary bike."
  })
];
