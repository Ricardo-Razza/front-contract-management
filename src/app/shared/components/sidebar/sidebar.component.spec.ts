import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { SidebarComponent } from './sidebar.component';

describe('Barra lateral', () => {
  beforeEach(() => {
    localStorage.removeItem('arp.sidebar.pinned');
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
  });
  afterEach(() => localStorage.removeItem('arp.sidebar.pinned'));

  it('ignora passagens rápidas e permite retornar durante o atraso de fechamento', fakeAsync(() => {
    const fixture = TestBed.createComponent(SidebarComponent);
    const component = fixture.componentInstance;
    component.onMouseEnter();
    tick(100);
    component.onMouseLeave();
    tick(220);
    expect(component.isHovered()).toBeFalse();
    component.onMouseEnter();
    tick(140);
    expect(component.isHovered()).toBeTrue();
    component.onMouseLeave();
    tick(100);
    component.onMouseEnter();
    tick(140);
    expect(component.isHovered()).toBeTrue();
    fixture.destroy();
    tick(220);
  }));

  it('lembra a preferência e mantém o menu fixado ao navegar no desktop', () => {
    const fixture = TestBed.createComponent(SidebarComponent);
    const component = fixture.componentInstance;
    spyOn(component.closeSidebar, 'emit');
    component.togglePinned(new MouseEvent('click'));
    expect(localStorage.getItem('arp.sidebar.pinned')).toBe('true');
    component.onItemClick();
    expect(component.isPinned()).toBeTrue();
    expect(component.closeSidebar.emit).not.toHaveBeenCalled();
    const next = TestBed.createComponent(SidebarComponent);
    expect(next.componentInstance.isPinned()).toBeTrue();
    fixture.destroy();
    next.destroy();
  });

  it('desativa o hover no celular e fecha ao selecionar uma página', fakeAsync(() => {
    const fixture = TestBed.createComponent(SidebarComponent);
    fixture.componentRef.setInput('isMobile', true);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    spyOn(component.closeSidebar, 'emit');
    component.onMouseEnter();
    tick(300);
    expect(component.isHovered()).toBeFalse();
    expect(fixture.nativeElement.querySelector('aside').hasAttribute('inert')).toBeTrue();
    component.onItemClick();
    expect(component.closeSidebar.emit).toHaveBeenCalled();
    fixture.destroy();
  }));

  it('mantém o foco no drawer e devolve ao botão de abertura ao fechar', fakeAsync(() => {
    const trigger = document.createElement('button');
    trigger.setAttribute('aria-controls', 'sidebar-navigation');
    document.body.appendChild(trigger);
    const fixture = TestBed.createComponent(SidebarComponent);
    try {
      fixture.componentRef.setInput('isMobile', true);
      fixture.componentRef.setInput('isOpen', true);
      fixture.detectChanges();
      tick(20);
      const close = fixture.nativeElement.querySelector('.btn-close-sidebar') as HTMLElement;
      const last = fixture.nativeElement.querySelector('a[routerLink="/impressoras"]') as HTMLElement;
      expect(document.activeElement).toBe(close);
      const backwards = new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, cancelable: true });
      fixture.componentInstance.onKeydown(backwards);
      expect(backwards.defaultPrevented).toBeTrue();
      expect(document.activeElement).toBe(last);
      fixture.componentInstance.onKeydown(new KeyboardEvent('keydown', { key: 'Tab', cancelable: true }));
      expect(document.activeElement).toBe(close);
      spyOn(fixture.componentInstance.closeSidebar, 'emit');
      fixture.componentInstance.onKeydown(new KeyboardEvent('keydown', { key: 'Escape', cancelable: true }));
      expect(fixture.componentInstance.closeSidebar.emit).toHaveBeenCalled();
      fixture.componentRef.setInput('isOpen', false);
      fixture.detectChanges();
      tick(20);
      expect(document.activeElement).toBe(trigger);
    } finally {
      fixture.destroy();
      trigger.remove();
    }
  }));

  it('funciona quando o navegador bloqueia o armazenamento', () => {
    spyOn(localStorage, 'getItem').and.throwError('Blocked');
    spyOn(localStorage, 'setItem').and.throwError('Blocked');
    const fixture = TestBed.createComponent(SidebarComponent);
    expect(fixture.componentInstance.isPinned()).toBeFalse();
    expect(() => fixture.componentInstance.togglePinned(new MouseEvent('click'))).not.toThrow();
    expect(fixture.componentInstance.isPinned()).toBeTrue();
    fixture.destroy();
  });
});
