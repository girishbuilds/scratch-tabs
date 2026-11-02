import {
  DEFAULT_DRAWER_WIDTH,
  MAX_DRAWER_WIDTH,
  MIN_DRAWER_WIDTH,
  clampDrawerWidth,
  widthFromPointer,
} from "../services/drawerWidth";

describe("clampDrawerWidth", () => {
  it("keeps a width inside the limits", () => {
    expect(clampDrawerWidth(500, 2000)).toBe(500);
  });

  it("enforces the minimum", () => {
    expect(clampDrawerWidth(100, 2000)).toBe(MIN_DRAWER_WIDTH);
  });

  it("enforces the absolute maximum on wide windows", () => {
    expect(clampDrawerWidth(5000, 4000)).toBe(MAX_DRAWER_WIDTH);
  });

  it("never takes more than 70% of a narrower window", () => {
    expect(clampDrawerWidth(900, 1000)).toBe(700);
  });

  it("falls back to the minimum when the window is tiny", () => {
    expect(clampDrawerWidth(900, 300)).toBe(MIN_DRAWER_WIDTH);
  });

  it("rounds to whole pixels", () => {
    expect(clampDrawerWidth(400.6, 2000)).toBe(401);
  });

  it("has a default inside the limits", () => {
    expect(clampDrawerWidth(DEFAULT_DRAWER_WIDTH, 1600)).toBe(DEFAULT_DRAWER_WIDTH);
  });
});

describe("widthFromPointer", () => {
  it("is the distance from the pointer to the right edge", () => {
    expect(widthFromPointer(1000, 1400)).toBe(400);
  });
});
