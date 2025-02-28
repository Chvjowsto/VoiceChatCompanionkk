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
  const [isValid, setIsValid] = useState<boolean | null>(null);
  const [error, setError] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const validateApiKey = async () => {
    if (!apiKey.trim()) {
      setError("API key cannot be empty");
      return;
    }

    setIsValidating(true);
    setError("");
    setIsValid(null); //Added to handle validation state
    setAvailableModels([]); //Reset available models before new validation

    try {
      const response = await fetch('/api/validate-api-key', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ apiKey }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to validate API key");
      }

      setIsValid(true);
      // Update available models with the ones returned from the API
      if (data.models && Array.isArray(data.models) && data.models.length > 0) {
        console.log("Models received:", data.models);
        setAvailableModels(data.models);
      }
    } catch (error) {
      setError(error.message);
      setIsValid(false);
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
            {isValid === true && (
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
            {isValid === false && (
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