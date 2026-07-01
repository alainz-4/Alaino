import { useEffect, useMemo, useState, type MouseEvent } from "react";
import { format } from "date-fns";
import type { ContractDTO, WorkDayDTO, WorkDayUpdatePayload } from "../types";
import { dateKey, humanDate, monthDays, shiftMonth } from "../lib/dates";
import { Button, Field, Panel } from "./Common";

type CalendarMonthViewProps = {
  monthKey: string;
  days: WorkDayDTO[];
  contracts: ContractDTO[];
  onMonthChange: (monthKey: string) => void;
  onSaveDay: (date: string, payload: WorkDayUpdatePayload) => Promise<void>;
  onSaveDays?: (dates: string[], payload: WorkDayUpdatePayload) => Promise<void>;
  compact?: boolean;
};

const MONTH_NAMES = Array.from({ length: 12 }, (_, index) => format(new Date(Date.UTC(2024, index, 1, 12)), "LLLL"));

function toMonthKey(year: number, monthIndex: number) {
  return `${year}-${String(monthIndex + 1).padStart(2, "0")}`;
}

function abbreviateContractTitle(title: string) {
  const words = title
    .split(/[\s/,&-]+/)
    .map((part) => part.trim())
    .filter(Boolean);

  const initials = words.map((word) => word[0]).join("").toUpperCase();
  if (initials.length >= 2) {
    return initials;
  }

  return title.replace(/\s+/g, " ").trim().slice(0, 4).toUpperCase();
}

function compactContractLabel(title: string, maxLength = 16) {
  const normalized = title.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) {
    return normalized;
  }

  return abbreviateContractTitle(normalized);
}

function dayStatusLabel(day: WorkDayDTO) {
  if (day.status !== "WORKING") {
    return "Off";
  }

  if (day.contract?.title) {
    return compactContractLabel(day.contract.title);
  }

  return "Working";
}

