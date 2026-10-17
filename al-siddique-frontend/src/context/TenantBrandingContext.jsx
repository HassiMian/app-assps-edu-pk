import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "./AuthContext";
import api, { resolveAssetUrl } from "../services/api";
import { getTenantStorageItem, setTenantStorageItem } from "../services/tenantStorage";

const DEFAULT_BRANDING = {
  schoolId: null,
  tenantId: null,
  schoolName: "",
  logoUrl: null,
  address: "",
  primaryColor: "#256FE8",
  secondaryColor: "#06b6d4",
  academicYear: "",
  loading: false,
  error: null,
  refresh: async () => {},
};

const TenantBrandingContext = createContext(DEFAULT_BRANDING);

let initialBrandingState = DEFAULT_BRANDING;
try {
  const cached = typeof window !== "undefined" ? getTenantStorageItem("apex_tenant_branding") : null;
  if (cached) {
    initialBrandingState = { ...DEFAULT_BRANDING, ...JSON.parse(cached), loading: false };
  }
} catch { /* optional local cache is unavailable */ }

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
  const brandingRequest = useRef(0);

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
    const requestId = ++brandingRequest.current;
    if (!user) {
      // Without authentication we may fetch ONLY public school-name/logo data
      // for the explicitly selected code or the canonical ASSPS web hostname.
      const params = typeof window === 'undefined' ? null : new URLSearchParams(window.location.search);
      const rawCode = params?.get('school_code') ||
        (typeof window !== 'undefined' && window.location.hostname === 'app.assps.edu.pk' ? 'assps' : '');
      const code = /^[a-z0-9][a-z0-9_-]{1,59}$/i.test(rawCode || '') ? rawCode : '';
      const neutral = { ...DEFAULT_BRANDING };
      if (!code) {
        setBranding(neutral);
        applyCssVars(neutral);
        return neutral;
      }
      try {
        const response = await api.get('/api/school/public-branding', { params: { school_code: code } });
        if (requestId !== brandingRequest.current) return neutral;
        const safePublic = normalizeBrandingPayload(response.data);
        const publicBrand = { ...neutral, ...safePublic, schoolId: null, tenantId: null };
        setBranding(publicBrand);
        applyCssVars(publicBrand);
        return publicBrand;
      } catch {
        if (requestId === brandingRequest.current) {
          setBranding(neutral);
          applyCssVars(neutral);
        }
        return neutral;
      }
    }

    setBranding({ ...DEFAULT_BRANDING, loading: true, error: null });

    const endpoints = ["/api/school/settings/current", "/api/school/branding", "/api/settings"];
    let lastError = null;

    for (const endpoint of endpoints) {
      try {
        const res = await api.get(endpoint);
        if (res.data?.success === false) throw new Error(res.data?.message || "Branding API failed");

        if (requestId !== brandingRequest.current) return DEFAULT_BRANDING;
        const normalized = normalizeBrandingPayload(res.data);
        const nextBranding = {
          ...DEFAULT_BRANDING,
          ...normalized,
          loading: false,
          error: null,
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
        } catch { /* optional local cache is unavailable */ }
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
    };
    if (requestId === brandingRequest.current) {
      setBranding(fallback);
      applyCssVars(fallback);
    }
    return fallback;
  }, [applyCssVars, user]);

  useEffect(() => {
    let active = true;
    queueMicrotask(() => { if (active) void loadBranding(); });
    return () => { active = false; };
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

// Context hook intentionally co-located with its provider; existing API preserved.
// eslint-disable-next-line react-refresh/only-export-components
export function useTenantBranding() {
  return useContext(TenantBrandingContext);
}
