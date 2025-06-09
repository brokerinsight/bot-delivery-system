import { useEffect } from "react";

export default function App({ Component, pageProps }) {
  useEffect(() => {
    const script = document.createElement("script");
    script.async = true;
    script.src = "https://www.googletagmanager.com/gtag/js?id=YOUR_GTAG_ID";
    document.head.appendChild(script);

    window.dataLayer = window.dataLayer || [];
    function gtag() {
      dataLayer.push(arguments);
    }
    gtag("js", new Date());
    gtag("config", "YOUR_GTAG_ID");
  }, []);

  return <Component {...pageProps} />;
}
