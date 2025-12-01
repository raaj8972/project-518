import { Helmet } from 'react-helmet-async';

interface SEOProps {
  title?: string;
  description?: string;
  canonical?: string;
  image?: string;
  type?: string;
}

export const SEO = ({
  title = 'RICORRENZA — IQ City Medical College Cultural Festival',
  description = 'Experience the future at RICORRENZA - The official cultural festival of IQ City Medical College, Durgapur. Events, competitions and celebrations.',
  canonical = 'https://ricorrenza.fun/',
  image = 'https://ricorrenza.fun/favicon-96x96.png',
  type = 'website'
}: SEOProps) => {
  const siteTitle = title === 'RICORRENZA — IQ City Medical College Cultural Festival' 
    ? title 
    : `${title} | RICORRENZA`;

  return (
    <Helmet>
      {/* Standard metadata */}
      <title>{siteTitle}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={canonical} />

      {/* Open Graph / Facebook */}
      <meta property="og:type" content={type} />
      <meta property="og:title" content={siteTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={canonical} />
      <meta property="og:image" content={image} />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={siteTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />
    </Helmet>
  );
};
