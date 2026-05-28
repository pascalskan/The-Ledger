import { WorkerMobileLayout } from "@/components/WorkerMobileLayout";
import { useAuth } from "@/lib/mockData";
import { UserCircle, LogOut } from "lucide-react";
import { useLocation } from "wouter";

export default function WorkerProfilePage() {
  const { user, logout } = useAuth();
  const [, setLocation] = useLocation();

  const handleLogout = () => {
    logout();
    setLocation("/auth");
  };

  return (
    <WorkerMobileLayout title="Profile">
      <div className="p-4 space-y-6">
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm text-center">
           <div className="w-20 h-20 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
            {user?.name.charAt(0)}
          </div>
          <h2 className="text-xl font-bold">{user?.name}</h2>
          <p className="text-slate-500 text-sm mb-6">{user?.email}</p>
          
          <button 
            onClick={handleLogout}
            className="w-full bg-red-50 text-red-600 hover:bg-red-100 rounded-xl py-3.5 font-semibold text-sm flex items-center justify-center gap-2 transition-colors"
          >
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>
      </div>
    </WorkerMobileLayout>
  );
}