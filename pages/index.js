import Head from "next/head";
import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import PaymentModal from "../components/PaymentModal";

const Navbar = ({ categories, onCategoryChange, onSearch }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <nav className="bg-white shadow-md sticky top-0 z-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Deriv Bot Store</h1>
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              <button
                onClick={() => onCategoryChange("all")}
                className="border-b-2 border-green-500 text-gray-900 px-1 pt-1 text-sm font-medium"
              >
                Home
              </button>
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => onCategoryChange(cat)}
                  className="text-gray-500 hover:text-gray-900 px-1 pt-1 text-sm font-medium"
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="hidden sm:block relative">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <input
                type="text"
                placeholder="Search bots by name..."
                onChange={(e) => onSearch(e.target.value)}
                className="pl-10 p-2 rounded-md border focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none"
              />
            </div>
            <Link
              href="https://track.deriv.com/_5b97G5QPtjsKqFKZ7JdnQ2Nd7ZgqdRLk/1/"
              className="bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700 transition-colors"
            >
              Create Account
            </Link>
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="sm:hidden text-gray-500 p-2"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ duration: 0.3 }}
            className="sm:hidden fixed top-0 left-0 h-full w-64 bg-white shadow-lg z-30"
          >
            <div className="flex justify-between items-center p-4 border-b">
              <h2 className="text-lg font-bold text-gray-800">Menu</h2>
              <button onClick={() => setIsMobileMenuOpen(false)} className="text-gray-500">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
            <div className="flex flex-col p-4 space-y-4">
              <button
                onClick={() => {
                  onCategoryChange("all");
                  setIsMobileMenuOpen(false);
                }}
                className="text-gray-900 text-sm font-medium"
              >
                Home
              </button>
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => {
                    onCategoryChange(cat);
                    setIsMobileMenuOpen(false);
                  }}
                  className="text-gray-500 hover:text-gray-900 text-sm font-medium"
                >
                  {cat}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

const ProductCard = ({ product, onBuyNow }) => {
  const excerpt = product.desc.replace(/<[^>]+>/g, '').slice(0, 150) + "...";

  return (
    <motion.div
      className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col h-full"
      whileHover={{ y: -5 }}
    >
      <div className="relative">
        <div className="relative w-full pb-[56.25%]">
          <Image
            src={product.img}
            alt={product.name}
            layout="fill"
            objectFit="cover"
            className="rounded-t-xl hover:scale-105 transition-transform duration-300"
          />
        </div>
        {product.isNew && (
          <span className="absolute top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-green-600 to-green-500 text-white text-xs font-semibold px-3 py-1 rounded-full shadow-md">
            NEW
          </span>
        )}
      </div>
      <div className="p-6 flex-1 flex flex-col justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 line-clamp-2">{product.name}</h3>
          <p className="mt-2 text-gray-600 text-sm line-clamp-3">{excerpt}</p>
          <p className="mt-2 text-green-600 font-bold">{product.price.toFixed(2)} USD</p>
        </div>
        <div className="mt-4 flex space-x-2">
          <Link
            href={`/products/${product.item}`}
            className="flex-1 bg-gray-600 text-white py-2 rounded-md hover:bg-gray-700 text-center"
          >
            View Details
          </Link>
          <button
            onClick={() => onBuyNow(product)}
            className="flex-1 bg-gradient-to-r from-green-600 to-green-500 text-white py-2 rounded-md hover:from-green-700 hover:to-green-600 transition-all"
          >
            Buy Now
          </button>
        </div>
      </div>
    </motion.div>
  );
};

const Footer = ({ settings, staticPages }) => (
  <footer className="bg-white shadow-inner mt-12 py-6">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
      <p className="text-gray-600">{settings.copyrightText}</p>
      <p className="text-gray-500 mt-2">
        Support:{" "}
        <a href={`mailto:${settings.supportEmail}`} className="underline">
          {settings.supportEmail}
        </a>
      </p>
      <div className="mt-4 flex justify-center space-x-4 flex-wrap">
        {settings.socials &&
          Object.entries(settings.socials).map(([platform, url]) =>
            url ? (
              <a key={platform} href={url} className="text-gray-500 hover:text-green-600">
                {platform.charAt(0).toUpperCase() + platform.slice(1)}
              </a>
            ) : null
          )}
      </div>
      <div className="mt-4 flex justify-center space-x-4 flex-wrap">
        {staticPages
          .filter((page) => page.slug !== "/payment-modal" && page.slug !== "/ref-code-modal")
          .map((page) => (
            <Link key={page.slug} href={`/${page.slug}`} className="text-gray-500 hover:text-green-600">
              {page.title}
            </Link>
          ))}
      </div>
    </div>
  </footer>
);

