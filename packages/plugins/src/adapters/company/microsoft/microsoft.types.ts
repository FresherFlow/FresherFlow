export interface EightfoldPosition {
  id: string;
  displayJobId?: string;
  name?: string;
  locations?: string[];
  department?: string;
  workLocationOption?: string;
  postedTs?: number;
  creationTs?: number;
  positionUrl?: string;
}

export interface EightfoldSearchResponse {
  data?: {
    positions?: EightfoldPosition[];
  };
}
