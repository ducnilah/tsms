export const ACTION_BITS = {
	create: 1,
	read: 2,
	update: 4,
	delete: 8,
} as const;

export type PermissionAction = keyof typeof ACTION_BITS;
export type PermissionMap = Record<string, number>;

export function hasPermission(
	permissionMap: PermissionMap | undefined,
	permissionKey: string,
	action: PermissionAction,
) {
	const currentValue = permissionMap?.[permissionKey] ?? 0;
	const requiredValue = ACTION_BITS[action];

	return (currentValue & requiredValue) === requiredValue;
}
