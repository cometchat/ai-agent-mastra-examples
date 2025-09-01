import { supportAgent } from './support-agent';
import { billingAgent } from './billing-agent';
import { techSupportAgent } from './tech-support-agent';
import { humanRepAgent } from './human-rep-agent';
import { managerAgent } from './manager-agent';

export interface OrchestratorResult {
  answer: string;
  routedTo: 'billing' | 'tech' | 'support' | 'human' | 'manager';
  escalated: boolean;
  escalationLevel?: 'human' | 'manager';
}

export class OrchestratorAgent {
  async ask(question: string): Promise<OrchestratorResult> {
    // Simple keyword-based routing for demo purposes
    const lower = question.toLowerCase();
    if (lower.includes('bill') || lower.includes('invoice') || lower.includes('payment')) {
      const response = await billingAgent.stream([
        { role: 'user', content: question },
      ]);
      let output = '';
      for await (const chunk of response.textStream) {
        output += chunk;
      }
      return { answer: output, routedTo: 'billing', escalated: false };
    }
    if (lower.includes('tech') || lower.includes('error') || lower.includes('problem') || lower.includes('bug')) {
      const response = await techSupportAgent.stream([
        { role: 'user', content: question },
      ]);
      let output = '';
      for await (const chunk of response.textStream) {
        output += chunk;
      }
      return { answer: output, routedTo: 'tech', escalated: false };
    }
    // Main support agent handles most queries
    const supportResponse = await supportAgent.stream([
      { role: 'user', content: question },
    ]);
    let supportOutput = '';
    for await (const chunk of supportResponse.textStream) {
      supportOutput += chunk;
    }
    // Escalation logic: if support agent says 'Escalate', route to human or manager
    if (supportOutput.toLowerCase().includes('escalate to manager')) {
      const answer = await managerAgent.answer(question);
      return { answer, routedTo: 'manager', escalated: true, escalationLevel: 'manager' };
    }
    if (supportOutput.toLowerCase().includes('escalate') || supportOutput.toLowerCase().includes('human')) {
      const answer = await humanRepAgent.answer(question);
      return { answer, routedTo: 'human', escalated: true, escalationLevel: 'human' };
    }
    return { answer: supportOutput, routedTo: 'support', escalated: false };
  }
}
