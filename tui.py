#!/usr/bin/env python3
import argparse
import curses
import time
import threading
from typing import List, Optional, Dict, Any
import requests

DEFAULT_BASE_URL = "http://localhost:1234"

# Presets in Percent
QUIET_PRESET = 20
NORMAL_PRESET = 35
TURBO_PRESET = 80


class FanTUI:
    def __init__(self, stdscr, base_url: str):
        self.stdscr = stdscr
        self.base_url = base_url.rstrip("/")
        self.fans: List[int] = []
        self.baseline_fans: List[int] = []
        self.edit_all = False
        self.selected_index = 0
        self.status = "Loading fan data from API..."
        self.num_fans = 0

        # Mode state
        self.mode: str = "auto"  # "auto" or "manual"
        self.mode_decision: Optional[Dict[str, Any]] = None
        self.mode_error: Optional[str] = None

        # Temperature state
        self.temps: Optional[Dict[str, Any]] = None

        # Indication for the "Controls"
        self.IDX_MODE_TOGGLE = 0
        self.IDX_EDIT_ALL = 1
        self.IDX_QUIET = 2
        self.IDX_NORMAL = 3
        self.IDX_TURBO = 4
        self.FAN_START_IDX = 5  # From here the fan blocks

        curses.curs_set(0)
        self.stdscr.nodelay(False)
        self.stdscr.keypad(True)
        self.stdscr.timeout(1000)  # 1-second timeout for auto-refresh

        self.load_fans_from_api()
        self.poll_mode_and_temps()

        # Start background polling thread
        self._poll_stop = threading.Event()
        self._poll_thread = threading.Thread(target=self._poll_loop, daemon=True)
        self._poll_thread.start()

    def _poll_loop(self):
        while not self._poll_stop.is_set():
            time.sleep(15)
            if self._poll_stop.is_set():
                break
            self.poll_mode_and_temps()

    # -------- REST-API --------
    def api_get_fans(self) -> List[int]:
        url = f"{self.base_url}/api/fans"
        resp = requests.get(url, timeout=3)
        resp.raise_for_status()
        data = resp.json()
        raw = data.get("fans")
        if not isinstance(raw, list) or not raw:
            raise ValueError("API /api/fans did not return a non-empty 'fans' list")
        fans: List[int] = []
        for v in raw:
            try:
                iv = int(v)
            except (TypeError, ValueError):
                iv = 0
            iv = max(0, min(100, iv))
            fans.append(iv)
        return fans

    def api_set_fans(self, fans: List[int]) -> None:
        url = f"{self.base_url}/api/fans"
        payload = {"fans": [int(max(0, min(100, v))) for v in fans]}
        resp = requests.post(url, json=payload, timeout=10)
        resp.raise_for_status()

    def api_unlock(self) -> None:
        url = f"{self.base_url}/api/fans/unlock"
        resp = requests.post(url, timeout=5)
        resp.raise_for_status()

    def api_get_mode(self) -> Dict[str, Any]:
        url = f"{self.base_url}/api/mode"
        resp = requests.get(url, timeout=3)
        resp.raise_for_status()
        return resp.json()

    def api_set_mode(self, mode: str) -> Dict[str, Any]:
        url = f"{self.base_url}/api/mode"
        resp = requests.post(url, json={"mode": mode}, timeout=5)
        resp.raise_for_status()
        return resp.json()

    def api_get_temps(self) -> Dict[str, Any]:
        url = f"{self.base_url}/api/temps"
        resp = requests.get(url, timeout=3)
        resp.raise_for_status()
        return resp.json()

    # -------- State-Handling --------
    def load_fans_from_api(self) -> None:
        try:
            fans = self.api_get_fans()
            self.fans = fans[:]
            self.baseline_fans = fans[:]
            self.status = f"Loaded {len(fans)} fan blocks from API."
        except Exception as e:
            # Fallback, if API is not available
            self.num_fans = 8
            self.fans = [35] * self.num_fans
            self.baseline_fans = self.fans[:]
            self.status = f"API error: {e!s}. Using local defaults (8x35%)."
            return

        self.num_fans = len(self.fans)

    def poll_mode_and_temps(self) -> None:
        try:
            mode_data = self.api_get_mode()
            self.mode = mode_data.get("mode", "manual")
            self.mode_decision = mode_data.get("lastDecision")
            self.mode_error = mode_data.get("error")
        except Exception:
            pass  # Keep previous state

        try:
            self.temps = self.api_get_temps()
        except Exception:
            pass  # Keep previous state

    @property
    def idx_update(self) -> int:
        return self.FAN_START_IDX + self.num_fans

    @property
    def idx_reset(self) -> int:
        return self.FAN_START_IDX + self.num_fans + 1

    @property
    def idx_unlock(self) -> int:
        return self.FAN_START_IDX + self.num_fans + 2

    @property
    def max_index(self) -> int:
        return self.idx_unlock

    @property
    def is_auto(self) -> bool:
        return self.mode == "auto"

    # -------- Drawing --------
    def draw(self) -> None:
        self.stdscr.erase()
        h, w = self.stdscr.getmaxyx()

        if h < 20 or w < 60:
            msg = "Terminal too small. Resize to at least 60x20."
            self.stdscr.addstr(0, 0, msg[: w - 1])
            self.stdscr.refresh()
            return

        # Title
        title = "iLO Fan Controller"
        subtitle = f"{self.base_url}"
        title_x = max(0, (w - len(title)) // 2)
        self.stdscr.addstr(1, title_x, title, curses.A_BOLD)
        self.stdscr.addstr(2, title_x, subtitle[: w - title_x - 1], curses.A_DIM)

        y = 4
        x = 2

        # Temperature Display
        if self.temps:
            cpu1 = self.temps.get("cpu1")
            cpu2 = self.temps.get("cpu2")
            hd_max = self.temps.get("hdMax")
            inlet = self.temps.get("inletAmbient")

            temp_line = "  "
            temp_line += f"CPU1: {cpu1}°C" if cpu1 is not None else "CPU1: N/A"
            temp_line += "  "
            temp_line += f"CPU2: {cpu2}°C" if cpu2 is not None else "CPU2: N/A"
            temp_line += "  "
            temp_line += f"HD: {hd_max}°C" if hd_max is not None else "HD: N/A"
            temp_line += "  "
            temp_line += f"Inlet: {inlet}°C" if inlet is not None else "Inlet: N/A"

            self.stdscr.addstr(y, x, temp_line[: w - x - 1], curses.A_BOLD)
            y += 1

        # Auto Mode Status Line
        if self.is_auto and self.mode_decision:
            d = self.mode_decision
            cpu_t = d.get("cpuTemp", "?")
            cpu_s = d.get("cpuSpeed", "?")
            hd_t = d.get("hdTemp", "?")
            hd_s = d.get("hdSpeed", "?")
            final = d.get("finalTarget", "?")
            auto_line = f"  AUTO: CPU {cpu_t}°C -> {cpu_s}% | HD {hd_t}°C -> {hd_s}% | Fan: {final}%"
            self.stdscr.addstr(y, x, auto_line[: w - x - 1], curses.A_DIM)
            y += 1

        y += 1

        # Mode Toggle
        mode_attr = (
            curses.A_REVERSE if self.selected_index == self.IDX_MODE_TOGGLE else curses.A_NORMAL
        )
        mode_label = f"Mode: [ {'AUTO' if self.is_auto else 'MANUAL'} ]"
        self.stdscr.addstr(y, x, mode_label, mode_attr)

        # Edit All Checkbox
        edit_attr = (
            curses.A_REVERSE if self.selected_index == self.IDX_EDIT_ALL else curses.A_NORMAL
        )
        if self.is_auto:
            edit_attr = curses.A_DIM
        checkbox = "[X]" if self.edit_all else "[ ]"
        ea_x = x + len(mode_label) + 3
        self.stdscr.addstr(y, ea_x, "Edit All ", curses.A_DIM if self.is_auto else curses.A_NORMAL)
        self.stdscr.addstr(y, ea_x + 9, checkbox, edit_attr)

        # Preset-Buttons
        presets = [
            ("Quiet", self.IDX_QUIET),
            ("Normal", self.IDX_NORMAL),
            ("Turbo", self.IDX_TURBO),
        ]
        px = ea_x + 16
        for label, idx in presets:
            btn = f"[ {label} ]"
            if self.is_auto:
                attr = curses.A_DIM
            elif self.selected_index == idx:
                attr = curses.A_REVERSE
            else:
                attr = curses.A_NORMAL
            self.stdscr.addstr(y, px, btn, attr)
            px += len(btn) + 1

        # Fan Blocks
        y += 2
        slider_width = max(10, w - 30)

        for i in range(self.num_fans):
            idx = self.FAN_START_IDX + i
            label = f"Fan Block {i+1}"
            if self.is_auto:
                attr = curses.A_DIM
            elif self.selected_index == idx:
                attr = curses.A_REVERSE
            else:
                attr = curses.A_NORMAL
            self.stdscr.addstr(y, x, label.ljust(12), attr)

            val = self.fans[i] if i < len(self.fans) else 0
            filled = int((val / 100) * slider_width + 0.5)
            bar_filled = "=" * filled
            bar_empty = "-" * (slider_width - filled)
            bar = f"[{bar_filled}{bar_empty}]"
            self.stdscr.addstr(y, x + 14, bar[: slider_width + 2], attr)

            val_str = f"{val:3d}%"
            self.stdscr.addstr(y, x + 16 + slider_width, val_str, attr)

            y += 1

        # Lower Buttons
        y += 1
        buttons = [
            ("Update", self.idx_update),
            ("Reset", self.idx_reset),
            ("Unlock", self.idx_unlock),
        ]
        total_btn_len = sum(len(f"[ {label} ]") + 2 for label, _ in buttons)
        start_x = max(0, (w - total_btn_len) // 2)

        bx = start_x
        for label, idx in buttons:
            btn = f"[ {label} ]"
            if self.is_auto:
                attr = curses.A_DIM
            elif self.selected_index == idx:
                attr = curses.A_REVERSE
            else:
                attr = curses.A_NORMAL
            self.stdscr.addstr(y, bx, btn, attr)
            bx += len(btn) + 2

        # Status + Help
        help_text = (
            "↑/↓: Select  ←/→: Adjust  Enter/Space: Activate  M: Mode  "
            "U: Update  R: Reset  L: Unlock  Q: Quit"
        )
        self.stdscr.addstr(h - 2, 0, help_text[: w - 1], curses.A_DIM)

        status = self.status
        if len(status) >= w:
            status = status[: w - 1]
        self.stdscr.addstr(h - 1, 0, status.ljust(w - 1), curses.A_BOLD)

        self.stdscr.refresh()

    # -------- Actions --------
    def clamp_selected(self) -> None:
        if self.selected_index < 0:
            self.selected_index = 0
        if self.selected_index > self.max_index:
            self.selected_index = self.max_index

    def change_slider(self, delta: int) -> None:
        if self.is_auto:
            return
        if (
            self.selected_index < self.FAN_START_IDX
            or self.selected_index >= self.FAN_START_IDX + self.num_fans
        ):
            return
        idx = self.selected_index - self.FAN_START_IDX
        if idx >= len(self.fans):
            return
        new_val = max(0, min(100, self.fans[idx] + delta))
        if self.edit_all:
            self.fans = [new_val] * self.num_fans
        else:
            self.fans[idx] = new_val

    def apply_preset(self, value: int) -> None:
        if self.is_auto:
            self.status = "Switch to Manual mode first."
            return
        value = max(0, min(100, value))
        self.fans = [value] * self.num_fans
        self.status = f"Preset applied: {value}% on all fan blocks."

    def toggle_mode(self) -> None:
        new_mode = "manual" if self.is_auto else "auto"
        try:
            result = self.api_set_mode(new_mode)
            self.mode = result.get("mode", new_mode)
            self.status = f"Switched to {self.mode.upper()} mode."
            # Refresh data after mode switch
            self.poll_mode_and_temps()
        except Exception as e:
            self.status = f"Mode switch failed: {e!s}"

    def do_update(self) -> None:
        if self.is_auto:
            self.status = "Switch to Manual mode first."
            return
        try:
            self.api_set_fans(self.fans)
            self.baseline_fans = self.fans[:]
            self.status = "Fan speeds updated successfully."
        except Exception as e:
            self.status = f"Update failed: {e!s}"

    def do_reset(self) -> None:
        if self.is_auto:
            self.status = "Switch to Manual mode first."
            return
        self.fans = self.baseline_fans[:]
        self.status = "Values reset to last known baseline."

    def do_unlock(self) -> None:
        if self.is_auto:
            self.status = "Switch to Manual mode first."
            return
        try:
            self.api_unlock()
            self.status = "Global fan control unlocked."
        except Exception as e:
            self.status = f"Unlock failed: {e!s}"

    # -------- Main Loop --------
    def run(self) -> None:
        try:
            while True:
                self.draw()
                ch = self.stdscr.getch()

                if ch == -1:
                    # Timeout — just redraw (auto-refresh)
                    continue

                if ch in (ord("q"), ord("Q")):
                    break

                if ch in (ord("m"), ord("M")):
                    self.toggle_mode()
                elif ch in (curses.KEY_UP, ord("k")):
                    self.selected_index -= 1
                    self.clamp_selected()
                elif ch in (curses.KEY_DOWN, ord("j")):
                    self.selected_index += 1
                    self.clamp_selected()
                elif ch in (curses.KEY_LEFT, ord("h")):
                    self.change_slider(-5)
                elif ch in (curses.KEY_RIGHT, ord("l")):
                    self.change_slider(5)
                elif ch in (ord("u"), ord("U")):
                    self.do_update()
                elif ch in (ord("r"), ord("R")):
                    self.do_reset()
                elif ch in (ord("l"), ord("L")):
                    # small letter l is already "right", Unlock only with capital letter L
                    if ch == ord("L"):
                        self.do_unlock()
                elif ch in (curses.KEY_ENTER, 10, 13, ord(" ")):
                    self.activate_current()
        finally:
            self._poll_stop.set()

    def activate_current(self) -> None:
        idx = self.selected_index
        if idx == self.IDX_MODE_TOGGLE:
            self.toggle_mode()
        elif idx == self.IDX_EDIT_ALL:
            if not self.is_auto:
                self.edit_all = not self.edit_all
                self.status = f"Edit All is now {'ON' if self.edit_all else 'OFF'}."
        elif idx == self.IDX_QUIET:
            self.apply_preset(QUIET_PRESET)
        elif idx == self.IDX_NORMAL:
            self.apply_preset(NORMAL_PRESET)
        elif idx == self.IDX_TURBO:
            self.apply_preset(TURBO_PRESET)
        elif self.FAN_START_IDX <= idx < self.FAN_START_IDX + self.num_fans:
            # Slider: nothing fancy – gonna be changed with the slider ←/→
            pass
        elif idx == self.idx_update:
            self.do_update()
        elif idx == self.idx_reset:
            self.do_reset()
        elif idx == self.idx_unlock:
            self.do_unlock()


def main():
    parser = argparse.ArgumentParser(description="TUI for iLO Fan Controller REST API.")
    parser.add_argument(
        "--host",
        "--base-url",
        dest="base_url",
        default=DEFAULT_BASE_URL,
        help="Base URL of the controller (default: http://localhost:1234)",
    )
    args = parser.parse_args()

    def run_app(stdscr):
        app = FanTUI(stdscr, args.base_url)
        app.run()

    curses.wrapper(run_app)


if __name__ == "__main__":
    main()