const CookiePopup = ({ onAccept }) => (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <motion.div
      initial={{ y: 20, scale: 0.9 }}
      animate={{ y: 0, scale: 1 }}
      className="bg-white rounded-lg p-6 text-center max-w-md w-[90%]"
    >
      <p className="text-gray-600 mb-4">
        We use cookies to enhance your experience. By continuing, you agree to our{" "}
        <Link href="/cookie-policy" className="underline text-green-600">
          Cookie Policy
        </Link>.
      </p>
      <button
        onClick={onAccept}
        className="bg-gradient-to-r from-green-600 to-green-500 text-white px-6 py-2 rounded-md hover:from-green-700 hover:to-green-600"
      >
        Accept Cookies
      </button>
    </motion.div>
  </div>
);

const UrgentMessage = ({ message, onClose }) => (
  <motion.div
    initial={{ y: "-100%", opacity: 0 }}
    animate={{ y: 0, opacity: 1 }}
    className="fixed top-0 left-0 right-0 bg-gradient-to-r from-yellow-500 to-orange-500 text-white p-4 z-50 rounded-b-2xl shadow-lg"
  >
    <p className="text-center text-lg font-semibold">{message}</p>
    <button
      onClick={onClose}
      className="mt-2 block mx-auto bg-gray-600 text-white px-4 py-1 rounded-full hover:bg-gray-700"
    >
      Okay
    </button>
  </motion.div>
);

export default function Home() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [settings, setSettings] = useState({});
  const [staticPages, setStaticPages] = useState([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [loading, setLoading] = useState(true);
  const [showCookiePopup, setShowCookiePopup] = useState(false);
  const [urgentMessage, setUrgentMessage] = useState(null);
  const [paymentModal, setPaymentModal] = useState(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch("https://bot-delivery-system-qlx4j.ondigitalocean.app/api/data", {
          credentials: "include",
        });
        const data = await response.json();
        setProducts(data.products.filter((p) => !p.isArchived));
        setCategories(data.categories);
        setSettings(data.settings);
        setStaticPages(data.staticPages);
        setLoading(false);
        if (data.settings.urgentMessage?.enabled) {
          setUrgentMessage(data.settings.urgentMessage.text);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        setLoading(false);
      }
    }
    fetchData();

    const cookiesAccepted = localStorage.getItem("cookiesAccepted") === "true";
    const lastShown = parseInt(localStorage.getItem("cookiePopupLastShown"), 10);
    const threeDays = 3 * 24 * 60 * 60 * 1000;
    if (!cookiesAccepted || !lastShown || Date.now() - lastShown > threeDays) {
      setShowCookiePopup(true);
    }
  }, []);

  const handleCookieAccept = () => {
    localStorage.setItem("cookiesAccepted", "true");
    localStorage.setItem("cookiePopupLastShown", Date.now().toString());
    setShowCookiePopup(false);
  };

  const filteredProducts = products
    .filter((p) => (category === "all" ? true : p.category === category))
    .filter(
      (p) =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.desc.toLowerCase().includes(search.toLowerCase())
    );

  return (
    <div className="bg-gray-100 min-h-screen font-inter">
      <Head>
        <title>Deriv Bot Store</title>
        <meta
          name="description"
          content="Explore trading bots at Deriv Bot Store. Find automated solutions for your trading needs."
        />
        <meta
          name="keywords"
          content="trading bots, Deriv, automation, Binary trading, Deriv Bots, Deriv strategies for beginners"
        />
        <meta name="theme-color" content="#16a34a" />
        <meta property="og:title" content="Deriv Bot Store" />
        <meta
          property="og:description"
          content="Explore trading bots at Deriv Bot Store. Find automated solutions for your trading needs."
        />
        <meta property="og:image" content="/favicon.png" />
        <meta property="og:type" content="website" />
        <link rel="icon" type="image/png" href="/favicon.png" />
      </Head>

      {urgentMessage && <UrgentMessage message={urgentMessage} onClose={() => setUrgentMessage(null)} />}
      {showCookiePopup && <CookiePopup onAccept={handleCookieAccept} />}

      <Navbar
        categories={categories}
        onCategoryChange={setCategory}
        onSearch={setSearch}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">
          Explore Our Bots
        </h2>
        {loading ? (
          <p className="text-center text-gray-600">
            Loading bots... If this takes too long, please refresh the page or
            contact support at{" "}
            <a href={`mailto:${settings.supportEmail}`} className="underline text-green-600">
              {settings.supportEmail}
            </a>.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProducts.length ? (
              filteredProducts.map((product) => (
                <ProductCard
                  key={product.item}
                  product={product}
                  onBuyNow={() => setPaymentModal(product)}
                />
              ))
            ) : (
              <p className="text-center col-span-full text-gray-600">No products found.</p>
            )}
          </div>
        )}
      </main>

      <Footer settings={settings} staticPages={staticPages} />

      {paymentModal && (
        <PaymentModal
          product={paymentModal}
          onClose={() => setPaymentModal(null)}
          mpesaTill={settings.mpesaTill || "4933614"}
        />
      )}
    </div>
  );
}
