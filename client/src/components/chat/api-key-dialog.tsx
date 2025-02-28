
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
  const [isValidating, setIsValidating] = useState(false);
  const [isValid, setIsValid] = useState<boolean | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const validateApiKey = async () => {
    if (!apiKey.trim()) return;
    
    setIsValidating(true);
    setIsValid(null);
    
    try {
      const response = await fetch('/api/validate-key', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ apiKey }),
      });
      
      const result = await response.json();
      setIsValid(result.valid);
      
      if (result.valid) {
        onApiKeySet(apiKey);
        // Close dialog after successful validation
        setTimeout(() => setIsOpen(false), 1500);
      }
    } catch (error) {
      console.error('Error validating API key:', error);
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
            {isValid === true && (
              <div className="col-span-4 text-sm text-green-500 flex items-center">
                <Check className="h-4 w-4 mr-2" /> API key is valid
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
