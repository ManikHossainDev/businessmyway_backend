export const LOCKED_CATEGORY_NAMES = [
    'Cigarettes',
    'Cigars',
    'Tobacco',
    'Accessories',
] as const;

const normalize = (value: string) => value.trim().toLowerCase();

export const isLockedCategoryName = (name?: string | null) => {
    if (!name) return false;
    const target = normalize(name);
    return LOCKED_CATEGORY_NAMES.some((item) => normalize(item) === target);
};
