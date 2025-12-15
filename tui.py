#!/usr/bin/env python3
import argparse
import curses
from typing import List
import requests

DEFAULT_BASE_URL = "http://localhost:1234"

# Presets in Percent
QUIET_PRESET = 30 # Slightly increased, as 1U servers (HD controllers) often experience overheating when set to 20%. 
NORMAL_PRESET = 40
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

        # Indication for the "Controls"
        self.IDX_EDIT_ALL = 0
        self.IDX_QUIET = 1
        self.IDX_NORMAL = 2
        self.IDX_TURBO = 3
        self.FAN_START_IDX = 4  # From here the fan blocks

        curses.curs_set(0)
        self.stdscr.nodelay(False)
        self.stdscr.keypad(True)

        self.load_fans_from_api()

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
        resp = requests.post(url, json=payload, timeout=3)
        resp.raise_for_status()

    def api_unlock(self) -> None:
        url = f"{self.base_url}/api/fans/unlock"
        resp = requests.post(url, timeout=3)
        resp.raise_for_status()

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

        # Edit All + Presets
        y = 4
        x = 2

        # Edit All Checkbox
        edit_attr = (
            curses.A_REVERSE if self.selected_index == self.IDX_EDIT_ALL else curses.A_NORMAL
        )
        checkbox = "[X]" if self.edit_all else "[ ]"
        self.stdscr.addstr(y, x, "Edit All ", curses.A_NORMAL)
        self.stdscr.addstr(y, x + 9, checkbox, edit_attr)

        # Preset-Buttons
        presets = [
            ("Quiet", self.IDX_QUIET),
            ("Normal", self.IDX_NORMAL),
            ("Turbo", self.IDX_TURBO),
        ]
        px = x + 18
        for label, idx in presets:
            btn = f"[ {label} ]"
            attr = curses.A_REVERSE if self.selected_index == idx else curses.A_NORMAL
            self.stdscr.addstr(y, px, btn, attr)
            px += len(btn) + 1

        # Fan Blocks
        y += 2
        slider_width = max(10, w - 30)

        for i in range(self.num_fans):
            idx = self.FAN_START_IDX + i
            label = f"Fan Block {i+1}"
            attr = curses.A_REVERSE if self.selected_index == idx else curses.A_NORMAL
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
            attr = curses.A_REVERSE if self.selected_index == idx else curses.A_NORMAL
            self.stdscr.addstr(y, bx, btn, attr)
            bx += len(btn) + 2

        # Status + Help
        help_text = (
            "↑/↓: Select  ←/→: Adjust  Enter/Space: Activate  U: Update  "
            "R: Reset  L: Unlock  Q: Quit"
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
        value = max(0, min(100, value))
        self.fans = [value] * self.num_fans
        self.status = f"Preset applied: {value}% on all fan blocks."

    def do_update(self) -> None:
        try:
            self.api_set_fans(self.fans)
            self.baseline_fans = self.fans[:]
            self.status = "Fan speeds updated successfully."
        except Exception as e:
            self.status = f"Update failed: {e!s}"

    def do_reset(self) -> None:
        self.fans = self.baseline_fans[:]
        self.status = "Values reset to last known baseline."

    def do_unlock(self) -> None:
        try:
            self.api_unlock()
            self.status = "Global fan control unlocked."
        except Exception as e:
            self.status = f"Unlock failed: {e!s}"

    # -------- Main Loop --------
    def run(self) -> None:
        while True:
            self.draw()
            ch = self.stdscr.getch()

            if ch in (ord("q"), ord("Q")):
                break

            if ch in (curses.KEY_UP, ord("k")):
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

    def activate_current(self) -> None:
        idx = self.selected_index
        if idx == self.IDX_EDIT_ALL:
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
