import { useState, useEffect } from "react";
import { motion } from "framer-motion";

export default function PaymentModal({ product, onClose, mpesaTill }) {
  const [timeLeft, setTimeLeft] = useState(10 * 60);
  const [kesPrice, setKesPrice] = useState(null);
  const [refCode, setRefCode] = useState("");
  const [step, setStep] = useState("payment"); // payment, ref-code, status
  const [statusMessage, setStatusMessage] = useState("Confirming...");
  const [showRetry, setShowRetry] = useState(false);
  const [copyStatus, setCopyStatus] = useState("Copy Till");

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

    const countdown = setInterval(() => {
      setTimeLeft((prevTimeLeft) => {
        if (prevTimeLeft <= 0) {
          clearInterval(countdown);
          window.location.href = "https://wa.link/j8hx47";
          return 0;
        }
        return prevTimeLeft - 1;
      });
    }, 1000);

    return () => clearInterval(countdown);

    const storedRefCode = localStorage.getItem(`payment_${product.item}_refCode`);
    if (storedRefCode) {
      setRefCode(storedRefCode);
      setStep("ref-code");
    }
  }, [product]);

  const handleCopyTill = () => {
    navigator.clipboard
      .writeText(mpesaTill)
      .then(() => {
        setCopyStatus("Copied");
        setTimeout(() => setCopyStatus("Copy Till"), 2000);
      })
      .catch(() => {
        const textarea = document.createElement("textarea");
        textarea.value = mpesaTill;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
        setCopyStatus("Copied");
        setTimeout(() => setCopyStatus("Copy Till"), 2000);
      }));
  };

  const handleConfirmPayment = () => {
    const expiry = new Date(Date.now() + 5 * 60 * 1000).toUTCString();
    document.cookie = `payment_${product.item}=initiated; expires=${expiry}; path=/`;
    localStorage.setItem(`payment_${product.item}_kesPrice`, kesPrice);
    setStep("ref-code");
  };

  const handleSubmitRefCode = async () => {
    if (!refCode.match(/^[A-Z0-9]{8,12}$/)) {
      alert("Please enter a valid MPESA ref code (8-12 alphanumeric characters).");
      return;
    }

    try {
      const response = await fetch("https://bot-delivery-system-qlx4j.ondigitalocean.app/api/submit-ref", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          item: product.item,
          refCode,
          amount: kesPrice,
          timestamp: new Date().toISOString(),
        }),
        credentials: "include",
      });

      const data = await response.json();
      if (data.success) {
        localStorage.setItem(`payment_${product.item}_refCode`, refCode);
        setStep("status");
        checkPaymentStatus();
      } else {
        throw new Error(data.error || "Failed to submit ref code");
      }
    } catch (error) {
      alert(`Error: ${error.message}`);
    }
  };

  const checkPaymentStatus = async () => {
    let timeLeft = 300;
    let retryCount = 0;
    const maxRetries = 3;

    const interval = setInterval(async () => {
      setTimeLeft((prev) => prev - 1);
      if (timeLeft <= 0) {
        clearInterval(interval);
        setStatusMessage(
          `Confirmation timed out. <a href="https://wa.link/j8hx47" class="underline text-green-600">Contact support.</a>`
        );
        setShowRetry(true);
        return;
      }

      try {
        const response = await fetch(
          `https://bot-delivery-system-qlx4j.ondigitalocean.app/api/order-status/${product.item}/${refCode}`,
          { credentials: "include" }
        );
        const data = await response.json());

        if (data.success && data.status !== "pending") {
          clearInterval(interval);
          if (data.status === "confirmed") {
            setStatusMessage("Payment successful! Downloading...");
            const success = await downloadFile(data.downloadLink, product.name);
            if (success) {
              setTimeout(() => onClose(), 1000);
            } else {
              setStatusMessage(
                `Download failed. <a href="https://wa.link/j8hx47" class="underline text-green-600">Contact support.</a>`
              );
              setShowRetry(true);
            }
          } else {
            setStatusMessage(
              `Payment issue: ${data.status}. <a href="https://wa.link/j8hx47" class="underline text-green-600">Contact support.</a>`
            );
            setTimeout(() => onClose(), 3000);
          }
        }
      } catch (error) {
        setStatusMessage(`Error: ${error.message}`);
        setShowRetry(true);
      }
    }, 15000);
  };

  const downloadFile = async (downloadLink, fileName) => {
    try {
      const response = await fetch(downloadLink, { credentials: "include" });
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      return true;
    } catch (error) {
      console.error("Download failed:", error);
      return false;
    }
  };

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <motion.div
        initial={{ y: 20, scale: 0.9 }}
        animate={{ y: 0, scale: 1 }}
        className="bg-white rounded-xl p-6 w-full max-w-md"
      >
        {step === "payment" && (
          <>
            <h3 className="text-xl font-bold text-gray-800 mb-4">
              Pay for {product.name}
            </h3>
            <div className="mb-4">
              <p className="text-gray-600">
                Time remaining: {minutes}:{seconds < 10 ? "0" : ""}${seconds}
              </p>
              <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-green-600 to-green-500"
                  style={{ width: `${(timeLeft / (10 * 60)) * 100}%` }}
                />
              </div>
            </div>
            <p className="text-gray-600 mb-3">
              Please send payment via MPESA to:
            </p>
            <div className="flex items-center space-x-2">
              <p className="font-semibold text-gray-900">
                Till Number: {mpesaTill}
              </p>
              <button
                onClick={handleCopyTill}
                className="text-sm text-green-600 hover:underline"
              >
                {copyStatus}
              </button>
            </div>
            <p className="text-green-600 font-bold mt-2">
              Amount: {kesPrice || "Loading"} KES
            </p>
            <button
              onClick={handleConfirmPayment}
              className="mt-6 w-full bg-gradient-to-r from-green-600 to-green-500 text-white py-2 rounded-md hover:from-green-700 hover:to-green-600"
            >
              I Have Paid
            </button>
            <button
              onClick={onClose}
              className="mt-2 w-full bg-gray-600 text-white py-2 rounded-md hover:bg-gray-700"
            >
              Cancel
            </button>
          </>
        )}
        {step === "ref-code" && (
          <>
            <h3 className="text-lg font-bold text-gray-800 mb-4">
              Enter MPESA Ref Code
            </h3>
            <input
              type="text"
              placeholder="e.g., QK12345678"
              value={refCode}
              onChange={(e) => setRefCode(e.target.value)}
              className="w-full p-2 border rounded-md mb-4"
            />
            <button
              onClick={handleSubmitRefCode}
              className="mt-4 w-full bg-gradient-to-r from-green-600 to-green-500 text-white py-2 rounded-md hover:from-green-700 hover:to-green-600"
            >
              Submit
            </button>
            <button
              onClick={onClose}
              className="mt-2 w-full bg-gray-600 text-white py-2 rounded-md hover:bg-gray-700"
            >
              Cancel
            </button>
          </>
        )}
        {step === "status" && (
          <>
            <h3 className="text-lg font-bold text-gray-800 mb-3">
              Payment Status
            </h3>
            <div className="mb-3">
              <p className="text-gray-600">
                Time left: {Math.floor(timeLeft / 60)}:{timeLeft % 60 < 10 ? "0" : ""}${timeLeft % 60}
              </p>
              <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-600"
                  style={{ width: `${(timeLeft / 300) * 100}%` }}
                />
              </div>
            </div>
            <p className="text-gray-600 mb-3" dangerouslySetInnerHTML={{ __html: statusMessage }} />
            {showRetry && (
              <button
                onClick={() => checkPaymentStatus()}
                className="mt-4 w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700"
              >
                Retry
              </button>
            )}
          </>
        )}
      </motion.div>
    </div>
  );
}
