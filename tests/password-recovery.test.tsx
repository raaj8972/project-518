// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import ForgotPassword from '../src/pages/ForgotPassword';
let container: HTMLDivElement;
let root: Root;
const fetchMock = vi.fn();
beforeEach(() => {
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  fetchMock.mockReset(); vi.stubGlobal('fetch', fetchMock);
  container = document.createElement('div'); document.body.append(container); root = createRoot(container);
});
afterEach(async () => { await act(async () => root.unmount()); container.remove(); vi.unstubAllGlobals(); });
const ok = (data: object) => ({ ok: true, json: async () => data });
async function mount() { await act(async () => root.render(<MemoryRouter><ForgotPassword /></MemoryRouter>)); }
async function input(id: string, value: string) {
  await act(async () => {
    const element = container.querySelector<HTMLInputElement>(`#${id}`)!;
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(element, value);
    element.dispatchEvent(new Event('input', { bubbles: true }));
  });
}
async function submit() { await act(async () => { container.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); }); }
async function sendCode() { fetchMock.mockResolvedValueOnce(ok({ message: 'Check your email for a code.' })); await input('recovery-email', 'owner@example.test'); await submit(); }
it('verifies the email code before allowing a password reset, keeping the reset token out of URLs', async () => {
  await mount(); await sendCode();
  expect(fetchMock).toHaveBeenLastCalledWith('/api/request-password-reset', expect.objectContaining({ body: JSON.stringify({ email: 'owner@example.test' }) }));
  expect(container.querySelector('#recovery-password')).toBeNull();
  expect([...container.querySelectorAll('button')].find(button => button.textContent?.includes('Resend'))?.disabled).toBe(true);
  fetchMock.mockResolvedValueOnce(ok({ token: 'opaque-reset-token' }));
  await input('recovery-code', '012345'); await submit();
  expect(fetchMock).toHaveBeenLastCalledWith('/api/verify-password-reset-otp', expect.objectContaining({ body: JSON.stringify({ email: 'owner@example.test', code: '012345' }) }));
  expect(container.querySelector('#recovery-password')).not.toBeNull();
  await input('recovery-password', 'new-fixture-password'); await input('recovery-confirm', 'different-password'); await submit();
  expect(container.querySelector('[role="alert"]')?.textContent).toContain('Passwords do not match');
  expect(fetchMock).toHaveBeenCalledTimes(2);
  fetchMock.mockResolvedValueOnce(ok({ success: true }));
  await input('recovery-confirm', 'new-fixture-password'); await submit();
  expect(fetchMock).toHaveBeenLastCalledWith('/api/confirm-password-reset', expect.objectContaining({ body: JSON.stringify({ token: 'opaque-reset-token', newPassword: 'new-fixture-password' }) }));
  expect(container.querySelector('h1')?.textContent).toBe('Password updated.');
  expect(container.querySelector('form')).toBeNull();
  expect(window.location.href).not.toContain('opaque-reset-token');
});
it('keeps invalid OTP attempts on the verification step and allows correcting the code', async () => {
  await mount(); await sendCode();
  fetchMock.mockResolvedValueOnce({ ok: false, json: async () => ({ error: 'Invalid or expired code.' }) });
  await input('recovery-code', '123456'); await submit();
  expect(container.querySelector('[role="alert"]')?.textContent).toBe('Invalid or expired code.');
  expect(container.querySelector('#recovery-password')).toBeNull();
  expect(container.querySelector('#recovery-code')).not.toBeNull();
});
