// @vitest-environment jsdom
import {createElement,act} from 'react';
import {createRoot} from 'react-dom/client';
import {afterEach,expect,it,vi} from 'vitest';
import {QRCodeGenerator} from '../src/components/admin/QRCodeGenerator';
vi.mock('qrcode.react',()=>({QRCodeCanvas:()=>createElement('canvas')}));
(globalThis as any).IS_REACT_ACT_ENVIRONMENT=true;
afterEach(()=>vi.restoreAllMocks());
it('prints hostile names as visible text without creating markup or executable elements',async()=>{
 vi.spyOn(HTMLCanvasElement.prototype,'toDataURL').mockReturnValue('data:image/png;base64,fixture');
 const printDocument=document.implementation.createHTMLDocument();
 const popup={document:printDocument,print:vi.fn()};vi.spyOn(window,'open').mockReturnValue(popup as any);
 const container=document.createElement('div');document.body.append(container);const root=createRoot(container);
 const name='Student </title><img src=x onerror="alert(1)"><span data-injected>test</span>&';
 await act(async()=>root.render(createElement(QRCodeGenerator,{passToken:'fixture',participantName:name,passType:'<script>alert(1)</script>'})));
 await act(async()=>{[...container.querySelectorAll('button')].find(button=>button.textContent?.includes('Print'))!.click();});
 expect(printDocument.querySelector('[data-injected]')).toBeNull();expect(printDocument.querySelector('script')).toBeNull();expect(printDocument.querySelector('[onerror]')).toBeNull();expect(printDocument.querySelector('.name')?.textContent).toBe(name);expect(printDocument.querySelector('.type')?.textContent).toBe('<script>alert(1)</script>');expect(printDocument.images).toHaveLength(1);
 await act(async()=>root.unmount());container.remove();
});
