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
    // Save the selected model in localStorage for persistence
    localStorage.setItem('selectedGeminiModel', newModel);
    console.log("Selected model changed to:", newModel);
  };

  // Get models with preference for available models
  const models = availableModels && availableModels.length > 0 
    ? availableModels 
    : GEMINI_MODELS;
    
  // Helper to get model description
  const getModelDescription = (model: string) => {
    if (model.includes('flash')) return 'Fast responses, optimized for speed';
    if (model.includes('pro-vision')) return 'Handles images and text';
    if (model.includes('pro')) return 'Advanced capabilities, longer responses';
    return 'Google Gemini model';
  };
  
  // Sort models to put the latest and most relevant first
  const sortedModels = [...models].sort((a, b) => {
    // Put models with 'latest' at the top
    if (a.includes('latest') && !b.includes('latest')) return -1;
    if (!a.includes('latest') && b.includes('latest')) return 1;
    
    // Then sort by version (1.5 before 1.0)
    const versionA = a.match(/\d+\.\d+/)?.[0] || '0.0';
    const versionB = b.match(/\d+\.\d+/)?.[0] || '0.0';
    if (versionA !== versionB) {
      return parseFloat(versionB) - parseFloat(versionA);
    }
    
    // Then prioritize pro over flash
    if (a.includes('pro') && !b.includes('pro')) return -1;
    if (!a.includes('pro') && b.includes('pro')) return 1;
    
    return a.localeCompare(b);
  });

  return (
    <div className="flex items-center space-x-2">
      <span className="text-sm text-muted-foreground">Model:</span>
      <Select value={value} onValueChange={handleChange}>
        <SelectTrigger className="w-[220px]">
          <SelectValue placeholder="Select model" />
        </SelectTrigger>
        <SelectContent>
          {sortedModels.map((model) => (
            <SelectItem key={model} value={model} className="py-2">
              <div>
                <div className="font-medium">{model}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">{getModelDescription(model)}</div>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <button 
        onClick={onConfigClick} 
        className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
      >
        <span>Config</span>
      </button>
    </div>
  );
}