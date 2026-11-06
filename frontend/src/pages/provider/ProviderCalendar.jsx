import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  User,
  MapPin,
  CheckCircle2,
} from "lucide-react";
import ProviderLayout from "../../components/provider/ProviderLayout";
import StatusBadge from "../../components/common/StatusBadge";
import Spinner from "../../components/common/Spinner";
import { httpClient } from "../../lib/http";

export default function ProviderCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDayBookings, setSelectedDayBookings] = useState([]);
  const [selectedDateStr, setSelectedDateStr] = useState("");

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  useEffect(() => {
    setLoading(true);
    httpClient
      .get("/bookings?limit=100")
      .then((res) => {
        if (res.data?.success) {
          setBookings(res.data.bookings || []);
        }
      })
      .catch((err) => console.error("Error fetching bookings:", err))
      .finally(() => setLoading(false));
  }, []);

  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Days matrix
  const days = [];
  for (let i = 0; i < firstDayOfMonth; i++) {
    days.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    days.push(d);
  }

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
    setSelectedDayBookings([]);
    setSelectedDateStr("");
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
    setSelectedDayBookings([]);
    setSelectedDateStr("");
  };

  const handleSelectDay = (day) => {
    if (!day) return;
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    setSelectedDateStr(dateStr);
    const dayBookings = bookings.filter((b) => b.date === dateStr);
    setSelectedDayBookings(dayBookings);
  };

  const monthName = currentDate.toLocaleString("default", { month: "long" });

  return (
    <ProviderLayout title="Schedule & Calendar">
      <div className="space-y-6">
        <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CalendarIcon className="w-6 h-6 text-ink" />
            <h2 className="text-xl font-bold text-ink">
              {monthName} {year}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-2 rounded-xl border border-gray-200 hover:bg-gray-50 transition"
            >
              <ChevronLeft className="w-4 h-4 text-ink" />
            </button>
            <button
              type="button"
              onClick={handleNextMonth}
              className="p-2 rounded-xl border border-gray-200 hover:bg-gray-50 transition"
            >
              <ChevronRight className="w-4 h-4 text-ink" />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="py-20 flex justify-center">
            <Spinner size="lg" />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Calendar Grid (2 cols) */}
            <div className="lg:col-span-2 bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
              <div className="grid grid-cols-7 gap-2 text-center text-xs font-bold text-gray-400 mb-4 uppercase tracking-wider">
                <div>Sun</div>
                <div>Mon</div>
                <div>Tue</div>
                <div>Wed</div>
                <div>Thu</div>
                <div>Fri</div>
                <div>Sat</div>
              </div>

              <div className="grid grid-cols-7 gap-2">
                {days.map((day, idx) => {
                  if (!day) {
                    return <div key={idx} className="h-20 bg-gray-50/40 rounded-2xl" />;
                  }

                  const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                  const dayBookings = bookings.filter((b) => b.date === dateStr);
                  const isSelected = selectedDateStr === dateStr;

                  return (
                    <div
                      key={idx}
                      onClick={() => handleSelectDay(day)}
                      className={`h-20 p-2 rounded-2xl border cursor-pointer transition flex flex-col justify-between ${
                        isSelected
                          ? "border-[#111111] bg-gray-50 ring-2 ring-[#111111]"
                          : dayBookings.length > 0
                          ? "border-emerald-200 bg-emerald-50/40 hover:bg-emerald-50"
                          : "border-gray-100 hover:bg-gray-50"
                      }`}
                    >
                      <span className="text-xs font-bold text-ink">{day}</span>

                      {dayBookings.length > 0 && (
                        <div className="flex flex-col gap-1">
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-lg bg-[#111111] text-white truncate text-center">
                            {dayBookings.length} {dayBookings.length === 1 ? "job" : "jobs"}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Selected Day Agenda (1 col) */}
            <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400">
                {selectedDateStr ? `Schedule for ${selectedDateStr}` : "Day Agenda"}
              </h3>

              {!selectedDateStr ? (
                <p className="text-xs text-gray-400 italic">
                  Select a day on the calendar to view scheduled jobs.
                </p>
              ) : selectedDayBookings.length === 0 ? (
                <p className="text-xs text-gray-400 italic">
                  No appointments scheduled for this date.
                </p>
              ) : (
                <div className="space-y-3">
                  {selectedDayBookings.map((b) => (
                    <div
                      key={b._id}
                      className="p-4 rounded-2xl bg-gray-50 border border-gray-200 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-ink">{b.bookingId}</span>
                        <StatusBadge status={b.status} />
                      </div>

                      <h4 className="text-sm font-bold text-ink">{b.serviceTitle}</h4>

                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <Clock className="w-3.5 h-3.5 text-gray-400" />
                        <span>
                          {b.startTime} - {b.endTime}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <User className="w-3.5 h-3.5 text-gray-400" />
                        <span>
                          {b.customerId?.firstName} {b.customerId?.lastName}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <MapPin className="w-3.5 h-3.5 text-gray-400" />
                        <span>
                          {b.customerStreet}, {b.customerCity}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </ProviderLayout>
  );
}
