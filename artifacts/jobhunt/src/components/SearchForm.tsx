import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Search, Loader2 } from "lucide-react";
import { SearchJobsParams } from "@workspace/api-client-react";

const searchSchema = z.object({
  skills: z
    .string()
    .trim()
    .min(2, "Enter a job title or skill (e.g. React, Python, Data Analyst)"),
  experience: z.string().optional(),
  domain: z.string().optional(),
  location: z.string().optional(),
  remote: z.boolean().default(false),
  source: z.string().optional(),
});

type SearchFormValues = z.infer<typeof searchSchema>;

interface SearchFormProps {
  onSearch: (params: SearchJobsParams) => void;
  isSearching: boolean;
}

export function SearchForm({ onSearch, isSearching }: SearchFormProps) {
  const form = useForm<SearchFormValues>({
    resolver: zodResolver(searchSchema),
    defaultValues: {
      skills: "",
      experience: "",
      domain: "",
      location: "india",
      remote: false,
      source: "all",
    },
  });

  function onSubmit(data: SearchFormValues) {
    const params: SearchJobsParams = {
      skills: data.skills || undefined,
      experience: data.experience || undefined,
      domain: data.domain || undefined,
      location: data.location || undefined,
      remote: data.remote || undefined,
      source: data.source && data.source !== "all" ? (data.source as SearchJobsParams["source"]) : undefined,
    };
    onSearch(params);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="bg-card border shadow-sm rounded-xl p-4 md:p-6 mb-8 space-y-4 md:space-y-6 sticky top-4 z-10">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
          <FormField
            control={form.control}
            name="skills"
            render={({ field }) => (
              <FormItem className="col-span-1 lg:col-span-2">
                <FormLabel>Job Title or Skills</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. React, Python, Product Manager" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="location"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Location</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. India, Bangalore" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="experience"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Experience</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. 3 years" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="domain"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Domain</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. software, design" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="source"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Source</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="All Sources" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="all">All Sources</SelectItem>
                    <SelectItem value="jsearch">JSearch (Google + LinkedIn + Indeed)</SelectItem>
                    <SelectItem value="remotive">Remotive (Remote)</SelectItem>
                    <SelectItem value="google">Google Jobs</SelectItem>
                    <SelectItem value="linkedin">LinkedIn</SelectItem>
                    <SelectItem value="indeed">Indeed</SelectItem>
                    <SelectItem value="naukri">Naukri</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex items-center gap-4 pt-8 lg:col-span-2">
            <FormField
              control={form.control}
              name="remote"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Remote only</FormLabel>
                  </div>
                </FormItem>
              )}
            />
            
            <div className="flex-1 text-right">
              <Button type="submit" disabled={isSearching} className="w-full md:w-auto">
                {isSearching ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Searching...
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4 mr-2" />
                    Search Jobs
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </form>
    </Form>
  );
}
