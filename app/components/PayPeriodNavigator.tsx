'use client';

import { useState } from 'react';
import { PayPeriod, getPayPeriodForDate } from '@/lib/pay-period-utils';

interface PayPeriodNavigatorProps {
  initialPeriod: PayPeriod;
  isCurrentPeriod: boolean;
  onPeriodChange: (period: PayPeriod) => void;
}

export default function PayPeriodNavigator({
  initialPeriod,
  isCurrentPeriod,
  onPeriodChange,
}: PayPeriodNavigatorProps) {
  const [period, setPeriod] = useState(initialPeriod);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const handlePrevious = async () => {
    const response = await fetch('/api/pay-period/previous', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentStart: period.start.toISOString() }),
    });
    const data = await response.json();
    const newPeriod = {
      start: new Date(data.start),
      end: new Date(data.end),
      label: data.label,
    };
    setPeriod(newPeriod);
    onPeriodChange(newPeriod);
  };

  const handleNext = async () => {
    const response = await fetch('/api/pay-period/next', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentStart: period.start.toISOString() }),
    });
    const data = await response.json();
    const newPeriod = {
      start: new Date(data.start),
      end: new Date(data.end),
      label: data.label,
    };
    setPeriod(newPeriod);
    onPeriodChange(newPeriod);
  };

  const handleCurrent = async () => {
    const response = await fetch('/api/pay-period/current');
    const data = await response.json();
    const newPeriod = {
      start: new Date(data.start),
      end: new Date(data.end),
      label: data.label,
    };
    setPeriod(newPeriod);
    onPeriodChange(newPeriod);
    setShowDatePicker(false);
  };

  const handleDateSelect = async (dateString: string) => {
    const [year, month, day] = dateString.split('-').map(Number);
    const selectedDate = new Date(year, month - 1, day);
    const newPeriod = getPayPeriodForDate(selectedDate);
    
    // Fetch data for the selected period
    const response = await fetch('/api/pay-period/data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        start: newPeriod.start.toISOString(),
        end: newPeriod.end.toISOString(),
      }),
    });
    
    setPeriod(newPeriod);
    onPeriodChange(newPeriod);
    setShowDatePicker(false);
  };

  // Format date for input (YYYY-MM-DD)
  const formatDateForInput = (date: Date) => {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between">
        <button
          onClick={handlePrevious}
          className="px-4 py-2 text-sm font-medium text-foreground bg-card border border-border rounded-lg hover:bg-muted focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors"
        >
          ← Previous
        </button>

        <div className="flex flex-col items-center gap-2">
          <h3 className="text-lg font-semibold text-foreground">{period.label}</h3>
          <div className="flex gap-2 items-center">
            {!isCurrentPeriod && (
              <button
                onClick={handleCurrent}
                className="text-xs text-primary hover:opacity-80 underline"
              >
                Jump to Current
              </button>
            )}
            <button
              onClick={() => setShowDatePicker(!showDatePicker)}
              className="text-xs text-primary hover:opacity-80 underline"
            >
              {showDatePicker ? 'Hide' : 'Pick Date'}
            </button>
          </div>
        </div>

        <button
          onClick={handleNext}
          className="px-4 py-2 text-sm font-medium text-foreground bg-card border border-border rounded-lg hover:bg-muted focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors"
        >
          Next →
        </button>
      </div>

      {/* Date Picker Dropdown */}
      {showDatePicker && (
        <div className="mt-4 p-4 bg-card border border-border rounded-lg">
          <label className="block text-sm font-medium text-foreground mb-2">
            Select any date to view its pay period:
          </label>
          <input
            type="date"
            defaultValue={formatDateForInput(period.start)}
            onChange={(e) => handleDateSelect(e.target.value)}
            className="w-full px-3 py-2 border border-border bg-muted text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            // Allow dates from 6 years ago to future
            min={formatDateForInput(new Date(new Date().getFullYear() - 6, 0, 1))}
            max={formatDateForInput(new Date(new Date().getFullYear() + 1, 11, 31))}
          />
          <p className="mt-2 text-xs text-muted-foreground">
            Tip: You can select any date from the past 6 years
          </p>
        </div>
      )}
    </div>
  );
}
