export const PERMISSIONS = ['regenerate_summary_question', 'regenerate_highlights'] as const;

export type Permission = (typeof PERMISSIONS)[number];

export const REGENERATE_PERMISSION: Permission = 'regenerate_summary_question';
export const REGENERATE_HIGHLIGHTS_PERMISSION: Permission = 'regenerate_highlights';

export function isValidPermission(value: string): value is Permission {
    return (PERMISSIONS as readonly string[]).includes(value);
}
