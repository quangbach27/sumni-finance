import { isApiError } from '@/lib/clients';

export type FormattedApiError = {
  message: string;
  /** One human-readable line per backend error detail. */
  details: string[];
};

/** Turns any thrown value into a message plus the backend's detail lines. */
export const formatApiError = (
  error: unknown,
  fallback: string,
): FormattedApiError => {
  if (isApiError(error)) {
    if (error.isNetwork) {
      return {
        message: 'Không thể kết nối tới máy chủ. Vui lòng kiểm tra mạng.',
        details: [],
      };
    }
    return {
      message: error.message || fallback,
      details: error.details.map((d) => d.message).filter(Boolean),
    };
  }
  return {
    message: error instanceof Error && error.message ? error.message : fallback,
    details: [],
  };
};
