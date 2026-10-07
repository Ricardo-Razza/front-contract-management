import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import { ContratosComponent } from './contratos.component';

describe('Listagem paginada de contratos',()=> {
  beforeEach(()=>TestBed.configureTestingModule({providers:[provideHttpClient(),provideHttpClientTesting(),{provide:ActivatedRoute,useValue:{queryParams:of({})}}]}));
  afterEach(()=>TestBed.inject(HttpTestingController).verify());
  it('usa o total do servidor, consulta a página seguinte e cancela a busca anterior',()=> {
    const fixture=TestBed.createComponent(ContratosComponent),http=TestBed.inject(HttpTestingController);
    fixture.detectChanges();TestBed.flushEffects();
    const initial=http.match(()=>true);
    for(const request of initial) {
      if(request.request.url.endsWith('/paginado'))request.flush({content:[],totalElements:100,totalPages:4,number:0,size:25});
      else if(request.request.url.endsWith('/filtros'))request.flush({anos:[2025,2026],tipos:['SERVICO']});
      else request.flush([]);
    }
    expect(fixture.componentInstance.totalRecords()).toBe(100);
    fixture.componentInstance.onPageChange(2);fixture.detectChanges();TestBed.flushEffects();
    const next=http.expectOne(req=>req.url.endsWith('/paginado'));
    expect(next.request.params.get('page')).toBe('1');
    fixture.componentInstance.globalSearch.set('educacao');fixture.detectChanges();TestBed.flushEffects();
    expect(next.cancelled).toBeTrue();
    const search=http.expectOne(req=>req.url.endsWith('/paginado'));
    expect(search.request.params.get('search')).toBe('educacao');
    fixture.destroy();expect(search.cancelled).toBeTrue();
  });
});
