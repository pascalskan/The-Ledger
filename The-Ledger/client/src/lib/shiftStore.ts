import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

let shiftTimerInterval: NodeJS.Timeout | null = null;

const SHIFT_STORAGE_KEY = "ledger-active-shift";

interface ActiveShift {
  activeShiftId: string;
  jobId: string;
  workerId: string;
  // This will be the timestamp of when the timer was last started/resumed.
  lastStartedAt: string;
  // This will hold the time accumulated before the last start.
  accumulatedTime: number; // in seconds
  isRunning: boolean;
}

interface ShiftStore {
  activeShift: ActiveShift | null;
  elapsedTime: number; // Live display time in seconds

  startShift: (jobId: string, workerId: string) => void;
  stopShiftTimer: () => void; // pause
  resumeShiftTimer: () => void;
  endShift: () => void;
  restoreShiftTimer: () => void;
  _tick: () => void;
}

export const useShiftStore = create<ShiftStore>()(
  persist(
    (set, get) => ({
      activeShift: null,
      elapsedTime: 0,

      _tick: () => {
        const shift = get().activeShift;
        if (shift && shift.isRunning) {
          const now = Date.now();
          const lastStart = new Date(shift.lastStartedAt).getTime();
          const sessionElapsed = Math.floor((now - lastStart) / 1000);
          set({ elapsedTime: shift.accumulatedTime + sessionElapsed });
        }
      },

      startShift: (jobId, workerId) => {
        if (get().activeShift) return;

        const nowISO = new Date().toISOString();
        const newShift: ActiveShift = {
          activeShiftId: `shift_${Date.now()}`,
          jobId,
          workerId,
          lastStartedAt: nowISO,
          accumulatedTime: 0,
          isRunning: true,
        };

        set({ activeShift: newShift, elapsedTime: 0 });

        if (shiftTimerInterval) clearInterval(shiftTimerInterval);
        shiftTimerInterval = setInterval(() => get()._tick(), 1000);
      },

      stopShiftTimer: () => { // pause
        if (shiftTimerInterval) clearInterval(shiftTimerInterval);
        shiftTimerInterval = null;

        const shift = get().activeShift;
        const currentElapsedTime = get().elapsedTime;
        if (shift && shift.isRunning) {
          set({
            activeShift: {
              ...shift,
              isRunning: false,
              accumulatedTime: currentElapsedTime,
            },
          });
        }
      },

      resumeShiftTimer: () => {
        const shift = get().activeShift;
        if (shift && !shift.isRunning) {
          set({
            activeShift: {
              ...shift,
              isRunning: true,
              lastStartedAt: new Date().toISOString(),
            },
          });

          if (shiftTimerInterval) clearInterval(shiftTimerInterval);
          shiftTimerInterval = setInterval(() => get()._tick(), 1000);
        }
      },

      endShift: () => {
        get().stopShiftTimer();
        const finalShiftState = get().activeShift;
        const finalElapsedTime = get().elapsedTime;

        if (finalShiftState) {
          // TODO: Add to offline queue
          console.log("Shift Ended:", {
            ...finalShiftState,
            totalDurationSeconds: finalElapsedTime,
          });
        }

        set({ activeShift: null, elapsedTime: 0 });
      },

      restoreShiftTimer: () => {
        const shift = get().activeShift;
        if (shift) {
            get()._tick(); // Recalculate time immediately
            if(shift.isRunning) {
                if (shiftTimerInterval) clearInterval(shiftTimerInterval);
                shiftTimerInterval = setInterval(() => get()._tick(), 1000);
            } else {
                // if it's not running, just show the accumulated time
                set({elapsedTime: shift.accumulatedTime});
            }
        }
      },
    }),
    {
      name: SHIFT_STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ activeShift: state.activeShift }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          // The timeout is to ensure the store is fully hydrated before we start timers.
          setTimeout(() => state.restoreShiftTimer(), 0);
        }
      },
    }
  )
);