import { Job } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, MapPin, Briefcase, ExternalLink, Globe2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface JobCardProps {
  job: Job;
}

export function JobCard({ job }: JobCardProps) {
  const getSourceBadgeColor = (source: string) => {
    switch (source) {
      case "google":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300";
      case "linkedin":
        return "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300";
      case "indeed":
        return "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300";
      case "naukri":
        return "bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300";
    }
  };

  const formattedDate = job.postedAt
    ? isNaN(Date.parse(job.postedAt))
      ? job.postedAt // likely "2 days ago" string
      : formatDistanceToNow(new Date(job.postedAt), { addSuffix: true })
    : null;

  return (
    <Card className="hover:shadow-md transition-shadow duration-200 border-border/50">
      <CardContent className="p-6">
        <div className="flex flex-col md:flex-row gap-4 md:gap-6 justify-between">
          <div className="space-y-4 flex-1">
            <div>
              <div className="flex items-start justify-between gap-4 mb-2">
                <h3 className="text-xl font-semibold leading-tight text-foreground">{job.title}</h3>
                <Badge variant="secondary" className={`capitalize shrink-0 ${getSourceBadgeColor(job.source)} border-none`}>
                  {job.source}
                </Badge>
              </div>
              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <Building2 className="w-4 h-4" />
                  <span className="font-medium text-foreground/80">{job.company}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4" />
                  <span>{job.location}</span>
                </div>
                {job.remote && (
                  <div className="flex items-center gap-1.5 text-green-600 dark:text-green-500">
                    <Globe2 className="w-4 h-4" />
                    <span>Remote</span>
                  </div>
                )}
                {job.experience && (
                  <div className="flex items-center gap-1.5">
                    <Briefcase className="w-4 h-4" />
                    <span>{job.experience}</span>
                  </div>
                )}
              </div>
            </div>

            {job.skills && job.skills.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {job.skills.map((skill, i) => (
                  <Badge key={i} variant="outline" className="bg-secondary/50 font-normal">
                    {skill}
                  </Badge>
                ))}
              </div>
            )}
            
            <div className="flex items-center justify-between mt-4">
              <div className="text-xs text-muted-foreground flex items-center gap-2">
                {formattedDate && <span>Posted {formattedDate}</span>}
                {job.salary && (
                  <>
                    <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
                    <span className="font-medium text-foreground/80">{job.salary}</span>
                  </>
                )}
              </div>
              <a
                href={job.applyUrl}
                target="_blank"
                rel="norenoopener noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4 py-2"
              >
                Apply Now
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
