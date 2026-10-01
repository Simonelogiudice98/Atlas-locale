export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string) { super(message); }
}
export function publicError(error: unknown) {
  if (error instanceof ApiError) return error;
  console.error(error);
  return new ApiError(500, 'INTERNAL_ERROR', 'Errore interno del backend');
}
