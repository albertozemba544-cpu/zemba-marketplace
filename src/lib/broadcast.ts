// Builds the email for an update sent to many people, or a message sent to one person.

import { EmailContent } from './notify';
import { unsubscribeUrl } from './unsubscribe';

export function paragraphs(body: string): string[] {
  return body.split(/\n{2,}/).map((part) => part.replace(/\n/g, ' ').trim()).filter(Boolean);
}

export function buildUpdateEmail(
  broadcast: { kind: string; subject: string; body: string; button_text: string | null; button_url: string | null },
  recipient: { user_id: string; full_name: string | null }
): EmailContent {
  const first = (recipient.full_name || '').trim().split(' ')[0];
  return {
    title: broadcast.subject,
    lines: [first ? `Hello ${first},` : 'Hello,', ...paragraphs(broadcast.body)],
    buttonText: broadcast.button_text || undefined,
    buttonUrl: broadcast.button_url || undefined,
    footerNote: broadcast.kind === 'NEWS' ? 'You get this because you chose to receive news from us.' : 'This is an important update about your account on Zemba.',
    footerLinkText: broadcast.kind === 'NEWS' ? 'Unsubscribe' : undefined,
    footerLinkUrl: broadcast.kind === 'NEWS' ? unsubscribeUrl(recipient.user_id) : undefined,
  };
}

export function buildPersonalEmail(subject: string, body: string, fullName: string | null): EmailContent {
  const first = (fullName || '').trim().split(' ')[0];
  return {
    title: subject,
    lines: [first ? `Hello ${first},` : 'Hello,', ...paragraphs(body), 'Reply to this message or contact us on the Contact page if you have questions.'],
    footerNote: 'This message was sent to you personally by the Zemba team.',
  };
}
