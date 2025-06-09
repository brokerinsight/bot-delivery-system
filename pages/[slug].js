import Head from "next/head";
import { motion } from "framer-motion";
import Link from "next/link";

export async function getStaticPaths() {
  const response = await fetch("https://bot-delivery-system-qlx4j.ondigitalocean.app/api/data");
  const data = await response.json();
  const paths = data.staticPages
    .filter((page) => page.slug !== "/payment-modal" && page.slug !== "/ref-code-modal")
    .map((page) => ({
      params: { slug: page.slug.replace(/^\/+/, "") },
    }));
  return { paths, fallback: "blocking" };
}

export async function getStaticProps({ params }) {
  const response = await fetch("https://bot-delivery-system-qlx4j.ondigitalocean.app/api/data");
  const data = await response.json();
  const page = data.staticPages.find((p) => p.slug === "/" + params.slug);
  if (!page) {
    return { notFound: true };
  }
  return { props: { page }, revalidate: 600 };
}

export default function StaticPage({ page }) {
  return (
    <div className="bg-gray-100 min-h-screen font-inter">
      <Head>
        <title>{page.title} - Deriv Bot Store</title>
        <meta name="description" content={`Information about ${page.title} at Deriv Bot Store.`} />
        <meta property="og:title" content={`${page.title} - Deriv Bot Store`} />
        <meta property="og:description" content={`Information about ${page.title} at Deriv Bot Store.`} />
        <meta property="og:image" content="/favicon.png" />
        <meta property="og:type" content="meta" />
      </Head>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Link href="/" className="text-green-600 hover:underline mb-6 inline-block">
          ← Back to Home
        </Link>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-white rounded-lg p-6 shadow-lg"
        >
          <h1 className="text-2xl font-bold text-gray-800 mb-4">{page.title}</h2>
          <div
            className="prose text-gray-600"
            dangerouslySetInnerHTML={{ __html: page.content }}
          />
        </motion.div>
      </main>
    </div>
  );
}
