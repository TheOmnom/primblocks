import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

type Item = {
  id: string;
  label: string;
  shortcut?: string;
  onSelect: () => void;
};

export function FileMenu({
  onNew,
  onOpen,
  onSave,
  onSaveAs,
  onImport,
}: {
  onNew: () => void;
  onOpen: () => void;
  onSave: () => void;
  onSaveAs: () => void;
  onImport: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  function toggle() {
    const next = !open;
    if (next && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setPos({ top: r.bottom + 6, left: r.left });
    }
    setOpen(next);
  }

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      const t = e.target as Node;
      if (btnRef.current?.contains(t) || menuRef.current?.contains(t)) return;
      setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    function onReposition() {
      if (!btnRef.current) return;
      const r = btnRef.current.getBoundingClientRect();
      setPos({ top: r.bottom + 6, left: r.left });
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", onReposition);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onReposition);
    };
  }, [open]);

  const items: (Item | "sep")[] = [
    { id: "new", label: "New", shortcut: "Ctrl+N", onSelect: onNew },
    { id: "open", label: "Open…", shortcut: "Ctrl+O", onSelect: onOpen },
    { id: "save", label: "Save", shortcut: "Ctrl+S", onSelect: onSave },
    { id: "saveas", label: "Save As…", shortcut: "Ctrl+Shift+S", onSelect: onSaveAs },
    "sep",
    { id: "import", label: "Import LSL…", shortcut: "Ctrl+Shift+O", onSelect: onImport },
  ];

  function pick(item: Item) {
    setOpen(false);
    item.onSelect();
  }

  return (
    <div className="relative">
      <button
        ref={btnRef}
        type="button"
        aria-label="File"
        aria-haspopup="menu"
        aria-expanded={open}
        title="File"
        onClick={toggle}
        className={cn(
          "grid size-8 place-items-center rounded-md bg-surface-2 ring-1 ring-border transition-colors hover:bg-surface hover:ring-brick/70",
          open && "bg-surface ring-brick",
        )}
      >
        <span className="block h-3.5 w-4 rounded-sm bg-brick" />
      </button>
      {open
        ? createPortal(
            <div
              ref={menuRef}
              role="menu"
              aria-label="File"
              style={{ top: pos.top, left: pos.left }}
              className="fixed z-[80] min-w-52 overflow-hidden rounded-lg border border-border bg-surface py-1 shadow-xl"
            >
              {items.map((item, i) =>
                item === "sep" ? (
                  <div key={`sep-${i}`} className="my-1 h-px bg-border" />
                ) : (
                  <button
                    key={item.id}
                    type="button"
                    role="menuitem"
                    onClick={() => pick(item)}
                    className="flex w-full items-center justify-between gap-6 px-3 py-1.5 text-left text-sm text-fg hover:bg-surface-2"
                  >
                    <span>{item.label}</span>
                    {item.shortcut ? (
                      <span className="font-mono text-[10px] tracking-wide text-muted">{item.shortcut}</span>
                    ) : null}
                  </button>
                ),
              )}
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
