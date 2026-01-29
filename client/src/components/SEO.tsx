import { Helmet } from "react-helmet-async";

interface SEOProps {
    title?: string;
    description?: string;
    image?: string;
    type?: string;
}

export function SEO({
    title = "Steal the Deal | Premium Deals, Unbeatable Prices",
    description = "Discover curated luxury fashion, accessories, and more at unbeatable prices. Shop the latest trends with Steal the Deal.",
    image = "/og-image.jpg", // We should make sure this exists or use a placeholder
    type = "website"
}: SEOProps) {
    const siteTitle = title.includes("|") ? title : `${title} | Steal the Deal`;

    return (
        <Helmet>
            {/* Standard metadata */}
            <title>{siteTitle}</title>
            <meta name="description" content={description} />

            {/* Open Graph / Facebook */}
            <meta property="og:type" content={type} />
            <meta property="og:title" content={title} />
            <meta property="og:description" content={description} />
            <meta property="og:image" content={image} />

            {/* Twitter */}
            <meta name="twitter:card" content="summary_large_image" />
            <meta name="twitter:title" content={title} />
            <meta name="twitter:description" content={description} />
            <meta name="twitter:image" content={image} />
        </Helmet>
    );
}
