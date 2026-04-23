import { useState } from "react";
import { SearchJobsParams, useSearchJobs, getSearchJobsQueryKey } from "@workspace/api-client-react";
import { JobCard } from "./JobCard";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, FileSearch, Info } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

interface JobResultsProps {
  params: SearchJobsParams | null;
}

export function JobResults({ params }: JobResultsProps) {
  const [page, setPage] = useState(1);

  // Merge params with pagination
  const currentParams = params ? { ...params, page, limit: 10 } : null;
  const hasSearched = currentParams !== null;

  const { data, isLoading, isError, error } = useSearchJobs(currentParams || {}, {
    query: {
      enabled: hasSearched,
      queryKey: getSearchJobsQueryKey(currentParams || {}),
    }
  });

  if (!hasSearched) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-6">
          <FileSearch className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-2xl font-semibold text-foreground mb-2">Ready to find your next role?</h2>
        <p className="text-muted-foreground max-w-md">
          Enter your skills, location, or domain above to aggregate job listings from multiple platforms in one clean feed.
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-6 w-48 bg-muted rounded animate-pulse mb-6" />
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="border rounded-xl p-6 space-y-4">
            <div className="flex justify-between">
              <div className="space-y-3 flex-1">
                <Skeleton className="h-6 w-2/3" />
                <div className="flex gap-4">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-24" />
                </div>
              </div>
              <Skeleton className="h-6 w-20" />
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-6 w-16" />
              <Skeleton className="h-6 w-20" />
            </div>
            <div className="flex justify-between items-center mt-4">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-10 w-28" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <Alert variant="destructive" className="mt-8">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>
          Failed to fetch jobs. Please try adjusting your search parameters or try again later.
        </AlertDescription>
      </Alert>
    );
  }

  if (!data || data.jobs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center border border-dashed rounded-xl bg-muted/30">
        <FileSearch className="w-12 h-12 text-muted-foreground mb-4" />
        <h3 className="text-xl font-medium text-foreground mb-2">No jobs found</h3>
        <p className="text-muted-foreground">
          We couldn't find any matching jobs. Try broadening your search criteria.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">
          Showing <span className="font-medium text-foreground">{data.jobs.length}</span> of{" "}
          <span className="font-medium text-foreground">{data.meta.total}</span> jobs
          {data.fromCache && (
            <span className="ml-2 inline-flex items-center rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
              Cached result
            </span>
          )}
        </p>
      </div>

      {data.meta.warnings && data.meta.warnings.length > 0 && (
        <Alert className="bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-950/50 dark:border-amber-900 dark:text-amber-200">
          <Info className="h-4 w-4 !text-amber-600 dark:!text-amber-400" />
          <AlertTitle className="text-amber-800 dark:text-amber-200">Partial Results</AlertTitle>
          <AlertDescription>
            <ul className="list-disc pl-5 mt-2 text-sm space-y-1">
              {data.meta.warnings.map((warning, i) => (
                <li key={i}>{warning}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      <div className="space-y-4">
        {data.jobs.map((job) => (
          <JobCard key={job.id} job={job} />
        ))}
      </div>

      {(data.meta.hasNext || data.meta.hasPrev) && (
        <div className="flex justify-center items-center gap-4 pt-8 pb-12">
          <Button
            variant="outline"
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={!data.meta.hasPrev}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {data.meta.page} of {data.meta.totalPages}
          </span>
          <Button
            variant="outline"
            onClick={() => setPage(p => p + 1)}
            disabled={!data.meta.hasNext}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
