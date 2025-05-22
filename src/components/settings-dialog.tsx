
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
import type { AppSettings, TranscribeModelType } from '@/lib/types';

interface SettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const OPENAI_TOKEN_KEY = 'app-settings-openai-token';
const GROQ_TOKEN_KEY = 'app-settings-groq-token';
const TRANSCRIBE_MODEL_KEY = 'app-settings-transcribe-model';

export function SettingsDialog({ isOpen, onClose }: SettingsDialogProps) {
  const [openAIToken, setOpenAIToken] = useState('');
  const [groqToken, setGroqToken] = useState('');
  const [transcribeModel, setTranscribeModel] = useState<TranscribeModelType>('openai');
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      const storedOpenAIToken = localStorage.getItem(OPENAI_TOKEN_KEY);
      const storedGroqToken = localStorage.getItem(GROQ_TOKEN_KEY);
      const storedTranscribeModel = localStorage.getItem(TRANSCRIBE_MODEL_KEY) as TranscribeModelType | null;
      
      if (storedOpenAIToken) setOpenAIToken(storedOpenAIToken);
      if (storedGroqToken) setGroqToken(storedGroqToken);
      if (storedTranscribeModel) {
        setTranscribeModel(storedTranscribeModel);
      } else {
        setTranscribeModel('openai'); // Default if not found
      }
    }
  }, [isOpen]);

  const handleSave = () => {
    localStorage.setItem(OPENAI_TOKEN_KEY, openAIToken);
    localStorage.setItem(GROQ_TOKEN_KEY, groqToken);
    localStorage.setItem(TRANSCRIBE_MODEL_KEY, transcribeModel);
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
            <Label htmlFor="transcribe-model" className="text-right col-span-1">
              Transcribe Model
            </Label>
            <Select 
              value={transcribeModel} 
              onValueChange={(value: TranscribeModelType) => setTranscribeModel(value)}
            >
              <SelectTrigger className="col-span-3" id="transcribe-model">
                <SelectValue placeholder="Select transcribe model" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="openai">OpenAI</SelectItem>
                <SelectItem value="groq">Groq</SelectItem>
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
