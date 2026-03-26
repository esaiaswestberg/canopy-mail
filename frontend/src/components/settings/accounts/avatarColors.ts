export const AVATAR_COLORS = [
    '#6b7bff',
    '#4caf8f',
    '#e07b54',
    '#c45eb5',
    '#e0b44a',
    '#5ab4e0',
    '#e05c5c',
    '#7dca6e',
] as const

export type AvatarColor = typeof AVATAR_COLORS[number]
