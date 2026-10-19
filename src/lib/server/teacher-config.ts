// Configured by SvelteKit's private environment at request entry, or by the
// private process environment in controlled CLI/test processes. No literal key.
let entryName: string | undefined;
export function configureTeacherEntry(value: string | undefined) { entryName = value; }
export function teacherEntryName() { return entryName ?? process.env.TEACHER_ENTRY_NAME; }
