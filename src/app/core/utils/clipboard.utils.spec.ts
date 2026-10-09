import { copyTextToClipboard } from './clipboard.utils';

describe('Clipboard Utils', () => {
  it('chama onSuccess quando copiado com sucesso', (done) => {
    spyOn(navigator.clipboard, 'writeText').and.returnValue(Promise.resolve());
    copyTextToClipboard('texto de teste', () => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('texto de teste');
      done();
    });
  });

  it('não faz nada quando texto é vazio', () => {
    const spy = spyOn(navigator.clipboard, 'writeText');
    copyTextToClipboard('');
    expect(spy).not.toHaveBeenCalled();
  });
});
