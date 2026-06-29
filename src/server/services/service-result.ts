export type ServiceErrorCode =
  | "BAD_REQUEST"
  | "CONFLICT"
  | "INTERNAL"
  | "NOT_FOUND"
  | "NOT_IMPLEMENTED"
  | "UNAUTHORIZED"
  | "VALIDATION";

export interface ServiceError {
  code: ServiceErrorCode;
  message: string;
  details?: unknown;
}

export type ServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: ServiceError };

export function success<T>(data: T): ServiceResult<T> {
  return { ok: true, data };
}

export function failure(
  code: ServiceErrorCode,
  message: string,
  details?: unknown
): ServiceResult<never> {
  return { ok: false, error: { code, message, details } };
}

export function validationFailure(details: unknown): ServiceResult<never> {
  return failure("VALIDATION", "Invalid input.", details);
}
