/** How the special keys are written on the map and in replacement files. */
export const DEAD_KEY = "*";
export const REPEAT_KEY = "$";
export const MAGIC_KEY = "#";
export const SPACE = " ";

/** The keys that act on the typing, named in the legend under the map and usable in replacement files. */
export const actionKeys = [DEAD_KEY, REPEAT_KEY, MAGIC_KEY] as const;

/** The action keys and space. The engine reads them only in the base zone of a key (`buildKeyMap`). */
export const specialKeys = [...actionKeys, SPACE] as const;

export function isSpecialKey(char: string | undefined): boolean {
  return char !== undefined && (specialKeys as readonly string[]).includes(char);
}
