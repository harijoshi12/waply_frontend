"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams, useParams } from "next/navigation";
import Image from "next/image";
import { Button } from "@nextui-org/react";
import axios from "axios";
import logo from "../../../public/assets/logo-waply.png";

const PinPage: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = useParams();

  const [pin, setPin] = useState<string[]>(["", "", "", ""]);
  const [urlId, setUrlId] = useState<string | null>(null);
  const [profileName, setProfileName] = useState<string>("User");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);

  useEffect(() => {
    const id = params.urlId as string | null;
    const name = searchParams.get("profileName") as string | null;

    setUrlId(id || null);
    setProfileName(name || "User");
  }, [params, searchParams]);

  const handlePinInput = (value: string | number) => {
    const newPin = [...pin];
    const index = newPin.findIndex((digit) => digit === "");

    if (index !== -1 && value !== "clear") {
      newPin[index] = value.toString();
    } else if (value === "clear") {
      const lastFilledIndex = newPin
        .map((digit, idx) => (digit !== "" ? idx : undefined))
        .filter((idx): idx is number => idx !== undefined)
        .pop();

      if (lastFilledIndex !== undefined) {
        newPin[lastFilledIndex] = "";
      }
    }

    setPin(newPin);
    setErrorMessage(null); // Clear any previous error message

    // Check if the PIN is fully entered
    if (newPin.every((digit) => digit !== "")) {
      setIsVerifying(true); // Start loading animation
      verifyPin(newPin.join(""));
    }
  };

  const verifyPin = async (pinCode: string) => {
    if (!urlId) return;
    try {
      const res = await axios.post("http://dev.waply.co/api/v1/auth/login", { urlId, pin: pinCode });
  
      if (res.status === 200) {
        console.log("Login successful");
        
        // Store the token in local storage (or session storage)
        localStorage.setItem("authToken", res.data.token);
  
        router.push(`/events/${urlId}`);
      } else {
        throw new Error("Incorrect PIN"); // Trigger the catch block for incorrect PIN
      }
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.data?.message === "Incorrect PIN.") {
        setErrorMessage("Incorrect PIN. Please try again.");
      } else {
        console.error("Error verifying PIN:", error);
        setErrorMessage("An error occurred. Please try again.");
      }
      setPin(["", "", "", ""]); // Clear the PIN input if verification fails
    } finally {
      setIsVerifying(false); // Stop loading animation
    }
  };
  

  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <form
        onSubmit={(e) => e.preventDefault()}
        className="flex flex-col items-center justify-center bg-white p-8 rounded-lg shadow-lg text-center max-w-sm w-full h-screen md:h-auto md:w-auto md:max-w-sm"
      >
        <Image
          src={logo}
          alt="Logo"
          width={50}
          height={50}
          className="mx-auto mb-4"
        />

        <h2 className="text-lg font-semibold">Hi, {profileName}</h2>
        <p className="text-orange-500 mt-2 mb-6">Verify 4-digit security PIN</p>

        <div className="flex justify-center mb-4">
          {pin.map((digit, index) => (
            <div
              key={index}
              className="w-10 h-10 mx-1 border border-gray-400 rounded text-lg flex items-center justify-center"
            >
              {isVerifying ? (
                <span className="loading-dot"></span> // Show loading animation
              ) : (
                digit // Show digit if not verifying
              )}
            </div>
          ))}
        </div>

        {errorMessage && (
          <p className="text-red-500 mb-4">{errorMessage}</p>
        )}

        <p className="text-orange-500 mb-8 text-sm">Powered By Waply</p>

        <div className="grid grid-cols-3 gap-4 text-xl">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, ".", 0].map((num) => (
            <Button
              key={num}
              type="button"
              onClick={() => handlePinInput(num)}
              className="w-16 h-16 bg-gray-100 text-black rounded-full flex items-center justify-center text-xl hover:bg-gray-200"
            >
              {num}
            </Button>
          ))}
          <Button
            type="button"
            onClick={() => handlePinInput("clear")}
            className="w-16 h-16 bg-gray-800 text-white rounded-full flex items-center justify-center text-xl hover:bg-gray-900"
          >
            ⌫
          </Button>
        </div>
      </form>
      <style jsx>{`
        .loading-dot {
          display: inline-block;
          width: 8px;
          height: 8px;
          background-color: #ff9800;
          border-radius: 50%;
          animation: loading 0.6s infinite alternate;
        }

        @keyframes loading {
          from {
            transform: scale(1);
          }
          to {
            transform: scale(1.5);
          }
        }
      `}</style>
    </div>
  );
};

export default PinPage;
