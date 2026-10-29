import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../lib/auth-context";
import { useHouseholdSync } from "../lib/realtime";

export function Layout() {
  const { user, token, signOut } = useAuth();
  const notice = useHouseholdSync(token, user?.id);

  return (
    <>
      <header className="topbar">
        <NavLink to="/" className="brand">
          Pati<span>Reminder</span>
        </NavLink>
        <nav>
          <NavLink to="/" end>
            Bugün
          </NavLink>
          <NavLink to="/aile">Aile</NavLink>
        </nav>
        <span className="who">{user?.name}</span>
        <button onClick={signOut}>Çıkış</button>
      </header>
      <main className="page">
        <Outlet />
      </main>
      {notice && (
        <div className="toast" role="status">
          {notice}
        </div>
      )}
    </>
  );
}
