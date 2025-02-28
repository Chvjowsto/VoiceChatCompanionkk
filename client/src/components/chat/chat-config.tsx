
import React, { useState, useEffect } from 'react';

interface ChatConfigProps {
  onConfigChange: (config: ChatConfig) => void;
  isOpen: boolean;
  onClose: () => void;
}

export interface ChatConfig {
  systemPrompt: string;
  temperature: number;
  topK: number;
  topP: number;
  maxOutputTokens: number;
}

const defaultConfig: ChatConfig = {
  systemPrompt: "You are a helpful AI assistant. Answer questions accurately and be friendly.",
  temperature: 0.7,
  topK: 40,
  topP: 0.95,
  maxOutputTokens: 1024
};

export function ChatConfig({ onConfigChange, isOpen, onClose }: ChatConfigProps) {
  const [config, setConfig] = useState<ChatConfig>(() => {
    // Try to load from localStorage
    const savedConfig = localStorage.getItem('chatConfig');
    return savedConfig ? JSON.parse(savedConfig) : defaultConfig;
  });

  // Save config to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('chatConfig', JSON.stringify(config));
    onConfigChange(config);
  }, [config, onConfigChange]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    // Convert numerical values
    if (name === 'temperature' || name === 'topK' || name === 'topP' || name === 'maxOutputTokens') {
      const numValue = parseFloat(value);
      setConfig({ ...config, [name]: numValue });
    } else {
      setConfig({ ...config, [name]: value });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-4 dark:text-white">AI Configuration</h2>
        
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1 dark:text-gray-300">System Prompt</label>
          <textarea
            name="systemPrompt"
            value={config.systemPrompt}
            onChange={handleChange}
            className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            rows={4}
            placeholder="Instructions for the AI model"
          />
          <p className="text-xs text-gray-500 mt-1 dark:text-gray-400">
            This is a set of instructions that guides how the AI will respond.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium mb-1 dark:text-gray-300">Temperature: {config.temperature}</label>
            <input
              type="range"
              name="temperature"
              min="0"
              max="1"
              step="0.01"
              value={config.temperature}
              onChange={handleChange}
              className="w-full"
            />
            <p className="text-xs text-gray-500 mt-1 dark:text-gray-400">
              Lower values make responses more focused and deterministic.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 dark:text-gray-300">Top K: {config.topK}</label>
            <input
              type="range"
              name="topK"
              min="1"
              max="100"
              step="1"
              value={config.topK}
              onChange={handleChange}
              className="w-full"
            />
            <p className="text-xs text-gray-500 mt-1 dark:text-gray-400">
              Limits response tokens to top K most likely ones.
            </p>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1 dark:text-gray-300">Top P: {config.topP}</label>
            <input
              type="range"
              name="topP"
              min="0"
              max="1"
              step="0.01"
              value={config.topP}
              onChange={handleChange}
              className="w-full"
            />
            <p className="text-xs text-gray-500 mt-1 dark:text-gray-400">
              Nucleus sampling - consider tokens with top P probability mass.
            </p>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1 dark:text-gray-300">Max Output Tokens: {config.maxOutputTokens}</label>
            <input
              type="range"
              name="maxOutputTokens"
              min="64"
              max="8192"
              step="64"
              value={config.maxOutputTokens}
              onChange={handleChange}
              className="w-full"
            />
            <p className="text-xs text-gray-500 mt-1 dark:text-gray-400">
              Maximum length of generated responses.
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <button
            onClick={() => setConfig(defaultConfig)}
            className="px-4 py-2 bg-gray-300 dark:bg-gray-700 rounded-md dark:text-white"
          >
            Reset to Defaults
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Save & Close
          </button>
        </div>
      </div>
    </div>
  );
}
