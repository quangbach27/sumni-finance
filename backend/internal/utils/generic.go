package utils

func Ptr[T any](val T) *T {
	return &val
}

func SafeDeref[T any](ptr *T, fallback T) T {
	if ptr == nil {
		return fallback
	}

	return *ptr
}
