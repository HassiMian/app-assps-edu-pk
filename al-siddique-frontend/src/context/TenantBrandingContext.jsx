import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useAuth } from "./AuthContext";
import api, { resolveAssetUrl } from "../services/api";
import { getTenantStorageItem, setTenantStorageItem } from "../services/tenantStorage";

const DEFAULT_BRANDING = {
  schoolId: null,
  tenantId: null,
  schoolName: "APEX",
  logoUrl: null,
  address: "",
  primaryColor: "#071e34",
  secondaryColor: "#06b6d4",
  academicYear: String(new Date().getFullYear()),
  loading: false,
  error: null,
  refresh: async () => {},
};

const TenantBrandingContext = createContext(DEFAULT_BRANDING);

let initialBrandingState = DEFAULT_BRANDING;
try {
  const cached = typeof window !== "undefined" ? getTenantStorageItem("apex_tenant_branding", { migrateLegacy: true }) : null;
  if (cached) {
    initialBrandingState = { ...DEFAULT_BRANDING, ...JSON.parse(cached), loading: false };
  }
} catch {}

function pick(...values) {
  return values.find((value) => value !== undefined && value !== null && String(value).trim() !== "");
}

function normalizeBrandingPayload(payload) {
  const source = payload?.data || payload?.branding || payload || {};
  const brandingConfig = source.branding_config || source.brandingConfig || {};

  return {
    schoolId: pick(source.schoolId, source.school_id, source.id, null),
    tenantId: pick(source.tenantId, source.tenant_id, null),
    schoolName: pick(
      source.schoolName,
      source.school_name,
      source.tenantName,
      source.tenant_name,
      source.name,
      DEFAULT_BRANDING.schoolName
    ),
    logoUrl: resolveAssetUrl(pick(source.logoUrl, source.logo_url, source.school_logo, source.logo, null)),
    address: pick(source.address, source.schoolAddress, source.school_address, ""),
    primaryColor: pick(source.primaryColor, source.primary_color, brandingConfig.primaryColor, DEFAULT_BRANDING.primaryColor),
    secondaryColor: pick(source.secondaryColor, source.secondary_color, brandingConfig.secondaryColor, DEFAULT_BRANDING.secondaryColor),
    academicYear: pick(source.academicYear, source.academic_year, source.examYear, DEFAULT_BRANDING.academicYear),
  };
}

export function TenantBrandingProvider({ children }) {
  const { user } = useAuth();
  const [branding, setBranding] = useState(initialBrandingState);

  const applyCssVars = useCallback((data) => {
    try {
      if (data?.primaryColor) {
        document.documentElement.style.setProperty("--school-primary", data.primaryColor);
      } else {
        document.documentElement.style.removeProperty("--school-primary");
      }

      if (data?.secondaryColor) {
        document.documentElement.style.setProperty("--school-secondary", data.secondaryColor);
      } else {
        document.documentElement.style.removeProperty("--school-secondary");
      }
    } catch (error) {
      console.warn("Unable to apply school branding variables:", error);
    }
  }, []);

  const loadBranding = useCallback(async () => {
    if (!user) {
      return branding;
    }

    setBranding((current) => ({ ...DEFAULT_BRANDING, ...current, loading: true, error: null }));

    const endpoints = ["/api/school/settings/current", "/api/school/branding", "/api/settings"];
    let lastError = null;

    for (const endpoint of endpoints) {
      try {
        const res = await api.get(endpoint);
        if (res.data?.success === false) throw new Error(res.data?.message || "Branding API failed");

        const normalized = normalizeBrandingPayload(res.data);
        const nextBranding = {
          ...DEFAULT_BRANDING,
          ...normalized,
          loading: false,
          error: null,
          refresh: loadBranding,
        };

        setBranding(nextBranding);
        applyCssVars(nextBranding);
        try {
          if (typeof window !== "undefined") {
            setTenantStorageItem("apex_tenant_branding", JSON.stringify({
              schoolName: nextBranding.schoolName,
              logoUrl: nextBranding.logoUrl,
              primaryColor: nextBranding.primaryColor,
              secondaryColor: nextBranding.secondaryColor,
            }));
          }
        } catch {}
        return nextBranding;
      } catch (error) {
        lastError = error;
        console.warn(`School branding load failed from ${endpoint}:`, error?.message || error);
      }
    }

    const fallback = {
      ...DEFAULT_BRANDING,
      loading: false,
      error: lastError?.message || "School settings could not be loaded",
      refresh: loadBranding,
    };
    setBranding(fallback);
    applyCssVars(fallback);
    return fallback;
  }, [applyCssVars, user]);

  useEffect(() => {
    loadBranding();
  }, [loadBranding]);

  useEffect(() => {
    const refresh = () => loadBranding();
    window.addEventListener("school-settings:updated", refresh);
    return () => window.removeEventListener("school-settings:updated", refresh);
  }, [loadBranding]);

  const value = useMemo(() => ({
    ...DEFAULT_BRANDING,
    ...branding,
    refresh: loadBranding,
  }), [branding, loadBranding]);

  return (
    <TenantBrandingContext.Provider value={value}>
      {children}
    </TenantBrandingContext.Provider>
  );
}

export function useTenantBranding() {
  return useContext(TenantBrandingContext);
}
