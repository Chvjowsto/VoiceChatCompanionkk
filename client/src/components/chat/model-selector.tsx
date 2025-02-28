
import { useState, useEffect } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { GEMINI_MODELS, type GeminiModel } from "@shared/schema";

interface ModelSelectorProps {
  value: GeminiModel;
  onChange: (model: GeminiModel) => void;
}

export default function ModelSelector({ value, onChange }: ModelSelectorProps) {
  const handleChange = (newModel: string) => {
    onChange(newModel as GeminiModel);
  };

  return (
    <div className="flex items-center space-x-2">
      <span className="text-sm text-muted-foreground">Model:</span>
      <Select value={value} onValueChange={handleChange}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Select model" />
        </SelectTrigger>
        <SelectContent>
          {GEMINI_MODELS.map((model) => (
            <SelectItem key={model} value={model}>
              {model}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
