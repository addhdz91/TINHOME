interface SeoProps {
  title: string;
  description?: string;
}

/** React 19 hoists `<title>` and `<meta>` into `<head>`. */
export function Seo({ title, description }: SeoProps) {
  return (
    <>
      <title>{title}</title>
      {description ? <meta name="description" content={description} /> : null}
    </>
  );
}
