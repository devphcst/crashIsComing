import { timingSafeEqual } from "node:crypto";

export { ADMIN_COOKIE } from "./admin-cookie";

export const isTokenValid = (provided: string | undefined | null): boolean => {
  const expected = process.env.ADMIN_TOKEN;
  if (!expected || !provided) return false;
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(provided, "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
};
