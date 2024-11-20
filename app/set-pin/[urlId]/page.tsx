'use client';

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import axios from "axios";
import Image from "next/image";
import logo from "../../../public/assets/logo-waply.png"; // Replace with your logo path

const SetPinPage: React.FC = () => {
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const router = useRouter();
  const params = useParams<{ urlId: string }>();
  const urlId = params.urlId;

  useEffect(() => {
    // Detect keyboard visibility based on viewport height change
    const handleResize = () => {
      const viewportHeight = window.visualViewport?.height;
      const windowHeight = window.innerHeight;

      if (viewportHeight && windowHeight && viewportHeight < windowHeight) {
        setIsKeyboardVisible(true); // Keyboard likely opened
      } else {
        setIsKeyboardVisible(false); // Keyboard likely closed
      }
    };

    window.visualViewport?.addEventListener("resize", handleResize);
    return () => {
      window.visualViewport?.removeEventListener("resize", handleResize);
    };
  }, []);

  const handlePinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target;
    if (/^\d{0,4}$/.test(value)) {
      setPin(value);
      setErrorMessage("");
    } else {
      setErrorMessage("Only numbers are allowed");
    }
  };

  const handleConfirmPinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target;
    if (/^\d{0,4}$/.test(value)) {
      setConfirmPin(value);
      setErrorMessage("");
    } else {
      setErrorMessage("Only numbers are allowed");
    }
  };

  const handleSubmit = async () => {
    if (pin.length < 4 || confirmPin.length < 4) {
      setErrorMessage("Please enter a 4-digit PIN");
    } else if (pin !== confirmPin) {
      setErrorMessage("PINs do not match");
    } else {
      setErrorMessage("");

      if (urlId) {
        try {
          const res = await axios.post(
            `http://dev.waply.co/api/v1/auth/set-pin/${urlId}`,
            { pin },
            {
              headers: {
                "Content-Type": "application/json",
              },
            }
          );

          if (res.status === 200) {
            // Handle successful PIN setup, e.g., redirect to login or dashboard
            router.push(`/${urlId}`);
          } else {
            setErrorMessage("Failed to set PIN. Please try again.");
          }
        } catch (error) {
          setErrorMessage("An error occurred while setting your PIN.");
          console.error(error);
        }
      } else {
        setErrorMessage("URL ID is missing.");
      }
    }
  };

  return (
    <div
      className={`min-h-screen flex items-center justify-center bg-gray-100 px-4 ${
        isKeyboardVisible ? "translate-y-[-20%]" : ""
      }`}
    >
      <div className="bg-white p-6 sm:p-10 rounded-lg shadow-lg text-center w-full max-w-sm">
        {/* Logo */}
        <Image src={logo} alt="Logo" width={50} height={50} className="mx-auto mb-6" />

        {/* Greeting */}
        <h2 className="text-lg font-semibold">Set Your 4-Digit PIN</h2>
        <p className="text-gray-500 mt-2 mb-6">Enter and re-enter your PIN below</p>

        {/* PIN Input Fields */}
        <div className="space-y-4">
          <input
            type="password"
            maxLength={4}
            value={pin}
            onChange={handlePinChange}
            className="w-full px-4 py-2 border border-gray-400 rounded text-center text-lg tracking-widest"
            placeholder="Enter PIN"
            inputMode="numeric"
          />
          <input
            type="password"
            maxLength={4}
            value={confirmPin}
            onChange={handleConfirmPinChange}
            className="w-full px-4 py-2 border border-gray-400 rounded text-center text-lg tracking-widest"
            placeholder="Re-enter PIN"
            inputMode="numeric"
          />
        </div>

        {/* Error Message */}
        {errorMessage && <p className="text-red-500 mt-4 text-sm">{errorMessage}</p>}

        {/* Submit Button */}
        <button
          onClick={handleSubmit}
          className="mt-6 w-full bg-orange-500 text-white py-2 rounded font-semibold text-lg transition-colors duration-200 hover:bg-orange-600"
        >
          Set PIN
        </button>
      </div>
    </div>
  );
};

export default SetPinPage;
