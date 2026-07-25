"use client";

import { useSortable } from "@dnd-kit/react/sortable";
import { GripVertical, Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

export function SpreadsheetFieldRow({
  name,
  index,
  visible,
  onToggleVisible,
}: {
  name: string;
  index: number;
  visible: boolean;
  onToggleVisible: () => void;
}) {
  const { ref, handleRef, isDragging } = useSortable({ id: name, index });

  return (
    <div
      ref={ref}
      className={cn(
        "flex items-center gap-1 rounded border border-border bg-background text-sm",
        isDragging && "opacity-50 shadow-lg z-10"
      )}
    >
      <button
        type="button"
        ref={handleRef}
        className="p-1.5 cursor-grab text-muted-foreground hover:text-foreground focus:outline-none"
        tabIndex={-1}
        aria-label="Drag to reorder"
      >
        <GripVertical size={14} />
      </button>
      <span className={cn("flex-1 py-1.5 pr-1 truncate", !visible && "line-through text-muted-foreground")}>
        {name}
      </span>
      <button
        type="button"
        onClick={onToggleVisible}
        className="p-1.5 text-muted-foreground hover:text-foreground"
        aria-label={visible ? "Hide column" : "Show column"}
      >
        {visible ? <Eye size={14} /> : <EyeOff size={14} />}
      </button>
    </div>
  );
}
