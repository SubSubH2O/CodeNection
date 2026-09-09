import { TaskCategory } from './task';

export type ScannerInputType = 'text' | 'voice_transcript' | 'document';

export interface ExtractedTaskCandidate {
  title: string;
  estimatedMinutes: number;
  dueDate: string;
  category: TaskCategory;
  difficulty: number;
  threeSentenceSummary: string;
  immediateMicroStep: {
    action: string;
    targetMinutes: number; // e.g. 15
  };
  initialDraftSnippet?: string;
}

export interface OffloadedDocument {
  id: string;
  fileName: string;
  rawContent: string;
  summary: [string, string, string]; // Exactly 3 sentences
  microStep: {
    description: string;
    estimatedMinutes: number; // e.g. 15
  };
  starterDraft: {
    title: string;
    outline: string[];
    openingDraft: string; // 30% first draft
  };
}

export interface IOffloaderEngine {
  parseScannerInput(input: string, type: ScannerInputType): ExtractedTaskCandidate;
  generateDraftAndMicroSteps(content: string, title?: string): OffloadedDocument;
  askDocumentQuestion(docId: string, question: string): string;
}
