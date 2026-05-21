"use client";

import { useSortable } from "@dnd-kit/react/sortable";
import { GripVertical, X, TriangleAlert } from "lucide-react";
import type { FieldConfig } from "@repo/types";
import { cn } from "@/lib/utils";

interface FieldRowProps {
  name: string;
  config: FieldConfig;
  index: number;
  isSelected: boolean;
  hasWarning?: boolean;
  onSelect: () => void;
  onDeactivate: () => void;
}

export function FieldRow({ name, config, index, isSelected, hasWarning, onSelect, onDeactivate }: FieldRowProps) {
  const { ref, handleRef, isDragging } = useSortable({ id: name, index });

  return (
    <div
      ref={ref}
      className={cn(
        "flex items-center gap-1 rounded border text-sm",
        isSelected ? "border-primary bg-primary/5" : "border-border bg-background",
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
      <button
        type="button"
        onClick={onSelect}
        className="flex-1 text-left py-1.5 pr-1 truncate"
      >
        <span className="truncate">{name}</span>
        {config.required && <span className="text-destructive ml-1 font-medium">*</span>}
        {hasWarning && <TriangleAlert size={12} className="inline ml-1.5 text-amber-500 shrink-0" />}
      </button>
      <button
        type="button"
        onClick={onDeactivate}
        className="p-1.5 text-muted-foreground hover:text-destructive"
        aria-label="Remove field"
      >
        <X size={14} />
      </button>
    </div>
  );
}
