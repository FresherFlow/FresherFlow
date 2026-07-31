import { JobPostDto } from './job-post.dto';

export class JobResponseDto {
  jobs: JobPostDto[];

  constructor(jobs: JobPostDto[] = []) {
    this.jobs = jobs;
  }
}
