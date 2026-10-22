/** Room-owned configuration. Wire values must be these numeric literals. */
export const SHUTTLE_SPEEDS = [1, 1.25, 1.5, 2] as const;
export type ShuttleSpeed = (typeof SHUTTLE_SPEEDS)[number];
export const isShuttleSpeed = (value: unknown): value is ShuttleSpeed =>
  typeof value === "number" &&
  (SHUTTLE_SPEEDS as readonly number[]).includes(value);
