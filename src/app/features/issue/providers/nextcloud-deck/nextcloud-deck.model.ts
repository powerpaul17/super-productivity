import { BaseIssueProviderCfg } from '../../issue.model';
import { SyncDirection } from '../../two-way-sync/issue-sync.model';

export interface NextcloudDeckTwoWaySyncCfg {
  isDone?: SyncDirection;
  title?: SyncDirection;
  description?: SyncDirection;
}

export interface NextcloudDeckCfg extends BaseIssueProviderCfg {
  nextcloudBaseUrl: string | null;
  username: string | null;
  password: string | null;
  selectedBoardId: number | null;
  selectedBoardTitle: string | null;
  importStackIds: number[] | null;
  doneStackId: number | null;
  isTransitionIssuesEnabled: boolean;
  filterByAssignee: boolean;
  titleTemplate: string | null;
  pollIntervalMinutes: number;
  twoWaySync?: NextcloudDeckTwoWaySyncCfg;
}
