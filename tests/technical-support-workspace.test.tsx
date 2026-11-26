// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { TechnicalSupportWorkspace } from '../src/components/admin/TechnicalSupportWorkspace';
import type { SupportConversation, SupportMessage } from '../src/services/supportChat';

const mocks = vi.hoisted(() => ({
  locked: false,
  userId: 'admin-1',
  list: vi.fn<(...args: any[]) => Promise<SupportConversation[]>>(),
  messages: vi.fn<(...args: any[]) => Promise<SupportMessage[]>>(),
  rpc: vi.fn<(...args: any[]) => Promise<any>>(),
}));

vi.mock('../src/context/CoreDataContext', () => ({
  useCoreData: () => ({
    siteSettings: { chat_locked: mocks.locked },
  }),
}));

vi.mock('../src/services/supportChat', () => ({
  listSupportConversations: mocks.list,
  loadSupportMessages: mocks.messages,
  supportRpc: mocks.rpc,
}));

vi.mock('../src/lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: async () => ({ data: { user: { id: mocks.userId } } }),
    },
    channel: () => {
      const channel = {
        on: () => channel,
        subscribe: () => channel,
      };
      return channel;
    },
    removeChannel: vi.fn(),
  },
}));

const sampleConversations: SupportConversation[] = [
  {
    id: 'conv-1',
    student_id: 'stu-1',
    event_id: null,
    created_at: '2026-11-24T09:00:00Z',
    label: 'Aarav Sharma',
    subtitle: 'Technical support request',
    last_message: 'My pass QR code is not loading on mobile.',
    last_activity: '2026-11-26T10:15:00Z',
    unread_count: 2,
  },
  {
    id: 'conv-2',
    student_id: 'stu-2',
    event_id: null,
    created_at: '2026-11-23T08:00:00Z',
    label: 'tp',
    subtitle: 'Technical support request',
    last_message: 'Thanks, sorted now!',
    last_activity: '2026-11-25T14:20:00Z',
    unread_count: 1,
  },
  {
    id: 'conv-3',
    student_id: 'stu-3',
    event_id: null,
    created_at: '2026-11-18T11:00:00Z',
    label: 'RAAJ',
    subtitle: 'Technical support request',
    last_message: '',
    last_activity: '2026-11-18T11:00:00Z',
    unread_count: 0,
  },
];

const sampleMessages: SupportMessage[] = [
  {
    id: 'msg-1',
    conversation_id: 'conv-1',
    sender_id: 'stu-1',
    sender_role: 'student',
    text: 'My pass QR code is not loading on mobile.',
    created_at: '2026-11-26T10:15:00Z',
    updated_at: '2026-11-26T10:15:00Z',
    expires_at: '2026-12-01T10:15:00Z',
    read_at: '2026-11-26T10:16:00Z',
  },
  {
    id: 'msg-2',
    conversation_id: 'conv-1',
    sender_id: 'admin-1',
    sender_role: 'admin',
    text: 'We regenerated your pass token. Please reload once.',
    created_at: '2026-11-26T10:20:00Z',
    updated_at: '2026-11-26T10:20:00Z',
    expires_at: '2026-12-01T10:20:00Z',
    read_at: null,
  },
];

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  vi.clearAllMocks();
  mocks.locked = false;
  mocks.userId = 'admin-1';
  mocks.list.mockResolvedValue(sampleConversations);
  mocks.messages.mockImplementation(async (id: string) => (id === 'conv-1' ? [...sampleMessages] : []));
  mocks.rpc.mockResolvedValue(undefined);
  vi.stubGlobal('matchMedia', () => ({ matches: true }));

  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});

const mount = async () => {
  await act(async () => {
    root.render(
      <MemoryRouter>
        <TechnicalSupportWorkspace />
      </MemoryRouter>
    );
  });
  await act(async () => {
    await Promise.resolve();
  });
};

const setNativeValue = (el: HTMLInputElement | HTMLTextAreaElement, value: string) => {
  const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(proto, 'value')!.set!.call(el, value);
  el.dispatchEvent(new Event('input', { bubbles: true }));
};

