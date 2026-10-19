import type { LayoutServerLoad } from './$types';

// Reuse the identity restored by hooks; the visual shell adds no database read.
export const load: LayoutServerLoad = ({ locals }) => ({
  viewer: locals.student ? { displayName: locals.student.displayName } : null
});
