import React from "react";
import { render, screen } from "@testing-library/react";
import App from "./App";

beforeEach(() => {
  localStorage.clear();
});

test("ランディング画面が初期表示される", async () => {
  render(<App />);
  // Landing page shows "NEW RECORD" and "HISTORY"
  expect(await screen.findByText("NEW")).toBeInTheDocument();
  expect(await screen.findByText("HISTORY")).toBeInTheDocument();
});
