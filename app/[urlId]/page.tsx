"use client";
import { useEffect } from "react";
import { useRouter, useParams } from "next/navigation";

interface PinStatusResponse {
  isPinSet: boolean;
  user: {
    profileName?: string;
    phoneNumber?: string;
    role?: string;
    timezone?: string;
  };
}

export default function UserPage() {
  const router = useRouter();
  const params = useParams<{ urlId: string }>();
  const urlId = params.urlId;

  useEffect(() => {
    if (!urlId) {
      console.error("urlId is undefined. Redirecting to error page.");
      router.push("/error");
      return;
    }

    const fetchPinStatus = async () => {
      try {
        const response = await fetch(
          `http://dev.waply.co/api/v1/auth/check-pin-status/${urlId}`,
          {
            cache: "no-store",
          }
        );

        if (!response.ok) {
          router.push("/error");
          return;
        }

        const data: PinStatusResponse = await response.json();
        const { isPinSet, user } = data;

        // Construct query parameters with user data
        const queryParams = new URLSearchParams({
          profileName: user.profileName || "",
          phoneNumber: user.phoneNumber || "",
          role: user.role || "",
          timezone: user.timezone || "",
        }).toString();

        if (isPinSet) {
          // Redirect to the PIN entry page with user data as query parameters
          router.push(`/enter-pin/${urlId}?${queryParams}`);
        } else {
          // Redirect to the PIN setup page with user data as query parameters
          router.push(`/set-pin/${urlId}?${queryParams}`);
        }
      } catch (error) {
        console.error("Error fetching PIN status:", error);
        router.push("/error");
      }
    };

    fetchPinStatus();
  }, [urlId, router]);

  return null; // Render nothing, as this component only redirects
}
