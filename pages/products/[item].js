import Head from "next/head";
import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import PaymentModal from "../../components/PaymentModal";

export async function getStaticPaths() {
  const response = await fetch("https://bot-delivery-system-qlx4j.ondigitalocean.app/api/data");
  const data = await response.json();
  const paths = data.products
    .filter((p) => !p.isArchived)
    .map((product) => ({
      params: { item: product.item },
    }));
  return { paths, fallback: "blocking" };
}

export async function getStaticProps({ params }) {
  const response = await fetch("https://bot-delivery-system-qlx4j.ondigitalocean.app/api/data");
  const data = await response.json();
  const product = data.products.find((p) => p.item === params.item);
  const settings = data.settings;
  if (!product) {
    return { notFound: true };
  }
  return { props: { product, settings }, revalidate: 60 };
}

export default function ProductPage({ product, settings }) {
  const [kesPrice, setKesPrice] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  useEffect(() => {
    async function getExchangeRate() {
      try {
        const response = await fetch("https://api.exchangerate-api.com/v4/latest/USD");
        const data = await response.json();
        const rate = data.rates.KES || 120;
        setKesPrice((product.price * rate).toFixed(2));
      } catch (error) {
        setKesPrice((product.price * 120).toFixed(2));
      }
    }
    getExchangeRate();
  }, [product.price]);

  return (
    <div className="bg-gray-100 min-h-screen font-inter">
      <Head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>{product.name} - Deriv Bot Store</title>
        <meta name="description" content={`${product.description}`} />
        <meta name="keywords" content={`trading bot, Deriv, ${product.name}, automation`} />
        <meta property="og:title" content="${product.name} - Deriv Bot Store" />
        <meta property="og:description" content="${product.description}" />
        <meta property="og:image" content="${product.img}" />
        <meta property="og:type" content="product" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Link href="/" className="text-green-600 hover:underline mb-6 inline-block">
          ← Back to Home
        </Link>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-white rounded-xl shadow-lg p-6 md:flex md:space-x-6"
        >
          <div className="md:w-2/3">
            <Image
              src={product.img}
              alt={product.name}
              width={640}
              height={360}
              className="rounded-lg mb-6"
            />
            <h1 className="text-2xl font-bold text-gray-800 mb-2">{product.name}</h1>
            <p className="text-sm text-gray-500 mb-3">File: {product.item}</p>
            <div
              className="prose text-gray-600"
              dangerouslySetInnerHTML={{ __html: product.desc }}
            />
            {product.embed && (
              <div className="relative pb-[56.25%] mt-4">
                <iframe
                  src={product.embed}
                  className="absolute top-0 left-0 w-full h-full rounded-lg"
                  title="Product demo"
                  frameBorder="0"
                  allowFullScreen
                />
              </div>
            )}
          </div>
          <div className="md:w-1/3 mt-6 md:mt-0">
            <div className="bg-gray-50 p-4 rounded-lg sticky top-20">
              <p className="text-green-600 font-bold mb-4">
                {kesPrice ? `${kesPrice} KES` : "Loading..."}
              </p>
              <button
                onClick={() => setShowPaymentModal(true)}
                className="w-full bg-gradient-to-r from-green-600 to-green-500 text-white py-2 rounded-md hover:from-green-700 hover:to-green-600"
              >
                Buy Now
              </button>
            </div>
          </div>
        </motion.div>
      </main>

      {showPaymentModal && (
        <PaymentModal
          product={product}
          onClose={() => setShowPaymentModal(false)}
          mpesaTill={settings.mpesaTill || "4933614"}
        />
      )}
    </div>
  );
}
