import { useState, useEffect } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { GEMINI_MODELS } from "@shared/schema";

interface ModelSelectorProps {
  value: string;
  onChange: (model: string) => void;
  onConfigClick: () => void; // Added config click handler
  availableModels?: string[];
}

export default function ModelSelector({ value, onChange, onConfigClick, availableModels }: ModelSelectorProps) {
  const handleChange = (newModel: string) => {
    onChange(newModel);
  };

  // Use available models if provided, otherwise fall back to schema models
  const models = availableModels && availableModels.length > 0 
    ? availableModels 
    : GEMINI_MODELS;

  return (
    <div className="flex items-center space-x-2">
      <span className="text-sm text-muted-foreground">Model:</span>
      <Select value={value} onValueChange={handleChange}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Select model" />
        </SelectTrigger>
        <SelectContent>
          {models.map((model) => (
            <SelectItem key={model} value={model}>
              {model}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <button onClick={onConfigClick} className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
        Advanced Config
      </button>
    </div>
  );
}