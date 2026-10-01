// Is Direct on sale? Closed until lot J of the espace-direct chantier. While it
// is closed, the bell shows only to accounts that already hold Direct; the
// path to the offer for everybody else exists but stays hidden.
//
// Read as a STATIC property: Next inlines NEXT_PUBLIC_* only when the name is
// written out, a dynamic process.env[name] never reaches the browser.
export const DIRECT_SALE_OPEN = process.env.NEXT_PUBLIC_DIRECT_SALE_OPEN === '1'