const getButton = (textOrLabel: string) =>
  [...container.querySelectorAll<HTMLButtonElement>('button')].find(
    btn => btn.getAttribute('aria-label') === textOrLabel || btn.textContent?.includes(textOrLabel)
  )!;

it('renders admin queue metrics, filter tabs, search reset, and admin-specific empty state', async () => {
  await mount();

  expect(mocks.list).toHaveBeenCalledWith('admin');
  expect(mocks.rpc).toHaveBeenCalledWith('support_mark_read', { p_conversation_id: 'conv-1', p_mode: 'admin' });
  expect(container.textContent).toContain('3 requests');
  expect(container.textContent).toContain('2 active threads');
  expect(container.textContent).toContain('Messaging open');
  expect(container.textContent).not.toContain('How can we help?');
  expect(container.textContent).not.toContain('Describe your question or issue');

  // Switch to Unread filter
  await act(async () => getButton('Unread').click());
  expect(container.querySelectorAll('.ts-queue-item').length).toBe(1);

  // Switch to Empty filter and select expired thread RAAJ
  await act(async () => getButton('Empty').click());
  expect(container.querySelectorAll('.ts-queue-item').length).toBe(1);
  await act(async () => container.querySelector<HTMLButtonElement>('.ts-queue-item')!.click());
  expect(container.textContent).toContain('No active messages with RAAJ');
  expect(container.textContent).not.toContain('How can we help?');

  // Search no match + reset filters
  const search = container.querySelector<HTMLInputElement>('input[type="search"]')!;
  await act(async () => setNativeValue(search, 'nonexistent-student'));
  expect(container.textContent).toContain('No conversations match your current search or filter.');
  await act(async () => getButton('Reset filters').click());
  expect(container.querySelectorAll('.ts-queue-item').length).toBe(3);
});

it('supports quick replies, blocks IME composing Enter, sends on normal Enter, and preserves draft on failure', async () => {
  await mount();

  const quickChip = container.querySelector<HTMLButtonElement>('.ts-quick-chip')!;
  await act(async () => quickChip.click());

  const composer = container.querySelector<HTMLTextAreaElement>('.ts-composer textarea')!;
  expect(composer.value).toContain('Checking your account and pass details now.');

  // Composing Enter (isComposing: true) must NOT send
  await act(async () => {
    const ev = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
    Object.defineProperty(ev, 'isComposing', { value: true });
    composer.dispatchEvent(ev);
  });
  expect(mocks.rpc).not.toHaveBeenCalledWith('support_send_message', expect.anything());

  // Safari keyCode 229 Enter must NOT send
  await act(async () => {
    const ev = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
    Object.defineProperty(ev, 'keyCode', { value: 229 });
    composer.dispatchEvent(ev);
  });
  expect(mocks.rpc).not.toHaveBeenCalledWith('support_send_message', expect.anything());

  // Failed send keeps draft and displays alert banner
  mocks.rpc.mockImplementation(async (name: string) => {
    if (name === 'support_send_message') throw new Error('Network timeout');
    return undefined;
  });
  await act(async () => {
    composer.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
  });
  expect(composer.value).toBe('Checking your account and pass details now.');
  expect(container.querySelector('[role="alert"]')?.textContent).toContain('Network timeout');

  // Successful retry appends message and clears composer
  mocks.rpc.mockImplementation(async (name: string) =>
    name === 'support_send_message'
      ? {
          id: 'msg-3',
          conversation_id: 'conv-1',
          sender_id: 'admin-1',
          sender_role: 'admin',
          text: 'Checking your account and pass details now.',
          created_at: '2026-11-26T10:25:00Z',
          updated_at: '2026-11-26T10:25:00Z',
          expires_at: '2026-12-01T10:25:00Z',
          read_at: null,
        }
      : undefined
  );
  await act(async () => {
    composer.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
  });
  expect(mocks.rpc).toHaveBeenCalledWith('support_send_message', {
    p_conversation_id: 'conv-1',
    p_mode: 'admin',
    p_text: 'Checking your account and pass details now.',
  });
  expect(composer.value).toBe('');
  expect(container.textContent).toContain('Checking your account and pass details now.');
});

