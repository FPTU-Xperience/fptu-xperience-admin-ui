export function errorMessage(value, fallback = 'Không thể thực hiện yêu cầu.') {
    if (typeof value === 'string') return value.trim() && value !== '[object Object]' ? value : fallback;
    if (!value || typeof value !== 'object') return fallback;
    for (const key of ['message', 'detail', 'error', 'title']) {
        const result = errorMessage(value[key], '');
        if (result) return result;
    }
    return fallback;
}
