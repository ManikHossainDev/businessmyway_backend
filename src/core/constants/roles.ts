export const ROLES = {
    SUPER_ADMIN: 'superAdmin',
    USER: 'USER',
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

export const ALL_ROLES: Role[] = Object.values(ROLES);

export const ROLE_HIERARCHY: Record<Role, number> = {
    [ROLES.SUPER_ADMIN]: 1,
    [ROLES.USER]: 0,
};
