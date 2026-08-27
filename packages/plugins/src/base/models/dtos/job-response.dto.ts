import { JobPostDto } from './job-post.dto.js';

export class JobResponseDto {
  jobs: JobPostDto[];

  constructor(jobs: JobPostDto[] = []) {
    this.jobs = jobs;
  }
}
