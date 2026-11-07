import { useEffect, useState } from "react";
import { Link, Outlet } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { getAdminProfile, isStaffRole, type AdminProfile } from "../../services/admin";

type AccessState =
  | { status: "loading" }
  | { status: "allowed"; profile: AdminProfile }
  | { status: "denied" }
  | { status: "error"; message: string };

function AdminRoute() {
  const { user } = useAuth();
  const [access, setAccess] = useState<AccessState>({ status: "loading" });

  useEffect(() => {
    if (!user) {
      return;
    }

    let isActive = true;

    getAdminProfile(user.id)
      .then((profile) => {
        if (!isActive) {
          return;
        }

        setAccess(isStaffRole(profile.role) ? { status: "allowed", profile } : { status: "denied" });
      })
      .catch((error: unknown) => {
        if (isActive) {
          setAccess({
            status: "error",
            message: error instanceof Error ? error.message : "Unable to verify staff access.",
          });
        }
      });

    return () => {
      isActive = false;
    };
  }, [user]);

  if (access.status === "loading") {
    return <AdminStatus title="Checking staff access" description="Please wait while UNFAZED verifies your role." />;
  }

  if (access.status === "error") {
    return <AdminStatus title="Unable to verify access" description={access.message} />;
  }

  if (access.status === "denied") {
    return (
      <AdminStatus
        title="Staff access required"
        description="This area is restricted to UNFAZED staff and administrators."
        action={<Link to="/account" className="store-button-secondary border-white bg-white text-black">Return to account</Link>}
      />
    );
  }

  return <Outlet context={{ profile: access.profile }} />;
}

interface AdminStatusProps {
  title: string;
  description: string;
  action?: React.ReactNode;
}

function AdminStatus({ title, description, action }: AdminStatusProps) {
  return (
    <section className="store-page flex min-h-[75vh] items-center bg-neutral-950 text-center text-white">
      <div className="store-container">
      <div className="mx-auto max-w-xl">
        <p className="store-eyebrow text-neutral-400">UNFAZED operations</p>
        <h1 className="store-section-title mt-3">{title}</h1>
        <p className="mt-4 leading-7 text-neutral-300">{description}</p>
        {action && <div className="mt-8">{action}</div>}
      </div>
      </div>
    </section>
  );
}

export default AdminRoute;
