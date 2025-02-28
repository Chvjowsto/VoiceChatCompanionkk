import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Loader2, KeyRound, Check } from "lucide-react";

interface ApiKeyDialogProps {
  onApiKeySet: (apiKey: string) => void;
}

export function ApiKeyDialog({ onApiKeySet }: ApiKeyDialogProps) {
  const [apiKey, setApiKey] = useState("");
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [isValidating, setIsValidating] = useState(false);
  const [apiKeyValid, setApiKeyValid] = useState(false); // Added state for API key validity
  const [error, setError] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const validateApiKey = async () => {
    setIsValidating(true);
    try {
      // Basic format check before sending to server
      if (!apiKey || apiKey.trim().length < 10) {
        setError('API key appears too short or invalid');
        setApiKeyValid(false);
        setIsValidating(false);
        return false;
      }

      const response = await fetch('/api/validate-api-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey }),
        // Add timeout to prevent hanging
        signal: AbortSignal.timeout(10000)
      });

      const data = await response.json();

      if (response.ok && data.valid) {
        if (data.models && Array.isArray(data.models)) {
          setAvailableModels(data.models);
          console.log("Available models updated:", data.models);
        } else {
          console.warn("No models returned from API, using defaults");
        }
        setApiKeyValid(true);
        setError('');
        return true;
      } else {
        // Log the specific error for debugging
        console.error("API key validation failed:", data);
        setError(data.error || 'Invalid API key. Check if it has proper permissions and quota.');
        setApiKeyValid(false);
        return false;
      }
    } catch (error) {
      console.error('Failed to validate API key:', error);
      setError('Failed to validate API key. Network error or server timeout.');
      setApiKeyValid(false);
      return false;
    } finally {
      setIsValidating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <KeyRound className="mr-2 h-4 w-4" />
          Set API Key
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Gemini API Key</DialogTitle>
          <DialogDescription>
            Enter your Gemini API key to use with this chat application.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="apiKey" className="col-span-4">
              API Key
            </Label>
            <div className="col-span-4 flex gap-2">
              <Input
                id="apiKey"
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="flex-1"
                placeholder="Enter your Gemini API key"
              />
            </div>
            {error && (
              <div className="col-span-4 text-sm text-red-500">
                {error}
              </div>
            )}
            {isValidating && (
              <div className="col-span-4 text-sm text-blue-500">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Validating...
              </div>
            )}
            {apiKeyValid === true && ( // Use apiKeyValid instead of isValid
              <div className="col-span-4 mt-2">
                <p className="text-green-500 font-semibold">API Key Validated!</p>
                {availableModels.length > 0 && (
                  <div className="mt-2">
                    <p className="text-sm font-medium">Available Models:</p>
                    <ul className="mt-1 text-xs max-h-40 overflow-y-auto">
                      {availableModels.map(model => (
                        <li key={model} className="py-1">{model}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
            {apiKeyValid === false && ( // Use apiKeyValid instead of isValid
              <div className="col-span-4 text-sm text-red-500">
                Invalid API key. Please check and try again.
              </div>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button onClick={validateApiKey} disabled={isValidating || !apiKey.trim()}>
            {isValidating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Validating...
              </>
            ) : (
              "Validate & Save"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}