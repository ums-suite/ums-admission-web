import { TestBed } from '@angular/core/testing';
import { OrganizationApiService } from '@ums/shared';
import { Observable, of } from 'rxjs';
import { OrganizationProgramApi } from './organization-program.api';

/**
 * The real `apiV1OrganizationProgramsGet` is overloaded on `observe`/return shape, which makes a
 * jasmine spy's `.and.returnValue(of(...))` fight TS overload resolution for no real benefit in a
 * unit test -- this narrow interface is what `OrganizationProgramApi` actually calls through.
 */
interface LooseOrganizationApi {
  apiV1OrganizationProgramsGet(): Observable<unknown>;
}

describe('OrganizationProgramApi', () => {
  let api: OrganizationProgramApi;
  let organizationApiSpy: jasmine.SpyObj<LooseOrganizationApi>;

  beforeEach(() => {
    organizationApiSpy = jasmine.createSpyObj<LooseOrganizationApi>('OrganizationApiService', [
      'apiV1OrganizationProgramsGet',
    ]);
    TestBed.configureTestingModule({
      providers: [{ provide: OrganizationApiService, useValue: organizationApiSpy }],
    });
    api = TestBed.inject(OrganizationProgramApi);
  });

  it('maps an { items: [...] } paged response into OrganizationProgramDto[]', (done) => {
    organizationApiSpy.apiV1OrganizationProgramsGet.and.returnValue(
      of({ items: [{ id: 'p1', name: 'CSE', departmentId: 'd1' }] }),
    );

    api.listPrograms().subscribe((programs) => {
      expect(programs).toEqual([{ id: 'p1', name: 'CSE', departmentId: 'd1' }]);
      done();
    });
  });

  it('maps a raw array response the same way', (done) => {
    organizationApiSpy.apiV1OrganizationProgramsGet.and.returnValue(
      of([{ id: 'p2', name: 'EEE' }]),
    );

    api.listPrograms().subscribe((programs) => {
      expect(programs).toEqual([{ id: 'p2', name: 'EEE', departmentId: undefined }]);
      done();
    });
  });

  it('degrades to an empty list for an unrecognized response shape', (done) => {
    organizationApiSpy.apiV1OrganizationProgramsGet.and.returnValue(of({ unexpected: true }));

    api.listPrograms().subscribe((programs) => {
      expect(programs).toEqual([]);
      done();
    });
  });
});
