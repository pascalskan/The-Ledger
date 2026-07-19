import { Layout } from "@/components/layout";
import { PageHeader } from "@/components/page-shell";
import { PERMISSION_LABELS, PermissionKey, Role, useStore } from "@/lib/mockData";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Shield, Plus, Edit, Check, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

export default function RolesPage() {
  const { users, roles, updateUser, addRole, updateRole } = useStore();
  const { toast } = useToast();

  const [search, setSearch] = useState("");
  const [editingUser, setEditingUser] = useState<{ id: string; roleIds: string[] } | null>(null);

  const [isCreateRoleOpen, setIsCreateRoleOpen] = useState(false);
  const [newRoleName, setNewRoleName] = useState("");
  const [newRoleDescription, setNewRoleDescription] = useState("");
  const [newRolePermissions, setNewRolePermissions] = useState<PermissionKey[]>([]);

  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [editRoleName, setEditRoleName] = useState("");
  const [editRoleDescription, setEditRoleDescription] = useState("");
  const [editRolePermissions, setEditRolePermissions] = useState<PermissionKey[]>([]);

  const permissionOptions = useMemo(() => Object.keys(PERMISSION_LABELS) as PermissionKey[], []);

  const filteredRoles = roles.filter(r => r.name.toLowerCase().includes(search.toLowerCase()));

  const openEditRole = (role: Role) => {
    setEditingRole(role);
    setEditRoleName(role.name);
    setEditRoleDescription(role.description);
    setEditRolePermissions(role.permissions);
  };

  const handleSaveUserRoles = () => {
    if (!editingUser) return;
    updateUser(editingUser.id, { roleIds: editingUser.roleIds });
    setEditingUser(null);
    toast({ title: "Roles Updated", description: "User roles have been updated." });
  };

  const handleCreateRole = () => {
    if (!newRoleName.trim()) return;
    if (!newRolePermissions.length) return;

    addRole({
      name: newRoleName.trim(),
      description: newRoleDescription.trim(),
      permissions: newRolePermissions,
    });

    setIsCreateRoleOpen(false);
    setNewRoleName("");
    setNewRoleDescription("");
    setNewRolePermissions([]);

    toast({ title: "Role Created", description: `"${newRoleName.trim()}" is now available.` });
  };

  const handleUpdateRole = () => {
    if (!editingRole) return;
    updateRole(editingRole.id, {
      name: editRoleName.trim() || editingRole.name,
      description: editRoleDescription,
      permissions: editRolePermissions,
    });
    toast({ title: "Role Updated", description: "Role permissions have been saved." });
    setEditingRole(null);
  };

  return (
    <Layout>
      <div className="space-y-6">
        <PageHeader
          title="Roles & Permissions"
          description="Define access levels and user responsibilities."
        />

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative max-w-md w-full">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              data-testid="input-search-roles"
              placeholder="Search roles..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          <Button
            data-testid="button-open-create-role"
            size="sm"
            className="h-8 px-3 text-xs"
            onClick={() => setIsCreateRoleOpen(true)}
          >
            <Plus className="mr-2 h-4 w-4" /> Create Role
          </Button>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {filteredRoles.map((r) => (
            <Card key={r.id} data-testid={`card-role-${r.id}`}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Shield className="h-4 w-4 text-primary" />
                      <span data-testid={`text-role-name-${r.id}`}>{r.name}</span>
                    </CardTitle>
                    <CardDescription className="mt-1" data-testid={`text-role-description-${r.id}`}>
                      {r.description || "No description"}
                    </CardDescription>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    data-testid={`button-edit-role-${r.id}`}
                    onClick={() => openEditRole(r)}
                  >
                    <Edit className="h-4 w-4 mr-2" /> Edit
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-1.5">
                  {r.permissions.map((p) => (
                    <Badge key={p} variant="secondary" className="text-[10px]" data-testid={`badge-role-perm-${r.id}-${p}`}>
                      {PERMISSION_LABELS[p]}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>User Assignments</CardTitle>
            <CardDescription>Assign roles to your company members (multi-role supported).</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Roles</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => (
                  <TableRow key={u.id} data-testid={`row-user-${u.id}`}>
                    <TableCell className="font-medium" data-testid={`text-user-name-${u.id}`}>{u.name}</TableCell>
                    <TableCell data-testid={`text-user-email-${u.id}`}>{u.email}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1.5">
                        {(u.roleIds || []).map((rid) => {
                          const role = roles.find(r => r.id === rid);
                          if (!role) return null;
                          return (
                            <Badge key={rid} variant="outline" data-testid={`badge-user-role-${u.id}-${rid}`}>
                              {role.name}
                            </Badge>
                          );
                        })}
                        {(u.roleIds || []).length === 0 && <span className="text-sm text-muted-foreground">—</span>}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        data-testid={`button-edit-user-roles-${u.id}`}
                        onClick={() => setEditingUser({ id: u.id, roleIds: u.roleIds || [] })}
                      >
                        <Edit className="h-4 w-4 mr-2" /> Modify
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Edit User Roles Dialog */}
        <Dialog open={!!editingUser} onOpenChange={(o) => !o && setEditingUser(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>Modify User Roles</DialogTitle></DialogHeader>
            <div className="py-4 space-y-3">
              <Label>Roles</Label>
              <div className="rounded-md border p-3 space-y-2" data-testid="multiselect-user-roles">
                {roles.map((r) => {
                  const checked = (editingUser?.roleIds || []).includes(r.id);
                  return (
                    <label key={r.id} className="flex items-center gap-2 text-sm cursor-pointer" data-testid={`checkbox-user-role-${r.id}`}>
                      <input
                        type="checkbox"
                        className="h-4 w-4"
                        checked={checked}
                        onChange={(e) => {
                          setEditingUser(prev => {
                            if (!prev) return prev;
                            const next = new Set(prev.roleIds || []);
                            if (e.target.checked) next.add(r.id);
                            else next.delete(r.id);
                            return { ...prev, roleIds: Array.from(next) };
                          });
                        }}
                      />
                      <span className="font-medium">{r.name}</span>
                      <span className="text-xs text-muted-foreground">— {r.description || "No description"}</span>
                    </label>
                  );
                })}
              </div>
            </div>
            <DialogFooter>
              <Button data-testid="button-save-user-roles" onClick={handleSaveUserRoles}>Save Changes</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Role Dialog */}
        <Dialog open={!!editingRole} onOpenChange={(o) => !o && setEditingRole(null)}>
          <DialogContent className="sm:max-w-[700px]">
            <DialogHeader><DialogTitle>Edit Role</DialogTitle></DialogHeader>
            <div className="py-4 space-y-4">
              <div className="grid gap-2">
                <Label>Role Name</Label>
                <Input data-testid="input-edit-role-name" value={editRoleName} onChange={(e) => setEditRoleName(e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label>Description</Label>
                <Textarea data-testid="input-edit-role-description" value={editRoleDescription} onChange={(e) => setEditRoleDescription(e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label>Permissions</Label>
                <div className="rounded-md border p-3 grid gap-2 sm:grid-cols-2" data-testid="multiselect-edit-role-perms">
                  {permissionOptions.map((p) => {
                    const checked = editRolePermissions.includes(p);
                    return (
                      <label key={p} className="flex items-center gap-2 text-sm cursor-pointer" data-testid={`checkbox-edit-role-perm-${p}`}>
                        <input
                          type="checkbox"
                          className="h-4 w-4"
                          checked={checked}
                          onChange={(e) => {
                            setEditRolePermissions(prev => {
                              const next = new Set(prev);
                              if (e.target.checked) next.add(p);
                              else next.delete(p);
                              return Array.from(next);
                            });
                          }}
                        />
                        <span>{PERMISSION_LABELS[p]}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button data-testid="button-save-edit-role" onClick={handleUpdateRole}>Save Role</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Create Role Dialog */}
        <Dialog open={isCreateRoleOpen} onOpenChange={setIsCreateRoleOpen}>
          <DialogContent className="sm:max-w-[700px]">
            <DialogHeader><DialogTitle>Create New Role</DialogTitle></DialogHeader>
            <div className="py-4 space-y-4">
              <div className="grid gap-2">
                <Label>Role Name</Label>
                <Input data-testid="input-create-role-name" value={newRoleName} onChange={(e) => setNewRoleName(e.target.value)} placeholder="e.g. Site Supervisor" />
              </div>
              <div className="grid gap-2">
                <Label>Description</Label>
                <Textarea data-testid="input-create-role-description" value={newRoleDescription} onChange={(e) => setNewRoleDescription(e.target.value)} placeholder="What can this role do?" />
              </div>
              <div className="grid gap-2">
                <Label>Permissions</Label>
                <div className="rounded-md border p-3 grid gap-2 sm:grid-cols-2" data-testid="multiselect-create-role-perms">
                  {permissionOptions.map((p) => {
                    const checked = newRolePermissions.includes(p);
                    return (
                      <label key={p} className="flex items-center gap-2 text-sm cursor-pointer" data-testid={`checkbox-create-role-perm-${p}`}>
                        <input
                          type="checkbox"
                          className="h-4 w-4"
                          checked={checked}
                          onChange={(e) => {
                            setNewRolePermissions(prev => {
                              const next = new Set(prev);
                              if (e.target.checked) next.add(p);
                              else next.delete(p);
                              return Array.from(next);
                            });
                          }}
                        />
                        <span>{PERMISSION_LABELS[p]}</span>
                      </label>
                    );
                  })}
                </div>
                {!newRolePermissions.length && (
                  <p className="text-xs text-destructive" data-testid="status-create-role-missing-perms">Select at least one permission.</p>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button data-testid="button-submit-create-role" onClick={handleCreateRole} disabled={!newRoleName.trim() || !newRolePermissions.length}>Create Role</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
