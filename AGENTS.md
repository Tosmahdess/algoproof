<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Copy in JSX: spaces around an interpolation must be explicit

Write `{expr}{' '}word`, never `{expr} word`. The server renderer drops the leading space of a text
node that follows an expression, so `Je fais tourner {n} bots` shipped as « 2bots » for five weeks
on the home hero. Five such seams were live at once (2026-08-22). The same applies to a JSX comment
placed *between* two lines of prose inside one paragraph — the adjacent text nodes lose their join,
so comment above the element, never inside the flow.

Tests cannot catch this: jsdom keeps the space the production renderer swallows. Verify on the
served HTML, searching for the seam `text<!-- -->text`.
