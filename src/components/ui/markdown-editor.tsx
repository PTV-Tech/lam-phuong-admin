"use client";

import { useMemo } from "react";
import dynamic from "next/dynamic";
import type { Options } from "easymde";

// Dynamically import SimpleMDE to avoid SSR issues
const SimpleMDE = dynamic(() => import("react-simplemde-editor"), {
  ssr: false,
});

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function MarkdownEditor({
  value,
  onChange,
  placeholder,
  disabled,
  className,
}: MarkdownEditorProps) {
  const options = useMemo(() => {
    return {
      placeholder: placeholder || "Nhập nội dung...",
      spellChecker: false,
      status: false,
      autofocus: false,
      toolbar: [
        "bold",
        "italic",
        "heading",
        "|",
        "quote",
        "unordered-list",
        "ordered-list",
        "|",
        "preview",
        "guide",
      ],
    } as Options;
  }, [placeholder]);

  return (
    <div className={className}>
      <SimpleMDE
        value={value}
        onChange={onChange}
        options={options}
        className={disabled ? "opacity-50 pointer-events-none" : ""}
      />
    </div>
  );
}

