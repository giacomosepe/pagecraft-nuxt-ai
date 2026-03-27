-- Migration: add step_type to framework_steps
-- ARKADIA-90

CREATE TYPE "step_type" AS ENUM ('type_a', 'type_b', 'type_c');

ALTER TABLE "framework_steps"
  ADD COLUMN "step_type" "step_type" NOT NULL DEFAULT 'type_c';
