import {
  ExtractedTaskCandidate,
  IOffloaderEngine,
  OffloadedDocument,
  ScannerInputType,
} from '../../types/offloader';

export class LocalOffloaderEngine implements IOffloaderEngine {
  parseScannerInput(input: string, type: ScannerInputType): ExtractedTaskCandidate {
    const clean = input.trim();

    // Heuristics for duration, category, and date
    let estimatedMinutes = 90;
    if (clean.match(/(short|quick|30m|half hour)/i)) estimatedMinutes = 30;
    else if (clean.match(/(medium|1h|60m|one hour)/i)) estimatedMinutes = 60;
    else if (clean.match(/(lab|essay|major|sprint|3h|4h|few hours)/i)) estimatedMinutes = 180;

    let category: 'coursework' | 'work' | 'errands' | 'personal' = 'coursework';
    if (clean.match(/(shift|work|meeting|boss|client)/i)) category = 'work';
    else if (clean.match(/(grocery|clean|laundry|errand|buy|mail)/i)) category = 'errands';
    else if (clean.match(/(gym|walk|read|relax)/i)) category = 'personal';

    // Title extraction
    const titleMatch = clean.split(/[,;\n.]/)[0];
    const title = titleMatch.length > 5 ? titleMatch.slice(0, 45).trim() : 'Coursework Assignment';

    const threeSentenceSummary = `1. The objective is to produce a structured deliverable for "${title}". 2. Total estimated completion requirement is approximately ${estimatedMinutes} minutes across core sections. 3. Submission deadline is scheduled for the upcoming evaluation cycle.`;

    const immediateMicroStep = {
      action: `Open working file, paste required schema template, and write title + author metadata.`,
      targetMinutes: 15,
    };

    const initialDraftSnippet = `# ${title}\n\n## Abstract & Primary Goals\nThis document synthesizes core requirements and establishes the structural foundation.\n\n## Section 1: Methodology\n- Initial outline parameter defined.\n- Baseline data inputs mapped.\n`;

    return {
      title,
      estimatedMinutes,
      dueDate: '2026-09-11',
      category,
      difficulty: estimatedMinutes >= 120 ? 4 : 2,
      threeSentenceSummary,
      immediateMicroStep,
      initialDraftSnippet,
    };
  }

  generateDraftAndMicroSteps(content: string, title?: string): OffloadedDocument {
    const docTitle = title || content.split(/[\n.]/)[0].slice(0, 35).trim() || 'Research & Analysis Brief';

    return {
      id: `doc-${Date.now()}`,
      fileName: `${docTitle.toLowerCase().replace(/[^a-z0-9]+/g, '_')}.md`,
      rawContent: content,
      summary: [
        `Deliverable centers on executing a structured implementation for ${docTitle}.`,
        `Core complexity involves consolidating requirements into verified technical components.`,
        `Immediate priority is establishing foundational scaffolding before running synthesis.`,
      ],
      microStep: {
        description: `Create project repository, configure baseline dependencies, and draft Section 1 headers.`,
        estimatedMinutes: 15,
      },
      starterDraft: {
        title: docTitle,
        outline: [
          '1. Problem Space & Domain Constraints',
          '2. Architectural Topology & Schema Validation',
          '3. Implementation Traceability Matrix',
          '4. Verification Protocol & Acceptance Bounds',
        ],
        openingDraft: `## Executive Overview\nThis work addresses key specifications for ${docTitle}. The solution decouples functional inputs from processing pipelines to eliminate regression risk.\n\n## Section 1: Domain Mapping\nThe operational envelope requires strict adherence to modular design principles.\n`,
      },
    };
  }

  askDocumentQuestion(docId: string, question: string): string {
    const qLower = question.toLowerCase();
    if (qLower.includes('ddl') || qLower.includes('due') || qLower.includes('deadline')) {
      return 'The deadline is set for 2026-09-11 at 23:59. Estimated workload requires 90 to 120 minutes of uninterrupted focus.';
    }
    if (qLower.includes('start') || qLower.includes('first step') || qLower.includes('how to start')) {
      return 'Recommended 15-minute start: Create the document template, write the introduction paragraph, and define the 3 main section headings.';
    }
    return `Based on the uploaded document, the primary requirement focuses on verified deliverable structure and maintaining strict boundary isolation.`;
  }
}

export const defaultOffloaderEngine = new LocalOffloaderEngine();
