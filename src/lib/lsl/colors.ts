/** Block hues — workspace language, not product chrome. */
export const CAT = {
  event: "#C9A227",
  control: "#D46A2A",
  looks: "#6E62A8",
  motion: "#3D7CC9",
  sound: "#C44B7A",
  sensing: "#2FA36B",
  chat: "#2F8F96",
  world: "#5B7C99",
  operator: "#3D8B6E",
  variable: "#C45C26",
  list: "#A14B4B",
  fn: "#7A5A86",
  constant: "#6B7280",
} as const;

export type CategoryId = keyof typeof CAT;
