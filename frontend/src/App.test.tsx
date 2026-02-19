import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App";

// localStorageのモック
beforeEach(() => {
  localStorage.clear();
});

test("メニュー画面が初期表示される", () => {
  render(<App />);
  // RecordingSelectionPage の3つのボタンが表示される
  expect(screen.getByText("マイクで録音")).toBeInTheDocument();
  expect(screen.getByText("カラオケで録音")).toBeInTheDocument();
  expect(screen.getByText(/カラオケ音源/)).toBeInTheDocument();
});

test("「マイクで録音」クリックで録音画面に遷移する", async () => {
  render(<App />);
  await userEvent.click(screen.getByText("マイクで録音"));
  expect(screen.getByText(/マイクで録音/)).toBeInTheDocument();
});

test("「カラオケで録音」クリックで録音画面（Demucsモード）に遷移する", async () => {
  render(<App />);
  await userEvent.click(screen.getByText("カラオケで録音"));
  expect(screen.getByText(/カラオケで録音/)).toBeInTheDocument();
});

test("録音画面から「メニューに戻る」でメニューに戻れる", async () => {
  render(<App />);
  await userEvent.click(screen.getByText("マイクで録音"));
  await userEvent.click(screen.getByText("← メニューに戻る"));
  expect(screen.getByText("マイクで録音")).toBeInTheDocument();
});