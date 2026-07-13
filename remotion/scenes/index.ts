import type { ComponentType } from "react";
import { LabBench } from "./LabBench";
import { OperatingRoom } from "./OperatingRoom";
import { OfficeCoding } from "./OfficeCoding";
import { LectureHall } from "./LectureHall";
import { ServerRoom } from "./ServerRoom";
import { FieldResearch } from "./FieldResearch";

/**
 * Maps the fixed setting vocabulary (must match SETTING_KEYS in lib/script.ts)
 * to illustrated, animated scene components.
 */
export const SETTINGS: Record<string, ComponentType> = {
  "lab-bench": LabBench,
  "operating-room": OperatingRoom,
  "office-coding": OfficeCoding,
  "lecture-hall": LectureHall,
  "server-room": ServerRoom,
  "field-research": FieldResearch,
};
