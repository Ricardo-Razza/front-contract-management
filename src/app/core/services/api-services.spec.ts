import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ContratoService } from './contrato.service';
import { AtaService } from './ata.service';
import { ImpressoraService } from './impressora.service';
import { LookupService } from './lookup.service';
import { environment } from '@env/environment';
import { Observable } from 'rxjs';
import { ApiPage } from '@core/models';

describe('Contratos HTTP dos serviços', () => {
  let http: HttpTestingController;
  beforeEach(() => { TestBed.configureTestingModule({providers:[provideHttpClient(),provideHttpClientTesting()]}); http=TestBed.inject(HttpTestingController); });
  afterEach(() => http.verify());
  for (const service of [ContratoService, AtaService]) {
    it(`pagina ${service.name} com índice zero e ordenação`, () => {
      const result = TestBed.inject<ContratoService | AtaService>(service).getPage(2,10,['ano,desc','numero,desc']) as Observable<ApiPage<unknown>>;
      result.subscribe(page=>expect(page.totalElements).toBe(35));
      const req=http.expectOne(r=>r.url.endsWith('/paginado'));
      expect(req.request.params.get('page')).toBe('2');
      expect(req.request.params.get('size')).toBe('10');
      expect(req.request.params.getAll('sort')).toEqual(['ano,desc','numero,desc']);
      req.flush({content:[],number:2,size:10,totalElements:35,totalPages:4});
    });
  }
  it('envia os meses, ano e empenho do financeiro', () => {
    TestBed.inject(ImpressoraService).getNotasFiscaisLote([1,9],undefined,2026,3).subscribe();
    const req=http.expectOne(r=>r.url===environment.apiUrl+'/impressoras/notas-fiscais/lote');
    expect(req.request.params.get('meses')).toBe('1,9');
    expect(req.request.params.get('ano')).toBe('2026');
    expect(req.request.params.get('empenhoId')).toBe('3');
    req.flush([]);
  });
  it('preserva o erro HTTP para o chamador de contratos', () => {
    let status=0;
    TestBed.inject(ContratoService).getById(99).subscribe({error:error=>status=error.status});
    http.expectOne(environment.apiUrl+'/contratos/99').flush({}, {status:404,statusText:'Not Found'});
    expect(status).toBe(404);
  });
  it('lookupService propaga erro HTTP e não devolve dados mockados em caso de falha', () => {
    const lookup = TestBed.inject(LookupService);
    let errorStatus = 0;
    let dataReceived: unknown = null;
    lookup.getAtivos().subscribe({
      next: data => dataReceived = data,
      error: err => errorStatus = err.status
    });
    http.expectOne(environment.apiUrl + '/ativos').flush('Erro interno', { status: 500, statusText: 'Server Error' });
    expect(errorStatus).toBe(500);
    expect(dataReceived).toBeNull();
  });
  it('lookupService armazena em cache reativo e reutiliza sem nova requisição', () => {
    const lookup = TestBed.inject(LookupService);
    let count = 0;
    lookup.getAtivos().subscribe(() => count++);
    lookup.getAtivos().subscribe(() => count++);
    const req = http.expectOne(environment.apiUrl + '/ativos');
    req.flush([{ id: 1, nome: 'Ativo' }]);
    expect(count).toBe(2);
    http.expectNone(environment.apiUrl + '/ativos');
  });
});
