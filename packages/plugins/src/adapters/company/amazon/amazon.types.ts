export interface AmazonSearchResponse {
  searchHits: AmazonSearchHit[];
  totalHits?: number;
}

export interface AmazonSearchHit {
  fields: AmazonFields;
}

export interface AmazonFields {
  title?: string[];
  location?: string[];
  description?: string[];
  shortDescription?: string[];
  basicQualifications?: string[];
  preferredQualifications?: string[];
  createdDate?: string[];
  updateDate?: string[];
  urlNextStep?: string[];
}
