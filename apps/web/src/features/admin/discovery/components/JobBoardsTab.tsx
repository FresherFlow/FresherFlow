'use client';

import { useState, useEffect } from 'react';
import { BriefcaseIcon, BoltIcon, ClockIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/ui/Table';
import { PaginationControls } from '@/ui/data-table/DataTablePagination';
import CompanyLogo from '@/ui/CompanyLogo';
import { PluginEntry } from '../types';
import { Button } from '@/ui/Button';
import { cn } from '@repo/ui/utils/cn';


interface JobBoardsTabProps {
 boards?: PluginEntry[];
 runningBoardId?: string | null;
 onRunBoard?: (boardSlug: string) => void;
}

export function JobBoardsTab({
 boards = [],
 runningBoardId = null,
 onRunBoard,
}: JobBoardsTabProps) {
 const [search, setSearch] = useState('');
 const [runningId, setRunningId] = useState<string | null>(null);
 const [pageIndex, setPageIndex] = useState(0);
 const [pageSize, setPageSize] = useState(20);

 useEffect(() => {
   setPageIndex(0);
 }, [search]);

 const filteredBoards = boards.filter(b => {
 const providerStr = String(b.provider || '');
 const providerNameStr = String(b.providerName || '');
 const searchLower = (search || '').toLowerCase();

 return (
 providerStr.toLowerCase().includes(searchLower) ||
 providerNameStr.toLowerCase().includes(searchLower)
 );
 });

 function handleRun(provider: string) {
 if (onRunBoard) {
 onRunBoard(provider);
 } else {
 setRunningId(provider);
 setTimeout(() => setRunningId(null), 2500);
 }
 }

 const paginatedBoards = filteredBoards.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize);

 return (
   <div className="flex flex-col h-full space-y-2 sm:space-y-4 min-h-0">
     {/* Header */}
     <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3 border-b-0 sm:border-b border-border/60 pb-0 sm:pb-3">
       <div className="hidden md:block">
         <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
           <BriefcaseIcon className="w-4 h-4 text-primary" />
           Job boards & aggregators
         </h2>
         <p className="hidden md:block text-xs text-muted-foreground mt-0.5">
           {boards.length} monitored career aggregators and job feeds
         </p>
       </div>

       {/* Search */}
       <div className="relative w-full sm:w-72">
         <MagnifyingGlassIcon className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
         <input
           type="text"
           value={search}
           onChange={e => setSearch(e.target.value)}
           placeholder="Search job boards..."
           className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-border/80 bg-card text-xs font-medium placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
         />
       </div>
     </div>

     {/* Table View */}
     <div className="border border-border/60 rounded-xl bg-card/60 backdrop-blur-md overflow-hidden shadow-xs flex flex-col flex-1 min-h-0">
       <div className="overflow-auto flex-1 min-h-0 custom-scrollbar">
         <Table className="w-full text-left border-collapse">
           <TableHeader className="sticky top-0 z-10 bg-muted/80 backdrop-blur-md shadow-xs">
             <TableRow className="border-b border-border/60 text-xs font-semibold tracking-wider text-muted-foreground">
               <TableHead className="py-3 px-4 font-medium">Provider</TableHead>
               <TableHead className="py-3 px-4 font-medium text-center">Jobs Found</TableHead>
               <TableHead className="py-3 px-4 font-medium text-center">Last Scraped</TableHead>
               <TableHead className="py-3 px-4 text-right font-medium">Actions</TableHead>
             </TableRow>
           </TableHeader>
           <TableBody className="divide-y divide-border/40 text-xs">
             {paginatedBoards.map(board => {
               const isRunning = runningBoardId === board.provider || runningId === board.provider;

               return (
                 <TableRow
                   key={board.provider}
                   className="hover:bg-muted/30 transition-colors"
                 >
                   <TableCell className="py-3 px-4">
                     <div className="flex items-center gap-3 min-w-0">
                       <CompanyLogo
                         companyName={board.providerName}
                         className="w-8 h-8 rounded-lg border border-border/60 bg-card shadow-xs shrink-0"
                       />
                       <div className="min-w-0">
                         <h3 className="text-xs font-bold text-foreground truncate">{board.providerName}</h3>
                         <p className="text-xs text-muted-foreground truncate">{board.provider}</p>
                       </div>
                     </div>
                   </TableCell>

                   <TableCell className="py-3 px-4 text-center">
                     <span className="font-bold text-foreground">-</span>
                   </TableCell>

                   <TableCell className="py-3 px-4 text-center">
                     <span className="font-medium text-foreground text-xs truncate">
                       Unknown
                     </span>
                   </TableCell>

                   <TableCell className="py-3 px-4 text-right">
                     <Button
                       variant="admin"
                       size="sm"
                       onClick={() => handleRun(board.provider)}
                       disabled={isRunning}
                       className="ml-auto"
                     >
                       <BoltIcon className={cn('w-3.5 h-3.5 mr-1.5', isRunning && 'animate-spin')} />
                       {isRunning ? 'Scraping board...' : 'Scrape board now'}
                     </Button>
                   </TableCell>
                 </TableRow>
               );
             })}

             {filteredBoards.length === 0 && (
               <TableRow>
                 <TableCell colSpan={4} className="p-12 text-center text-muted-foreground text-xs">
                   <div className="flex flex-col items-center gap-2">
                     <BriefcaseIcon className="w-6 h-6 opacity-50 mx-auto" />
                     No job boards found matching &quot;{search}&quot;.
                   </div>
                 </TableCell>
               </TableRow>
             )}
           </TableBody>
         </Table>
       </div>
       {filteredBoards.length > 0 && (
         <PaginationControls
           pageIndex={pageIndex}
           pageSize={pageSize}
           pageCount={Math.ceil(filteredBoards.length / pageSize)}
           totalRows={filteredBoards.length}
           canPreviousPage={pageIndex > 0}
           canNextPage={pageIndex < Math.ceil(filteredBoards.length / pageSize) - 1}
           setPageIndex={setPageIndex}
           setPageSize={setPageSize}
           previousPage={() => setPageIndex(p => Math.max(0, p - 1))}
           nextPage={() => setPageIndex(p => p + 1)}
         />
       )}
     </div>
   </div>
 );
}
