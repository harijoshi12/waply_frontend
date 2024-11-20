"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import logo from "../../public/assets/logo-waply.png";
import { FaAngleDown } from "react-icons/fa";
import axios from "axios";

// Define the Reminder type (adjust fields as needed based on your data structure)
interface Reminder {
  _id: string;
  taskDescription: string;
  date: string;
  time: string;
  recurrence: string;
  customRecurrence?: string;
  invitees?: string;
  // Add other fields as needed
}

const Page = () => {
  // Initialize reminders state with Reminder[] type
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [dateRange, setDateRange] = useState({ start: "", end: "" });
  const [selectedValue, setSelectedValue] = useState("today");
  const [showDropdown, setShowDropdown] = useState(false);
  const [formData, setFormData] = useState({
    taskDescription: "",
    date: "",
    time: "",
    recurrence: "",
    customRecurrence: "",
    invitees: "",
  });
  const [originalData, setOriginalData] = useState({});
  const [isEdited, setIsEdited] = useState(false);
  const [selectedReminderId, setSelectedReminderId] = useState<string | null>(
    null
  );

  // Format date with suffix (e.g., "19th Nov, 2024")
  const formatDate = (date: Date, includeYear = true) => {
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
  const formatTimeRange = (startTime, endTime) => {
    const formatTime = (date) =>
      date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    return `${formatTime(startTime)} - ${formatTime(endTime)}`;
  };

  // Update date range based on selected filter (today, this week, this month)
  const updateDateRange = useCallback((filter) => {
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
  const fetchReminders = useCallback(async () => {
    const token = localStorage.getItem("authToken");
    setIsLoading(true);

    let backendFilter = selectedValue;
    const splitValue = selectedValue.split(" ");
    if (splitValue.length > 1) backendFilter = splitValue[1];

    try {
      const response = await axios.get("http://dev.waply.co/api/v1/reminders", {
        params: { page: 1, filter: backendFilter },
        headers: { Authorization: `Bearer ${token}` },
        // withCredentials: true,
      });
      const { reminders } = response.data;
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
  const handleDateRangeChange = (key) => {
    const selectedKey = key;
    if (selectedKey === "this-week") setSelectedValue("this week");
    else if (selectedKey === "this-month") setSelectedValue("this month");
    else setSelectedValue("today");

    setShowDropdown(false);
  };

  // Group reminders by date for "this week" or "this month" view
  const groupRemindersByDate = (reminders: Reminder[]) => {
    return reminders.reduce((grouped, reminder) => {
      const date = new Date(reminder.nextOccurrence || "").toDateString();
      if (!grouped[date]) grouped[date] = [];
      grouped[date].push(reminder);
      return grouped;
    }, {});
  };

  // Open edit modal with selected reminder details
  const openEditModal = (reminder) => {
    const nextOccurrence = new Date(reminder.nextOccurrence);
    const initialData = {
      taskDescription: reminder.taskDescription,
      date: nextOccurrence.toISOString().split("T")[0],
      time: nextOccurrence.toTimeString().split(" ")[0].slice(0, 5),
      recurrence: reminder.recurrence.frequency,
      customRecurrence: "",
      invitees: reminder.relatedMeetingId
        ? reminder.relatedMeetingId.attendees
            .map((attendee) => attendee.email)
            .join(", ")
        : "",
    };
    setFormData(initialData);
    setOriginalData(initialData);
    setIsEdited(false);
    setSelectedReminderId(reminder._id); // Set selected reminder ID for update
    setIsEditModalOpen(true);
  };

  // Handle input changes and track if form has been edited
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    setIsEdited(
      JSON.stringify({ ...formData, [name]: value }) !==
        JSON.stringify(originalData)
    );
  };

  // Generate userInput string and update reminder
  const handleSaveChanges = async () => {
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

    // Prepare data for API request
    const requestData = {
      userInput,
      isMeeting,
    };

    const token = localStorage.getItem("authToken");
    try {
      // Make API call to update reminder
      await axios.put(
        `http://dev.waply.co/api/v1/reminders/${selectedReminderId}`,
        requestData,
        {
          headers: { Authorization: `Bearer ${token}` },
          // withCredentials: true,
        }
      );

      // Update local state and close the modal
      setReminders((prevReminders) =>
        prevReminders.map((reminder) =>
          reminder._id === selectedReminderId
            ? { ...reminder, ...formData } // Update reminder in state
            : reminder
        )
      );
      setIsEditModalOpen(false);
    } catch (error) {
      console.error("Failed to update reminder:", error);
    }
  };

  // Delete reminder from backend
  const deleteReminder = async () => {
    if (!selectedReminderId) return;

    const token = localStorage.getItem("authToken");
    try {
      await axios.delete(
        `http://dev.waply.co/api/v1/reminders/${selectedReminderId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
          // withCredentials: true,
          data: { isMeeting: Boolean(formData.invitees) },
        }
      );
      setReminders((prevReminders) =>
        prevReminders.filter((reminder) => reminder._id !== selectedReminderId)
      );
      setIsEditModalOpen(false);
    } catch (error) {
      console.error("Failed to delete reminder:", error);
    }
  };

  const groupedReminders =
    selectedValue !== "today" ? groupRemindersByDate(reminders) : null;

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
            const startTime = new Date(reminder.nextOccurrence);
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
                  {reminder.taskDescription}
                </h3>
                <span className="bg-[#FFF3E5] border-[#FF8800]/50 border-[1px] text-sm px-3 py-1 rounded-md">
                  {formatTimeRange(startTime, endTime)}
                </span>
              </div>
            );
          })
        ) : (
          Object.keys(groupedReminders).map((date) => (
            <div key={date} className="mb-4">
              <div className="flex items-center justify-center mb-2">
                <div className="border-t border-gray-300 flex-grow mr-2"></div>
                <p className="text-gray-700 font-semibold text-[14px] text-center">
                  {formatDate(new Date(date))}
                </p>
                <div className="border-t border-gray-300 flex-grow ml-2"></div>
              </div>
              {groupedReminders[date].map((reminder, index) => {
                const startTime = new Date(reminder.nextOccurrence);
                const endTime = new Date(startTime);
                endTime.setMinutes(
                  startTime.getMinutes() + (reminder.relatedMeetingId ? 30 : 10)
                );

                return (
                  <div
                    key={reminder._id}
                    className={`w-full reminder-item mb-4 p-4 rounded flex justify-between items-center ${
                      index % 2 === 0 ? "bg-[#FFFAF8]" : "bg-[#ffffff]"
                    }`}
                    onClick={() => openEditModal(reminder)}>
                    <h3 className="font-medium text-[#272727] text-[16px]">
                      {reminder.taskDescription}
                    </h3>
                    <span className="bg-[#FFF3E5] border-[#FF8800]/50 border-[1px]  text-sm px-3 py-1 rounded-md">
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
                onClick={() => setIsEditModalOpen(false)}
                className="text-gray-500 text-3xl">
                &times;
              </button>
            </div>
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
              <label className="block font-semibold text-gray-700">Date</label>
              <input
                type="date"
                name="date"
                value={formData.date}
                onChange={handleInputChange}
                className="w-full px-3 py-2 mt-1 border border-[#828282] rounded-lg text-[14px]"
              />
            </div>
            <div className="mt-4">
              <label className="block font-semibold text-gray-700">Time</label>
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
            {formData.invitees && (
              <div className="mt-4">
                <label className="block font-semibold text-gray-700">
                  Participants
                </label>
                <textarea
                  name="invitees"
                  value={formData.invitees}
                  readOnly
                  className="w-full px-3 py-2 mt-1 border border-[#828282] rounded-lg text-[14px]"
                />
              </div>
            )}
            <div className="mt-6 flex justify-between">
              {isEdited ? (
                <button
                  onClick={handleSaveChanges}
                  className="w-1/2 bg-[#FF9800] text-white px-4 py-2 rounded-lg mr-2 font-semibold">
                  Update Event
                </button>
              ) : null}
              <button
                onClick={deleteReminder}
                className={`${
                  isEdited ? "w-1/2" : "w-full"
                } border-2 border-red-500 text-red-500 px-4 py-2 rounded-lg font-semibold`}>
                Delete Event
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Page;
