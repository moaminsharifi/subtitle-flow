
"use client";

import { useState, useEffect } from 'react';
import type React from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import type { AppSettings, OpenAIModelType } from '@/lib/types';

interface SettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const OPENAI_TOKEN_KEY = 'app-settings-openai-token';
const GROQ_TOKEN_KEY = 'app-settings-groq-token'; // Kept for UI consistency if other Groq features exist
const OPENAI_MODEL_KEY = 'app-settings-openai-model'; // Renamed key

export function SettingsDialog({ isOpen, onClose }: SettingsDialogProps) {
  const [openAIToken, setOpenAIToken] = useState('');
  const [groqToken, setGroqToken] = useState('');
  const [openAIModel, setOpenAIModel] = useState<OpenAIModelType>('whisper-1'); // Renamed state and type
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      const storedOpenAIToken = localStorage.getItem(OPENAI_TOKEN_KEY);
      const storedGroqToken = localStorage.getItem(GROQ_TOKEN_KEY);
      const storedOpenAIModel = localStorage.getItem(OPENAI_MODEL_KEY) as OpenAIModelType | null;
      
      if (storedOpenAIToken) setOpenAIToken(storedOpenAIToken);
      if (storedGroqToken) setGroqToken(storedGroqToken);
      if (storedOpenAIModel) {
        setOpenAIModel(storedOpenAIModel);
      } else {
        setOpenAIModel('whisper-1'); // Default if not found
      }
    }
  }, [isOpen]);

  const handleSave = () => {
    localStorage.setItem(OPENAI_TOKEN_KEY, openAIToken);
    localStorage.setItem(GROQ_TOKEN_KEY, groqToken);
    localStorage.setItem(OPENAI_MODEL_KEY, openAIModel); // Save selected OpenAI model
    toast({
      title: 'Settings Saved',
      description: 'Your API tokens and preferences have been saved to browser storage.',
    });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Application Settings</DialogTitle>
          <DialogDescription>
            Manage your API tokens and preferences here. They will be stored securely in your browser.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-6 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="openai-token" className="text-right col-span-1">
              OpenAI Token
            </Label>
            <Input
              id="openai-token"
              type="password"
              value={openAIToken}
              onChange={(e) => setOpenAIToken(e.target.value)}
              className="col-span-3"
              placeholder="sk-..."
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="groq-token" className="text-right col-span-1">
              Groq Token
            </Label>
            <Input
              id="groq-token"
              type="password"
              value={groqToken}
              onChange={(e) => setGroqToken(e.target.value)}
              className="col-span-3"
              placeholder="gsk_..."
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="openai-model" className="text-right col-span-1">
              OpenAI Model
            </Label>
            <Select 
              value={openAIModel} 
              onValueChange={(value: OpenAIModelType) => setOpenAIModel(value)}
            >
              <SelectTrigger className="col-span-3" id="openai-model">
                <SelectValue placeholder="Select OpenAI model" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="whisper-1">whisper-1</SelectItem>
                <SelectItem value="gpt-4o-mini-transcribe">gpt-4o-mini-transcribe</SelectItem>
                <SelectItem value="gpt-4o-transcribe">gpt-4o-transcribe</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </DialogClose>
          <Button type="button" onClick={handleSave}>
            Save Settings
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
