import { Helmet } from 'react-helmet-async';
import { BRAND_NAME, DEFAULT_SEO_TITLE, DEFAULT_SEO_DESCRIPTION } from '../constants/brand';

interface SEOProps {
  title?: string;
  description?: string;
  canonical?: string;
  image?: string;
  type?: string;
  noindex?: boolean;
}

export const SEO = ({
  title = DEFAULT_SEO_TITLE,
  description = DEFAULT_SEO_DESCRIPTION,
  canonical = 'https://ricorrenza.fun/',
  image = 'https://ricorrenza.fun/favicon-96x96.png',
  type = 'website',
  noindex = false
}: SEOProps) => {
  const siteTitle = title === DEFAULT_SEO_TITLE 
    ? title 
    : `${title} | ${BRAND_NAME}`;

  return (
    <Helmet>
      {/* Standard metadata */}
      <title>{siteTitle}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={canonical} />
      <meta name="robots" content={noindex ? "noindex" : "index, follow"} />

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