it('edits own reply, deletes a message after inline confirmation, and clears the active thread', async () => {
  await mount();

  // Only the admin's own message gets an Edit button (msg-2), not stu-1's message
  const editButtons = [...container.querySelectorAll<HTMLButtonElement>('.ts-msg-action')].filter(btn =>
    btn.textContent?.includes('Edit')
  );
  expect(editButtons.length).toBe(1);

  await act(async () => editButtons[0].click());
  const editTextarea = container.querySelector<HTMLTextAreaElement>('.ts-edit-box textarea')!;
  await act(async () => setNativeValue(editTextarea, 'Updated pass instructions.'));
  await act(async () => getButton('Save edit').click());

  expect(mocks.rpc).toHaveBeenCalledWith('support_edit_message', {
    p_message_id: 'msg-2',
    p_mode: 'admin',
    p_text: 'Updated pass instructions.',
  });

  // Delete student message with inline 2-step confirmation
  const deleteButtons = [...container.querySelectorAll<HTMLButtonElement>('.ts-msg-action')].filter(btn =>
    btn.textContent?.includes('Delete')
  );
  await act(async () => deleteButtons[0].click());
  await act(async () => getButton('Confirm delete').click());

  expect(mocks.rpc).toHaveBeenCalledWith('support_delete_message', {
    p_message_id: 'msg-1',
    p_mode: 'admin',
  });

  // Clear entire active thread with inline 2-step confirmation
  await act(async () => getButton('Clear thread').click());
  await act(async () => getButton('Confirm clear').click());

  expect(mocks.rpc).toHaveBeenCalledWith('support_clear_conversation', {
    p_conversation_id: 'conv-1',
    p_mode: 'admin',
  });
  expect(container.textContent).toContain('No active messages with Aarav Sharma');
});

it('keeps threads readable when globally locked and loads earlier messages on demand', async () => {
  mocks.locked = true;
  const fullPage: SupportMessage[] = Array.from({ length: 100 }, (_, i) => ({
    id: `m-${i}`,
    conversation_id: 'conv-1',
    sender_id: i % 2 === 0 ? 'stu-1' : 'admin-1',
    sender_role: i % 2 === 0 ? 'student' : 'admin',
    text: `Message number ${i + 1}`,
    created_at: `2026-11-26T10:${String(Math.floor(i / 60)).padStart(2, '0')}:${String(i % 60).padStart(2, '0')}Z`,
    updated_at: `2026-11-26T10:${String(Math.floor(i / 60)).padStart(2, '0')}:${String(i % 60).padStart(2, '0')}Z`,
    expires_at: '2026-12-01T10:00:00Z',
    read_at: null,
  }));
  mocks.messages
    .mockResolvedValueOnce(fullPage)
    .mockResolvedValueOnce([
      {
        id: 'm-older',
        conversation_id: 'conv-1',
        sender_id: 'stu-1',
        sender_role: 'student',
        text: 'Earlier support inquiry',
        created_at: '2026-11-25T09:00:00Z',
        updated_at: '2026-11-25T09:00:00Z',
        expires_at: '2026-11-30T09:00:00Z',
        read_at: '2026-11-25T09:05:00Z',
      },
    ]);

  await mount();

  expect(container.textContent).toContain('Chat locked');
  expect(container.querySelector('.ts-locked-banner')?.textContent).toContain('Messaging is paused globally');
  expect(container.querySelector('.ts-locked-banner a')?.getAttribute('href')).toBe('/admin/site-settings');
  expect(container.querySelector('.ts-composer')).toBeNull();
  expect(container.textContent).toContain('Message number 100');

  await act(async () => getButton('Load earlier messages').click());
  expect(mocks.messages).toHaveBeenLastCalledWith('conv-1', fullPage[0]);
  expect(container.textContent).toContain('Earlier support inquiry');
});
