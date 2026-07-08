// "use client";

// import DashboardHeader from "@/components/Dashboard/DashboardHeader";
// import StatCard from "@/components/Dashboard/StatCard";
// import TimeRangeFilter from "@/components/Dashboard/RangeFilter";
// import DashboardLayout from "@/components/layouts/DashboardLayout";

// import { BriefcaseBusiness, FileText, Users, UserRound } from "lucide-react";
// import { useQuery } from "@tanstack/react-query";
// import { getDashboardStats } from "@/services/dashboard";

// export const stats = [
//   // {
//   //   title: "Organisations",
//   //   value: 100,
//   //   icon: BriefcaseBusiness,
//   // },
//   {
//     title: "Invoices",
//     value: 245,
//     icon: FileText,
//   },
//   {
//     title: "Users",
//     value: 58,
//     icon: Users,
//   },
//   {
//     title: "Clients",
//     value: 32,
//     icon: UserRound,
//   },
// ];

// export default function Dashboard() {


//   return (
//     <DashboardLayout>
//       <div className="min-h-full">
//         <div className="">
//           <DashboardHeader subtitle="Overview of your system activity and performance">
//             <TimeRangeFilter defaultValue="Monthly" onChange={() => {}} />
//           </DashboardHeader>
//         </div>

//         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
//           {stats.map((item, index) => {
//             const Icon = item.icon;

//             return (
//               <StatCard
//                 key={index}
//                 title={item.title}
//                 value={item.value}
//                 link="#"
//                 icon={<Icon className="w-6 h-6 text-accent/50" />}
//               />
//             );
//           })}
//         </div>
//       </div>
//     </DashboardLayout>
//   );
// }

"use client";
import { useState } from "react";
import DashboardHeader from "@/components/Dashboard/DashboardHeader";
import StatCard from "@/components/Dashboard/StatCard";
import TimeRangeFilter from "@/components/Dashboard/RangeFilter";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { FileText, Users, UserRound } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getDashboardStats } from "@/services/dashboard";

export default function Dashboard() {
  const [filter, setFilter] = useState("monthly");
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();

  const { data, isError } = useQuery({
    queryKey: [
      "dashboard-stats",
      filter,
      startDate?.toISOString() ?? null,
      endDate?.toISOString() ?? null,
    ],
    queryFn: () => getDashboardStats(filter, startDate, endDate),
  });

  const stats = [
    { title: "Invoices", value: data?.invoices ?? 0, icon: FileText, link: "/invoices" },
    { title: "Users", value: data?.users ?? 0, icon: Users, link: "/users" },
    { title: "Clients", value: data?.clients ?? 0, icon: UserRound, link: "/clients" },
  ];

  return (
    <DashboardLayout>
      <div className="min-h-full">
        <DashboardHeader subtitle="Overview of your system activity and performance">
          <div className="mt-2 md:mt-0">
            <TimeRangeFilter
              defaultValue="Monthly"
              onChange={(value: string) => setFilter(value.toLowerCase())}
            />
          </div>
        </DashboardHeader>

        {isError ? (
          <p className="text-sm text-red-500">Failed to load dashboard stats.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {stats.map((item, index) => {
              const Icon = item.icon;
              return (
                <StatCard
                  key={index}
                  title={item.title}
                  value={item.value}
                  link={item.link}
                  icon={<Icon className="w-6 h-6 text-accent/50" />}
                />
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}