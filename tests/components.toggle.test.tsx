import React from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { Toggle } from "../src/components/Toggle";

describe("Toggle", () => {
  it("reflects checked state via aria-checked", () => {
    render(<Toggle checked label="Privacy Mode" onChange={() => {}} />);

    const el = screen.getByRole("switch", { name: /privacy mode/i });
    expect(el).toHaveAttribute("aria-checked", "true");
  });

  it("calls onChange with toggled value on click", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(<Toggle checked={false} label="Privacy Mode" onChange={onChange} />);

    await user.click(screen.getByRole("switch", { name: /privacy mode/i }));
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(true);
  });
});
