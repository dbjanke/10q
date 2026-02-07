export function parseIdParam(rawId: string | string[] | undefined): number {
    if (Array.isArray(rawId)) {
        return Number.parseInt(rawId[0] ?? '', 10);
    }
    return Number.parseInt(rawId ?? '', 10);
}
