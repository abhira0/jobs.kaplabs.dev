export type Job = {
  id: string;
  title: string;
  company: string;
  location: string;
  type?: string;
  postedAt?: string;
  tags?: string[];
  url?: string;
};

type JobCardProps = {
  job: Job;
};

export default function JobCard({ job }: JobCardProps) {
  return (
    <article className="card-surface border border-default rounded-xl p-4 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold leading-tight">{job.title}</h3>
          <p className="text-sm text-muted mt-1">
            {job.company} • {job.location}
          </p>
        </div>
        {job.url ? (
          <a
            href={job.url}
            target="_blank"
            rel="noreferrer"
            className="focus-ring inline-flex items-center rounded-md border border-default px-3 py-1.5 text-xs font-medium hover:bg-white/5"
          >
            Apply
          </a>
        ) : null}
      </div>
      {job.tags && job.tags.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {job.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-md border border-default bg-white/5 px-2 py-0.5 text-[11px] text-muted"
            >
              {tag}
            </span>
          ))}
        </div>
      ) : null}
      {job.postedAt ? (
        <p className="mt-3 text-[11px] text-muted">Posted {job.postedAt}</p>
      ) : null}
    </article>
  );
}

