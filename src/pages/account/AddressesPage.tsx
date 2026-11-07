import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useAuth } from "../../hooks/useAuth";
import {
  createCustomerAddress,
  deleteCustomerAddress,
  getCustomerAddresses,
  setDefaultCustomerAddress,
  type CustomerAddress,
} from "../../services/account";

function AddressesPage() {
  const { user } = useAuth();
  const [addresses, setAddresses] = useState<CustomerAddress[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [message, setMessage] = useState("");

  const loadAddresses = useCallback(async () => {
    if (!user) {
      return;
    }

    try {
      setAddresses(await getCustomerAddresses(user.id));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to load addresses.");
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user) {
      return;
    }

    let isActive = true;

    getCustomerAddresses(user.id)
      .then((customerAddresses) => {
        if (isActive) {
          setAddresses(customerAddresses);
        }
      })
      .catch((error: unknown) => {
        if (isActive) {
          setErrorMessage(error instanceof Error ? error.message : "Unable to load addresses.");
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

    const form = event.currentTarget;
    const formData = new FormData(form);
    setIsSaving(true);
    setErrorMessage("");
    setMessage("");

    try {
      await createCustomerAddress(user.id, {
        label: String(formData.get("label") ?? "").trim() || null,
        first_name: String(formData.get("firstName") ?? "").trim(),
        last_name: String(formData.get("lastName") ?? "").trim(),
        phone: String(formData.get("phone") ?? "").trim(),
        address_line_1: String(formData.get("addressLine1") ?? "").trim(),
        address_line_2: String(formData.get("addressLine2") ?? "").trim() || null,
        city: String(formData.get("city") ?? "").trim(),
        region: String(formData.get("region") ?? "").trim(),
        postal_code: String(formData.get("postalCode") ?? "").trim(),
        country_code: String(formData.get("countryCode") ?? "NG").trim().toUpperCase(),
        is_default: addresses.length === 0 || formData.get("isDefault") === "on",
      });
      form.reset();
      setMessage("Address added successfully.");
      await loadAddresses();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to save address.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (addressId: string) => {
    setErrorMessage("");

    try {
      await deleteCustomerAddress(addressId);
      await loadAddresses();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to remove address.");
    }
  };

  const handleDefault = async (addressId: string) => {
    if (!user) {
      return;
    }

    setErrorMessage("");

    try {
      await setDefaultCustomerAddress(user.id, addressId);
      await loadAddresses();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to update default address.");
    }
  };

  return (
    <div className="space-y-7">
      <section className="rounded-3xl bg-white p-6 shadow-sm sm:p-8">
        <p className="store-eyebrow text-neutral-500">Delivery</p>
        <h2 className="store-section-title mt-2 text-[2rem]">Saved addresses</h2>
        <p className="store-copy mt-3">Use saved delivery details during checkout.</p>
        {errorMessage && <p className="mt-5 rounded-xl bg-red-50 p-3 text-sm text-red-700" role="alert">{errorMessage}</p>}

        {isLoading ? (
          <p className="mt-7 font-bold">Loading addresses...</p>
        ) : addresses.length > 0 ? (
          <div className="mt-7 grid gap-4 md:grid-cols-2">
            {addresses.map((address) => (
              <article key={address.id} className="rounded-2xl border border-[var(--store-line)] p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-black">{address.label || "Delivery address"}</h3>
                      {address.is_default && <span className="store-status bg-black text-white">Default</span>}
                    </div>
                    <address className="mt-3 not-italic leading-7 text-gray-600">
                      {address.first_name} {address.last_name}<br />
                      {address.address_line_1}<br />
                      {address.address_line_2 && <>{address.address_line_2}<br /></>}
                      {address.city}, {address.region} {address.postal_code}<br />
                      {address.country_code}<br />
                      {address.phone}
                    </address>
                  </div>
                </div>
                <div className="mt-5 flex flex-wrap gap-4 text-sm font-bold">
                  {!address.is_default && (
                    <button type="button" onClick={() => handleDefault(address.id)} className="underline underline-offset-4">Make default</button>
                  )}
                  <button type="button" onClick={() => handleDelete(address.id)} className="text-rose-600 underline underline-offset-4">Remove</button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="mt-7 text-gray-600">You have not saved an address yet.</p>
        )}
      </section>

      <section className="rounded-3xl bg-white p-6 shadow-sm sm:p-8">
        <p className="store-eyebrow text-neutral-500">New destination</p>
        <h2 className="store-section-title mt-2 text-[2rem]">Add an address</h2>
        <form onSubmit={handleSubmit} className="mt-7 grid gap-5 sm:grid-cols-2">
          <AddressField label="Label (optional)" name="label" placeholder="Home, Office..." className="sm:col-span-2" required={false} />
          <AddressField label="First name" name="firstName" autoComplete="given-name" />
          <AddressField label="Last name" name="lastName" autoComplete="family-name" />
          <AddressField label="Phone number" name="phone" type="tel" autoComplete="tel" className="sm:col-span-2" />
          <AddressField label="Address" name="addressLine1" autoComplete="address-line1" className="sm:col-span-2" />
          <AddressField label="Apartment, suite, etc. (optional)" name="addressLine2" autoComplete="address-line2" className="sm:col-span-2" required={false} />
          <AddressField label="City" name="city" autoComplete="address-level2" />
          <AddressField label="State / region" name="region" autoComplete="address-level1" />
          <AddressField label="Postal code" name="postalCode" autoComplete="postal-code" />
          <AddressField label="Country code" name="countryCode" defaultValue="NG" maxLength={2} />
          <label className="flex items-center gap-3 sm:col-span-2">
            <input type="checkbox" name="isDefault" />
            <span className="text-sm font-bold">Use as my default address</span>
          </label>
          {message && <p className="sm:col-span-2 rounded-xl bg-green-50 p-3 text-sm text-green-700" role="status">{message}</p>}
          <button type="submit" disabled={isSaving} className="store-button-primary sm:col-span-2 sm:justify-self-start">
            {isSaving ? "Saving address..." : "Add address"}
          </button>
        </form>
      </section>
    </div>
  );
}

interface AddressFieldProps {
  label: string;
  name: string;
  type?: string;
  autoComplete?: string;
  placeholder?: string;
  className?: string;
  required?: boolean;
  defaultValue?: string;
  maxLength?: number;
}

function AddressField({
  label,
  name,
  type = "text",
  autoComplete,
  placeholder,
  className = "",
  required = true,
  defaultValue,
  maxLength,
}: AddressFieldProps) {
  return (
    <label className={className}>
      <span className="mb-2 block text-xs font-bold uppercase tracking-[0.08em]">{label}</span>
      <input
        name={name}
        type={type}
        autoComplete={autoComplete}
        placeholder={placeholder}
        required={required}
        defaultValue={defaultValue}
        maxLength={maxLength}
        className="store-field"
      />
    </label>
  );
}

export default AddressesPage;
