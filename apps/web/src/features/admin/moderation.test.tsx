import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderRoutesWithAuth } from '@/test/render';
import { signedIn } from '@/test/session';
import { ModerationForm } from './components/ModerationForm';

const callables = vi.hoisted(() => ({ adminModerate: vi.fn() }));
vi.mock('@/lib/callables', () => callables);

beforeEach(() => vi.clearAllMocks());

function renderForm() {
  return renderRoutesWithAuth(
    [
      {
        path: '/',
        element: (
          <ModerationForm reportId="r1" targetType="USER" targetId="javier" targetUid="javier" />
        ),
      },
    ],
    '/',
    signedIn({ roles: ['admin'] }),
  );
}

describe('ModerationForm (FR-44, FR-68, BR-27, BR-41)', () => {
  it('restrictive actions need a statement; the proposed ban needs its own confirmation', async () => {
    const user = userEvent.setup();
    callables.adminModerate
      .mockResolvedValueOnce({ actionId: 'x1', strikesActive: 3, suggestedNext: 'BAN' })
      .mockResolvedValueOnce({ actionId: 'x2', strikesActive: 3, suggestedNext: 'NONE' });
    renderForm();
    await user.selectOptions(screen.getByRole('combobox', { name: 'Acción' }), 'WARN');
    const apply = screen.getByRole('button', { name: 'Aplicar decisión' });
    expect(apply).toBeDisabled();
    await user.selectOptions(screen.getByRole('combobox', { name: 'Plantilla' }), 'RUDE');
    // The template prefills facts and ground; the preview shows them.
    expect(screen.getAllByText(/de forma grosera o irrespetuosa/).length).toBeGreaterThan(1);
    await user.click(screen.getByRole('checkbox', { name: 'Registrar advertencia (strike)' }));
    await user.click(apply);
    await waitFor(() =>
      expect(callables.adminModerate).toHaveBeenCalledWith(
        expect.objectContaining({
          reportId: 'r1',
          action: 'WARN',
          recordStrike: true,
          statement: expect.objectContaining({ templateId: 'RUDE' }) as unknown,
        }),
      ),
    );
    expect(await screen.findByText('El sistema propone la expulsión (BR-41).')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Revisar la sanción propuesta' }));
    await user.click(screen.getByRole('button', { name: 'Confirmar expulsión' }));
    await waitFor(() => expect(callables.adminModerate).toHaveBeenCalledTimes(2));
    const second = callables.adminModerate.mock.calls[1]?.[0] as Record<string, unknown>;
    expect(second).toMatchObject({ action: 'BAN', targetUid: 'javier' });
    expect(second.reportId).toBeUndefined();
    expect(second.recordStrike).toBeUndefined();
  });

  it('dismissing needs no statement', async () => {
    const user = userEvent.setup();
    callables.adminModerate.mockResolvedValue({
      actionId: 'x',
      strikesActive: 0,
      suggestedNext: 'NONE',
    });
    renderForm();
    await user.click(screen.getByRole('button', { name: 'Aplicar decisión' }));
    await waitFor(() =>
      expect(callables.adminModerate).toHaveBeenCalledWith({
        reportId: 'r1',
        targetType: 'USER',
        targetId: 'javier',
        targetUid: 'javier',
        action: 'DISMISS',
      }),
    );
  });
});
