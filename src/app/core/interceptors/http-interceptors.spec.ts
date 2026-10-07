import { Component, DestroyRef, inject } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpClient, HttpContext, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { authInterceptor, AUTH_TOKEN_SOURCE } from './auth.interceptor';
import { errorInterceptor } from './error.interceptor';
import { loadingInterceptor } from './loading.interceptor';
import { SKIP_GLOBAL_ERROR, SKIP_GLOBAL_LOADING } from './http-context';
import { HttpLoadingService } from '@core/services/http-loading.service';
import { ToastService } from '@core/services/toast.service';
import { environment } from '@env/environment';

@Component({standalone:true,template:''})
class RequestOwner {
  readonly destroyRef = inject(DestroyRef);
  constructor() { inject(HttpClient).get('/pending').pipe(takeUntilDestroyed(this.destroyRef)).subscribe(); }
}

describe('Interceptores HTTP', () => {
  let http:HttpClient, backend:HttpTestingController, loading:HttpLoadingService, toast:jasmine.SpyObj<ToastService>;
  beforeEach(()=> {
    toast=jasmine.createSpyObj('ToastService',['error']);
    TestBed.configureTestingModule({providers:[
      provideHttpClient(withInterceptors([authInterceptor,loadingInterceptor,errorInterceptor])),
      provideHttpClientTesting(), {provide:ToastService,useValue:toast},
      {provide:AUTH_TOKEN_SOURCE,useValue:()=> 'token-de-teste'}
    ]});
    http=TestBed.inject(HttpClient); backend=TestBed.inject(HttpTestingController); loading=TestBed.inject(HttpLoadingService);
  });
  afterEach(()=>backend.verify());
  it('mantém a barra até a última requisição terminar',()=> {
    http.get('/one').subscribe();http.get('/two').subscribe();
    expect(loading.loading()).toBeTrue();
    backend.expectOne('/one').flush({});expect(loading.loading()).toBeTrue();
    backend.expectOne('/two').flush({});expect(loading.loading()).toBeFalse();
  });
  it('limpa o contador quando a requisição é cancelada',()=> {
    const subscription=http.get('/cancel').subscribe();const req=backend.expectOne('/cancel');
    subscription.unsubscribe();expect(req.cancelled).toBeTrue();expect(loading.loading()).toBeFalse();
  });
  it('cancela o HTTP quando o componente é destruído',()=> {
    const fixture=TestBed.createComponent(RequestOwner);const req=backend.expectOne('/pending');
    fixture.destroy();expect(req.cancelled).toBeTrue();expect(loading.loading()).toBeFalse();
  });
  for(const status of [400,401,403,404,500]) {
    it(`notifica ${status} uma única vez e preserva o erro`,()=> {
      let received=0;http.get('/error').subscribe({error:err=>received=err.status});
      backend.expectOne('/error').flush({message:'Dados inválidos'},{status,statusText:'Error'});
      expect(received).toBe(status);expect(toast.error).toHaveBeenCalledTimes(1);expect(loading.loading()).toBeFalse();
    });
  }
  it('permite chamadas silenciosas com contexto explícito',()=> {
    http.get('/silent',{context:new HttpContext().set(SKIP_GLOBAL_LOADING,true).set(SKIP_GLOBAL_ERROR,true)}).subscribe({error:()=>{}});
    expect(loading.loading()).toBeFalse();backend.expectOne('/silent').flush({},{status:404,statusText:'Not Found'});
    expect(toast.error).not.toHaveBeenCalled();
  });
  it('adiciona o token apenas à API e preserva Authorization explícito',()=> {
    http.get(environment.apiUrl+'/secretarias').subscribe();
    const api=backend.expectOne(environment.apiUrl+'/secretarias');expect(api.request.headers.get('Authorization')).toBe('Bearer token-de-teste');api.flush([]);
    http.get('https://example.org/resource').subscribe();const other=backend.expectOne('https://example.org/resource');expect(other.request.headers.has('Authorization')).toBeFalse();other.flush({});
    http.get(environment.apiUrl+'/secretarias',{headers:{Authorization:'Custom'}}).subscribe();
    const custom=backend.expectOne(environment.apiUrl+'/secretarias');expect(custom.request.headers.get('Authorization')).toBe('Custom');custom.flush([]);
  });
});
