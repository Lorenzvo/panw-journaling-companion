import React from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { TutorialModal } from "../src/components/TutorialModal";

describe("TutorialModal", () => {
  it("disables Back on first step", () => {
    render(
      <TutorialModal
        open
        step={0}
        total={3}
        title="Step title"
        body="Body"
        onNext={() => {}}
        onPrev={() => {}}
        onClose={() => {}}
      />
    );

    expect(screen.getByRole("button", { name: /back/i })).toBeDisabled();
  });

  it("shows 'Got it' on last step and calls onNext", async () => {
    const user = userEvent.setup();
    const onNext = vi.fn();

    render(
      <TutorialModal
        open
        step={2}
        total={3}
        title="Last"
        body="Body"
        onNext={onNext}
        onPrev={() => {}}
        onClose={() => {}}
      />
    );

    const next = screen.getByRole("button", { name: /got it/i });
    await user.click(next);
    expect(onNext).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when backdrop clicked", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    render(
      <TutorialModal
        open
        step={1}
        total={3}
        title="Title"
        body="Body"
        onNext={() => {}}
        onPrev={() => {}}
        onClose={onClose}
      />
    );

    await user.click(screen.getByTestId("modal-backdrop"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
