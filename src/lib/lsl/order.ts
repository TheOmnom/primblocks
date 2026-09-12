/** C-like operator precedence for LSL. Lower binds tighter. */
export const Order = {
  ATOMIC: 0,
  MEMBER: 1,
  FUNCTION_CALL: 2,
  UNARY: 3,
  MULTIPLICATIVE: 4,
  ADDITIVE: 5,
  SHIFT: 6,
  RELATIONAL: 7,
  EQUALITY: 8,
  BITWISE_AND: 9,
  BITWISE_XOR: 10,
  BITWISE_OR: 11,
  LOGICAL_AND: 12,
  LOGICAL_OR: 13,
  ASSIGNMENT: 14,
  NONE: 99,
} as const;

export type OrderLevel = (typeof Order)[keyof typeof Order];
