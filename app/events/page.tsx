"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import logo from "../../public/assets/logo-waply.png";
import { FaAngleDown } from "react-icons/fa";
import axios from "axios";
import { Button } from "@nextui-org/react";

// Define the Reminder type (adjust fields as needed based on your data structure)
interface Reminder {
  _id: string;
  taskDescription: string;
  date: string;
  time: string;
  recurrence: string;
  customRecurrence?: string;
  invitees?: string;
  nextOccurrence?: string;
  relatedMeetingId?: {
    attendees: { email: string }[];
  };
}

// Define the form data type
interface FormData {
  taskDescription: string;
  date: string;
  time: string;
  recurrence: string;
  customRecurrence: string;
  invitees: string;
  isMeeting: boolean;
}

// Define the grouped reminders type
type GroupedReminders = Record<string, Reminder[]>;

const Page = () => {
  // Initialize reminders state with Reminder[] type
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({
    start: "",
    end: "",
  });
  const [selectedValue, setSelectedValue] = useState<string>("today");
  const [showDropdown, setShowDropdown] = useState<boolean>(false);
  const [formData, setFormData] = useState<FormData>({
    taskDescription: "",
    date: "",
    time: "",
    recurrence: "",
    customRecurrence: "",
    invitees: "",
    isMeeting: false,
  });
  const [originalData, setOriginalData] = useState<FormData | null>(null);
  const [isEdited, setIsEdited] = useState<boolean>(false);
  const [selectedReminderId, setSelectedReminderId] = useState<string | null>(
    null
  );
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [isUpdateDone, setIsUpdateDone] = useState<boolean>(false);
  const [isDeleteDone, setIsDeleteDone] = useState<boolean>(false);
  // Format date with suffix (e.g., "19th Nov, 2024")
  const formatDate = (date: Date, includeYear = true): string => {
    const day = date.getDate();
    const month = date.toLocaleString("default", { month: "short" });
    const year = date.getFullYear();

    const suffix =
      day === 1 || day === 21 || day === 31
        ? "st"
        : day === 2 || day === 22
        ? "nd"
        : day === 3 || day === 23
        ? "rd"
        : "th";

    return `${day}${suffix} ${month}${includeYear ? `, ${year}` : ""}`;
  };

  // Format time range (e.g., "10:00 AM - 10:30 AM")
  const formatTimeRange = (startTime: Date, endTime: Date): string => {
    const formatTime = (date: Date): string =>
      date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    return `${formatTime(startTime)} - ${formatTime(endTime)}`;
  };

  // Update date range based on selected filter (today, this week, this month)
  const updateDateRange = useCallback((filter: string): void => {
    const today = new Date();
    if (filter === "today") {
      setDateRange({ start: formatDate(today), end: "" });
    } else if (filter === "this week") {
      const endOfWeek = new Date(today);
      endOfWeek.setDate(today.getDate() + 6);
      setDateRange({
        start: formatDate(today, false),
        end: formatDate(endOfWeek),
      });
    } else if (filter === "this month") {
      const endOfMonth = new Date(today);
      endOfMonth.setDate(today.getDate() + 30);
      setDateRange({
        start: formatDate(today, false),
        end: formatDate(endOfMonth),
      });
    }
  }, []);

  // Fetch reminders from backend API
  const fetchReminders = useCallback(async (): Promise<void> => {
    const token = localStorage.getItem("authToken");
    setIsLoading(true);

    let backendFilter = selectedValue;
    const splitValue = selectedValue.split(" ");
    if (splitValue.length > 1) backendFilter = splitValue[1];

    try {
      const response = await axios.get("http://dev.waply.co/api/v1/reminders", {
        params: { page: 1, filter: backendFilter },
        headers: { Authorization: `Bearer ${token}` },
      });
      const { reminders }: { reminders: Reminder[] } = response.data;
      setReminders(reminders);
    } catch (error) {
      console.error("Failed to fetch reminders:", error);
    } finally {
      setIsLoading(false);
    }
  }, [selectedValue]);

  // Fetch reminders and update date range when selected value changes
  useEffect(() => {
    updateDateRange(selectedValue);
    fetchReminders();
  }, [selectedValue, fetchReminders, updateDateRange]);

  // Handle date range selection change
  const handleDateRangeChange = (key: string): void => {
    if (key === "this-week") setSelectedValue("this week");
    else if (key === "this-month") setSelectedValue("this month");
    else setSelectedValue("today");
    setShowDropdown(false);
  };

  // Group reminders by date for "this week" or "this month" view
  const groupRemindersByDate = (reminders: Reminder[]): GroupedReminders => {
    return reminders.reduce((grouped, reminder) => {
      const date = new Date(reminder.nextOccurrence || "").toDateString();
      if (!grouped[date]) grouped[date] = [];
      grouped[date].push(reminder);
      return grouped;
    }, {} as GroupedReminders);
  };

  // Open edit modal with selected reminder details
  const openEditModal = (reminder: Reminder): void => {
    const nextOccurrence = new Date(reminder.nextOccurrence || "");
    const initialData: FormData = {
      taskDescription: reminder.taskDescription,
      date: nextOccurrence.toISOString().split("T")[0],
      time: nextOccurrence.toTimeString().split(" ")[0].slice(0, 5),
      recurrence: reminder.recurrence,
      customRecurrence: "",
      invitees: reminder.relatedMeetingId
        ? reminder.relatedMeetingId.attendees
            .map((attendee) => attendee.email)
            .join(", ")
        : "",
      isMeeting: !!reminder.relatedMeetingId,
    };
    setFormData(initialData);
    setOriginalData(initialData);
    setIsEdited(false);
    setSelectedReminderId(reminder._id);
    setIsEditModalOpen(true);
  };

  // Handle input changes and track if form has been edited
  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value } = e.target;

    // Update form data
    setFormData({ ...formData, [name]: value });

    // Compare with original data to set `isEdited`
    setIsEdited(
      JSON.stringify({ ...formData, [name]: value }) !==
        JSON.stringify(originalData)
    );
  };

  // Generate userInput string and update reminder
  const handleSaveChanges = async (): Promise<void> => {
    setIsUpdating(true);
    if (!selectedReminderId) return;

    // Determine if the reminder is associated with a meeting based on invitees
    const isMeeting = Boolean(formData.invitees);

    // Construct the userInput string conditionally including invitees only if it's a meeting
    const userInput = `reminder/meeting task desc: ${
      formData.taskDescription
    }, start date: ${formData.date}, start time: ${
      formData.time
    }, recurrence rule: ${
      formData.recurrence === "custom"
        ? formData.customRecurrence
        : formData.recurrence
    }${isMeeting ? `, invitees: ${formData.invitees}` : ""}`;

    const requestData = { userInput, isMeeting };
    const token = localStorage.getItem("authToken");

    try {
      // Make API call to update reminder
      await axios.put(
        `http://dev.waply.co/api/v1/reminders/${selectedReminderId}`,
        requestData,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Update local state and close the modal
      setReminders((prevReminders) =>
        prevReminders.map((reminder) =>
          reminder._id === selectedReminderId
            ? { ...reminder, ...formData }
            : reminder
        )
      );
      setIsUpdateDone(true);
    } catch (error) {
      console.error("Failed to update reminder:", error);
    } finally {
      setIsUpdating(false);
    }
  };

  // Delete reminder from backend
  const deleteReminder = async (): Promise<void> => {
    setIsDeleting(true);
    if (!selectedReminderId) return;

    const token = localStorage.getItem("authToken");
    try {
      await axios.delete(
        `http://dev.waply.co/api/v1/reminders/${selectedReminderId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
          data: { isMeeting: Boolean(formData.invitees) },
        }
      );
      setReminders((prevReminders) =>
        prevReminders.filter((reminder) => reminder._id !== selectedReminderId)
      );
      setIsEditModalOpen(false);
    } catch (error) {
      console.error("Failed to delete reminder:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  const groupedReminders: GroupedReminders | null =
    selectedValue !== "today" ? groupRemindersByDate(reminders) : null;
  const eventDotAdder = (eventDescription: string) => {
    if (eventDescription.length > 14) {
      return eventDescription.slice(0, 14) + "...";
    }
    return eventDescription;
  };
  return (
    <div className="bg-[rgba(255, 255, 255, 1)] w-screen h-screen">
      <div className="navbar-events w-full flex items-center justify-start p-4 relative">
        <Image src={logo} alt="Waply Logo" className="absolute" />
        <div className="flex items-center w-full justify-center">
          <h2 className="text-[#3A3A3A] font-semibold text-[24px]">
            Scheduled Events
          </h2>
        </div>
      </div>

      <div className="p-4 flex justify-between">
        <div className="flex items-center border-[#FF8800]/50 border-[1px] rounded-md py-1 px-3">
          {selectedValue === "today" ? (
            <p className="text-sm font-medium">{dateRange.start}</p>
          ) : (
            <p className="text-sm font-medium">
              {dateRange.start} - {dateRange.end}
            </p>
          )}
        </div>
        <div className="flex items-center space-x-4 relative">
          <button
            className="border-[#FF8800]/50 border-[1px] rounded-md flex py-1 px-3 text-[15px] relative text-[#000000] font-medium hover:bg-[#FFF7F5] w-34 justify-between items-center text-sm"
            onClick={() => setShowDropdown((prev) => !prev)}>
            {selectedValue.charAt(0).toUpperCase() + selectedValue.slice(1)}
            <FaAngleDown className="ml-2" />
          </button>

          {showDropdown && (
            <div className="absolute top-full mt-1 bg-white border rounded-md shadow-md z-10 w-36 left-[-30px] text-sm">
              <div
                className={`px-4 py-2 cursor-pointer ${
                  selectedValue === "today"
                    ? "bg-[#FFF7F5] text-[#FF8800]"
                    : "hover:bg-gray-100"
                }`}
                onClick={() => handleDateRangeChange("today")}>
                Today
              </div>
              <div
                className={`px-4 py-2 cursor-pointer ${
                  selectedValue === "this week"
                    ? "bg-[#FFF7F5] text-[#FF8800]"
                    : "hover:bg-gray-100"
                }`}
                onClick={() => handleDateRangeChange("this-week")}>
                This Week
              </div>
              <div
                className={`px-4 py-2 cursor-pointer ${
                  selectedValue === "this month"
                    ? "bg-[#FFF7F5] text-[#FF8800]"
                    : "hover:bg-gray-100"
                }`}
                onClick={() => handleDateRangeChange("this-month")}>
                This Month
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="reminders-container p-4">
        {isLoading ? (
          <p>Loading...</p>
        ) : selectedValue === "today" ? (
          reminders.map((reminder, index) => {
            // Safely handle undefined nextOccurrence
            const startTime = reminder.nextOccurrence
              ? new Date(reminder.nextOccurrence)
              : new Date(); // Fallback to current date if undefined
            const endTime = new Date(startTime);
            endTime.setMinutes(
              startTime.getMinutes() + (reminder.relatedMeetingId ? 30 : 10)
            );

            return (
              <div
                key={reminder._id}
                className={`reminder-item mb-4 p-4 rounded flex justify-between items-center ${
                  index % 2 === 0 ? "bg-[#FFFAF8]" : "bg-[#FFffff]"
                }`}
                onClick={() => openEditModal(reminder)}>
                <h3 className="font-medium text-[#272727] text-[16px]">
                  {eventDotAdder(reminder.taskDescription)}
                </h3>
                <span className="bg-[#FFF3E5] border-[#FF8800]/50 border-[1px] text-sm px-3 py-1 rounded-md">
                  {formatTimeRange(startTime, endTime)}
                </span>
              </div>
            );
          })
        ) : (
          Object.keys(groupedReminders || {}).map((date) => (
            <div key={date} className="mb-4">
              <div className="flex items-center justify-center mb-2">
                <div className="border-t border-gray-300 flex-grow mr-2"></div>
                <p className="text-gray-700 font-semibold text-[14px] text-center">
                  {formatDate(new Date(date))}
                </p>
                <div className="border-t border-gray-300 flex-grow ml-2"></div>
              </div>
              {groupedReminders &&
                groupedReminders[date].map((reminder, index) => {
                  // Safely handle undefined nextOccurrence
                  const startTime = reminder.nextOccurrence
                    ? new Date(reminder.nextOccurrence)
                    : new Date(); // Fallback to current date if undefined
                  const endTime = new Date(startTime);
                  endTime.setMinutes(
                    startTime.getMinutes() +
                      (reminder.relatedMeetingId ? 30 : 10)
                  );

                  return (
                    <div
                      key={reminder._id}
                      className={`w-full reminder-item mb-4 p-4 rounded flex justify-between items-center ${
                        index % 2 === 0 ? "bg-[#FFFAF8]" : "bg-[#ffffff]"
                      }`}
                      onClick={() => openEditModal(reminder)}>
                      <h3 className="font-medium text-[#272727] text-[16px]">
                        {eventDotAdder(reminder.taskDescription)}
                      </h3>
                      <span className="bg-[#FFF3E5] border-[#FF8800]/50 border-[1px] text-sm px-3 py-1 rounded-md">
                        {formatTimeRange(startTime, endTime)}
                      </span>
                    </div>
                  );
                })}
            </div>
          ))
        )}
      </div>

      {isEditModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center">
          <div className="bg-white p-6 rounded-lg w-96">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-semibold">Edit Event</h3>
              <button
                disabled={isUpdating || isDeleting}
                onClick={() => {
                  // Reset states
                  setIsUpdateDone(false);
                  setIsUpdating(false);
                  setIsDeleting(false);
                  setIsDeleteDone(false);
                  setIsEditModalOpen(false);
                }}
                className="text-gray-500 text-3xl">
                &times;
              </button>
            </div>
            {isUpdateDone ? (
              <div className="flex flex-col items-center justify-center space-y-4 bg-white p-6 rounded-lg w-full max-w-sm mx-auto">
                {/* Success Icon */}
                <div className="w-16 h-16 bg-orange-500 rounded-full flex items-center justify-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="white"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-8 w-8">
                    <path d="M5 13l4 4L19 7" />
                  </svg>
                </div>

                {/* Success Message */}
                <div className="text-center">
                  <h2 className="text-xl font-semibold text-gray-800">
                    Updated Successfully
                  </h2>
                  <p className="text-gray-500 mt-2">
                    The event has been updated successfully.
                  </p>
                </div>
              </div>
            ) : isDeleteDone ? (
              <div className="flex flex-col items-center justify-center space-y-4 bg-white p-6 rounded-lg w-full max-w-sm mx-auto">
                {/* Success Icon */}
                <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-8 w-8 text-white"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round">
                    <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6" />
                    <line x1="10" y1="11" x2="10" y2="17" />
                    <line x1="14" y1="11" x2="14" y2="17" />
                  </svg>
                </div>

                {/* Success Message */}
                <div className="text-center">
                  <h2 className="text-xl font-semibold text-gray-800">
                    Deleted Successfully
                  </h2>
                  <p className="text-gray-500 mt-2">
                    The event has been deleted successfully.
                  </p>
                </div>
              </div>
            ) : (
              <>
                <div className="mt-4">
                  <label className="block font-semibold text-gray-700">
                    Reminder/Meeting Title
                  </label>
                  <input
                    type="text"
                    name="taskDescription"
                    value={formData.taskDescription}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 mt-1 border border-[#828282] rounded-lg text-[14px]"
                  />
                </div>
                <div className="mt-4">
                  <label className="block font-semibold text-gray-700">
                    Date
                  </label>
                  <input
                    type="date"
                    name="date"
                    value={formData.date}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 mt-1 border border-[#828282] rounded-lg text-[14px]"
                  />
                </div>
                <div className="mt-4">
                  <label className="block font-semibold text-gray-700">
                    Time
                  </label>
                  <input
                    type="time"
                    name="time"
                    value={formData.time}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 mt-1 border border-[#828282] rounded-lg text-[14px]"
                  />
                </div>
                <div className="mt-4">
                  <label className="block font-semibold text-gray-700">
                    Recurring
                  </label>
                  <select
                    name="recurrence"
                    value={formData.recurrence}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 mt-1 border border-[#828282] rounded-lg text-[14px]">
                    <option value="once">Once</option>
                    <option value="hourly">Hourly</option>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="custom">Custom</option>
                  </select>
                  {formData.recurrence === "custom" && (
                    <input
                      type="text"
                      name="customRecurrence"
                      placeholder="Enter custom recurrence"
                      value={formData.customRecurrence}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 mt-1 border border-[#828282] rounded-lg text-[14px]"
                    />
                  )}
                </div>
                {formData?.isMeeting && (
                  <div className="mt-4">
                    <label className="block font-semibold text-gray-700">
                      Participants
                    </label>
                    <textarea
                      name="invitees"
                      value={formData.invitees}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 mt-1 border border-[#828282] rounded-lg text-[14px]"
                    />
                  </div>
                )}
                <div className="mt-6 flex justify-between">
                  {isEdited ? (
                    <Button
                      onClick={handleSaveChanges}
                      disabled={isUpdating || isDeleting}
                      isLoading={isUpdating} // Show loader when isUpdating is true
                      className={`w-1/2 flex items-centerw-1/2 bg-[#FF9800] text-white px-4 py-2 rounded-lg mr-2 font-semibold ${
                        isUpdating ? "cursor-not-allowed" : ""
                      }`}
                      color="secondary"
                      spinner={
                        <svg
                          className="animate-spin h-5 w-5 text-white mr-2"
                          fill="none"
                          viewBox="0 0 24 24"
                          xmlns="http://www.w3.org/2000/svg">
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          />
                          <path
                            className="opacity-75"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            fill="currentColor"
                          />
                        </svg>
                      }>
                      {isUpdating ? "Updating..." : "Update Event"}
                    </Button>
                  ) : null}
                  <Button
                    onClick={deleteReminder}
                    disabled={isUpdating || isDeleting}
                    isLoading={isDeleting} // Show loader when isDeleting is true
                    className={`${
                      isEdited ? "w-1/2" : "w-full"
                    } flex items-center border-2 border-red-500 text-red-500 px-4 py-2 rounded-lg font-semibold ${
                      isDeleting ? "cursor-not-allowed" : ""
                    }`}
                    spinner={
                      <svg
                        className="animate-spin h-5 w-5 text-red-500 mr-2"
                        fill="none"
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg">
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          fill="currentColor"
                        />
                      </svg>
                    }>
                    {isDeleting ? "Deleting..." : "Delete Event"}
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Page;
