// The auth cookie's name is set explicitly, and this is not decoration.
// @supabase/ssr derives its default cookie name from the Supabase project ref,
// and lab.algoproof.fr authenticates against the SAME project as this site. Two
// same-named cookies would reach the lab in undefined order and break a live
// paying product. This module has no imports so it is safe in the edge runtime,
// where the middleware will also import it.
export const AUTH_COOKIE_NAME = 'sb-algoproof-auth'
