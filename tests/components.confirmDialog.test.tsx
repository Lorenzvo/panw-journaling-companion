import React from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ConfirmDialog } from "../src/components/ConfirmDialog";

describe("ConfirmDialog", () => {
  it("does not render when closed", () => {
    render(
      <ConfirmDialog
        open={false}
        title="Title"
        description="Desc"
        onCancel={() => {}}
        onConfirm={() => {}}
      />
    );

    expect(screen.queryByText("Title")).toBeNull();
  });

  it("calls onCancel when backdrop clicked", async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();

    render(
      <ConfirmDialog
        open
        title="Title"
        description="Desc"
        onCancel={onCancel}
        onConfirm={() => {}}
      />
    );

    await user.click(screen.getByTestId("modal-backdrop"));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("calls onConfirm when confirm clicked", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();

    render(
      <ConfirmDialog
        open
        title="Title"
        description="Desc"
        confirmText="Do it"
        onCancel={() => {}}
        onConfirm={onConfirm}
      />
    );

    await user.click(screen.getByRole("button", { name: "Do it" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});
