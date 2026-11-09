/** How the special keys are written on the map and in replacement files. */
export const DEAD_KEY = "*";
export const REPEAT_KEY = "$";
export const MAGIC_KEY = "#";
export const SPACE = " ";

export const specialKeys = [DEAD_KEY, REPEAT_KEY, MAGIC_KEY, SPACE] as const;

export function isSpecialKey(char: string): boolean {
  return (specialKeys as readonly string[]).includes(char);
}
