import { useState } from "react";

export function TimerSettings({ onStartWithTimer, isVisible, onClose }) {
    const [selectedDuration, setSelectedDuration] = useState(null);
    const [customHours, setCustomHours] = useState("");
    const [customMinutes, setCustomMinutes] = useState("");

    const presets = [
        { label: "1:00h", hours: 1, minutes: 0 },
        { label: "1:15h", hours: 1, minutes: 15 },
        { label: "1:30h", hours: 1, minutes: 30 },
        { label: "1:45h", hours: 1, minutes: 45 },
        { label: "2:00h", hours: 2, minutes: 0 },
        { label: "2:15h", hours: 2, minutes: 15 },
        { label: "2:30h", hours: 2, minutes: 30 },
        { label: "2:45h", hours: 2, minutes: 45 },
        { label: "3:00h", hours: 3, minutes: 0 },
        { label: "3:15h", hours: 3, minutes: 15 },
        { label: "3:30h", hours: 3, minutes: 30 },
        { label: "3:45h", hours: 3, minutes: 45 },
    ];

    const handlePresetSelect = (preset) => {
        setSelectedDuration(preset);
        setCustomHours("");
        setCustomMinutes("");
    };

    const handleCustomSelect = () => {
        const hours = parseInt(customHours) || 0;
        const minutes = parseInt(customMinutes) || 0;

        if (hours > 0 || minutes > 0) {
            setSelectedDuration({ label: "Benutzerdefiniert", hours, minutes });
        }
    };

    // Validate and sanitize numeric input
    const handleHoursChange = (e) => {
        const value = e.target.value;
        // Allow empty string or valid numbers only
        if (value === "" || /^\d+$/.test(value)) {
            const numValue = parseInt(value) || 0;
            if (numValue >= 0 && numValue <= 12) {
                setCustomHours(value);
            }
        }
    };

    const handleMinutesChange = (e) => {
        const value = e.target.value;
        // Allow empty string or valid numbers only
        if (value === "" || /^\d+$/.test(value)) {
            const numValue = parseInt(value) || 0;
            if (numValue >= 0 && numValue <= 59) {
                setCustomMinutes(value);
            }
        }
    };

    // Enhanced validation for custom time
    const isCustomTimeValid = () => {
        const hours = parseInt(customHours) || 0;
        const minutes = parseInt(customMinutes) || 0;
        return (hours > 0 || minutes > 0) && hours <= 12 && minutes <= 59;
    };

    const handleStart = () => {
        if (selectedDuration) {
            const durationMs = (selectedDuration.hours * 60 + selectedDuration.minutes) * 60 * 1000;
            onStartWithTimer(durationMs);
            onClose();
        }
    };

    const handleStartWithoutTimer = () => {
        onStartWithTimer(null);
        onClose();
    };

    if (!isVisible) return null;

    // Split presets into 3 rows of 4 columns
    const presetRows = [];
    for (let i = 0; i < presets.length; i += 4) {
        presetRows.push(presets.slice(i, i + 4));
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
            <div className="w-full max-w-md rounded-lg bg-zinc-800 p-6">
                <h2 className="mb-4 text-xl font-semibold text-gray-100">Waschzeit einstellen</h2>

                <div className="mb-6 space-y-3">
                    <div className="grid grid-rows-3 gap-2">
                        {presetRows.map((row, rowIdx) => (
                            <div key={rowIdx} className="grid grid-cols-4 gap-2">
                                {row.map((preset, colIdx) => (
                                    <button
                                        key={colIdx}
                                        onClick={() => handlePresetSelect(preset)}
                                        className={`w-full p-3 rounded-lg text-left transition ${
                                            selectedDuration?.label === preset.label
                                                ? "bg-green-600 text-green-100"
                                                : "bg-zinc-700 text-gray-300 hover:bg-zinc-600"
                                        }`}
                                    >
                                        {preset.label}
                                    </button>
                                ))}
                            </div>
                        ))}
                    </div>

                    <div className="border-t border-zinc-600 pt-3">
                        <p className="mb-2 text-sm text-gray-400">Benutzerdefiniert:</p>
                        <div className="flex items-center gap-2">
                            <input
                                type="number"
                                placeholder="Std"
                                value={customHours}
                                onChange={handleHoursChange}
                                onKeyDown={(e) => {
                                    // Prevent invalid characters
                                    if (
                                        e.key === "e" ||
                                        e.key === "E" ||
                                        e.key === "+" ||
                                        e.key === "-" ||
                                        e.key === "."
                                    ) {
                                        e.preventDefault();
                                    }
                                }}
                                min="0"
                                max="12"
                                className="w-16 rounded border border-zinc-600 bg-zinc-700 p-2 text-gray-100"
                            />
                            <span className="text-gray-400">:</span>
                            <input
                                type="number"
                                placeholder="Min"
                                value={customMinutes}
                                onChange={handleMinutesChange}
                                onKeyDown={(e) => {
                                    // Prevent invalid characters
                                    if (
                                        e.key === "e" ||
                                        e.key === "E" ||
                                        e.key === "+" ||
                                        e.key === "-" ||
                                        e.key === "."
                                    ) {
                                        e.preventDefault();
                                    }
                                }}
                                min="0"
                                max="59"
                                className="w-16 rounded border border-zinc-600 bg-zinc-700 p-2 text-gray-100"
                            />
                            <button
                                onClick={handleCustomSelect}
                                disabled={!isCustomTimeValid()}
                                className={`ml-2 rounded px-3 py-2 transition ${
                                    isCustomTimeValid()
                                        ? "bg-blue-600 text-blue-100 hover:bg-blue-700"
                                        : "bg-gray-600 text-gray-400 cursor-not-allowed"
                                }`}
                            >
                                OK
                            </button>
                        </div>
                        {selectedDuration?.label === "Benutzerdefiniert" && (
                            <p className="mt-1 text-xs text-green-400">
                                {selectedDuration.hours}h {selectedDuration.minutes}m ausgewählt
                            </p>
                        )}
                        {(customHours || customMinutes) && !isCustomTimeValid() && (
                            <p className="mt-1 text-xs text-red-400">
                                {parseInt(customHours) === 0 && parseInt(customMinutes) === 0
                                    ? "Zeit muss größer als 0 sein"
                                    : "Ungültige Eingabe (max. 12h 59m)"}
                            </p>
                        )}
                    </div>
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={handleStartWithoutTimer}
                        className="flex-1 rounded-lg bg-gray-600 py-3 text-gray-100 transition hover:bg-gray-700"
                    >
                        Ohne Timer starten
                    </button>
                    <button
                        onClick={handleStart}
                        disabled={!selectedDuration}
                        className={`flex-1 py-3 rounded-lg transition font-semibold ${
                            selectedDuration
                                ? "bg-green-600 text-green-100 hover:bg-green-700"
                                : "bg-gray-700 text-gray-400 cursor-not-allowed"
                        }`}
                    >
                        Mit Timer starten
                    </button>
                </div>

                <button
                    onClick={onClose}
                    className="mt-3 w-full py-2 text-sm text-gray-400 transition hover:text-gray-300"
                >
                    Abbrechen
                </button>
            </div>
        </div>
    );
}
