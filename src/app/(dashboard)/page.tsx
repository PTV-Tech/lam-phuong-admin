import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SummaryCards } from "@/components/dashboard/summary-cards";
import { RecentOrdersTable } from "@/components/dashboard/recent-orders";
import { PendingApprovals } from "@/components/dashboard/pending-approvals";
import { ApiHealthCard } from "@/components/dashboard/api-health-card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  CalendarRange,
  Download,
  Filter,
  Package,
  ShoppingBag,
  TrendingUp,
  Users,
} from "lucide-react";
import { fetchDashboardData } from "@/lib/api";
import { getUserFromCookie } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import type { LucideIcon } from "lucide-react";

const iconMap: Record<string, LucideIcon> = {
  revenue: TrendingUp,
  orders: ShoppingBag,
  partners: Users,
  payouts: Package,
};

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("lp_auth_token")?.value;
  const userCookie = cookieStore.get("lp_auth_user")?.value;

  // Check authentication - redirect if not authenticated
  if (!token) {
    redirect("/sign-in?unauthorized=true");
  }

  // Verify user exists
  const user = getUserFromCookie(userCookie);
  if (!user) {
    redirect("/sign-in?unauthorized=true");
  }

  let dashboard;
  try {
    dashboard = await fetchDashboardData(token || undefined);
  } catch (error) {
    // Redirect to sign-in on unauthorized error
    if (error instanceof Error && error.message === "Unauthorized") {
      redirect("/sign-in?unauthorized=true");
    }
    // For other errors, throw to show error page or use fallback
    throw error;
  }

  const cards = dashboard.stats.map((stat) => ({
    ...stat,
    icon: iconMap[stat.key] ?? TrendingUp,
  }));

  const lastSyncedLabel = new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(dashboard.lastSyncedAt));

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            Bảng điều khiển hệ thống
          </p>
          <h1 className="text-3xl font-semibold">Lam Phương Admin</h1>
          <p className="text-sm text-muted-foreground">
            Cập nhật lần cuối: {lastSyncedLabel}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="outline" className="gap-2">
            <CalendarRange className="h-4 w-4" />
            7 ngày qua
          </Button>
          <Button variant="outline" className="gap-2">
            <Filter className="h-4 w-4" />
            Bộ lọc
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">Các kênh</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Chọn kênh dữ liệu</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>Online</DropdownMenuItem>
              <DropdownMenuItem>Offline</DropdownMenuItem>
              <DropdownMenuItem>Đại lý</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button className="gap-2">
            <Download className="h-4 w-4" />
            Xuất báo cáo
          </Button>
        </div>
      </div>

      <SummaryCards cards={cards} />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <RecentOrdersTable orders={dashboard.recentOrders} />

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Hoạt động hệ thống</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="api">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="api">API</TabsTrigger>
                  <TabsTrigger value="warehouse">Kho vận</TabsTrigger>
                </TabsList>
                <TabsContent value="api" className="space-y-2 pt-4 text-sm">
                  <p className="text-muted-foreground">
                    Đồng bộ lam-phuong-api thành công lúc {lastSyncedLabel}.
                  </p>
                  <p className="text-muted-foreground">
                    Chưa kết nối realtime logs. Thiết lập biến môi trường
                    <code className="mx-1 rounded bg-muted px-1 py-0.5 text-xs">
                      NEXT_PUBLIC_LP_API_URL
                    </code>{" "}
                    để tải dữ liệu thực.
                  </p>
                </TabsContent>
                <TabsContent
                  value="warehouse"
                  className="space-y-2 pt-4 text-sm text-muted-foreground"
                >
                  <p>
                    3 đơn đang chờ xuất kho. Trạng thái sẽ cập nhật ngay khi
                    kết nối với lam-phuong-api.
                  </p>
                  <p>Không có cảnh báo tồn kho dưới ngưỡng.</p>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <ApiHealthCard health={dashboard.apiHealth} />
          <PendingApprovals approvals={dashboard.approvals} />
        </div>
      </div>
    </div>
  );
}

