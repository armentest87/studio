import type { LucideProps } from 'lucide-react';
import {
  LayoutDashboard,
  BarChart3,
  Users,
  AlertTriangle,
  Settings2,
  ListFilter,
  ArrowRightLeft,
  CalendarDays,
  AreaChart,
  PieChart,
  GitMerge,
  Github,
  LifeBuoy,
  LogIn,
  FileOutput,
  FileText,
  GanttChartSquare,
  ClipboardList,
  CheckCircle2,
  XCircle,
  Clock,
  UserCheck,
  Package,
  SlidersHorizontal,
  Workflow,
  History,
  TrendingUp,
  Target,
  FileClock,
  Hourglass,
  Percent,
  TableIcon,
  Filter,
  Projector,
  UserCircle2,
  LineChart
} from 'lucide-react';

export const Icons = {
  logo: (props: LucideProps) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M12.511 4.49C11.46 2.622 8.044.223 3.998 3.528 0.076 6.72.378 12.83 3.998 16.027c3.483 3.064 8.783 1.156 10.32-1.928M9.54 10.057C7.8 11.082 5.094 13.064 3.998 12.4s-.308-3.328 1.436-4.354C7.178 7.02 9.885 5.039 11 5.71s.308 3.328-1.46 4.347Z" />
      <path d="M11.489 19.51c1.052 1.868 4.468 4.267 8.514.962 3.922-3.192 3.62-9.302.001-12.498-3.483-3.065-8.783-1.156-10.321 1.928m2.972.488c1.744-.975 4.45-2.957 5.546-2.284 1.095.674.053 3.608-1.69 4.633-1.744 1.025-4.45 2.957-5.546 2.284-1.095-.673-.053-3.608 1.69-4.633Z" />
    </svg>
  ),
  dashboard: LayoutDashboard,
  agile: BarChart3,
  team: Users,
  quality: AlertTriangle,
  custom: Settings2,
  advanced: ListFilter,
  userReport: FileText,
  overview: GanttChartSquare,
  velocity: TrendingUp,
  burndown: Target,
  cycleTime: FileClock,
  throughput: Hourglass,
  sprintCommitment: ClipboardList,
  rollingVelocity: History,
  scopeChange: GitMerge,
  leadTime: Clock,
  workingHours: UserCheck,
  timeInStatus: Workflow,
  assigneeWorkload: Package,
  taskCompletion: CheckCircle2,
  bugTrends: XCircle,
  cfd: AreaChart, // Cumulative Flow Diagram
  customFieldDist: PieChart,
  project: Projector,
  date: CalendarDays,
  status: SlidersHorizontal,
  assignee: UserCircle2,
  table: TableIcon,
  filter: Filter,
  percent: Percent,
  lineChart: LineChart,
  github: Github,
  lifeBuoy: LifeBuoy,
  login: LogIn,
  logout: FileOutput,
};

export type IconName = keyof typeof Icons;
