import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../auth";

const links = [
  { to: "/", label: "Command center", roles: ["ADMIN", "IT_ANALYST", "SECURITY_ANALYST", "EMPLOYEE"] },
  { to: "/incidents", label: "Incidents", roles: ["ADMIN", "IT_ANALYST", "SECURITY_ANALYST", "EMPLOYEE"] },
  { to: "/incidents/new", label: "New incident", roles: ["ADMIN", "IT_ANALYST", "SECURITY_ANALYST", "EMPLOYEE"] },
  { to: "/audit", label: "Audit log", roles: ["ADMIN", "SECURITY_ANALYST"] },
];

export function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen grid-overlay">
      <aside className="fixed inset-y-0 left-0 w-64 border-r border-[#1d334d] bg-[#0c1a2e]/90 backdrop-blur-md px-5 py-6 flex flex-col">
        <div className="mb-8">
          <div className="text-xs tracking-[0.35em] text-cyan-300/80">SECUREAI</div>
          <div className="mt-1 text-lg font-semibold">Incident Intelligence</div>
        </div>
        <nav className="flex flex-col gap-1">
          {links
            .filter((l) => user && l.roles.includes(user.role))
            .map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.to === "/"}
                className={({ isActive }) =>
                  `rounded-lg px-3 py-2 text-sm ${isActive ? "bg-cyan-400/15 text-cyan-200" : "text-slate-300 hover:bg-white/5"}`
                }
              >
                {l.label}
              </NavLink>
            ))}
        </nav>
        <div className="mt-auto text-xs text-slate-400">
          <div className="font-medium text-slate-200">{user?.name}</div>
          <div>{user?.role.replaceAll("_", " ")}</div>
          <button
            className="mt-3 text-cyan-300 hover:underline"
            onClick={async () => {
              await logout();
              navigate("/login");
            }}
          >
            Sign out
          </button>
        </div>
      </aside>
      <main className="ml-64 min-h-screen p-8">
        <Outlet />
      </main>
    </div>
  );
}
