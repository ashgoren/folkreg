import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { toast } from "sonner";
import { useAutosave } from "./useAutosave";

// A promise whose settlement the test controls, so "a save is still in flight" is an explicit,
// deterministic state rather than a race against real network latency.
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

// Advancing fake timers inside an async act() also flushes the microtasks and React updates
// that the elapsed timers kick off (e.g. the "Saved ✓" indicator's 2s timer turning it off).
const advance = (ms: number) => act(async () => {
  await vi.advanceTimersByTimeAsync(ms);
});

describe("useAutosave", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.mocked(toast.error).mockClear();
  });
  afterEach(() => vi.useRealTimers());

  it("saves immediately", async () => {
    const saveFn = vi.fn().mockResolvedValue(null);
    const { result } = renderHook(() => useAutosave<string>(saveFn));

    await act(async () => result.current.save("now"));
    expect(saveFn).toHaveBeenCalledExactlyOnceWith("now");
  });

  describe("serialization", () => {
    it("never overlaps saves: calls made while one is in flight collapse into a single follow-up with the latest data", async () => {
      const first = deferred<string | null>();
      let inFlight = 0;
      let maxInFlight = 0;
      const saveFn = vi.fn(async (data: string) => {
        inFlight++;
        maxInFlight = Math.max(maxInFlight, inFlight);
        const result = data === "first" ? await first.promise : null;
        inFlight--;
        return result;
      });
      const { result } = renderHook(() => useAutosave<string>(saveFn));

      await act(async () => result.current.save("first"));
      await act(async () => {
        result.current.save("second");
        result.current.save("third");
      });
      // Still blocked on the first save -- the later two are queued, not fired.
      expect(saveFn).toHaveBeenCalledTimes(1);

      await act(async () => first.resolve(null));

      expect(saveFn).toHaveBeenCalledTimes(2);
      expect(saveFn).toHaveBeenLastCalledWith("third");
      expect(maxInFlight).toBe(1);
    });

    it("reports isPending while a save is in flight", async () => {
      const save = deferred<string | null>();
      const { result } = renderHook(() => useAutosave<string>(() => save.promise));

      expect(result.current.isPending).toBe(false);
      await act(async () => result.current.save("x"));
      expect(result.current.isPending).toBe(true);

      await act(async () => save.resolve(null));
      expect(result.current.isPending).toBe(false);
    });
  });

  describe("results", () => {
    it("toasts an error string returned by saveFn, and doesn't report it as saved", async () => {
      const saveFn = vi.fn().mockResolvedValue("That slug is already taken");
      const { result } = renderHook(() => useAutosave<string>(saveFn));

      await act(async () => result.current.save("x"));

      expect(toast.error).toHaveBeenCalledExactlyOnceWith("That slug is already taken");
      expect(result.current.savedRecently).toBe(false);
    });

    it("flips savedRecently on after a successful save, and off again 2s later", async () => {
      const saveFn = vi.fn().mockResolvedValue(null);
      const { result } = renderHook(() => useAutosave<string>(saveFn));

      await act(async () => result.current.save("x"));
      expect(result.current.savedRecently).toBe(true);
      expect(toast.error).not.toHaveBeenCalled();

      await advance(1999);
      expect(result.current.savedRecently).toBe(true);
      await advance(1);
      expect(result.current.savedRecently).toBe(false);
    });

    // Each save restarts the 2s countdown rather than leaving an earlier save's timer running,
    // which would hide "Saved ✓" 1s after a save made at t=1000.
    it("keeps savedRecently on for 2s after the latest save, not the first", async () => {
      const saveFn = vi.fn().mockResolvedValue(null);
      const { result } = renderHook(() => useAutosave<string>(saveFn));

      await act(async () => result.current.save("a"));
      await advance(1000);
      await act(async () => result.current.save("b"));
      await advance(1500); // t=2500: 1.5s after the latest save

      expect(result.current.savedRecently).toBe(true);
    });
  });

  // A rejecting saveFn (e.g. a server action re-throwing an unexpected DB error) gets a generic
  // toast, and must still release the in-flight guard -- otherwise every later save would be
  // queued behind a request that's never coming back.
  it("toasts and keeps saving after a save throws", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const saveFn = vi.fn()
      .mockRejectedValueOnce(new Error("connection reset"))
      .mockResolvedValue(null);
    const { result } = renderHook(() => useAutosave<string>(saveFn));

    await act(async () => result.current.save("first"));
    expect(toast.error).toHaveBeenCalledWith("Couldn't save changes. Please try again.");

    await act(async () => result.current.save("second"));
    expect(saveFn).toHaveBeenCalledTimes(2);
    expect(result.current.savedRecently).toBe(true);
  });

  describe("stability", () => {
    // Forms list save in their watch effect's dependencies, so a new function on every render
    // would tear down and recreate the form's watch subscription each time.
    it("returns the same save on every render", () => {
      const { result, rerender } = renderHook(() => useAutosave<string>(vi.fn().mockResolvedValue(null)));
      const { save } = result.current;

      rerender();
      expect(result.current.save).toBe(save);
    });

    // The flip side of a stable function: it must still call the saveFn from the latest render,
    // including for a save queued before the re-render.
    it("calls the latest saveFn, even for a save queued before a re-render", async () => {
      const inFlight = deferred<string | null>();
      const first = vi.fn().mockReturnValue(inFlight.promise);
      const second = vi.fn().mockResolvedValue(null);
      const { result, rerender } = renderHook(({ saveFn }) => useAutosave<string>(saveFn), {
        initialProps: { saveFn: first },
      });

      await act(async () => result.current.save("a"));
      await act(async () => result.current.save("b")); // queued behind "a"
      rerender({ saveFn: second });
      await act(async () => inFlight.resolve(null));

      expect(first).toHaveBeenCalledExactlyOnceWith("a");
      expect(second).toHaveBeenCalledExactlyOnceWith("b");
    });
  });
});
