import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderRoutes, renderRoutesWithAuth } from '@/test/render';
import { signedIn } from '@/test/session';
import { publicSupportRoutes, supportRoutes } from './routes';

const callables = vi.hoisted(() => ({
  submitComplaint: vi.fn(async () => ({
    ticketId: 't1',
    number: 'TH-2027-000123',
    dueAt: '2027-03-16T10:00:00.000Z',
  })),
  submitPublicReport: vi.fn(async () => ({ reportId: 'r1' })),
  listMyComplaints: vi.fn(),
}));
vi.mock('@/lib/callables', () => callables);

beforeEach(() => vi.clearAllMocks());

describe('complaints (FR-67)', () => {
  it('a visitor needs an e-mail and gets a tracking number and deadline', async () => {
    const user = userEvent.setup();
    renderRoutes([{ path: '/', children: publicSupportRoutes }], '/reclamaciones');
    await user.selectOptions(
      await screen.findByRole('combobox', { name: 'Tipo de solicitud' }),
      'PREMIUM_BILLING',
    );
    await user.type(screen.getByRole('textbox', { name: 'Asunto' }), 'Cobro duplicado');
    await user.type(
      screen.getByRole('textbox', { name: 'Descripción' }),
      'Me habéis cobrado dos veces la cuota de marzo.',
    );
    await user.click(screen.getByRole('button', { name: 'Enviar solicitud' }));
    expect(screen.getByText('Escribe un email válido para poder responderte.')).toBeInTheDocument();
    expect(callables.submitComplaint).not.toHaveBeenCalled();
    await user.type(screen.getByRole('textbox', { name: 'Email' }), 'ana@ejemplo.es');
    await user.click(screen.getByRole('button', { name: 'Enviar solicitud' }));
    expect(await screen.findByText('Número de seguimiento: TH-2027-000123')).toBeInTheDocument();
    expect(
      screen.getByText(/Te responderemos como tarde el 16 de marzo de 2027/),
    ).toBeInTheDocument();
    expect(callables.submitComplaint).toHaveBeenCalledWith({
      category: 'PREMIUM_BILLING',
      subject: 'Cobro duplicado',
      description: 'Me habéis cobrado dos veces la cuota de marzo.',
      email: 'ana@ejemplo.es',
    });
  });

  it('lists my requests with their status', async () => {
    callables.listMyComplaints.mockResolvedValue({
      items: [
        {
          id: 't1',
          number: 'TH-2027-000123',
          category: 'ACCOUNT',
          subject: 'No puedo entrar',
          status: 'WAITING_USER',
          dueAt: '2027-03-16T10:00:00.000Z',
          createdAt: '2027-03-01T10:00:00.000Z',
          updatedAt: '2027-03-02T10:00:00.000Z',
        },
      ],
    });
    renderRoutesWithAuth([{ path: '/app', children: supportRoutes }], '/app/soporte', signedIn());
    expect(
      await screen.findByRole('link', { name: /TH-2027-000123 · No puedo entrar/ }),
    ).toHaveAttribute('href', '/app/soporte/t1');
    expect(screen.getByText(/Esperando tu respuesta/)).toBeInTheDocument();
  });
});

describe('public report (FR-43)', () => {
  it('needs a good-faith statement', async () => {
    const user = userEvent.setup();
    renderRoutes([{ path: '/', children: publicSupportRoutes }], '/denunciar');
    await user.type(await screen.findByRole('textbox', { name: 'Nombre' }), 'Ana');
    await user.type(screen.getByRole('textbox', { name: 'Email' }), 'ana@ejemplo.es');
    await user.type(
      screen.getByRole('textbox', { name: /Enlace o identificador del contenido/ }),
      'https://tinhome.es/app/casa/x',
    );
    await user.type(
      screen.getByRole('textbox', { name: 'Explica por qué es ilegal o incumple las normas' }),
      'Estas fotos son de mi piso y no de esta persona.',
    );
    await user.click(screen.getByRole('button', { name: 'Enviar denuncia' }));
    expect(screen.getByText('Debes confirmar que denuncias de buena fe.')).toBeInTheDocument();
    await user.click(screen.getByRole('checkbox', { name: /Declaro de buena fe/ }));
    await user.click(screen.getByRole('button', { name: 'Enviar denuncia' }));
    await waitFor(() => expect(callables.submitPublicReport).toHaveBeenCalled());
    expect(await screen.findByText(/Hemos recibido tu denuncia/)).toBeInTheDocument();
  });
});
