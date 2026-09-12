import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BlockEditor } from "@/components/block-editor";
import { Toaster } from "@/components/ui/sonner";
import "@/styles.css";

const root = document.getElementById("root");
if (!root) throw new Error("missing #root");

createRoot(root).render(
  <StrictMode>
    <BlockEditor />
    <Toaster />
  </StrictMode>,
);
