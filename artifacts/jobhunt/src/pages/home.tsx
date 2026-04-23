import { useState } from "react";
import { SearchForm } from "@/components/SearchForm";
import { JobResults } from "@/components/JobResults";
import { SearchJobsParams } from "@workspace/api-client-react";
import { Briefcase } from "lucide-react";

export default function Home() {
  const [searchParams, setSearchParams] = useState<SearchJobsParams | null>(null);

  return (
    <div className="min-h-screen w-full bg-background text-foreground font-sans">
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container max-w-5xl mx-auto px-4 h-16 flex items-center gap-3">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-primary-foreground shadow-sm">
            <Briefcase className="w-5 h-5" />
          </div>
          <h1 className="text-xl font-bold tracking-tight">JobHunt</h1>
          <span className="text-muted-foreground ml-2 text-sm hidden sm:inline-block">
            One search. All the jobs.
          </span>
        </div>
      </header>

      <main className="container max-w-5xl mx-auto px-4 py-8 md:py-12">
        <div className="max-w-2xl mx-auto text-center mb-8 md:mb-12">
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-4">
            Find your next role, faster.
          </h2>
          <p className="text-lg text-muted-foreground">
            Search across LinkedIn, Indeed, Naukri, and Google Jobs in one clean, focused feed. No distractions, just opportunities.
          </p>
        </div>

        <SearchForm 
          onSearch={(params) => setSearchParams(params)} 
          isSearching={false} 
        />

        <div className="mt-8">
          <JobResults params={searchParams} />
        </div>
      </main>
    </div>
  );
}
