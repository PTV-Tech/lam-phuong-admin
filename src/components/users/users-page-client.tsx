"use client";

import { Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { User } from "@/types/auth";

interface UsersPageClientProps {
  initialUsers: User[];
}

export function UsersPageClient({ initialUsers }: UsersPageClientProps) {
  const users = initialUsers;

  const getRoleBadgeVariant = (role: string) => {
    switch (role.toLowerCase()) {
      case "admin":
        return "default";
      case "user":
        return "secondary";
      default:
        return "outline";
    }
  };

  const formatRole = (role: string) => {
    return role.charAt(0).toUpperCase() + role.slice(1);
  };

  return (
    <div className="container mx-auto space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-2">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-2xl">Người dùng</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Danh sách tất cả người dùng trong hệ thống
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {users.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="rounded-full bg-muted p-4 mb-4">
                <Users className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">
                Chưa có người dùng nào
              </h3>
              <p className="text-sm text-muted-foreground">
                Không có dữ liệu người dùng để hiển thị
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">STT</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>ID</TableHead>
                  <TableHead>Vai trò</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user, index) => (
                  <TableRow key={user.id}>
                    <TableCell className="text-muted-foreground font-medium">
                      {index + 1}
                    </TableCell>
                    <TableCell className="font-medium">{user.email}</TableCell>
                    <TableCell className="text-muted-foreground font-mono text-sm">
                      {user.id}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getRoleBadgeVariant(user.role)}>
                        {formatRole(user.role)}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

