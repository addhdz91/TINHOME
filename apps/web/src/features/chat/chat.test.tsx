import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import '@/i18n';
import { ChatThread } from './components/ChatThread';
import { MessageComposer } from './components/MessageComposer';
import type { MessageView } from './lib/types';

const message = (id: string, overrides: Partial<MessageView> = {}): MessageView => ({
  id,
  senderUid: 'laura',
  type: 'TEXT',
  text: `Mensaje ${id}`,
  systemCode: null,
  exchangeId: null,
  paymentWarning: false,
  hiddenByModeration: false,
  deletedFor: [],
  createdAt: new Date('2027-03-01T10:00:00Z'),
  ...overrides,
});

describe('ChatThread (FR-60)', () => {
  it('shows system messages, read receipts and a safety note on received payment messages', () => {
    render(
      <ChatThread
        uid="laura"
        otherName="Javier S."
        messages={[
          message('s', { senderUid: null, type: 'SYSTEM', systemCode: 'MATCH_CREATED', text: '' }),
          message('1'),
          message('2', {
            senderUid: 'javier',
            text: 'Te hago un Bizum',
            paymentWarning: true,
            createdAt: new Date('2027-03-01T10:05:00Z'),
          }),
          message('3', { deletedFor: ['laura'] }),
        ]}
        pending={[{ id: 'p', text: 'Pendiente', status: 'failed' }]}
        otherReadAt={new Date('2027-03-01T10:01:00Z')}
        onRetry={vi.fn()}
      />,
    );
    expect(screen.getByText('¡Match con Javier S.! Ya podéis hablar.')).toBeInTheDocument();
    expect(screen.getByText('Leído')).toBeInTheDocument();
    expect(screen.getByRole('note')).toHaveTextContent('Nunca envíes dinero ni datos bancarios');
    expect(screen.queryByText('Mensaje 3')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'No enviado · Reintentar' })).toBeInTheDocument();
  });
});

describe('MessageComposer', () => {
  it('sends with Enter, keeps Shift+Enter for new lines and offers suggestions', async () => {
    const onSend = vi.fn();
    const user = userEvent.setup();
    render(<MessageComposer onSend={onSend} showSuggestions disabled={false} />);
    await user.click(screen.getByRole('button', { name: '¿Qué fechas os vienen bien?' }));
    expect(onSend).toHaveBeenLastCalledWith('¿Qué fechas os vienen bien?');
    const box = screen.getByLabelText('Escribe un mensaje');
    await user.type(box, 'Hola{Shift>}{Enter}{/Shift}qué tal{Enter}');
    expect(onSend).toHaveBeenLastCalledWith('Hola\nqué tal');
    expect(box).toHaveValue('');
  });
});
