import { useEffect, useState, type FormEvent } from "react";
import { useAuth } from "../../hooks/useAuth";
import { getCustomerProfile, updateCustomerProfile } from "../../services/account";

function ProfilePage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState({ firstName: "", lastName: "", phone: "" });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!user) {
      return;
    }

    let isActive = true;

    getCustomerProfile(user.id)
      .then((customerProfile) => {
        if (isActive) {
          setProfile({
            firstName: customerProfile.first_name ?? "",
            lastName: customerProfile.last_name ?? "",
            phone: customerProfile.phone ?? "",
          });
        }
      })
      .catch((error: unknown) => {
        if (isActive) {
          setErrorMessage(error instanceof Error ? error.message : "Unable to load your profile.");
        }
      })
      .finally(() => {
        if (isActive) {
          setIsLoading(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, [user]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!user) {
      return;
    }

    setIsSaving(true);
    setMessage("");
    setErrorMessage("");

    try {
      await updateCustomerProfile(user.id, {
        first_name: profile.firstName.trim(),
        last_name: profile.lastName.trim(),
        phone: profile.phone.trim() || null,
      });
      setMessage("Your profile has been updated.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to update your profile.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="rounded-3xl bg-white p-6 shadow-sm sm:p-8">
      <p className="store-eyebrow text-neutral-500">Personal information</p>
      <h2 className="store-section-title mt-2 text-[2rem]">Profile details</h2>
      <p className="store-copy mt-3">Update the information used for orders and communication.</p>

      {isLoading ? (
        <p className="mt-8 font-bold">Loading profile...</p>
      ) : (
        <form onSubmit={handleSubmit} className="mt-8 grid gap-5 sm:grid-cols-2">
          <ProfileField label="First name" value={profile.firstName} onChange={(value) => setProfile((current) => ({ ...current, firstName: value }))} />
          <ProfileField label="Last name" value={profile.lastName} onChange={(value) => setProfile((current) => ({ ...current, lastName: value }))} />
          <ProfileField label="Phone number" value={profile.phone} onChange={(value) => setProfile((current) => ({ ...current, phone: value }))} className="sm:col-span-2" type="tel" />
          <label className="sm:col-span-2">
            <span className="mb-2 block text-xs font-bold uppercase tracking-[0.08em]">Email</span>
            <input value={user?.email ?? ""} disabled className="store-field" />
          </label>
          {errorMessage && <p className="sm:col-span-2 rounded-xl bg-red-50 p-3 text-sm text-red-700" role="alert">{errorMessage}</p>}
          {message && <p className="sm:col-span-2 rounded-xl bg-green-50 p-3 text-sm text-green-700" role="status">{message}</p>}
          <button type="submit" disabled={isSaving} className="store-button-primary sm:col-span-2 sm:justify-self-start">
            {isSaving ? "Saving..." : "Save profile"}
          </button>
        </form>
      )}
    </div>
  );
}

interface ProfileFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
  type?: string;
}

function ProfileField({ label, value, onChange, className = "", type = "text" }: ProfileFieldProps) {
  return (
    <label className={className}>
      <span className="mb-2 block text-xs font-bold uppercase tracking-[0.08em]">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required={type === "text"}
        className="store-field"
      />
    </label>
  );
}

export default ProfilePage;
