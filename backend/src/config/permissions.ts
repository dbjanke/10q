export const PERMISSIONS = ['regenerate_summary_question'] as const;

export type Permission = (typeof PERMISSIONS)[number];

export function isValidPermission(value: string): value is Permission {
    return (PERMISSIONS as readonly string[]).includes(value);
}
