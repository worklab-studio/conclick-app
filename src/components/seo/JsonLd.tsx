// Injects one or more JSON-LD blocks. dangerouslySetInnerHTML is the established
// pattern in this repo (see layout.tsx theme script, legal.tsx). Null entries
// (e.g. an empty FAQ) are filtered out.
export function JsonLd({ data }: { data: unknown | unknown[] }) {
  const items = (Array.isArray(data) ? data : [data]).filter(Boolean);
  return (
    <>
      {items.map((d, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(d) }}
        />
      ))}
    </>
  );
}
