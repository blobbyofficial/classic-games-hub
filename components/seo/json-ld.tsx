/**
 * Renders a JSON-LD block.
 *
 * This is the one place in the codebase that uses `dangerouslySetInnerHTML`,
 * because a `<script type="application/ld+json">` body must be raw text - React
 * would otherwise HTML-escape the quotes and produce markup no parser accepts.
 *
 * The `<` replacement is the reason this is a component rather than a one-liner
 * repeated per page. Some of what goes in here is player-supplied by way of the
 * database (game titles and descriptions are editable from the admin dashboard),
 * and a value containing `</script>` would otherwise close the tag early and
 * turn the rest of the payload into live markup. Escaping `<` to its unicode
 * form is valid JSON, invisible to consumers, and makes that impossible.
 */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}