export default function CalendarMonthView({ monthKey, days, contracts, onMonthChange, onSaveDay, onSaveDays, compact = false }: CalendarMonthViewProps) {
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectionAnchor, setSelectionAnchor] = useState<string | null>(null);
  const [dragOrigin, setDragOrigin] = useState<string | null>(null);
  const [status, setStatus] = useState<"WORKING" | "OFF">("OFF");
  const [contractId, setContractId] = useState<string>("");
  const [dailyRate, setDailyRate] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [clientId, setClientId] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  const orderedDays = useMemo(() => {
    const byDate = new Map(days.map((day) => [day.workDate, day]));
    return monthDays(monthKey).map((date) =>
      byDate.get(dateKey(date)) ??
      ({
        id: dateKey(date),
        workDate: dateKey(date),
        status: "OFF",
        contractId: null,
        clientId: null,
        dailyRate: null,
        notes: null,
        contract: null,
        client: null
      } satisfies WorkDayDTO)
    );
  }, [days, monthKey]);

  const orderedIndex = useMemo(() => new Map(orderedDays.map((day, index) => [day.workDate, index])), [orderedDays]);
  const dayByDate = useMemo(() => new Map(orderedDays.map((day) => [day.workDate, day])), [orderedDays]);
  const contractsById = useMemo(() => new Map(contracts.map((contract) => [contract.id, contract])), [contracts]);
  const defaultContract = useMemo(() => {
    const activeContracts = contracts.filter((contract) => contract.active);
    return activeContracts.length === 1 ? activeContracts[0] : contracts[0] ?? null;
  }, [contracts]);
  const selectedContract = contractsById.get(contractId) ?? null;
  const [yearText, monthText] = monthKey.split("-");
  const currentYear = Number(yearText);
  const currentMonthIndex = Number(monthText) - 1;

  function resolveContractRate(value?: string | null) {
    return value ? contractsById.get(value)?.dailyRate ?? null : null;
  }

  const leadingBlanks = useMemo(() => {
    const first = monthDays(monthKey)[0];
    const mondayIndex = (first.getDay() + 6) % 7;
    return Array.from({ length: mondayIndex }, (_, index) => `blank-${index}`);
  }, [monthKey]);

  useEffect(() => {
    setSelectedDates((current) => {
      const filtered = current.filter((date) => dayByDate.has(date));
      if (filtered.length > 0) {
        return filtered.sort((a, b) => (orderedIndex.get(a) ?? 0) - (orderedIndex.get(b) ?? 0));
      }

      const initial = orderedDays.find((day) => day.status === "WORKING") ?? orderedDays[0];
      return initial ? [initial.workDate] : [];
    });
  }, [dayByDate, monthKey, orderedDays, orderedIndex]);

  function hydrateForm(day: WorkDayDTO) {
    setStatus(day.status);
    setContractId(day.contractId ?? "");
    setClientId(day.clientId ?? "");
    const fallbackRate = day.dailyRate ?? resolveContractRate(day.contractId) ?? null;
    setDailyRate(fallbackRate === null || fallbackRate === undefined ? "" : String(fallbackRate));
    setNotes(day.notes ?? "");
  }

  useEffect(() => {
    const activeDate = selectedDates[0];
    const activeDay = activeDate ? dayByDate.get(activeDate) : undefined;
    if (activeDay && selectedDates.length <= 1) {
      hydrateForm(activeDay);
    }
  }, [dayByDate, selectedDates]);

  useEffect(() => {
    if (status !== "WORKING" || contractId || !defaultContract) {
      return;
    }

    setContractId(defaultContract.id);
    setClientId(defaultContract.clientId);
    setDailyRate(defaultContract.dailyRate === null || defaultContract.dailyRate === undefined ? "" : String(defaultContract.dailyRate));
  }, [contractId, defaultContract, status]);

  useEffect(() => {
    if (!saveMessage) {
      return;
    }

    const timeoutId = window.setTimeout(() => setSaveMessage(null), 3500);
    return () => window.clearTimeout(timeoutId);
  }, [saveMessage]);

  useEffect(() => {
    function stopDrag() {
      setDragOrigin(null);
    }

    window.addEventListener("mouseup", stopDrag);
    window.addEventListener("blur", stopDrag);
    return () => {
      window.removeEventListener("mouseup", stopDrag);
      window.removeEventListener("blur", stopDrag);
    };
  }, []);

  const selectedDay = selectedDates.length > 0 ? dayByDate.get(selectedDates[0]) ?? orderedDays[0] : undefined;
  const isBulkEditing = selectionMode && selectedDates.length > 1;

  function sortDates(dates: string[]) {
    return Array.from(new Set(dates)).sort((a, b) => (orderedIndex.get(a) ?? 0) - (orderedIndex.get(b) ?? 0));
  }

  function toggleSelectionMode() {
    setSelectionMode((current) => {
      const next = !current;
      if (!next) {
        setSelectedDates((items) => (items.length > 0 ? [items[0]] : []));
        setDragOrigin(null);
        setSelectionAnchor(null);
      } else if (selectedDates.length === 0 && orderedDays[0]) {
        setSelectedDates([orderedDays[0].workDate]);
        setSelectionAnchor(orderedDays[0].workDate);
      }
      return next;
    });
  }

  function selectSingle(date: string) {
    setSelectionAnchor(date);
    setSelectedDates([date]);
  }

  function selectRange(fromDate: string, toDate: string) {
    const fromIndex = orderedIndex.get(fromDate);
    const toIndex = orderedIndex.get(toDate);
    if (fromIndex === undefined || toIndex === undefined) {
      return;
    }

    const [start, end] = fromIndex < toIndex ? [fromIndex, toIndex] : [toIndex, fromIndex];
    const next = orderedDays.slice(start, end + 1).map((day) => day.workDate);
    setSelectionAnchor(toDate);
    setSelectedDates(sortDates(next));
  }

  function toggleDate(date: string) {
    setSelectionAnchor(date);
    setSelectedDates((current) => {
      const next = current.includes(date) ? current.filter((item) => item !== date) : [...current, date];
      const sorted = sortDates(next);
      return sorted.length > 0 ? sorted : [date];
    });
  }

  function startDrag(date: string) {
    setSelectionAnchor(date);
    setDragOrigin(date);
    setSelectedDates([date]);
  }

  function handleCellMouseDown(date: string, event: MouseEvent<HTMLButtonElement>) {
    if (!selectionMode) {
      return;
    }

    if (event.button !== 0) {
      return;
    }

    event.preventDefault();

    if (event.metaKey || event.ctrlKey) {
      toggleDate(date);
      return;
    }

    if (event.shiftKey && selectionAnchor) {
      selectRange(selectionAnchor, date);
      return;
    }

    startDrag(date);
  }

  function handleCellMouseEnter(date: string) {
    if (!selectionMode || !dragOrigin) {
      return;
    }

    selectRange(dragOrigin, date);
  }

  function selectWeekdays() {
    const weekdays = orderedDays
      .filter((day) => {
        const weekday = new Date(`${day.workDate}T12:00:00.000Z`).getUTCDay();
        return weekday >= 1 && weekday <= 5;
      })
      .map((day) => day.workDate);

    setSelectionMode(true);
    setSelectionAnchor(weekdays[0] ?? null);
    setDragOrigin(null);
    setSelectedDates(weekdays);
  }

  function clearSelection() {
    setSelectedDates([]);
    setSelectionAnchor(null);
    setDragOrigin(null);
  }

  function buildPayload(nextStatus = status): WorkDayUpdatePayload {
    const fallbackContract = defaultContract ?? selectedDay?.contract ?? null;
    const resolvedContractId =
      nextStatus === "WORKING"
        ? contractId || selectedDay?.contractId || fallbackContract?.id || null
        : null;
    const resolvedClientId =
      nextStatus === "WORKING"
        ? clientId || selectedContract?.clientId || selectedDay?.clientId || fallbackContract?.clientId || null
        : null;
    const resolvedRate =
      nextStatus === "WORKING"
        ? dailyRate
          ? Number(dailyRate)
          : selectedContract?.dailyRate ?? resolveContractRate(resolvedContractId) ?? selectedDay?.dailyRate ?? fallbackContract?.dailyRate ?? null
        : null;

    return {
      status: nextStatus,
      contractId: resolvedContractId,
      clientId: resolvedClientId,
      dailyRate: resolvedRate,
      notes: notes || null
    };
  }

  async function applyToSelection(nextStatus = status) {
    const payload = buildPayload(nextStatus);

    if (selectedDates.length === 0) {
      return;
    }

    if (isBulkEditing) {
      if (onSaveDays) {
        await onSaveDays(selectedDates, payload);
      } else {
        await Promise.all(selectedDates.map((date) => onSaveDay(date, payload)));
      }
      return;
    }

    await onSaveDay(selectedDates[0], payload);
  }

  async function applyPreset(nextStatus: "WORKING" | "OFF") {
    setStatus(nextStatus);
    try {
      await applyToSelection(nextStatus);
      setSaveMessage({
        tone: "success",
        text: selectedDates.length > 1 ? `Saved ${selectedDates.length} selected days.` : "Saved day changes."
      });
    } catch (error) {
      setSaveMessage({
        tone: "error",
        text: error instanceof Error ? error.message : "Could not save the selected days."
      });
    }
  }

  const selectionSummary =
    selectedDates.length > 1
      ? `${selectedDates.length} days selected`
      : selectedDates[0]
        ? humanDate(selectedDates[0])
        : "No day selected";

  const yearOptions = useMemo(() => {
    const startYear = currentYear - 3;
    return Array.from({ length: 7 }, (_, index) => startYear + index);
  }, [currentYear]);

  return (
    <div className={`calendar-layout ${compact ? "compact" : ""}`}>
      <Panel
        title="Month calendar"
        subtitle={`Click a day to mark it as working or off. Current month: ${format(new Date(`${monthKey}-01T12:00:00.000Z`), "LLLL yyyy")}`}
      >
        <div className="calendar-toolbar">
          <div className="calendar-jump-controls">
            <label className="calendar-jump-field">
              <span>Month</span>
              <select value={currentMonthIndex} onChange={(event) => onMonthChange(toMonthKey(currentYear, Number(event.target.value)))}>
                {MONTH_NAMES.map((name, index) => (
                  <option key={name} value={index}>
                    {name}
                  </option>
                ))}
              </select>
            </label>

            <label className="calendar-jump-field">
              <span>Year</span>
              <select value={currentYear} onChange={(event) => onMonthChange(toMonthKey(Number(event.target.value), currentMonthIndex))}>
                {yearOptions.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </label>

            <div className="calendar-jump-buttons">
              <Button variant="secondary" onClick={() => onMonthChange(shiftMonth(monthKey, -1))}>
                Prev
              </Button>
              <Button variant="secondary" onClick={() => onMonthChange(shiftMonth(monthKey, 1))}>
                Next
              </Button>
            </div>
          </div>

          <div className="calendar-selection-controls">
            <Button variant={selectionMode ? "primary" : "secondary"} onClick={toggleSelectionMode}>
              {selectionMode ? "Multi-select on" : "Multi-select"}
            </Button>
            <Button variant="secondary" onClick={selectWeekdays} disabled={!orderedDays.length}>
              Select weekdays
            </Button>
            <Button variant="secondary" onClick={clearSelection} disabled={selectedDates.length === 0}>
              Clear selection
            </Button>
          </div>
        </div>

        {selectionMode ? (
          <div className="selection-toolbar">
            <div className="selection-toolbar-copy">
              <strong>{selectedDates.length > 0 ? `${selectedDates.length} selected` : "No days selected"}</strong>
              <span>Drag across days, or use the buttons below to fill the current month quickly.</span>
            </div>
            <div className="selection-toolbar-actions">
              <Button variant="primary" onClick={() => applyPreset("WORKING")} disabled={selectedDates.length === 0 || saving}>
                Mark selected working
              </Button>
              <Button variant="secondary" onClick={() => applyPreset("OFF")} disabled={selectedDates.length === 0 || saving}>
                Mark selected off
              </Button>
            </div>
          </div>
        ) : null}

        {saveMessage ? (
          <div className={`save-feedback ${saveMessage.tone}`}>
            {saveMessage.text}
          </div>
        ) : null}

        <div className={`calendar-grid ${selectionMode ? "selecting" : ""}`}>
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
            <div key={day} className="calendar-weekday">{day}</div>
          ))}
          {leadingBlanks.map((blank) => (
            <div key={blank} className="calendar-empty-slot" />
          ))}
          {orderedDays.map((day) => (
            <button
              key={day.workDate}
              type="button"
              className={`calendar-cell ${day.status.toLowerCase()} ${selectedDates.includes(day.workDate) ? "selected" : ""} ${selectionMode ? "selectable" : ""}`}
              onMouseDown={(event) => handleCellMouseDown(day.workDate, event)}
              onMouseEnter={() => handleCellMouseEnter(day.workDate)}
              onClick={() => {
                if (!selectionMode) {
                  selectSingle(day.workDate);
                }
              }}
              aria-pressed={selectedDates.includes(day.workDate)}
            >
              {selectionMode ? <span className="calendar-select-marker">{selectedDates.includes(day.workDate) ? "✓" : ""}</span> : null}
              <span className="calendar-day-number">{Number(day.workDate.slice(-2))}</span>
              <span className="calendar-day-state" title={day.status === "WORKING" ? day.contract?.title ?? "Working" : "Off"}>
                {dayStatusLabel(day)}
              </span>
              {((day.dailyRate ?? resolveContractRate(day.contractId)) !== null && (day.dailyRate ?? resolveContractRate(day.contractId)) !== undefined) ? (
                <span className="calendar-day-rate">{Number(day.dailyRate ?? resolveContractRate(day.contractId)).toFixed(2)} EUR</span>
              ) : null}
            </button>
          ))}
        </div>
      </Panel>

      <Panel
        title={isBulkEditing ? "Bulk edit" : "Day details"}
        subtitle={selectionSummary}
      >
        {selectedDay ? (
          <form
            className="stack"
            onSubmit={async (event) => {
              event.preventDefault();
              setSaving(true);
              try {
                await applyToSelection(status);
                setSaveMessage({
                  tone: "success",
                  text: selectedDates.length > 1 ? `Saved ${selectedDates.length} selected days.` : "Saved day changes."
                });
              } catch (error) {
                setSaveMessage({
                  tone: "error",
                  text: error instanceof Error ? error.message : "Could not save the current day."
                });
              } finally {
                setSaving(false);
              }
            }}
          >
            {isBulkEditing ? (
              <div className="selection-banner">
                Applying the same changes to {selectedDates.length} selected days.
              </div>
            ) : null}

            <Field label="Status">
              <select value={status} onChange={(event) => setStatus(event.target.value as "WORKING" | "OFF")}>
                <option value="WORKING">Working</option>
                <option value="OFF">Off</option>
              </select>
            </Field>

            <Field label="Contract">
              <select
                value={contractId}
                onChange={(event) => {
                  const nextId = event.target.value;
                  setContractId(nextId);
                  const selected = contracts.find((contract) => contract.id === nextId);
                  if (selected) {
                    setClientId(selected.client.id);
                    const nextRate = selected.dailyRate ?? selectedDay?.dailyRate ?? "";
                    setDailyRate(nextRate === "" ? "" : String(nextRate));
                  } else {
                    setClientId("");
                    setDailyRate("");
                  }
                }}
              >
                <option value="">Select a contract</option>
                {contracts.map((contract) => (
                  <option key={contract.id} value={contract.id}>
                    {contract.title} - {contract.client.name}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Client">
              <select value={clientId} onChange={(event) => setClientId(event.target.value)}>
                <option value="">Auto from contract</option>
                {contracts.map((contract) => (
                  <option key={`${contract.id}-${contract.client.id}`} value={contract.client.id}>
                    {contract.client.name}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Daily rate">
              <input type="number" value={dailyRate} onChange={(event) => setDailyRate(event.target.value)} min="0" step="0.01" />
              <span className="field-help">
                {selectedContract?.dailyRate !== null && selectedContract?.dailyRate !== undefined
                  ? `Auto-filled from ${selectedContract.title}.`
                  : "Auto-fills from the selected contract when available."}
              </span>
            </Field>

            <Field label="Notes">
              <textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={4} />
            </Field>

            <Button type="submit" disabled={saving || (status === "WORKING" && !contractId)}>
              {saving
                ? "Saving..."
                : status === "WORKING" && !contractId
                  ? "Choose a contract"
                  : isBulkEditing
                    ? `Apply to ${selectedDates.length} days`
                    : "Save day"}
            </Button>
          </form>
        ) : (
          <div className="empty-state">No day selected.</div>
        )}
      </Panel>
    </div>
  );
}
