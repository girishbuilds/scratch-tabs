import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { TempEmailTablet } from "../TempEmailTablet";

/**
 * Bug-confirmation test: the body of an inbound email is attacker controlled
 * (anyone on the internet can mail the disposable address). It must never reach
 * the DOM with executable markup. EXPECTED TO FAIL against the current code.
 */

const HOSTILE_BODY =
  '<p>Your code is 123456</p><img src="x" onerror="window.__pwned=1">' +
  '<svg onload="window.__pwned=1"></svg>' +
  '<a href="javascript:window.__pwned=1">click</a>' +
  "<script>window.__pwned=1</script>";

describe("TempEmailTablet - email body rendering", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it("does not render event handlers, scripts or javascript: URLs from an email body", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      json: async () => ({
        mail_id: "1",
        subject: "Verify your account",
        mail_from: "attacker@evil.example",
        mail_timestamp: "1762178709",
        mail_body: HOSTILE_BODY,
      }),
    }) as unknown as typeof fetch;

    const state = {
      type: "tempemail",
      data: {
        emailAddress: "abc@guerrillamailblock.com",
        emailToken: "tok",
        emails: [
          {
            id: "1",
            subject: "Verify your account",
            from: "attacker@evil.example",
            timestamp: 1762178709,
          },
        ],
        lastChecked: 0,
      },
    };

    const { container } = render(
      <>{TempEmailTablet.render(state as any, jest.fn())}</>,
    );

    fireEvent.click(screen.getByText("Verify your account"));

    await waitFor(() =>
      expect(screen.getByText("Your code is 123456")).toBeInTheDocument(),
    );

    const html = container.innerHTML;
    expect(html).not.toMatch(/onerror\s*=/i);
    expect(html).not.toMatch(/onload\s*=/i);
    expect(html).not.toMatch(/javascript:/i);
    expect(container.querySelector("script")).toBeNull();
  });
});
