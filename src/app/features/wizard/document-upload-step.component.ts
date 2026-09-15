import { ChangeDetectionStrategy, Component, computed, inject, output } from '@angular/core';
import { signal } from '@angular/core';
import { UmsButtonComponent, UmsFileUploadComponent } from '@ums/design-system';
import type { UploadableFile } from '@ums/design-system';
import { DirectUploadService } from '../../core/upload/direct-upload.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { TranslationService } from '../../core/i18n/translation.service';
import { ApplicationApi } from './application.api';
import { WizardDraftStore } from './wizard-draft.store';

/**
 * Document upload step (AWEB-16, requirement-spec.md §3.2, §7 "guided process", Edge Case
 * "Document upload rejected for a fixable reason"). One `UmsFileUploadComponent` card per required
 * document type from the active `AdmissionCampaign` (never one ambiguous checkbox for a multi-file
 * requirement -- §3.2). Reuses AWEB-8's {@link DirectUploadService} unchanged (direct-to-object-
 * storage, never proxied through this app's server tier, Domain invariant/design-decisions.md
 * "Direct-to-object-storage upload") -- once an upload reaches `ready`, its `UploadedArtifact.id`
 * is recorded against the `Application` via `POST /applications/{id}/documents` as the
 * `fileReference` (see `application.types.ts`: `Admission`'s own document-link contract is a
 * free-form string, not a typed artifact join, so this app's own convention is to always put the
 * `Documents`-issued artifact id there).
 */
@Component({
  selector: 'app-document-upload-step',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [UmsButtonComponent, UmsFileUploadComponent, TranslatePipe],
  templateUrl: './document-upload-step.component.html',
})
export class DocumentUploadStepComponent {
  private readonly directUpload = inject(DirectUploadService);
  private readonly applicationApi = inject(ApplicationApi);
  protected readonly store = inject(WizardDraftStore);
  private readonly translation = inject(TranslationService);

  readonly next = output();
  readonly back = output();

  private readonly stateByType = signal<Readonly<Record<string, UploadableFile>>>({});

  protected readonly requiredTypes = computed(
    () => this.store.campaign()?.requiredDocumentTypes ?? [],
  );

  protected readonly allAccepted = computed(() => {
    const types = this.requiredTypes();
    if (types.length === 0) {
      return false;
    }
    const existing = this.store.application()?.documents ?? [];
    return types.every(
      (type) =>
        this.filesFor(type)[0]?.status === 'success' ||
        existing.some((doc) => doc.documentType === type && doc.status !== 'Rejected'),
    );
  });

  filesFor(documentType: string): readonly UploadableFile[] {
    const state = this.stateByType()[documentType];
    if (state) {
      return [state];
    }
    const existing = this.store
      .application()
      ?.documents.find((doc) => doc.documentType === documentType);
    if (!existing) {
      return [];
    }
    return [
      {
        id: existing.id,
        name: documentType,
        sizeBytes: 0,
        progress: 100,
        status: existing.status === 'Rejected' ? 'error' : 'success',
        errorMessage: existing.rejectionReason,
      },
    ];
  }

  protected onFilesSelected(documentType: string, fileList: FileList): void {
    const file = fileList.item(0);
    const applicationId = this.store.application()?.id;
    const ownerId = this.store.application()?.applicantId;
    if (!file || !applicationId || !ownerId) {
      return;
    }

    this.setState(documentType, {
      id: documentType,
      name: file.name,
      sizeBytes: file.size,
      progress: 0,
      status: 'uploading',
    });

    this.directUpload.upload(file, ownerId, documentType).subscribe((progress) => {
      if (progress.stage === 'uploading') {
        this.setState(documentType, {
          id: documentType,
          name: file.name,
          sizeBytes: file.size,
          progress: progress.percent ?? 0,
          status: 'uploading',
        });
        return;
      }
      if (progress.stage === 'failed') {
        this.setState(documentType, {
          id: documentType,
          name: file.name,
          sizeBytes: file.size,
          progress: 0,
          status: 'error',
          errorMessage: progress.errorMessage,
        });
        return;
      }
      if (progress.stage === 'ready' && progress.artifact) {
        this.registerDocument(documentType, file, progress.artifact.id);
      }
    });
  }

  private registerDocument(documentType: string, file: File, artifactId: string): void {
    const applicationId = this.store.application()?.id;
    if (!applicationId) {
      return;
    }
    this.applicationApi
      .uploadDocument(applicationId, { documentType, fileReference: artifactId })
      .subscribe({
        next: (updated) => {
          this.setState(documentType, {
            id: artifactId,
            name: file.name,
            sizeBytes: file.size,
            progress: 100,
            status: 'success',
          });
          this.store.setApplication(updated);
        },
        error: () => {
          this.setState(documentType, {
            id: documentType,
            name: file.name,
            sizeBytes: file.size,
            progress: 0,
            status: 'error',
            errorMessage: this.translation.t('wizard.documents.registerError'),
          });
        },
      });
  }

  protected retry(documentType: string): void {
    this.setState(documentType, undefined);
  }

  protected onSubmit(): void {
    this.next.emit();
  }

  private setState(documentType: string, value: UploadableFile | undefined): void {
    this.stateByType.update((current) => {
      const copy = new Map(Object.entries(current));
      if (value) {
        copy.set(documentType, value);
      } else {
        copy.delete(documentType);
      }
      return Object.fromEntries(copy);
    });
  }
}
