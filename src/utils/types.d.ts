
export type ReleaseName = string;
type BranchName = string;

interface VersionConfig {
  name: string;
  current: string;
  precededBy: string;
  releaseBranch: string;
  preReleaseBranches: Record<BranchName, ReleaseName>;
  autoPushToRemote: boolean;
  updatePackageJson: boolean;
  remote: string;
  preScript?: string;
  releaseNotes?: {
    outputPath: string;
  }
}

export type Question = {
  name: keyof VersionConfig;
  prompt: () => Promise<VersionConfig[keyof VersionConfig]>;
  preCondition?: () => boolean | Promise<boolean>;
}

type VersionType = 'MAJOR' | 'MINOR' | 'PATCH' | 'PRE-RELEASE';
type Branch = string;

interface VersionParts {
  major: number;
  minor: number;
  patch: number;
  preRelease?: string;
}

export interface ValidationResponse {
  isValid: boolean;
  message?: string;
}

export type PromptType = 'input' | 'select' | 'confirm' | 'search';

export type PromptChoices = {name: string, value: string}[];

export type PromptSource = (term: string | undefined) => Promise<PromptChoices>;
