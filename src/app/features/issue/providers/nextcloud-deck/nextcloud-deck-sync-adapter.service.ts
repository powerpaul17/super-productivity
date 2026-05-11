import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { IssueSyncAdapter } from '../../two-way-sync/issue-sync-adapter.interface';
import { FieldMapping, FieldSyncConfig } from '../../two-way-sync/issue-sync.model';
import { NextcloudDeckCfg } from './nextcloud-deck.model';
import { NextcloudDeckApiService } from './nextcloud-deck-api.service';

const DECK_FIELD_MAPPINGS: FieldMapping[] = [
  {
    taskField: 'isDone',
    issueField: 'done',
    defaultDirection: 'pullOnly',
    toIssueValue: (taskValue: unknown): boolean => !!taskValue,
    toTaskValue: (issueValue: unknown): boolean => !!issueValue,
  },
  {
    taskField: 'title',
    issueField: 'title',
    defaultDirection: 'pullOnly',
    toIssueValue: (taskValue: unknown): string => (taskValue as string) ?? '',
    toTaskValue: (issueValue: unknown): string => (issueValue as string) ?? '',
  },
  {
    taskField: 'notes',
    issueField: 'description',
    defaultDirection: 'off',
    toIssueValue: (taskValue: unknown): string => (taskValue as string) ?? '',
    toTaskValue: (issueValue: unknown): string => (issueValue as string) ?? '',
  },
];

@Injectable({
  providedIn: 'root',
})
export class NextcloudDeckSyncAdapterService implements IssueSyncAdapter<NextcloudDeckCfg> {
  private readonly _deckApiService = inject(NextcloudDeckApiService);

  getFieldMappings(): FieldMapping[] {
    return DECK_FIELD_MAPPINGS;
  }

  getSyncConfig(cfg: NextcloudDeckCfg): FieldSyncConfig {
    const twoWay = cfg.twoWaySync;
    if (!twoWay) {
      return {};
    }
    return {
      isDone: twoWay.isDone,
      title: twoWay.title,
      notes: twoWay.description,
    };
  }

  async fetchIssue(
    issueId: string,
    cfg: NextcloudDeckCfg,
  ): Promise<Record<string, unknown>> {
    const issue = await firstValueFrom(
      this._deckApiService.getById$(issueId, cfg),
    );
    if (!issue) {
      throw new Error('Deck card not found: ' + issueId);
    }
    return {
      done: issue.done,
      title: issue.title,
      description: issue.description,
      duedate: issue.duedate,
    };
  }

  async pushChanges(
    issueId: string,
    changes: Record<string, unknown>,
    cfg: NextcloudDeckCfg,
  ): Promise<void> {
    if (!cfg.selectedBoardId) {
      throw new Error('No board selected');
    }

    // Fetch current card to get its stackId
    const card = await firstValueFrom(
      this._deckApiService.getById$(issueId, cfg),
    );
    if (!card) {
      throw new Error('Card not found: ' + issueId);
    }

    const deckChanges: Partial<{
      title: string;
      description: string;
      duedate: string | null;
      done: boolean;
    }> = {};

    if (changes['title'] !== undefined) {
      deckChanges.title = changes['title'] as string;
    }
    if (changes['description'] !== undefined) {
      deckChanges.description = changes['description'] as string;
    }
    if (changes['done'] !== undefined) {
      deckChanges.done = changes['done'] as boolean;
    }

    await firstValueFrom(
      this._deckApiService.updateCard$(
        cfg,
        cfg.selectedBoardId,
        card.stackId,
        Number(issueId),
        deckChanges,
      ),
    );
  }

  async createIssue(
    title: string,
    cfg: NextcloudDeckCfg,
  ): Promise<{ issueId: string; issueNumber?: number; issueData: Record<string, unknown> }> {
    const boardId = cfg.selectedBoardId;
    if (!boardId) {
      throw new Error('No board selected');
    }
    const stackIds = cfg.importStackIds;
    if (!stackIds || stackIds.length === 0) {
      throw new Error('No import stacks configured');
    }

    // Create card in the first import stack
    const targetStackId = stackIds[0];
    const card = await firstValueFrom(
      this._deckApiService.createCard$(cfg, boardId, targetStackId, title),
    );

    return {
      issueId: String(card.id),
      issueNumber: card.id,
      issueData: {
        id: card.id,
        title: card.title,
        done: card.done,
        description: card.description || '',
        duedate: card.duedate,
      },
    };
  }

  extractSyncValues(issue: Record<string, unknown>): Record<string, unknown> {
    return {
      done: issue['done'],
      title: issue['title'],
      description: issue['description'],
    };
  }

  getIssueLastUpdated(issue: Record<string, unknown>): number {
    return (issue as { lastModified?: number }).lastModified ?? 0;
  }
}
