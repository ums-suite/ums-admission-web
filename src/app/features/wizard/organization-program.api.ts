import { Injectable, inject } from '@angular/core';
import { OrganizationApiService } from '@ums/shared';
import { Observable, map } from 'rxjs';

/** A `Program` reference row (AWEB-14), just the fields the program-choice picker needs. */
export interface OrganizationProgramDto {
  readonly id: string;
  readonly name: string;
  readonly departmentId?: string;
}

/**
 * Thin typed wrapper over `@ums/shared`'s real generated `OrganizationApiService` (Organization is
 * one of the three modules `ums-shared`'s committed contract already covers -- this is NOT a
 * `ProvisionalModuleApiBase` subclass). `apiV1OrganizationProgramsGet` is untyped
 * (`Observable<any>`, `@ums/shared`'s own documented gap) and its exact list-envelope shape isn't
 * confirmed against a real response -- this assumes a `{ items: [...] }` page shape (the platform's
 * common paged-list convention) and falls back to treating the raw body as the array itself if
 * `items` isn't present, so a shape mismatch degrades to an empty list rather than throwing.
 */
@Injectable({ providedIn: 'root' })
export class OrganizationProgramApi {
  private readonly organizationApi = inject(OrganizationApiService);

  listPrograms(): Observable<readonly OrganizationProgramDto[]> {
    return (this.organizationApi.apiV1OrganizationProgramsGet() as Observable<unknown>).pipe(
      map((body) => {
        const list = Array.isArray(body)
          ? body
          : Array.isArray((body as { items?: unknown[] })?.items)
            ? ((body as { items: unknown[] }).items ?? [])
            : [];
        return list.map(toProgramDto);
      }),
    );
  }
}

function toProgramDto(raw: unknown): OrganizationProgramDto {
  const record = raw as Record<string, unknown>;
  return {
    id: String(record['id'] ?? ''),
    name: String(record['name'] ?? record['title'] ?? 'Unknown program'),
    departmentId:
      typeof record['departmentId'] === 'string' ? (record['departmentId'] as string) : undefined,
  };
}
