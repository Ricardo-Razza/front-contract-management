import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AnexoManagerComponent } from './anexo-manager.component';
import { environment } from '@env/environment';

describe('Anexos compartilhados',()=> {
  beforeEach(()=>TestBed.configureTestingModule({providers:[provideHttpClient(),provideHttpClientTesting()]}));
  afterEach(()=>TestBed.inject(HttpTestingController).verify());
  for(const kind of ['CONTRATO','ATA'] as const) {
    it(`lista e envia anexos para ${kind}`,()=> {
      const fixture=TestBed.createComponent(AnexoManagerComponent),http=TestBed.inject(HttpTestingController);
      fixture.componentRef.setInput('entityId',42);fixture.componentRef.setInput('kind',kind);fixture.detectChanges();
      http.expectOne(req=>req.url.endsWith('/'+(kind==='ATA'?'ata':'contrato')+'/42')).flush([]);
      const component=fixture.componentInstance;
      component.abrirModalUploadAnexo();fixture.detectChanges();
      expect(document.body.querySelector('.modal-backdrop')).not.toBeNull();
      expect(fixture.nativeElement.querySelector('.modal-backdrop')).toBeNull();
      component.selectedFile.set(new File(['pdf'],'documento.pdf',{type:'application/pdf'}));
      component.enviarAnexo();
      const upload=http.expectOne(req=>req.method==='POST');
      const data=upload.request.body as FormData;
      expect(data.get(kind==='ATA'?'ataId':'contratoId')).toBe('42');
      expect(data.has(kind==='ATA'?'contratoId':'ataId')).toBeFalse();
      upload.flush({});http.expectOne(req=>req.url.endsWith('/42')).flush([]);
      fixture.destroy();expect(document.body.querySelector('.modal-backdrop')).toBeNull();
    });
  }
});
