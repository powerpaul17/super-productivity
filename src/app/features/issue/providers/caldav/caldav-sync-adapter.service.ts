import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { IssueSyncAdapter } from '../../two-way-sync/issue-sync-adapter.interface';
import { FieldMapping, FieldSyncConfig } from '../../two-way-sync/issue-sync.model';
import { CaldavCfg } from './caldav.model';
import { CaldavClientService } from './caldav-client.service';

const CALDAV_FIELD_MAPPINGS: FieldMapping[] = [
  {
    taskField: 'isDone',
    issueField: 'completed',
    defaultDirection: 'pullOnly',
    toIssueValue: (taskValue: unknown): boolean => !!taskValue,
    toTaskValue: (issueValue: unknown): boolean => !!issueValue,
  },
  {
    taskField: 'title',
    issueField: 'summary',
    defaultDirection: 'pullOnly',
    toIssueValue: (taskValue: unknown): string => (taskValue as string) ?? '',
    toTaskValue: (issueValue: unknown): string => (issueValue as string) ?? '',
  },
  {
    taskField: 'notes',
    issueField: 'note',
    defaultDirection: 'off',
    toIssueValue: (taskValue: unknown): string => (taskValue as string) ?? '',
    toTaskValue: (issueValue: unknown): string => (issueValue as string) ?? '',
  },
  {
    taskField: 'deadlineWithTime',
    issueField: 'due',
    defaultDirection: 'off',
    toIssueValue: (taskValue: unknown): number | undefined => {
      return (taskValue as number) ?? undefined;
    },
    toTaskValue: (issueValue: unknown): number | undefined => {
      return (issueValue as number) ?? undefined;
    },
    mutuallyExclusive: ['deadlineDay'],
  },
  {
    taskField: 'deadlineDay',
    issueField: 'due_day',
    defaultDirection: 'off',
    toIssueValue: (taskValue: unknown): string | undefined => {
      return (taskValue as string) ?? undefined;
    },
    toTaskValue: (issueValue: unknown): string | undefined => {
      return (issueValue as string) ?? undefined;
    },
    mutuallyExclusive: ['deadlineWithTime'],
  },
];

@Injectable({
  providedIn: 'root',
})
export class CaldavSyncAdapterService implements IssueSyncAdapter<CaldavCfg> {
  private readonly _caldavClientService = inject(CaldavClientService);

  getFieldMappings(): FieldMapping[] {
    return CALDAV_FIELD_MAPPINGS;
  }

  getSyncConfig(cfg: CaldavCfg): FieldSyncConfig {
    const twoWay = cfg.twoWaySync;
    if (!twoWay) {
      return {};
    }
    return {
      isDone: twoWay.isDone,
      title: twoWay.title,
      notes: twoWay.notes,
      deadlineWithTime: twoWay.dueDate,
      deadlineDay: twoWay.dueDate,
    };
  }

  async fetchIssue(issueId: string, cfg: CaldavCfg): Promise<Record<string, unknown>> {
    const issue = await firstValueFrom(this._caldavClientService.getById$(issueId, cfg));
    return issue as unknown as Record<string, unknown>;
  }

  async pushChanges(
    issueId: string,
    changes: Record<string, unknown>,
    cfg: CaldavCfg,
  ): Promise<void> {
    await firstValueFrom(
      this._caldavClientService.updateFields$(
        cfg,
        issueId,
        changes as { completed?: boolean; summary?: string; note?: string; due?: number; due_day?: string },
      ),
    );
  }

  extractSyncValues(issue: Record<string, unknown>): Record<string, unknown> {
    const i = issue as unknown as CaldavIssue;
    return {
      completed: i.completed,
      summary: i.summary,
      note: i.note,
      due: i.isDueAllDay ? undefined : i.due,
      due_day: i.isDueAllDay ? i.due : undefined,
    };
  }

  async createIssue(
    title: string,
    cfg: CaldavCfg,
  ): Promise<{ issueId: string; issueNumber?: number; issueData: Record<string, unknown> }> {
    const issue = await this._caldavClientService.createTask(cfg, title);
    return {
      issueId: issue.id,
      issueData: issue as unknown as Record<string, unknown>,
    };
  }

  getIssueLastUpdated(issue: Record<string, unknown>): number {
    return issue['etag_hash'] as number;
  }
}
